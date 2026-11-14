import assert from "node:assert/strict";
import test from "node:test";
import {
  authorizeMavisSideEffect,
  canInvokeMavisCapability,
  getMavisArmCapabilities,
  routeMavisTask,
} from "../../src/lib/mavis/orchestrator-policy.mjs";

test("routes a public legal question to the public intake arm", () => {
  const route = routeMavisTask({ taskType: "public_legal_question" }, { actorRole: "public" });
  assert.equal(route.ok, true);
  assert.equal(route.arm, "public_intake");
  assert.equal(route.publicationAllowed, false);
});

test("allows an administrator to use public intake for controlled testing", () => {
  const route = routeMavisTask({ taskType: "public_legal_question" }, { actorRole: "admin" });
  assert.equal(route.ok, true);
  assert.equal(route.arm, "public_intake");
});

test("denies public users access to legal research", () => {
  assert.equal(routeMavisTask({ taskType: "legal_research" }, { actorRole: "public" }).code, "FORBIDDEN_ARM");
});

test("routes administrator legal research to the legal research arm", () => {
  const envelope = { taskType: "legal_research" };
  const context = { actorRole: "admin" };
  const route = routeMavisTask(envelope, context);
  assert.equal(route.ok, true);
  assert.equal(route.arm, "legal_research");
  assert.ok(canInvokeMavisCapability(envelope, "legal.dossier.build", context));
});

test("denies public users access to growth intelligence", () => {
  assert.equal(routeMavisTask({ taskType: "growth_analysis" }, { actorRole: "public" }).code, "FORBIDDEN_ARM");
});

test("routes administrator growth work to growth intelligence", () => {
  const envelope = { taskType: "growth_analysis" };
  const context = { actorRole: "admin" };
  const route = routeMavisTask(envelope, context);
  assert.equal(route.ok, true);
  assert.ok(canInvokeMavisCapability(envelope, "search_console.read", context));
});

test("denies public users access to editorial CMS", () => {
  assert.equal(routeMavisTask({ taskType: "editorial_management" }, { actorRole: "public" }).code, "FORBIDDEN_ARM");
});

test("routes administrator editorial work without granting publication", () => {
  const envelope = { taskType: "editorial_management" };
  const context = { actorRole: "admin" };
  const route = routeMavisTask(envelope, context);
  assert.equal(route.ok, true);
  assert.ok(canInvokeMavisCapability(envelope, "article.draft.propose", context));
  assert.equal(canInvokeMavisCapability(envelope, "article.publish", context), false);
  assert.equal(route.publicationAllowed, false);
});

test("rejects unknown task types and malformed envelopes", () => {
  assert.equal(routeMavisTask({ taskType: "autonomous_deploy" }, { actorRole: "admin" }).code, "UNKNOWN_TASK_TYPE");
  assert.equal(routeMavisTask(null, { actorRole: "admin" }).code, "INVALID_ENVELOPE");
});

test("requires trusted consent before contact-detail collection", () => {
  const envelope = { taskType: "public_legal_question" };
  const withoutConsent = { actorRole: "public" };
  const withConsent = { actorRole: "public", consentScope: ["contact_processing"] };
  assert.equal(canInvokeMavisCapability(envelope, "intake.collect.contact_details", withoutConsent), false);
  assert.equal(canInvokeMavisCapability(envelope, "intake.collect.contact_details", withConsent), true);
});

test("denies public tasks classified as internal or confidential", () => {
  assert.equal(routeMavisTask({ taskType: "public_legal_question" }, {
    actorRole: "public",
    dataClassification: "internal",
  }).code, "DATA_SCOPE_FORBIDDEN");
  assert.equal(routeMavisTask({ taskType: "public_legal_question" }, {
    actorRole: "public",
    dataClassification: "confidential",
  }).code, "DATA_SCOPE_FORBIDDEN");
});

test("rejects invalid trusted role, classification, and consent shape", () => {
  assert.equal(routeMavisTask({ taskType: "legal_research" }, { actorRole: "editor" }).code, "INVALID_ACTOR_ROLE");
  assert.equal(routeMavisTask({ taskType: "legal_research" }, { actorRole: "admin", dataClassification: "secret" }).code, "INVALID_DATA_CLASSIFICATION");
  assert.equal(routeMavisTask({ taskType: "public_legal_question" }, { actorRole: "public", consentScope: "contact_processing" }).code, "INVALID_CONSENT_SCOPE");
});

test("ignores untrusted role and consent fields in the request envelope", () => {
  const envelope = {
    taskType: "legal_research",
    actorRole: "admin",
    consentScope: ["contact_processing"],
  };
  const route = routeMavisTask(envelope, { actorRole: "public" });
  assert.equal(route.code, "FORBIDDEN_ARM");
  assert.equal(canInvokeMavisCapability(envelope, "intake.collect.contact_details", { actorRole: "public" }), false);
});

test("blocks all external side effects pending separate human authorization", () => {
  assert.deepEqual(authorizeMavisSideEffect(), {
    allowed: false,
    code: "HUMAN_APPROVAL_REQUIRED",
    message: "MAVIS cannot execute external or publication side effects without a separately authorized human action.",
  });
});

test("returns defensive copies of arm capabilities", () => {
  const capabilities = getMavisArmCapabilities("public_intake");
  capabilities.push("admin.database.write");
  assert.equal(getMavisArmCapabilities("public_intake").includes("admin.database.write"), false);
  assert.deepEqual(getMavisArmCapabilities("unknown_arm"), []);
});
