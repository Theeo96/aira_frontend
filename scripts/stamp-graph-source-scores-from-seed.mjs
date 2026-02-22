import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = path.resolve(process.cwd(), "graph2-0220");
const JSONL_PATHS = [
  path.resolve(
    process.cwd(),
    "graph2-0220",
    "mvp",
    "emotion-graph-viewer-jsonl",
    "public",
    "synthetic_emotion_32labels_2560.jsonl",
  ),
  path.resolve(
    process.cwd(),
    "graph2-0220",
    "mvp",
    "emotion-graph-viewer-jsonl",
    "public",
    "synthetic_emotion_demo_200.jsonl",
  ),
];

function round(value, digits = 3) {
  if (!Number.isFinite(value)) {
    return value;
  }
  return Number(value.toFixed(digits));
}

function toFiniteNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
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

function buildScoreBySeedId() {
  const buckets = new Map();
  let rowCount = 0;

  for (const jsonlPath of JSONL_PATHS) {
    if (!fs.existsSync(jsonlPath)) {
      continue;
    }
    const raw = fs.readFileSync(jsonlPath, "utf8").replace(/^\uFEFF/, "");
    const lines = raw.split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      const row = JSON.parse(line);
      const seedId = String(row?.seed_id ?? "").trim();
      if (!seedId) {
        continue;
      }

      const confidence = toFiniteNumber(row?.scores?.confidence);
      const intensity = toFiniteNumber(row?.scores?.intensity);
      const valence = toFiniteNumber(row?.scores?.valence);
      const arousal = toFiniteNumber(row?.scores?.arousal);
      if (
        confidence === null ||
        intensity === null ||
        valence === null ||
        arousal === null
      ) {
        continue;
      }

      if (!buckets.has(seedId)) {
        buckets.set(seedId, {
          sample_count: 0,
          confidence_sum: 0,
          intensity_sum: 0,
          valence_sum: 0,
          arousal_sum: 0,
        });
      }
      const bucket = buckets.get(seedId);
      bucket.sample_count += 1;
      bucket.confidence_sum += confidence;
      bucket.intensity_sum += intensity;
      bucket.valence_sum += valence;
      bucket.arousal_sum += arousal;
      rowCount += 1;
    }
  }

  const scoreBySeedId = new Map();
  buckets.forEach((bucket, seedId) => {
    if (bucket.sample_count <= 0) {
      return;
    }
    const confidence = bucket.confidence_sum / bucket.sample_count;
    const intensity = bucket.intensity_sum / bucket.sample_count;
    const valence = bucket.valence_sum / bucket.sample_count;
    const arousal = bucket.arousal_sum / bucket.sample_count;
    scoreBySeedId.set(seedId, {
      source: "seed_id_aggregate",
      sample_count: bucket.sample_count,
      confidence: round(confidence),
      intensity: round(intensity),
      valence: round(valence),
      arousal: round(arousal),
      emotion_score: round(intensity * confidence),
    });
  });

  return { scoreBySeedId, rowCount };
}

function stampScores() {
  const { scoreBySeedId, rowCount } = buildScoreBySeedId();
  const files = listDialogueFiles(ROOT_DIR).sort((a, b) => a.localeCompare(b, "ko"));

  let scored = 0;
  let missing = 0;

  for (const filePath of files) {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed.info || typeof parsed.info !== "object") {
      parsed.info = {};
    }
    const id = String(parsed.info.id ?? path.basename(filePath, ".json"));
    const score = scoreBySeedId.get(id);

    if (score) {
      parsed.info.scores = score;
      scored += 1;
    } else {
      delete parsed.info.scores;
      missing += 1;
    }

    fs.writeFileSync(filePath, `${JSON.stringify(parsed, null, 4)}\n`, "utf8");
  }

  return {
    files: files.length,
    rows: rowCount,
    uniqueSeedIds: scoreBySeedId.size,
    scored,
    missing,
  };
}

const result = stampScores();
console.log(`synthetic rows used: ${result.rows}`);
console.log(`synthetic unique seed_id: ${result.uniqueSeedIds}`);
console.log(`source scored: ${result.scored}/${result.files}`);
console.log(`source missing score: ${result.missing}`);
