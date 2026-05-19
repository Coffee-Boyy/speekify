import { loadEngine, synthesize } from "../lib/tts-engine";
import type { Msg, SentenceChunk, Voice } from "../lib/messaging";
import { getSettings } from "../lib/settings";

let audioCtx: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let queue: SentenceChunk[] = [];
let queueIndex = 0;
let activeTabId: number | undefined;
let activeVoice: Voice = "af_heart";
let activeSpeed = 1.0;
let state: "idle" | "loading" | "playing" | "paused" = "idle";

function postStatus(s: typeof state, extra: { progress?: number; message?: string } = {}): void {
  const msg: Msg = { type: "tts:status", state: s, ...extra };
  chrome.runtime.sendMessage(msg).catch(() => {});
  console.info("[Speekify:Offscreen] Status", msg);
  state = s;
}

function ensureAudio(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext({ sampleRate: 24000 });
  return audioCtx;
}

async function playChunk(audio: Float32Array, sampleRate: number): Promise<void> {
  console.debug("[Speekify:Offscreen] Playing chunk", { samples: audio.length, sampleRate });
  const ctx = ensureAudio();
  if (ctx.state === "suspended") await ctx.resume();
  const buffer = ctx.createBuffer(1, audio.length, sampleRate);
  buffer.getChannelData(0).set(audio);
  return new Promise<void>((resolve) => {
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.onended = () => resolve();
    currentSource = src;
    src.start();
  });
}

async function runQueue(): Promise<void> {
  console.info("[Speekify:Offscreen] Starting queue", {
    totalSentences: queue.length,
    tabId: activeTabId,
    voice: activeVoice,
    speed: activeSpeed,
  });
  const settings = await getSettings();
  const tts = await loadEngine(settings.dtype, (info) => {
    postStatus("loading", { progress: info.progress, message: info.message });
  });
  postStatus("playing");
  while (queueIndex < queue.length && state !== "idle") {
    if (state === "paused") {
      await new Promise<void>((r) => {
        const onChange = () => {
          if (state !== "paused") {
            chrome.runtime.onMessage.removeListener(onChange as never);
            r();
          }
        };
        chrome.runtime.onMessage.addListener(onChange as never);
      });
      continue;
    }
    const chunk = queue[queueIndex];
    console.debug("[Speekify:Offscreen] Sentence start", {
      queueIndex,
      sentenceIndex: chunk.index,
      preview: chunk.text.slice(0, 80),
    });
    chrome.runtime
      .sendMessage({ type: "tts:sentence-start", index: chunk.index, tabId: activeTabId } satisfies Msg)
      .catch(() => {});
    try {
      const { audio, sampleRate } = await synthesize(tts, chunk.text, activeVoice, activeSpeed);
      await playChunk(audio, sampleRate);
    } catch (err) {
      console.error("Speekify synth error", err);
    }
    chrome.runtime
      .sendMessage({ type: "tts:sentence-end", index: chunk.index, tabId: activeTabId } satisfies Msg)
      .catch(() => {});
    console.debug("[Speekify:Offscreen] Sentence end", {
      queueIndex,
      sentenceIndex: chunk.index,
    });
    queueIndex += 1;
  }
  console.info("[Speekify:Offscreen] Queue finished");
  if (state !== "idle") postStatus("idle");
}

function stopAll(): void {
  console.info("[Speekify:Offscreen] Stopping playback");
  if (currentSource) {
    try {
      currentSource.stop();
    } catch {}
    currentSource = null;
  }
  queue = [];
  queueIndex = 0;
  postStatus("idle");
}

chrome.runtime.onMessage.addListener((msg: Msg) => {
  console.debug("[Speekify:Offscreen] Received message", msg.type);
  switch (msg.type) {
    case "tts:read":
      stopAll();
      queue = msg.sentences;
      queueIndex = 0;
      activeTabId = msg.tabId;
      activeVoice = msg.voice;
      activeSpeed = msg.speed;
      void runQueue();
      break;
    case "tts:pause":
      if (state === "playing") {
        audioCtx?.suspend();
        postStatus("paused");
      }
      break;
    case "tts:resume":
      if (state === "paused") {
        audioCtx?.resume();
        postStatus("playing");
      }
      break;
    case "tts:stop":
      stopAll();
      break;
  }
});

postStatus("idle");
