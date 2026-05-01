import { DEFAULT_SETTINGS } from "./messaging";
export async function getSettings() {
    const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
    return stored;
}
export async function setSettings(patch) {
    await chrome.storage.sync.set(patch);
}
export function onSettingsChange(cb) {
    const listener = async (_changes, area) => {
        if (area === "sync")
            cb(await getSettings());
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
}
