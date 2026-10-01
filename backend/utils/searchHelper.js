// Intelligent search synonym dictionary & token expander

const STOP_WORDS = new Set([
  "a", "an", "the", "in", "on", "at", "for", "to", "of", "and", "or",
  "is", "are", "was", "were", "be", "do", "does", "did", "have", "has",
  "my", "me", "our", "your", "its", "need", "want", "please", "can",
  "not", "near", "nearby", "best", "top", "good", "fast", "cheap", "urgent"
]);

const SYNONYM_MAP = {
  ac: [
    "ac", "air conditioner", "air conditioning", "cooling", "hvac",
    "split ac", "window ac", "inverter ac", "compressor", "gas refill"
  ],
  air: ["ac", "air conditioner"],
  conditioner: ["ac", "air conditioner"],
  cooling: ["ac", "cooling", "air conditioner"],
  mechanic: [
    "repair", "service", "servicing", "maintenance", "installation",
    "mechanic", "technician", "doctor", "fix", "troubleshoot"
  ],
  repair: [
    "repair", "servicing", "service", "fix", "mechanic",
    "technician", "maintenance", "troubleshoot", "fitting"
  ],
  service: [
    "service", "servicing", "repair", "maintenance", "cleaning", "wash"
  ],
  servicing: [
    "servicing", "service", "repair", "maintenance", "wash"
  ],
  pc: [
    "pc", "computer", "desktop", "cpu", "windows", "hardware", "motherboard"
  ],
  computer: [
    "computer", "pc", "desktop", "laptop", "cpu", "hardware", "screen"
  ],
  desktop: [
    "desktop", "pc", "computer", "cpu", "cabinet", "motherboard"
  ],
  laptop: [
    "laptop", "notebook", "screen", "keyboard", "battery", "charger", "hinge"
  ],
  notebook: ["laptop", "notebook"],
  problem: [
    "repair", "service", "fix", "issue", "troubleshoot", "diagnostics", "checkup"
  ],
  issue: [
    "repair", "service", "fix", "issue", "troubleshoot", "diagnostics"
  ],
  broken: ["repair", "replacement", "fix"],
  replace: ["replacement", "replace", "installation"],
  replacement: ["replacement", "replace", "installation", "fitting"],
  fan: [
    "fan", "ceiling fan", "exhaust fan", "electrical", "regulator", "wiring"
  ],
  electric: [
    "electric", "electrical", "wiring", "electrician", "switch", "switchboard", "fan"
  ],
  electrical: [
    "electric", "electrical", "wiring", "electrician", "switch", "switchboard", "fan"
  ],
  electrician: [
    "electrician", "electrical", "wiring", "switchboard", "fan", "short circuit"
  ],
  wiring: ["wiring", "electrical", "electrician", "switchboard"],
  switch: ["switch", "switchboard", "electrical", "electrician"],
  plumber: [
    "plumber", "plumbing", "pipe", "leak", "tap", "drainage", "water", "faucet", "basin"
  ],
  plumbing: [
    "plumber", "plumbing", "pipe", "leak", "tap", "drainage", "water", "faucet"
  ],
  pipe: ["plumber", "plumbing", "pipe", "leak", "fittings", "drainage"],
  leak: ["leak", "sealing", "brazing", "gas leak", "pipe", "water leak", "plumber"],
  tap: ["tap", "faucet", "plumber", "plumbing", "pipe", "water"],
  clean: [
    "cleaning", "clean", "deep clean", "sanitation", "sanitize", "wash", "jet wash", "house"
  ],
  cleaning: [
    "cleaning", "clean", "deep clean", "sanitation", "sanitize", "wash", "jet wash", "sofa", "kitchen"
  ],
  house: ["house", "home", "room", "apartment", "deep clean", "cleaning"],
  home: ["home", "house", "deep clean", "cleaning"],
  paint: ["paint", "painter", "painting", "wall", "whitewash"],
  painter: ["painter", "painting", "paint", "wall", "whitewash"],
  carpenter: ["carpenter", "carpentry", "woodwork", "furniture", "door", "lock"],
  carpentry: ["carpenter", "carpentry", "furniture", "woodwork"]
};

/**
 * Escapes characters for regex usage
 */
export function escapeRegex(text = "") {
  return String(text).replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

/**
 * Normalizes user search input and extracts tokens + synonyms
 */
export function extractSearchTokens(rawQuery = "") {
  if (!rawQuery || typeof rawQuery !== "string") {
    return { raw: "", tokens: [], expandedTerms: [] };
  }

  const raw = rawQuery.trim();
  const normalized = raw.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const words = normalized
    .split(/\s+/)
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w));

  const expandedSet = new Set();

  // Always include the raw search term as primary pattern
  if (raw.length > 1) {
    expandedSet.add(raw.toLowerCase());
  }

  for (const word of words) {
    expandedSet.add(word);
    if (SYNONYM_MAP[word]) {
      for (const syn of SYNONYM_MAP[word]) {
        expandedSet.add(syn);
      }
    }
  }

  return {
    raw,
    tokens: words,
    expandedTerms: Array.from(expandedSet)
  };
}

/**
 * Builds MongoDB $or filter clause for intelligent service/provider matching
 */
export function buildServiceSearchFilter(rawQuery = "") {
  const { raw, tokens, expandedTerms } = extractSearchTokens(rawQuery);

  if (expandedTerms.length === 0) {
    return null;
  }

  const clauses = [];

  // 1. Exact raw phrase regex match
  const rawEscaped = escapeRegex(raw);
  clauses.push({ title: { $regex: rawEscaped, $options: "i" } });
  clauses.push({ description: { $regex: rawEscaped, $options: "i" } });

  // 2. Token groups: combine related synonyms into regex clusters
  const termsRegexStr = expandedTerms
    .map((term) => escapeRegex(term))
    .join("|");
  const combinedRegex = { $regex: termsRegexStr, $options: "i" };

  clauses.push({ title: combinedRegex });
  clauses.push({ description: combinedRegex });
  clauses.push({ "categoryData.name": combinedRegex });
  clauses.push({ "providerData.businessName": combinedRegex });

  return { $or: clauses };
}
