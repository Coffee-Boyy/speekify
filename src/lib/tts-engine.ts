import { KokoroTTS } from "kokoro-js";
import type { Voice } from "./messaging";

const MODEL_ID = "onnx-community/Kokoro-82M-ONNX";

export type EngineProgress = (info: { stage: string; progress?: number; message?: string }) => void;

let ttsPromise: Promise<KokoroTTS> | null = null;

export function loadEngine(
  dtype: "fp32" | "fp16" | "q8" | "q4" | "q4f16",
  onProgress: EngineProgress,
): Promise<KokoroTTS> {
  if (ttsPromise) return ttsPromise;
  onProgress({ stage: "loading", progress: 0, message: "Downloading model…" });
  ttsPromise = KokoroTTS.from_pretrained(MODEL_ID, {
    dtype,
    device: "wasm",
    progress_callback: (p: { status: string; progress?: number; file?: string }) => {
      onProgress({
        stage: p.status,
        progress: typeof p.progress === "number" ? p.progress / 100 : undefined,
        message: p.file,
      });
    },
  } as Parameters<typeof KokoroTTS.from_pretrained>[1]).then((tts) => {
    onProgress({ stage: "ready", progress: 1, message: "Model ready" });
    return tts;
  });
  ttsPromise.catch(() => {
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
  const result = await tts.generate(text, { voice, speed });
  return { audio: result.audio as Float32Array, sampleRate: result.sampling_rate ?? 24000 };
}
