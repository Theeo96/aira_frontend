import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = path.resolve(process.cwd(), "graph2-0220");

// 6-month window ending on 2026-02-21 (inclusive)
const RANGE_START_ISO = "2025-08-22T00:00:00.000Z";
const RANGE_END_ISO = "2026-02-21T23:59:59.999Z";
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
  const jitterMs = hashString(`${id}:source-time`) % (slotMaxOffset + 1);
  return new Date(slotStartMs + jitterMs).toISOString();
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
    if (!fullPath.includes(`${path.sep}VL_`)) {
      continue;
    }
    out.push(fullPath);
  }
  return out;
}

function reorderForSentimentMix(items) {
  const sentimentOrder = ["positive", "neutral", "negative"];
  const buckets = new Map(sentimentOrder.map((sentiment) => [sentiment, []]));
  items.forEach((item) => {
    const bucket = buckets.get(item.sentiment) ?? buckets.get("negative");
    bucket.push(item);
  });

  sentimentOrder.forEach((sentiment) => {
    const bucket = buckets.get(sentiment);
    bucket.sort((a, b) => {
      const ah = hashString(`${a.id}:${a.filePath}`);
      const bh = hashString(`${b.id}:${b.filePath}`);
      return ah - bh;
    });
  });

  const total = items.length;
  const assigned = new Map(sentimentOrder.map((sentiment) => [sentiment, 0]));
  const totals = new Map(sentimentOrder.map((sentiment) => [sentiment, (buckets.get(sentiment) ?? []).length]));
  const reordered = [];

  for (let pos = 0; pos < total; pos += 1) {
    let bestSentiment = null;
    let bestDeficit = Number.NEGATIVE_INFINITY;
    let bestRemaining = -1;

    sentimentOrder.forEach((sentiment) => {
      const targetTotal = totals.get(sentiment) ?? 0;
      const currentAssigned = assigned.get(sentiment) ?? 0;
      const remaining = targetTotal - currentAssigned;
      if (remaining <= 0) {
        return;
      }

      const targetByNow = ((pos + 1) * targetTotal) / total;
      const deficit = targetByNow - currentAssigned;
      if (
        deficit > bestDeficit ||
        (deficit === bestDeficit && remaining > bestRemaining) ||
        (deficit === bestDeficit && remaining === bestRemaining && bestSentiment === null)
      ) {
        bestSentiment = sentiment;
        bestDeficit = deficit;
        bestRemaining = remaining;
      }
    });

    if (!bestSentiment) {
      break;
    }

    const bucket = buckets.get(bestSentiment);
    const item = bucket[assigned.get(bestSentiment) ?? 0];
    reordered.push(item);
    assigned.set(bestSentiment, (assigned.get(bestSentiment) ?? 0) + 1);
  }

  return reordered;
}

function stampSourceDateTime() {
  const files = listDialogueFiles(ROOT_DIR).sort((a, b) => a.localeCompare(b, "ko"));
  const entries = files.map((filePath) => {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    const info = parsed.info ?? {};
    const id = String(info.id ?? path.basename(filePath, ".json"));
    const sentiment = mapSentiment(info.speaker_emotion);
    return { filePath, parsed, id, sentiment };
  });

  const ordered = reorderForSentimentMix(entries);
  ordered.forEach((entry, index) => {
    if (!entry.parsed.info || typeof entry.parsed.info !== "object") {
      entry.parsed.info = {};
    }
    const datetime = buildDateTime(entry.id, index, ordered.length);
    entry.parsed.info.datetime = datetime;
    entry.parsed.info.date = datetime.slice(0, 10);
    entry.parsed.info.time = datetime.slice(11, 19);
    fs.writeFileSync(entry.filePath, `${JSON.stringify(entry.parsed, null, 4)}\n`, "utf8");
  });

  const sentimentCounts = {
    positive: ordered.filter((entry) => entry.sentiment === "positive").length,
    neutral: ordered.filter((entry) => entry.sentiment === "neutral").length,
    negative: ordered.filter((entry) => entry.sentiment === "negative").length,
  };

  return { count: files.length, updated: ordered.length, sentimentCounts };
}

const result = stampSourceDateTime();
console.log(`source datetime stamped: ${result.updated}/${result.count}`);
console.log(`range: ${RANGE_START.toISOString()} ~ ${RANGE_END.toISOString()}`);
console.log(`sentiments: ${JSON.stringify(result.sentimentCounts)}`);
