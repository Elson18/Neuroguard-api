/**
 * NeuroGuard - Configuration
 *
 * ⚠️  Replace the placeholders below with your actual API keys.
 *     Gemini  → https://aistudio.google.com/apikey
 *     SerpApi → https://serpapi.com/manage-api-key
 */

// ─── Gemini AI ─────────────────────────────────────────────────────────────
const GEMINI_API_KEY = "AIzaSyARAWtSaWdgO0RUxoGIvz1Yyp-deEL86is";
const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

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
