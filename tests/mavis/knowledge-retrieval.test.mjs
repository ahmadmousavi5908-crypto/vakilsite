import test from "node:test";
import assert from "node:assert/strict";
import { createMavisKnowledgeRetriever } from "../../src/lib/mavis/knowledge-retrieval.mjs";

function createRetriever(records = []) {
  const calls = { search: null, dossier: null, evidence: [] };
  const retrieve = createMavisKnowledgeRetriever({
    searchMavisKnowledge: (query, limit) => {
      calls.search = { query, limit };
      return records;
    },
    buildLegalEvidence: (record) => {
      calls.evidence.push(record.id);
      return { recordId: record.id, state: "needs_official_check" };
    },
    buildLegalResearchDossier: (args) => {
      calls.dossier = args;
      return { ok: true, topic: args.topic, count: args.records.length };
    },
  });
  return { retrieve, calls };
}

test("retrieves existing records and assembles evidence without a parallel corpus", () => {
  const { retrieve, calls } = createRetriever([
    {
      id: "law_civil_code",
      record_type: "law",
      title: "قانون مدنی",
      review_status: "needs_legal_review",
      search_score: 900,
    },
    {
      id: "article_contract",
      record_type: "article",
      title: "شرح قرارداد",
      review_status: "secondary_source_only",
      source_class: "approved_secondary",
    },
  ]);

  const result = retrieve("  قانون مدنی  ", 2);

  assert.equal(result.query, "قانون مدنی");
  assert.equal(result.count, 2);
  assert.equal(result.results[0].evidence.state, "needs_official_check");
  assert.equal(result.results[0].review_status, "needs_legal_review");
  assert.equal(result.results[1].review_status, "secondary_source_only");
  assert.equal(calls.search.query, "قانون مدنی");
  assert.equal(calls.search.limit, 2);
  assert.equal(calls.dossier.records[0].source_class, "statute");
  assert.equal(calls.dossier.records[1].source_class, "approved_secondary");
  assert.deepEqual(calls.evidence, ["law_civil_code", "article_contract"]);
  assert.equal(result.notice.includes("نظر حقوقی"), true);
});

test("maps article summaries and legal terms to conservative source classes", () => {
  const { retrieve, calls } = createRetriever([
    { id: "article_1", record_type: "article", title: "مقاله" },
    { id: "term_1", record_type: "term", title: "اصطلاح" },
  ]);

  retrieve("موضوع حقوقی");

  assert.equal(calls.dossier.records[0].source_class, "educational_summary");
  assert.equal(calls.dossier.records[1].source_class, "legal_term");
});

test("returns an empty dossier without inventing results", () => {
  const { retrieve, calls } = createRetriever([]);
  const result = retrieve("قانون مدنی");

  assert.equal(result.count, 0);
  assert.deepEqual(result.results, []);
  assert.equal(result.researchDossier.ok, true);
  assert.deepEqual(calls.dossier.records, []);
});

test("rejects invalid query and result limits when called outside the HTTP route", () => {
  const { retrieve } = createRetriever([]);
  assert.throws(() => retrieve("ق"), RangeError);
  assert.throws(() => retrieve("قانون مدنی", 0), RangeError);
  assert.throws(() => retrieve("قانون مدنی", 21), RangeError);
  assert.throws(() => retrieve("قانون".repeat(30)), RangeError);
});

test("rejects a broken search adapter response", () => {
  const retrieve = createMavisKnowledgeRetriever({
    searchMavisKnowledge: () => null,
    buildLegalEvidence: () => ({}),
    buildLegalResearchDossier: () => ({}),
  });
  assert.throws(() => retrieve("قانون مدنی"), TypeError);
});

test("requires all retrieval dependencies", () => {
  assert.throws(() => createMavisKnowledgeRetriever({}), TypeError);
});
