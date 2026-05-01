import { useEffect, useState } from "react";
import { getSettings, setSettings, onSettingsChange } from "../lib/settings";
import { VOICES, type Settings, type Msg, type Voice } from "../lib/messaging";

export function Popup() {
  const [settings, setLocal] = useState<Settings | null>(null);
  const [status, setStatus] = useState<{ state: string; message?: string }>({ state: "idle" });

  useEffect(() => {
    void getSettings().then(setLocal);
    return onSettingsChange(setLocal);
  }, []);

  useEffect(() => {
    const listener = (msg: Msg) => {
      if (msg.type === "tts:status") setStatus({ state: msg.state, message: msg.message });
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  if (!settings) return <div>Loading…</div>;

  const send = (msg: Msg) => chrome.runtime.sendMessage(msg);
  const readArticle = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) await chrome.tabs.sendMessage(tab.id, { type: "content:get-article" } satisfies Msg);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <h1 style={{ fontSize: 16, margin: 0 }}>Speekify</h1>
      <div style={{ fontSize: 12, opacity: 0.7 }}>
        {status.state}
        {status.message ? ` · ${status.message}` : ""}
      </div>

      <button onClick={readArticle}>Read this page</button>
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={() => send({ type: "tts:pause" })}>Pause</button>
        <button onClick={() => send({ type: "tts:resume" })}>Resume</button>
        <button onClick={() => send({ type: "tts:stop" })}>Stop</button>
      </div>

      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
        Voice
        <select
          value={settings.voice}
          onChange={(e) => setSettings({ voice: e.target.value as Voice })}
        >
          {VOICES.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
        Speed: {settings.speed.toFixed(2)}×
        <input
          type="range"
          min={0.75}
          max={1.5}
          step={0.05}
          value={settings.speed}
          onChange={(e) => setSettings({ speed: Number(e.target.value) })}
        />
      </label>

      <a href="#" onClick={(e) => { e.preventDefault(); chrome.runtime.openOptionsPage(); }} style={{ fontSize: 12 }}>
        Advanced settings →
      </a>
    </div>
  );
}
