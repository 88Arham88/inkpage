(function () {
  const fontSelect = document.getElementById("fontSelect");
  const paperSelect = document.getElementById("paperSelect");
  const inkColor = document.getElementById("inkColor");
  const fontSize = document.getElementById("fontSize");
  const lineHeight = document.getElementById("lineHeight");
  const jitter = document.getElementById("jitter");
  const fontSizeVal = document.getElementById("fontSizeVal");
  const lineHeightVal = document.getElementById("lineHeightVal");
  const jitterVal = document.getElementById("jitterVal");

  function updateValueBadges() {
    fontSizeVal.textContent = fontSize.value;
    lineHeightVal.textContent = lineHeight.value;
    jitterVal.textContent = jitter.value;
  }
  const marginLine = document.getElementById("marginLine");
  const showHoles = document.getElementById("showHoles");
  const sourceText = document.getElementById("sourceText");
  const pageContainer = document.getElementById("pageContainer");
  const clearBtn = document.getElementById("clearBtn");
  const downloadPdfBtn = document.getElementById("downloadPdf");
  const downloadPngBtn = document.getElementById("downloadPng");
  const heroDemoText = document.getElementById("heroDemoText");
  const customFontInput = document.getElementById("customFontInput");
  const customFontStatus = document.getElementById("customFontStatus");

  // ---------- Populate font dropdown ----------
  function populateFonts() {
    fontSelect.innerHTML = "";
    getAllFonts().forEach(f => {
      const opt = document.createElement("option");
      opt.value = f.id;
      opt.textContent = f.name;
      fontSelect.appendChild(opt);
    });
  }
  populateFonts();

  function currentFont() {
    return getAllFonts().find(f => f.id === fontSelect.value) || getAllFonts()[0];
  }

  // ---------- Character jitter ----------
  // Deterministic-ish pseudo-random so re-renders at the same settings
  // don't visibly "jump" — seeded by char index + char code.
  function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  function renderTextToSheet(sheetTextEl, lines, opts) {
    sheetTextEl.innerHTML = "";
    sheetTextEl.style.fontFamily = opts.font.family;
    sheetTextEl.style.fontWeight = opts.font.weight;
    sheetTextEl.style.color = opts.ink;
    sheetTextEl.style.fontSize = (opts.size * opts.font.sizeAdjust) + "px";
    sheetTextEl.style.lineHeight = opts.lineHeightPx + "px";

    lines.forEach((line, li) => {
      const lineDiv = document.createElement("div");
      if (line === "") {
        lineDiv.innerHTML = "&nbsp;";
        sheetTextEl.appendChild(lineDiv);
        return;
      }
      [...line].forEach((ch, ci) => {
        const span = document.createElement("span");
        span.className = "char";
        span.textContent = ch;
        if (opts.jitterAmt > 0 && ch !== " ") {
          const seed = li * 137 + ci * 7 + ch.charCodeAt(0);
          const rot = (seededRandom(seed) - 0.5) * opts.jitterAmt;
          const dy = (seededRandom(seed + 1) - 0.5) * (opts.jitterAmt * 0.5);
          span.style.transform = `rotate(${rot}deg) translateY(${dy}px)`;
        }
        lineDiv.appendChild(span);
      });
      sheetTextEl.appendChild(lineDiv);
    });
  }

  function buildSheet(paperType, showMargin, showPunch) {
    const sheet = document.createElement("div");
    sheet.className = `sheet ${paperType}${showMargin ? "" : " no-margin"}`;
    if (showMargin) {
      const m = document.createElement("div");
      m.className = "margin-line";
      sheet.appendChild(m);
    }
    if (showPunch) {
      const holes = document.createElement("div");
      holes.className = "holes";
      for (let i = 0; i < 3; i++) holes.appendChild(document.createElement("span"));
      sheet.appendChild(holes);
    }
    const textEl = document.createElement("div");
    textEl.className = "sheet-text";
    sheet.appendChild(textEl);
    return { sheet, textEl };
  }

  function estimateCharsPerLine(fontSizePx, sizeAdjust, leftPadding) {
    // Rough heuristic: average handwriting-font glyph width ~0.5em.
    // NOTE: going tighter than this causes real glyph overlap in the
    // actual rendered font (garbled/merged-looking letters), not just
    // wasted margin - handwriting fonts are wider per-character than
    // this formula assumes, so this value should not be reduced further
    // without visually testing every font in the library.
    const emPx = fontSizePx * sizeAdjust;
    const avgCharWidth = emPx * 0.5;
    const usableWidthPx = 794 - leftPadding - 40; // sheet width minus left/right padding
    return Math.max(10, Math.floor(usableWidthPx / avgCharWidth));
  }

  function render() {
    updateValueBadges();
    const font = currentFont();
    const size = parseInt(fontSize.value, 10);
    const lh = parseInt(lineHeight.value, 10);
    const jAmt = parseInt(jitter.value, 10);
    const ink = inkColor.value;
    const paper = paperSelect.value;
    const showMargin = marginLine.checked;
    const showPunch = showHoles.checked;

    const topBottomPadding = 36 + 40; // matches .sheet padding-top + padding-bottom
    const sheetInnerHeight = 1123 - topBottomPadding;
    const linesPerPage = estimateLinesPerPage(lh, sheetInnerHeight);
    const leftPadding = marginLine.checked ? 90 : 32;
    const charsPerLine = estimateCharsPerLine(size, font.sizeAdjust, leftPadding);

    const pages = paginateText(sourceText.value, { charsPerLine, linesPerPage });

    pageContainer.innerHTML = "";
    pages.forEach((lines, idx) => {
      const { sheet, textEl } = buildSheet(paper, showMargin, showPunch);
      renderTextToSheet(textEl, lines, {
        font, size, ink, lineHeightPx: lh, jitterAmt: jAmt
      });
      const frame = document.createElement("div");
      frame.className = "sheet-frame";
      frame.appendChild(sheet);
      pageContainer.appendChild(frame);
    });

    applyResponsiveScale();
  }

  // ---------- Responsive scaling ----------
  // The sheet itself always stays a fixed A4 pixel size internally
  // (so export/html2canvas capture is always full, correct resolution).
  // We just visually shrink it to fit the available viewport width
  // via CSS transform, and resize the wrapper box to match so layout
  // (scrolling, spacing) stays correct.
  const SHEET_W = 794;
  const SHEET_H = 1123;

  function applyResponsiveScale() {
    const wrapWidth = pageContainer.parentElement.clientWidth;
    const availableWidth = Math.max(200, wrapWidth - 8); // small breathing room
    const scale = Math.min(1, availableWidth / SHEET_W);

    document.querySelectorAll(".sheet-frame").forEach(frame => {
      const sheet = frame.querySelector(".sheet");
      sheet.style.transform = `scale(${scale})`;
      frame.style.width = (SHEET_W * scale) + "px";
      frame.style.height = (SHEET_H * scale) + "px";
    });
  }

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(applyResponsiveScale, 120);
  });

  // ---------- Hero demo (typewriter into handwriting) ----------
  function runHeroDemo() {
    const demoLine = "Your notes, in your own handwriting.";
    let i = 0;
    heroDemoText.style.fontFamily = "'Kalam', cursive";
    function tick() {
      heroDemoText.textContent = demoLine.slice(0, i);
      i++;
      if (i <= demoLine.length) {
        setTimeout(tick, 55);
      } else {
        setTimeout(() => { i = 0; tick(); }, 2200);
      }
    }
    tick();
  }

  // ---------- Export ----------
  async function exportPages(format) {
    const visibleSheets = pageContainer.querySelectorAll(".sheet");
    if (!visibleSheets.length) return;
    const btn = format === "pdf" ? downloadPdfBtn : downloadPngBtn;
    const originalLabel = btn.textContent;
    btn.disabled = true;

    // Build fresh, full-size (unscaled) sheets off-screen for capture.
    // This avoids any issue with the visible copies being CSS-scaled
    // down for mobile display, or clipped by a scroll container.
    const font = currentFont();
    const size = parseInt(fontSize.value, 10);
    const lh = parseInt(lineHeight.value, 10);
    const jAmt = parseInt(jitter.value, 10);
    const ink = inkColor.value;
    const paper = paperSelect.value;
    const showMargin = marginLine.checked;
    const showPunch = showHoles.checked;
    const topBottomPadding = 36 + 40;
    const sheetInnerHeight = 1123 - topBottomPadding;
    const linesPerPage = estimateLinesPerPage(lh, sheetInnerHeight);
    const leftPadding = showMargin ? 90 : 32;
    const charsPerLine = estimateCharsPerLine(size, font.sizeAdjust, leftPadding);
    const pages = paginateText(sourceText.value, { charsPerLine, linesPerPage });

    const offscreen = document.createElement("div");
    offscreen.style.position = "fixed";
    offscreen.style.top = "-99999px";
    offscreen.style.left = "-99999px";
    document.body.appendChild(offscreen);

    // Embed the actual font bytes directly as a data-URI @font-face,
    // rather than relying on html2canvas to correctly detect an
    // externally-loaded Google Font during its internal DOM clone -
    // that detection has proven unreliable. This guarantees the font
    // is available with zero network/timing dependency during capture.
    let exportFontFamily = font.family;
    try {
      const primaryFontName = font.family.split(",")[0].replace(/'/g, "").trim();
      const isCustomUpload = CUSTOM_FONTS.some(f => f.id === font.id);
      if (!isCustomUpload) {
        const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(primaryFontName).replace(/%20/g, "+")}:wght@${font.weight}&display=swap`;
        const cssRes = await fetch(cssUrl);
        const cssText = await cssRes.text();
        const match = cssText.match(/src:\s*url\(([^)]+)\)\s*format\('woff2'\)/);
        if (match) {
          const fontRes = await fetch(match[1]);
          const fontBlob = await fontRes.blob();
          const fontDataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(fontBlob);
          });
          const localFamilyName = `ExportFont_${Date.now()}`;
          const styleEl = document.createElement("style");
          styleEl.textContent = `@font-face { font-family: '${localFamilyName}'; src: url(${fontDataUrl}) format('woff2'); }`;
          offscreen.appendChild(styleEl);
          exportFontFamily = `'${localFamilyName}'`;
          const embeddedFontFace = new FontFace(localFamilyName, `url(${fontDataUrl})`);
          await embeddedFontFace.load();
          document.fonts.add(embeddedFontFace);
        }
      }
    } catch (fontEmbedErr) {
      console.warn("Font embedding failed, falling back to normal font reference", fontEmbedErr);
    }
    const exportFont = { ...font, family: exportFontFamily };

    const sheets = pages.map(lines => {
      const { sheet, textEl } = buildSheet(paper, showMargin, showPunch);
      renderTextToSheet(textEl, lines, { font: exportFont, size, ink, lineHeightPx: lh, jitterAmt: jAmt });
      offscreen.appendChild(sheet);
      return sheet;
    });

    // Give the browser a couple of paint frames to actually apply the
    // now-embedded font to these freshly-created elements before capturing.
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    // Large documents need a lower capture scale or the browser can run out
    // of memory / time mid-batch. JPEG compression (below) keeps file size
    // reasonable even at higher scale, so we can afford more resolution
    // than before - higher resolution also reduces any pixel-level
    // ambiguity from overlapping jittered character glyphs.
    const scale = sheets.length > 25 ? 1.5 : sheets.length > 15 ? 2 : sheets.length > 6 ? 2.5 : 3;
    let failedPages = [];

    try {
      if (format === "png") {
        for (let i = 0; i < sheets.length; i++) {
          btn.textContent = `Rendering ${i + 1}/${sheets.length}…`;
          try {
            const canvas = await html2canvas(sheets[i], {
              scale, useCORS: true, backgroundColor: "#FFFFFF",
              onclone: async (clonedDoc) => {
                // html2canvas renders from an internal clone of the DOM,
                // which does not automatically inherit "already loaded"
                // web fonts from the live page - it must confirm its own
                // fonts are ready before we let html2canvas paint it.
                if (clonedDoc.fonts && clonedDoc.fonts.ready) {
                  await clonedDoc.fonts.ready;
                }
              }
            });
            const link = document.createElement("a");
            link.download = `inkpage-${i + 1}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
            await new Promise(r => setTimeout(r, 60)); // let the download register before the next one
          } catch (pageErr) {
            console.error(`Page ${i + 1} failed`, pageErr);
            failedPages.push(i + 1);
          }
        }
      } else {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
        let addedAny = false;
        for (let i = 0; i < sheets.length; i++) {
          btn.textContent = `Rendering ${i + 1}/${sheets.length}…`;
          try {
            const canvas = await html2canvas(sheets[i], {
              scale, useCORS: true, backgroundColor: "#FFFFFF",
              onclone: async (clonedDoc) => {
                if (clonedDoc.fonts && clonedDoc.fonts.ready) {
                  await clonedDoc.fonts.ready;
                }
              }
            });
            const imgData = canvas.toDataURL("image/jpeg", 0.88);
            if (addedAny) pdf.addPage();
            pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);
            addedAny = true;
          } catch (pageErr) {
            console.error(`Page ${i + 1} failed`, pageErr);
            failedPages.push(i + 1);
          }
        }
        if (addedAny) pdf.save("inkpage.pdf");
      }

      if (failedPages.length) {
        alert(`Most pages exported, but page(s) ${failedPages.join(", ")} failed. Try exporting again, or split into a shorter selection.`);
      }
    } catch (err) {
      console.error("Export failed", err);
      alert("Export failed — try again, or try a shorter section of text first.");
    } finally {
      offscreen.remove();
      btn.textContent = originalLabel;
      btn.disabled = false;
    }
  }

  // ---------- Wire up events ----------
  [fontSelect, paperSelect, inkColor, fontSize, lineHeight, jitter, marginLine, showHoles].forEach(el => {
    el.addEventListener("input", render);
    el.addEventListener("change", render);
  });
  sourceText.addEventListener("input", render);
  clearBtn.addEventListener("click", () => { sourceText.value = ""; render(); });

  customFontInput.addEventListener("change", async () => {
    const file = customFontInput.files[0];
    if (!file) return;
    customFontStatus.textContent = "Loading font…";
    try {
      const buffer = await file.arrayBuffer();
      const cleanName = file.name.replace(/\.[^/.]+$/, "");
      const familyName = `CustomFont_${Date.now()}`;
      const fontFace = new FontFace(familyName, buffer);
      await fontFace.load();
      document.fonts.add(fontFace);

      const id = `custom_${Date.now()}`;
      CUSTOM_FONTS.push({
        id, name: `${cleanName} (yours)`,
        family: `'${familyName}'`, sizeAdjust: 1.0, weight: 400
      });

      populateFonts();
      fontSelect.value = id;
      customFontStatus.textContent = `"${cleanName}" is ready — selected below.`;
      render();
    } catch (err) {
      console.error("Font load failed", err);
      customFontStatus.textContent = "Couldn't read that font file — try a .ttf or .otf export.";
    }
  });

  document.querySelectorAll(".reset-link").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = document.getElementById(btn.dataset.target);
      target.value = btn.dataset.default;
      render();
    });
  });
  downloadPdfBtn.addEventListener("click", () => exportPages("pdf"));
  downloadPngBtn.addEventListener("click", () => exportPages("png"));

  // ---------- Init ----------
  document.fonts.ready.then(() => {
    render();
    runHeroDemo();
  });
  // Fallback in case fonts.ready is slow
  setTimeout(render, 600);
})();
