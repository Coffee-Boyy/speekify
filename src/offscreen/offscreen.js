import { loadEngine, synthesize } from "../lib/tts-engine";
import { getSettings } from "../lib/settings";
let audioCtx = null;
let currentSource = null;
let queue = [];
let queueIndex = 0;
let activeTabId;
let activeVoice = "af_heart";
let activeSpeed = 1.0;
let state = "idle";
function postStatus(s, extra = {}) {
    const msg = { type: "tts:status", state: s, ...extra };
    chrome.runtime.sendMessage(msg).catch(() => { });
    state = s;
}
function ensureAudio() {
    if (!audioCtx)
        audioCtx = new AudioContext({ sampleRate: 24000 });
    return audioCtx;
}
async function playChunk(audio, sampleRate) {
    const ctx = ensureAudio();
    if (ctx.state === "suspended")
        await ctx.resume();
    const buffer = ctx.createBuffer(1, audio.length, sampleRate);
    buffer.getChannelData(0).set(audio);
    return new Promise((resolve) => {
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(ctx.destination);
        src.onended = () => resolve();
        currentSource = src;
        src.start();
    });
}
async function runQueue() {
    const settings = await getSettings();
    const tts = await loadEngine(settings.dtype, (info) => {
        postStatus("loading", { progress: info.progress, message: info.message });
    });
    postStatus("playing");
    while (queueIndex < queue.length && state !== "idle") {
        if (state === "paused") {
            await new Promise((r) => {
                const onChange = () => {
                    if (state !== "paused") {
                        chrome.runtime.onMessage.removeListener(onChange);
                        r();
                    }
                };
                chrome.runtime.onMessage.addListener(onChange);
            });
            continue;
        }
        const chunk = queue[queueIndex];
        chrome.runtime
            .sendMessage({ type: "tts:sentence-start", index: chunk.index, tabId: activeTabId })
            .catch(() => { });
        try {
            const { audio, sampleRate } = await synthesize(tts, chunk.text, activeVoice, activeSpeed);
            await playChunk(audio, sampleRate);
        }
        catch (err) {
            console.error("Speekify synth error", err);
        }
        chrome.runtime
            .sendMessage({ type: "tts:sentence-end", index: chunk.index, tabId: activeTabId })
            .catch(() => { });
        queueIndex += 1;
    }
    if (state !== "idle")
        postStatus("idle");
}
function stopAll() {
    if (currentSource) {
        try {
            currentSource.stop();
        }
        catch { }
        currentSource = null;
    }
    queue = [];
    queueIndex = 0;
    postStatus("idle");
}
chrome.runtime.onMessage.addListener((msg) => {
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
