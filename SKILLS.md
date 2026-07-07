# Jurnal AI Assistant — Product Skill Specification

## Product Direction

Jurnal AI Assistant is now a Microsoft Word add-in focused on document integrity workflows:

1. **Check Similarity**
2. **Check AI Detector**
3. **Paraphrase Selected Text**

The add-in must avoid hallucinated sources, false plagiarism claims, fabricated references, and automatic document replacement without user approval.

## Hard Rules

- Never invent sources, DOI, URLs, authors, titles, journals, or similarity matches.
- Never claim "plagiarism proven"; use "Similarity Risk" and "Potential Source Candidate".
- Do not scrape Google Scholar HTML directly.
- Do not scrape Google Search result pages directly.
- Use official APIs, open scholarly indexes, or user-configured providers.
- Every external source displayed in the report must include a real URL or DOI from provider output.
- If no source is found, show: `No external source found`.
- AI may help generate search queries, rank candidates, paraphrase selected text, and explain findings, but AI must not fabricate source evidence.
- API keys must stay in backend environment variables only.
- The Word document must never be modified automatically; user must click Replace/Insert explicitly.

## Feature 1 — Check Similarity

Scan the full Microsoft Word document and produce a Similarity Risk Score with paragraph-level findings and possible detected source candidates.

### Source Discovery Strategy

Prioritize Indonesian journal and open scholarly sources.

Recommended targeted domains:

- `garuda.kemdikbud.go.id`
- `neliti.com`
- `moraref.kemenag.go.id`
- `onesearch.id`
- `doaj.org`
- `jurnal.ugm.ac.id`
- `ejournal.undip.ac.id`
- `journal.unnes.ac.id`
- `ejournal.upi.edu`
- `journal.uny.ac.id`
- `ejournal.unesa.ac.id`
- `journal.uinjkt.ac.id`
- `ejournal.uin-suka.ac.id`
- `jurnal.umj.ac.id`
- `jurnal.unimed.ac.id`
- `repository.*.ac.id`
- `ojs.*`
- `ejournal.*`
- `journal.*`
- `jurnal.*`

### Retrieval Providers

Fallback without paid API key:

- Internal document similarity
- OpenAlex metadata search
- Crossref metadata search
- arXiv where relevant

Optional configured providers:

- Google Programmable Search API
- Semantic Scholar API
- CORE API

### Query Generation

For each significant paragraph:

1. Normalize whitespace.
2. Skip very short paragraphs.
3. Extract representative sentence or phrase.
4. Prefer specific terms over generic academic phrases.
5. Generate a small number of search queries.
6. Avoid sending the entire document to search providers.

### Matching Algorithm

Use deterministic scoring first:

- n-gram overlap
- lexical overlap
- paragraph-to-paragraph internal similarity
- phrase repetition
- source snippet/title/abstract overlap
- confidence score based on provider quality and text length

AI can be used only for explanation/ranking after deterministic source candidates exist.

## Feature 2 — Check AI Detector

Estimate AI writing risk from the full Word document.

Important limitation: AI detection is probabilistic and can generate false positives/false negatives.

Heuristics:

- Sentence length uniformity
- Low burstiness
- Repeated transition phrases
- Generic academic phrasing
- Low specificity indicators
- Repetitive sentence starts
- Lexical redundancy

## Feature 3 — Paraphrase Selected Text

Allow user to block/select text in Word and paraphrase only that selected text.

Rules:

- Do not add new facts, claims, data, citations, or references.
- Preserve meaning and technical terms.
- Output only paraphrased text.
- Show preview first.
- User controls Replace / Insert Below / Copy.
- Keep API key in backend only.

Endpoint:

`POST /api/ai/paraphrase`

## Report

Report should be print-ready HTML so users can save as PDF through browser print.

Report sections:

- Product title
- Analysis date
- Document statistics
- Similarity Score or AI Detector Score
- Risk level
- Summary
- Flagged paragraphs
- Detected sources if available
- Limitations and ethics note

## Environment Variables

```env
AI_API_KEY=
AI_API_BASE_URL=
AI_MODEL=
MAX_INPUT_CHARS=50000
ALLOWED_ORIGIN=

GOOGLE_SEARCH_API_KEY=
GOOGLE_SEARCH_ENGINE_ID=
SEMANTIC_SCHOLAR_API_KEY=
CORE_API_KEY=
OPENALEX_MAILTO=
CROSSREF_MAILTO=
MAX_SEARCH_QUERIES=8
```

All provider keys are optional for MVP. The app must still run with internal analysis only.