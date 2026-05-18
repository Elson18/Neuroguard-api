/**
 * NeuroGuard - Background Service Worker
 *
 * AI-powered automation workflow system.
 * Uses a node-based pipeline architecture inspired by n8n.
 *
 * Workflow Pipeline:
 *   detect_url → gemini_analysis → serpapi_check → decision_engine → block_website
 */

// Import modules
importScripts("config.js", "workflow.js");

// ═══════════════════════════════════════════════════════════════════════════
//  NODE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

// ─── Node 1: URL Detection ─────────────────────────────────────────────────
registerNode("detect_url", {
  label: "URL Detection",
  description: "Validates and extracts domain from the target URL",
  execute(context) {
    const { url } = context;

    // Validate URL
    if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) {
      console.log(`  │  ⏭️  Non-HTTP URL — aborting pipeline`);
      return { _abort: true, skipReason: "Non-HTTP URL" };
    }

    // Skip blocked page (prevent infinite loops)
    if (url.startsWith("chrome-extension://") && url.includes("blocked.html")) {
      console.log(`  │  ⏭️  Blocked page — aborting pipeline`);
      return { _abort: true, skipReason: "Blocked page" };
    }

    // Extract domain
    let domain = null;
    try {
      domain = new URL(url).hostname;
    } catch {
      domain = url;
    }

    console.log(`  │  🔗 URL    : ${url}`);
    console.log(`  │  🌐 Domain : ${domain}`);

    return { domain, urlValid: true };
  },
});

// ─── Node 2: Gemini AI Analysis ────────────────────────────────────────────
registerNode("gemini_analysis", {
  label: "Gemini AI Analysis",
  description: "Classifies URL using Gemini Flash as SAFE / SUSPICIOUS / HARMFUL",
  async execute(context) {
    const { url } = context;

    const prompt = `You are a cybersecurity URL classifier.

Analyze this URL and classify it as:
SAFE
SUSPICIOUS
HARMFUL

Reply ONLY one word.

URL:
${url}`;

    try {
      const response = await fetch(GEMINI_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`  │  Gemini API error (${response.status}):`, errorBody);
        return { geminiResult: null, geminiError: true };
      }

      const data = await response.json();
      const result = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toUpperCase() || null;

      const icon = result === "SAFE" ? "✅" :
                   result === "SUSPICIOUS" ? "⚠️" :
                   result === "HARMFUL" ? "🚨" : "❓";

      console.log(`  │  ${icon} Classification: ${result || "UNKNOWN"}`);

      return { geminiResult: result, geminiError: false };
    } catch (error) {
      console.error(`  │  Gemini request failed: ${error.message}`);
      return { geminiResult: null, geminiError: true };
    }
  },
});

// ─── Node 3: SerpApi Reputation Check ──────────────────────────────────────
registerNode("serpapi_check", {
  label: "SerpApi Reputation Check",
  description: "Searches Google for scam/phishing/malware reports about the domain",
  async execute(context) {
    const { domain } = context;
    const queries = [`${domain} scam`, `${domain} phishing`, `${domain} malware`];
    const allMatches = [];

    for (const query of queries) {
      try {
        const params = new URLSearchParams({
          q: query,
          api_key: SERPAPI_KEY,
          engine: "google",
          num: "5",
        });

        const response = await fetch(`${SERPAPI_ENDPOINT}?${params}`);

        if (!response.ok) {
          console.error(`  │  SerpApi error (${response.status}) for: "${query}"`);
          continue;
        }

        const data = await response.json();
        const results = data.organic_results || [];

        for (const result of results) {
          const text = `${result.title || ""} ${result.snippet || ""}`.toLowerCase();
          for (const keyword of THREAT_KEYWORDS) {
            if (text.includes(keyword)) {
              allMatches.push({
                keyword,
                query,
                title: result.title,
                snippet: result.snippet?.substring(0, 120),
              });
            }
          }
        }
      } catch (error) {
        console.error(`  │  SerpApi request failed for "${query}": ${error.message}`);
      }
    }

    const isRisky = allMatches.length > 0;

    if (isRisky) {
      console.log(`  │  🚨 RISKY — ${allMatches.length} threat indicator(s)`);
      for (const m of allMatches.slice(0, 3)) {
        console.log(`  │     ↳ [${m.keyword}] "${m.title}"`);
      }
    } else {
      console.log(`  │  ✅ CLEAN — No threat indicators`);
    }

    return {
      serpRisky: isRisky,
      serpMatchCount: allMatches.length,
      serpMatches: allMatches.slice(0, 5),
    };
  },
});

// ─── Node 4: Decision Engine ───────────────────────────────────────────────
registerNode("decision_engine", {
  label: "Decision Engine",
  description: "Combines AI + reputation results to make final allow/block decision",
  execute(context) {
    const { geminiResult, serpRisky, serpMatchCount } = context;

    const shouldBlock = geminiResult === "HARMFUL" || serpRisky;
    const decision = shouldBlock ? "BLOCKED" : "ALLOWED";

    const reasons = [];
    if (geminiResult === "HARMFUL") reasons.push("Gemini → HARMFUL");
    if (serpRisky) reasons.push(`SerpApi → ${serpMatchCount} threat(s)`);

    if (shouldBlock) {
      console.log(`  │  🛡️  BLOCK — ${reasons.join(" + ")}`);
    } else {
      console.log(`  │  ✅ ALLOW — No threats detected`);
    }

    return { decision, shouldBlock, decisionReasons: reasons };
  },
});

// ─── Node 5: AI Explanation Generator ──────────────────────────────────────
registerNode("ai_explain", {
  label: "AI Explanation Generator",
  description: "Generates a human-readable reason for blocking using Gemini AI",
  async execute(context) {
    const { shouldBlock, url, geminiResult, serpRisky } = context;

    if (!shouldBlock) {
      console.log(`  │  ⏭️  Site allowed — no explanation needed`);
      return { explanation: null, riskLevel: "LOW" };
    }

    // Determine risk level
    let riskLevel = "MEDIUM";
    if (geminiResult === "HARMFUL" && serpRisky) {
      riskLevel = "HIGH";
    } else if (geminiResult === "HARMFUL" || serpRisky) {
      riskLevel = "HIGH";
    }

    const prompt = `You are a cybersecurity expert. Explain in one short sentence (under 20 words) why this URL may be dangerous:\n${url}`;

    try {
      const response = await fetch(GEMINI_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      if (!response.ok) {
        console.error(`  │  Gemini explanation API error (${response.status})`);
        return { explanation: "This website was flagged as potentially dangerous.", riskLevel };
      }

      const data = await response.json();
      const explanation = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "This website was flagged as potentially dangerous.";

      const riskIcon = riskLevel === "HIGH" ? "🔴" : riskLevel === "MEDIUM" ? "🟡" : "🟢";
      console.log(`  │  💬 Explanation : ${explanation}`);
      console.log(`  │  ${riskIcon} Risk Level : ${riskLevel}`);

      return { explanation, riskLevel };
    } catch (error) {
      console.error(`  │  Explanation generation failed: ${error.message}`);
      return { explanation: "This website was flagged as potentially dangerous.", riskLevel };
    }
  },
});

// ─── Node 6: Block Website ────────────────────────────────────────────────
registerNode("block_website", {
  label: "Block Website",
  description: "Redirects harmful websites to the blocked page",
  async execute(context) {
    const { shouldBlock, tabId, url, explanation, riskLevel } = context;

    if (!shouldBlock) {
      console.log(`  │  ⏭️  No blocking needed`);
      return { blocked: false };
    }

    // Store explanation for blocked.html to read
    await chrome.storage.local.set({
      blocked_info: {
        url,
        explanation: explanation || "This website was flagged as potentially dangerous.",
        riskLevel: riskLevel || "HIGH",
        timestamp: new Date().toISOString(),
      },
    });

    const blockedPageURL = chrome.runtime.getURL("blocked.html") + "?url=" + encodeURIComponent(url);
    chrome.tabs.update(tabId, { url: blockedPageURL });

    console.log(`  │  🚫 Tab ${tabId} redirected to blocked.html`);

    return { blocked: true };
  },
});

// ═══════════════════════════════════════════════════════════════════════════
//  WORKFLOW ORCHESTRATION
// ═══════════════════════════════════════════════════════════════════════════

async function runThreatPipeline(url, source, tabId) {
  const timestamp = new Date().toISOString();

  // Store loading state for popup
  const storageKey = `result_${tabId}`;
  let domain = null;
  try { domain = new URL(url).hostname; } catch { domain = url; }

  await chrome.storage.local.set({
    [storageKey]: { domain, url, gemini: null, serpRisky: false, serpMatchCount: 0, decision: null, timestamp },
  });

  // Create and run workflow
  const engine = new WorkflowEngine(THREAT_DETECTION_WORKFLOW);

  const result = await engine.run({
    url,
    tabId,
    source,
    timestamp,
  });

  // Store final result for popup (if pipeline wasn't aborted)
  if (!result._abort) {
    await chrome.storage.local.set({
      [storageKey]: {
        domain: result.domain || domain,
        url,
        gemini: result.geminiResult || null,
        serpRisky: result.serpRisky || false,
        serpMatchCount: result.serpMatchCount || 0,
        decision: result.decision || "ALLOWED",
        explanation: result.explanation || null,
        riskLevel: result.riskLevel || null,
        timestamp,
        executionLog: result._executionLog,
        totalDurationMs: result._totalDurationMs,
      },
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  CHROME EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════════════════

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    runThreatPipeline(tab.url, "Tab Updated", tabId);
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) {
      runThreatPipeline(tab.url, "Tab Switched", activeInfo.tabId);
    }
  } catch (error) {
    console.error("[NeuroGuard] Error fetching tab info:", error.message);
  }
});

chrome.runtime.onInstalled.addListener((details) => {
  console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║  🛡️  NeuroGuard AI — Extension ${(details.reason).padEnd(28)}   ║`);
  console.log(`╠══════════════════════════════════════════════════════════════╣`);
  console.log(`║  Version  : 1.0.0                                          ║`);
  console.log(`║  Engine   : Workflow-based AI Automation                    ║`);
  console.log(`║  Pipeline : ${THREAT_DETECTION_WORKFLOW.name.padEnd(46)}║`);
  console.log(`║  Nodes    : ${THREAT_DETECTION_WORKFLOW.nodes.length} registered${" ".repeat(38)}║`);
  console.log(`╠══════════════════════════════════════════════════════════════╣`);
  console.log(`║  Nodes:                                                     ║`);
  for (const nodeId of THREAT_DETECTION_WORKFLOW.nodes) {
    const node = NODE_REGISTRY[nodeId];
    console.log(`║    → ${(node?.label || nodeId).padEnd(52)}║`);
  }
  console.log(`╚══════════════════════════════════════════════════════════════╝\n`);
});
