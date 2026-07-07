import type { SourceCandidate } from "../../src/shared/types.js";

const base = "https://api.semanticscholar.org/graph/v1";

async function fetchPaper(paperId: string): Promise<SourceCandidate | null> {
  const url = `${base}/paper/${paperId}?fields=title,abstract,url`;
  const headers: Record<string, string> = {};
  
  const key = process.env.SEMANTIC_SCHOLAR_API_KEY?.trim();
  if (key) {
    headers["x-api-key"] = key;
  }
  
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    
    const data = await res.json() as {
      title?: string;
      abstract?: string;
      url?: string;
    };
    
    if (!data.title) return null;
    
    return {
      title: data.title,
      url: data.url || `https://www.semanticscholar.org/paper/${paperId}`,
      snippet: data.abstract?.slice(0, 300) || "",
      provider: "Semantic Scholar",
      confidence: "high"
    };
  } catch (error) {
    return null;
  }
}

export async function searchSemanticScholar(query: string): Promise<SourceCandidate[]> {
  const url = new URL(`${base}/paper/search`);
  url.searchParams.set("query", query);
  url.searchParams.set("limit", "3");
  url.searchParams.set("fields", "title,abstract,url");
  
  const headers: Record<string, string> = {};
  const key = process.env.SEMANTIC_SCHOLAR_API_KEY?.trim();
  if (key) {
    headers["x-api-key"] = key;
  }
  
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) return [];
    
    const json = await res.json() as { data?: Array<{ paperId: string }> };
    if (!json.data || !Array.isArray(json.data)) return [];

    const promises = json.data.slice(0, 3).map((p) => fetchPaper(p.paperId));
    const results = await Promise.all(promises);
    
    return results.filter((r): r is SourceCandidate => r !== null);
  } catch (error) {
    return [];
  }
}