"use client";
import Link from "next/link";
import { FormEvent, useEffect, useRef } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { QUESTIONS, describeField, InterviewFields, Question } from "@/lib/browser-interview";
export type Session = { householdId: Id<"households">; callId: Id<"calls">; address: string; name: string };
export type Line = { speaker: "agent" | "resident"; text: string };
export type Mode = "setup" | "interview" | "review" | "done" | "stopped";
export type Home = { _id: Id<"households">; address: string; lat: number; lng: number };
type Props = {
  mode: Mode; name: string; busy: boolean; homesLoaded: boolean; choices: Home[]; selected?: Home;
  session: Session | null; fields: InterviewFields; step: number; answer: string; lines: Line[];
  error: string; spoken: boolean; status: string; listening: boolean; supported: boolean; voiceError: string; outcome?: string;
  setName: (value: string) => void; setHome: (value: string) => void; setAnswer: (value: string) => void;
  begin: (event: FormEvent) => void; confirm: (value: string) => void; finish: (stopped?: boolean) => void;
  editAnswers: () => void; toggleVoice: () => void; repeat: () => void; microphone: () => void;
};
function SetupView(p: Props) {
  return <form onSubmit={p.begin} className="bv-setup">
    <div className="bv-orb" aria-hidden>◉</div><h2>Meet your evacuation assistant</h2><p>This is a guided practice interview in this webpage. It does not ring a phone number or request real emergency assistance.</p>
    <label htmlFor="demo-name">Your name</label><input id="demo-name" value={p.name} disabled={p.busy} onChange={e => p.setName(e.target.value)} maxLength={50} autoComplete="given-name" placeholder="How should we address you?" required />
    <label htmlFor="demo-house">Choose a practice address</label><select id="demo-house" value={p.selected?._id ?? ""} onChange={e => p.setHome(e.target.value)} disabled={!p.choices.length || p.busy}>
      {!p.choices.length && <option>{p.homesLoaded ? "No practice homes available" : "Connecting to the dashboard…"}</option>}{p.choices.map(home => <option key={home._id} value={home._id}>{home.address}</option>)}
    </select>
    {p.homesLoaded && !p.choices.length && <p className="bv-notice">No homes are loaded yet. Start a Ready Check on the dashboard, then return here.</p>}
    <button className="bv-primary" type="submit" disabled={p.busy || !p.selected || !p.name.trim()}>{p.busy ? "Opening your interview…" : "Start voice demo →"}</button>
    <p className="bv-footnote">Speak, type, or tap an answer. Chrome is recommended for microphone input. Your browser may use an online speech service. Confirmed text is saved to the demo; this app does not record audio.</p>
  </form>;
}
function AnswerForm({ p, question }: { p: Props; question: Question }) {
  return <form onSubmit={e => { e.preventDefault(); p.confirm(p.answer); }}>
    <label htmlFor="spoken-answer">Or speak / type your answer</label>
    <div className="bv-answer-row"><input id="spoken-answer" value={p.answer} disabled={p.busy} onChange={e => p.setAnswer(e.target.value)} maxLength={200} placeholder={p.listening ? "Listening…" : "Your answer appears here"} autoComplete="off" /><button className={p.listening ? "bv-mic is-listening" : "bv-mic"} type="button" disabled={p.busy} aria-label={p.listening ? "Stop microphone" : "Speak your answer"} aria-pressed={p.listening} onClick={p.microphone}>{p.listening ? "■ Stop" : "● Speak"}</button></div>
    <span className="bv-footnote">Check the words, then confirm. Tapping an option confirms it immediately.{question.id === "peopleCount" ? " You can enter any whole number from 1 to 20." : ""}</span>
    <button className="bv-primary" type="submit" disabled={p.busy || !p.answer.trim()}>{p.busy ? "Saving…" : "Confirm answer →"}</button>
  </form>;
}
function QuestionView(p: Props) {
  const question = QUESTIONS[p.step];
  return <div className="bv-question">
    <div className="bv-step">QUESTION {p.step + 1} OF {QUESTIONS.length}<span>{Math.round(p.step / QUESTIONS.length * 100)}% complete</span></div><div className="bv-progress"><span style={{ width: `${p.step / QUESTIONS.length * 100}%` }} /></div>
    <h2>{question.title}</h2><p className="bv-prompt">{question.prompt}</p><button type="button" className="bv-text-button bv-repeat" disabled={p.busy} onClick={p.repeat}>↻ Read question aloud</button>
    <div className="bv-options">{question.options.map(item => <button type="button" disabled={p.busy} key={item.value} onClick={() => p.confirm(item.value)}>{item.label}</button>)}</div>
    <AnswerForm p={p} question={question} /><button className="bv-text-button bv-stop" type="button" disabled={p.busy} onClick={() => p.finish(true)}>End interview early</button>
  </div>;
}
function ReviewView(p: Props) {
  return <div className="bv-review"><div className="bv-orb" aria-hidden>✓</div><h2>Did we get that right?</h2><p>Your confirmed answers are saved. Review the record beside the conversation before finishing.</p><button type="button" className="bv-primary" disabled={p.busy} onClick={() => p.finish()}>{p.busy ? "Finishing…" : "Yes, finish interview →"}</button><button type="button" className="bv-secondary" disabled={p.busy} onClick={p.editAnswers}>Edit my answers</button></div>;
}
function CompleteView(p: Props) {
  return <div className="bv-review"><div className="bv-orb" aria-hidden>✓</div><h2>{p.mode === "done" ? "Your voice reached the dashboard." : "Interview stopped."}</h2><p>{p.mode === "done" ? "The interview transcript and household needs are saved. Open the call floor or rescue map to follow this practice household." : "Only your confirmed answers have been saved."}</p><a className="bv-primary" href="/dashboard" target="_blank" rel="noopener">View live dashboard ↗</a><a className="bv-secondary" href="/voice-demo">Start another interview</a></div>;
}
function RecordCard(p: Props) {
  const badge = p.session ? p.mode === "done" ? "Interview complete" : p.mode === "stopped" ? "Partial record saved" : "Connected to dashboard" : "Ready when you are";
  return <section className="bv-card bv-record"><div className="bv-eyebrow">YOUR PRACTICE HOUSEHOLD</div><h2>{p.session ? p.session.name : "A household with a voice"}</h2><p className="bv-address">{p.session?.address ?? p.selected?.address ?? "Choose an address to begin"}</p><span className="bv-record-badge">{badge}</span><dl>{QUESTIONS.map(q => <div key={q.id}><dt>{q.title}</dt><dd className={p.fields[q.id] !== undefined ? "is-saved" : ""}>{describeField(q, p.fields)}</dd></div>)}</dl>{p.outcome && <div className="bv-outcome"><span>Dashboard classification</span><strong>{p.outcome.replaceAll("_", " ")}</strong></div>}</section>;
}
function Transcript(p: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "nearest" }); }, [p.lines]);
  if (!p.lines.length) return null;
  return <details className="bv-transcript" open><summary>Interview transcript <span>{p.lines.length} turns</span></summary><div className="bv-lines">{p.lines.map((line, index) => <div className={`bv-line bv-${line.speaker}`} key={index}><strong>{line.speaker === "agent" ? "Assistant" : p.session?.name ?? p.name}</strong><p>{line.text}</p></div>)}<div ref={endRef} /></div></details>;
}
function InterviewBody(p: Props) {
  switch (p.mode) {
    case "setup": return <SetupView {...p} />;
    case "interview": return <QuestionView {...p} />;
    case "review": return <ReviewView {...p} />;
    default: return <CompleteView {...p} />;
  }
}
export function InterviewShell(p: Props) {
  return <main className="bv-page">
    <header className="bv-nav"><Link className="bv-brand" href="/">◉ <span>STANDARD RESPONSE</span></Link><nav aria-label="Demo navigation"><a href="/dashboard" target="_blank" rel="noopener">Open dashboard ↗</a><a href="/map" target="_blank" rel="noopener">Rescue map ↗</a></nav></header>
    <div className="bv-heading"><span className="bv-eyebrow">JUDGE EXPERIENCE · GUIDED VOICE INTERVIEW</span><h1>A conversation that<br />becomes a plan.</h1><p>Step into a practice household. Tell the assistant who needs help, and watch your confirmed answers reach the live dashboard.</p></div>
    <div className="bv-layout"><section className="bv-main bv-card" aria-label="Voice interview">
      <div className="bv-status"><span className={p.listening ? "bv-dot bv-pulse" : "bv-dot"} /><span role="status">{p.status}</span><button className="bv-text-button" type="button" onClick={p.toggleVoice} aria-pressed={p.spoken}>Voice {p.spoken ? "on" : "off"}</button></div>
      <InterviewBody {...p} />{p.error && <p className="bv-error" role="alert">{p.error}</p>}{p.voiceError && <p className="bv-notice" role="status">{p.voiceError}</p>}{!p.supported && p.mode !== "setup" && <p className="bv-notice">Microphone recognition is not available in this browser. All questions work with the buttons and text input.</p>}<Transcript {...p} />
    </section><aside className="bv-sidebar"><RecordCard {...p} /><section className="bv-how"><h3>Listen. Confirm. Coordinate.</h3><p>Each answer you confirm updates a separate demo household. Mobility and transport needs feed the same system used by the rescue map.</p><p className="bv-footnote">Guided interview with prepared questions. This is a practice experience, not a live emergency service.</p></section></aside></div>
    <footer className="bv-footer">STANDARD RESPONSE <span>A clearer picture starts with a conversation.</span></footer>
  </main>;
}
