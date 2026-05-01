import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { getSettings, setSettings, onSettingsChange } from "../lib/settings";
import { VOICES } from "../lib/messaging";
export function Popup() {
    const [settings, setLocal] = useState(null);
    const [status, setStatus] = useState({ state: "idle" });
    useEffect(() => {
        void getSettings().then(setLocal);
        return onSettingsChange(setLocal);
    }, []);
    useEffect(() => {
        const listener = (msg) => {
            if (msg.type === "tts:status")
                setStatus({ state: msg.state, message: msg.message });
        };
        chrome.runtime.onMessage.addListener(listener);
        return () => chrome.runtime.onMessage.removeListener(listener);
    }, []);
    if (!settings)
        return _jsx("div", { children: "Loading\u2026" });
    const send = (msg) => chrome.runtime.sendMessage(msg);
    const readArticle = async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id)
            await chrome.tabs.sendMessage(tab.id, { type: "content:get-article" });
    };
    return (_jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 10 }, children: [_jsx("h1", { style: { fontSize: 16, margin: 0 }, children: "Speekify" }), _jsxs("div", { style: { fontSize: 12, opacity: 0.7 }, children: [status.state, status.message ? ` · ${status.message}` : ""] }), _jsx("button", { onClick: readArticle, children: "Read this page" }), _jsxs("div", { style: { display: "flex", gap: 6 }, children: [_jsx("button", { onClick: () => send({ type: "tts:pause" }), children: "Pause" }), _jsx("button", { onClick: () => send({ type: "tts:resume" }), children: "Resume" }), _jsx("button", { onClick: () => send({ type: "tts:stop" }), children: "Stop" })] }), _jsxs("label", { style: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }, children: ["Voice", _jsx("select", { value: settings.voice, onChange: (e) => setSettings({ voice: e.target.value }), children: VOICES.map((v) => (_jsx("option", { value: v, children: v }, v))) })] }), _jsxs("label", { style: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }, children: ["Speed: ", settings.speed.toFixed(2), "\u00D7", _jsx("input", { type: "range", min: 0.75, max: 1.5, step: 0.05, value: settings.speed, onChange: (e) => setSettings({ speed: Number(e.target.value) }) })] }), _jsx("a", { href: "#", onClick: (e) => { e.preventDefault(); chrome.runtime.openOptionsPage(); }, style: { fontSize: 12 }, children: "Advanced settings \u2192" })] }));
}
