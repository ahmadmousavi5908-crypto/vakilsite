import test from "node:test";
import assert from "node:assert/strict";
import {
  createInitialPublicConversationState,
  PUBLIC_CONVERSATION_STATES,
  transitionPublicConversation,
} from "../../src/lib/mavis/conversation-state.mjs";

test("starts in GREETING and exposes a fixed public state set", () => {
  assert.equal(createInitialPublicConversationState(), "GREETING");
  assert.deepEqual(PUBLIC_CONVERSATION_STATES, [
    "GREETING",
    "DISCOVERY",
    "URGENCY_CHECK",
    "GENERAL_GUIDANCE",
    "HANDOFF_OFFERED",
    "HANDOFF_PREVIEW",
    "COMPLETED",
    "ESCALATED",
  ]);
});

test("allows only declared transitions", () => {
  assert.deepEqual(transitionPublicConversation("GREETING", "DISCOVERY"), {
    ok: true,
    state: "DISCOVERY",
    reasonCode: null,
  });
  const invalid = transitionPublicConversation("GREETING", "COMPLETED");
  assert.equal(invalid.ok, false);
  assert.equal(invalid.state, "GREETING");
  assert.equal(invalid.reasonCode, "INVALID_TRANSITION");
});

test("urgency always escalates and cannot be overridden by the requested next state", () => {
  const result = transitionPublicConversation("DISCOVERY", "GENERAL_GUIDANCE", { urgent: true });
  assert.equal(result.ok, true);
  assert.equal(result.state, "ESCALATED");
  assert.equal(result.reasonCode, "URGENT_HANDOFF_REQUIRED");
});

test("requires explicit consent and a bounded summary before handoff preview", () => {
  for (const context of [
    {},
    { consent: false, summary: "خلاصه" },
    { consent: true, summary: "   " },
    { consent: true, summary: "x".repeat(1201) },
  ]) {
    const result = transitionPublicConversation("HANDOFF_OFFERED", "HANDOFF_PREVIEW", context);
    assert.equal(result.ok, false);
    assert.equal(result.state, "HANDOFF_OFFERED");
    assert.equal(result.reasonCode, "HANDOFF_CONSENT_OR_SUMMARY_REQUIRED");
  }
});

test("allows a handoff preview only after consent and summary are supplied", () => {
  const result = transitionPublicConversation("HANDOFF_OFFERED", "HANDOFF_PREVIEW", {
    consent: true,
    summary: "خلاصه حداقلی برای بررسی وکیل",
  });
  assert.equal(result.ok, true);
  assert.equal(result.state, "HANDOFF_PREVIEW");
});

test("does not complete a handoff preview without explicit consent", () => {
  const result = transitionPublicConversation("HANDOFF_PREVIEW", "COMPLETED", { consent: false });
  assert.equal(result.ok, false);
  assert.equal(result.state, "HANDOFF_PREVIEW");
  assert.equal(result.reasonCode, "HANDOFF_CONSENT_REQUIRED");
});

test("completed and escalated states are terminal", () => {
  for (const state of ["COMPLETED", "ESCALATED"]) {
    const result = transitionPublicConversation(state, "DISCOVERY");
    assert.equal(result.ok, false);
    assert.equal(result.state, state);
    assert.equal(result.reasonCode, "TERMINAL_STATE");
  }
});

test("rejects unknown states without mutating the supplied state", () => {
  assert.equal(
    transitionPublicConversation("UNKNOWN", "DISCOVERY").reasonCode,
    "INVALID_CURRENT_STATE",
  );
  assert.equal(
    transitionPublicConversation("GREETING", "UNKNOWN").reasonCode,
    "INVALID_TRANSITION",
  );
});
