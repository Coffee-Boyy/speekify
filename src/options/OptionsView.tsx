import { useEffect, useState } from "react";
import { getSettings, setSettings, onSettingsChange } from "../lib/settings";
import { VOICES, type Settings, type Voice } from "../lib/messaging";

const DTYPES = ["fp32", "fp16", "q8", "q4f16", "q4"] as const;

export function Options() {
  const [s, setS] = useState<Settings | null>(null);
  const [cacheStatus, setCacheStatus] = useState<{
    loading: boolean;
    hasModel: boolean;
    files: number;
    sizeBytes: number;
    error?: string;
  }>({
    loading: true,
    hasModel: false,
    files: 0,
    sizeBytes: 0,
  });

  useEffect(() => {
    void getSettings().then(setS);
    return onSettingsChange(setS);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const updateCacheStatus = async () => {
      setCacheStatus((prev) => ({ ...prev, loading: true, error: undefined }));
      try {
        const cacheNames = await caches.keys();
        const requests: Request[] = [];
        for (const name of cacheNames) {
          const cache = await caches.open(name);
          const keys = await cache.keys();
          requests.push(...keys);
        }

        const modelRequests = requests.filter((req) => {
          const url = req.url.toLowerCase();
          return (
            url.includes("kokoro-82m-onnx") ||
            url.includes("onnx-community") ||
            url.includes("huggingface.co") ||
            url.endsWith(".onnx") ||
            url.endsWith(".ort") ||
            url.endsWith(".bin")
          );
        });

        let sizeBytes = 0;
        for (const req of modelRequests) {
          const res = await caches.match(req);
          if (!res) continue;
          const buf = await res.clone().arrayBuffer();
          sizeBytes += buf.byteLength;
        }

        if (cancelled) return;
        console.info("[Speekify:Options] Cache scan complete", {
          caches: cacheNames.length,
          modelFiles: modelRequests.length,
          sizeBytes,
        });
        setCacheStatus({
          loading: false,
          hasModel: modelRequests.length > 0,
          files: modelRequests.length,
          sizeBytes,
        });
      } catch (error) {
        console.error("[Speekify:Options] Cache scan failed", error);
        if (cancelled) return;
        setCacheStatus({
          loading: false,
          hasModel: false,
          files: 0,
          sizeBytes: 0,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

    void updateCacheStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!s) return <div>Loading…</div>;

  const clearCache = async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    console.info("[Speekify:Options] Cleared caches", { deleted: keys.length });
    setCacheStatus({
      loading: false,
      hasModel: false,
      files: 0,
      sizeBytes: 0,
    });
    alert("Model cache cleared. The next read will re-download the model.");
  };

  const refreshCacheStatus = async () => {
    setCacheStatus((prev) => ({ ...prev, loading: true, error: undefined }));
    try {
      const cacheNames = await caches.keys();
      const requests: Request[] = [];
      for (const name of cacheNames) {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        requests.push(...keys);
      }
      const modelRequests = requests.filter((req) => {
        const url = req.url.toLowerCase();
        return (
          url.includes("kokoro-82m-onnx") ||
          url.includes("onnx-community") ||
          url.includes("huggingface.co") ||
          url.endsWith(".onnx") ||
          url.endsWith(".ort") ||
          url.endsWith(".bin")
        );
      });

      let sizeBytes = 0;
      for (const req of modelRequests) {
        const res = await caches.match(req);
        if (!res) continue;
        const buf = await res.clone().arrayBuffer();
        sizeBytes += buf.byteLength;
      }

      console.info("[Speekify:Options] Cache refresh complete", {
        caches: cacheNames.length,
        modelFiles: modelRequests.length,
        sizeBytes,
      });
      setCacheStatus({
        loading: false,
        hasModel: modelRequests.length > 0,
        files: modelRequests.length,
        sizeBytes,
      });
    } catch (error) {
      console.error("[Speekify:Options] Cache refresh failed", error);
      setCacheStatus({
        loading: false,
        hasModel: false,
        files: 0,
        sizeBytes: 0,
        error: error instanceof Error ? error.message : String(error),
      });
    }
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
        <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>
          {cacheStatus.loading
            ? "Checking model cache…"
            : cacheStatus.error
              ? `Could not read cache: ${cacheStatus.error}`
              : cacheStatus.hasModel
                ? `Model cached: yes (${cacheStatus.files} files, ${(cacheStatus.sizeBytes / (1024 * 1024)).toFixed(1)} MB)`
                : "Model cached: no"}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={refreshCacheStatus}>Refresh cache status</button>
          <button onClick={clearCache}>Clear model cache</button>
        </div>
      </section>
    </div>
  );
}
