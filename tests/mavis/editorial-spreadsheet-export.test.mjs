import test from "node:test";
import assert from "node:assert/strict";
import { createEditorialSpreadsheetTsv } from "../../src/lib/mavis/editorial-spreadsheet-export.mjs";

test("serializes Persian spreadsheet rows with quoted tab-separated cells", () => {
  const output = createEditorialSpreadsheetTsv([
    ["عنوان", "دسته‌بندی"],
    ['مقاله "الف"', "حقوق مدنی"],
  ]);
  assert.equal(output, '"عنوان"\t"دسته‌بندی"\r\n"مقاله ""الف"""\t"حقوق مدنی"\r\n');
});

test("neutralizes formula-like and control-prefixed cells", () => {
  const output = createEditorialSpreadsheetTsv([
    ["=1+1", "+SUM(A1:A2)", "-1+1", "@cmd", "\t=1+1", "＝1+1"],
  ]);
  const cells = output.trimEnd().split("\t").map((cell) => JSON.parse(cell));
  assert.deepEqual(cells, ["'=1+1", "'+SUM(A1:A2)", "'-1+1", "'@cmd", "'\t=1+1", "'＝1+1"]);
});

test("quotes embedded tabs and newlines so they remain inside one cell", () => {
  const output = createEditorialSpreadsheetTsv([["عنوان\tبخش", "سطر اول\nسطر دوم"]]);
  assert.equal(output, '"عنوان\tبخش"\t"سطر اول\nسطر دوم"\r\n');
});

test("rejects malformed row structures", () => {
  assert.throws(() => createEditorialSpreadsheetTsv("not rows"), TypeError);
  assert.throws(() => createEditorialSpreadsheetTsv([null]), TypeError);
});
