"use client";
import { useSyncExternalStore } from "react";
import { BrandMark } from "@/components/ui/brand-mark";
import { PRODUCT_NAME } from "@/lib/brand";
import { PhoneForm } from "./phone-form";
import { QrCode } from "./qr-code";
const noSubscription = () => () => {};
const demoUrl = () => `${window.location.origin}/voice-demo`;
export function SignInCard({ code, error }: { code: string | null; error: string | null }) {
  const url = useSyncExternalStore(noSubscription, demoUrl, () => null);
  return (
    <div className="flex w-full max-w-4xl flex-col gap-3">
      <section aria-labelledby="sign-in-heading" className="card w-full p-6 sm:p-10">
        <div className="flex items-center gap-2.5"><BrandMark className="size-6" /><span className="type-heading font-brand">{PRODUCT_NAME}</span></div>
        <p className="type-small mt-6 font-semibold text-ink-muted">GUIDED VOICE DEMO</p>
        <h1 id="sign-in-heading" className="type-display mt-2 max-w-[20ch]">Meet your evacuation assistant</h1>
        <p className="type-body mt-3 max-w-[54ch] text-ink-muted">Choose a practice household and answer a short interview. Speak, type, or tap your answers, then see them on the live dashboard.</p>
        <div className="mt-8 grid items-center gap-6 md:grid-cols-[auto_1fr] md:gap-10">
          <QrCode text={url} label="Open the browser voice demo on your phone" className="w-32 shrink-0 md:w-44" />
          <div><p className="type-title mb-3">Scan to try it on your phone</p><p className="type-body mb-5 text-ink-muted">Or start here. No phone number is needed. This practice interview takes place inside the webpage.</p><a href="/voice-demo" className="inline-flex h-14 w-full items-center justify-center rounded-xl bg-ink px-6 text-base font-bold text-canvas">Start voice demo →</a><p className="type-small mt-3 text-ink-muted">Chrome is recommended for microphone answers. Text and buttons work in other browsers.</p></div>
        </div>
        <details className="mt-8 border-t border-line pt-4"><summary className="type-small cursor-pointer font-semibold text-ink-muted">Phone-number sign-in (separate calling setup required)</summary><div className="mt-4"><PhoneForm code={code} submitLabel="Continue with phone sign-in" /></div></details>
        {error && <p role="status" className="type-small mt-4 text-ink-muted">Phone sign-in: {error}. You can still open the browser demo.</p>}
      </section>
    </div>
  );
}
