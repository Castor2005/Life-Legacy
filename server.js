const express = require("express");
const fs = require("fs");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");

function loadDotEnvFiles() {
  if (typeof process.loadEnvFile !== "function") return;
  for (const name of [".env", ".env.local"]) {
    const filePath = path.join(__dirname, name);
    if (fs.existsSync(filePath)) {
      try {
        process.loadEnvFile(filePath);
      } catch (err) {
        console.warn(`[env] Could not load ${name}:`, err instanceof Error ? err.message : String(err));
      }
    }
  }
}

loadDotEnvFiles();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";
const ROOT_DIR = __dirname;
const MODEL_NAME = "gemini-4-hydrogen";

app.use(express.json({ limit: "2mb" }));

// ---- Shared Server-Side Gemini Client ----
function getGeminiApiKey() {
  let apiKey = (process.env.GEMINI_API_KEY || process.env.API_KEY || "").trim();
  if (!apiKey) {
    loadDotEnvFiles();
    apiKey = (process.env.GEMINI_API_KEY || process.env.API_KEY || "").trim();
  }
  return apiKey;
}

function getGeminiClient() {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    const err = new Error(
      "GEMINI_API_KEY is not configured. Please add or select your Gemini API key in Settings > Secrets."
    );
    err.statusCode = 503;
    err.code = "MISSING_GEMINI_API_KEY";
    throw err;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function extractGroundingSources(response) {
  const chunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (!Array.isArray(chunks)) return [];
  const seen = new Set();
  const sources = [];
  for (const chunk of chunks) {
    const uri = chunk?.web?.uri;
    const title = chunk?.web?.title;
    if (typeof uri === "string" && /^https?:\/\//i.test(uri) && !seen.has(uri)) {
      seen.add(uri);
      sources.push({
        title: String(title || uri).slice(0, 120),
        uri: uri.slice(0, 500),
      });
      if (sources.length >= 8) break;
    }
  }
  return sources;
}

function formatApiError(err) {
  const status = Number(err?.status || err?.statusCode) || 500;
  const rawMessage = err instanceof Error ? err.message : String(err || "Gemini API error");
  return {
    status: status >= 400 && status < 600 ? status : 500,
    code: err?.code || undefined,
    message: rawMessage.slice(0, 400),
  };
}

function sendAiError(routeName, res, err) {
  const formatted = formatApiError(err);
  if (formatted.code !== "MISSING_GEMINI_API_KEY") {
    console.error(`[${routeName}] error:`, formatted.message);
  }
  return res.status(formatted.status).json({
    error: formatted.message,
    ...(formatted.code ? { code: formatted.code } : {}),
  });
}

// ---- API: Gemini Server Status ----
app.get("/api/ai/status", (_req, res) => {
  res.json({
    configured: Boolean(getGeminiApiKey()),
    model: MODEL_NAME,
  });
});

// ---- API: General Built-in Text Generation (optional Google Search Grounding) ----
app.post("/api/ai/generate", async (req, res) => {
  try {
    const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
    const startWith = typeof req.body?.startWith === "string" ? req.body.startWith : "";
    const useSearch = Boolean(req.body?.useSearch);
    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt." });
    }
    const ai = getGeminiClient();
    const contents = startWith
      ? `${prompt}\n\nBegin your reply with exactly: ${startWith}`
      : prompt;
    const config = useSearch ? { tools: [{ googleSearch: {} }] } : undefined;
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents,
      ...(config ? { config } : {}),
    });
    const text = (response.text || "").trim();
    if (!text) {
      return res.status(502).json({ error: "Gemini returned an empty response." });
    }
    return res.json({
      text,
      sources: useSearch ? extractGroundingSources(response) : [],
    });
  } catch (err) {
    return sendAiError("/api/ai/generate", res, err);
  }
});

// ---- API: Real-World Grounding for Character Job & Location (Google Search) ----
app.post("/api/ai/ground", async (req, res) => {
  try {
    const job = String(req.body?.job || "").trim().slice(0, 100);
    const city = String(req.body?.city || "").trim().slice(0, 100);
    const country = String(req.body?.country || "").trim().slice(0, 100);
    const year = Number(req.body?.year) || new Date().getFullYear();
    const customWorld = String(req.body?.customWorld || "").trim().slice(0, 120);

    if (!job && !city && !country) {
      return res.json({ summary: "", sources: [] });
    }

    const place = [city, country].filter(Boolean).join(", ");
    const queryBits = [];
    if (job && job !== "—" && job !== "unemployed") {
      queryBits.push(`career: ${job}`);
    }
    if (place && !/^(set dob first|set dob)/i.test(place)) {
      queryBits.push(`location: ${place}`);
    }
    if (!queryBits.length) {
      return res.json({ summary: "", sources: [] });
    }

    const ai = getGeminiClient();
    const prompt = [
      `Using Google Search for accurate, up-to-date real-world context, write 2 concise factual sentences (under 520 characters total, plain text, no markdown bullets) describing real-world details relevant to: ${queryBits.join(" | ")} (simulation year: ${year}).`,
      "Focus on grounded everyday details, notable local character, or realistic career context.",
    ].join(" ");

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    let summary = String(response.text || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 600);
    if (summary && customWorld) {
      summary = `(Home world '${customWorld.slice(0, 80)}' is fictional — use these real-world facts only as loose inspiration, never as canon.) ${summary}`;
    }

    return res.json({
      summary,
      sources: extractGroundingSources(response),
    });
  } catch (err) {
    return sendAiError("/api/ai/ground", res, err);
  }
});

// ---- API: World Timeline Divergence Analysis (Google Search Grounding) ----
app.post("/api/ai/timeline", async (req, res) => {
  try {
    const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
    const startWith = typeof req.body?.startWith === "string" ? req.body.startWith : "{";
    if (!prompt) {
      return res.status(400).json({ error: "Missing timeline analysis prompt." });
    }
    const ai = getGeminiClient();
    const contents = `${prompt}\n\nUse Google Search to ground real-world history and current affairs accurately where relevant. Begin your reply with exactly: ${startWith}`;
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    const text = (response.text || "").trim();
    if (!text) {
      return res.status(502).json({ error: "Gemini returned an empty timeline analysis." });
    }
    return res.json({
      text,
      sources: extractGroundingSources(response),
    });
  } catch (err) {
    return sendAiError("/api/ai/timeline", res, err);
  }
});

// ---- API: Director Mode Staging (Google Search Grounding) ----
app.post("/api/ai/director", async (req, res) => {
  try {
    const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
    const startWith = typeof req.body?.startWith === "string" ? req.body.startWith : "{";
    if (!prompt) {
      return res.status(400).json({ error: "Missing Director prompt." });
    }
    const ai = getGeminiClient();
    const contents = `${prompt}\n\nWhen the scenario references real-world places, current events, organizations, or public topics, use Google Search for accurate real-world grounding while strictly following the requested JSON schema. Begin your reply with exactly: ${startWith}`;
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    const text = (response.text || "").trim();
    if (!text) {
      return res.status(502).json({ error: "Gemini returned an empty Director scene." });
    }
    return res.json({
      text,
      sources: extractGroundingSources(response),
    });
  } catch (err) {
    return sendAiError("/api/ai/director", res, err);
  }
});

// ---- Static Game Assets (mapped at both / and /src/*) ----
const STATIC_DIRS = ["audio", "content", "docs", "engine", "images", "mods"];
const STATIC_FILES = ["style.css", "data.js", "i18n.js"];

const staticOpts = {
  setHeaders(res, filePath) {
    if (filePath.endsWith(".wasm")) {
      res.setHeader("Content-Type", "application/wasm");
    }
  },
};

for (const dir of STATIC_DIRS) {
  const fullPath = path.join(ROOT_DIR, dir);
  app.use(`/${dir}`, express.static(fullPath, staticOpts));
  app.use(`/src/${dir}`, express.static(fullPath, staticOpts));
}

for (const file of STATIC_FILES) {
  const fullPath = path.join(ROOT_DIR, file);
  app.get(`/${file}`, (_req, res) => res.sendFile(fullPath));
  app.get(`/src/${file}`, (_req, res) => res.sendFile(fullPath));
}

app.get("/full-game.zip", (_req, res) => {
  const zipPath = path.join(ROOT_DIR, "full-game.zip");
  if (!fs.existsSync(zipPath)) {
    return res.status(404).send("full-game.zip not found.");
  }
  return res.download(zipPath, "full-game.zip");
});

app.get(["/", "/index.html"], (_req, res) => {
  res.sendFile(path.join(ROOT_DIR, "index.html"));
});

app.listen(PORT, HOST, () => {
  console.log(`Life & Legacy server listening on http://${HOST}:${PORT}`);
});
