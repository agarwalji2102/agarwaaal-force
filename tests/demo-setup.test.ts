import assert from "node:assert/strict";
import test from "node:test";
import { demoSetupTask } from "../lib/demo-setup";
const demo = [{ simulated: true }];
const control = { readyCheckRunning: false };
test("an empty demo loads its town, including the native fleet", () => {
  assert.equal(demoSetupTask({ total: 0, homes: [], vehicles: [], control }), "town");
});
test("rewinding restores the fleet without replacing existing homes", () => {
  assert.equal(demoSetupTask({ total: 1, homes: demo, vehicles: [], control }), "fleet");
  assert.equal(demoSetupTask({ total: 1, homes: demo, vehicles: [{}], control }), null);
});
test("loading, archival, running readiness and active warnings do not seed a town", () => {
  assert.equal(demoSetupTask({ total: 0, vehicles: [], control }), null);
  assert.equal(demoSetupTask({ total: 0, homes: [], vehicles: [], control: { archivingRunId: "archive" } }), null);
  assert.equal(demoSetupTask({ total: 0, homes: [], vehicles: [], control: { readyCheckRunning: true } }), null);
  assert.equal(demoSetupTask({ total: 0, homes: [], vehicles: [], control: { warningIssuedAt: 123 } }), null);
});
test("real households are never replaced or given a simulated fleet", () => {
  assert.equal(demoSetupTask({ total: 1, homes: [{ simulated: false }], vehicles: [], control }), null);
});
test("a pending reset cannot race with fleet recreation", () => {
  assert.equal(demoSetupTask({ total: 1, homes: demo, vehicles: [], control: { archivingRunId: "archive" } }), null);
});

test("unlocated existing households still count as a populated database", () => {
  assert.equal(demoSetupTask({ total: 1, homes: [], vehicles: [], control }), null);
});
