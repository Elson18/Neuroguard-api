/**
 * NeuroGuard - Configuration
 *
 * ⚠️  Replace the placeholders below with your actual API keys.
 *     Groq    → https://console.groq.com/keys
 *     SerpApi → https://serpapi.com/manage-api-key
 */

// ─── Groq AI ────────────────────────────────────────────────────────────────
const GROQ_API_KEY = "YOUR_GROQ_API_KEY_HERE";
const GROQ_MODEL = "llama3-8b-8192";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

// ─── SerpApi (Website Reputation) ──────────────────────────────────────────
const SERPAPI_KEY = "4d5e97bf8c8c37785a2fe205d1cd8e559f6b34f6320b557090b509a33daefc57";
const SERPAPI_ENDPOINT = "https://serpapi.com/search.json";

// ─── Threat Keywords (used to scan SerpApi results) ────────────────────────
const THREAT_KEYWORDS = [
  "scam",
  "phishing",
  "malware",
  "fraud",
  "fake login",
  "unsafe",
  "dangerous",
  "hack",
  "data breach",
  "identity theft",
];
