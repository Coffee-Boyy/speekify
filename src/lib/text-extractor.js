import { Readability } from "@mozilla/readability";
export function extractArticleText() {
    const docClone = document.cloneNode(true);
    const article = new Readability(docClone).parse();
    if (!article?.textContent)
        return null;
    return article.textContent.replace(/\s+/g, " ").trim();
}
export function segmentIntoSentences(text, lang = "en") {
    const segmenter = new Intl.Segmenter(lang, { granularity: "sentence" });
    const out = [];
    let i = 0;
    for (const seg of segmenter.segment(text)) {
        const trimmed = seg.segment.trim();
        if (trimmed.length === 0)
            continue;
        out.push({ index: i++, text: trimmed, offset: seg.index });
    }
    return out;
}
export function getSelectionText() {
    return window.getSelection()?.toString().trim() ?? "";
}
