import fs from "node:fs";
import path from "node:path";

const SOURCE_GRAPH_PATH = path.resolve(
  process.cwd(),
  "graph2-0220",
  "mvp",
  "emotion-graph-viewer-jsonl",
  "public",
  "graph_with_ts.json",
);
const TARGET_GRAPH_PATH = path.resolve(process.cwd(), "public", "graph_with_ts.json");
const TARGET_HISTORY_PATH = path.resolve(process.cwd(), "public", "historyFromGraph.json");

const ANSWER_TOKEN_REGEX = /\n+\s*(?:\uC751\uB2F5|response|assistant|ai)\s*[:\uFF1A]\s*/i;

const EVENT_TOKENS = [
  "면접",
  "건강검진",
  "상사 면담",
  "예상치 못한 연락",
  "원치 않는 부탁",
  "친구와 약속",
  "동료와 갈등",
  "운동 루틴",
  "월세/이사",
  "기대하던 결과 발표",
  "프로젝트 발표",
  "병원 진료",
  "성과평가",
  "팀 회의",
  "시험",
  "대출 심사",
  "가족 모임",
  "데이트",
];

const removeBom = (text) => text.replace(/^\uFEFF/, "");

const parseTs = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = new Date(raw.includes("T") ? raw : raw.replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const keyToHistoryId = (memoryKey) => {
  const raw = String(memoryKey ?? "").replace(/^mem:/, "");
  return raw.replace(/_\d+$/, "");
};

const ensureDir = (filePath) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
};

const hasBatchim = (char) => {
  const code = char.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
};

const subjectParticle = (word) => {
  const s = String(word ?? "").trim();
  if (!s) return "가";
  const last = s[s.length - 1];
  return hasBatchim(last) ? "이" : "가";
};

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeKoreanSurface = (value) => {
  let text = String(value ?? "").trim();
  if (!text) return "";

  text = text
    .replace(/\s+/g, " ")
    .replace(/([가-힣]+)(?:이|가)\s*기대 때문에/g, "$1의 기대 때문에")
    .replace(/([가-힣]+)(?:이|가)\s*때문에/g, "$1 때문에");

  for (const token of EVENT_TOKENS) {
    const particle = subjectParticle(token);
    const re = new RegExp(`${escapeRegex(token)}가`, "g");
    text = text.replace(re, `${token}${particle}`);
  }

  return text
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
};

const parseMemoryTurn = (fullText, fallbackLabel = "") => {
  const raw = String(fullText ?? "").trim();
  if (!raw) {
    return {
      userText: normalizeKoreanSurface(fallbackLabel),
      aiText: "",
    };
  }

  const splitByAnswer = raw.split(ANSWER_TOKEN_REGEX);
  if (splitByAnswer.length > 1) {
    return {
      userText: normalizeKoreanSurface(splitByAnswer[0].trim() || fallbackLabel),
      aiText: normalizeKoreanSurface(splitByAnswer.slice(1).join(" ").trim()),
    };
  }

  const paragraphs = raw
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (paragraphs.length >= 2) {
    return {
      userText: normalizeKoreanSurface(paragraphs[0]),
      aiText: normalizeKoreanSurface(paragraphs.slice(1).join(" ")),
    };
  }

  return {
    userText: normalizeKoreanSurface(raw || fallbackLabel),
    aiText: "",
  };
};

const normalizeSentiment = (value) => {
  const v = String(value ?? "").trim().toLowerCase();
  if (v === "positive" || v === "negative" || v === "neutral") return v;
  return "";
};

const sentimentFromEmotion = (emotionRaw) => {
  const emotion = String(emotionRaw ?? "");
  const idToken = emotion.match(/E(\d{2})_/i)?.[1];
  if (idToken) {
    const id = Number(idToken);
    if (id >= 1 && id <= 10) return "positive";
    if (id >= 26 && id <= 28) return "neutral";
    if (id === 32) return "neutral";
    return "negative";
  }

  const upper = emotion.toUpperCase();
  if (upper.includes("NEUTRAL")) return "neutral";
  if (
    upper.includes("JOY") ||
    upper.includes("GRATITUDE") ||
    upper.includes("HAPPINESS") ||
    upper.includes("PRIDE") ||
    upper.includes("SATISFACTION") ||
    upper.includes("LOVE") ||
    upper.includes("AFFECTION")
  ) {
    return "positive";
  }
  return "negative";
};

const summarizeSentiment = (memoryDetails) => {
  if (!Array.isArray(memoryDetails) || memoryDetails.length === 0) return "neutral";
  let score = 0;
  memoryDetails.forEach((detail) => {
    const s = String(detail?.sentiment ?? "");
    if (s === "positive") score += 1;
    else if (s === "negative") score -= 1;
  });
  const avg = score / Math.max(1, memoryDetails.length);
  if (avg > 0.2) return "positive";
  if (avg < -0.2) return "negative";
  return "neutral";
};

const readSourceGraph = () => {
  if (!fs.existsSync(SOURCE_GRAPH_PATH)) {
    throw new Error(`source graph not found: ${SOURCE_GRAPH_PATH}`);
  }
  const raw = removeBom(fs.readFileSync(SOURCE_GRAPH_PATH, "utf8"));
  const payload = JSON.parse(raw);
  if (!Array.isArray(payload?.nodes) || !Array.isArray(payload?.edges)) {
    throw new Error("invalid graph payload");
  }
  return payload;
};

const buildHistoryFromGraph = (graphPayload) => {
  const memories = graphPayload.nodes.filter((node) => node?.type === "memory");
  const grouped = new Map();

  memories.forEach((memory) => {
    const memoryKey = String(memory.key ?? "").trim();
    if (!memoryKey) return;
    const historyId = keyToHistoryId(memoryKey);
    if (!historyId) return;

    const items = grouped.get(historyId) ?? [];
    items.push({
      key: memoryKey,
      label: String(memory.label ?? "").trim(),
      fullText: String(memory.full_text ?? "").trim(),
      ts: String(memory.ts ?? "").trim(),
      emotion: String(memory.emotion ?? "").trim(),
      sentiment: normalizeSentiment(memory.sentiment),
    });
    grouped.set(historyId, items);
  });

  const history = Array.from(grouped.entries())
    .map(([id, items]) => {
      const sorted = [...items].sort((a, b) => {
        const aTs = parseTs(a.ts)?.getTime() ?? 0;
        const bTs = parseTs(b.ts)?.getTime() ?? 0;
        if (aTs !== bTs) return aTs - bTs;
        return a.key.localeCompare(b.key);
      });

      const memoryDetails = sorted.map((item) => {
        const { userText, aiText } = parseMemoryTurn(item.fullText, item.label);
        const sentiment = item.sentiment || sentimentFromEmotion(item.emotion);
        const normalizedUser = normalizeKoreanSurface(userText);
        const normalizedAi = normalizeKoreanSurface(aiText);
        return {
          key: item.key,
          ts: item.ts,
          emotion: item.emotion,
          sentiment,
          user_text: normalizedUser,
          ai_text: normalizedAi,
          full_text: normalizedAi
            ? `${normalizedUser}\n\n응답: ${normalizedAi}`
            : normalizedUser,
          label: normalizeKoreanSurface(item.label || normalizedUser),
        };
      });

      const transcript = memoryDetails
        .flatMap((detail) => {
          const lines = [];
          if (detail.user_text) lines.push(`User: ${detail.user_text}`);
          if (detail.ai_text) lines.push(`AI: ${detail.ai_text}`);
          return lines;
        })
        .join("\n");

      const latest = memoryDetails[memoryDetails.length - 1];
      const latestDate = parseTs(latest?.ts)?.toISOString() ?? "";
      const summarySentiment = summarizeSentiment(memoryDetails);

      return {
        id,
        user_id: "user_001",
        date: latestDate,
        full_transcript: transcript || `User: ${normalizeKoreanSurface(sorted[0]?.label ?? "")}`,
        memory_keys: sorted.map((item) => item.key),
        memory_details: memoryDetails,
        summary: {
          context_summary:
            memoryDetails.find((detail) => detail.user_text)?.user_text ??
            normalizeKoreanSurface(sorted[0]?.label ?? ""),
          sentiment: summarySentiment,
        },
      };
    })
    .sort((a, b) => {
      const ta = parseTs(a.date)?.getTime() ?? 0;
      const tb = parseTs(b.date)?.getTime() ?? 0;
      return tb - ta;
    });

  return history;
};

const main = () => {
  const sourceGraph = readSourceGraph();
  const history = buildHistoryFromGraph(sourceGraph);

  ensureDir(TARGET_GRAPH_PATH);
  fs.writeFileSync(TARGET_GRAPH_PATH, JSON.stringify(sourceGraph), "utf8");

  ensureDir(TARGET_HISTORY_PATH);
  fs.writeFileSync(TARGET_HISTORY_PATH, JSON.stringify(history), "utf8");

  console.log(`graph copied: ${TARGET_GRAPH_PATH}`);
  console.log(`history generated: ${history.length}`);
  console.log(`history output: ${TARGET_HISTORY_PATH}`);
};

main();
