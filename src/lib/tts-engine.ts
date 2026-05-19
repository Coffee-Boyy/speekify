import { KokoroTTS } from "kokoro-js";
import type { Voice } from "./messaging";

const MODEL_ID = "onnx-community/Kokoro-82M-ONNX";

export type EngineProgress = (info: { stage: string; progress?: number; message?: string }) => void;

let ttsPromise: Promise<KokoroTTS> | null = null;

export function loadEngine(
  dtype: "fp32" | "fp16" | "q8" | "q4" | "q4f16",
  onProgress: EngineProgress,
): Promise<KokoroTTS> {
  if (ttsPromise) {
    console.info("[Speekify:TTS] Reusing loaded model instance");
    return ttsPromise;
  }
  console.info("[Speekify:TTS] Loading model", { modelId: MODEL_ID, dtype, device: "wasm" });
  onProgress({ stage: "loading", progress: 0, message: "Downloading model…" });
  ttsPromise = KokoroTTS.from_pretrained(MODEL_ID, {
    dtype,
    device: "wasm",
    progress_callback: (p: { status: string; progress?: number; file?: string }) => {
      console.info("[Speekify:TTS] Model progress", p);
      onProgress({
        stage: p.status,
        progress: typeof p.progress === "number" ? p.progress / 100 : undefined,
        message: p.file,
      });
    },
  } as Parameters<typeof KokoroTTS.from_pretrained>[1]).then((tts) => {
    console.info("[Speekify:TTS] Model ready");
    onProgress({ stage: "ready", progress: 1, message: "Model ready" });
    return tts;
  });
  ttsPromise.catch((err) => {
    console.error("[Speekify:TTS] Model load failed", err);
    ttsPromise = null;
  });
  return ttsPromise;
}

export async function synthesize(
  tts: KokoroTTS,
  text: string,
  voice: Voice,
  speed: number,
): Promise<{ audio: Float32Array; sampleRate: number }> {
  console.debug("[Speekify:TTS] Synthesizing sentence", {
    voice,
    speed,
    textLength: text.length,
    preview: text.slice(0, 80),
  });
  const result = await tts.generate(text, { voice, speed });
  console.debug("[Speekify:TTS] Synthesis complete", {
    samples: (result.audio as Float32Array).length,
    sampleRate: result.sampling_rate ?? 24000,
  });
  return { audio: result.audio as Float32Array, sampleRate: result.sampling_rate ?? 24000 };
}
