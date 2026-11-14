/** One-time, additive recovery. Uses credentials already present inside the web service.
 * No HTTP endpoint, reset, delete, schema change, or actual phone calls are involved.
 */
import { ConvexHttpClient } from "convex/browser";

const expectedFleet = ["Van 12", "Van 7", "Van 3", "Van 4", "Van 9", "Van 15", "Bus 2", "Medic 41"];
const query = (client, path, args = {}) => client.query(path, args);
const mutate = (client, path, args = {}) => client.mutation(path, args);
const fictional = phone => /^\+1\d{3}555\d{4}$/.test(phone);

export async function archivedRows(client, runId, table) {
  const rows = [];
  let cursor = null;
  for (;;) {
    const page = await query(client, "nightRuns:rows", {
      runId, table, kind: "end", paginationOpts: { numItems: 100, cursor },
    });
    rows.push(...page.page);
    if (page.isDone) return rows;
    cursor = page.continueCursor;
    if (!cursor || rows.length > 10000) throw new Error("Invalid archive pagination");
  }
}

export function recoveryHome(row, persona) {
  const home = row.doc;
  if (!home.simulated || !fictional(home.callbackNumber)) throw new Error("Recovery accepts fictional simulated homes only");
  if (!persona) throw new Error("A simulated household is missing its archived persona");
  if (!Number.isFinite(home.lat) || !Number.isFinite(home.lng)) throw new Error("A simulated household has no map coordinates");
  return {
    address: home.address, lat: home.lat, lng: home.lng,
    callbackNumber: home.callbackNumber, language: home.language,
    needPrior: home.needPrior, name: persona.name, age: persona.age,
    answersPhone: persona.answersPhone, repliesToText: persona.repliesToText, truth: persona.truth,
  };
}

export async function recoverDemo(client) {
  const control = await query(client, "control:get");
  if (control.warningIssuedAt || control.archivingRunId) throw new Error("Wait until the current warning or archive operation has ended");
  const active = await query(client, "calls:active");
  if (active.some(call => !call.simulated)) throw new Error("A real or browser interview is still active; let it finish before recovery");
  const runs = await query(client, "nightRuns:list");
  let source = null;
  for (const run of runs.filter(run => run.status === "archived" && run.endedBy === "reset")) {
    const homes = (await archivedRows(client, run._id, "households")).filter(row => row.doc.simulated && fictional(row.doc.callbackNumber));
    if (homes.length >= 200) { source = { run, homes }; break; }
  }
  if (!source) throw new Error("No archived reset contains the original simulated town");
  const personas = new Map((await archivedRows(client, source.run._id, "personas")).map(row => [row.doc.householdId, row.doc]));
  const candidates = source.homes.map(row => recoveryHome(row, personas.get(row.docId)));
  const original = await query(client, "households:coverage");
  const originalIds = new Set(original.map(home => home._id));
  let added = 0;
  if (control.readyCheckRunning) await mutate(client, "ready:stop");
  try {
    // Small transactions avoid the count aggregator's quadratic read budget.
    for (let offset = 0; offset < candidates.length; offset += 20) {
      const live = await query(client, "households:coverage");
      const numbers = new Set(live.map(home => home.callbackNumber));
      const homes = candidates.slice(offset, offset + 20).filter(home => !numbers.has(home.callbackNumber));
      if (homes.length) added += await mutate(client, "censusSeed:insertHomes", { homes });
      console.log(`[demo-recovery] Restored ${added} simulated households so far`);
    }
    await mutate(client, "vehicles:ensureFleet");
    const final = await query(client, "households:coverage");
    if ([...originalIds].some(id => !final.some(home => home._id === id))) throw new Error("An original household is missing");
    const restoredNumbers = new Set(final.filter(home => home.simulated).map(home => home.callbackNumber));
    if (candidates.some(home => !restoredNumbers.has(home.callbackNumber))) throw new Error("The simulated town is incomplete");
    const fleet = await query(client, "vehicles:list");
    if (expectedFleet.some(label => !fleet.some(vehicle => vehicle.label === label))) throw new Error("The demo fleet is incomplete");
    const result = { restored: added, simulatedHomes: restoredNumbers.size, totalHomes: final.length, vehicles: fleet.length, originalHouseholdsPreserved: originalIds.size };
    console.log("[demo-recovery] VERIFIED " + JSON.stringify(result));
    return result;
  } finally {
    if (control.readyCheckRunning) await mutate(client, "ready:start");
  }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  const admin = process.env.CONVEX_SELF_HOSTED_ADMIN_KEY;
  if (!url || !admin) throw new Error("The web service's existing Convex configuration is required");
  const client = new ConvexHttpClient(url);
  client.setAdminAuth(admin);
  await recoverDemo(client);
}

if (process.env.DEMO_RECOVERY_IMPORT_ONLY !== "true") {
  main().catch(error => {
    const key = process.env.CONVEX_SELF_HOSTED_ADMIN_KEY;
    const message = String(error?.message ?? "Recovery failed");
    console.error("[demo-recovery] " + (key ? message.replaceAll(key, "[redacted]") : message));
    process.exitCode = 1;
  });
}
