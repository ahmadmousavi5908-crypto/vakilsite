import test from "node:test";
import assert from "node:assert/strict";
import { normalizeMavisManualSourceInput } from "../../src/lib/mavis/manual-source-input.mjs";

test("infers official source type and primary authority relation", () => {
  const result = normalizeMavisManualSourceInput({
    title: "قانون نمونه",
    sourceUrl: "https://qavanin.ir/example",
    sourceAuthority: "official_primary",
    sourceGroup: "official"
  });
  assert.equal(result.source.sourceType, "official_law");
  assert.equal(result.relationType, "primary_authority");
});

test("maps academic sources to research background", () => {
  const result = normalizeMavisManualSourceInput({
    title: "مقاله علمی",
    sourceUrl: "https://civilica.com/doc/123",
    sourceGroup: "academic"
  });
  assert.equal(result.source.sourceType, "academic");
  assert.equal(result.relationType, "research_background");
});

test("rejects insecure URLs and embedded credentials", () => {
  assert.throws(() => normalizeMavisManualSourceInput({
    title: "منبع",
    sourceUrl: "http://example.com"
  }));
  assert.throws(() => normalizeMavisManualSourceInput({
    title: "منبع",
    sourceUrl: "https://user:pass@example.com"
  }));
});

test("rejects unsupported source and relation types", () => {
  assert.throws(() => normalizeMavisManualSourceInput({
    title: "منبع",
    sourceUrl: "https://example.com",
    sourceType: "unknown"
  }));
  assert.throws(() => normalizeMavisManualSourceInput({
    title: "منبع",
    sourceUrl: "https://example.com",
    relationType: "invented_relation"
  }));
});

test("caps metadata lengths and normalizes the URL", () => {
  const result = normalizeMavisManualSourceInput({
    title: "منبع",
    sourceUrl: "https://example.com/path",
    abstract: "x".repeat(2000),
    documentNumber: "  123  "
  });
  assert.equal(result.source.abstract.length, 1200);
  assert.equal(result.source.documentNumber, "123");
  assert.equal(result.source.sourceUrl, "https://example.com/path");
});
