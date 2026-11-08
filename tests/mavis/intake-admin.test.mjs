import test from "node:test";
import assert from "node:assert/strict";
import {
  parseAdminIntakeListParams,
  parseAdminIntakeListResult,
  parseAdminIntakeStatusUpdate,
  parseAdminIntakeUpdateResult,
} from "../../src/lib/mavis/intake-admin.mjs";

const id = "123e4567-e89b-42d3-a456-426614174000";

test("parses bounded admin list filters and pagination", () => {
  assert.deepEqual(parseAdminIntakeListParams("https://example.test/api/admin/mavis/intake?status=in_review&limit=25&offset=50"), {
    ok: true,
    value: { status: "in_review", limit: 25, offset: 50 },
  });
  assert.deepEqual(parseAdminIntakeListParams("https://example.test/api/admin/mavis/intake"), {
    ok: true,
    value: { status: null, limit: 50, offset: 0 },
  });
  assert.equal(parseAdminIntakeListParams("https://example.test/?status=admin").reason, "invalid_status");
  assert.equal(parseAdminIntakeListParams("https://example.test/?limit=101").reason, "invalid_pagination");
  assert.equal(parseAdminIntakeListParams("https://example.test/?status=in_review&status=closed").reason, "duplicate_parameter");
});

test("accepts only a UUID and an allowlisted status for updates", () => {
  assert.deepEqual(parseAdminIntakeStatusUpdate({ submissionId: id, status: "in_review" }), {
    ok: true,
    value: { submissionId: id, status: "in_review" },
  });
  assert.equal(parseAdminIntakeStatusUpdate({ submissionId: id, status: "deleted" }).reason, "invalid_status");
  assert.equal(parseAdminIntakeStatusUpdate({ submissionId: "1", status: "closed" }).reason, "invalid_submission_id");
  assert.equal(parseAdminIntakeStatusUpdate({ submissionId: id, status: "closed", summary: "unexpected" }).reason, "invalid_fields");
});

test("accepts only well-formed admin list results", () => {
  const valid = {
    id,
    tracking_code: "a".repeat(32),
    full_name: "علی رضایی",
    phone: "+989123456789",
    summary: "شرح اولیه درخواست",
    status: "pending_human_review",
  };
  assert.deepEqual(parseAdminIntakeListResult({ data: [valid], error: null }), { status: "ok", items: [valid] });
  assert.deepEqual(parseAdminIntakeListResult({ data: [{ ...valid, tracking_code: "short" }], error: null }), { status: "unavailable" });
  assert.deepEqual(parseAdminIntakeListResult({ data: null, error: new Error("db down") }), { status: "unavailable" });
});

test("distinguishes updated, not found and unavailable status updates", () => {
  assert.deepEqual(parseAdminIntakeUpdateResult({ data: true, error: null }), { status: "updated" });
  assert.deepEqual(parseAdminIntakeUpdateResult({ data: false, error: null }), { status: "not_found" });
  assert.deepEqual(parseAdminIntakeUpdateResult({ data: null, error: new Error("db down") }), { status: "unavailable" });
});
