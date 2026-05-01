import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { getSettings, setSettings, onSettingsChange } from "../lib/settings";
import { VOICES } from "../lib/messaging";
const DTYPES = ["fp32", "fp16", "q8", "q4f16", "q4"];
export function Options() {
    const [s, setS] = useState(null);
    useEffect(() => {
        void getSettings().then(setS);
        return onSettingsChange(setS);
    }, []);
    if (!s)
        return _jsx("div", { children: "Loading\u2026" });
    const clearCache = async () => {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
        alert("Model cache cleared. The next read will re-download the model.");
    };
    return (_jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 16 }, children: [_jsx("h1", { children: "Speekify \u00B7 Settings" }), _jsxs("section", { children: [_jsx("h2", { style: { fontSize: 14 }, children: "Voice" }), _jsx("select", { value: s.voice, onChange: (e) => setSettings({ voice: e.target.value }), children: VOICES.map((v) => (_jsx("option", { value: v, children: v }, v))) })] }), _jsxs("section", { children: [_jsx("h2", { style: { fontSize: 14 }, children: "Model quantization" }), _jsx("select", { value: s.dtype, onChange: (e) => setSettings({ dtype: e.target.value }), children: DTYPES.map((d) => (_jsx("option", { value: d, children: d }, d))) }), _jsx("p", { style: { fontSize: 12, opacity: 0.7 }, children: "q8 (~92 MB) is recommended. Lower precisions use less memory but may degrade quality. Changing this requires re-downloading the model." })] }), _jsxs("section", { children: [_jsx("h2", { style: { fontSize: 14 }, children: "Cache" }), _jsx("button", { onClick: clearCache, children: "Clear model cache" })] })] }));
}
