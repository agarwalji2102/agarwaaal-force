"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { QUESTIONS, InterviewFields, readback, resolveAnswer } from "@/lib/browser-interview";
import { useBrowserVoice } from "./use-browser-voice";

import { InterviewShell, Session, Line, Mode } from "./views";
const INTRO = "This is a guided practice interview in your browser. No real emergency response is being requested.";
const FINISH = "Your confirmed answers are saved to the demo dashboard. This practice interview does not dispatch real help. Thank you for taking part.";
const newDemoPhone = () => {
  const values = crypto.getRandomValues(new Uint32Array(2));
  return `+1${201 + (values[0] % 788)}555${String(values[1] % 10000).padStart(4, "0")}`;
};
function errorText(error: unknown) { return error instanceof Error ? error.message : "The connection failed. Please try again."; }

export function BrowserInterview() {
  const homes = useQuery(api.households.coverage);
  const createHome = useMutation(api.ready.submit);
  const startCall = useMutation(api.calls.start);
  const setStage = useMutation(api.calls.setStage);
  const say = useMutation(api.calls.say);
  const update = useMutation(api.households.update);
  const endCall = useMutation(api.calls.end);
  const voice = useBrowserVoice();
  const [mode, setMode] = useState<Mode>("setup");
  const [name, setName] = useState("");
  const [homeId, setHomeId] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [fields, setFields] = useState<InterviewFields>({});
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [spoken, setSpoken] = useState(true);
  const pending = useRef(false);
  const activeCall = useRef<Id<"calls"> | null>(null);
  const createdHome = useRef<Id<"households"> | null>(null);
  const question = QUESTIONS[step];
  const call = useQuery(api.calls.detail, session ? { callId: session.callId } : "skip");
  const choices = (homes ?? []).filter(home => !home.address.startsWith("[Browser demo]"));
  const selected = choices.find(home => home._id === homeId) ?? choices[0];
  const live = mode === "interview" || mode === "review";

  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) { if (activeCall.current) event.preventDefault(); }
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      if (activeCall.current) void endCall({ callId: activeCall.current, answered: true }).catch(() => {});
    };
  }, [endCall]);

  async function logAgent(callId: Id<"calls">, text: string) {
    await say({ callId, speaker: "agent", text });
    setLines(previous => [...previous, { speaker: "agent", text }]);
    voice.speak(text, spoken);
  }
  async function begin(event: FormEvent) {
    event.preventDefault();
    if (!selected || !name.trim() || pending.current) return;
    pending.current = true; setBusy(true); setError("");
    let startingCall: Id<"calls"> | null = null;
    try {
      const address = `[Browser demo] ${selected.address}`;
      const householdId = createdHome.current ?? await createHome({
        phone: newDemoPhone(), address, lat: selected.lat + 0.00012, lng: selected.lng + 0.00012,
        language: "en", residentName: `[Demo] ${name.trim()}`, exitPlan: "needs_ride", care: [],
        note: "Browser guided interview. Practice household; no actual phone calls or emergency response.",
      });
      createdHome.current = householdId;
      startingCall = await startCall({ householdId, direction: "inbound" });
      activeCall.current = startingCall;
      await setStage({ callId: startingCall, stage: "household" });
      await logAgent(startingCall, `${INTRO} Hello ${name.trim()}. Imagine you are at ${selected.address}. ${QUESTIONS[0].prompt}`);
      setSession({ householdId, callId: startingCall, address, name: name.trim() });
      setMode("interview");
    } catch (failure) {
      setError(`Could not start the interview. ${errorText(failure)}`);
      if (startingCall) { await endCall({ callId: startingCall, answered: true }).catch(() => {}); activeCall.current = null; }
    } finally { pending.current = false; setBusy(false); }
  }
  async function confirm(raw: string) {
    if (!session || pending.current || mode !== "interview") return;
    const resolved = resolveAnswer(question, raw);
    if (!resolved) { setError(question.id === "peopleCount" ? "Say or type one whole number from 1 to 20." : "I could not confidently match that answer. Choose one of the options, or edit your words and confirm again."); return; }
    pending.current = true; setBusy(true); setError(""); voice.stop();
    try {
      await update({ householdId: session.householdId, patch: resolved.patch });
      const nextFields = { ...fields, ...resolved.patch };
      setFields(nextFields);
      await say({ callId: session.callId, speaker: "resident", text: `${raw.trim()} [Confirmed: ${resolved.label}]` });
      setLines(previous => [...previous, { speaker: "resident", text: resolved.label }]);
      setAnswer("");
      if (step === QUESTIONS.length - 1) {
        await setStage({ callId: session.callId, stage: "readback" });
        await logAgent(session.callId, `Let me read that back. ${readback(nextFields)} Review the details on screen, then choose finish or edit answers.`);
        setMode("review");
      } else {
        await setStage({ callId: session.callId, stage: QUESTIONS[step + 1].stage });
        await logAgent(session.callId, `Recorded: ${resolved.label}. ${QUESTIONS[step + 1].prompt}`);
        setStep(previous => previous + 1);
      }
    } catch (failure) { setError(`The answer has not been fully confirmed. Please retry. ${errorText(failure)}`); }
    finally { pending.current = false; setBusy(false); }
  }
  async function finish(stopped = false) {
    if (!session || pending.current) return;
    pending.current = true; setBusy(true); setError(""); voice.stop();
    try {
      await setStage({ callId: session.callId, stage: "close" });
      await logAgent(session.callId, stopped ? "Practice interview stopped. Only the answers already confirmed remain in the demo record." : FINISH);
      await endCall({ callId: session.callId, answered: true });
      activeCall.current = null;
      setMode(stopped ? "stopped" : "done");
    } catch (failure) { setError(`Could not close the interview. Please retry. ${errorText(failure)}`); }
    finally { pending.current = false; setBusy(false); }
  }
  async function editAnswers() {
    if (!session || pending.current) return;
    pending.current = true; setBusy(true); setError(""); voice.stop();
    try {
      await setStage({ callId: session.callId, stage: QUESTIONS[0].stage });
      await logAgent(session.callId, `Let's review your answers again. ${QUESTIONS[0].prompt}`);
      setStep(0); setAnswer(""); setMode("interview");
    } catch (failure) { setError(errorText(failure)); }
    finally { pending.current = false; setBusy(false); }
  }
  function toggleVoice() { if (spoken) voice.stopSpeaking(); setSpoken(previous => !previous); }
  const status = voice.listening ? "Listening — speak your answer" : voice.speaking ? "Assistant speaking" : busy ? "Saving to dashboard…" : live ? "Ready for your answer" : "Browser voice demo";
  return <InterviewShell mode={mode} name={name} busy={busy} homesLoaded={homes !== undefined} choices={choices} selected={selected}
    session={session} fields={fields} step={step} answer={answer} lines={lines} error={error} spoken={spoken} status={status}
    listening={voice.listening} supported={voice.supported} voiceError={voice.voiceError} outcome={call?.household?.outcome}
    setName={value => { setName(value); createdHome.current = null; }} setHome={value => { setHomeId(value); createdHome.current = null; }} setAnswer={setAnswer}
    begin={event => void begin(event)} confirm={value => void confirm(value)} finish={stopped => void finish(stopped)} editAnswers={() => void editAnswers()}
    toggleVoice={toggleVoice} repeat={() => voice.speak(question.prompt)}
    microphone={() => voice.listening ? voice.stopListening() : voice.listen(text => { setAnswer(text); document.getElementById("spoken-answer")?.focus(); })} />;
}
