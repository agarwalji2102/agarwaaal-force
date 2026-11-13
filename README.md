# Standard Response — Browser voice interview add-on

A guided evacuation interview for the existing Standard Response website. Judges can speak, type, or select answers without entering phone, speech-provider, or AI API credentials. Confirmed answers and the interview transcript go to the existing real-time backend.

Open `/voice-demo` on the deployed website, or use the homepage QR code.

This repository contains the add-on files and a standalone installer, not the complete upstream application. The full application remains based on https://github.com/Imhaohao/Standard-Response at commit `6d80afc612c005e4b263ce0e8ee819703611368e`, with its authors' attribution retained.

Read [the implementation and setup notes](docs/browser-voice-demo.md).

## Apply to the original project

Run the installer from the full Standard Response project root:

```sh
node /path/to/install-browser-voice.mjs
npm run build
```

The add-on does not require a backend schema change. It is a prepared, branching interview rather than a general-purpose language model. Browser speech recognition may use the browser vendor's online service; text and buttons work without it. No normal phone call is placed.
