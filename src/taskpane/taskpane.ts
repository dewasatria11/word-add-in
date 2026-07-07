/**
 * Jurnal AI Assistant — Agent Task Pane
 *
 * SECURITY: API key tidak pernah berada di frontend. Semua panggilan AI melewati
 * Vercel Serverless Function `/api/ai/agent`.
 */

import type {
  AcademicField,
  AgentHistoryItem,
  AgentRequestBody,
  AgentResponse,
  AgentStep,
  AILanguage,
  AIStyle,
  ArticleType,
  DocumentBlock,
  DocumentBlockFormat,
  TargetLength
} from "../shared/types";

let selectedText = "";
let resultText = "";
let currentBlocks: DocumentBlock[] = [];
let currentStep: AgentStep = "start";
let loading = false;
let history: AgentHistoryItem[] = [];

const selectLanguage = document.getElementById("select-language") as HTMLSelectElement;
const selectArticleType = document.getElementById("select-article-type") as HTMLSelectElement;
const selectField = document.getElementById("select-field") as HTMLSelectElement;
const customFieldWrap = document.getElementById("custom-field-wrap") as HTMLElement;
const inputCustomField = document.getElementById("input-custom-field") as HTMLInputElement;
const selectStyle = document.getElementById("select-style") as HTMLSelectElement;
const selectTargetLength = document.getElementById("select-target-length") as HTMLSelectElement;

const charCounter = document.getElementById("char-counter") as HTMLElement;
const turnCounter = document.getElementById("turn-counter") as HTMLElement;
const lengthWarning = document.getElementById("length-warning") as HTMLElement;

const chatLog = document.getElementById("chat-log") as HTMLElement;
const suggestions = document.getElementById("suggestions") as HTMLElement;
const agentInput = document.getElementById("agent-input") as HTMLTextAreaElement;

const loadingState = document.getElementById("loading-state") as HTMLElement;
const errorMessage = document.getElementById("error-message") as HTMLElement;
const successMessage = document.getElementById("success-message") as HTMLElement;

const emptyState = document.getElementById("empty-state") as HTMLElement;
const resultPreview = document.getElementById("result-preview") as HTMLElement;
const safetyNotes = document.getElementById("safety-notes") as HTMLElement;

const btnNewSession = document.getElementById("btn-new-session") as HTMLButtonElement;
const btnUseSelection = document.getElementById("btn-use-selection") as HTMLButtonElement;
const btnSend = document.getElementById("btn-send") as HTMLButtonElement;
const btnInsertFormatted = document.getElementById("btn-insert-formatted") as HTMLButtonElement;
const btnReplace = document.getElementById("btn-replace") as HTMLButtonElement;
const btnInsert = document.getElementById("btn-insert") as HTMLButtonElement;
const btnCopy = document.getElementById("btn-copy") as HTMLButtonElement;
const btnClear = document.getElementById("btn-clear") as HTMLButtonElement;

const docActionButtons = [btnInsertFormatted, btnReplace, btnInsert, btnCopy];

Office.onReady((info) => {
  if (info.host === Office.HostType.Word) {
    bindEvents();
    updateDocActions();
  } else {
    showError("Add-in ini hanya bisa digunakan di Microsoft Word.");
  }
});

function bindEvents(): void {
  btnSend.addEventListener("click", () => void handleSend());
  btnUseSelection.addEventListener("click", () => void handleUseSelection());
  btnNewSession.addEventListener("click", resetSession);
  btnInsertFormatted.addEventListener("click", () => void handleInsertFormatted());
  btnReplace.addEventListener("click", () => void handleReplaceSelectedText());
  btnInsert.addEventListener("click", () => void handleInsertPlain());
  btnCopy.addEventListener("click", () => void copyResult());
  btnClear.addEventListener("click", clearResult);
  selectField.addEventListener("change", () => {
    customFieldWrap.classList.toggle("hidden", selectField.value !== "custom");
  });

  agentInput.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      void handleSend();
    }
  });

  suggestions.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const button = target.closest("button") as HTMLButtonElement | null;
    const prompt = button?.dataset["prompt"];
    if (prompt) {
      agentInput.value = prompt;
      void handleSend();
    }
  });
}

async function handleUseSelection(): Promise<void> {
  clearStatus();
  const text = await getSelectedText();
  if (!text) {
    showError("Silakan pilih teks di dokumen Word terlebih dahulu.");
    return;
  }

  selectedText = text;
  updateSelectionStats();
  showSuccess("Selected text berhasil dipakai sebagai konteks agent.");
}

async function handleSend(overrideMessage?: string): Promise<void> {
  const message = (overrideMessage || agentInput.value).trim();
  if (!message) {
    showError("Tulis instruksi terlebih dahulu.");
    return;
  }

  clearStatus();
  setLoading(true);
  appendMessage("user", message);

  try {
    const context = selectedText || (await getSelectedText().catch(() => ""));
    selectedText = context.trim();
    updateSelectionStats();

    const response = await callAgentEndpoint(buildAgentRequest(message, selectedText));
    applyAgentResponse(response);
    agentInput.value = "";
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat memanggil agent.";
    showError(msg);
  } finally {
    setLoading(false);
  }
}

function buildAgentRequest(message: string, documentContext?: string): AgentRequestBody {
  return {
    message,
    language: selectLanguage.value as AILanguage,
    articleType: selectArticleType.value as ArticleType,
    field: selectField.value as AcademicField,
    customField: inputCustomField.value.trim() || undefined,
    style: selectStyle.value as AIStyle,
    targetLength: selectTargetLength.value as TargetLength,
    currentStep,
    documentContext: documentContext || undefined,
    history: history.slice(-10)
  };
}

async function callAgentEndpoint(body: AgentRequestBody): Promise<AgentResponse> {
  const response = await fetch("/api/ai/agent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || `Server error: ${response.status}`);
  }

  const data = (await response.json()) as AgentResponse;
  if (!data.result) {
    throw new Error("Respons agent kosong atau tidak valid.");
  }

  return data;
}

function applyAgentResponse(response: AgentResponse): void {
  resultText = response.result;
  currentBlocks = response.blocks?.length
    ? response.blocks
    : [{ type: "paragraph", text: response.result, format: defaultBlockFormat("paragraph") }];

  currentStep = response.nextStep || "continue";

  appendMessage("assistant", resultText);
  renderPreview(currentBlocks);
  renderSuggestedActions(response.suggestedActions || []);
  renderSafetyNotes(response.safetyNotes || []);
  updateDocActions();
}

function appendMessage(role: "user" | "assistant", content: string): void {
  history.push({ role, content });
  history = history.slice(-12);

  const article = document.createElement("article");
  article.className = `message ${role === "user" ? "user-message" : "assistant-message"}`;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "user" ? "You" : "AI";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = content;

  article.append(avatar, bubble);
  chatLog.appendChild(article);
  chatLog.scrollTop = chatLog.scrollHeight;
  turnCounter.textContent = String(Math.ceil(history.length / 2));
}

function renderPreview(blocks: DocumentBlock[]): void {
  resultPreview.innerHTML = "";
  blocks.forEach((block) => {
    const item = document.createElement("article");
    item.className = `preview-block ${block.type}`;

    const label = document.createElement("small");
    label.textContent = block.type;

    const text = document.createElement("p");
    text.textContent = block.text;

    item.append(label, text);
    resultPreview.appendChild(item);
  });

  emptyState.classList.add("hidden");
  resultPreview.classList.remove("hidden");
}

function renderSuggestedActions(actions: AgentResponse["suggestedActions"]): void {
  suggestions.innerHTML = "";
  const fallback = actions.length
    ? actions
    : [
        {
          label: "Lanjutkan bagian berikutnya",
          action: "continue",
          instruction: "Lanjutkan ke bagian jurnal berikutnya berdasarkan hasil terakhir."
        },
        {
          label: "Perkuat argumen",
          action: "revision",
          instruction: "Perkuat argumentasi dan transisi antaride pada hasil terakhir."
        }
      ];

  fallback.forEach((action) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = action.label;
    btn.dataset["prompt"] = action.instruction;
    suggestions.appendChild(btn);
  });
}

function renderSafetyNotes(notes: string[]): void {
  if (!notes.length) {
    safetyNotes.classList.add("hidden");
    safetyNotes.textContent = "";
    return;
  }

  safetyNotes.innerHTML = `<strong>Catatan akademik:</strong><ul>${notes
    .map((note) => `<li>${escapeHtml(note)}</li>`)
    .join("")}</ul>`;
  safetyNotes.classList.remove("hidden");
}

async function getSelectedText(): Promise<string> {
  return Word.run(async (context) => {
    const range = context.document.getSelection();
    range.load("text");
    await context.sync();
    return range.text.trim();
  }).catch(() => {
    throw new Error("Gagal membaca teks. Pastikan dokumen Word aktif.");
  });
}

async function replaceSelectedText(newText: string): Promise<void> {
  await Word.run(async (context) => {
    const range = context.document.getSelection();
    range.insertText(newText, Word.InsertLocation.replace);
    await context.sync();
  }).catch(() => {
    throw new Error("Gagal mengganti teks di dokumen.");
  });
}

async function insertBelowSelection(newText: string): Promise<void> {
  await Word.run(async (context) => {
    const range = context.document.getSelection();
    range.insertParagraph(newText, Word.InsertLocation.after);
    await context.sync();
  }).catch(() => {
    throw new Error("Gagal menyisipkan teks di dokumen.");
  });
}

async function insertFormattedBlocks(blocks: DocumentBlock[]): Promise<void> {
  await Word.run(async (context) => {
    let insertionPoint = context.document.getSelection();

    for (const block of blocks) {
      const paragraph = insertionPoint.insertParagraph(block.text, Word.InsertLocation.after);
      applyParagraphFormat(paragraph, block);
      insertionPoint = paragraph.getRange(Word.RangeLocation.after);
    }

    await context.sync();
  }).catch(() => {
    throw new Error("Gagal menyisipkan hasil terformat ke Word.");
  });
}

function applyParagraphFormat(paragraph: Word.Paragraph, block: DocumentBlock): void {
  const format = { ...defaultBlockFormat(block.type), ...(block.format || {}) };

  paragraph.font.name = format.fontName || "Times New Roman";
  paragraph.font.size = format.fontSize || 12;
  paragraph.font.bold = !!format.bold;
  paragraph.font.italic = !!format.italic;
  paragraph.font.underline = format.underline ? Word.UnderlineType.single : Word.UnderlineType.none;

  paragraph.alignment = mapAlignment(format.alignment || "justify");
  paragraph.lineSpacing = Math.round((format.lineSpacing || 1.5) * 12);
  paragraph.spaceAfter = format.spaceAfter ?? 6;
  paragraph.spaceBefore = format.spaceBefore ?? 0;
}

function defaultBlockFormat(type: DocumentBlock["type"]): DocumentBlockFormat {
  if (type === "title") {
    return { fontName: "Times New Roman", fontSize: 14, bold: true, alignment: "center", lineSpacing: 1.15, spaceAfter: 12 };
  }

  if (type === "heading1" || type === "heading2") {
    return { fontName: "Times New Roman", fontSize: 12, bold: true, alignment: "left", lineSpacing: 1.15, spaceBefore: 12, spaceAfter: 6 };
  }

  if (type === "abstract" || type === "keywords") {
    return { fontName: "Times New Roman", fontSize: 11, alignment: "justify", lineSpacing: 1, spaceAfter: 6 };
  }

  return { fontName: "Times New Roman", fontSize: 12, alignment: "justify", lineSpacing: 1.5, spaceAfter: 6 };
}

function mapAlignment(alignment: DocumentBlockFormat["alignment"]): Word.Alignment {
  const map: Record<NonNullable<DocumentBlockFormat["alignment"]>, Word.Alignment> = {
    left: Word.Alignment.left,
    center: Word.Alignment.centered,
    right: Word.Alignment.right,
    justify: Word.Alignment.justified
  };

  return map[alignment || "justify"];
}

async function handleInsertFormatted(): Promise<void> {
  if (!currentBlocks.length) return;
  clearStatus();

  try {
    await insertFormattedBlocks(currentBlocks);
    showSuccess("Hasil terformat berhasil disisipkan ke Word.");
  } catch (err: unknown) {
    showError(err instanceof Error ? err.message : "Gagal menyisipkan hasil terformat.");
  }
}

async function handleReplaceSelectedText(): Promise<void> {
  if (!resultText) return;
  clearStatus();

  try {
    await replaceSelectedText(blocksToPlainText(currentBlocks));
    showSuccess("Selected text berhasil diganti.");
  } catch (err: unknown) {
    showError(err instanceof Error ? err.message : "Gagal mengganti selected text.");
  }
}

async function handleInsertPlain(): Promise<void> {
  if (!resultText) return;
  clearStatus();

  try {
    await insertBelowSelection(blocksToPlainText(currentBlocks));
    showSuccess("Hasil berhasil disisipkan sebagai plain text.");
  } catch (err: unknown) {
    showError(err instanceof Error ? err.message : "Gagal menyisipkan hasil.");
  }
}

async function copyResult(): Promise<void> {
  if (!resultText) return;
  clearStatus();

  try {
    await navigator.clipboard.writeText(blocksToPlainText(currentBlocks));
    showSuccess("Hasil disalin ke clipboard.");
  } catch {
    showError("Gagal menyalin ke clipboard.");
  }
}

function blocksToPlainText(blocks: DocumentBlock[]): string {
  return blocks.length ? blocks.map((block) => block.text).join("\n\n") : resultText;
}

function clearResult(): void {
  resultText = "";
  currentBlocks = [];
  resultPreview.innerHTML = "";
  resultPreview.classList.add("hidden");
  emptyState.classList.remove("hidden");
  safetyNotes.classList.add("hidden");
  updateDocActions();
  clearStatus();
}

function resetSession(): void {
  history = [];
  currentStep = "start";
  selectedText = "";
  agentInput.value = "";
  chatLog.innerHTML = `
    <article class="message assistant-message">
      <div class="avatar">AI</div>
      <div class="bubble"><strong>Session baru dimulai.</strong><p>Kirim brief atau pilih teks Word untuk mulai menulis jurnal.</p></div>
    </article>
  `;
  turnCounter.textContent = "0";
  charCounter.textContent = "0";
  lengthWarning.classList.add("hidden");
  clearResult();
}

function updateSelectionStats(): void {
  charCounter.textContent = selectedText.length.toLocaleString("id-ID");
  lengthWarning.classList.toggle("hidden", selectedText.length <= 20000);
}

function setLoading(isLoading: boolean): void {
  loading = isLoading;
  loadingState.classList.toggle("hidden", !isLoading);
  btnSend.disabled = isLoading;
  btnUseSelection.disabled = isLoading;
  btnNewSession.disabled = isLoading;
  updateDocActions();
}

function updateDocActions(): void {
  const disabled = loading || !resultText;
  docActionButtons.forEach((btn) => {
    btn.disabled = disabled;
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

  window.setTimeout(() => {
    successMessage.classList.add("hidden");
  }, 3200);
}

function clearStatus(): void {
  errorMessage.classList.add("hidden");
  successMessage.classList.add("hidden");
}

function escapeHtml(value: string): string {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}