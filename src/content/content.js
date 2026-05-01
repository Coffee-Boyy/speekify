import { extractArticleText, segmentIntoSentences, getSelectionText, } from "../lib/text-extractor";
import { mountOverlay } from "./overlay";
const overlay = mountOverlay();
let currentSentences = [];
function highlightSentence(index) {
    overlay.setActiveSentence(currentSentences[index]?.text ?? "");
}
function clearHighlight() {
    overlay.setActiveSentence("");
}
chrome.runtime.onMessage.addListener((msg) => {
    switch (msg.type) {
        case "content:get-article": {
            const text = extractArticleText();
            if (!text) {
                overlay.setError("Could not detect an article on this page.");
                return;
            }
            currentSentences = segmentIntoSentences(text);
            const out = { type: "content:article-result", sentences: currentSentences };
            chrome.runtime.sendMessage(out).catch(() => { });
            overlay.show();
            break;
        }
        case "tts:sentence-start":
            highlightSentence(msg.index);
            break;
        case "tts:sentence-end":
            clearHighlight();
            break;
        case "tts:status":
            overlay.setState(msg.state, msg.message);
            break;
    }
});
overlay.onAction = (action) => {
    if (action === "read-selection") {
        const sel = getSelectionText();
        if (sel)
            chrome.runtime.sendMessage({ type: "content:read-selection", text: sel });
    }
    else if (action === "read-article") {
        chrome.runtime.sendMessage({ type: "content:read-article" });
    }
    else {
        chrome.runtime.sendMessage({ type: `tts:${action}` });
    }
};
