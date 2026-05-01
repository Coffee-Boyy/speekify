import { defineManifest } from "@crxjs/vite-plugin";
export default defineManifest({
    manifest_version: 3,
    name: "Speekify",
    version: "0.1.0",
    description: "Read web pages aloud with on-device Kokoro TTS.",
    action: {
        default_popup: "src/popup/popup.html",
        default_title: "Speekify",
    },
    options_page: "src/options/options.html",
    background: {
        service_worker: "src/background/service-worker.ts",
        type: "module",
    },
    content_scripts: [
        {
            matches: ["<all_urls>"],
            js: ["src/content/content.ts"],
            run_at: "document_idle",
        },
    ],
    permissions: ["contextMenus", "offscreen", "storage", "activeTab", "scripting"],
    host_permissions: [
        "https://huggingface.co/*",
        "https://*.hf.co/*",
        "https://cdn-lfs.huggingface.co/*",
        "https://cdn-lfs-us-1.huggingface.co/*",
    ],
    web_accessible_resources: [
        {
            resources: ["src/offscreen/offscreen.html", "assets/*", "*.wasm", "*.mjs"],
            matches: ["<all_urls>"],
        },
    ],
    icons: {
        "16": "public/icons/16.png",
        "32": "public/icons/32.png",
        "48": "public/icons/48.png",
        "128": "public/icons/128.png",
    },
});
