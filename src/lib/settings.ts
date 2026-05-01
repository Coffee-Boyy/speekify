import { DEFAULT_SETTINGS, type Settings } from "./messaging";

export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  return stored as Settings;
}

export async function setSettings(patch: Partial<Settings>): Promise<void> {
  await chrome.storage.sync.set(patch);
}

export function onSettingsChange(cb: (s: Settings) => void): () => void {
  const listener = async (
    _changes: { [key: string]: chrome.storage.StorageChange },
    area: string,
  ) => {
    if (area === "sync") cb(await getSettings());
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
