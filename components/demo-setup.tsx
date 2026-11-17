"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { demoSetupTask, DemoSetupTask, DemoSetupState } from "@/lib/demo-setup";

type Failure = { task: DemoSetupTask; message: string };

// Public, idempotent demo setup through existing backend functions. No server admin access.
export function DemoSetup() {
  const counts = useQuery(api.households.counts);
  const homes = useQuery(api.households.coverage);
  const vehicles = useQuery(api.vehicles.list);
  const control: DemoSetupState["control"] = useQuery(api.control.get);
  const loadTown = useMutation(api.ready.start);
  const loadFleet = useMutation(api.vehicles.ensureFleet);
  const task = demoSetupTask({ total: counts?.total, homes, vehicles, control });
  const [failure, setFailure] = useState<Failure | null>(null);
  const [retry, setRetry] = useState(0);
  const [revision, setRevision] = useState(0);
  const inFlight = useRef(false);
  const attempted = useRef<string | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  useEffect(() => {
    if (!task) { attempted.current = null; return; }
    const key = `${task}:${retry}`;
    if (inFlight.current || attempted.current === key) return;
    attempted.current = key;
    inFlight.current = true;
    // Keep state changes asynchronous; the reactive queries determine when setup is complete.
    Promise.resolve().then(async () => {
      if (alive.current) setFailure(null);
      if (task === "town") await loadTown({});
      else await loadFleet({});
    }).catch((error: unknown) => {
      if (!alive.current) return;
      const message = error instanceof Error ? error.message : "The connection could not be completed.";
      setFailure({ task, message });
    }).finally(() => {
      inFlight.current = false;
      if (alive.current) setRevision(value => value + 1);
    });
  }, [task, retry, revision, loadTown, loadFleet]);

  const connecting = [counts, homes, vehicles, control].includes(undefined);
  const restarting = Boolean(control?.archivingRunId);
  if (!task && !connecting && !restarting) return null;
  return <SetupNotice connecting={connecting} restarting={restarting} task={task} failure={failure?.task === task ? failure : null} onRetry={() => { setFailure(null); setRetry(value => value + 1); }} />;
}

function setupLabel(connecting: boolean, restarting: boolean, task: DemoSetupTask | null) {
  if (connecting) return "Connecting to the demo…";
  if (restarting) return "Restarting the demo…";
  return task === "town" ? "Loading the demo houses and vehicles…" : "Restoring the demo fleet…";
}

function SetupNotice({ connecting, restarting, task, failure, onRetry }: { connecting: boolean; restarting: boolean; task: DemoSetupTask | null; failure: Failure | null; onRetry: () => void }) {
  return (
    <section role={failure ? "alert" : "status"} aria-label="Demo setup" className="fixed bottom-4 left-1/2 z-50 flex w-[min(92vw,32rem)] -translate-x-1/2 items-center gap-3 rounded-xl border border-line bg-canvas px-4 py-3 text-ink shadow-xl">
      {!failure && <span aria-hidden className="size-3 shrink-0 rounded-full bg-ink motion-safe:animate-pulse" />}
      <div className="min-w-0 flex-1">
        <p className="type-small font-semibold">{failure ? "Could not load the demo" : setupLabel(connecting, restarting, task)}</p>
        {failure && <p className="type-small mt-1 break-words text-ink-muted">{failure.message}</p>}
      </div>
      {failure && <button type="button" onClick={onRetry} className="type-small shrink-0 rounded-lg bg-ink px-3 py-2 font-bold text-canvas">Try again</button>}
    </section>
  );
}
