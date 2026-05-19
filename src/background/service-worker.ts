import { getSettings } from "../lib/settings";
import type { Msg, SentenceChunk } from "../lib/messaging";

const OFFSCREEN_URL = "src/offscreen/offscreen.html";
let creating: Promise<void> | null = null;
let latestStatus: Extract<Msg, { type: "tts:status" }> = {
  type: "tts:status",
  state: "idle",
};

async function ensureOffscreen(): Promise<void> {
  const has = await chrome.offscreen.hasDocument();
  if (has) {
    console.debug("[Speekify:BG] Offscreen document already exists");
    return;
  }
  if (creating) return creating;
  console.info("[Speekify:BG] Creating offscreen document");
  creating = chrome.offscreen
    .createDocument({
      url: OFFSCREEN_URL,
      reasons: [chrome.offscreen.Reason.AUDIO_PLAYBACK, chrome.offscreen.Reason.WORKERS],
      justification: "Run Kokoro TTS WebAssembly model and play synthesized audio.",
    })
    .finally(() => {
      creating = null;
    });
  return creating;
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "speekify-read-selection",
    title: "Read selection with Speekify",
    contexts: ["selection"],
  });
  chrome.contextMenus.create({
    id: "speekify-read-article",
    title: "Read article with Speekify",
    contexts: ["page"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;
  if (info.menuItemId === "speekify-read-selection" && info.selectionText) {
    await readText(tab.id, info.selectionText);
  } else if (info.menuItemId === "speekify-read-article") {
    await chrome.tabs
      .sendMessage(tab.id, { type: "content:get-article" } satisfies Msg)
      .catch(() => {});
  }
});

async function readText(tabId: number, text: string): Promise<void> {
  const sentences: SentenceChunk[] = text
    .split(/(?<=[.!?])\s+/)
    .map((s, i) => ({ index: i, text: s.trim(), offset: 0 }))
    .filter((s) => s.text.length > 0);
  await startTts(tabId, sentences);
}

async function sendToOffscreen(msg: Msg): Promise<void> {
  await ensureOffscreen();
  try {
    console.debug("[Speekify:BG] Sending message to offscreen", msg.type);
    await chrome.runtime.sendMessage(msg);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("Receiving end does not exist")) throw error;
    // Offscreen can take a moment to register listeners after creation.
    console.warn("[Speekify:BG] Offscreen listener not ready, retrying", { msgType: msg.type });
    await new Promise((resolve) => setTimeout(resolve, 120));
    await chrome.runtime.sendMessage(msg);
  }
}

async function startTts(tabId: number, sentences: SentenceChunk[]): Promise<void> {
  const { voice, speed } = await getSettings();
  console.info("[Speekify:BG] Starting TTS", {
    tabId,
    sentences: sentences.length,
    voice,
    speed,
  });
  const msg: Msg = { type: "tts:read", sentences, tabId, voice, speed };
  await sendToOffscreen(msg);
}

chrome.runtime.onMessage.addListener((msg: Msg, sender, sendResponse) => {
  (async () => {
    console.debug("[Speekify:BG] Received message", { type: msg.type, fromTab: sender.tab?.id });
    let response: unknown = { ok: true };
    switch (msg.type) {
      case "content:read-article":
        if (sender.tab?.id) {
          await chrome.tabs.sendMessage(sender.tab.id, { type: "content:get-article" } satisfies Msg);
        }
        break;
      case "content:read-selection":
        if (sender.tab?.id) await readText(sender.tab.id, msg.text);
        break;
      case "content:article-result":
        if (sender.tab?.id) await startTts(sender.tab.id, msg.sentences);
        break;
      case "tts:pause":
      case "tts:resume":
      case "tts:stop":
        // Popup/content messages are broadcast and already reach offscreen.
        // Do not re-send here, or the service worker can loop on its own message.
        break;
      case "tts:status":
        latestStatus = msg;
        console.debug("[Speekify:BG] Status update", {
          state: msg.state,
          progress: msg.progress,
          message: msg.message,
        });
        // pass-through to popup listeners
        break;
      case "tts:get-status":
        console.debug("[Speekify:BG] Returning latest status", latestStatus);
        response = latestStatus;
        break;
      case "tts:sentence-start":
      case "tts:sentence-end":
        if (msg.tabId) await chrome.tabs.sendMessage(msg.tabId, msg).catch(() => {});
        break;
    }
    sendResponse?.(response);
  })();
  return true;
});

export {};
