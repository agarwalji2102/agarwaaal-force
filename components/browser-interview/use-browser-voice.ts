"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

type Result = { isFinal: boolean; [index: number]: { transcript: string } };
type Recognition = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  start: () => void; abort: () => void;
  onresult: ((event: { results: ArrayLike<Result> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type VoiceWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
const noSubscription = () => () => {};
function recognitionConstructor() {
  if (typeof window === "undefined") return undefined;
  const browser = window as VoiceWindow;
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
}
function microphoneMessage(code: string) {
  if (code === "not-allowed" || code === "service-not-allowed") return "Microphone access was blocked. Allow it in your browser, or type or choose an answer below.";
  if (code === "no-speech") return "No speech was detected. Try speaking again, or choose an answer.";
  if (code === "network") return "Your browser's speech service could not connect. You can type or choose your answer.";
  return "Could not hear that answer. Try again, type, or choose an answer below.";
}
export function useBrowserVoice() {
  const supported = useSyncExternalStore(noSubscription, () => Boolean(recognitionConstructor()), () => false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const recognition = useRef<Recognition | null>(null);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const alive = useRef(true);

  function stopListening() {
    const current = recognition.current;
    recognition.current = null;
    if (current) { current.onresult = null; current.onerror = null; current.onend = null; current.abort(); }
    setListening(false);
  }
  function stopSpeaking() {
    if (utterance.current) { utterance.current.onend = null; utterance.current.onerror = null; }
    utterance.current = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }
  function stop() { stopListening(); stopSpeaking(); }
  function speak(text: string, enabled = true) {
    stop();
    if (!enabled || !("speechSynthesis" in window)) return;
    const next = new SpeechSynthesisUtterance(text);
    next.lang = "en-US";
    next.rate = 0.95;
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(item => item.lang.toLowerCase().startsWith("en") && item.localService) ?? voices.find(item => item.lang.toLowerCase().startsWith("en"));
    if (voice) next.voice = voice;
    const done = () => { if (alive.current && utterance.current === next) { utterance.current = null; setSpeaking(false); } };
    next.onend = done; next.onerror = done;
    utterance.current = next;
    setSpeaking(true);
    window.speechSynthesis.speak(next);
  }
  function listen(onText: (text: string) => void) {
    stop(); setVoiceError("");
    const Constructor = recognitionConstructor();
    if (!Constructor) { setVoiceError("Speech recognition is not available in this browser. Type or choose an answer; Chrome is recommended for microphone input."); return; }
    const next = new Constructor();
    next.lang = "en-US"; next.interimResults = false; next.continuous = false; next.maxAlternatives = 1;
    next.onresult = event => {
      if (!alive.current || recognition.current !== next) return;
      const text = Array.from(event.results).filter(result => result.isFinal).map(result => result[0].transcript).join(" ");
      if (text) onText(text);
    };
    next.onerror = event => { if (alive.current && recognition.current === next && event.error !== "aborted") setVoiceError(microphoneMessage(event.error)); };
    next.onend = () => { if (alive.current && recognition.current === next) { recognition.current = null; setListening(false); } };
    recognition.current = next;
    try { next.start(); setListening(true); } catch { recognition.current = null; setVoiceError("Could not start the microphone. Type or choose an answer instead."); }
  }
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      const current = recognition.current;
      if (current) { current.onresult = null; current.onerror = null; current.onend = null; current.abort(); }
      if (utterance.current) { utterance.current.onend = null; utterance.current.onerror = null; window.speechSynthesis.cancel(); }
    };
  }, []);
  return { supported, listening, speaking, voiceError, speak, listen, stop, stopListening, stopSpeaking };
}
