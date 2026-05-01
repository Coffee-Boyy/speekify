import { createRoot, type Root } from "react-dom/client";
import { useEffect, useState } from "react";

type Action = "read-article" | "read-selection" | "pause" | "resume" | "stop";

type OverlayApi = {
  show: () => void;
  hide: () => void;
  setActiveSentence: (text: string) => void;
  setState: (state: string, message?: string) => void;
  setError: (msg: string) => void;
  onAction: (action: Action) => void;
};

type OverlayState = {
  visible: boolean;
  active: string;
  status: string;
  message: string;
};

let api: OverlayApi | null = null;

function Overlay({ initial, register }: { initial: OverlayState; register: (set: (s: OverlayState) => void) => void }) {
  const [s, setS] = useState(initial);
  useEffect(() => {
    register(setS);
  }, [register]);

  if (!s.visible) return null;
  const send = (a: Action) => api?.onAction(a);
  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 2147483647,
        background: "#111",
        color: "#fff",
        borderRadius: 12,
        padding: "10px 14px",
        boxShadow: "0 6px 24px rgba(0,0,0,0.3)",
        fontFamily: "system-ui, sans-serif",
        fontSize: 13,
        maxWidth: 360,
      }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <strong>Speekify</strong>
        <span style={{ opacity: 0.7 }}>{s.status}</span>
      </div>
      {s.message && <div style={{ opacity: 0.7, marginTop: 4 }}>{s.message}</div>}
      {s.active && (
        <div style={{ marginTop: 6, fontStyle: "italic", opacity: 0.9 }}>
          “{s.active.slice(0, 140)}{s.active.length > 140 ? "…" : ""}”
        </div>
      )}
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <button onClick={() => send("pause")} style={btn}>Pause</button>
        <button onClick={() => send("resume")} style={btn}>Resume</button>
        <button onClick={() => send("stop")} style={btn}>Stop</button>
      </div>
    </div>
  );
}

const btn: React.CSSProperties = {
  background: "#2a2a2a",
  color: "#fff",
  border: "1px solid #444",
  borderRadius: 6,
  padding: "4px 8px",
  fontSize: 12,
  cursor: "pointer",
};

export function mountOverlay(): OverlayApi {
  const host = document.createElement("div");
  host.id = "speekify-root";
  const shadow = host.attachShadow({ mode: "open" });
  const mount = document.createElement("div");
  shadow.appendChild(mount);
  document.documentElement.appendChild(host);

  let setState: ((s: OverlayState) => void) | null = null;
  let current: OverlayState = { visible: false, active: "", status: "idle", message: "" };

  const root: Root = createRoot(mount);
  root.render(
    <Overlay
      initial={current}
      register={(setter) => {
        setState = setter;
      }}
    />,
  );

  const update = (patch: Partial<OverlayState>) => {
    current = { ...current, ...patch };
    setState?.(current);
  };

  api = {
    show: () => update({ visible: true }),
    hide: () => update({ visible: false }),
    setActiveSentence: (text) => update({ active: text }),
    setState: (status, message) => update({ status, message: message ?? "", visible: true }),
    setError: (msg) => update({ message: msg, visible: true, status: "error" }),
    onAction: () => {},
  };
  return api;
}
