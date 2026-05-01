import { getSettings } from "../lib/settings";
const OFFSCREEN_URL = "src/offscreen/offscreen.html";
let creating = null;
async function ensureOffscreen() {
    const has = await chrome.offscreen.hasDocument();
    if (has)
        return;
    if (creating)
        return creating;
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
    if (!tab?.id)
        return;
    if (info.menuItemId === "speekify-read-selection" && info.selectionText) {
        await readText(tab.id, info.selectionText);
    }
    else if (info.menuItemId === "speekify-read-article") {
        await chrome.tabs.sendMessage(tab.id, { type: "content:get-article" });
    }
});
async function readText(tabId, text) {
    const sentences = text
        .split(/(?<=[.!?])\s+/)
        .map((s, i) => ({ index: i, text: s.trim(), offset: 0 }))
        .filter((s) => s.text.length > 0);
    await startTts(tabId, sentences);
}
async function startTts(tabId, sentences) {
    await ensureOffscreen();
    const { voice, speed } = await getSettings();
    const msg = { type: "tts:read", sentences, tabId, voice, speed };
    await chrome.runtime.sendMessage(msg);
}
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    (async () => {
        switch (msg.type) {
            case "content:read-article":
                if (sender.tab?.id) {
                    await chrome.tabs.sendMessage(sender.tab.id, { type: "content:get-article" });
                }
                break;
            case "content:read-selection":
                if (sender.tab?.id)
                    await readText(sender.tab.id, msg.text);
                break;
            case "content:article-result":
                if (sender.tab?.id)
                    await startTts(sender.tab.id, msg.sentences);
                break;
            case "tts:pause":
            case "tts:resume":
            case "tts:stop":
                await ensureOffscreen();
                await chrome.runtime.sendMessage(msg);
                break;
            case "tts:status":
                // pass-through to popup listeners
                break;
            case "tts:sentence-start":
            case "tts:sentence-end":
                if (msg.tabId)
                    await chrome.tabs.sendMessage(msg.tabId, msg).catch(() => { });
                break;
        }
        sendResponse?.({ ok: true });
    })();
    return true;
});
