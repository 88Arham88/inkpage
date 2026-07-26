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

  // ---------- Canvas-based export rendering ----------
  // Drawing pages directly via Canvas 2D instead of using html2canvas.
  // Canvas text rendering goes through the browser's real font engine
  // directly (no DOM-cloning step involved), so once a font is confirmed
  // loaded via document.fonts, it reliably applies - this sidesteps the
  // font-detection unreliability html2canvas kept exhibiting. Bonus:
  // canvas measureText() gives exact pixel widths per character, so
  // pagination here is precise instead of an estimate.
  function wrapParagraphByMeasuredWidth(paragraph, ctx, maxWidth) {
    if (paragraph.trim() === "") return [""];
    const words = paragraph.split(/\s+/);
    const lines = [];
    let current = "";
    words.forEach(word => {
      const trial = current ? current + " " + word : word;
      if (ctx.measureText(trial).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = trial;
      }
    });
    if (current) lines.push(current);
    return lines;
  }

  function paginateByMeasuredWidth(rawText, ctx, maxWidth, linesPerPage) {
    const paragraphs = rawText.split(/\n/);
    let allLines = [];
    paragraphs.forEach(p => {
      allLines = allLines.concat(wrapParagraphByMeasuredWidth(p, ctx, maxWidth));
    });
    const pages = [];
    for (let i = 0; i < allLines.length; i += linesPerPage) {
      pages.push(allLines.slice(i, i + linesPerPage));
    }
    return pages.length ? pages : [[""]];
  }

  function drawSheetCanvas(lines, opts) {
    const W = 794, H = 1123;
    const dpr = opts.dpiScale || 2;
    const canvas = document.createElement("canvas");
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, W, H);

    const leftPad = opts.showMargin ? 90 : 32;
    const topPad = 36;

    if (opts.paperType === "ruled") {
      ctx.strokeStyle = "#B9CCE5";
      ctx.lineWidth = 1;
      for (let y = 36; y < H; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke();
      }
    } else if (opts.paperType === "grid") {
      ctx.strokeStyle = "#C7D6EA";
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 28) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 28) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke(); }
    } else if (opts.paperType === "dotted") {
      ctx.fillStyle = "#B9CCE5";
      for (let x = 12; x < W; x += 24) {
        for (let y = 12; y < H; y += 24) {
          ctx.beginPath(); ctx.arc(x, y, 1.1, 0, Math.PI * 2); ctx.fill();
        }
      }
    }

    if (opts.showMargin) {
      ctx.strokeStyle = "rgba(178,58,50,0.55)";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(70, 0); ctx.lineTo(70, H); ctx.stroke();
    }
    if (opts.showPunch) {
      ctx.fillStyle = "#F7F0E3";
      ctx.strokeStyle = "rgba(27,42,74,0.25)";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const holeY = H * ((i + 1) / 4);
        ctx.beginPath(); ctx.arc(29, holeY, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    }

    const primaryFamily = opts.font.family.split(",")[0].replace(/'/g, "").trim();
    const fontPx = opts.size * opts.font.sizeAdjust;
    ctx.font = `${opts.font.weight} ${fontPx}px "${primaryFamily}"`;
    ctx.fillStyle = opts.ink;
    ctx.textBaseline = "alphabetic";

    let y = topPad + fontPx * 0.85;
    lines.forEach(line => {
      if (line === "") { y += opts.lineHeightPx; return; }
      let x = leftPad;
      [...line].forEach((ch, ci) => {
        const w = ctx.measureText(ch).width;
        if (opts.jitterAmt > 0 && ch !== " ") {
          const seed = ci * 7 + ch.charCodeAt(0);
          const rot = (seededRandom(seed) - 0.5) * opts.jitterAmt * (Math.PI / 180) * 3;
          const dy = (seededRandom(seed + 1) - 0.5) * opts.jitterAmt * 0.5;
          ctx.save();
          ctx.translate(x + w / 2, y + dy);
          ctx.rotate(rot);
          ctx.fillText(ch, -w / 2, 0);
          ctx.restore();
        } else {
          ctx.fillText(ch, x, y);
        }
        x += w;
      });
      y += opts.lineHeightPx;
    });

    return canvas;
  }

  // ---------- Export ----------
  async function exportPages(format) {
    const visibleSheets = pageContainer.querySelectorAll(".sheet");
    if (!visibleSheets.length) return;
    const btn = format === "pdf" ? downloadPdfBtn : downloadPngBtn;
    const originalLabel = btn.textContent;
    btn.disabled = true;

    const font = currentFont();
    const size = parseInt(fontSize.value, 10);
    const lh = parseInt(lineHeight.value, 10);
    const jAmt = parseInt(jitter.value, 10);
    const ink = inkColor.value;
    const paper = paperSelect.value;
    const showMargin = marginLine.checked;
    const showPunch = showHoles.checked;

    try {
      // Confirm the font is actually loaded before we measure/draw with it -
      // canvas text rendering respects document.fonts reliably (no
      // DOM-cloning step involved, unlike the html2canvas approach this
      // replaces), so this check is meaningful here.
      const primaryFontName = font.family.split(",")[0].replace(/'/g, "").trim();
      const fontPx = size * font.sizeAdjust;
      try {
        await document.fonts.load(`${font.weight} ${fontPx}px "${primaryFontName}"`);
        await document.fonts.ready;
      } catch (fontErr) {
        console.warn("Font load check failed, proceeding anyway", fontErr);
      }

      const topBottomPadding = 36 + 40;
      const sheetInnerHeight = 1123 - topBottomPadding;
      const linesPerPage = estimateLinesPerPage(lh, sheetInnerHeight);
      const leftPadding = showMargin ? 90 : 32;
      const maxTextWidth = 794 - leftPadding - 40;

      const measureCanvas = document.createElement("canvas");
      const measureCtx = measureCanvas.getContext("2d");
      measureCtx.font = `${font.weight} ${fontPx}px "${primaryFontName}"`;
      const pages = paginateByMeasuredWidth(sourceText.value, measureCtx, maxTextWidth, linesPerPage);

      // Large documents need a lower capture scale or files get unwieldy.
      const scale = pages.length > 25 ? 1.5 : pages.length > 15 ? 2 : pages.length > 6 ? 2.5 : 3;

      if (format === "png") {
        for (let i = 0; i < pages.length; i++) {
          btn.textContent = `Rendering ${i + 1}/${pages.length}…`;
          const canvas = drawSheetCanvas(pages[i], {
            font, size, ink, lineHeightPx: lh, jitterAmt: jAmt,
            paperType: paper, showMargin, showPunch, dpiScale: scale
          });
          const link = document.createElement("a");
          link.download = `inkpage-${i + 1}.png`;
          link.href = canvas.toDataURL("image/png");
          link.click();
          await new Promise(r => setTimeout(r, 60));
        }
      } else {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
        for (let i = 0; i < pages.length; i++) {
          btn.textContent = `Rendering ${i + 1}/${pages.length}…`;
          const canvas = drawSheetCanvas(pages[i], {
            font, size, ink, lineHeightPx: lh, jitterAmt: jAmt,
            paperType: paper, showMargin, showPunch, dpiScale: scale
          });
          const imgData = canvas.toDataURL("image/jpeg", 0.88);
          if (i > 0) pdf.addPage();
          pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);
        }
        pdf.save("inkpage.pdf");
      }
    } catch (err) {
      console.error("Export failed", err);
      alert("Export failed — try again, or try a shorter section of text first.");
    } finally {
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
