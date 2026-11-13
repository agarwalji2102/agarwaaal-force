# Browser voice demo

The `/voice-demo` route runs a guided, seven-question evacuation interview without phone, speech-provider, or AI API credentials. It uses browser speech synthesis and optional SpeechRecognition. Text input and explicit answer buttons remain available when speech recognition is unavailable, denied, or offline.

This is a guided conversation, not a general-purpose language model or a real emergency service. Speech recognition may use the browser vendor's online service. The application saves confirmed text; it does not capture or store audio recordings.

## Flow

1. Open the homepage and choose **Start voice demo**, or scan its QR code.
2. Enter a demo name and choose a source address from the existing town.
3. A separate `[Browser demo]` household is created near that address, with an application-blocked fictional 555 telephone number. Existing households are not overwritten. The real dialer excludes 555 numbers.
4. The browser creates an inbound interview record in the existing backend. No telephone call is made.
5. Prepared questions collect household size, evacuation ability, mobility, physical assistance, transport, medical needs, and pets.
6. Microphone recognition fills the editable answer box. The participant must confirm that text; answer buttons confirm immediately. Ambiguous answers stay on the current question.
7. Each confirmed answer updates the live household, recalculates its classification and transport request, and appends to the interview transcript. Readback lets the participant check or revise answers before ending the interview.

The call floor shows the live interview and saved transcript. The rescue map shows the new demo household through the same `households.coverage` subscription used for other records. Existing global simulation controls are not reset by this feature.

## Backend compatibility

No backend schema or function deployment is required. This add-on calls the existing public functions `households.coverage`, `ready.submit`, `calls.start`, `calls.setStage`, `calls.say`, `calls.detail`, `calls.end`, and `households.update` from the original source snapshot. Use a separate development backend when testing outside the authorized demo environment.

## Source and deployment

This repository contains the add-on source and a standalone `install-browser-voice.mjs` installer. It is not a replacement for the full upstream repository. Upstream project and credits: https://github.com/Imhaohao/Standard-Response

The existing Railway web service remains pinned to upstream commit `6d80afc612c005e4b263ce0e8ee819703611368e`. Its build step downloads the add-on installer from an exact commit in this repository, applies these files, and runs `npm run build`. The existing homepage sign-in card is replaced; legacy phone sign-in remains under an expandable section with its separate setup requirement. The Cal Hacks awards banner stays removed.

To apply locally, run `node /path/to/install-browser-voice.mjs` from the extracted Standard Response project folder, then run the original development/build commands.

## Validation

Parser tests live in `tests/browser-interview.test.ts`. From the full project, run:

```sh
node --import tsx --test tests/browser-interview.test.ts
npm run typecheck
npm run lint
npm run build
```

Browser checks should cover microphone denial, unavailable speech support, typed answers, ambiguous answers, corrections during readback, early ending, and successful persistence. Actual microphone recognition depends on browser support, permissions, and the browser's speech service. A browser permission prompt is expected when the participant taps **Speak**.

## Dashboard household search

The dashboard's **Find a household** search matches resident names and street addresses, including completed browser interviews. It ignores case and accents, supports partial words, and matches multiple terms across the name and address. Empty queries show no results; unmatched queries show a clear empty state. Results are ranked with exact and prefix matches first.

Select a result or press Enter to open the first match. The selected home is highlighted on the map and its existing household card opens. Escape or the clear button resets the selection. Search reads the existing `households.coverage` subscription and needs no backend schema change or new credentials.
