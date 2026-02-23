import React, { useEffect, useMemo, useState } from "react";
import Graph from "graphology";
import forceAtlas2 from "graphology-layout-forceatlas2";
import { SigmaContainer, useRegisterEvents, useSigma } from "@react-sigma/core";
import "./react-sigma.css";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";


/**
 * MVP Emotion Graph Viewer (Sigma.js)
 * - loads /graph.json (put it in public/)
 * - filters by emotion / relation
 * - click a memory node to show full text on the right
 */

const EMOTION_COLOR_MAP = {
  "기쁨": "#d8a24a",
  "당황": "#c8afff",
  "분노": "#b74885",
  "불안": "#6a96a8",
  "상처": "#c5a0bf",
  "슬픔": "#5d65bf",
  "중립": "#8f9ab1",
};

const MEMORY_TONE_COLOR_MAP = {
  "기쁨": "#ebc980",
  "당황": "#ddd0ff",
  "분노": "#cf73a7",
  "불안": "#95b6c4",
  "상처": "#ddbed6",
  "슬픔": "#8c92d6",
};

const EMOTION_GROUP_COLOR_MAP = {
  JOY: "#d8a24a",
  SADNESS: "#5d65bf",
  ANXIETY: "#6a96a8",
  ANGER: "#b74885",
  SURPRISE: "#c8afff",
  HURT: "#c5a0bf",
  NEUTRAL: "#8f9ab1",
};

const MEMORY_GROUP_TONE_MAP = {
  JOY: "#ebc980",
  SADNESS: "#8c92d6",
  ANXIETY: "#95b6c4",
  ANGER: "#cf73a7",
  SURPRISE: "#ddd0ff",
  HURT: "#ddbed6",
  NEUTRAL: "#b7c0d3",
};

const REPORT_TEMP_COLORS = {
  warm: "#FFCC99",
  warmText: "#9a3412",
  cold: "#67E8F9",
  coldText: "#0e7490",
  neutral: "#64748b",
};

const EMOTION_CLUSTER_DEFS = [
  { key: "JOY", ids: ["E01", "E02", "E03", "E04", "E05", "E06"], color: "#d8a24a" },
  { key: "HURT", ids: ["E07", "E08", "E09", "E10", "E30", "E31"], color: "#c5a0bf" },
  { key: "SADNESS", ids: ["E11", "E12", "E13", "E14", "E15", "E16"], color: "#5d65bf" },
  { key: "ANGER", ids: ["E17", "E18", "E19", "E20", "E21"], color: "#b74885" },
  { key: "ANXIETY_FEAR", ids: ["E22", "E23", "E24", "E25"], color: "#6a96a8" },
  { key: "SURPRISE_CONFUSION", ids: ["E26", "E27", "E28", "E29"], color: "#c8afff" },
  { key: "NEUTRAL", ids: ["E32"], color: "#8f9ab1" },
];

const EMOTION_CLUSTER_LABEL_KO = {
  JOY: "기쁨",
  SADNESS: "슬픔",
  ANXIETY_FEAR: "불안",
  ANGER: "분노",
  SURPRISE_CONFUSION: "당황",
  HURT: "상처",
  NEUTRAL: "중립",
};

const EMOTION_ID_TO_CLUSTER = new Map(
  EMOTION_CLUSTER_DEFS.flatMap((cluster) =>
    cluster.ids.map((id) => [id, cluster.key])
  )
);

function hashToColor(seed) {
  const s = String(seed ?? "");
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue} 70% 52%)`;
}

function inferEmotionFamily(label, group = "") {
  const normalized = String(label ?? "").replace(/\s*\(E\d+_[A-Z_]+\)\s*$/, "").trim();
  const upperGroup = String(group ?? "").toUpperCase();
  const idUpper = (String(label ?? "").match(/\(E\d+_([A-Z_]+)\)/)?.[1] ?? "").toUpperCase();

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
  if (token.includes("JOY") || token.includes("GRATITUDE") || token.includes("PRIDE") || token.includes("SATISFACTION")) return "JOY";
  if (token.includes("SAD") || token.includes("REGRET") || token.includes("DISAPPOINT")) return "SADNESS";
  if (token.includes("ANXI") || token.includes("TENSION") || token.includes("WORRY") || token.includes("FEAR") || token.includes("NERVOUS")) return "ANXIETY";
  if (token.includes("ANGER") || token.includes("IRRIT") || token.includes("FRUSTRAT") || token.includes("RAGE")) return "ANGER";
  if (token.includes("SURPRISE") || token.includes("EMBARRASS")) return "SURPRISE";
  if (token.includes("HURT") || token.includes("SHAME") || token.includes("GUILT") || token.includes("PAIN")) return "HURT";
  if (token.includes("NEUTRAL")) return "NEUTRAL";
  return "";
}

function emotionIdFromLabel(label) {
  return String(label ?? "").match(/\((E\d+)_/)?.[1] ?? "";
}

function emotionLabelOnly(label) {
  return String(label ?? "").replace(/\s*\(E\d+_[^)]+\)\s*$/, "").trim();
}

function resolveClusterKeyFromEmotionLabel(label) {
  const emotionId = emotionIdFromLabel(label);
  return EMOTION_ID_TO_CLUSTER.get(emotionId) ?? "";
}

function emotionClusterLabelKo(clusterKey) {
  return EMOTION_CLUSTER_LABEL_KO[String(clusterKey)] ?? String(clusterKey ?? "");
}

function getEmotionColor(label, group = "") {
  const family = inferEmotionFamily(label, group);
  if (family && EMOTION_GROUP_COLOR_MAP[family]) return EMOTION_GROUP_COLOR_MAP[family];
  const normalized = String(label ?? "").replace(/\s*\(E\d+_[A-Z_]+\)\s*$/, "").trim();
  return EMOTION_COLOR_MAP[normalized] ?? hashToColor(label);
}

function getMemoryToneColor(emotion, group = "") {
  const family = inferEmotionFamily(emotion, group);
  if (family && MEMORY_GROUP_TONE_MAP[family]) return MEMORY_GROUP_TONE_MAP[family];
  const normalized = String(emotion ?? "").replace(/\s*\(E\d+_[A-Z_]+\)\s*$/, "").trim();
  return MEMORY_TONE_COLOR_MAP[normalized] ?? "#cbd5e1";
}

function colorWithAlpha(color, alpha) {
  if (!color) return `rgba(239, 68, 68, ${alpha})`;
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
    const n = Number.parseInt(full, 16);
    if (Number.isFinite(n)) {
      const r = (n >> 16) & 255;
      const g = (n >> 8) & 255;
      const b = n & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }
  if (color.startsWith("rgb(")) {
    const v = color.slice(4, -1);
    return `rgba(${v}, ${alpha})`;
  }
  if (color.startsWith("rgba(")) {
    const parts = color.slice(5, -1).split(",").slice(0, 3).join(",");
    return `rgba(${parts}, ${alpha})`;
  }
  return color;
}

function reportTemperaturePalette(deltaPp) {
  if (deltaPp > 0.01) {
    return {
      tone: "warm",
      color: REPORT_TEMP_COLORS.warm,
      textColor: REPORT_TEMP_COLORS.warmText,
      bg: "rgba(255, 204, 153, 0.30)",
      border: "rgba(251, 146, 60, 0.55)",
    };
  }
  if (deltaPp < -0.01) {
    return {
      tone: "cold",
      color: REPORT_TEMP_COLORS.cold,
      textColor: REPORT_TEMP_COLORS.coldText,
      bg: "rgba(103, 232, 249, 0.26)",
      border: "rgba(34, 211, 238, 0.55)",
    };
  }
  return {
    tone: "neutral",
    color: REPORT_TEMP_COLORS.neutral,
    textColor: REPORT_TEMP_COLORS.neutral,
    bg: "rgba(148, 163, 184, 0.2)",
    border: "rgba(148, 163, 184, 0.45)",
  };
}

function buildSmoothWavePath(values, width = 190, height = 34, padX = 8, padY = 6) {
  const arr = Array.isArray(values) && values.length > 1 ? values : [0, 0.5, 1];
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  const span = Math.max(max - min, 0.0001);
  const innerW = Math.max(width - padX * 2, 1);
  const innerH = Math.max(height - padY * 2, 1);
  const step = innerW / (arr.length - 1);

  const points = arr.map((v, i) => ({
    x: padX + step * i,
    y: padY + innerH - ((v - min) / span) * innerH,
  }));

  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const cur = points[i];
    const dx = cur.x - prev.x;
    const c1x = prev.x + dx * 0.35;
    const c1y = prev.y;
    const c2x = prev.x + dx * 0.65;
    const c2y = cur.y;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${cur.x.toFixed(2)} ${cur.y.toFixed(2)}`;
  }
  return { path: d, points };
}

function EmotionDeltaWave({ emotion, baselineRatio = 0, recentRatio = 0, deltaPp = 0 }) {
  const base = Number.isFinite(Number(baselineRatio)) ? Number(baselineRatio) : 0;
  const recent = Number.isFinite(Number(recentRatio)) ? Number(recentRatio) : 0;
  const trend = recent - base;
  const swing = clamp(trend * 0.46, -0.18, 0.18);
  const bendA = clamp(base + swing + (deltaPp >= 0 ? 0.012 : -0.012), 0, 1);
  const bendB = clamp((base + recent) * 0.5 - swing * 0.55, 0, 1);
  const values = [base, bendA, bendB, recent];
  const { path, points } = buildSmoothWavePath(values, 190, 34, 8, 6);
  const tone = reportTemperaturePalette(deltaPp);
  const endColor = tone.tone === "warm" ? REPORT_TEMP_COLORS.warm : REPORT_TEMP_COLORS.cold;
  const gradientId = `wave_grad_${String(emotion ?? "emo").replace(/[^a-zA-Z0-9_-]/g, "_")}`;

  return (
    <svg viewBox="0 0 190 34" width="100%" height="30" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={REPORT_TEMP_COLORS.cold} />
          <stop offset="55%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor={endColor} />
        </linearGradient>
      </defs>
      <line x1="8" y1="17" x2="182" y2="17" stroke="rgba(148, 163, 184, 0.35)" strokeDasharray="3 4" />
      <path d={path} fill="none" stroke={`url(#${gradientId})`} strokeOpacity="0.24" strokeWidth="6.6" strokeLinecap="round" />
      <path d={path} fill="none" stroke={`url(#${gradientId})`} strokeWidth="3.2" strokeLinecap="round" />
      <circle cx={points[0]?.x ?? 8} cy={points[0]?.y ?? 17} r="2.8" fill={REPORT_TEMP_COLORS.cold} />
      <circle cx={points[points.length - 1]?.x ?? 182} cy={points[points.length - 1]?.y ?? 17} r="3.4" fill={endColor} />
    </svg>
  );
}

function drawReadableNodeLabel(context, data, settings) {
  if (!data.label) return;

  const isDarkMode = settings.isDarkMode ?? true;
  const size = settings.labelSize;
  const font = settings.labelFont;
  const weight = settings.labelWeight;
  const label = emotionLabelOnly(data.label);
  const x = data.x + data.size + 6;
  const y = data.y + size / 3;
  const paddingX = 4;
  const paddingY = 2;

  context.font = `${weight} ${size}px ${font}`;
  const textWidth = context.measureText(label).width;

  context.fillStyle = isDarkMode ? "rgba(2, 6, 23, 0.58)" : "rgba(255, 255, 255, 0.9)";
  context.fillRect(
    x - paddingX,
    y - size + 1 - paddingY,
    textWidth + paddingX * 2,
    size + paddingY * 2,
  );

  context.strokeStyle = isDarkMode ? "rgba(15, 23, 42, 0.95)" : "rgba(148, 163, 184, 0.8)";
  context.lineWidth = 1;
  context.strokeText(label, x, y);

  context.fillStyle = isDarkMode ? "rgba(241, 245, 249, 0.98)" : "rgba(15, 23, 42, 0.96)";
  context.fillText(label, x, y);
}

function SelectionReducers({
  selectedId,
  secondarySelectedId = null,
  showEdgesOnHover = false,
  isDarkMode = true,
}) {
  const sigma = useSigma();
  const registerEvents = useRegisterEvents();
  const [hovered, setHovered] = useState(null);

  // 선택/호버 기준 노드-엣지 이웃 집합 계산
  const computeNeighborhood = (baseIds) => {
    if (!baseIds || baseIds.length === 0) return { nodes: new Set(), edges: new Set() };

    const g = sigma.getGraph();
    const nodes = new Set();
    const edges = new Set();

    for (const baseId of baseIds) {
      if (!baseId || !g.hasNode(baseId)) continue;
      nodes.add(baseId);
      // 1-hop
      g.forEachEdge(baseId, (edge, attrs, source, target) => {
        edges.add(edge);
        nodes.add(source);
        nodes.add(target);
      });
    }

    return { nodes, edges };
  };

  const primaryActiveId = showEdgesOnHover && hovered ? hovered : selectedId;
  const focusIds = useMemo(
    () => [primaryActiveId, secondarySelectedId].filter(Boolean),
    [primaryActiveId, secondarySelectedId]
  );
  const hasFocus = focusIds.length > 0;
  const neighborhood = computeNeighborhood(focusIds);

  // hover events
  useEffect(() => {
    registerEvents({
      enterNode: (e) => setHovered(e.node),
      leaveNode: () => setHovered(null),
    });
  }, [registerEvents]);

  // reducers setup
  useEffect(() => {
    // nodeReducer: emphasize selected node and its neighborhood
    sigma.setSetting("nodeReducer", (node, data) => {
      const res = { ...data };
      // prevent renderer program type conflicts
      delete res.type;
      const isMemory = data.nodeType === "memory";
      const isHoveredNode = node === hovered;

      // when there is no active focus, render nodes in their default style
      if (!hasFocus) {
        res.highlighted = false;
        res.color = data.baseColor ?? data.color;
        // Hide memory labels by default; only show when hovered/selected.
        if (isMemory) res.label = isHoveredNode ? data.label : "";
        res.labelColor = isDarkMode ? "rgba(241, 245, 249, 0.98)" : "rgba(15, 23, 42, 0.96)";
        return res;
      }

      const isSelected = focusIds.includes(node);
      const inN = neighborhood.nodes.has(node);

      if (isSelected) {
        res.highlighted = true;
        res.size = (data.size ?? 5) * 1.18;
        res.color = isDarkMode ? "rgba(248, 250, 252, 1)" : "rgba(15, 23, 42, 0.92)";
        res.label = data.label;
        res.labelColor = isDarkMode ? "rgba(248, 250, 252, 1)" : "rgba(15, 23, 42, 0.98)";
        res.zIndex = 2;
        return res;
      }

      if (inN) {
        res.highlighted = false;
        res.size = (data.size ?? 5) * 1.05;
        res.color = data.baseColor ?? "rgba(71, 85, 105, 0.92)";
        res.label = isMemory && !isHoveredNode ? "" : data.label;
        res.labelColor = isDarkMode ? "rgba(241, 245, 249, 0.98)" : "rgba(15, 23, 42, 0.96)";
        res.zIndex = 1;
        return res;
      }

      res.highlighted = false;
      res.color = "rgba(71, 85, 105, 0.45)";
      res.label = "";
      return res;
    });

    // edgeReducer: hide edges by default, show only thin neighborhood links on focus
    sigma.setSetting("edgeReducer", (edge, data) => {
      const res = { ...data };
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
      // cleanup reducers
      sigma.setSetting("nodeReducer", null);
      sigma.setSetting("edgeReducer", null);
    };
  }, [sigma, hasFocus, neighborhood, isDarkMode, hovered, focusIds]);

  return null;
}

function EmotionCategoryGlow({ metricMode = "count", isDarkMode = false }) {
  const sigma = useSigma();
  const TARGETED_EMOTION_IDS = useMemo(() => new Set(["E07", "E08", "E09", "E10", "E30", "E31"]), []);

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

      // Hero glow for top-level emotion clusters.
      g.forEachNode((node, attrs) => {
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

      const entries = [];
      let maxValue = 0;
      g.forEachNode((node, attrs) => {
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
        // Build glow by emotion family so 32-label datasets still keep a cinematic cluster haze.
        const familyBuckets = new Map();
        for (const { node, value, color, family, emotionId } of entries) {
          const display = sigma.getNodeDisplayData(node);
          if (!display || display.hidden) continue;
          const center = sigma.framedGraphToViewport({ x: display.x, y: display.y });
          if (TARGETED_EMOTION_IDS.has(emotionId)) continue;
          const key = family || node;
          const bucket = familyBuckets.get(key) ?? {
            value: 0,
            color,
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
          const maxFamilyValue = Math.max(...[...familyBuckets.values()].map((b) => b.value));
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
            gradient.addColorStop(0.55, colorWithAlpha(color, (coreAlpha * 0.42).toFixed(3)));
            gradient.addColorStop(1, colorWithAlpha(color, 0));
            overlayCtx.fillStyle = gradient;
            overlayCtx.beginPath();
            overlayCtx.arc(center.x, center.y, radius, 0, Math.PI * 2);
            overlayCtx.fill();

            const mistRadius = Math.min(radius * 1.26, viewportBase * (familyCount >= 9 ? 0.16 : 0.22));
            const mist = overlayCtx.createRadialGradient(
              center.x,
              center.y,
              radius * 0.46,
              center.x,
              center.y,
              mistRadius,
            );
            mist.addColorStop(0, colorWithAlpha(color, mistAlpha.toFixed(3)));
            mist.addColorStop(0.65, colorWithAlpha(color, (mistAlpha * 0.42).toFixed(3)));
            mist.addColorStop(1, colorWithAlpha(color, 0));
            overlayCtx.fillStyle = mist;
            overlayCtx.beginPath();
            overlayCtx.arc(center.x, center.y, mistRadius, 0, Math.PI * 2);
            overlayCtx.fill();
          }
        }

        // Per-emotion micro glow to keep detail around each label.
        for (const { node, value, color, emotionId } of entries) {
          const display = sigma.getNodeDisplayData(node);
          if (!display || display.hidden) continue;
          const center = sigma.framedGraphToViewport({ x: display.x, y: display.y });
          const ratio = value / maxValue;
          const isTargeted = TARGETED_EMOTION_IDS.has(emotionId);
          const radius = isTargeted
            ? clamp((display.size ?? 8) * 0.84 + Math.pow(ratio, 0.9) * 3.2, 3.2, viewportBase * 0.011)
            : clamp((display.size ?? 8) * 1.2 + Math.pow(ratio, 0.85) * 12, 6, viewportBase * 0.03);
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
          gradient.addColorStop(0.42, colorWithAlpha(color, (coreAlpha * 0.64).toFixed(3)));
          gradient.addColorStop(0.74, colorWithAlpha(color, (coreAlpha * 0.24).toFixed(3)));
          gradient.addColorStop(1, colorWithAlpha(color, 0));

          overlayCtx.fillStyle = gradient;
          overlayCtx.beginPath();
          overlayCtx.arc(center.x, center.y, radius, 0, Math.PI * 2);
          overlayCtx.fill();

          // Outer mist layer: keep tone consistent, only expand halo area with volume.
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
          mist.addColorStop(0.65, colorWithAlpha(color, (mistAlpha * 0.32).toFixed(3)));
          mist.addColorStop(1, colorWithAlpha(color, 0));
          overlayCtx.fillStyle = mist;
          overlayCtx.beginPath();
          overlayCtx.arc(center.x, center.y, mistRadius, 0, Math.PI * 2);
          overlayCtx.fill();
        }
      }

      // Planet style: draw a translucent ring around memory nodes only when zoomed in.
      const cameraRatio = sigma.getCamera().getState().ratio;
      const isZoomedIn = cameraRatio <= 0.85;
      if (!isZoomedIn) return;

      const ringBoost = Math.min(1.8, 0.85 / Math.max(0.2, cameraRatio));
      g.forEachNode((node, attrs) => {
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
        overlayCtx.strokeStyle = colorWithAlpha(baseColor, Math.min(0.6, 0.42 * alphaBoost));
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
}

// --- Change Detection (time-based MVP) ---

function parseTs(ts) {
  // graph_with_ts.json: "YYYY-MM-DD HH:MM:SS"
  // 브라우저 Date 파싱 안정성을 위해 ISO 형태로 변환
  if (!ts) return null;
  const s = String(ts).trim();
  // "2022-08-16 13:17:46" -> "2022-08-16T13:17:46"
  const isoLike = s.replace(" ", "T");
  const d = new Date(isoLike);
  return Number.isNaN(d.getTime()) ? null : d;
}

function extractMemoryIdFromKey(key) {
  const raw = String(key ?? "");
  return raw.startsWith("mem:") ? raw.slice(4) : raw;
}

function normalizeMemoryId(id) {
  return String(id ?? "").replace(/_\d+$/, "");
}

function pickWindowsByTime(memories, recentDays = 7, baselineDays = 28) {
  const parsed = memories
    .map((m) => {
      const t = parseTs(m.ts);
      return t ? { ...m, _t: t } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a._t - b._t);

  if (parsed.length === 0) {
    return { recent: [], baseline: [], recentN: 0, baseN: 0 };
  }

  const end = parsed[parsed.length - 1]._t;
  const recentStart = new Date(end.getTime() - recentDays * 24 * 3600 * 1000);
  const baseStart = new Date(end.getTime() - (recentDays + baselineDays) * 24 * 3600 * 1000);

  const recent = parsed.filter((m) => m._t >= recentStart && m._t <= end);
  const baseline = parsed.filter((m) => m._t >= baseStart && m._t < recentStart);

  return { recent, baseline, recentN: recent.length, baseN: baseline.length, end, recentStart, baseStart };
}

function countBy(arr, keyFn) {
  const m = new Map();
  for (const x of arr) {
    const k = keyFn(x) ?? "UNKNOWN";
    m.set(k, (m.get(k) || 0) + 1);
  }
  return m;
}

function ratio(map, denom) {
  const r = new Map();
  for (const [k, v] of map.entries()) r.set(k, v / Math.max(1, denom));
  return r;
}

function topExamples(arr, predicate, k = 3) {
  const out = [];
  for (const x of arr) {
    if (predicate(x)) out.push(x);
    if (out.length >= k) break;
  }
  return out;
}

function formatYmdLocal(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function computeChangeAlertsFromGraphData(data, opts = { recentDays: 7, baselineDays: 28 }) {
  if (!data) return [];

  const memories = data.nodes.filter((n) => n.type === "memory");
  const { recent, baseline, recentN, baseN, end, recentStart, baseStart } = pickWindowsByTime(
    memories,
    opts.recentDays,
    opts.baselineDays
  );

  // 표본 부족이면 알림 생성 중단
  if (recentN < 10 || baseN < 20) return [];

  const recentEmotion = countBy(recent, (m) => m.emotion);
  const baseEmotion = countBy(baseline, (m) => m.emotion);

  const recentRelation = countBy(recent, (m) => m.relation);
  const baseRelation = countBy(baseline, (m) => m.relation);

  const rE = ratio(recentEmotion, recentN);
  const bE = ratio(baseEmotion, baseN);

  const alerts = [];

  // 1) Emotion spike (Top 3)
  const emoCandidates = [];
  for (const [emo, r] of rE.entries()) {
    const b = bE.get(emo) || 0;
    const absDelta = r - b;
    const mult = b > 0 ? r / b : (r >= 0.15 ? 999 : 0);

    // 조건: 최근 비중이 높고(>=18%), 증가폭이 충분할 때
    if (r >= 0.18 && (mult >= 1.6 || absDelta >= 0.12)) {
      emoCandidates.push({ emo, r, b, absDelta, mult });
    }
  }
  emoCandidates.sort((a, b) => b.absDelta - a.absDelta);

  for (const c of emoCandidates.slice(0, 3)) {
    const examples = topExamples(recent, (m) => m.emotion === c.emo, 3);
    const emotionName = emotionLabelOnly(c.emo);
    alerts.push({
      id: `emo_spike_${c.emo}`,
      type: "EMOTION_SPIKE",
      severity: c.absDelta >= 0.2 ? "high" : "medium",
      title: c.absDelta >= 0.2 ? `${emotionName} 급증 경보` : `${emotionName} 상승`,
      detail: `baseline ${(c.b * 100).toFixed(0)}% ??recent ${(c.r * 100).toFixed(0)}%`,
      metric: {
        kind: "percent",
        baseline: c.b,
        recent: c.r,
        delta: c.r - c.b,
      },
      window: {
        baseline: `${formatYmdLocal(baseStart)} ~ ${formatYmdLocal(recentStart)}`,
        recent: `${formatYmdLocal(recentStart)} ~ ${formatYmdLocal(end)}`
      },
      filters: { emotion: c.emo, relation: "ALL" },
      evidence: examples.map((m) => ({ key: m.key, ts: m.ts, text: m.full_text })),
    });
  }

  // 2) Relation bias: within relation, a specific emotion spikes
  const rels = Array.from(new Set([...recentRelation.keys(), ...baseRelation.keys()]));
  for (const rel of rels) {
    const recentRel = recent.filter((m) => m.relation === rel);
    const baseRel = baseline.filter((m) => m.relation === rel);
    if (recentRel.length < 8 || baseRel.length < 8) continue;

    const rr = ratio(countBy(recentRel, (m) => m.emotion), recentRel.length);
    const bb = ratio(countBy(baseRel, (m) => m.emotion), baseRel.length);

    let best = null;
    for (const [emo, p] of rr.entries()) {
      const b = bb.get(emo) || 0;
      const d = p - b;
      if (!best || d > best.d) best = { emo, p, b, d };
    }
    if (!best) continue;

    if (best.p >= 0.35 && best.d >= 0.18) {
      const examples = topExamples(recentRel, (m) => m.emotion === best.emo, 3);
      const emotionName = emotionLabelOnly(best.emo);
      alerts.push({
        id: `rel_bias_${rel}_${best.emo}`,
        type: "RELATION_BIAS",
        severity: best.d >= 0.25 ? "high" : "medium",
        title: best.d >= 0.25 ? `${rel}: ${emotionName} 편향 경보` : `${rel}: ${emotionName} 편향`,
        detail: `within ${rel}: baseline ${(best.b * 100).toFixed(0)}% ??recent ${(best.p * 100).toFixed(0)}%`,
        metric: {
          kind: "percent",
          baseline: best.b,
          recent: best.p,
          delta: best.p - best.b,
        },
        window: {
          baseline: `${formatYmdLocal(baseStart)} ~ ${formatYmdLocal(recentStart)}`,
          recent: `${formatYmdLocal(recentStart)} ~ ${formatYmdLocal(end)}`
        },
        filters: { emotion: best.emo, relation: rel },
        evidence: examples.map((m) => ({ key: m.key, ts: m.ts, text: m.full_text })),
      });
    }
  }

  // 3) Diversity drop (entropy 감소)
  const entropy = (ratioMap) => {
    let h = 0;
    for (const p of ratioMap.values()) {
      if (p > 1e-9) h -= p * Math.log(p);
    }
    return h;
  };

  const hRecent = entropy(rE);
  const hBase = entropy(bE);
  if (hBase > 0 && hRecent / hBase < 0.78) {
    alerts.push({
      id: `diversity_drop`,
      type: "DIVERSITY_DROP",
      severity: "low",
      title: "감정 흐름 단순화",
      detail: `entropy baseline ${hBase.toFixed(2)} ??recent ${hRecent.toFixed(2)}`,
      metric: {
        kind: "score",
        baseline: hBase,
        recent: hRecent,
        delta: hRecent - hBase,
      },
      window: {
        baseline: `${formatYmdLocal(baseStart)} ~ ${formatYmdLocal(recentStart)}`,
        recent: `${formatYmdLocal(recentStart)} ~ ${formatYmdLocal(end)}`
      },
      filters: { emotion: "ALL", relation: "ALL" },
      evidence: [],
    });
  }

  const sevRank = { high: 3, medium: 2, low: 1 };
  alerts.sort((a, b) => sevRank[b.severity] - sevRank[a.severity]);
  return alerts.slice(0, 6);
}

function formatAlertDeltaText(metric) {
  if (!metric) return "-";
  const recent = Number(metric.recent) || 0;
  const baseline = Number(metric.baseline) || 0;
  const delta = recent - baseline;
  if (metric.kind === "percent") return `${delta >= 0 ? "+" : ""}${(delta * 100).toFixed(0)}%`;
  return `${delta >= 0 ? "+" : ""}${delta.toFixed(2)}`;
}

function getAlertEmoji(alert) {
  const emotion = emotionLabelOnly(alert?.filters?.emotion ?? "");
  const family = inferEmotionFamily(emotion);
  if (family === "JOY") return "😊";
  if (family === "SADNESS") return "😢";
  if (family === "ANXIETY") return "😰";
  if (family === "ANGER") return "😠";
  if (family === "SURPRISE") return "😮";
  if (family === "HURT") return "💔";
  if (family === "NEUTRAL") return "🙂";
  return "📊";
}

function emotionEmojiFromLabel(label) {
  const family = inferEmotionFamily(label);
  if (family === "JOY") return "😊";
  if (family === "SADNESS") return "😢";
  if (family === "ANXIETY") return "😰";
  if (family === "ANGER") return "😠";
  if (family === "SURPRISE") return "😮";
  if (family === "HURT") return "💔";
  if (family === "NEUTRAL") return "🙂";
  return "✨";
}

function relationEmoji(label) {
  const t = String(label ?? "");
  if (t.includes("친구")) return "👫";
  if (t.includes("직장") || t.includes("동료")) return "💼";
  if (t.includes("지인")) return "🤝";
  if (t.includes("가족")) return "🏠";
  return "🔗";
}

function buildTopNarrativeSummary(alerts, recentDays) {
  const list = Array.isArray(alerts) ? alerts : [];
  if (list.length === 0) {
    return {
      emoji: "✨",
      message: `최근 ${recentDays}일 동안 감정 변화 신호가 충분하지 않습니다.`,
    };
  }

  const relBias = list
    .filter((a) => a.type === "RELATION_BIAS" && (a.metric?.delta ?? 0) > 0)
    .sort((a, b) => (b.metric?.delta ?? 0) - (a.metric?.delta ?? 0));
  if (relBias.length > 0) {
    const topEmotion = emotionLabelOnly(relBias[0]?.filters?.emotion ?? "");
    const relations = relBias
      .slice(0, 2)
      .map((a) => String(a?.filters?.relation ?? "").trim())
      .filter(Boolean);
    const relText = relations.length > 1
      ? (() => {
        const left = String(relations[0] ?? "");
        const right = String(relations[1] ?? "");
        const lastCode = left.charCodeAt(left.length - 1);
        const hasBatchim = Number.isFinite(lastCode) && (lastCode - 0xac00) % 28 !== 0;
        const joiner = hasBatchim ? "과" : "와";
        return `${left}${joiner} ${right}`;
      })()
      : relations[0];
    if (relText && topEmotion) {
      const emoji = emotionEmojiFromLabel(topEmotion);
      return {
        emoji,
        message: `이번 주 ${relText} 관계에서 ${topEmotion}(${emoji}) 반응이 두드러졌어요.`,
      };
    }
  }

  const emoSpike = list
    .filter((a) => a.type === "EMOTION_SPIKE" && (a.metric?.delta ?? 0) > 0)
    .sort((a, b) => (b.metric?.delta ?? 0) - (a.metric?.delta ?? 0))[0];
  if (emoSpike) {
    const emotion = emotionLabelOnly(emoSpike?.filters?.emotion ?? "");
    const emoji = emotionEmojiFromLabel(emotion);
    return {
      emoji,
      message: `이번 주 ${emotion}(${emoji}) 감정 비중이 크게 높아졌어요.`,
    };
  }

  return {
    emoji: "✨",
    message: `최근 ${recentDays}일 데이터 기준으로 감정 분포가 변하고 있어요.`,
  };
}


function buildGraphology(data, filters, layoutMode = "galaxy", options = {}) {
  const g = new Graph({ type: "undirected" });

  const allowEmotion = filters.emotion === "ALL";
  const allowRelation = filters.relation === "ALL";
  const hierarchyEnabled = layoutMode === "galaxy" || layoutMode === "radical";
  const expandedClusters = options.expandedClusters ?? new Set();

  const nodeByKey = new Map(data.nodes.map((n) => [n.key, n]));
  const emotionNodesFromData = data.nodes.filter((n) => n.type === "emotion");
  const emotionClusterByLabel = new Map(
    emotionNodesFromData.map((n) => [n.label, resolveClusterKeyFromEmotionLabel(n.label)])
  );
  const selectedClusterKey = allowEmotion
    ? ""
    : (emotionClusterByLabel.get(filters.emotion) ?? resolveClusterKeyFromEmotionLabel(filters.emotion));
  const clusterCounts = new Map();
  for (const label of emotionClusterByLabel.values()) {
    if (!label) continue;
    clusterCounts.set(label, (clusterCounts.get(label) ?? 0) + 1);
  }

  const seedCoord = (key, axis) => {
    const s = String(key ?? "");
    let h = 2166136261;
    for (let i = 0; i < s.length; i += 1) {
      h ^= s.charCodeAt(i) + axis * 17;
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    return ((h >>> 0) % 1000) / 1000 - 0.5;
  };

  // decide which memory nodes are visible based on filters
  const memVisible = new Set();
  const relationVisibleEmotionCounts = new Map();
  for (const n of data.nodes) {
    if (n.type !== "memory") continue;
    const okR = allowRelation || n.relation === filters.relation;
    if (okR && n.emotion) {
      relationVisibleEmotionCounts.set(
        n.emotion,
        (relationVisibleEmotionCounts.get(n.emotion) ?? 0) + 1
      );
    }
    let okE = allowEmotion || n.emotion === filters.emotion;
    if (hierarchyEnabled && allowEmotion) okE = false; // show memory only after picking a sub-emotion
    if (okE && okR) memVisible.add(n.key);
  }

  const emotionMetrics = new Map();
  let hasEmotionScore = false;
  const memoryIntensity = new Map();
  const memoryIntensityValues = [];
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

    // Memory node size variety:
    // 1) prefer absolute emotion score
    // 2) fallback to text length intensity
    const scoreIntensity = Number.isFinite(rawScore) ? Math.abs(rawScore) : NaN;
    const textLen = String(mem.full_text ?? mem.label ?? "").trim().length;
    const textIntensity = Math.log1p(textLen);
    const intensity = scoreIntensity > 0 ? scoreIntensity : textIntensity;
    memoryIntensity.set(key, intensity);
    memoryIntensityValues.push(intensity);

    emotionMetrics.set(mem.emotion, metric);
  }

  const minIntensity = memoryIntensityValues.length ? Math.min(...memoryIntensityValues) : 0;
  const maxIntensity = memoryIntensityValues.length ? Math.max(...memoryIntensityValues) : 1;

  const resolveMemoryNodeSize = (key, fallbackSize = 5) => {
    const intensity = memoryIntensity.get(key);
    if (!Number.isFinite(intensity)) return fallbackSize;

    const normalized = maxIntensity === minIntensity
      ? 0.5
      : (intensity - minIntensity) / (maxIntensity - minIntensity);
    const eased = Math.pow(Math.max(0, Math.min(1, normalized)), 0.78);
    return 3 + eased * 5;
  };

  const resolveEmotionNodeSize = (label, fallbackSize = 8) => {
    void label;
    return Math.min(7.8, fallbackSize || 7.8);
  };

  if (hierarchyEnabled) {
    for (const cluster of EMOTION_CLUSTER_DEFS) {
      if (!clusterCounts.has(cluster.key)) continue;
      if (!allowEmotion && selectedClusterKey && cluster.key !== selectedClusterKey) continue;
      const clusterNodeKey = `cluster:${cluster.key}`;
      g.addNode(clusterNodeKey, {
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

  // Add nodes:
  for (const n of data.nodes) {
    // Keep emotion/relation nodes only if they connect to at least one visible memory
    if (n.type === "emotion") {
      const clusterKey = emotionClusterByLabel.get(n.label) ?? "";
      if (hierarchyEnabled) {
        if (allowEmotion) {
          if (!clusterKey || !expandedClusters.has(clusterKey)) continue;
          if (!allowRelation && (relationVisibleEmotionCounts.get(n.label) ?? 0) === 0) continue;
        } else if (n.label !== filters.emotion) {
          continue;
        }
      } else {
        const hasAny = [...memVisible].some((m) => (nodeByKey.get(m)?.emotion === n.label));
        if (!hasAny) continue;
      }
    }
    if (n.type === "relation") {
      if (layoutMode === "radical") continue;
      const hasAny = [...memVisible].some((m) => (nodeByKey.get(m)?.relation === n.label));
      if (!hasAny) continue;
    }
    if (n.type === "memory" && !memVisible.has(n.key)) continue;

    const x = Number.isFinite(n.x) ? Number(n.x) : seedCoord(n.key, 1);
    const y = Number.isFinite(n.y) ? Number(n.y) : seedCoord(n.key, 2);

    const baseColor =
      n.type === "emotion"
        ? getEmotionColor(n.label, n.group)
        : n.type === "relation"
          ? "#6b7280"
          : getMemoryToneColor(n.emotion);
    g.addNode(n.key, {
      label: n.label,
      size:
        n.type === "memory"
          ? resolveMemoryNodeSize(n.key, n.size ?? 5)
          : n.type === "emotion"
            ? resolveEmotionNodeSize(n.label, n.size ?? 8)
            : (n.size ?? 5),
      x,
      y,
      color: baseColor,
      baseColor,
      nodeType: n.type,
      radialMetricCount: n.type === "emotion" ? (emotionMetrics.get(n.label)?.count ?? 0) : 0,
      radialMetricScore: n.type === "emotion" ? (emotionMetrics.get(n.label)?.score ?? 0) : 0,
      group: n.group,
      emotionFamily: n.type === "emotion" ? inferEmotionFamily(n.label, n.group) : inferEmotionFamily(n.emotion),
      clusterKey: n.type === "emotion" ? (emotionClusterByLabel.get(n.label) ?? "") : "",
      emotion: n.emotion,
      relation: n.relation,
      full_text: n.full_text,
      ts: n.ts,
    });
  }


  // Add edges (only if both ends exist)
  for (const e of data.edges) {
    if (!g.hasNode(e.source) || !g.hasNode(e.target)) continue;
    if (e.type === "similar" && !(memVisible.has(e.source) && memVisible.has(e.target))) continue;
    g.addEdge(e.source, e.target, { weight: e.weight ?? 1, edgeType: e.type });
  }

  if (hierarchyEnabled) {
    for (const n of emotionNodesFromData) {
      const clusterKey = emotionClusterByLabel.get(n.label);
      if (!clusterKey) continue;
      const source = `cluster:${clusterKey}`;
      const target = n.key;
      if (!g.hasNode(source) || !g.hasNode(target) || g.hasEdge(source, target)) continue;
      g.addEdge(source, target, { weight: 1, edgeType: "cluster_branch" });
    }
  }

  if (layoutMode === "radical") {
    const selfKey = "self:me";
    g.addNode(selfKey, {
      label: "나",
      size: 16,
      x: 0,
      y: 0,
      color: "rgba(248, 250, 252, 1)",
      baseColor: "rgba(248, 250, 252, 1)",
      nodeType: "self",
    });

    const emotionNodes = g
      .filterNodes((node, attrs) => attrs.nodeType === "emotion")
      .sort((a, b) => {
        const aLabel = String(g.getNodeAttribute(a, "label") ?? "");
        const bLabel = String(g.getNodeAttribute(b, "label") ?? "");
        return aLabel.localeCompare(bLabel);
      });

    const emotionRadius = 2.8;
    const memByEmotion = new Map();
    for (const memKey of memVisible) {
      if (!g.hasNode(memKey)) continue;
      const emo = g.getNodeAttribute(memKey, "emotion");
      if (!emo) continue;
      if (!memByEmotion.has(emo)) memByEmotion.set(emo, []);
      memByEmotion.get(emo).push(memKey);
    }

    const safeAddEdge = (source, target, attrs) => {
      if (!g.hasNode(source) || !g.hasNode(target)) return;
      if (g.hasEdge(source, target)) return;
      g.addEdge(source, target, attrs);
    };

    emotionNodes.forEach((emoKey, idx) => {
      const attrs = g.getNodeAttributes(emoKey);
      const angle = (Math.PI * 2 * idx) / Math.max(1, emotionNodes.length) - Math.PI / 2;
      const ex = Math.cos(angle) * emotionRadius;
      const ey = Math.sin(angle) * emotionRadius;
      g.mergeNodeAttributes(emoKey, { x: ex, y: ey, size: Math.max(12, attrs.size ?? 12) });
      safeAddEdge(selfKey, emoKey, { edgeType: "radial_core", weight: 1 });

      const group = (memByEmotion.get(attrs.label) ?? []).sort();
      const baseAngle = angle;
      const orbitBase = 1.5;
      const ringCapacity = 18;

      group.forEach((memKey, i) => {
        const ring = Math.floor(i / ringCapacity);
        const ringIndex = i % ringCapacity;
        const ringCount = Math.min(ringCapacity, group.length - ring * ringCapacity);
        const spread = (Math.PI * 1.2) / Math.max(1, ringCount - 1);
        const start = baseAngle - (spread * Math.max(0, ringCount - 1)) / 2;
        const jitter = (seedCoord(memKey, 11) + 0.5) * 0.16;
        const ma = start + spread * ringIndex + jitter;
        const mr = orbitBase + ring * 0.44 + (seedCoord(memKey, 12) + 0.5) * 0.22;
        const mx = ex + Math.cos(ma) * mr;
        const my = ey + Math.sin(ma) * mr;
        g.mergeNodeAttributes(memKey, { x: mx, y: my });
        safeAddEdge(emoKey, memKey, { edgeType: "radial_branch", weight: 1 });
      });
    });

    g.forEachNode((node, attrs) => {
      if (Number.isFinite(attrs.x) && Number.isFinite(attrs.y)) return;
      g.mergeNodeAttributes(node, { x: seedCoord(node, 3) * 8, y: seedCoord(node, 4) * 8 });
    });
  } else {
    // Layout (Galaxy mode)
    forceAtlas2.assign(g, { iterations: 250, settings: { slowDown: 10, gravity: 1 } });
    g.forEachNode((node) => {
      const attrs = g.getNodeAttributes(node);
      if (!Number.isFinite(attrs.x) || !Number.isFinite(attrs.y)) {
        g.mergeNodeAttributes(node, { x: seedCoord(node, 3), y: seedCoord(node, 4) });
      }
    });
  }

  g.setAttribute("hasEmotionScore", hasEmotionScore);

  // Basic node styling (no fixed colors here; keep default renderer styles)
  // You can later add a reducer to color nodes by type.
  return g;
}

// ==========================
// THREE Globe (static, interact-on-pointer only)
// ==========================
function hash01(seed) {
  const s = String(seed ?? "");
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000; // 0..1
}

function unitVecFromLabel(label) {
  const a = hash01(label) * Math.PI * 2;
  const b = (hash01(label + "|b") * 2 - 1) * (Math.PI / 2);
  return new THREE.Vector3(
    Math.cos(b) * Math.cos(a),
    Math.sin(b),
    Math.cos(b) * Math.sin(a)
  );
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function buildGlobeLayout(data, filters) {
  const allowEmotion = filters.emotion === "ALL";
  const allowRelation = filters.relation === "ALL";

  const nodes = data?.nodes ?? [];

  // visible memories
  const memVisible = [];
  for (const n of nodes) {
    if (n.type !== "memory") continue;
    const okE = allowEmotion || n.emotion === filters.emotion;
    const okR = allowRelation || n.relation === filters.relation;
    if (okE && okR) memVisible.push(n);
  }

  // collect emotions/relations that exist in visible set
  const emoSet = new Set();
  const relSet = new Set();
  for (const m of memVisible) {
    if (m.emotion) emoSet.add(String(m.emotion));
    if (m.relation) relSet.add(String(m.relation));
  }

  const emotions = nodes
    .filter((n) => n.type === "emotion" && emoSet.has(String(n.label)))
    .map((n) => n.label);

  const relations = nodes
    .filter((n) => n.type === "relation" && relSet.has(String(n.label)))
    .map((n) => n.label);

  // radii
  const R_SURF = 8.5;
  const R_EMO = 2.4;
  const R_REL = 3.4;

  // 3D positions
  const emotionNodes = emotions.map((emo) => {
    const v = unitVecFromLabel(emo).multiplyScalar(R_EMO);
    return {
      key: `emotion:${emo}`,
      label: emo,
      nodeType: "emotion",
      position: v,
      color: getEmotionColor(emo),
    };
  });

  const relationNodes = relations.map((rel) => {
    const v = unitVecFromLabel("REL|" + rel).multiplyScalar(R_REL);
    return {
      key: `relation:${rel}`,
      label: rel,
      nodeType: "relation",
      position: v,
      color: "#94a3b8",
    };
  });

  const memoryNodes = [...memVisible]
    .sort((a, b) => String(a.key).localeCompare(String(b.key)))
    .map((m, idx, arr) => {
      // Place memories on a near-uniform spherical shell.
      const n = Math.max(1, arr.length);
      const y = 1 - (2 * (idx + 0.5)) / n;
      const ring = Math.sqrt(Math.max(0, 1 - y * y));
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      const theta = idx * goldenAngle + hash01(m.key) * 0.35;

      const v = new THREE.Vector3(
        Math.cos(theta) * ring,
        y,
        Math.sin(theta) * ring
      ).multiplyScalar(R_SURF);

      // size variety (use provided size if exists, else light variance)
      const baseSize = Number.isFinite(m.size) ? Number(m.size) : 5;
      const size = clamp(baseSize * (0.85 + (hash01(m.key) * 0.6)), 2.2, 8.5);

      return {
        key: m.key,
        label: m.label,
        nodeType: "memory",
        emotion: m.emotion,
        relation: m.relation,
        full_text: m.full_text,
        ts: m.ts,
        position: v,
        color: getMemoryToneColor(m.emotion),
        size,
      };
    });

  // Curved/bundled edges: memory -> emotion, memory -> relation
  const edges = [];
  const emoNodeByLabel = new Map(emotionNodes.map((n) => [String(n.label), n]));
  const relNodeByLabel = new Map(relationNodes.map((n) => [String(n.label), n]));

  for (const m of memoryNodes) {
    const p0 = m.position;
    const emoNode = emoNodeByLabel.get(String(m.emotion ?? ""));
    const relNode = relNodeByLabel.get(String(m.relation ?? ""));
    const pe = emoNode?.position; // can be undefined
    const pr = relNode?.position;

    if (pe) {
      // Shared control strategy around target side to create a mild bundled look.
      const pull = pe.clone().multiplyScalar(0.62);
      const towardTarget = p0.clone().lerp(pe, 0.72);
      const ctrl = towardTarget.add(pull).multiplyScalar(0.5);
      edges.push({
        a: p0,
        b: pe,
        control: ctrl,
        source: m.key,
        target: emoNode.key,
        kind: "mem-emo",
      });
    }
    if (pr) {
      const pull = pr.clone().multiplyScalar(0.55);
      const towardTarget = p0.clone().lerp(pr, 0.68);
      const ctrl = towardTarget.add(pull).multiplyScalar(0.5);
      edges.push({
        a: p0,
        b: pr,
        control: ctrl,
        source: m.key,
        target: relNode.key,
        kind: "mem-rel",
      });
    }
  }

  return { memoryNodes, emotionNodes, relationNodes, edges };
}

function InstancedSpheres({ items, baseScale = 0.12, onPick, depthFade = false, depthRadius = 9 }) {
  const meshRef = React.useRef(null);
  const { camera } = useThree();
  const camDirRef = React.useRef(new THREE.Vector3());
  const camToPointRef = React.useRef(new THREE.Vector3());

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const dummy = new THREE.Object3D();
    items.forEach((it, i) => {
      dummy.position.copy(it.position);
      const s = (it.size ?? 4) * baseScale;
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [items, baseScale]);

  // per-instance base color
  const baseColorArray = useMemo(() => {
    const arr = new Float32Array(items.length * 3);
    const c = new THREE.Color();
    items.forEach((it, i) => {
      c.set(it.color ?? "#94a3b8");
      arr[i * 3 + 0] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    });
    return arr;
  }, [items]);

  // working arrays for camera-depth styling
  const dynamicColorArrayRef = React.useRef(new Float32Array(0));
  const alphaArrayRef = React.useRef(new Float32Array(0));

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    dynamicColorArrayRef.current = new Float32Array(baseColorArray);
    alphaArrayRef.current = new Float32Array(items.length).fill(1);
    mesh.geometry.setAttribute("color", new THREE.InstancedBufferAttribute(dynamicColorArrayRef.current, 3));
    mesh.geometry.setAttribute("instanceAlpha", new THREE.InstancedBufferAttribute(alphaArrayRef.current, 1));
  }, [baseColorArray, items.length]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const colorAttr = mesh.geometry.getAttribute("color");
    const alphaAttr = mesh.geometry.getAttribute("instanceAlpha");
    if (!colorAttr || !alphaAttr) return;

    const alphaArray = alphaArrayRef.current;
    const dynamicColorArray = dynamicColorArrayRef.current;
    for (let i = 0; i < items.length; i += 1) {
      alphaArray[i] = 1;
      dynamicColorArray[i * 3 + 0] = baseColorArray[i * 3 + 0];
      dynamicColorArray[i * 3 + 1] = baseColorArray[i * 3 + 1];
      dynamicColorArray[i * 3 + 2] = baseColorArray[i * 3 + 2];
    }

    colorAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;
  }, [items, depthFade, baseColorArray]);

  useFrame(() => {
    if (!depthFade) return;
    const mesh = meshRef.current;
    if (!mesh) return;
    const colorAttr = mesh.geometry.getAttribute("color");
    const alphaAttr = mesh.geometry.getAttribute("instanceAlpha");
    if (!colorAttr || !alphaAttr) return;
    const alphaArray = alphaArrayRef.current;
    const dynamicColorArray = dynamicColorArrayRef.current;

    const camDir = camDirRef.current;
    const camToPoint = camToPointRef.current;
    camera.getWorldDirection(camDir);

    const span = Math.max(2, depthRadius * 2);
    for (let i = 0; i < items.length; i += 1) {
      camToPoint.copy(items[i].position).sub(camera.position);
      const depth = camToPoint.dot(camDir); // +front / -back
      const t = clamp((depth + depthRadius) / span, 0, 1);

      const alpha = 0.08 + Math.pow(t, 1.7) * 0.92;
      const brightness = 0.18 + Math.pow(t, 1.25) * 0.95;

      alphaArray[i] = alpha;
      dynamicColorArray[i * 3 + 0] = clamp(baseColorArray[i * 3 + 0] * brightness, 0, 1);
      dynamicColorArray[i * 3 + 1] = clamp(baseColorArray[i * 3 + 1] * brightness, 0, 1);
      dynamicColorArray[i * 3 + 2] = clamp(baseColorArray[i * 3 + 2] * brightness, 0, 1);
    }

    colorAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[null, null, items.length]}
      onPointerDown={(e) => {
        e.stopPropagation();
        const id = e.instanceId;
        if (id == null) return;
        onPick?.(items[id]);
      }}
    >
      <sphereGeometry args={[1, 10, 10]} />
      <meshBasicMaterial
        vertexColors
        transparent
        opacity={1}
        depthWrite={false}
        onBeforeCompile={(shader) => {
          shader.vertexShader = `
attribute float instanceAlpha;
varying float vInstanceAlpha;
${shader.vertexShader}`.replace(
            "#include <color_vertex>",
            `#include <color_vertex>
vInstanceAlpha = instanceAlpha;`
          );
          shader.fragmentShader = `
varying float vInstanceAlpha;
${shader.fragmentShader}`.replace(
            "vec4 diffuseColor = vec4( diffuse, opacity );",
            "vec4 diffuseColor = vec4( diffuse, opacity * vInstanceAlpha );"
          );
        }}
      />
    </instancedMesh>
  );
}

function toCurve(ed) {
  const a = ed.a;
  const b = ed.b;
  const ctrl = ed.control ?? a.clone().add(b).multiplyScalar(0.5).multiplyScalar(0.6);
  return new THREE.QuadraticBezierCurve3(a, ctrl, b);
}

function CurvedEdges({ edges, opacity = 0.3, color = "#94a3b8" }) {
  // build one merged geometry (lineSegments) for performance
  const geom = useMemo(() => {
    const points = [];
    for (const ed of edges) {
      const curve = toCurve(ed);
      const pts = curve.getPoints(12);
      for (let i = 0; i < pts.length - 1; i += 1) {
        points.push(pts[i], pts[i + 1]);
      }
    }
    const g = new THREE.BufferGeometry().setFromPoints(points);
    return g;
  }, [edges]);

  return (
    <lineSegments geometry={geom}>
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </lineSegments>
  );
}

function EdgeStreams({ edges, color = "#cbd5e1", density = 2, maxParticles = 1200 }) {
  const pointsRef = React.useRef(null);
  const geomRef = React.useRef(null);
  const particles = useMemo(() => {
    const out = [];
    const limitedEdges = edges.slice(0, Math.max(1, Math.floor(maxParticles / Math.max(1, density))));
    for (const edge of limitedEdges) {
      const curve = toCurve(edge);
      for (let i = 0; i < density; i += 1) {
        out.push({
          curve,
          phase: (i + hash01(`${edge.source}|${edge.target}|${i}`)) % 1,
          speed: 0.07 + hash01(`${edge.target}|${i}`) * 0.16,
        });
      }
    }
    return out;
  }, [edges, density, maxParticles]);

  useEffect(() => {
    const geom = geomRef.current;
    if (!geom) return;
    const arr = new Float32Array(particles.length * 3);
    geom.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  }, [particles.length]);

  useFrame(({ clock }) => {
    const geom = geomRef.current;
    if (!geom || particles.length === 0) return;
    const attr = geom.getAttribute("position");
    if (!attr) return;
    const t = clock.getElapsedTime();
    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      const u = (p.phase + t * p.speed) % 1;
      const pos = p.curve.getPoint(u);
      attr.setXYZ(i, pos.x, pos.y, pos.z);
    }
    attr.needsUpdate = true;
  });

  if (particles.length === 0) return null;

  return (
    <points ref={pointsRef} key={`streams_${particles.length}`}>
      <bufferGeometry ref={geomRef} />
      <pointsMaterial
        color={color}
        transparent
        opacity={0.68}
        size={0.075}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function PointerOrbitControls({ enabled = true }) {
  const { gl, camera } = useThree();
  const state = React.useRef({
    dragging: false,
    lastX: 0,
    lastY: 0,
    yaw: 0,
    pitch: 0,
    radius: 18,
  });

  useEffect(() => {
    if (!enabled) return;

    const el = gl.domElement;

    const updateCamera = () => {
      const s = state.current;
      const yaw = s.yaw;
      const pitch = clamp(s.pitch, -1.2, 1.2);
      const r = clamp(s.radius, 10, 40);

      const x = r * Math.cos(pitch) * Math.sin(yaw);
      const y = r * Math.sin(pitch);
      const z = r * Math.cos(pitch) * Math.cos(yaw);

      camera.position.set(x, y, z);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
    };

    updateCamera();

    const onDown = (e) => {
      const s = state.current;
      s.dragging = true;
      s.lastX = e.clientX;
      s.lastY = e.clientY;
      el.setPointerCapture?.(e.pointerId);
    };
    const onUp = () => {
      const s = state.current;
      s.dragging = false;
    };
    const onMove = (e) => {
      const s = state.current;
      if (!s.dragging) return;
      const dx = e.clientX - s.lastX;
      const dy = e.clientY - s.lastY;
      s.lastX = e.clientX;
      s.lastY = e.clientY;

      s.yaw += dx * 0.006;
      s.pitch += dy * 0.005;
      updateCamera();
    };
    const onWheel = (e) => {
      const s = state.current;
      const delta = Math.sign(e.deltaY);
      s.radius += delta * 1.2;
      updateCamera();
    };

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointermove", onMove);
    el.addEventListener("wheel", onWheel, { passive: true });

    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointermove", onMove);
      el.removeEventListener("wheel", onWheel);
    };
  }, [enabled, gl, camera]);

  return null;
}

function ThreeGlobeView({ data, filters, onSelect, isDarkMode, selectedKey = null }) {
  const layout = useMemo(() => {
    if (!data) return null;
    return buildGlobeLayout(data, filters);
  }, [data, filters]);
  const selectedEdges = useMemo(() => {
    if (!layout || !selectedKey) return [];
    return layout.edges.filter((e) => e.source === selectedKey || e.target === selectedKey);
  }, [layout, selectedKey]);

  if (!layout) return null;

  const bg = isDarkMode ? "#070b16" : "#f4f6f8";

  return (
    <Canvas
      style={{ width: "100%", height: "100%", background: "transparent" }}
      camera={{ fov: 55, near: 0.1, far: 200, position: [0, 3, 18] }}
      dpr={[1, 2]}
      onPointerMissed={() => onSelect?.(null)}
    >
      <color attach="background" args={[bg]} />
      <ambientLight intensity={0.75} />
      <pointLight position={[12, 10, 14]} intensity={1.1} />

      <PointerOrbitControls enabled />

      {/* invisible interaction shell (optional, helps touch dragging even when empty space) */}
      <mesh>
        <sphereGeometry args={[9.2, 24, 24]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <CurvedEdges edges={selectedEdges.slice(0, 4000)} opacity={0.42} color="#94a3b8" />
      <EdgeStreams edges={selectedEdges} color={isDarkMode ? "#e2e8f0" : "#1e293b"} density={2} />

      <InstancedSpheres
        items={layout.memoryNodes}
        baseScale={0.055}
        depthFade
        depthRadius={9}
        onPick={(node) => onSelect?.(node)}
      />
      <InstancedSpheres
        items={layout.relationNodes}
        baseScale={0.09}
        onPick={(node) => onSelect?.(node)}
      />
      <InstancedSpheres
        items={layout.emotionNodes}
        baseScale={0.11}
        onPick={(node) => onSelect?.(node)}
      />
    </Canvas>
  );
}


function GraphEvents({ onSelect }) {
  const registerEvents = useRegisterEvents();
  const sigma = useSigma();

  useEffect(() => {
    registerEvents({
      clickNode: (e) => {
        const node = e.node;
        const attrs = sigma.getGraph().getNodeAttributes(node);
        onSelect({ key: node, ...attrs });
      },
      clickStage: () => onSelect(null),
    });
  }, [registerEvents, sigma, onSelect]);

  return null;
}

export default function App({ onOpenHistory, useMockData } = {}) {
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({ emotion: "ALL", relation: "ALL" });
  const [expandedClusters, setExpandedClusters] = useState(() => new Set());
  const [selected, setSelected] = useState(null);
  const [secondarySelectedId, setSecondarySelectedId] = useState(null);
  const [showEdgesOnHover] = useState(true);
  const [intensityMetric, setIntensityMetric] = useState("count");
  const [layoutMode, setLayoutMode] = useState("galaxy");
  const [isDarkMode] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 980);
  const [mobilePane, setMobilePane] = useState("graph");
  const selectedHistoryId = useMemo(() => {
    if (!selected) return "";
    const historyId = String(selected.history_id ?? "").trim();
    const key = String(selected.key ?? "").trim();
    if (key.startsWith("mem:")) {
      const rawId = extractMemoryIdFromKey(key);
      return normalizeMemoryId(rawId) || rawId || historyId;
    }
    return historyId;
  }, [selected]);
  const selectedMemoryNode = useMemo(() => {
    if (!selected || !data) return null;
    if (selected.nodeType === "memory") return selected;
    const selectedLabel = String(selected.label ?? "").trim();
    const selectedEmotionLabel = emotionLabelOnly(selectedLabel);
    const candidateMemories = (data.nodes || []).filter((node) => node?.type === "memory");
    let matched = null;
    if (selected.nodeType === "emotion") {
      matched = candidateMemories.find((node) => {
        const emotionLabel = emotionLabelOnly(String(node.emotion ?? node.label ?? ""));
        return emotionLabel && emotionLabel === selectedEmotionLabel;
      });
    } else if (selected.nodeType === "relation") {
      matched = candidateMemories.find(
        (node) => String(node.relation ?? "").trim() === selectedLabel,
      );
    }
    return matched || null;
  }, [data, selected]);
  const openHistoryPayload = useMemo(() => {
    if (!selectedMemoryNode) return null;
    return {
      historyId: String(selectedMemoryNode.history_id ?? selectedHistoryId ?? "").trim(),
      memoryKey: String(selectedMemoryNode.key ?? "").trim(),
      snippet: String(selectedMemoryNode.label ?? "").trim(),
      fullText: String(selectedMemoryNode.full_text ?? "").trim(),
    };
  }, [selectedMemoryNode, selectedHistoryId]);

  const panelBg = isDarkMode ? "#0f172a" : "#f6efe3";
  const panelBorder = isDarkMode ? "#1f2937" : "#eadfce";
  const textMain = isDarkMode ? "#e5e7eb" : "#0f172a";
  const textSub = isDarkMode ? "#94a3b8" : "#475569";
  const appBg = isDarkMode ? "#0b1020" : "#f6efe3";
  const graphBg = "radial-gradient(circle at 16% 10%, #fffbf3 0%, #f8efe2 48%, #efe3d2 100%)";
  const galaxyStarsLayer = [
    "radial-gradient(circle at 14% 20%, rgba(255, 204, 153, 0.34) 0 10%, transparent 38%)",
    "radial-gradient(circle at 72% 30%, rgba(167, 139, 250, 0.24) 0 12%, transparent 40%)",
    "radial-gradient(circle at 64% 68%, rgba(103, 232, 249, 0.34) 0 11%, transparent 42%)",
    "radial-gradient(circle at 32% 74%, rgba(255, 204, 153, 0.20) 0 10%, transparent 36%)",
  ].join(", ");
  const galaxyMistLayer = [
    "radial-gradient(circle at 22% 46%, rgba(255, 204, 153, 0.30) 0 16%, transparent 48%)",
    "radial-gradient(circle at 78% 54%, rgba(103, 232, 249, 0.28) 0 15%, transparent 46%)",
    "radial-gradient(circle at 52% 38%, rgba(196, 181, 253, 0.25) 0 14%, transparent 44%)",
  ].join(", ");
  const panelShadow = isDarkMode ? "none" : "0 10px 26px rgba(120, 90, 40, 0.11)";
  const selectStyle = {
    width: "100%",
    padding: 8,
    background: isDarkMode ? "#111827" : "#ffffff",
    color: textMain,
    border: isDarkMode ? "1px solid #374151" : "1px solid #cbd5e1",
    borderRadius: 8,
  };

  const handleSelect = (next) => {
    if (next?.nodeType === "emotion_cluster") {
      const clusterKey = String(next.clusterKey ?? next.label ?? "");
      if (clusterKey) {
        setExpandedClusters((prev) => {
          const nextSet = new Set(prev);
          if (nextSet.has(clusterKey)) nextSet.delete(clusterKey);
          else nextSet.add(clusterKey);
          return nextSet;
        });
      }
      setSelected(next);
      setSecondarySelectedId(null);
      setFilters((f) => ({ ...f, emotion: "ALL" }));
      if (isMobile) setMobilePane("graph");
      return;
    }

    if (next?.nodeType === "emotion" && next?.label) {
      const clusterKey = resolveClusterKeyFromEmotionLabel(next.label);
      if (clusterKey) {
        setExpandedClusters((prev) => {
          const nextSet = new Set(prev);
          nextSet.add(clusterKey);
          return nextSet;
        });
      }
      setFilters((f) => ({ ...f, emotion: next.label }));
    }

    setSelected(next);
    setSecondarySelectedId(null);
    if (isMobile) setMobilePane(next?.nodeType === "memory" ? "evidence" : "graph");
  };

  const resetToHomeView = () => {
    handleSelect(null);
    setFilters({ emotion: "ALL", relation: "ALL" });
    setExpandedClusters(new Set());
    setLayoutMode("galaxy");
    setIsReportOpen(false);
    setDeepDiveDetail(null);
    if (isMobile) setMobilePane("graph");
  };

  const openHeatmapCellInGraph = (relationLabel, emotionLabel) => {
    if (!data) return;
    const emotionNode = data.nodes.find(
      (n) => n.type === "emotion" && String(n.label) === String(emotionLabel)
    );
    const relationNode = data.nodes.find(
      (n) => n.type === "relation" && String(n.label) === String(relationLabel)
    );

    setIsReportOpen(false);
    setDeepDiveDetail(null);
    setLayoutMode("galaxy");
    setFilters((f) => ({
      ...f,
      emotion: String(emotionLabel),
      relation: String(relationLabel),
    }));

    if (emotionNode) {
      setSelected({
        key: emotionNode.key,
        nodeType: emotionNode.type,
        label: emotionNode.label,
        emotion: emotionNode.emotion,
        relation: emotionNode.relation,
        full_text: emotionNode.full_text,
        ts: emotionNode.ts,
      });
      setSecondarySelectedId(relationNode?.key ?? null);
      return;
    }

    if (relationNode) {
      setSelected({
        key: relationNode.key,
        nodeType: relationNode.type,
        label: relationNode.label,
        emotion: relationNode.emotion,
        relation: relationNode.relation,
        full_text: relationNode.full_text,
        ts: relationNode.ts,
      });
      setSecondarySelectedId(null);
      return;
    }

    handleSelect(null);
  };

  useEffect(() => {
    const loadGraphData = async () => {
      const paths = useMockData
        ? ["/graph_with_ts.json", "/graph.json"]
        : [`https://thimblelike-nonopprobrious-lannie.ngrok-free.dev/api/memory?token=${encodeURIComponent(localStorage.getItem('aira_user_token'))}`];

      for (const path of paths) {
        try {
          const r = await fetch(path, { cache: "no-store" });
          if (!r.ok) continue;
          const json = await r.json();
          setData(useMockData ? json : json.data); // API response might wrap data in .data
          return;
        } catch {
          // try next candidate
        }
      }
      console.error("Failed to load graph data");
    };

    loadGraphData();
  }, [useMockData]);

  useEffect(() => {
    const onResize = () => {
      const next = window.innerWidth <= 980;
      setIsMobile(next);
      if (!next) setMobilePane("graph");
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const emotions = useMemo(() => {
    if (!data) return [];
    return data.nodes
      .filter((n) => n.type === "emotion")
      .map((n) => n.label)
      .sort((a, b) => {
        const ai = Number(emotionIdFromLabel(a).replace("E", ""));
        const bi = Number(emotionIdFromLabel(b).replace("E", ""));
        if (Number.isFinite(ai) && Number.isFinite(bi) && ai !== bi) return ai - bi;
        return String(a).localeCompare(String(b));
      });
  }, [data]);

  const relations = useMemo(() => {
    if (!data) return [];
    return data.nodes.filter((n) => n.type === "relation").map((n) => n.label).sort();
  }, [data]);

  const graph = useMemo(() => {
    if (!data) return null;
    if (layoutMode === "globe") return null;
    return buildGraphology(data, filters, layoutMode, { expandedClusters });
  }, [data, filters, layoutMode, expandedClusters]);

  const [recentDays] = useState(7);
  const [baselineDays] = useState(28);
  const [deepDiveDetail, setDeepDiveDetail] = useState(null);

  const alerts = useMemo(() => {
    return computeChangeAlertsFromGraphData(data, { recentDays, baselineDays });
  }, [data, recentDays, baselineDays]);

  const weeklyReport = useMemo(() => {
    if (!data) return null;
    const memories = data.nodes.filter((n) => n.type === "memory");
    const { recent, baseline, recentN, baseN, end, recentStart, baseStart } = pickWindowsByTime(
      memories,
      recentDays,
      baselineDays
    );

    const recentEmotion = countBy(recent, (m) => m.emotion);
    const baselineEmotion = countBy(baseline, (m) => m.emotion);
    const topRecent = [...recentEmotion.entries()].sort((a, b) => b[1] - a[1])[0];
    const topBaseline = [...baselineEmotion.entries()].sort((a, b) => b[1] - a[1])[0];
    const recentEmotionRatio = ratio(recentEmotion, recentN);
    const baselineEmotionRatio = ratio(baselineEmotion, baseN);
    const deltaEmotionRanking = Array.from(
      new Set([...recentEmotionRatio.keys(), ...baselineEmotionRatio.keys()])
    )
      .map((emo) => {
        const recentRatio = recentEmotionRatio.get(emo) ?? 0;
        const baselineRatio = baselineEmotionRatio.get(emo) ?? 0;
        const delta = recentRatio - baselineRatio;
        return {
          emotion: emo,
          recentRatio,
          baselineRatio,
          delta,
          deltaPp: delta * 100,
        };
      })
      .sort((a, b) => Math.abs(b.deltaPp) - Math.abs(a.deltaPp))
      .slice(0, 8);

    const emotionSet = new Set(
      data.nodes.filter((n) => n.type === "emotion").map((n) => String(n.label))
    );
    const relationSet = new Set(
      data.nodes.filter((n) => n.type === "relation").map((n) => String(n.label))
    );
    recent.forEach((m) => {
      if (m.emotion) emotionSet.add(String(m.emotion));
      if (m.relation) relationSet.add(String(m.relation));
    });
    const heatmapEmotions = [...emotionSet].sort();
    const heatmapRelations = [...relationSet].sort();

    const heatCellCount = new Map();
    const relationTotals = new Map();
    const baselineHeatCellCount = new Map();
    const baselineRelationTotals = new Map();
    let heatmapMaxCount = 0;
    recent.forEach((m) => {
      const rel = String(m.relation ?? "UNKNOWN");
      const emo = String(m.emotion ?? "UNKNOWN");
      const key = `${rel}__${emo}`;
      const next = (heatCellCount.get(key) ?? 0) + 1;
      heatCellCount.set(key, next);
      relationTotals.set(rel, (relationTotals.get(rel) ?? 0) + 1);
      heatmapMaxCount = Math.max(heatmapMaxCount, next);
    });
    baseline.forEach((m) => {
      const rel = String(m.relation ?? "UNKNOWN");
      const emo = String(m.emotion ?? "UNKNOWN");
      const key = `${rel}__${emo}`;
      baselineHeatCellCount.set(key, (baselineHeatCellCount.get(key) ?? 0) + 1);
      baselineRelationTotals.set(rel, (baselineRelationTotals.get(rel) ?? 0) + 1);
    });

    const heatmapRows = heatmapRelations
      .map((rel) => {
        const total = relationTotals.get(rel) ?? 0;
        return {
          relation: rel,
          total,
          cells: heatmapEmotions.map((emo) => {
            const count = heatCellCount.get(`${rel}__${emo}`) ?? 0;
            return {
              emotion: emo,
              count,
              rowRatio: total > 0 ? count / total : 0,
              baselineRowRatio: (baselineRelationTotals.get(rel) ?? 0) > 0
                ? (baselineHeatCellCount.get(`${rel}__${emo}`) ?? 0) / (baselineRelationTotals.get(rel) ?? 1)
                : 0,
              deltaRowRatio: (total > 0 ? count / total : 0) - (
                (baselineRelationTotals.get(rel) ?? 0) > 0
                  ? (baselineHeatCellCount.get(`${rel}__${emo}`) ?? 0) / (baselineRelationTotals.get(rel) ?? 1)
                  : 0
              ),
              intensity: heatmapMaxCount > 0 ? count / heatmapMaxCount : 0,
            };
          }),
        };
      })
      .filter((row) => row.total > 0);

    const relationDeepDive = heatmapRows
      .map((row) => {
        const positiveItems = row.cells
          .filter((cell) => cell.deltaRowRatio > 0.01)
          .sort((a, b) => b.deltaRowRatio - a.deltaRowRatio)
          .slice(0, 3);

        const items = positiveItems.length > 0
          ? positiveItems
          : [...row.cells]
            .sort((a, b) => Math.abs(b.deltaRowRatio) - Math.abs(a.deltaRowRatio))
            .slice(0, 1);

        return {
          relation: row.relation,
          total: row.total,
          items: items.map((cell) => ({
            emotion: cell.emotion,
            count: cell.count,
            recentRatio: cell.rowRatio,
            baselineRatio: cell.baselineRowRatio,
            deltaRatio: cell.deltaRowRatio,
            deltaPp: cell.deltaRowRatio * 100,
          })),
        };
      })
      .sort((a, b) =>
        Math.abs(b.items?.[0]?.deltaPp ?? 0) - Math.abs(a.items?.[0]?.deltaPp ?? 0)
      );

    return {
      recentN,
      baseN,
      end,
      recentStart,
      baseStart,
      topRecentEmotion: topRecent?.[0] ?? "-",
      topRecentCount: topRecent?.[1] ?? 0,
      topBaselineEmotion: topBaseline?.[0] ?? "-",
      topBaselineCount: topBaseline?.[1] ?? 0,
      deltaEmotionRanking,
      highlights: alerts.slice(0, 3),
      relationDeepDive,
      heatmap: {
        emotions: heatmapEmotions,
        rows: heatmapRows,
        maxCount: heatmapMaxCount,
      },
    };
  }, [data, recentDays, baselineDays, alerts]);

  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === "Escape") {
        setIsReportOpen(false);
        setDeepDiveDetail(null);
      }
    };
    if (isReportOpen) window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [isReportOpen]);


  if (!data) return <div style={{ padding: 16, color: textMain, background: appBg, minHeight: "100vh" }}>Loading graph...</div>;

  return (
    <div style={{ position: "relative", height: "100%", background: appBg, color: textMain }}>
      <style>
        {`@keyframes galaxyTwinkle {
      0% { opacity: 0.22; }
      50% { opacity: 0.42; }
      100% { opacity: 0.26; }
    }
    @keyframes watercolorFloat {
      0% { transform: translate3d(-1.5%, 0.8%, 0) scale(1); opacity: 0.46; }
      50% { transform: translate3d(1.2%, -1.1%, 0) scale(1.04); opacity: 0.58; }
      100% { transform: translate3d(-1.5%, 0.8%, 0) scale(1); opacity: 0.46; }
    }`}
      </style>
      <div
        style={{
          display: isMobile ? "block" : "grid",
          gridTemplateColumns: isMobile ? undefined : "280px minmax(0, 1fr) 360px",
          height: "100%",
          position: "relative",
          background: appBg,
          color: textMain,
          transition: "filter 160ms ease, opacity 160ms ease",
          filter: isReportOpen ? "saturate(0.9)" : "none",
        }}
      >
        {isMobile && (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 52,
              zIndex: 8,
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 8,
              padding: 8,
              borderTop: `1px solid ${panelBorder}`,
              background: isDarkMode ? "rgba(2, 6, 23, 0.92)" : "rgba(248, 250, 252, 0.94)",
              backdropFilter: "blur(4px)",
            }}
          >
            {[
              { id: "filters", label: "Filters" },
              { id: "graph", label: "Graph" },
              { id: "evidence", label: "Evidence" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMobilePane(tab.id)}
                style={{
                  borderRadius: 8,
                  border: mobilePane === tab.id
                    ? (isDarkMode ? "1px solid #38bdf8" : "1px solid #0ea5e9")
                    : (isDarkMode ? "1px solid #334155" : "1px solid #cbd5e1"),
                  background: mobilePane === tab.id
                    ? (isDarkMode ? "#0b2540" : "#e0f2fe")
                    : (isDarkMode ? "#111827" : "#f8fafc"),
                  color: textMain,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
        {/* LEFT: Filters */}
        <div
          style={{
            padding: 16,
            borderRight: `1px solid ${panelBorder}`,
            background: panelBg,
            boxShadow: panelShadow,
            zIndex: 2,
            ...(isMobile
              ? {
                position: "absolute",
                left: 10,
                right: 10,
                bottom: 60,
                maxHeight: "62vh",
                borderRadius: "16px 16px 12px 12px",
                borderRight: "none",
                display: mobilePane === "filters" ? "block" : "none",
                zIndex: 7,
                overflow: "auto",
                boxShadow: "0 18px 42px rgba(90, 68, 38, 0.2)",
              }
              : {}),
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Filters</div>
          <div style={{ marginBottom: 12 }}>
            <button
              type="button"
              onClick={resetToHomeView}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: isDarkMode ? "1px solid #334155" : "1px solid #cbd5e1",
                background: isDarkMode ? "#0b2540" : "#e0f2fe",
                color: textMain,
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              처음화면으로
            </button>
          </div>

          <div style={{ marginBottom: 6, fontSize: 12, color: textSub }}>
            어떤 감정과 관계를 볼까요?
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, marginBottom: 6, color: textSub }}>감정</div>
            {isMobile ? (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  overflowX: "auto",
                  paddingBottom: 4,
                  scrollSnapType: "x proximity",
                }}
              >
                {["ALL", ...emotions].map((e) => {
                  const value = e === "ALL" ? "ALL" : e;
                  const active = filters.emotion === value;
                  const label = e === "ALL" ? "전체" : emotionLabelOnly(e);
                  return (
                    <button
                      key={`emo_chip_${value}`}
                      type="button"
                      onClick={() => {
                        const nextEmotion = value;
                        handleSelect(null);
                        if (nextEmotion !== "ALL") {
                          const clusterKey = resolveClusterKeyFromEmotionLabel(nextEmotion);
                          if (clusterKey) {
                            setExpandedClusters((prev) => {
                              const nextSet = new Set(prev);
                              nextSet.add(clusterKey);
                              return nextSet;
                            });
                          }
                        }
                        setFilters((f) => ({ ...f, emotion: nextEmotion }));
                      }}
                      style={{
                        flex: "0 0 auto",
                        scrollSnapAlign: "start",
                        borderRadius: 999,
                        border: active ? "none" : "1px solid #cbd5e1",
                        background: active
                          ? "linear-gradient(135deg, #ffd8b3 0%, #ffcc99 100%)"
                          : "rgba(255,255,255,0.72)",
                        color: active ? "#7c2d12" : "#334155",
                        padding: "7px 12px",
                        fontSize: 12,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        boxShadow: active ? "0 6px 14px rgba(251, 146, 60, 0.24)" : "none",
                        cursor: "pointer",
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <select
                style={selectStyle}
                value={filters.emotion}
                onChange={(e) => {
                  const nextEmotion = e.target.value;
                  handleSelect(null);
                  if (nextEmotion !== "ALL") {
                    const clusterKey = resolveClusterKeyFromEmotionLabel(nextEmotion);
                    if (clusterKey) {
                      setExpandedClusters((prev) => {
                        const nextSet = new Set(prev);
                        nextSet.add(clusterKey);
                        return nextSet;
                      });
                    }
                  }
                  setFilters((f) => ({ ...f, emotion: nextEmotion }));
                }}
              >
                <option value="ALL">ALL</option>
                {emotions.map((e) => (
                  <option key={e} value={e}>
                    {emotionLabelOnly(e)}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, marginBottom: 6, color: textSub }}>관계</div>
            {isMobile ? (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  overflowX: "auto",
                  paddingBottom: 4,
                  scrollSnapType: "x proximity",
                }}
              >
                {["ALL", ...relations].map((r) => {
                  const value = r === "ALL" ? "ALL" : r;
                  const active = filters.relation === value;
                  const label = r === "ALL" ? "전체" : r;
                  return (
                    <button
                      key={`rel_chip_${value}`}
                      type="button"
                      onClick={() => {
                        handleSelect(null);
                        setFilters((f) => ({ ...f, relation: value }));
                      }}
                      style={{
                        flex: "0 0 auto",
                        scrollSnapAlign: "start",
                        borderRadius: 999,
                        border: active ? "none" : "1px solid #cbd5e1",
                        background: active
                          ? "linear-gradient(135deg, #ffd8b3 0%, #ffcc99 100%)"
                          : "rgba(255,255,255,0.72)",
                        color: active ? "#7c2d12" : "#334155",
                        padding: "7px 12px",
                        fontSize: 12,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        boxShadow: active ? "0 6px 14px rgba(251, 146, 60, 0.24)" : "none",
                        cursor: "pointer",
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <select
                style={selectStyle}
                value={filters.relation}
                onChange={(e) => {
                  handleSelect(null);
                  setFilters((f) => ({ ...f, relation: e.target.value }));
                }}
              >
                <option value="ALL">ALL</option>
                {relations.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, marginBottom: 6, color: textSub }}>별빛 강조하기</div>
            <select
              style={selectStyle}
              value={intensityMetric}
              onChange={(e) => setIntensityMetric(e.target.value)}
            >
              <option value="count">빈도순</option>
              <option value="score">강도순</option>
            </select>
          </div>

          <div style={{ fontSize: 12, color: textSub, marginTop: 16 }}>
            Nodes: {graph?.order ?? 0}
            <br />
            Edges: {graph?.size ?? 0}
          </div>

          <hr style={{ margin: "16px 0", borderColor: panelBorder }} />
          <div style={{ fontSize: 12, color: textSub }}>Tip: 상위 감정군 노드를 클릭하면 하위 감정(E01~E32)이 펼쳐집니다.</div>
          <div style={{ fontSize: 12, color: textSub, marginTop: 4 }}>Tip: 하위 감정 노드를 클릭하면 해당 감정의 기억 노드만 표시됩니다.</div>
        </div>

        {/* CENTER: Graph */}
        <div
          style={{
            minHeight: 0,
            minWidth: 0,
            background: graphBg,
            position: "relative",
            ...(isMobile
              ? {
                position: "absolute",
                inset: "0 0 52px 0",
                display: mobilePane === "evidence" ? "none" : "block",
              }
              : {}),
          }}
        >
          {layoutMode === "galaxy" && (
            <>
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  zIndex: 0,
                  backgroundImage: galaxyStarsLayer,
                  opacity: 0.62,
                }}
              />
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  zIndex: 0,
                  backgroundImage: galaxyMistLayer,
                  opacity: 0.5,
                  filter: "blur(28px)",
                  animation: "watercolorFloat 11s ease-in-out infinite",
                }}
              />
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  zIndex: 0,
                  backgroundImage: "repeating-linear-gradient(0deg, rgba(148, 163, 184, 0.035), rgba(148, 163, 184, 0.035) 1px, transparent 1px, transparent 24px)",
                  opacity: 0.32,
                  animation: "galaxyTwinkle 6.8s ease-in-out infinite",
                }}
              />
            </>
          )}
          {onOpenHistory && (
            <button
              type="button"
              onClick={() => onOpenHistory(openHistoryPayload ?? { historyId: "" })}
              style={{
                position: "absolute",
                top: 12,
                left: 12,
                zIndex: 3,
                padding: "8px 14px",
                borderRadius: 999,
                border: "1px solid #7dd3fc",
                background: "#e0f2fe",
                color: "#0c4a6e",
                backdropFilter: "blur(2px)",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700,
                boxShadow:
                  "0 8px 24px rgba(14, 116, 144, 0.22), inset 0 1px 0 rgba(255,255,255,0.7)",
                transition: "transform 120ms ease, filter 120ms ease",
              }}
            >
              대화전문 바로가기
            </button>
          )}
          {alerts.length > 0 && (
            <div
              style={{
                position: "absolute",
                left: 12,
                right: 12,
                bottom: isMobile ? 62 : 14,
                zIndex: 3,
                margin: "0 auto",
                maxWidth: 560,
                borderRadius: 12,
                background: "rgba(255, 255, 255, 0.9)",
                border: "1px solid rgba(226, 232, 240, 0.8)",
                boxShadow: "0 10px 26px rgba(120, 90, 40, 0.16)",
                backdropFilter: "blur(6px)",
                padding: "10px 12px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>
                  최근 {recentDays}일 주요 감정 변화
                </div>
                <div style={{ fontSize: 11, color: "#64748b" }}>
                  비교: 최근 {recentDays}일 vs 이전 {baselineDays}일
                </div>
              </div>
              <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                {alerts.slice(0, 3).map((a) => {
                  const metric = a.metric;
                  const deltaRaw = metric ? ((Number(metric.recent) || 0) - (Number(metric.baseline) || 0)) : 0;
                  const deltaPp = metric?.kind === "percent" ? deltaRaw * 100 : deltaRaw;
                  const tempStyle = reportTemperaturePalette(deltaPp);
                  const arrow = deltaRaw > 0 ? "▲" : (deltaRaw < 0 ? "▼" : "-");
                  return (
                    <div
                      key={`graph_alert_${a.id}`}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 12,
                      }}
                    >
                      <div style={{ color: "#0f172a", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {getAlertEmoji(a)} {a.title}
                      </div>
                      <div style={{ color: tempStyle.textColor, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                        {formatAlertDeltaText(metric)} {arrow}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div style={{ position: "relative", zIndex: 1, height: "100%" }}>
            {(!isMobile || mobilePane === "graph") && (layoutMode === "globe" ? (
              <ThreeGlobeView
                data={data}
                filters={filters}
                isDarkMode={isDarkMode}
                selectedKey={selected?.key ?? null}
                onSelect={(node) => {
                  // Three view에서 넘어온 node를 선택 상태로 반영
                  setSelected(node);
                  setSecondarySelectedId(null);
                }}
              />
            ) : (
              <SigmaContainer
                style={{ height: "100%", width: "100%", background: "transparent" }}
                graph={graph}
                settings={{
                  labelColor: { color: isDarkMode ? "#f1f5f9" : "#0f172a" },
                  labelSize: 14,
                  labelWeight: "600",
                  isDarkMode,
                  defaultDrawNodeLabel: drawReadableNodeLabel,
                }}
              >
                <GraphEvents onSelect={handleSelect} />
                <SelectionReducers
                  selectedId={selected?.key ?? null}
                  secondarySelectedId={secondarySelectedId}
                  showEdgesOnHover={showEdgesOnHover}
                  isDarkMode={isDarkMode}
                />
                <EmotionCategoryGlow metricMode={intensityMetric} isDarkMode={isDarkMode} />
              </SigmaContainer>
            ))}
          </div>
        </div>

        {/* RIGHT: Evidence */}
        <div
          style={{
            padding: 16,
            borderLeft: `1px solid ${panelBorder}`,
            overflow: "auto",
            background: panelBg,
            boxShadow: panelShadow,
            zIndex: 2,
            ...(isMobile
              ? {
                position: "absolute",
                inset: "0 0 52px 0",
                borderLeft: "none",
                display: mobilePane === "evidence" ? "block" : "none",
                zIndex: 6,
              }
              : {}),
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Evidence</div>

          {selected?.ts && (
            <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
              time: {String(selected.ts)}
            </div>
          )}


          {!selected ? (
            <div style={{ fontSize: 13, color: textSub }}>노드를 선택해 주세요.</div>
          ) : selected.nodeType === "memory" ? (
            <>
              <div style={{ fontSize: 12, color: textSub, marginBottom: 8 }}>
                emotion: {selected.emotion} / relation: {selected.relation}
              </div>
              {onOpenHistory && openHistoryPayload && (
                <button
                  type="button"
                  onClick={() => onOpenHistory(openHistoryPayload)}
                  style={{
                    marginBottom: 8,
                    width: "100%",
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "1px solid #7dd3fc",
                    background: "#e0f2fe",
                    color: "#0c4a6e",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  대화내역 보기
                </button>
              )}
              <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5, fontSize: 14 }}>
                {selected.full_text}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: textSub }}>
              {onOpenHistory && openHistoryPayload && (
                <button
                  type="button"
                  onClick={() => onOpenHistory(openHistoryPayload)}
                  style={{
                    marginBottom: 8,
                    width: "100%",
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "1px solid #7dd3fc",
                    background: "#e0f2fe",
                    color: "#0c4a6e",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  대화내역 보기
                </button>
              )}
              <div>
                <b>type</b>: {selected.nodeType}
              </div>
              <div>
                <b>label</b>: {selected.label}
              </div>
              <div style={{ marginTop: 8 }}>선택한 노드와 연결된 관계만 표시됩니다.</div>
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              onClick={() => setIsReportOpen(true)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: isDarkMode ? "1px solid #334155" : "1px solid #cbd5e1",
                background: isDarkMode ? "#111827" : "#f8fafc",
                color: textMain,
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              📄 주간 리포트 보기
            </button>
          </div>
        </div>

        {isReportOpen && (
          <div
            onClick={() => {
              setIsReportOpen(false);
              setDeepDiveDetail(null);
            }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 20,
              background: "rgba(2, 6, 23, 0.36)",
              backdropFilter: "blur(5px)",
              display: "grid",
              placeItems: "center",
              padding: 20,
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "min(880px, calc(100vw - 28px))",
                maxHeight: "calc(100vh - 40px)",
                overflow: "auto",
                borderRadius: 14,
                border: "1px solid #eadfce",
                boxShadow: "0 28px 72px rgba(15, 23, 42, 0.25)",
                background: "linear-gradient(180deg, #f9f2e7 0%, #f4ebdd 100%)",
                color: "#0f172a",
                padding: 20,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontWeight: 800, fontSize: 20 }}>주간 리포트</div>
                <button
                  type="button"
                  onClick={() => {
                    setIsReportOpen(false);
                    setDeepDiveDetail(null);
                  }}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#0f172a",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  닫기
                </button>
              </div>
              <div style={{ fontSize: 13, color: "#334155", marginBottom: 14 }}>
                감정의 바다에서 특히 두드러진 이번 구간을 핵심 중심으로 요약했습니다.
              </div>
              {(() => {
                const briefing = buildTopNarrativeSummary(alerts, recentDays);
                return (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>AI 감정 브리핑</div>
                    <div
                      style={{
                        position: "relative",
                        overflow: "hidden",
                        borderRadius: 12,
                        border: "1px solid rgba(255, 255, 255, 0.55)",
                        background: "linear-gradient(130deg, rgba(255, 204, 153, 0.34) 0%, rgba(103, 232, 249, 0.28) 55%, rgba(255, 204, 153, 0.2) 100%)",
                        boxShadow: "0 14px 34px rgba(14, 116, 144, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.75)",
                        padding: "14px 14px 12px",
                      }}
                    >
                      <div
                        aria-hidden="true"
                        style={{
                          position: "absolute",
                          inset: -28,
                          background:
                            "radial-gradient(60% 80% at 15% 20%, rgba(255, 204, 153, 0.5) 0%, rgba(255, 204, 153, 0) 70%), radial-gradient(70% 90% at 82% 68%, rgba(103, 232, 249, 0.52) 0%, rgba(103, 232, 249, 0) 72%)",
                          filter: "blur(22px)",
                          transform: "translateZ(0)",
                        }}
                      />
                      <div
                        style={{
                          position: "relative",
                          borderRadius: 10,
                          border: "1px solid rgba(255, 255, 255, 0.58)",
                          background: "linear-gradient(180deg, rgba(255,255,255,0.66) 0%, rgba(255,255,255,0.42) 100%)",
                          backdropFilter: "blur(10px) saturate(130%)",
                          WebkitBackdropFilter: "blur(10px) saturate(130%)",
                          padding: "10px 10px 9px",
                        }}
                      >
                        <div style={{ fontSize: 30, lineHeight: 1, marginBottom: 8 }}>{briefing.emoji}</div>
                        <div style={{ fontSize: 19, fontWeight: 800, color: "#0f172a", lineHeight: 1.42 }}>
                          "{briefing.message}"
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div style={{ fontWeight: 700, marginBottom: 8 }}>즉시 감정 알림</div>
              <div style={{ fontSize: 12, color: "#475569", marginBottom: 8 }}>
                가장 큰 변화부터 빠르게 확인하세요. 카드를 좌우로 넘겨볼 수 있습니다.
              </div>
              <div
                style={{
                  display: "grid",
                  gridAutoFlow: "column",
                  gridAutoColumns: "minmax(220px, 72%)",
                  gap: 10,
                  overflowX: "auto",
                  paddingBottom: 6,
                  marginBottom: 12,
                  scrollSnapType: "x mandatory",
                }}
              >
                {alerts.slice(0, 6).map((a) => {
                  const deltaRaw = Number(a?.metric?.delta ?? 0);
                  const deltaPp = a?.metric?.kind === "percent" ? deltaRaw * 100 : deltaRaw;
                  const tempStyle = reportTemperaturePalette(deltaPp);
                  const deltaColor = tempStyle.textColor;
                  const tagBg = tempStyle.tone === "warm"
                    ? "rgba(255, 204, 153, 0.32)"
                    : (tempStyle.tone === "cold" ? "rgba(103, 232, 249, 0.30)" : "rgba(226, 232, 240, 0.66)");
                  const tagText = tempStyle.tone === "warm"
                    ? REPORT_TEMP_COLORS.warmText
                    : (tempStyle.tone === "cold" ? REPORT_TEMP_COLORS.coldText : "#475569");
                  const arrow = deltaPp > 0.01 ? "▲" : (deltaPp < -0.01 ? "▼" : "-");
                  const emotionName = emotionLabelOnly(a?.filters?.emotion ?? "감정");
                  const relationTags = a?.filters?.relation && a.filters.relation !== "ALL"
                    ? [String(a.filters.relation)]
                    : alerts
                      .filter((x) =>
                        x.type === "RELATION_BIAS" &&
                        x?.filters?.emotion === a?.filters?.emotion &&
                        x?.filters?.relation &&
                        x.filters.relation !== "ALL"
                      )
                      .map((x) => String(x.filters.relation))
                      .slice(0, 2);
                  const tags = relationTags.length > 0 ? relationTags : ["전체 맥락"];
                  return (
                    <div
                      key={`quick_${a.id}`}
                      style={{
                        scrollSnapAlign: "start",
                        borderRadius: 12,
                        background: "#ffffff",
                        padding: "12px 12px 10px",
                        boxShadow: "0 10px 22px rgba(120, 90, 40, 0.10)",
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", lineHeight: 1.35 }}>
                        {getAlertEmoji(a)} {emotionName} {deltaPp > 0.01 ? "급증" : (deltaPp < -0.01 ? "감소" : "변화")}
                      </div>
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 24,
                          fontWeight: 900,
                          color: deltaColor,
                          lineHeight: 1,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {deltaPp >= 0 ? "+" : ""}
                        {deltaPp.toFixed(0)}% {arrow}
                      </div>
                      {tempStyle.tone !== "neutral" && (
                        <div style={{ marginTop: 4, fontSize: 11, color: tempStyle.textColor, fontWeight: 700 }}>
                          {tempStyle.tone === "warm" ? "현재 감정 온도가 높아졌어요" : "현재 감정 온도가 차분해졌어요"}
                        </div>
                      )}
                      <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {tags.map((tag) => (
                          <span
                            key={`${a.id}_${tag}`}
                            style={{
                              fontSize: 11,
                              color: tagText,
                              background: tagBg,
                              padding: "2px 8px",
                              borderRadius: 999,
                              fontWeight: 700,
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {alerts.length === 0 && (
                  <div
                    style={{
                      borderRadius: 12,
                      background: "#ffffff",
                      padding: 12,
                      fontSize: 12,
                      color: "#475569",
                      boxShadow: "0 10px 22px rgba(120, 90, 40, 0.09)",
                    }}
                  >
                    표본이 충분하지 않아 이번 주 즉시 감정 알림을 만들지 못했습니다.
                  </div>
                )}
              </div>

              <div style={{ fontWeight: 700, marginBottom: 8 }}>보조 지표: 감정 변화 확산 (%)</div>
              <div
                style={{
                  borderRadius: 10,
                  background: "#ffffff",
                  padding: 12,
                  marginBottom: 8,
                  boxShadow: "0 10px 22px rgba(120, 90, 40, 0.10)",
                }}
              >
                <div style={{ display: "grid", gap: 8 }}>
                  {(weeklyReport?.deltaEmotionRanking ?? []).slice(0, 6).map((item) => {
                    const deltaPp = Number(item.deltaPp) || 0;
                    const valueColor = reportTemperaturePalette(deltaPp).textColor;
                    return (
                      <div
                        key={`delta_rank_${item.emotion}`}
                        style={{ display: "grid", gridTemplateColumns: "92px 1fr 58px", gap: 8, alignItems: "center" }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>
                          {emotionLabelOnly(item.emotion)}
                        </div>
                        <div
                          style={{
                            height: 30,
                            borderRadius: 999,
                            background: "linear-gradient(90deg, rgba(103, 232, 249, 0.12) 0%, rgba(255, 204, 153, 0.1) 100%)",
                            border: "1px solid rgba(148, 163, 184, 0.22)",
                            padding: "0 4px",
                            overflow: "hidden",
                          }}
                        >
                          <EmotionDeltaWave
                            emotion={item.emotion}
                            baselineRatio={item.baselineRatio}
                            recentRatio={item.recentRatio}
                            deltaPp={deltaPp}
                          />
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: valueColor,
                            textAlign: "right",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {deltaPp >= 0 ? "+" : ""}
                          {deltaPp.toFixed(0)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{ fontSize: 12, color: "#475569", marginBottom: 12 }}>
                비교: 최근 {recentDays}일 vs 이전 {baselineDays}일 · 표본: {weeklyReport?.recentN ?? 0}/{weeklyReport?.baseN ?? 0}
              </div>

              <div style={{ fontWeight: 700, marginBottom: 8 }}>관계 감정 딥다이브</div>
              <div style={{ fontSize: 12, color: "#475569", marginBottom: 8 }}>
                각 관계에서 어떤 감정 변화가 컸는지 빠르게 확인하세요.
              </div>
              <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
                {(weeklyReport?.relationDeepDive ?? []).slice(0, 6).map((row) => (
                  <div
                    key={`deep_${row.relation}`}
                    style={{
                      borderRadius: 10,
                      background: "#ffffff",
                      padding: "10px 10px 9px",
                      boxShadow: "0 10px 22px rgba(120, 90, 40, 0.09)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>
                        {row.relation} {relationEmoji(row.relation)}
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>총 {row.total}건</div>
                    </div>
                    <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {(row.items ?? []).map((item) => {
                        const deltaPp = Number(item.deltaPp) || 0;
                        const isUp = deltaPp >= 0;
                        const tempStyle = reportTemperaturePalette(deltaPp);
                        const tagColor = tempStyle.textColor;
                        const bg = tempStyle.tone === "warm"
                          ? "rgba(255, 204, 153, 0.34)"
                          : (tempStyle.tone === "cold" ? "rgba(103, 232, 249, 0.30)" : "rgba(226, 232, 240, 0.66)");
                        return (
                          <button
                            key={`deep_${row.relation}_${item.emotion}`}
                            type="button"
                            onClick={() => {
                              setDeepDiveDetail({
                                relation: row.relation,
                                emotion: item.emotion,
                                count: item.count,
                                recentRatio: item.recentRatio,
                                baselineRatio: item.baselineRatio,
                                deltaRatio: item.deltaRatio,
                              });
                            }}
                            style={{
                              border: "none",
                              background: bg,
                              color: tagColor,
                              borderRadius: 999,
                              padding: "4px 10px",
                              fontSize: 12,
                              fontWeight: 800,
                              cursor: "pointer",
                            }}
                          >
                            {emotionLabelOnly(item.emotion)} {deltaPp >= 0 ? "+" : ""}
                            {deltaPp.toFixed(0)}% {isUp ? "급증" : "감소"}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {(weeklyReport?.relationDeepDive ?? []).length === 0 && (
                  <div style={{ borderRadius: 10, background: "#ffffff", padding: 12, fontSize: 12, color: "#475569", boxShadow: "0 10px 22px rgba(120, 90, 40, 0.09)" }}>
                    최근 구간의 관계 감정 변화를 설명할 표본이 없습니다.
                  </div>
                )}
              </div>

            </div>
            {deepDiveDetail && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: "fixed",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 30,
                  background: "#ffffff",
                  borderTopLeftRadius: 14,
                  borderTopRightRadius: 14,
                  boxShadow: "0 -12px 30px rgba(15, 23, 42, 0.24)",
                  borderTop: "1px solid #e2e8f0",
                  padding: "12px 14px 14px",
                }}
              >
                <div style={{ width: 44, height: 4, borderRadius: 999, background: "#cbd5e1", margin: "0 auto 10px" }} />
                <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>
                  {deepDiveDetail.relation} {relationEmoji(deepDiveDetail.relation)} · {emotionLabelOnly(deepDiveDetail.emotion)}
                </div>
                <div style={{ marginTop: 6, fontSize: 12, color: "#475569", lineHeight: 1.45 }}>
                  baseline {(deepDiveDetail.baselineRatio * 100).toFixed(0)}% · recent {(deepDiveDetail.recentRatio * 100).toFixed(0)}%
                  <br />
                  변화 {deepDiveDetail.deltaRatio >= 0 ? "+" : ""}
                  {(deepDiveDetail.deltaRatio * 100).toFixed(0)}% · 총 {deepDiveDetail.count}건
                </div>
                <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setDeepDiveDetail(null)}
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      color: "#0f172a",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    닫기
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      openHeatmapCellInGraph(deepDiveDetail.relation, deepDiveDetail.emotion);
                      setDeepDiveDetail(null);
                    }}
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid #0ea5e9",
                      background: "#e0f2fe",
                      color: "#0c4a6e",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    그래프에서 보기
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


