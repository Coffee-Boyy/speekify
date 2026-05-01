import { Readability } from "@mozilla/readability";
import type { SentenceChunk } from "./messaging";

export function extractArticleText(): string | null {
  const docClone = document.cloneNode(true) as Document;
  const article = new Readability(docClone).parse();
  if (!article?.textContent) return null;
  return article.textContent.replace(/\s+/g, " ").trim();
}

export function segmentIntoSentences(text: string, lang = "en"): SentenceChunk[] {
  const segmenter = new Intl.Segmenter(lang, { granularity: "sentence" });
  const out: SentenceChunk[] = [];
  let i = 0;
  for (const seg of segmenter.segment(text)) {
    const trimmed = seg.segment.trim();
    if (trimmed.length === 0) continue;
    out.push({ index: i++, text: trimmed, offset: seg.index });
  }
  return out;
}

export function getSelectionText(): string {
  return window.getSelection()?.toString().trim() ?? "";
}
