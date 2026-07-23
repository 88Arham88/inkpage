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
      lineDiv.style.height = opts.lineHeightPx + "px";
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
    // Rough heuristic: average handwriting-font glyph width ~0.52em
    const emPx = fontSizePx * sizeAdjust;
    const avgCharWidth = emPx * 0.52;
    const usableWidthPx = 794 - leftPadding - 50; // sheet width minus left/right padding
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
      pageContainer.appendChild(sheet);
    });
  }

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
    const sheets = pageContainer.querySelectorAll(".sheet");
    if (!sheets.length) return;
    const btn = format === "pdf" ? downloadPdfBtn : downloadPngBtn;
    const originalLabel = btn.textContent;
    btn.disabled = true;

    // Large documents need a lower capture scale or the browser can run out
    // of memory / time mid-batch and silently fail on later pages.
    const scale = sheets.length > 15 ? 1.5 : sheets.length > 6 ? 2 : 3;
    let failedPages = [];

    try {
      if (format === "png") {
        for (let i = 0; i < sheets.length; i++) {
          btn.textContent = `Rendering ${i + 1}/${sheets.length}…`;
          try {
            const canvas = await html2canvas(sheets[i], { scale, useCORS: true, backgroundColor: "#FFFFFF" });
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
        const pdf = new jsPDF({ unit: "mm", format: "a4" });
        let addedAny = false;
        for (let i = 0; i < sheets.length; i++) {
          btn.textContent = `Rendering ${i + 1}/${sheets.length}…`;
          try {
            const canvas = await html2canvas(sheets[i], { scale, useCORS: true, backgroundColor: "#FFFFFF" });
            const imgData = canvas.toDataURL("image/png");
            if (addedAny) pdf.addPage();
            pdf.addImage(imgData, "PNG", 0, 0, 210, 297);
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
