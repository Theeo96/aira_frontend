import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  MessageSquareText,
  ChevronLeft,
  ScrollText,
  CalendarDays,
  X,
} from "lucide-react";
import Graph from "graphology";
import forceAtlas2 from "graphology-layout-forceatlas2";
import { SigmaContainer, useRegisterEvents, useSigma } from "@react-sigma/core";
import "@react-sigma/core/lib/style.css";
import "../styles/react-sigma.css";
import HistoryGraphMvp from "../components/HistoryGraphMvp";
interface HistorySummary {
  context_summary?: string;
  sentiment?: string;
}

interface HistoryMessage {
  idx: number;
  speaker: string;
  text: string;
}

interface HistoryMemoryDetail {
  key: string;
  ts?: string;
  emotion?: string;
  sentiment?: string;
  user_text?: string;
  ai_text?: string;
  full_text?: string;
  label?: string;
}

export interface HistoryItem {
  id: string;
  user_id: string;
  date: string;
  full_transcript: string;
  messages?: HistoryMessage[];
  memory_keys?: string[];
  memory_details?: HistoryMemoryDetail[];
  summary?: HistorySummary;
}

interface HistoryPageProps {
  historyData: HistoryItem[];
  viewMode: "graph" | "list";
  setViewMode: (mode: "graph" | "list") => void;
  persona?: "rumi" | "lami" | string;
}

type OpenHistoryPayload =
  | string
  | {
    historyId?: string;
    memoryKey?: string;
    snippet?: string;
    fullText?: string;
  };

type Speaker = "ai" | "rumi" | "lami" | "user" | "unknown";

interface TranscriptMessage {
  speaker: Speaker;
  text: string;
}

interface GraphNode {
  key: string;
  label?: string;
  type?: string;
  size?: number;
  x?: number;
  y?: number;
  group?: string;
  emotion?: string;
  relation?: string;
  full_text?: string;
  ts?: string;
  emotion_score?: number;
  emotionScore?: number;
  score?: number;
  history_id?: string;
}

interface GraphEdge {
  key?: string;
  source: string;
  target: string;
  type?: string;
  weight?: number;
}

interface GraphPayload {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface ChangeAlert {
  id: string;
  type: "EMOTION_SPIKE" | "RELATION_BIAS" | "DIVERSITY_DROP";
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  window: {
    baseline: string;
    recent: string;
  };
  filters: {
    emotion: string;
    relation: string;
  };
  evidence: Array<{
    key: string;
    ts: string;
    text: string;
  }>;
}

const EMOTION_COLOR_MAP: Record<string, string> = {
  기쁨: "#d8a24a",
  당황: "#c8afff",
  분노: "#b74885",
  불안: "#6a96a8",
  상처: "#c5a0bf",
  슬픔: "#5d65bf",
  중립: "#8f9ab1",
};

const MEMORY_TONE_COLOR_MAP: Record<string, string> = {
  기쁨: "#ebc980",
  당황: "#ddd0ff",
  분노: "#cf73a7",
  불안: "#95b6c4",
  상처: "#ddbed6",
  슬픔: "#8c92d6",
  중립: "#b7c0d3",
};

const EMOTION_GROUP_COLOR_MAP: Record<string, string> = {
  JOY: "#d8a24a",
  SADNESS: "#5d65bf",
  ANXIETY: "#6a96a8",
  ANGER: "#b74885",
  SURPRISE: "#c8afff",
  HURT: "#c5a0bf",
  NEUTRAL: "#8f9ab1",
};

const MEMORY_GROUP_TONE_MAP: Record<string, string> = {
  JOY: "#ebc980",
  SADNESS: "#8c92d6",
  ANXIETY: "#95b6c4",
  ANGER: "#cf73a7",
  SURPRISE: "#ddd0ff",
  HURT: "#ddbed6",
  NEUTRAL: "#b7c0d3",
};

const EMOTION_CLUSTER_DEFS = [
  {
    key: "JOY",
    ids: ["E01", "E02", "E03", "E04", "E05", "E06"],
    color: "#d8a24a",
  },
  {
    key: "HURT",
    ids: ["E07", "E08", "E09", "E10", "E30", "E31"],
    color: "#c5a0bf",
  },
  {
    key: "SADNESS",
    ids: ["E11", "E12", "E13", "E14", "E15", "E16"],
    color: "#5d65bf",
  },
  { key: "ANGER", ids: ["E17", "E18", "E19", "E20", "E21"], color: "#b74885" },
  {
    key: "ANXIETY_FEAR",
    ids: ["E22", "E23", "E24", "E25"],
    color: "#6a96a8",
  },
  {
    key: "SURPRISE_CONFUSION",
    ids: ["E26", "E27", "E28", "E29"],
    color: "#c8afff",
  },
  { key: "NEUTRAL", ids: ["E32"], color: "#8f9ab1" },
] as const;

const EMOTION_CLUSTER_LABEL_KO: Record<string, string> = {
  JOY: "기쁨",
  SADNESS: "슬픔",
  ANXIETY_FEAR: "불안",
  ANGER: "분노",
  SURPRISE_CONFUSION: "당황",
  HURT: "상처",
  NEUTRAL: "중립",
};

const EMOTION_ID_TO_CLUSTER = new Map<string, string>(
  EMOTION_CLUSTER_DEFS.flatMap((cluster) =>
    cluster.ids.map((id) => [id, cluster.key] as [string, string]),
  ),
);

const hashToColor = (seed: string) => {
  const s = String(seed ?? "");
  let hash = 0;
  for (let i = 0; i < s.length; i += 1) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  return `hsl(${hue} 70% 52%)`;
};

const inferEmotionFamily = (label: string, group = "") => {
  const normalized = String(label ?? "")
    .replace(/\s*\(E\d+_[A-Z_]+\)\s*$/, "")
    .trim();
  const upperGroup = String(group ?? "").toUpperCase();
  const idUpper = (
    String(label ?? "").match(/\(E\d+_([A-Z_]+)\)/)?.[1] ?? ""
  ).toUpperCase();

  if (EMOTION_COLOR_MAP[normalized]) {
    if (normalized === "기쁨") return "JOY";
    if (normalized === "슬픔") return "SADNESS";
    if (normalized === "불안") return "ANXIETY";
    if (normalized === "분노") return "ANGER";
    if (normalized === "당황") return "SURPRISE";
    if (normalized === "상처") return "HURT";
    if (normalized === "중립") return "NEUTRAL";
  }

  const token = upperGroup || idUpper;
  if (
    token.includes("JOY") ||
    token.includes("GRATITUDE") ||
    token.includes("PRIDE") ||
    token.includes("SATISFACTION")
  )
    return "JOY";
  if (
    token.includes("SAD") ||
    token.includes("REGRET") ||
    token.includes("DISAPPOINT")
  )
    return "SADNESS";
  if (
    token.includes("ANXI") ||
    token.includes("TENSION") ||
    token.includes("WORRY") ||
    token.includes("FEAR") ||
    token.includes("NERVOUS")
  )
    return "ANXIETY";
  if (
    token.includes("ANGER") ||
    token.includes("IRRIT") ||
    token.includes("FRUSTRAT") ||
    token.includes("RAGE")
  )
    return "ANGER";
  if (token.includes("SURPRISE") || token.includes("EMBARRASS"))
    return "SURPRISE";
  if (
    token.includes("HURT") ||
    token.includes("SHAME") ||
    token.includes("GUILT") ||
    token.includes("PAIN")
  )
    return "HURT";
  if (token.includes("NEUTRAL")) return "NEUTRAL";
  return "";
};

const emotionLabelOnly = (label: string) =>
  String(label ?? "")
    .replace(/\s*\(E\d+_[^)]+\)\s*$/, "")
    .trim();

const emotionIdFromLabel = (label: string) =>
  String(label ?? "").match(/\((E\d+)_/)?.[1] ?? "";

const resolveClusterKeyFromEmotionLabel = (label: string) => {
  const emotionId = emotionIdFromLabel(label);
  return EMOTION_ID_TO_CLUSTER.get(emotionId) ?? "";
};

const emotionClusterLabelKo = (clusterKey: string) =>
  EMOTION_CLUSTER_LABEL_KO[String(clusterKey ?? "")] ?? String(clusterKey ?? "");

const getEmotionColor = (label: string, group = "") => {
  const family = inferEmotionFamily(label, group);
  if (family && EMOTION_GROUP_COLOR_MAP[family])
    return EMOTION_GROUP_COLOR_MAP[family];
  return EMOTION_COLOR_MAP[emotionLabelOnly(label)] ?? hashToColor(label);
};

const getMemoryToneColor = (emotion: string, group = "") => {
  const family = inferEmotionFamily(emotion, group);
  if (family && MEMORY_GROUP_TONE_MAP[family])
    return MEMORY_GROUP_TONE_MAP[family];
  return MEMORY_TONE_COLOR_MAP[emotionLabelOnly(emotion)] ?? "#cbd5e1";
};

const colorWithAlpha = (color: string, alpha: number | string) => {
  if (!color) return `rgba(239, 68, 68, ${alpha})`;
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    const full =
      hex.length === 3
        ? hex
          .split("")
          .map((c) => c + c)
          .join("")
        : hex;
    const parsed = Number.parseInt(full, 16);
    if (Number.isFinite(parsed)) {
      const r = (parsed >> 16) & 255;
      const g = (parsed >> 8) & 255;
      const b = parsed & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }
  if (color.startsWith("rgb(")) {
    const values = color.slice(4, -1);
    return `rgba(${values}, ${alpha})`;
  }
  if (color.startsWith("rgba(")) {
    const values = color.slice(5, -1).split(",").slice(0, 3).join(",");
    return `rgba(${values}, ${alpha})`;
  }
  return color;
};

const drawReadableNodeLabel = (
  context: CanvasRenderingContext2D,
  data: { label?: string; x: number; y: number; size: number },
  settings: {
    isDarkMode?: boolean;
    labelSize?: number;
    labelFont?: string;
    labelWeight?: string | number;
  },
) => {
  if (!data.label) return;

  const isDarkMode = Boolean(settings.isDarkMode);
  const size = Number(settings.labelSize ?? 13);
  const font = String(settings.labelFont ?? "sans-serif");
  const weight = String(settings.labelWeight ?? "600");
  const label = emotionLabelOnly(String(data.label));
  const x = data.x + data.size + 6;
  const y = data.y + size / 3;
  const paddingX = 4;
  const paddingY = 2;

  context.font = `${weight} ${size}px ${font}`;
  const textWidth = context.measureText(label).width;

  context.fillStyle = isDarkMode
    ? "rgba(2, 6, 23, 0.58)"
    : "rgba(255, 255, 255, 0.9)";
  context.fillRect(
    x - paddingX,
    y - size + 1 - paddingY,
    textWidth + paddingX * 2,
    size + paddingY * 2,
  );

  context.strokeStyle = isDarkMode
    ? "rgba(15, 23, 42, 0.95)"
    : "rgba(148, 163, 184, 0.8)";
  context.lineWidth = 1;
  context.strokeText(label, x, y);

  context.fillStyle = isDarkMode
    ? "rgba(241, 245, 249, 0.98)"
    : "rgba(15, 23, 42, 0.96)";
  context.fillText(label, x, y);
};

const buildGraphology = (
  data: GraphPayload,
  filters: { emotion: string; relation: string },
  options: { expandedClusters?: Set<string> } = {},
) => {
  const graph = new Graph({ type: "undirected" });

  const allowEmotion = filters.emotion === "ALL";
  const allowRelation = filters.relation === "ALL";
  const hierarchyEnabled = true;
  const expandedClusters = options.expandedClusters ?? new Set<string>();

  const nodeByKey = new Map(data.nodes.map((node) => [node.key, node]));
  const emotionNodesFromData = data.nodes.filter((node) => node.type === "emotion");
  const emotionClusterByLabel = new Map(
    emotionNodesFromData.map((node) => [
      String(node.label ?? ""),
      resolveClusterKeyFromEmotionLabel(String(node.label ?? "")),
    ]),
  );
  const selectedClusterKey = allowEmotion
    ? ""
    : (emotionClusterByLabel.get(filters.emotion) ??
      resolveClusterKeyFromEmotionLabel(filters.emotion));
  const clusterCounts = new Map<string, number>();
  for (const label of emotionClusterByLabel.values()) {
    if (!label) continue;
    clusterCounts.set(label, (clusterCounts.get(label) ?? 0) + 1);
  }

  const seedCoord = (key: string, axis: number) => {
    const seed = String(key ?? "");
    let hash = 2166136261;
    for (let i = 0; i < seed.length; i += 1) {
      hash ^= seed.charCodeAt(i) + axis * 17;
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return ((hash >>> 0) % 1000) / 1000 - 0.5;
  };

  const memVisible = new Set<string>();
  const relationVisibleEmotionCounts = new Map<string, number>();
  for (const node of data.nodes) {
    if (node.type !== "memory") continue;
    const relation = String(node.relation ?? "");
    const emotion = String(node.emotion ?? "");
    const okR = allowRelation || relation === filters.relation;
    if (okR && emotion) {
      relationVisibleEmotionCounts.set(
        emotion,
        (relationVisibleEmotionCounts.get(emotion) ?? 0) + 1,
      );
    }
    let okE = allowEmotion || emotion === filters.emotion;
    if (hierarchyEnabled && allowEmotion) okE = false;
    if (okE && okR) memVisible.add(node.key);
  }

  const emotionMetrics = new Map<string, { count: number; score: number }>();
  let hasEmotionScore = false;
  const memoryIntensity = new Map<string, number>();
  const memoryIntensityValues: number[] = [];

  for (const key of memVisible) {
    const mem = nodeByKey.get(key);
    if (!mem || !mem.emotion) continue;

    const metric = emotionMetrics.get(mem.emotion) ?? { count: 0, score: 0 };
    metric.count += 1;

    const rawScore = Number(mem.emotion_score ?? mem.emotionScore ?? mem.score);
    if (Number.isFinite(rawScore)) {
      metric.score += Math.abs(rawScore);
      if (Math.abs(rawScore) > 0) hasEmotionScore = true;
    }

    const scoreIntensity = Number.isFinite(rawScore) ? Math.abs(rawScore) : Number.NaN;
    const textLen = String(mem.full_text ?? mem.label ?? "").trim().length;
    const textIntensity = Math.log1p(textLen);
    const intensity = scoreIntensity > 0 ? scoreIntensity : textIntensity;
    memoryIntensity.set(key, intensity);
    memoryIntensityValues.push(intensity);

    emotionMetrics.set(mem.emotion, metric);
  }

  const minIntensity = memoryIntensityValues.length
    ? Math.min(...memoryIntensityValues)
    : 0;
  const maxIntensity = memoryIntensityValues.length
    ? Math.max(...memoryIntensityValues)
    : 1;

  const resolveMemoryNodeSize = (key: string, fallbackSize = 5) => {
    const intensity = memoryIntensity.get(key);
    if (!Number.isFinite(intensity)) return fallbackSize;

    const normalized =
      maxIntensity === minIntensity
        ? 0.5
        : ((intensity ?? fallbackSize) - minIntensity) / (maxIntensity - minIntensity);
    const eased = Math.pow(Math.max(0, Math.min(1, normalized)), 0.78);
    return 3 + eased * 5;
  };

  const resolveEmotionNodeSize = (_label: string, fallbackSize = 8) => {
    return Math.min(7.8, fallbackSize || 7.8);
  };

  if (hierarchyEnabled) {
    for (const cluster of EMOTION_CLUSTER_DEFS) {
      if (!clusterCounts.has(cluster.key)) continue;
      if (!allowEmotion && selectedClusterKey && cluster.key !== selectedClusterKey) continue;
      const clusterNodeKey = `cluster:${cluster.key}`;
      graph.addNode(clusterNodeKey, {
        label: emotionClusterLabelKo(cluster.key),
        size: expandedClusters.has(cluster.key) ? 14 : 12,
        x: seedCoord(clusterNodeKey, 1) * 2.8,
        y: seedCoord(clusterNodeKey, 2) * 2.8,
        color: cluster.color,
        baseColor: cluster.color,
        nodeType: "emotion_cluster",
        clusterKey: cluster.key,
      });
    }
  }

  for (const node of data.nodes) {
    if (node.type === "emotion") {
      const label = String(node.label ?? "");
      const clusterKey = emotionClusterByLabel.get(label) ?? "";
      if (hierarchyEnabled) {
        if (allowEmotion) {
          if (!clusterKey || !expandedClusters.has(clusterKey)) continue;
          if (!allowRelation && (relationVisibleEmotionCounts.get(label) ?? 0) === 0) continue;
        } else if (label !== filters.emotion) {
          continue;
        }
      } else {
        const hasAny = [...memVisible].some((memoryKey) => {
          const memoryNode = nodeByKey.get(memoryKey);
          return String(memoryNode?.emotion ?? "") === label;
        });
        if (!hasAny) continue;
      }
    }

    if (node.type === "relation") {
      const label = String(node.label ?? "");
      const hasAny = [...memVisible].some((memoryKey) => {
        const memoryNode = nodeByKey.get(memoryKey);
        return String(memoryNode?.relation ?? "") === label;
      });
      if (!hasAny) continue;
    }

    if (node.type === "memory" && !memVisible.has(node.key)) continue;

    const x = Number.isFinite(node.x) ? Number(node.x) : seedCoord(node.key, 1);
    const y = Number.isFinite(node.y) ? Number(node.y) : seedCoord(node.key, 2);

    const baseColor =
      node.type === "emotion"
        ? getEmotionColor(String(node.label ?? ""), String(node.group ?? ""))
        : node.type === "relation"
          ? "#6b7280"
          : getMemoryToneColor(String(node.emotion ?? ""));

    graph.addNode(node.key, {
      label: String(node.label ?? ""),
      size:
        node.type === "memory"
          ? resolveMemoryNodeSize(node.key, node.size ?? 5)
          : node.type === "emotion"
            ? resolveEmotionNodeSize(String(node.label ?? ""), node.size ?? 8)
            : (node.size ?? 5),
      x,
      y,
      color: baseColor,
      baseColor,
      nodeType: node.type,
      radialMetricCount:
        node.type === "emotion"
          ? (emotionMetrics.get(String(node.label ?? ""))?.count ?? 0)
          : 0,
      radialMetricScore:
        node.type === "emotion"
          ? (emotionMetrics.get(String(node.label ?? ""))?.score ?? 0)
          : 0,
      group: node.group,
      emotionFamily:
        node.type === "emotion"
          ? inferEmotionFamily(String(node.label ?? ""), String(node.group ?? ""))
          : inferEmotionFamily(String(node.emotion ?? "")),
      clusterKey:
        node.type === "emotion"
          ? (emotionClusterByLabel.get(String(node.label ?? "")) ?? "")
          : "",
      emotion: node.emotion,
      relation: node.relation,
      full_text: node.full_text,
      ts: node.ts,
    });
  }

  for (const edge of data.edges) {
    if (!graph.hasNode(edge.source) || !graph.hasNode(edge.target)) continue;
    if (
      edge.type === "similar" &&
      !(memVisible.has(edge.source) && memVisible.has(edge.target))
    ) {
      continue;
    }
    graph.addEdge(edge.source, edge.target, {
      weight: edge.weight ?? 1,
      edgeType: edge.type,
    });
  }

  if (hierarchyEnabled) {
    for (const emotionNode of emotionNodesFromData) {
      const label = String(emotionNode.label ?? "");
      const clusterKey = emotionClusterByLabel.get(label);
      if (!clusterKey) continue;
      const source = `cluster:${clusterKey}`;
      const target = emotionNode.key;
      if (!graph.hasNode(source) || !graph.hasNode(target) || graph.hasEdge(source, target)) {
        continue;
      }
      graph.addEdge(source, target, { weight: 1, edgeType: "cluster_branch" });
    }
  }

  forceAtlas2.assign(graph, {
    iterations: 250,
    settings: { slowDown: 10, gravity: 1 },
  });
  graph.forEachNode((node) => {
    const attrs = graph.getNodeAttributes(node);
    if (!Number.isFinite(attrs.x) || !Number.isFinite(attrs.y)) {
      graph.mergeNodeAttributes(node, {
        x: seedCoord(node, 3),
        y: seedCoord(node, 4),
      });
    }
  });

  graph.setAttribute("hasEmotionScore", hasEmotionScore);
  return graph;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const extractMemoryIdFromKey = (key: string) =>
  key.startsWith("mem:") ? key.slice(4) : key;

const normalizeMemoryId = (id: string) => id.replace(/_\d+$/, "");

const parseGraphTs = (value: string) => {
  if (!value) {
    return null;
  }
  const parsed = new Date(
    value.includes("T") ? value : value.replace(" ", "T"),
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatYmdLocal = (date: Date) => {
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const countBy = <T,>(items: T[], keyFn: (item: T) => string) => {
  const counter = new Map<string, number>();
  items.forEach((item) => {
    const key = keyFn(item);
    counter.set(key, (counter.get(key) ?? 0) + 1);
  });
  return counter;
};

const ratioMap = (counter: Map<string, number>, total: number) => {
  const ratios = new Map<string, number>();
  counter.forEach((value, key) => {
    ratios.set(key, value / Math.max(1, total));
  });
  return ratios;
};

const entropy = (values: Map<string, number>) => {
  let score = 0;
  values.forEach((p) => {
    if (p > 1e-9) {
      score -= p * Math.log(p);
    }
  });
  return score;
};

const clampThreeLines: React.CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 3,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

const speakerTokenRegex =
  /(Rumi|Lumi|Lami|Rami|AI|Assistant|Bot|AIRA|User|사용자|유저|나|Me)\s*[:：]/gi;

const normalizeSpeaker = (token: string): Speaker => {
  const key = token.toLowerCase();
  if (["user", "사용자", "유저", "나", "me"].includes(key)) {
    return "user";
  }
  if (["rumi", "lumi"].includes(key)) {
    return "rumi";
  }
  if (["lami", "rami"].includes(key)) {
    return "lami";
  }
  if (["ai", "assistant", "bot", "aira"].includes(key)) {
    return "ai";
  }
  return "unknown";
};

const parseTranscript = (rawTranscript: string): TranscriptMessage[] => {
  const transcript = rawTranscript.trim();
  if (!transcript) {
    return [];
  }

  const normalized = transcript.replace(/\r\n/g, "\n");
  const matches = [...normalized.matchAll(speakerTokenRegex)];

  if (matches.length === 0) {
    return [{ speaker: "unknown", text: normalized }];
  }

  const messages: TranscriptMessage[] = [];
  const firstIndex = matches[0].index ?? 0;
  if (firstIndex > 0) {
    const leading = normalized.slice(0, firstIndex).trim();
    if (leading) {
      messages.push({ speaker: "unknown", text: leading });
    }
  }

  matches.forEach((match, idx) => {
    const start = match.index ?? 0;
    const end = matches[idx + 1]?.index ?? normalized.length;
    const label = match[1] ?? "";
    const textStart = start + match[0].length;
    const body = normalized.slice(textStart, end).trim();

    if (!body) {
      return;
    }

    messages.push({
      speaker: normalizeSpeaker(label),
      text: body,
    });
  });

  return messages.length > 0
    ? messages
    : [{ speaker: "unknown", text: normalized }];
};

// ... (Rest of components and logic from mun1 HistoryPage)
const getSentimentStyle = (sentiment: string) => {
  const normalized = sentiment.toLowerCase();

  if (normalized.includes("positive") || normalized.includes("긍정")) {
    return {
      label: "긍정",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      accentClass: "bg-emerald-500",
      dotClass: "bg-emerald-500",
    };
  }

  if (normalized.includes("negative") || normalized.includes("부정")) {
    return {
      label: "부정",
      className: "bg-rose-50 text-rose-700 border-rose-200",
      accentClass: "bg-rose-500",
      dotClass: "bg-rose-500",
    };
  }

  return {
    label: "중립",
    className: "bg-slate-100 text-slate-700 border-slate-200",
    accentClass: "bg-slate-500",
    dotClass: "bg-slate-500",
  };
};

const formatDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { day: value, time: "" };
  }

  return {
    day: parsed.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }),
    time: parsed.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
  };
};

const buildTitle = (item: HistoryItem) => {
  const { day, time } = formatDate(item.date);
  return time ? `${day} ${time}` : day;
};

interface SigmaSelectionBridgeProps {
  selectedId: string | null;
  secondarySelectedId?: string | null;
  showEdgesOnHover: boolean;
  isDarkMode: boolean;
  onHoverNode: (key: string | null) => void;
}

const SigmaSelectionBridge: React.FC<SigmaSelectionBridgeProps> = ({
  selectedId,
  secondarySelectedId = null,
  showEdgesOnHover,
  isDarkMode,
  onHoverNode,
}) => {
  const sigma = useSigma();
  const registerEvents = useRegisterEvents();
  const [hovered, setHovered] = useState<string | null>(null);

  const computeNeighborhood = (baseIds: string[]) => {
    if (!baseIds || baseIds.length === 0)
      return { nodes: new Set<string>(), edges: new Set<string>() };

    const g = sigma.getGraph();
    const nodes = new Set<string>();
    const edges = new Set<string>();

    for (const baseId of baseIds) {
      if (!baseId || !g.hasNode(baseId)) continue;
      nodes.add(baseId);
      g.forEachEdge(baseId, (edge, _attrs, source, target) => {
        edges.add(edge);
        nodes.add(source);
        nodes.add(target);
      });
    }

    return { nodes, edges };
  };

  const primaryActiveId = showEdgesOnHover && hovered ? hovered : selectedId;
  const focusIds = useMemo(
    () => [primaryActiveId, secondarySelectedId].filter(Boolean) as string[],
    [primaryActiveId, secondarySelectedId],
  );
  const hasFocus = focusIds.length > 0;
  const neighborhood = computeNeighborhood(focusIds);

  useEffect(() => {
    registerEvents({
      enterNode: (event) => {
        setHovered(event.node);
        onHoverNode(event.node);
      },
      leaveNode: () => {
        setHovered(null);
        onHoverNode(null);
      },
    });
  }, [onHoverNode, registerEvents]);

  useEffect(() => {
    sigma.setSetting("nodeReducer", (node, data: any) => {
      const res: any = { ...data };
      delete res.type;
      const isMemory = data.nodeType === "memory";
      const isHoveredNode = node === hovered;
      const compactMode = sigma.getDimensions().width <= 900;

      if (!hasFocus) {
        res.highlighted = false;
        res.color = data.baseColor ?? data.color;
        if (isMemory) {
          const showLabel = isHoveredNode;
          res.label = showLabel ? data.label : "";
          res.forceLabel = showLabel;
        } else if (compactMode && data.nodeType === "emotion") {
          res.label = "";
          res.forceLabel = false;
        } else {
          res.forceLabel = data.nodeType === "emotion_cluster";
        }
        res.labelColor = isDarkMode
          ? "rgba(241, 245, 249, 0.98)"
          : "rgba(15, 23, 42, 0.96)";
        return res;
      }

      const isSelected = focusIds.includes(node);
      const inN = neighborhood.nodes.has(node);

      if (isSelected) {
        res.highlighted = true;
        res.size = (data.size ?? 5) * 1.18;
        res.color = isDarkMode
          ? "rgba(248, 250, 252, 1)"
          : "rgba(15, 23, 42, 0.92)";
        res.label = data.label;
        res.labelColor = isDarkMode
          ? "rgba(248, 250, 252, 1)"
          : "rgba(15, 23, 42, 0.98)";
        res.forceLabel = true;
        res.zIndex = 2;
        return res;
      }

      if (inN) {
        res.highlighted = false;
        res.size = (data.size ?? 5) * 1.05;
        res.color = data.baseColor ?? "rgba(71, 85, 105, 0.92)";
        let showLabel = true;
        if (isMemory) {
          showLabel = isHoveredNode;
        } else if (compactMode && data.nodeType !== "emotion_cluster") {
          showLabel = isHoveredNode;
        }
        res.label = showLabel ? data.label : "";
        res.forceLabel = showLabel || data.nodeType === "emotion_cluster";
        res.labelColor = isDarkMode
          ? "rgba(241, 245, 249, 0.98)"
          : "rgba(15, 23, 42, 0.96)";
        res.zIndex = 1;
        return res;
      }

      res.highlighted = false;
      res.color = "rgba(71, 85, 105, 0.45)";
      res.label = "";
      res.forceLabel = false;
      return res;
    });

    sigma.setSetting("edgeReducer", (edge, data: any) => {
      const res: any = { ...data };
      delete res.type;

      if (!hasFocus) {
        res.hidden = true;
        return res;
      }

      const inNeighborhood = neighborhood.edges.has(edge);
      res.hidden = !inNeighborhood;
      if (inNeighborhood) {
        res.color = "rgba(148, 163, 184, 0.2)";
        res.size = Math.max(0.45, (data.size ?? 1) * 0.5);
      }
      return res;
    });

    return () => {
      sigma.setSetting("nodeReducer", null);
      sigma.setSetting("edgeReducer", null);
    };
  }, [hasFocus, neighborhood, isDarkMode, hovered, focusIds, sigma]);

  return null;
};

const SigmaEmotionGlow: React.FC<{
  isDarkMode: boolean;
  metricMode: "count" | "score";
}> = ({ isDarkMode, metricMode }) => {
  const sigma = useSigma();
  const TARGETED_EMOTION_IDS = useMemo(
    () => new Set(["E07", "E08", "E09", "E10", "E30", "E31"]),
    [],
  );

  useEffect(() => {
    const canvases = sigma.getCanvases();
    const overlayCanvas = canvases.hovers ?? canvases.labels;
    const overlayCtx = overlayCanvas?.getContext("2d");
    if (!overlayCanvas || !overlayCtx) return undefined;

    const drawGlow = () => {
      const g = sigma.getGraph();
      const { width, height } = sigma.getDimensions();
      overlayCtx.clearRect(0, 0, width, height);
      const viewportBase = Math.min(width, height);
      const timeSec = performance.now() * 0.001;
      const alphaBoost = isDarkMode ? 1 : 1.65;
      const radiusBoost = isDarkMode ? 1 : 1.15;

      g.forEachNode((node, attrs: any) => {
        if (attrs.nodeType !== "emotion_cluster") return;
        const display = sigma.getNodeDisplayData(node);
        if (!display || display.hidden) return;

        const center = sigma.framedGraphToViewport({ x: display.x, y: display.y });
        const color = attrs.baseColor ?? attrs.color ?? "#94a3b8";
        const pulse = 0.88 + Math.sin(timeSec * 1.4 + (display.x + display.y) * 0.25) * 0.12;
        const base = clamp((display.size ?? 12) * 3.4, 24, viewportBase * 0.065);
        const radius = base * pulse * radiusBoost;
        const outerRadius = radius * 1.42;

        const core = overlayCtx.createRadialGradient(
          center.x,
          center.y,
          radius * 0.2,
          center.x,
          center.y,
          radius,
        );
        core.addColorStop(0, colorWithAlpha(color, Math.min(0.36, 0.2 * alphaBoost)));
        core.addColorStop(0.5, colorWithAlpha(color, Math.min(0.16, 0.09 * alphaBoost)));
        core.addColorStop(1, colorWithAlpha(color, 0));
        overlayCtx.fillStyle = core;
        overlayCtx.beginPath();
        overlayCtx.arc(center.x, center.y, radius, 0, Math.PI * 2);
        overlayCtx.fill();

        const mist = overlayCtx.createRadialGradient(
          center.x,
          center.y,
          radius * 0.52,
          center.x,
          center.y,
          outerRadius,
        );
        mist.addColorStop(0, colorWithAlpha(color, Math.min(0.14, 0.08 * alphaBoost)));
        mist.addColorStop(0.6, colorWithAlpha(color, Math.min(0.06, 0.03 * alphaBoost)));
        mist.addColorStop(1, colorWithAlpha(color, 0));
        overlayCtx.fillStyle = mist;
        overlayCtx.beginPath();
        overlayCtx.arc(center.x, center.y, outerRadius, 0, Math.PI * 2);
        overlayCtx.fill();

        overlayCtx.beginPath();
        overlayCtx.arc(center.x, center.y, radius * 0.78, 0, Math.PI * 2);
        overlayCtx.strokeStyle = colorWithAlpha(color, Math.min(0.48, 0.28 * alphaBoost));
        overlayCtx.lineWidth = 1.6;
        overlayCtx.stroke();
      });

      const hasScore = Boolean(g.getAttribute("hasEmotionScore"));
      const useScore = metricMode === "score" && hasScore;

      const entries: Array<{
        node: string;
        value: number;
        color: string;
        family: string;
        emotionId: string;
      }> = [];
      let maxValue = 0;

      g.forEachNode((node, attrs: any) => {
        if (attrs.nodeType !== "emotion") return;
        const rawValue = useScore
          ? Number(attrs.radialMetricScore ?? 0)
          : Number(attrs.radialMetricCount ?? 0);
        if (!Number.isFinite(rawValue) || rawValue <= 0) return;
        const id = emotionIdFromLabel(attrs.label);
        const value = TARGETED_EMOTION_IDS.has(id) ? rawValue * 0.16 : rawValue;
        maxValue = Math.max(maxValue, value);
        entries.push({
          node,
          value,
          color: attrs.baseColor ?? attrs.color,
          family: inferEmotionFamily(attrs.label, attrs.group),
          emotionId: id,
        });
      });

      if (maxValue > 0) {
        const familyBuckets = new Map<
          string,
          { value: number; color: string; weightedX: number; weightedY: number; weight: number }
        >();
        for (const { node, value, color, family, emotionId } of entries) {
          const display = sigma.getNodeDisplayData(node);
          if (!display || display.hidden) continue;
          const center = sigma.framedGraphToViewport({ x: display.x, y: display.y });
          if (TARGETED_EMOTION_IDS.has(emotionId)) continue;
          const key = family || node;
          const bucket = familyBuckets.get(key) ?? {
            value: 0,
            color: color ?? "#94a3b8",
            weightedX: 0,
            weightedY: 0,
            weight: 0,
          };
          bucket.value += value;
          bucket.weight += value;
          bucket.weightedX += center.x * value;
          bucket.weightedY += center.y * value;
          if (!bucket.color) bucket.color = color;
          familyBuckets.set(key, bucket);
        }

        if (familyBuckets.size > 0) {
          const maxFamilyValue = Math.max(
            ...[...familyBuckets.values()].map((b) => b.value),
          );
          const familyCount = familyBuckets.size;
          const densityScale = familyCount >= 9 ? 0.82 : 1;

          for (const bucket of familyBuckets.values()) {
            const color = bucket.color ?? "#94a3b8";
            const ratio = bucket.value / Math.max(1, maxFamilyValue);
            const center = {
              x: bucket.weightedX / Math.max(1, bucket.weight),
              y: bucket.weightedY / Math.max(1, bucket.weight),
            };
            const radius = clamp(
              (34 + Math.pow(ratio, 0.74) * 92) * densityScale,
              18,
              viewportBase * (familyCount >= 9 ? 0.12 : 0.17),
            );
            const coreAlpha = 0.03 * densityScale * alphaBoost;
            const mistAlpha = 0.015 * densityScale * alphaBoost;

            const gradient = overlayCtx.createRadialGradient(
              center.x,
              center.y,
              radius * 0.58,
              center.x,
              center.y,
              radius,
            );
            gradient.addColorStop(0, colorWithAlpha(color, (coreAlpha * 0.7).toFixed(3)));
            gradient.addColorStop(
              0.55,
              colorWithAlpha(color, (coreAlpha * 0.42).toFixed(3)),
            );
            gradient.addColorStop(1, colorWithAlpha(color, 0));
            overlayCtx.fillStyle = gradient;
            overlayCtx.beginPath();
            overlayCtx.arc(center.x, center.y, radius, 0, Math.PI * 2);
            overlayCtx.fill();

            const mistRadius = Math.min(
              radius * 1.26,
              viewportBase * (familyCount >= 9 ? 0.16 : 0.22),
            );
            const mist = overlayCtx.createRadialGradient(
              center.x,
              center.y,
              radius * 0.46,
              center.x,
              center.y,
              mistRadius,
            );
            mist.addColorStop(0, colorWithAlpha(color, mistAlpha.toFixed(3)));
            mist.addColorStop(
              0.65,
              colorWithAlpha(color, (mistAlpha * 0.42).toFixed(3)),
            );
            mist.addColorStop(1, colorWithAlpha(color, 0));
            overlayCtx.fillStyle = mist;
            overlayCtx.beginPath();
            overlayCtx.arc(center.x, center.y, mistRadius, 0, Math.PI * 2);
            overlayCtx.fill();
          }
        }

        for (const { node, value, color, emotionId } of entries) {
          const display = sigma.getNodeDisplayData(node);
          if (!display || display.hidden) continue;
          const center = sigma.framedGraphToViewport({ x: display.x, y: display.y });
          const ratio = value / maxValue;
          const isTargeted = TARGETED_EMOTION_IDS.has(emotionId);
          const radius = isTargeted
            ? clamp(
              (display.size ?? 8) * 0.84 + Math.pow(ratio, 0.9) * 3.2,
              3.2,
              viewportBase * 0.011,
            )
            : clamp(
              (display.size ?? 8) * 1.2 + Math.pow(ratio, 0.85) * 12,
              6,
              viewportBase * 0.03,
            );
          const coreAlpha = (isTargeted ? 0.004 : 0.015) * alphaBoost;
          const mistAlpha = (isTargeted ? 0.002 : 0.007) * alphaBoost;

          const gradient = overlayCtx.createRadialGradient(
            center.x,
            center.y,
            (display.size ?? 8) * 0.8,
            center.x,
            center.y,
            radius,
          );
          gradient.addColorStop(0, colorWithAlpha(color, coreAlpha.toFixed(3)));
          gradient.addColorStop(
            0.42,
            colorWithAlpha(color, (coreAlpha * 0.64).toFixed(3)),
          );
          gradient.addColorStop(
            0.74,
            colorWithAlpha(color, (coreAlpha * 0.24).toFixed(3)),
          );
          gradient.addColorStop(1, colorWithAlpha(color, 0));

          overlayCtx.fillStyle = gradient;
          overlayCtx.beginPath();
          overlayCtx.arc(center.x, center.y, radius, 0, Math.PI * 2);
          overlayCtx.fill();

          const mistRadius = isTargeted
            ? Math.min(radius * 1.05, viewportBase * 0.015)
            : Math.min(radius * 1.15, viewportBase * 0.042);
          const mist = overlayCtx.createRadialGradient(
            center.x,
            center.y,
            radius * 0.35,
            center.x,
            center.y,
            mistRadius,
          );
          mist.addColorStop(0, colorWithAlpha(color, (mistAlpha * 0.75).toFixed(3)));
          mist.addColorStop(
            0.65,
            colorWithAlpha(color, (mistAlpha * 0.32).toFixed(3)),
          );
          mist.addColorStop(1, colorWithAlpha(color, 0));
          overlayCtx.fillStyle = mist;
          overlayCtx.beginPath();
          overlayCtx.arc(center.x, center.y, mistRadius, 0, Math.PI * 2);
          overlayCtx.fill();
        }
      }

      const cameraRatio = sigma.getCamera().getState().ratio;
      const isZoomedIn = cameraRatio <= 0.85;
      if (!isZoomedIn) return;

      const ringBoost = Math.min(1.8, 0.85 / Math.max(0.2, cameraRatio));
      g.forEachNode((node, attrs: any) => {
        if (attrs.nodeType !== "memory") return;

        const display = sigma.getNodeDisplayData(node);
        if (!display || display.hidden) return;

        const center = sigma.framedGraphToViewport({ x: display.x, y: display.y });
        const baseSize = display.size ?? 4;
        const ringRadius = baseSize + 1.6 * ringBoost;
        const ringWidth = Math.max(1, baseSize * 0.33);
        const baseColor = attrs.baseColor ?? attrs.color ?? "#94a3b8";

        overlayCtx.beginPath();
        overlayCtx.arc(center.x, center.y, ringRadius, 0, Math.PI * 2);
        overlayCtx.strokeStyle = colorWithAlpha(
          baseColor,
          Math.min(0.6, 0.42 * alphaBoost),
        );
        overlayCtx.lineWidth = ringWidth;
        overlayCtx.stroke();
      });
    };

    sigma.on("afterRender", drawGlow);
    drawGlow();

    return () => {
      sigma.off("afterRender", drawGlow);
      const { width, height } = sigma.getDimensions();
      overlayCtx.clearRect(0, 0, width, height);
    };
  }, [sigma, metricMode, TARGETED_EMOTION_IDS, isDarkMode]);

  return null;
};

const GraphEvents: React.FC<{
  onSelect: (
    node:
      | (GraphNode & {
        key: string;
        nodeType?: string;
        clusterKey?: string;
      })
      | null,
  ) => void;
}> = ({ onSelect }) => {
  const registerEvents = useRegisterEvents();
  const sigma = useSigma();

  useEffect(() => {
    registerEvents({
      clickNode: (event) => {
        const node = event.node;
        const attrs = sigma.getGraph().getNodeAttributes(node) as Record<string, unknown>;
        onSelect({
          key: node,
          ...(attrs as unknown as Partial<GraphNode>),
          nodeType: String(attrs.nodeType ?? ""),
          clusterKey: String(attrs.clusterKey ?? ""),
        });
      },
      clickStage: () => onSelect(null),
    });
  }, [registerEvents, sigma, onSelect]);

  return null;
};

const HistoryPage: React.FC<HistoryPageProps> = ({
  historyData,
  viewMode,
  setViewMode,
  persona,
}) => {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedMemoryKey, setSelectedMemoryKey] = useState<string | null>(null);
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [graphData, setGraphData] = useState<GraphPayload | null>(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphError, setGraphError] = useState("");
  const [graphEmotionFilter, setGraphEmotionFilter] = useState("ALL");
  const [graphRelationFilter, setGraphRelationFilter] = useState("ALL");
  const [selectedGraphNodeKey, setSelectedGraphNodeKey] = useState<
    string | null
  >(null);
  const [hoveredGraphNodeKey, setHoveredGraphNodeKey] = useState<string | null>(
    null,
  );
  const [graphShowEdgesOnHover, setGraphShowEdgesOnHover] = useState(true);
  const [graphIntensityMetric, setGraphIntensityMetric] = useState<
    "count" | "score"
  >("count");
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(
    () => new Set(),
  );
  const [recentDays, setRecentDays] = useState(7);
  const [baselineDays, setBaselineDays] = useState(28);
  const [graphResetNonce, setGraphResetNonce] = useState(0);

  useEffect(() => {
    let canceled = false;

    const loadGraphData = async () => {
      setGraphLoading(true);
      setGraphError("");
      try {
        const token = localStorage.getItem("aira_user_token");
        if (!token) throw new Error("No token found");
        const response = await fetch(`https://thimblelike-nonopprobrious-lannie.ngrok-free.dev/api/memory?token=${encodeURIComponent(token)}`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`graph_with_ts load failed: ${response.status}`);
        }
        const payload = await response.json();

        if (canceled) {
          return;
        }
        if (payload.ok && payload.data && Array.isArray(payload.data)) {
          const allNodes: any[] = [];
          const allEdges: any[] = [];
          payload.data.forEach((item: any) => {
            if (item.graph) {
              allNodes.push(...(item.graph.nodes || []));
              allEdges.push(...(item.graph.edges || []));
            }
          });

          const uniqueMap = new Map();
          allNodes.forEach(n => uniqueMap.set(n.key, n));
          const uniqueNodes = Array.from(uniqueMap.values());

          setGraphData({ nodes: uniqueNodes, edges: allEdges } as GraphPayload);
        } else {
          throw new Error("invalid graphData payload from API");
        }
      } catch (error) {
        if (canceled) {
          return;
        }
        console.error("Failed to load graph UI data", error);
        setGraphError("그래프 데이터를 불러오지 못했습니다.");
      } finally {
        if (!canceled) {
          setGraphLoading(false);
        }
      }
    };

    loadGraphData();
    return () => {
      canceled = true;
    };
  }, []);

  const historyDateById = useMemo(() => {
    const map = new Map<string, string>();
    historyData.forEach((item) => {
      map.set(item.id, item.date);
    });
    return map;
  }, [historyData]);

  const allMemoryNodesWithTs = useMemo(() => {
    if (!graphData) {
      return [] as GraphNode[];
    }
    return graphData.nodes
      .filter((node) => node.type === "memory")
      .map((node) => {
        const memoryId = extractMemoryIdFromKey(node.key);
        const normalizedMemoryId = normalizeMemoryId(memoryId);
        const ts =
          node.ts ??
          historyDateById.get(memoryId) ??
          historyDateById.get(normalizedMemoryId) ??
          "";
        return { ...node, ts };
      });
  }, [graphData, historyDateById]);

  const graphDataWithTs = useMemo(() => {
    if (!graphData) {
      return null;
    }
    const nodes = graphData.nodes.map((node) => {
      if (node.type !== "memory") return node;
      const memoryId = extractMemoryIdFromKey(node.key);
      const normalizedMemoryId = normalizeMemoryId(memoryId);
      const historyId = historyDateById.has(memoryId)
        ? memoryId
        : historyDateById.has(normalizedMemoryId)
          ? normalizedMemoryId
          : "";
      const ts =
        node.ts ??
        historyDateById.get(memoryId) ??
        historyDateById.get(normalizedMemoryId) ??
        "";
      return {
        ...node,
        ts,
        history_id: historyId || node.history_id,
      };
    });
    return {
      nodes,
      edges: graphData.edges,
    } as GraphPayload;
  }, [graphData, historyDateById]);

  const graphNodeByKey = useMemo(() => {
    if (!graphDataWithTs) return new Map<string, GraphNode>();
    return new Map(graphDataWithTs.nodes.map((node) => [node.key, node]));
  }, [graphDataWithTs]);

  const emotionOptions = useMemo(() => {
    if (!graphDataWithTs) return [] as string[];
    return graphDataWithTs.nodes
      .filter((node) => node.type === "emotion")
      .map((node) => String(node.label ?? "").trim())
      .filter(Boolean)
      .sort((a, b) => {
        const ai = Number(emotionIdFromLabel(a).replace("E", ""));
        const bi = Number(emotionIdFromLabel(b).replace("E", ""));
        if (Number.isFinite(ai) && Number.isFinite(bi) && ai !== bi) return ai - bi;
        return a.localeCompare(b, "ko");
      });
  }, [graphDataWithTs]);

  const relationOptions = useMemo(() => {
    if (!graphDataWithTs) return [] as string[];
    return graphDataWithTs.nodes
      .filter((node) => node.type === "relation")
      .map((node) => String(node.label ?? "").trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "ko"));
  }, [graphDataWithTs]);

  const sigmaGraph = useMemo(() => {
    if (!graphDataWithTs) {
      return null;
    }
    return buildGraphology(
      graphDataWithTs,
      { emotion: graphEmotionFilter, relation: graphRelationFilter },
      { expandedClusters },
    );
  }, [
    expandedClusters,
    graphDataWithTs,
    graphEmotionFilter,
    graphRelationFilter,
  ]);

  const visibleMemoryCount = useMemo(() => {
    if (!sigmaGraph) return 0;
    let count = 0;
    sigmaGraph.forEachNode((_node, attrs) => {
      if (attrs.nodeType === "memory") count += 1;
    });
    return count;
  }, [sigmaGraph]);

  const selectedGraphNode = useMemo(() => {
    if (!sigmaGraph || !selectedGraphNodeKey || !sigmaGraph.hasNode(selectedGraphNodeKey)) {
      return null;
    }
    const attrs = sigmaGraph.getNodeAttributes(selectedGraphNodeKey) as Record<
      string,
      unknown
    >;
    const sourceNode = graphNodeByKey.get(selectedGraphNodeKey);
    return {
      ...(sourceNode ?? {}),
      key: selectedGraphNodeKey,
      type: String(attrs.nodeType ?? sourceNode?.type ?? ""),
      label: String(attrs.label ?? sourceNode?.label ?? ""),
      full_text: String(attrs.full_text ?? sourceNode?.full_text ?? ""),
      ts: String(attrs.ts ?? sourceNode?.ts ?? ""),
    } as GraphNode;
  }, [graphNodeByKey, selectedGraphNodeKey, sigmaGraph]);

  const graphView = useMemo(() => {
    if (!sigmaGraph) {
      return null;
    }
    return {
      emotionOptions,
      relationOptions,
      selectedNode: selectedGraphNode,
      visibleMemoryCount,
      graphNodeCount: sigmaGraph.order,
      graphEdgeCount: sigmaGraph.size,
      hasEmotionScore: Boolean(sigmaGraph.getAttribute("hasEmotionScore")),
    };
  }, [
    emotionOptions,
    relationOptions,
    selectedGraphNode,
    sigmaGraph,
    visibleMemoryCount,
  ]);

  const graphAlerts = useMemo(() => {
    if (allMemoryNodesWithTs.length === 0) {
      return [] as ChangeAlert[];
    }

    const memories = allMemoryNodesWithTs
      .map((node) => {
        const parsed = parseGraphTs(String(node.ts ?? ""));
        if (!parsed) {
          return null;
        }
        return {
          ...node,
          _date: parsed,
        };
      })
      .filter((item): item is GraphNode & { _date: Date } => item !== null)
      .sort((a, b) => a._date.getTime() - b._date.getTime());

    if (memories.length === 0) {
      return [] as ChangeAlert[];
    }

    const end = memories[memories.length - 1]._date;
    const recentStart = new Date(
      end.getTime() - recentDays * 24 * 60 * 60 * 1000,
    );
    const baselineStart = new Date(
      end.getTime() - (recentDays + baselineDays) * 24 * 60 * 60 * 1000,
    );
    const recent = memories.filter(
      (item) => item._date >= recentStart && item._date <= end,
    );
    const baseline = memories.filter(
      (item) => item._date >= baselineStart && item._date < recentStart,
    );

    if (recent.length === 0 || baseline.length === 0) {
      return [] as ChangeAlert[];
    }

    const recentEmotionRatios = ratioMap(
      countBy(recent, (item) => String(item.emotion ?? "UNKNOWN")),
      recent.length,
    );
    const baselineEmotionRatios = ratioMap(
      countBy(baseline, (item) => String(item.emotion ?? "UNKNOWN")),
      baseline.length,
    );
    const recentRelationRatios = ratioMap(
      countBy(recent, (item) => String(item.relation ?? "UNKNOWN")),
      recent.length,
    );
    const baselineRelationRatios = ratioMap(
      countBy(baseline, (item) => String(item.relation ?? "UNKNOWN")),
      baseline.length,
    );

    const alerts: ChangeAlert[] = [];
    const emotionCandidates: Array<{
      emotion: string;
      recentValue: number;
      baselineValue: number;
      delta: number;
    }> = [];
    recentEmotionRatios.forEach((value, emotion) => {
      const baselineValue = baselineEmotionRatios.get(emotion) ?? 0;
      const delta = value - baselineValue;
      const multiple =
        baselineValue > 0 ? value / baselineValue : value >= 0.15 ? 999 : 0;
      if (value >= 0.18 && (multiple >= 1.6 || delta >= 0.12)) {
        emotionCandidates.push({
          emotion,
          recentValue: value,
          baselineValue,
          delta,
        });
      }
    });
    emotionCandidates
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 3)
      .forEach((candidate) => {
        const evidence = recent
          .filter(
            (item) => String(item.emotion ?? "UNKNOWN") === candidate.emotion,
          )
          .slice(0, 3)
          .map((item) => ({
            key: item.key,
            ts: String(item.ts ?? ""),
            text: String(item.full_text ?? ""),
          }));
        alerts.push({
          id: `emo_spike_${candidate.emotion}`,
          type: "EMOTION_SPIKE",
          severity: candidate.delta >= 0.2 ? "high" : "medium",
          title: `최근 ${recentDays}일 '${candidate.emotion}' 증가`,
          detail: `baseline ${(candidate.baselineValue * 100).toFixed(0)}% -> recent ${(candidate.recentValue * 100).toFixed(0)}%`,
          window: {
            baseline: `${formatYmdLocal(baselineStart)} ~ ${formatYmdLocal(recentStart)}`,
            recent: `${formatYmdLocal(recentStart)} ~ ${formatYmdLocal(end)}`,
          },
          filters: {
            emotion: candidate.emotion,
            relation: "ALL",
          },
          evidence,
        });
      });

    const allRelations = new Set<string>([
      ...recentRelationRatios.keys(),
      ...baselineRelationRatios.keys(),
    ]);
    allRelations.forEach((relation) => {
      const recentRelationItems = recent.filter(
        (item) => String(item.relation ?? "UNKNOWN") === relation,
      );
      const baselineRelationItems = baseline.filter(
        (item) => String(item.relation ?? "UNKNOWN") === relation,
      );
      if (recentRelationItems.length < 8 || baselineRelationItems.length < 8) {
        return;
      }
      const relationRecentRatio = ratioMap(
        countBy(recentRelationItems, (item) =>
          String(item.emotion ?? "UNKNOWN"),
        ),
        recentRelationItems.length,
      );
      const relationBaselineRatio = ratioMap(
        countBy(baselineRelationItems, (item) =>
          String(item.emotion ?? "UNKNOWN"),
        ),
        baselineRelationItems.length,
      );
      let best: {
        emotion: string;
        recentValue: number;
        baselineValue: number;
        delta: number;
      } | null = null;
      relationRecentRatio.forEach((recentValue, emotion) => {
        const baselineValue = relationBaselineRatio.get(emotion) ?? 0;
        const delta = recentValue - baselineValue;
        if (!best || delta > best.delta) {
          best = { emotion, recentValue, baselineValue, delta };
        }
      });
      if (!best || best.recentValue < 0.35 || best.delta < 0.18) {
        return;
      }
      const evidence = recentRelationItems
        .filter((item) => String(item.emotion ?? "UNKNOWN") === best?.emotion)
        .slice(0, 3)
        .map((item) => ({
          key: item.key,
          ts: String(item.ts ?? ""),
          text: String(item.full_text ?? ""),
        }));
      alerts.push({
        id: `rel_bias_${relation}_${best.emotion}`,
        type: "RELATION_BIAS",
        severity: best.delta >= 0.25 ? "high" : "medium",
        title: `최근 '${relation}'에서 '${best.emotion}' 집중`,
        detail: `baseline ${(best.baselineValue * 100).toFixed(0)}% -> recent ${(best.recentValue * 100).toFixed(0)}%`,
        window: {
          baseline: `${formatYmdLocal(baselineStart)} ~ ${formatYmdLocal(recentStart)}`,
          recent: `${formatYmdLocal(recentStart)} ~ ${formatYmdLocal(end)}`,
        },
        filters: {
          emotion: best.emotion,
          relation,
        },
        evidence,
      });
    });

    const baselineEntropy = entropy(baselineEmotionRatios);
    const recentEntropy = entropy(recentEmotionRatios);
    if (baselineEntropy > 0 && recentEntropy / baselineEntropy < 0.78) {
      alerts.push({
        id: "diversity_drop",
        type: "DIVERSITY_DROP",
        severity: "low",
        title: `최근 ${recentDays}일 감정 쏠림 증가`,
        detail: `entropy baseline ${baselineEntropy.toFixed(2)} -> recent ${recentEntropy.toFixed(2)}`,
        window: {
          baseline: `${formatYmdLocal(baselineStart)} ~ ${formatYmdLocal(recentStart)}`,
          recent: `${formatYmdLocal(recentStart)} ~ ${formatYmdLocal(end)}`,
        },
        filters: {
          emotion: "ALL",
          relation: "ALL",
        },
        evidence: [],
      });
    }

    if (alerts.length === 0) {
      const fallbackCandidates: Array<{
        emotion: string;
        recentValue: number;
        baselineValue: number;
        delta: number;
      }> = [];
      const emotionSet = new Set<string>([
        ...recentEmotionRatios.keys(),
        ...baselineEmotionRatios.keys(),
      ]);
      emotionSet.forEach((emotion) => {
        const recentValue = recentEmotionRatios.get(emotion) ?? 0;
        const baselineValue = baselineEmotionRatios.get(emotion) ?? 0;
        const delta = recentValue - baselineValue;
        if (recentValue <= 0 && baselineValue <= 0) {
          return;
        }
        fallbackCandidates.push({
          emotion,
          recentValue,
          baselineValue,
          delta,
        });
      });

      fallbackCandidates
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
        .slice(0, 3)
        .forEach((candidate) => {
          const evidence = recent
            .filter(
              (item) => String(item.emotion ?? "UNKNOWN") === candidate.emotion,
            )
            .slice(0, 3)
            .map((item) => ({
              key: item.key,
              ts: String(item.ts ?? ""),
              text: String(item.full_text ?? ""),
            }));

          alerts.push({
            id: `emo_change_${candidate.emotion}`,
            type: "EMOTION_SPIKE",
            severity: "low",
            title: `최근 ${recentDays}일 '${candidate.emotion}' 변화`,
            detail: `baseline ${(candidate.baselineValue * 100).toFixed(0)}% -> recent ${(candidate.recentValue * 100).toFixed(0)}%`,
            window: {
              baseline: `${formatYmdLocal(baselineStart)} ~ ${formatYmdLocal(recentStart)}`,
              recent: `${formatYmdLocal(recentStart)} ~ ${formatYmdLocal(end)}`,
            },
            filters: {
              emotion: candidate.emotion,
              relation: "ALL",
            },
            evidence,
          });
        });
    }

    const severityRank = { high: 3, medium: 2, low: 1 };
    return alerts
      .sort((a, b) => severityRank[b.severity] - severityRank[a.severity])
      .slice(0, 6);
  }, [allMemoryNodesWithTs, baselineDays, recentDays]);

  const filteredHistory = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return historyData.filter((item) => {
      const parsedDate = new Date(item.date);
      const hasValidDate = !Number.isNaN(parsedDate.getTime());

      if (dateFrom && hasValidDate) {
        const from = new Date(`${dateFrom}T00:00:00`);
        if (parsedDate < from) {
          return false;
        }
      }

      if (dateTo && hasValidDate) {
        const to = new Date(`${dateTo}T23:59:59.999`);
        if (parsedDate > to) {
          return false;
        }
      }

      if ((dateFrom || dateTo) && !hasValidDate) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const searchable = [
        item.summary?.context_summary ?? "",
        item.summary?.sentiment ?? "",
        item.full_transcript,
        item.user_id,
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(keyword);
    });
  }, [historyData, query, dateFrom, dateTo]);

  const selectedItem = useMemo(() => {
    if (!selectedId) {
      return null;
    }

    return historyData.find((item) => item.id === selectedId) ?? null;
  }, [historyData, selectedId]);

  const historyIdSet = useMemo(
    () => new Set(historyData.map((item) => item.id)),
    [historyData],
  );

  const selectedGraphHistoryId = useMemo(() => {
    if (!selectedGraphNode || selectedGraphNode.type !== "memory") {
      return null;
    }
    const nodeHistoryId = String(selectedGraphNode.history_id ?? "").trim();
    if (nodeHistoryId && historyIdSet.has(nodeHistoryId)) {
      return nodeHistoryId;
    }
    const memoryId = extractMemoryIdFromKey(selectedGraphNode.key);
    if (historyIdSet.has(memoryId)) {
      return memoryId;
    }
    const normalizedMemoryId = normalizeMemoryId(memoryId);
    return historyIdSet.has(normalizedMemoryId) ? normalizedMemoryId : null;
  }, [historyIdSet, selectedGraphNode]);

  useEffect(() => {
    if (!sigmaGraph) {
      return;
    }
    if (selectedGraphNodeKey && !sigmaGraph.hasNode(selectedGraphNodeKey)) {
      setSelectedGraphNodeKey(null);
    }
    if (hoveredGraphNodeKey && !sigmaGraph.hasNode(hoveredGraphNodeKey)) {
      setHoveredGraphNodeKey(null);
    }
  }, [hoveredGraphNodeKey, selectedGraphNodeKey, sigmaGraph]);

  const resetGraphViewport = () => {
    setGraphResetNonce((prev) => prev + 1);
    setSelectedGraphNodeKey(null);
    setHoveredGraphNodeKey(null);
  };

  const handleGraphSelect = (
    next:
      | (GraphNode & { key: string; nodeType?: string; clusterKey?: string })
      | null,
  ) => {
    if (!next) {
      setSelectedGraphNodeKey(null);
      return;
    }

    if (next.nodeType === "emotion_cluster") {
      const clusterKey = String(next.clusterKey ?? next.label ?? "").trim();
      if (clusterKey) {
        setExpandedClusters((prev) => {
          const nextSet = new Set(prev);
          if (nextSet.has(clusterKey)) nextSet.delete(clusterKey);
          else nextSet.add(clusterKey);
          return nextSet;
        });
      }
      setSelectedGraphNodeKey(next.key);
      setGraphEmotionFilter("ALL");
      return;
    }

    if (next.nodeType === "emotion" && next.label) {
      const clusterKey = resolveClusterKeyFromEmotionLabel(String(next.label));
      if (clusterKey) {
        setExpandedClusters((prev) => {
          const nextSet = new Set(prev);
          nextSet.add(clusterKey);
          return nextSet;
        });
      }
      setGraphEmotionFilter(String(next.label));
    }

    setSelectedGraphNodeKey(next.key);
  };

  if (viewMode === "graph") {
    return (
      <div className="bg-[#F0EEE9] pt-20" style={{ height: "100vh" }}>
        <HistoryGraphMvp
          onOpenHistory={(payload: OpenHistoryPayload) => {
            const openRequest =
              typeof payload === "string" ? { historyId: payload } : (payload ?? {});

            const requestedMemoryKey = String(openRequest.memoryKey ?? "").trim();
            const requestedHistoryId = String(openRequest.historyId ?? "").trim();
            const requestedSnippet = String(openRequest.snippet ?? "").trim();
            const requestedFullText = String(openRequest.fullText ?? "").trim();

            if (
              !requestedMemoryKey &&
              !requestedHistoryId &&
              !requestedSnippet &&
              !requestedFullText
            ) {
              setSelectedId(null);
              setSelectedMemoryKey(null);
              setViewMode("list");
              return;
            }

            let target: HistoryItem | undefined;

            if (requestedMemoryKey) {
              target = historyData.find((item) =>
                Array.isArray(item.memory_keys) &&
                item.memory_keys.includes(requestedMemoryKey),
              );
            }

            if (!target && requestedHistoryId) {
              const normalizedRequestedId = normalizeMemoryId(requestedHistoryId);
              target = historyData.find(
                (item) =>
                  item.id === requestedHistoryId || item.id === normalizedRequestedId,
              );
            }

            if (!target && requestedMemoryKey) {
              const memoryId = extractMemoryIdFromKey(requestedMemoryKey);
              const normalizedMemoryId = normalizeMemoryId(memoryId);
              target = historyData.find(
                (item) => item.id === memoryId || item.id === normalizedMemoryId,
              );
            }

            if (!target) {
              const searchText = requestedSnippet || requestedFullText;
              if (searchText) {
                target = historyData.find((item) => item.full_transcript.includes(searchText));
              }
            }

            if (!target && requestedFullText) {
              const normalizedNeedle = requestedFullText.replace(/\s+/g, " ").trim();
              if (normalizedNeedle) {
                target = historyData.find((item) =>
                  item.full_transcript.replace(/\s+/g, " ").includes(normalizedNeedle),
                );
              }
            }

            if (!target) {
              console.warn("History open failed for payload:", openRequest);
              return;
            }

            setSelectedId(target.id);
            setSelectedMemoryKey(requestedMemoryKey || null);
            setViewMode("list");
          }}
        />
      </div>
    );
  }

  if (selectedItem) {
    const sentiment = getSentimentStyle(selectedItem.summary?.sentiment ?? "");
    const title = buildTitle(selectedItem);
    const summaryText =
      selectedItem.summary?.context_summary?.trim() || "요약 정보가 없습니다.";
    const messages = parseTranscript(selectedItem.full_transcript);
    const selectedMemoryDetail = selectedMemoryKey
      ? selectedItem.memory_details?.find((detail) => detail.key === selectedMemoryKey) ?? null
      : null;

    return (
      <div className="h-full bg-[#F0EEE9] pt-24 pb-8 px-6 overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl space-y-4">
          <button
            type="button"
            onClick={() => {
              setSelectedId(null);
              setSelectedMemoryKey(null);
            }}
            className="inline-flex items-center gap-1 rounded-full bg-white/50 backdrop-blur border border-white/60 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white/80 transition-colors shadow-sm"
          >
            <ChevronLeft size={16} />
            목록으로
          </button>

          <article className="relative overflow-hidden rounded-[28px] border border-white/60 bg-white/70 backdrop-blur-md px-5 py-5 shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
            <div
              className={`absolute inset-x-0 top-0 h-[6px] ${sentiment.accentClass}`}
            />
            <div className="flex items-start justify-between gap-3">
              <h4 className="text-[20px] font-bold text-gray-900 tracking-[-0.01em] leading-tight">
                {title}
              </h4>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm ${sentiment.className}`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${sentiment.dotClass}`}
                />
                {sentiment.label}
              </span>
            </div>

            <div className="mt-5 rounded-2xl bg-white px-4 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] border border-white/60">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-500">
                <MessageSquareText size={16} />
                요약
              </div>
              <p className="mt-2 text-[15px] font-medium text-slate-800 leading-relaxed">
                {summaryText}
              </p>
            </div>

            {selectedMemoryDetail && (
              <div className="mt-4 rounded-2xl bg-[#eef6ff] px-4 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] border border-[#bfdbfe]">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-sky-800">
                  <MessageSquareText size={16} />
                  선택한 노드 대화
                </div>
                {selectedMemoryDetail.user_text && (
                  <p className="mt-2 text-[14px] leading-relaxed text-slate-800">
                    <span className="font-semibold">User:</span> {selectedMemoryDetail.user_text}
                  </p>
                )}
                {selectedMemoryDetail.ai_text && (
                  <p className="mt-1 text-[14px] leading-relaxed text-slate-800">
                    <span className="font-semibold">AI:</span> {selectedMemoryDetail.ai_text}
                  </p>
                )}
              </div>
            )}

            <div className="mt-4 rounded-2xl bg-white px-4 py-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] border border-white/60">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-500 mb-6">
                <ScrollText size={16} />
                대화 전문
              </div>

              {messages.length === 0 ? (
                <p className="text-[14px] text-gray-700 leading-6">
                  대화 전문이 없습니다.
                </p>
              ) : (
                <div className="space-y-5 px-1 pb-2">
                  {messages.map((message, idx) => {
                    const isUser = message.speaker === "user";
                    const isAi = message.speaker === "ai";
                    const isRumiSpeaker = message.speaker === "rumi";
                    const isLamiSpeaker = message.speaker === "lami";
                    const isRumiPersona = persona === "rumi";

                    // 1. User gets the soft gray tone with user tail
                    // 2. AI gets the Persona color with AI tail
                    const bubbleColorClass = isUser
                      ? "bg-[#E5E5EA] text-[#1F2937] imessage-tail-user"
                      : isRumiSpeaker
                        ? "bg-[#FF9A76] text-white imessage-tail-ai"
                        : isLamiSpeaker
                          ? "bg-[#52B2CF] text-white imessage-tail-ai"
                          : isAi
                            ? isRumiPersona
                              ? "bg-[#FF9A76] text-white imessage-tail-ai"
                              : "bg-[#52B2CF] text-white imessage-tail-ai"
                            : "bg-[#D1D5DB] text-[#1F2937] imessage-tail-ai";

                    return (
                      <div
                        key={`${selectedItem.id}-${idx}`}
                        className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}
                      >
                        <div
                          className={`relative max-w-[85%] px-4 py-3 text-[15px] tracking-tight leading-relaxed break-words rounded-2xl shadow-sm ${bubbleColorClass}`}
                        >
                          <p className="whitespace-pre-wrap relative z-10">
                            {message.text}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </article>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#F0EEE9] pt-20">
      <div className="px-3 sm:px-6 py-2">
        <div className="mx-auto w-full max-w-4xl">
          <div className="mb-3 space-y-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode("graph")}
                className="px-3 py-2 bg-white border border-gray-200 shadow-sm rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 whitespace-nowrap"
              >
                감정 그래프
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDateFilterOpen((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border shadow-sm ${dateFrom || dateTo
                      ? "bg-blue-50 border-blue-200 text-blue-700"
                      : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                >
                  <CalendarDays size={16} />
                  기간
                </button>

                {isDateFilterOpen && (
                  <div className="absolute z-20 mt-2 w-[280px] rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
                    <p className="text-xs font-semibold text-gray-500 mb-2">
                      날짜 범위
                    </p>

                    <label className="block text-xs text-gray-500 mb-1">
                      시작일
                    </label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(event) => setDateFrom(event.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-sm outline-none mb-2"
                    />

                    <label className="block text-xs text-gray-500 mb-1">
                      종료일
                    </label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(event) => setDateTo(event.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-sm outline-none"
                    />

                    <div className="mt-3 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setDateFrom("");
                          setDateTo("");
                        }}
                        className="text-xs font-semibold text-gray-500 hover:text-gray-700"
                      >
                        초기화
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsDateFilterOpen(false)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-800"
                      >
                        <X size={14} />
                        닫기
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="relative w-full">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="요약, 감정, 대화 내용 검색"
                className="w-full py-2.5 pl-9 pr-3 bg-white border border-gray-200 shadow-sm rounded-lg outline-none text-sm text-gray-800 placeholder-gray-400 focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-shadow"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-y-auto px-6 pb-8 h-[calc(100%-120px)]">
        <div className="mx-auto w-full max-w-4xl">
          <style>{`@keyframes historyCardIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

          {filteredHistory.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
              검색 결과가 없습니다.
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {filteredHistory.map((item, index) => {
              const sentiment = getSentimentStyle(
                item.summary?.sentiment ?? "",
              );
              const title = buildTitle(item);
              const summaryPreview =
                item.summary?.context_summary?.trim() ||
                "요약 정보가 없습니다.";

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(item.id);
                    setSelectedMemoryKey(null);
                  }}
                  className="group relative overflow-hidden rounded-[24px] border border-white/60 bg-white/70 backdrop-blur-md px-5 py-4 text-left shadow-[0_4px_16px_rgba(0,0,0,0.03)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
                  style={{
                    animation: "historyCardIn 0.2s ease-out both",
                    animationDelay: `${Math.min(index, 6) * 40}ms`,
                  }}
                >
                  <div
                    className={`absolute inset-x-0 top-0 h-1 ${sentiment.accentClass}`}
                  />

                  <div className="flex items-start justify-between gap-3 relative z-10">
                    <h4 className="text-[18px] font-bold text-gray-900 tracking-[-0.01em] leading-tight">
                      {title}
                    </h4>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm bg-white ${sentiment.className}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${sentiment.dotClass}`}
                      />
                      {sentiment.label}
                    </span>
                  </div>

                  <div className="mt-4 rounded-2xl bg-white/80 px-4 py-3.5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] border border-white">
                    <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-500">
                      <MessageSquareText size={14} />
                      요약
                    </div>
                    <p
                      className="mt-2.5 text-[14px] text-gray-700 leading-6"
                      style={clampThreeLines}
                    >
                      {summaryPreview}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;

