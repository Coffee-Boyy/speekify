import {
  extractArticleText,
  segmentIntoSentences,
  getSelectionText,
} from "../lib/text-extractor";
import type { Msg, SentenceChunk } from "../lib/messaging";
import { mountOverlay } from "./overlay";

const overlay = mountOverlay();

let currentSentences: SentenceChunk[] = [];

function highlightSentence(index: number): void {
  overlay.setActiveSentence(currentSentences[index]?.text ?? "");
}

function clearHighlight(): void {
  overlay.setActiveSentence("");
}

chrome.runtime.onMessage.addListener((msg: Msg) => {
  switch (msg.type) {
    case "content:get-article": {
      const text = extractArticleText();
      if (!text) {
        overlay.setError("Could not detect an article on this page.");
        return;
      }
      currentSentences = segmentIntoSentences(text);
      const out: Msg = { type: "content:article-result", sentences: currentSentences };
      chrome.runtime.sendMessage(out).catch(() => {});
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
    if (sel) chrome.runtime.sendMessage({ type: "content:read-selection", text: sel } satisfies Msg);
  } else if (action === "read-article") {
    chrome.runtime.sendMessage({ type: "content:read-article" } satisfies Msg);
  } else {
    chrome.runtime.sendMessage({ type: `tts:${action}` } satisfies Msg);
  }
};
