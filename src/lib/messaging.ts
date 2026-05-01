export const VOICES = ["af_heart", "af_bella", "am_adam"] as const;
export type Voice = (typeof VOICES)[number];

export const DEFAULT_SETTINGS = {
  voice: "af_heart" as Voice,
  speed: 1.0,
  dtype: "q8" as "fp32" | "fp16" | "q8" | "q4" | "q4f16",
};
export type Settings = typeof DEFAULT_SETTINGS;

export type SentenceChunk = { index: number; text: string; offset: number };

export type Msg =
  | { type: "tts:read"; sentences: SentenceChunk[]; tabId?: number; voice: Voice; speed: number }
  | { type: "tts:pause" }
  | { type: "tts:resume" }
  | { type: "tts:stop" }
  | { type: "tts:status"; state: "idle" | "loading" | "playing" | "paused"; progress?: number; message?: string }
  | { type: "tts:sentence-start"; index: number; tabId?: number }
  | { type: "tts:sentence-end"; index: number; tabId?: number }
  | { type: "content:read-article" }
  | { type: "content:read-selection"; text: string }
  | { type: "content:get-article" }
  | { type: "content:article-result"; sentences: SentenceChunk[] };

export const send = (msg: Msg) => chrome.runtime.sendMessage(msg);
export const sendToTab = (tabId: number, msg: Msg) => chrome.tabs.sendMessage(tabId, msg);
