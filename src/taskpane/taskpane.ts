/* -------------------------------------------------------------------------
   Office.js helpers – these run in the Word context.
   API key tidak pernah berada di frontend. Semua panggilan AI melewati
   Vercel Serverless Functions di /api/*.
-------------------------------------------------------------------------- */
async function getSelectedText(): Promise<string> {
  try {
    return await Word.run(async (context) => {
      const selection = context.document.getSelection();
      selection.load("text");
      await context.sync();
      return selection.text as string;
    });
  } catch (e) {
    console.error("Failed to get selected text", e);
    return "";
  }
}

async function replaceSelectedText(newText: string): Promise<void> {
  try {
    await Word.run(async (context) => {
      const selection = context.document.getSelection();
      selection.insertText(newText, "Replace");
      await context.sync();
    });
  } catch (e) {
    console.error("Failed to replace selected text", e);
    throw e;
  }
}

async function insertBelowSelection(newText: string): Promise<void> {
  try {
    await Word.run(async (context) => {
      const selection = context.document.getSelection();
      // Insert a paragraph break then the new text
      selection.insertParagraph("", "After");
      selection.insertText(newText, "After");
      await context.sync();
    });
  } catch (e) {
    console.error("Failed to insert below selection", e);
    throw e;
  }
}

async function copyResult(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    console.error("Failed to copy to clipboard", e);
    throw e;
  }
}

/* -------------------------------------------------------------------------
   Backend communication helpers
-------------------------------------------------------------------------- */
type Language = "id" | "en";
type ParaphraseStyle = "academic" | "formal" | "concise" | "natural";

interface ParaphraseRequestBody {
  text: string;
  language: Language;
  style: ParaphraseStyle;
  userInstructions?: string;
}

interface AnalysisRequestBody {
  text: string;
  paragraphs?: any[];
  language?: Language;
}

interface AISuccessResponse {
  result: string;
}

interface AnalysisResponse {
  type: "similarity" | "ai-detector";
  score: number;
  riskLevel: "low" | "medium" | "high";
  summary: string;
  stats: {
    wordCount: number;
    paragraphCount: number;
    estimatedPages: number;
  };
  flaggedItems: any[];
  sources: any[];
  limitations: string[];
  generatedAt: string;
}

/* Generic fetch wrapper that handles CORS & JSON */
async function postJSON(url: string, payload: any): Promise<any> {
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Request failed (${resp.status}): ${err}`);
  }

  return resp.json();
}

/* -------------------------------------------------------------------------
   UI handling
-------------------------------------------------------------------------- */
Office.onReady((info) => {
  if (info.host !== Office.HostType.Word) {
    console.warn("This add-in only supports Microsoft Word.");
    return;
  }

  // Bind counters & event handler for SelectionChange
  Office.context.document.addHandlerAsync(
    Office.EventType.DocumentSelectionChanged,
    updateCounters
  );

  // Initial stats run
  updateCounters();

  const btnSimilarity = document.getElementById("btn-similarity") as HTMLButtonElement;
  const btnDetector   = document.getElementById("btn-detector")   as HTMLButtonElement;
  const btnParaphrase = document.getElementById("btn-paraphrase") as HTMLButtonElement;
  const btnClear      = document.getElementById("btn-clear")      as HTMLButtonElement;

  const btnReplace = document.getElementById("btn-replace") as HTMLButtonElement;
  const btnInsert  = document.getElementById("btn-insert")  as HTMLButtonElement;
  const btnCopy    = document.getElementById("btn-copy")    as HTMLButtonElement;

  const languageSel = document.getElementById("select-language") as HTMLSelectElement;
  const styleSel    = document.getElementById("select-style")    as HTMLSelectElement;
  const instrInput  = document.getElementById("input-instructions") as HTMLInputElement;

  const loadingState   = document.getElementById("loading-state")   as HTMLDivElement;
  const errorMessage   = document.getElementById("error-message")   as HTMLDivElement;
  const successMessage = document.getElementById("success-message") as HTMLDivElement;

  const emptyState   = document.getElementById("empty-state")   as HTMLDivElement;
  const reportView   = document.getElementById("report-view")   as HTMLDivElement;
  const textPreviewWrap = document.getElementById("text-preview-wrap") as HTMLDivElement;
  const textPreview  = document.getElementById("text-preview")  as HTMLTextAreaElement;

  const charCounter    = document.getElementById("char-counter") as HTMLSpanElement;
  const fullDocCounter = document.getElementById("full-doc-counter") as HTMLSpanElement;
  const lengthWarning  = document.getElementById("length-warning") as HTMLDivElement;

  async function updateCounters() {
    try {
      const selected = await getSelectedText();
      const selectedLen = selected ? selected.trim().length : 0;
      if (charCounter) {
        charCounter.textContent = selectedLen.toLocaleString();
      }

      // Check for length warning
      if (lengthWarning) {
        if (selectedLen > 8000) {
          lengthWarning.classList.remove("hidden");
        } else {
          lengthWarning.classList.add("hidden");
        }
      }

      // Read full doc text (capped at a reasonable amount to avoid freezing)
      const fullText = await Word.run(async (context) => {
        const body = context.document.body;
        body.load("text");
        await context.sync();
        return body.text as string;
      });
      const fullLen = fullText ? fullText.trim().length : 0;
      if (fullDocCounter) {
        fullDocCounter.textContent = fullLen.toLocaleString();
      }
    } catch (e) {
      console.error("Error updating character counters:", e);
    }
  }

  // Utility to toggle UI sections
  function resetUI() {
    errorMessage.textContent = "";
    errorMessage.classList.add("hidden");
    successMessage.textContent = "";
    successMessage.classList.add("hidden");
    loadingState.classList.add("hidden");
    reportView.innerHTML = "";
    reportView.classList.add("hidden");
    textPreview.value = "";
    textPreviewWrap.classList.add("hidden");
    emptyState.classList.remove("hidden");
  }

  function showLoading(message: string) {
    loadingState.querySelector("#loading-text")!.textContent = message;
    loadingState.classList.remove("hidden");
  }

  function hideLoading() {
    loadingState.classList.add("hidden");
  }

  function showError(msg: string) {
    errorMessage.textContent = msg;
    errorMessage.classList.remove("hidden");
  }

  function showSuccess(msg: string) {
    successMessage.textContent = msg;
    successMessage.classList.remove("hidden");
  }

  function renderReport(data: AnalysisResponse) {
    emptyState.classList.add("hidden");
    reportView.classList.remove("hidden");
    const { type, score, riskLevel, summary, stats, flaggedItems, sources, limitations } = data;

    const riskColor = riskLevel === "low" ? "var(--green)" : riskLevel === "medium" ? "#b8873b" : "var(--red)";

    const html = `
      <div class="preview-block" style="border-left: 5px solid ${riskColor};">
        <small>${type.toUpperCase()} ANALYSIS</small>
        <p><strong>Score:</strong> <span style="color: ${riskColor}; font-weight: 800;">${score}%</span> (${riskLevel.toUpperCase()} RISK)</p>
        <p style="margin-top: 8px;"><strong>Summary:</strong> ${summary}</p>
        <p style="margin-top: 6px; font-size: 11px; color: var(--muted);">
          <strong>Document stats:</strong> ${stats.wordCount} words, ${stats.paragraphCount} paragraphs, ≈${stats.estimatedPages} pages
        </p>
      </div>

      ${flaggedItems.length
        ? `
        <div class="preview-block">
          <small>Flagged Paragraphs</small>
          <div style="display: grid; gap: 10px; margin-top: 6px;">
            ${flaggedItems
              .map(
                (it: any) => `
                <div style="font-size: 13px; border-bottom: 1px dashed var(--line); padding-bottom: 8px;">
                  <strong>Paragraph ${it.paragraphIndex + 1} (Score: ${it.score}%):</strong> ${it.reason}<br/>
                  <span style="color: var(--muted); font-style: italic;">"${it.text}"</span>
                </div>`
              )
              .join("")}
          </div>
        </div>`
        : ""}

      ${sources.length
        ? `
        <div class="preview-block">
          <small>Candidate Sources</small>
          <div style="display: grid; gap: 10px; margin-top: 6px;">
            ${sources
              .map(
                (src: any) => `
                <div style="font-size: 13px; border-bottom: 1px dashed var(--line); padding-bottom: 8px;">
                  <strong>${src.title}</strong> (${src.provider}) – Similarity: ${src.similarity ? `${src.similarity}%` : "N/A"}<br/>
                  <a href="${src.url}" target="_blank" style="color: var(--gold); text-decoration: none; font-size: 11px;">${src.url}</a>
                </div>`
              )
              .join("")}
          </div>
        </div>`
        : ""}

      ${limitations.length
        ? `
        <div class="preview-block">
          <small>Limitations</small>
          <ul style="margin: 6px 0 0 16px; padding: 0; font-size: 12px; color: var(--muted);">
            ${limitations.map((lim: string) => `<li>${lim}</li>`).join("")}
          </ul>
        </div>`
        : ""}
    `;
    reportView.innerHTML = html;
  }

  async function handleSimilarity() {
    resetUI();
    showLoading("Menganalisis kemiripan...");
    try {
      const fullText = await Word.run(async (context) => {
        const body = context.document.body;
        body.load("text");
        await context.sync();
        return body.text as string;
      });

      const payload: AnalysisRequestBody = {
        text: fullText,
        language: languageSel.value as Language
      };

      const result = await postJSON("/api/analyze/similarity", payload);
      renderReport(result as AnalysisResponse);
      showSuccess("Analisis similarity selesai.");
    } catch (e: any) {
      showError(e.message || "Terjadi kesalahan saat melakukan similarity check.");
    } finally {
      hideLoading();
    }
  }

  async function handleAIDetector() {
    resetUI();
    showLoading("Menganalisis risiko AI...");
    try {
      const fullText = await Word.run(async (context) => {
        const body = context.document.body;
        body.load("text");
        await context.sync();
        return body.text as string;
      });

      const payload: AnalysisRequestBody = {
        text: fullText,
        language: languageSel.value as Language
      };

      const result = await postJSON("/api/analyze/ai-detector", payload);
      renderReport(result as AnalysisResponse);
      showSuccess("Analisis AI detector selesai.");
    } catch (e: any) {
      showError(e.message || "Terjadi kesalahan saat melakukan AI detector.");
    } finally {
      hideLoading();
    }
  }

  async function handleParaphrase() {
    resetUI();
    showLoading("Membuat paraphrase...");
    try {
      const selected = await getSelectedText();
      if (!selected) {
        throw new Error("Silakan pilih teks di dokumen Word terlebih dahulu.");
      }

      const payload: ParaphraseRequestBody = {
        text: selected,
        language: languageSel.value as Language,
        style: styleSel.value as ParaphraseStyle,
        userInstructions: instrInput.value.trim() || undefined
      };

      const resp = await postJSON("/api/ai/paraphrase", payload);
      const result = (resp as AISuccessResponse).result;
      textPreview.value = result;
      textPreviewWrap.classList.remove("hidden");
      emptyState.classList.add("hidden");
      showSuccess("Paraphrase selesai.");
    } catch (e: any) {
      showError(e.message || "Terjadi kesalahan saat paraphrase.");
    } finally {
      hideLoading();
    }
  }

  // Action buttons for paraphrase result
  btnReplace.addEventListener("click", async () => {
    const txt = textPreview.value;
    if (!txt) {
      showError("Tidak ada hasil untuk dimasukkan.");
      return;
    }
    try {
      await replaceSelectedText(txt);
      showSuccess("Teks berhasil diganti di dokumen.");
      updateCounters();
    } catch (e: any) {
      showError(e.message || "Gagal mengganti teks.");
    }
  });

  btnInsert.addEventListener("click", async () => {
    const txt = textPreview.value;
    if (!txt) {
      showError("Tidak ada hasil untuk disisipkan.");
      return;
    }
    try {
      await insertBelowSelection(txt);
      showSuccess("Teks berhasil disisipkan setelah pilihan.");
      updateCounters();
    } catch (e: any) {
      showError(e.message || "Gagal menyisipkan teks.");
    }
  });

  btnCopy.addEventListener("click", async () => {
    const txt = textPreview.value;
    if (!txt) {
      showError("Tidak ada hasil untuk disalin.");
      return;
    }
    try {
      await copyResult(txt);
      showSuccess("Hasil disalin ke clipboard.");
    } catch (e: any) {
      showError(e.message || "Gagal menyalin ke clipboard.");
    }
  });

  // Main feature buttons
  btnSimilarity?.addEventListener("click", handleSimilarity);
  btnDetector?.addEventListener("click", handleAIDetector);
  btnParaphrase?.addEventListener("click", handleParaphrase);

  btnClear?.addEventListener("click", () => {
    resetUI();
  });
});
