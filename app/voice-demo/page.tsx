import type { Metadata } from "next";
import { BrowserInterview } from "@/components/browser-interview/interview";
import "./interview.css";
export const metadata: Metadata = { title: "Standard Response | Browser voice demo", description: "Take part in a guided evacuation interview with browser voice, text, and live dashboard updates." };
export default function Page() { return <BrowserInterview />; }
