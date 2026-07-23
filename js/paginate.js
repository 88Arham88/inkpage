// Splits raw text into pages of lines, based on how many lines
// fit a single sheet at the current line-height / font-size.
// Works on paragraphs (blank-line separated) so we never cut mid-sentence
// oddly across a page unless a single paragraph itself overflows.

function estimateLinesPerPage(lineHeightPx, sheetInnerHeightPx) {
  return Math.max(1, Math.floor(sheetInnerHeightPx / lineHeightPx));
}

function wrapParagraphToLines(paragraph, charsPerLine) {
  if (paragraph.trim() === "") return [""];
  const words = paragraph.split(/\s+/);
  const lines = [];
  let current = "";
  words.forEach(word => {
    const trial = current ? current + " " + word : word;
    if (trial.length > charsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = trial;
    }
  });
  if (current) lines.push(current);
  return lines;
}

function paginateText(rawText, { charsPerLine, linesPerPage }) {
  const paragraphs = rawText.split(/\n/);
  let allLines = [];
  paragraphs.forEach(p => {
    allLines = allLines.concat(wrapParagraphToLines(p, charsPerLine));
  });

  const pages = [];
  for (let i = 0; i < allLines.length; i += linesPerPage) {
    pages.push(allLines.slice(i, i + linesPerPage));
  }
  return pages.length ? pages : [[""]];
}
