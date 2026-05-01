export const VOICES = ["af_heart", "af_bella", "am_adam"];
export const DEFAULT_SETTINGS = {
    voice: "af_heart",
    speed: 1.0,
    dtype: "q8",
};
export const send = (msg) => chrome.runtime.sendMessage(msg);
export const sendToTab = (tabId, msg) => chrome.tabs.sendMessage(tabId, msg);
