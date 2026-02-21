import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = path.resolve(process.cwd(), "graph2-0220");
const OUTPUT_PATH = path.resolve(process.cwd(), "public", "historyFromGraph.json");
const GRAPH_SOURCE_PATH = path.resolve(process.cwd(), "graph2-0220", "graph.json");
const GRAPH_OUTPUT_PATH = path.resolve(process.cwd(), "public", "graphData.json");

const RANGE_START_ISO = "2025-08-22T00:00:00.000Z";
const RANGE_END_ISO = "2026-02-21T23:59:59.999Z";
const RANGE_DAYS = 184;
const RANGE_START = new Date(RANGE_START_ISO);
const RANGE_END = new Date(RANGE_END_ISO);
const RANGE_MS = RANGE_END.getTime() - RANGE_START.getTime() + 1;

function hashString(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

function toFiniteNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function normalizeScore(rawScore) {
  if (!rawScore || typeof rawScore !== "object") {
    return null;
  }

  const confidence = toFiniteNumber(rawScore.confidence);
  const intensity = toFiniteNumber(rawScore.intensity);
  const valence = toFiniteNumber(rawScore.valence);
  const arousal = toFiniteNumber(rawScore.arousal);
  let emotionScore = toFiniteNumber(rawScore.emotion_score);

  if (emotionScore === null && confidence !== null && intensity !== null) {
    emotionScore = Number((confidence * intensity).toFixed(3));
  } else if (emotionScore === null && intensity !== null) {
    emotionScore = intensity;
  }

  if (
    emotionScore === null &&
    confidence === null &&
    intensity === null &&
    valence === null &&
    arousal === null
  ) {
    return null;
  }

  const score = {};
  if (emotionScore !== null) score.emotion_score = emotionScore;
  if (confidence !== null) score.confidence = confidence;
  if (intensity !== null) score.intensity = intensity;
  if (valence !== null) score.valence = valence;
  if (arousal !== null) score.arousal = arousal;
  return score;
}

function mapSentiment(rawEmotion) {
  const emotion = String(rawEmotion ?? "").toLowerCase();
  if (emotion.includes("기쁨") || emotion.includes("긍정") || emotion.includes("positive")) {
    return "positive";
  }
  if (emotion.includes("당황") || emotion.includes("중립") || emotion.includes("neutral")) {
    return "neutral";
  }
  return "negative";
}

function buildDateTime(id, index, total) {
  if (total <= 1) {
    return RANGE_END.toISOString();
  }

  const stepMs = Math.max(1, Math.floor(RANGE_MS / total));
  const slotStartMs = RANGE_START.getTime() + index * stepMs;
  const slotMaxOffset = Math.max(0, Math.min(stepMs - 1, RANGE_END.getTime() - slotStartMs));
  const jitterMs = hashString(`${id}:time`) % (slotMaxOffset + 1);
  const dateMs = slotStartMs + jitterMs;
  return new Date(dateMs).toISOString();
}

function resolveDateTimeFromInfo(info) {
  const direct = String(info?.datetime ?? "").trim();
  if (direct) {
    const parsed = new Date(direct);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  const date = String(info?.date ?? "").trim();
  const time = String(info?.time ?? "").trim();
  if (date && time) {
    const parsed = new Date(`${date}T${time}Z`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return "";
}

function listDialogueFiles(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listDialogueFiles(fullPath, out);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (!entry.name.startsWith("Empathy_") || !entry.name.endsWith(".json")) {
      continue;
    }

    // Keep only real dataset files, skip mvp/public artifacts.
    if (!fullPath.includes(`${path.sep}VL_`)) {
      continue;
    }

    out.push(fullPath);
  }
  return out;
}

function parseDialogue(filePath, index, total) {
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw);
  const info = parsed.info ?? {};
  const utterances = Array.isArray(parsed.utterances) ? parsed.utterances : [];

  const id = String(info.id ?? path.basename(filePath, ".json"));
  const contextSummary = String(info.situation ?? "").trim();
  const sentiment = mapSentiment(info.speaker_emotion);
  const score = normalizeScore(info.scores);

  const transcriptLines = utterances
    .flatMap((utterance) => {
      const role = String(utterance?.role ?? "").toLowerCase();
      const text = String(utterance?.text ?? "").trim();

      if (role.includes("speaker")) {
        return text ? [`User: ${text}`] : [];
      }

      if (role.includes("listener")) {
        if (!text) {
          return [];
        }

        const persona = String(utterance?.ai_persona ?? "").toLowerCase();
        if (persona === "rumi" || persona === "lumi") {
          return [`Rumi: ${text}`];
        }
        if (persona === "lami" || persona === "rami") {
          return [`Lami: ${text}`];
        }

        const personaReply =
          utterance?.persona_reply && typeof utterance.persona_reply === "object"
            ? utterance.persona_reply
            : null;
        const rumiText = String(personaReply?.rumi ?? "").trim();
        const lamiText = String(personaReply?.lami ?? "").trim();
        if (rumiText && !lamiText) {
          return [`Rumi: ${rumiText}`];
        }
        if (!rumiText && lamiText) {
          return [`Lami: ${lamiText}`];
        }
        if (rumiText) {
          return [`Rumi: ${rumiText}`];
        }
        return [`AIRA: ${text}`];
      }

      return text ? [`Unknown: ${text}`] : [];
    })
    .filter(Boolean);

  const fullTranscript =
    transcriptLines.length > 0 ? transcriptLines.join("\n") : contextSummary ? `User: ${contextSummary}` : "";

  const resolvedDate = resolveDateTimeFromInfo(info) || buildDateTime(id, index, total);
  const summary = {
    context_summary: contextSummary,
    sentiment,
  };
  if (score?.emotion_score !== undefined) {
    summary.emotion_score = score.emotion_score;
  }

  return {
    item: {
      id,
      user_id: "user_001",
      date: resolvedDate,
      full_transcript: fullTranscript,
      summary,
    },
    meta: {
      id,
      datetime: resolvedDate,
      score,
    },
  };
}

function buildHistory() {
  const files = listDialogueFiles(ROOT_DIR).sort((a, b) => a.localeCompare(b, "ko"));
  const history = [];
  const metaById = new Map();

  files.forEach((filePath, index) => {
    const parsed = parseDialogue(filePath, index, files.length);
    history.push(parsed.item);
    metaById.set(parsed.meta.id, parsed.meta);
  });

  history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return { history, metaById };
}

function writeHistoryFile(history) {
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(history), "utf8");
}

function copyGraphFile(metaById) {
  if (!fs.existsSync(GRAPH_SOURCE_PATH)) {
    console.warn(`graph source missing: ${GRAPH_SOURCE_PATH}`);
    return { scoredNodes: 0, memoryNodes: 0 };
  }

  const raw = fs.readFileSync(GRAPH_SOURCE_PATH, "utf8");
  const graph = JSON.parse(raw);
  const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  let memoryNodes = 0;
  let scoredNodes = 0;

  nodes.forEach((node) => {
    if (node?.type !== "memory") {
      return;
    }
    memoryNodes += 1;
    const rawMemoryId = String(node.key ?? "").replace(/^mem:/, "");
    const normalizedMemoryId = rawMemoryId.replace(/_\d+$/, "");
    const meta = metaById.get(rawMemoryId) ?? metaById.get(normalizedMemoryId);
    if (!meta) {
      return;
    }

    if (meta.datetime) {
      node.ts = meta.datetime;
    }

    if (meta.score?.emotion_score !== undefined) {
      node.emotion_score = meta.score.emotion_score;
      scoredNodes += 1;
    }
    if (meta.score?.confidence !== undefined) node.confidence = meta.score.confidence;
    if (meta.score?.intensity !== undefined) node.intensity = meta.score.intensity;
    if (meta.score?.valence !== undefined) node.valence = meta.score.valence;
    if (meta.score?.arousal !== undefined) node.arousal = meta.score.arousal;
  });

  fs.mkdirSync(path.dirname(GRAPH_OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(GRAPH_OUTPUT_PATH, JSON.stringify(graph), "utf8");
  return { scoredNodes, memoryNodes };
}

const { history, metaById } = buildHistory();
writeHistoryFile(history);
const graphResult = copyGraphFile(metaById);

console.log(`historyFromGraph generated: ${history.length} items`);
console.log(`date range (${RANGE_DAYS}d): ${RANGE_START.toISOString()} ~ ${RANGE_END.toISOString()}`);
console.log(`output: ${OUTPUT_PATH}`);
console.log(`graph output: ${GRAPH_OUTPUT_PATH}`);
console.log(`graph memory scored: ${graphResult.scoredNodes}/${graphResult.memoryNodes}`);
