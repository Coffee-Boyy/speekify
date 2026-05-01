# Speekify

A Chrome extension that reads web pages aloud using the [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) text-to-speech model running **fully on-device**. No API keys, no cloud calls, no audio leaves your machine.

## Features

- **Read full articles** — extracts main content with Mozilla's Readability (the engine behind Firefox Reader View) and reads it sentence-by-sentence.
- **Read selected text** — right-click any selection → *Read selection with Speekify*.
- **On-device inference** — Kokoro 82M ONNX runs in-browser via `onnxruntime-web` (WASM SIMD).
- **Sentence highlighting** — a floating overlay shows the current sentence as it plays.
- **Voices & speed** — 3 English voices (`af_heart`, `af_bella`, `am_adam`), 0.75×–1.5× speed.
- **Local model cache** — model is lazy-downloaded from Hugging Face on first use (~92 MB, q8 quantization) and cached by the browser thereafter.

## Architecture

```
content script  ──►  background SW  ──►  offscreen document
  Readability +       context menu +       kokoro-js (WASM)
  overlay UI          msg routing          AudioContext playback
```

Inference lives in an [offscreen document](https://developer.chrome.com/docs/extensions/reference/api/offscreen) (MV3) — service workers can't run long-lived WASM, and content scripts die on tab navigation. The offscreen page is a singleton with `AUDIO_PLAYBACK` + `WORKERS` reasons; it persists across tab switches.

## Install (development)

```bash
pnpm install
pnpm build
```

Then in Chrome:
1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → pick the `dist/` directory

## Usage

- Click the toolbar icon → **Read this page**, or
- Right-click selected text → **Read selection with Speekify**, or
- Right-click a page → **Read article with Speekify**

Use the popup to pause / resume / stop, switch voice, or adjust speed. Advanced options (model quantization, clear cache) live on the options page.

## Project layout

```
manifest.config.ts          # @crxjs MV3 manifest
vite.config.ts              # Vite + @crxjs/vite-plugin + React
src/
  background/               # service worker — offscreen lifecycle, context menus
  offscreen/                # kokoro-js host + audio queue
  content/                  # Readability extract + Shadow-DOM overlay
  popup/                    # toolbar popup (React)
  options/                  # options page (React)
  lib/
    tts-engine.ts           # kokoro-js wrapper
    text-extractor.ts       # Readability + Intl.Segmenter
    messaging.ts            # typed message contracts
    settings.ts             # chrome.storage.sync wrapper
```

## Scripts

- `pnpm dev` — Vite dev server with HMR for popup/options pages.
- `pnpm build` — production build → `dist/`.
- `pnpm typecheck` — TypeScript check, no emit.

## Tech stack

- [Vite](https://vitejs.dev/) + [@crxjs/vite-plugin](https://crxjs.dev/vite-plugin/) — MV3 bundler with HMR.
- [React 18](https://react.dev/) — popup, options, content overlay.
- [kokoro-js](https://www.npmjs.com/package/kokoro-js) — pulls in [@huggingface/transformers](https://huggingface.co/docs/transformers.js) and `onnxruntime-web`.
- [@mozilla/readability](https://github.com/mozilla/readability) — article extraction.
- `Intl.Segmenter` — sentence segmentation (built-in, no dep).

## Privacy

All TTS happens locally. The only network request is the one-time download of the Kokoro ONNX model and voice files from `huggingface.co` on first use. After that, the extension works fully offline.

## License

Apache-2.0 (matches the upstream Kokoro-82M model license).

## Roadmap

- WebGPU backend (opt-in) for faster inference.
- Additional languages — Kokoro v1.0 supports 8 languages, 54 voices total.
- PDF reading via `pdf.js`.
- Per-paragraph hover play button (Speechify-style UX).
