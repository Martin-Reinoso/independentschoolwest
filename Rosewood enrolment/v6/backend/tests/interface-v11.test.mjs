import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../../../", import.meta.url);

test("V11 corrects active catalogues without hiding legacy draft values", async () => {
  const javascript = await readFile(new URL("pages/rosewood-enrolment-v6.js", root), "utf8");

  assert.match(javascript, /rosewood-application-2026\.11/);
  assert.match(javascript, /function applicationReleaseNumber\(\)/);
  assert.match(javascript, /applicationReleaseNumber\(\) >= 11 \? occupations : legacyOccupations/);
  assert.match(javascript, /applicationReleaseNumber\(\) >= 11 \? hhcParentCommitments : legacyParentCommitments/);
  assert.match(javascript, /\.filter\(occupation => occupation !== "Germany"\)/);
  for (const corrected of ["Cabin Crew", "Composer", "Information Technology", "Hairdresser", "Pharmacist", "Postal Worker", "Salesperson", "Storeperson"]) {
    assert.match(javascript, new RegExp(corrected));
  }
  for (const removedCommitment of ["Pay all fees by the due date", "photographs/video footage", "ten school weeks notice"]) {
    assert.match(javascript, new RegExp(removedCommitment));
  }
});

test("V11 EOI retries reuse one browser idempotency key", async () => {
  const javascript = await readFile(new URL("pages/rosewood-enrolment-v6.js", root), "utf8");

  assert.match(javascript, /state\.eoiSubmissionKey \|\|= idempotencyKey\(\)/);
  assert.match(javascript, /"Idempotency-Key": state\.eoiSubmissionKey/);
});
