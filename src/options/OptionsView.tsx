import { useEffect, useState } from "react";
import { getSettings, setSettings, onSettingsChange } from "../lib/settings";
import { VOICES, type Settings, type Voice } from "../lib/messaging";

const DTYPES = ["fp32", "fp16", "q8", "q4f16", "q4"] as const;

export function Options() {
  const [s, setS] = useState<Settings | null>(null);
  useEffect(() => {
    void getSettings().then(setS);
    return onSettingsChange(setS);
  }, []);

  if (!s) return <div>Loading…</div>;

  const clearCache = async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    alert("Model cache cleared. The next read will re-download the model.");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h1>Speekify · Settings</h1>

      <section>
        <h2 style={{ fontSize: 14 }}>Voice</h2>
        <select value={s.voice} onChange={(e) => setSettings({ voice: e.target.value as Voice })}>
          {VOICES.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </section>

      <section>
        <h2 style={{ fontSize: 14 }}>Model quantization</h2>
        <select
          value={s.dtype}
          onChange={(e) => setSettings({ dtype: e.target.value as Settings["dtype"] })}
        >
          {DTYPES.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <p style={{ fontSize: 12, opacity: 0.7 }}>
          q8 (~92 MB) is recommended. Lower precisions use less memory but may degrade quality.
          Changing this requires re-downloading the model.
        </p>
      </section>

      <section>
        <h2 style={{ fontSize: 14 }}>Cache</h2>
        <button onClick={clearCache}>Clear model cache</button>
      </section>
    </div>
  );
}
