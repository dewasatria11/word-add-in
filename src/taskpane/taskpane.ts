/**
 * Jurnal AI Assistant — Task Pane Main Script
 *
 * This file handles:
 * - Office.js initialization
 * - Reading selected text from Word
 * - Calling backend AI endpoints
 * - Updating the UI with results
 * - Writing results back to the document
 *
 * SECURITY: API keys are NEVER stored or sent from here.
 * All AI calls go through the backend serverless functions.
 */

import type { AIAction, AILanguage, AIStyle, AIRequestBody, AISuccessResponse, AIErrorResponse } from "../shared/types";

// ─── State ────────────────────────────────────────────────────────────────────

let selectedText = "";
let result = "";
let loading = false;

// ─── DOM References ───────────────────────────────────────────────────────────

const selectLanguage = document.getElementById("select-language") as HTMLSelectElement;
const selectStyle = document.getElementById("select-style") as HTMLSelectElement;
const inputInstructions = document.getElementById("input-instructions") as HTMLTextAreaElement;
const charCounter = document.getElementById("char-counter") as HTMLElement;
const lengthWarning = document.getElementById("length-warning") as HTMLElement;

const loadingState = document.getElementById("loading-state") as HTMLElement;
const errorMessage = document.getElementById("error-message") as HTMLElement;
const successMessage = document.getElementById("success-message") as HTMLElement;

const resultPreview = document.getElementById("result-preview") as HTMLTextAreaElement;
const emptyState = document.getElementById("empty-state") as HTMLElement;
const previewLoading = document.getElementById("preview-loading") as HTMLElement;

const btnRewrite = document.getElementById("btn-rewrite") as HTMLButtonElement;
const btnParaphrase = document.getElementById("btn-paraphrase") as HTMLButtonElement;
const btnAbstract = document.getElementById("btn-abstract") as HTMLButtonElement;
const btnOutline = document.getElementById("btn-outline") as HTMLButtonElement;
const btnImproveArgument = document.getElementById("btn-improve-argument") as HTMLButtonElement;
const btnSummarize = document.getElementById("btn-summarize") as HTMLButtonElement;

const btnReplace = document.getElementById("btn-replace") as HTMLButtonElement;
const btnInsert = document.getElementById("btn-insert") as HTMLButtonElement;
const btnCopy = document.getElementById("btn-copy") as HTMLButtonElement;
const btnClear = document.getElementById("btn-clear") as HTMLButtonElement;

const allActionBtns = [btnRewrite, btnParaphrase, btnAbstract, btnOutline, btnImproveArgument, btnSummarize];
const docActionBtns = [btnReplace, btnInsert, btnCopy];

// ─── Office.js Initialization ─────────────────────────────────────────────────

Office.onReady((info) => {
  if (info.host === Office.HostType.Word) {
    bindEvents();
  } else {
    showError("Add-in ini hanya bisa digunakan di Microsoft Word.");
  }
});

// ─── Event Binding ────────────────────────────────────────────────────────────

function bindEvents(): void {
  allActionBtns.forEach((btn) => {
    btn.addEventListener("click", handleActionClick);
  });

  btnReplace.addEventListener("click", handleReplaceSelectedText);
  btnInsert.addEventListener("click", handleInsertBelowSelection);
  btnCopy.addEventListener("click", handleCopyResult);
  btnClear.addEventListener("click", handleClear);
}

// ─── Action Handler ───────────────────────────────────────────────────────────

async function handleActionClick(event: Event): Promise<void> {
  const target = event.currentTarget as HTMLButtonElement;
  const action = target.dataset["action"] as AIAction;

  clearStatus();

  // Step 1: Get selected text from Word
  const text = await getSelectedText();
  if (!text) {
    showError("Silakan pilih teks di dokumen Word terlebih dahulu.");
    return;
  }

  selectedText = text;
  charCounter.textContent = selectedText.length.toLocaleString();
  lengthWarning.classList.toggle("hidden", selectedText.length <= 20000);

  // Step 2: Build options from current configuration
  const language = selectLanguage.value as AILanguage;
  const style = selectStyle.value as AIStyle;
  const userInstructions = inputInstructions.value.trim() || undefined;

  // Step 3: Call backend
  setLoading(true);
  try {
    const aiResult = await callAIEndpoint(action, { text: selectedText, language, style, userInstructions });
    result = aiResult;
    resultPreview.value = result;
    enableDocActions();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat memanggil AI.";
    showError(msg);
  } finally {
    setLoading(false);
  }
}

// ─── Office.js Helpers ────────────────────────────────────────────────────────

/**
 * Gets the currently selected text from the Word document.
 * Returns empty string if nothing is selected.
 */
async function getSelectedText(): Promise<string> {
  return new Promise((resolve, reject) => {
    Word.run(async (context) => {
      try {
        const range = context.document.getSelection();
        range.load("text");
        await context.sync();
        resolve(range.text.trim());
      } catch (error) {
        reject(new Error("Gagal membaca teks. Pastikan dokumen Word aktif."));
      }
    }).catch((error: unknown) => {
      reject(new Error("Gagal mengakses dokumen Word: " + String(error)));
    });
  });
}

/**
 * Replaces the currently selected text in the Word document with the given result.
 */
async function replaceSelectedText(newText: string): Promise<void> {
  return new Promise((resolve, reject) => {
    Word.run(async (context) => {
      try {
        const range = context.document.getSelection();
        range.insertText(newText, Word.InsertLocation.replace);
        await context.sync();
        resolve();
      } catch (error) {
        reject(new Error("Gagal mengganti teks di dokumen."));
      }
    }).catch((error: unknown) => {
      reject(new Error("Gagal mengakses dokumen Word: " + String(error)));
    });
  });
}

/**
 * Inserts the AI result below the current selection as a new paragraph.
 */
async function insertBelowSelection(newText: string): Promise<void> {
  return new Promise((resolve, reject) => {
    Word.run(async (context) => {
      try {
        const range = context.document.getSelection();
        // Insert a paragraph break, then the new text
        range.insertParagraph("\n" + newText, Word.InsertLocation.after);
        await context.sync();
        resolve();
      } catch (error) {
        reject(new Error("Gagal menyisipkan teks di dokumen."));
      }
    }).catch((error: unknown) => {
      reject(new Error("Gagal mengakses dokumen Word: " + String(error)));
    });
  });
}

// ─── Document Action Handlers ─────────────────────────────────────────────────

async function handleReplaceSelectedText(): Promise<void> {
  if (!result) return;
  clearStatus();
  try {
    await replaceSelectedText(result);
    showSuccess("Teks berhasil diganti di dokumen.");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal mengganti teks.";
    showError(msg);
  }
}

async function handleInsertBelowSelection(): Promise<void> {
  if (!result) return;
  clearStatus();
  try {
    await insertBelowSelection(result);
    showSuccess("Teks berhasil disisipkan di bawah seleksi.");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal menyisipkan teks.";
    showError(msg);
  }
}

async function handleCopyResult(): Promise<void> {
  if (!result) return;
  clearStatus();
  try {
    await navigator.clipboard.writeText(result);
    showSuccess("Hasil disalin ke clipboard.");
  } catch {
    // Fallback: select text in preview box
    resultPreview.select();
    document.execCommand("copy");
    showSuccess("Hasil disalin ke clipboard.");
  }
}

function handleClear(): void {
  result = "";
  resultPreview.value = "";
  resultPreview.classList.add("hidden");
  emptyState.classList.remove("hidden");
  selectedText = "";
  charCounter.textContent = "0";
  lengthWarning.classList.add("hidden");
  disableDocActions();
  clearStatus();
}

// ─── Backend Communication ────────────────────────────────────────────────────

/**
 * Calls the appropriate backend AI endpoint based on action.
 * Uses relative paths so it works both locally and in production.
 *
 * SECURITY: API key is NEVER sent from here. The backend handles all AI calls.
 */
async function callAIEndpoint(action: AIAction, body: AIRequestBody): Promise<string> {
  const endpoint = `/api/ai/${action}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let errorMsg = `Server error: ${response.status}`;
    try {
      const errData = (await response.json()) as AIErrorResponse;
      if (errData.error) errorMsg = errData.error;
    } catch {
      // Keep original error message
    }
    throw new Error(errorMsg);
  }

  const data = (await response.json()) as AISuccessResponse;
  if (!data.result) {
    throw new Error("Respons AI kosong atau tidak valid.");
  }

  return data.result;
}

// ─── UI State Helpers ──────────────────────────────────────────────────────────

function setLoading(isLoading: boolean): void {
  loading = isLoading;

  // Show/hide loading spinner
  loadingState.classList.toggle("hidden", !isLoading);

  // Handle preview area states
  if (isLoading) {
    emptyState.classList.add("hidden");
    resultPreview.classList.add("hidden");
    previewLoading.classList.remove("hidden");
  } else {
    previewLoading.classList.add("hidden");
    if (result) {
      emptyState.classList.add("hidden");
      resultPreview.classList.remove("hidden");
    } else {
      emptyState.classList.remove("hidden");
      resultPreview.classList.add("hidden");
    }
  }

  // Disable all action buttons while loading
  allActionBtns.forEach((btn) => {
    btn.disabled = isLoading;
  });

  // Disable doc actions while loading
  if (isLoading) {
    disableDocActions();
  }
}

function enableDocActions(): void {
  docActionBtns.forEach((btn) => {
    btn.disabled = false;
  });
}

function disableDocActions(): void {
  docActionBtns.forEach((btn) => {
    btn.disabled = true;
  });
}

function showError(msg: string): void {
  errorMessage.textContent = msg;
  errorMessage.classList.remove("hidden");
  successMessage.classList.add("hidden");
}

function showSuccess(msg: string): void {
  successMessage.textContent = msg;
  successMessage.classList.remove("hidden");
  errorMessage.classList.add("hidden");

  // Auto-hide success after 3 seconds
  setTimeout(() => {
    successMessage.classList.add("hidden");
  }, 3000);
}

function clearStatus(): void {
  errorMessage.classList.add("hidden");
  successMessage.classList.add("hidden");
}