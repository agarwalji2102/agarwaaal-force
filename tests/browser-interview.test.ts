import assert from "node:assert/strict";
import test from "node:test";
import { QUESTIONS, resolveAnswer, readback } from "../lib/browser-interview";
const answer = (id: string, text: string) => resolveAnswer(QUESTIONS.find(q => q.id === id)!, text)?.patch ?? null;
test("spoken counts accept one exact total and reject ambiguous or invalid totals", () => {
  assert.deepEqual(answer("peopleCount", "There are four of us"), { peopleCount: 4 });
  for (const input of ["zero", "0", "21", "two adults and three kids", "two or three", "1.5"]) assert.equal(answer("peopleCount", input), null, input);
});
test("uncertain and contradictory answers do not become a safe-to-leave assumption", () => {
  assert.deepEqual(answer("canLeave", "I'm not sure"), { canLeave: "unsure" });
  assert.deepEqual(answer("canLeave", "no I cannot leave"), { canLeave: "no" });
  assert.equal(answer("canLeave", "yes but no"), null);
  assert.equal(answer("canLeave", "maybe tomorrow"), null);
});
test("mobility negation and generic wheelchair descriptions require clarification", () => {
  assert.deepEqual(answer("mobility", "I use a power wheelchair"), { mobility: "power_wheelchair" });
  assert.deepEqual(answer("mobility", "I cannot get out of bed"), { mobility: "bedbound" });
  assert.equal(answer("mobility", "I do not use a wheelchair"), null);
  assert.equal(answer("mobility", "wheelchair"), null);
});
test("multiple medical needs are retained; negations are not guessed", () => {
  assert.deepEqual(answer("medical", "oxygen and dialysis"), { medical: ["oxygen", "dialysis"] });
  assert.deepEqual(answer("medical", "none"), { medical: [] });
  assert.equal(answer("medical", "no oxygen but dialysis"), null);
});
test("every visible option maps to its backend field", () => {
  for (const question of QUESTIONS) for (const choice of question.options) {
    assert.ok(resolveAnswer(question, choice.value)?.patch[question.id] !== undefined, `${question.id}: ${choice.value}`);
  }
});
test("readback retains important care and transport needs", () => {
  const text = readback({ peopleCount: 3, canLeave: "no", mobility: "manual_wheelchair", assistanceRequired: "two_person_lift", hasCar: false, medical: ["oxygen"], pets: true });
  for (const expected of ["3 people", "Manual wheelchair", "Two-person lift", "oxygen"]) assert.ok(text.includes(expected));
});
