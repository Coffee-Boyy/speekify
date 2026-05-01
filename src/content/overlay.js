import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
let api = null;
function Overlay({ initial, register }) {
    const [s, setS] = useState(initial);
    useEffect(() => {
        register(setS);
    }, [register]);
    if (!s.visible)
        return null;
    const send = (a) => api?.onAction(a);
    return (_jsxs("div", { style: {
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
        }, children: [_jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center" }, children: [_jsx("strong", { children: "Speekify" }), _jsx("span", { style: { opacity: 0.7 }, children: s.status })] }), s.message && _jsx("div", { style: { opacity: 0.7, marginTop: 4 }, children: s.message }), s.active && (_jsxs("div", { style: { marginTop: 6, fontStyle: "italic", opacity: 0.9 }, children: ["\u201C", s.active.slice(0, 140), s.active.length > 140 ? "…" : "", "\u201D"] })), _jsxs("div", { style: { display: "flex", gap: 6, marginTop: 8 }, children: [_jsx("button", { onClick: () => send("pause"), style: btn, children: "Pause" }), _jsx("button", { onClick: () => send("resume"), style: btn, children: "Resume" }), _jsx("button", { onClick: () => send("stop"), style: btn, children: "Stop" })] })] }));
}
const btn = {
    background: "#2a2a2a",
    color: "#fff",
    border: "1px solid #444",
    borderRadius: 6,
    padding: "4px 8px",
    fontSize: 12,
    cursor: "pointer",
};
export function mountOverlay() {
    const host = document.createElement("div");
    host.id = "speekify-root";
    const shadow = host.attachShadow({ mode: "open" });
    const mount = document.createElement("div");
    shadow.appendChild(mount);
    document.documentElement.appendChild(host);
    let setState = null;
    let current = { visible: false, active: "", status: "idle", message: "" };
    const root = createRoot(mount);
    root.render(_jsx(Overlay, { initial: current, register: (setter) => {
            setState = setter;
        } }));
    const update = (patch) => {
        current = { ...current, ...patch };
        setState?.(current);
    };
    api = {
        show: () => update({ visible: true }),
        hide: () => update({ visible: false }),
        setActiveSentence: (text) => update({ active: text }),
        setState: (status, message) => update({ status, message: message ?? "", visible: true }),
        setError: (msg) => update({ message: msg, visible: true, status: "error" }),
        onAction: () => { },
    };
    return api;
}
