export type DemoSetupState = {
  total?: number;
  homes?: { simulated: boolean }[];
  vehicles?: unknown[];
  control?: { warningIssuedAt?: number; readyCheckRunning?: boolean; archivingRunId?: unknown };
};
export type DemoSetupTask = "town" | "fleet";
// Only the empty demonstration is initialized. Existing households are never reset or replaced.
export function demoSetupTask({ total, homes, vehicles, control }: DemoSetupState): DemoSetupTask | null {
  if (total === undefined || !homes || !vehicles || !control || control.archivingRunId) return null;
  if (total === 0 && !control.warningIssuedAt && !control.readyCheckRunning) return "town";
  if (vehicles.length === 0 && homes.some(home => home.simulated)) return "fleet";
  return null;
}
