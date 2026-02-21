import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = path.resolve(process.cwd(), "graph2-0220");

function hashString(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

function normalizeText(text) {
  return String(text ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
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

function classifyPersona(utterance, text) {
  const empathyTags = Array.isArray(utterance?.listener_empathy)
    ? utterance.listener_empathy.map((tag) => String(tag).trim())
    : [];

  let emotionalScore = 0;
  let rationalScore = 0;

  for (const tag of empathyTags) {
    if (tag === "조언") {
      rationalScore += 2;
    }
    if (tag === "격려" || tag === "동조" || tag === "위로") {
      emotionalScore += 2;
    }
  }

  const emotionalHints =
    /(마음|감정|속상|슬프|힘들|불안|걱정|위로|고생|괜찮|응원|공감|다행|축하|기뻐|외롭|미안|고마)/g;
  const rationalHints =
    /(계획|정리|방법|우선|먼저|단계|기록|원인|해결|선택|판단|현실|기준|정확|확인|분석|실행|준비|시간|일정|목표)/g;

  const emotionalMatches = text.match(emotionalHints);
  const rationalMatches = text.match(rationalHints);
  emotionalScore += emotionalMatches ? emotionalMatches.length : 0;
  rationalScore += rationalMatches ? rationalMatches.length : 0;

  if (rationalScore > emotionalScore) {
    return "lami";
  }
  if (emotionalScore > rationalScore) {
    return "rumi";
  }

  // Tie-breaker for neutral lines.
  const tieKey = String(utterance?.utterance_id ?? text);
  return hashString(tieKey) % 3 === 0 ? "lami" : "rumi";
}

function stampPersonaReplies() {
  const files = listDialogueFiles(ROOT_DIR).sort((a, b) => a.localeCompare(b, "ko"));
  let changedFiles = 0;
  let listenerUtterances = 0;
  let classifiedAsRumi = 0;
  let classifiedAsLami = 0;

  for (const filePath of files) {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    const utterances = Array.isArray(parsed.utterances) ? parsed.utterances : [];

    let changedInFile = false;
    for (const utterance of utterances) {
      const role = String(utterance?.role ?? "").toLowerCase();
      if (!role.includes("listener")) {
        continue;
      }

      listenerUtterances += 1;
      const text = normalizeText(utterance?.text ?? "");
      if (!text) {
        continue;
      }

      const nextPersona = classifyPersona(utterance, text);
      if (utterance.ai_persona !== nextPersona) {
        utterance.ai_persona = nextPersona;
        changedInFile = true;
      }

      // Remove synthetic split replies: keep original text only.
      if (utterance.persona_reply !== undefined) {
        delete utterance.persona_reply;
        changedInFile = true;
      }

      if (nextPersona === "lami") {
        classifiedAsLami += 1;
      } else {
        classifiedAsRumi += 1;
      }
    }

    if (changedInFile) {
      fs.writeFileSync(filePath, `${JSON.stringify(parsed, null, 4)}\n`, "utf8");
      changedFiles += 1;
    }
  }

  return {
    files: files.length,
    changedFiles,
    listenerUtterances,
    classifiedAsRumi,
    classifiedAsLami,
  };
}

const result = stampPersonaReplies();
console.log(`persona source files: ${result.files}`);
console.log(`persona changed files: ${result.changedFiles}`);
console.log(`listener utterances: ${result.listenerUtterances}`);
console.log(`classified rumi: ${result.classifiedAsRumi}`);
console.log(`classified lami: ${result.classifiedAsLami}`);
