import { KokoroTTS } from "kokoro-js";
const MODEL_ID = "onnx-community/Kokoro-82M-ONNX";
let ttsPromise = null;
export function loadEngine(dtype, onProgress) {
    if (ttsPromise)
        return ttsPromise;
    onProgress({ stage: "loading", progress: 0, message: "Downloading model…" });
    ttsPromise = KokoroTTS.from_pretrained(MODEL_ID, {
        dtype,
        device: "wasm",
        progress_callback: (p) => {
            onProgress({
                stage: p.status,
                progress: typeof p.progress === "number" ? p.progress / 100 : undefined,
                message: p.file,
            });
        },
    }).then((tts) => {
        onProgress({ stage: "ready", progress: 1, message: "Model ready" });
        return tts;
    });
    ttsPromise.catch(() => {
        ttsPromise = null;
    });
    return ttsPromise;
}
export async function synthesize(tts, text, voice, speed) {
    const result = await tts.generate(text, { voice, speed });
    return { audio: result.audio, sampleRate: result.sampling_rate ?? 24000 };
}
