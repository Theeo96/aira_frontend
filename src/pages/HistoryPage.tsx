import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, MessageSquareText, ChevronLeft, ScrollText, CalendarDays, X } from "lucide-react";

interface HistorySummary {
    context_summary?: string;
    sentiment?: string;
}

export interface HistoryItem {
    id: string;
    user_id: string;
    date: string;
    full_transcript: string;
    summary?: HistorySummary;
}

interface HistoryPageProps {
    historyData: HistoryItem[];
    viewMode: "graph" | "list";
    setViewMode: (mode: "graph" | "list") => void;
    persona?: "rumi" | "lami" | string;
}

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
    emotion?: string;
    relation?: string;
    full_text?: string;
    ts?: string;
    emotion_score?: number;
}

interface GraphEdge {
    source: string;
    target: string;
    type?: string;
    weight?: number;
}

interface GraphPayload {
    nodes: GraphNode[];
    edges: GraphEdge[];
}

interface PositionedGraphNode extends GraphNode {
    x: number;
    y: number;
    radius: number;
    color: string;
    visibleLabel: string;
}

interface GraphEdgeWithKey extends GraphEdge {
    edgeKey: string;
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

const GRAPH_WIDTH = 980;
const GRAPH_HEIGHT = 620;

const hashString = (input: string) => {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i += 1) {
        hash ^= input.charCodeAt(i);
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return hash >>> 0;
};

const getEmotionColor = (emotion: string) => {
    const value = emotion.toLowerCase();
    if (value.includes("positive") || value.includes("기쁨")) {
        return "#10b981";
    }
    if (value.includes("당황")) {
        return "#f59e0b";
    }
    if (value.includes("negative") || value.includes("불안") || value.includes("분노") || value.includes("상처") || value.includes("슬픔")) {
        return "#f43f5e";
    }
    return "#64748b";
};

const getMemoryToneColor = (emotion: string) => {
    const value = emotion.toLowerCase();
    if (value.includes("기쁨")) {
        return "#fcd34d";
    }
    if (value.includes("당황")) {
        return "#c4b5fd";
    }
    if (value.includes("분노")) {
        return "#fda4af";
    }
    if (value.includes("불안")) {
        return "#93c5fd";
    }
    if (value.includes("상처")) {
        return "#f9a8d4";
    }
    if (value.includes("슬픔")) {
        return "#a5b4fc";
    }
    return "#cbd5e1";
};

const colorWithAlpha = (color: string, alpha: number) => {
    if (color.startsWith("#")) {
        const hex = color.slice(1);
        const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
        const parsed = Number.parseInt(full, 16);
        if (Number.isFinite(parsed)) {
            const r = (parsed >> 16) & 255;
            const g = (parsed >> 8) & 255;
            const b = parsed & 255;
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
    }
    return color;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const hashUnit = (input: string) => (hashString(input) % 10000) / 10000;

const extractMemoryIdFromKey = (key: string) => key.startsWith("mem:") ? key.slice(4) : key;

const parseGraphTs = (value: string) => {
    if (!value) {
        return null;
    }
    const parsed = new Date(value.includes("T") ? value : value.replace(" ", "T"));
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

const speakerTokenRegex = /(Rumi|Lumi|Lami|Rami|AI|Assistant|Bot|AIRA|User|사용자|유저|나|Me)\s*[:：]/gi;

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

    return messages.length > 0 ? messages : [{ speaker: "unknown", text: normalized }];
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

const HistoryPage: React.FC<HistoryPageProps> = ({ historyData, viewMode, setViewMode, persona }) => {
    const [query, setQuery] = useState("");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [graphData, setGraphData] = useState<GraphPayload | null>(null);
    const [graphLoading, setGraphLoading] = useState(false);
    const [graphError, setGraphError] = useState("");
    const [graphEmotionFilter, setGraphEmotionFilter] = useState("ALL");
    const [graphRelationFilter, setGraphRelationFilter] = useState("ALL");
    const [selectedGraphNodeKey, setSelectedGraphNodeKey] = useState<string | null>(null);
    const [hoveredGraphNodeKey, setHoveredGraphNodeKey] = useState<string | null>(null);
    const [graphShowEdgesOnHover, setGraphShowEdgesOnHover] = useState(true);
    const [graphIntensityMetric, setGraphIntensityMetric] = useState<"count" | "score">("count");
    const [graphLayoutMode, setGraphLayoutMode] = useState<"galaxy" | "radial">("radial");
    const [graphDarkMode, setGraphDarkMode] = useState(false);
    const [recentDays, setRecentDays] = useState(7);
    const [baselineDays, setBaselineDays] = useState(28);
    const [graphZoom, setGraphZoom] = useState(1);
    const [graphPan, setGraphPan] = useState({ x: 0, y: 0 });
    const [isGraphPanning, setIsGraphPanning] = useState(false);
    const graphPanelRef = useRef<HTMLDivElement | null>(null);
    const graphZoomRef = useRef(1);
    const graphPanRef = useRef({ x: 0, y: 0 });
    const svgRef = useRef<SVGSVGElement | null>(null);
    const panRef = useRef<{
        pointerId: number;
        startClientX: number;
        startClientY: number;
        startPanX: number;
        startPanY: number;
    } | null>(null);
    const touchPointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
    const pinchRef = useRef<{
        startDistance: number;
        startZoom: number;
        worldX: number;
        worldY: number;
    } | null>(null);

    useEffect(() => {
        let canceled = false;

        const loadGraphData = async () => {
            setGraphLoading(true);
            setGraphError("");
            try {
                const response = await fetch("/graphData.json", { cache: "no-store" });
                if (!response.ok) {
                    throw new Error(`graphData load failed: ${response.status}`);
                }
                const payload = (await response.json()) as GraphPayload;
                if (canceled) {
                    return;
                }
                if (!Array.isArray(payload?.nodes) || !Array.isArray(payload?.edges)) {
                    throw new Error("invalid graphData payload");
                }
                setGraphData(payload);
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

    const graphActiveNodeKey = graphShowEdgesOnHover && hoveredGraphNodeKey
        ? hoveredGraphNodeKey
        : selectedGraphNodeKey;

    const allMemoryNodesWithTs = useMemo(() => {
        if (!graphData) {
            return [] as GraphNode[];
        }
        return graphData.nodes
            .filter((node) => node.type === "memory")
            .map((node) => {
                const memoryId = extractMemoryIdFromKey(node.key);
                const ts = node.ts ?? historyDateById.get(memoryId) ?? "";
                return { ...node, ts };
            });
    }, [graphData, historyDateById]);

    const graphView = useMemo(() => {
        if (!graphData) {
            return null;
        }

        const memoryNodes = allMemoryNodesWithTs;
        const emotionNodes = graphData.nodes.filter((node) => node.type === "emotion");
        const relationNodes = graphData.nodes.filter((node) => node.type === "relation");

        const emotionOptions = Array.from(
            new Set(
                memoryNodes
                    .map((node) => String(node.emotion ?? "").trim())
                    .filter(Boolean),
            ),
        ).sort((a, b) => a.localeCompare(b, "ko"));

        const relationOptions = Array.from(
            new Set(
                memoryNodes
                    .map((node) => String(node.relation ?? "").trim())
                    .filter(Boolean),
            ),
        ).sort((a, b) => a.localeCompare(b, "ko"));

        const visibleMemoryNodes = memoryNodes.filter((node) => {
            const emotion = String(node.emotion ?? "");
            const relation = String(node.relation ?? "");
            if (graphEmotionFilter !== "ALL" && emotion !== graphEmotionFilter) {
                return false;
            }
            if (graphRelationFilter !== "ALL" && relation !== graphRelationFilter) {
                return false;
            }
            return true;
        });

        const visibleEmotionLabels = new Set(
            visibleMemoryNodes
                .map((node) => String(node.emotion ?? "").trim())
                .filter(Boolean),
        );
        const visibleRelationLabels = new Set(
            visibleMemoryNodes
                .map((node) => String(node.relation ?? "").trim())
                .filter(Boolean),
        );

        const visibleEmotionNodes = emotionNodes.filter((node) => visibleEmotionLabels.has(String(node.label ?? "").trim()));
        const visibleRelationNodes = relationNodes.filter((node) => visibleRelationLabels.has(String(node.label ?? "").trim()));

        const selectedNodes = [...visibleEmotionNodes, ...visibleRelationNodes, ...visibleMemoryNodes];
        const selectedNodeKeys = new Set(selectedNodes.map((node) => node.key));
        const selectedEdges: GraphEdgeWithKey[] = graphData.edges
            .filter((edge) => selectedNodeKeys.has(edge.source) && selectedNodeKeys.has(edge.target))
            .slice(0, 4000)
            .map((edge, index) => ({ ...edge, edgeKey: `${edge.source}__${edge.target}__${index}` }));

        const centerX = GRAPH_WIDTH / 2;
        const centerY = GRAPH_HEIGHT / 2;

        const placeCircularNodes = (
            nodes: GraphNode[],
            ringRadius: number,
            nodeColor: (node: GraphNode) => string,
            showLabel: boolean,
            baseNodeRadius: number,
        ): PositionedGraphNode[] => {
            const count = Math.max(nodes.length, 1);
            return nodes.map((node, index) => {
                const angle = (-Math.PI / 2) + (2 * Math.PI * index) / count;
                const jitter = (hashString(`${node.key}:${index}`) % 22) - 11;
                const radius = Math.max(2.5, baseNodeRadius + Math.min(Number(node.size ?? 0), 12) * 0.25);
                return {
                    ...node,
                    x: centerX + Math.cos(angle) * (ringRadius + jitter),
                    y: centerY + Math.sin(angle) * (ringRadius + jitter),
                    radius,
                    color: nodeColor(node),
                    visibleLabel: showLabel ? String(node.label ?? node.key) : "",
                };
            });
        };

        const positionedEmotionNodes = placeCircularNodes(
            visibleEmotionNodes,
            graphLayoutMode === "radial" ? 112 : 138,
            (node) => getEmotionColor(String(node.label ?? "")),
            true,
            10,
        );
        const positionedRelationNodes = placeCircularNodes(
            visibleRelationNodes,
            graphLayoutMode === "radial" ? 250 : 330,
            () => graphDarkMode ? "#94a3b8" : "#334155",
            true,
            8,
        );

        const emotionAnchorMap = new Map(positionedEmotionNodes.map((node) => [String(node.label ?? ""), node]));
        const relationAnchorMap = new Map(positionedRelationNodes.map((node) => [String(node.label ?? ""), node]));
        const emotionAngleMap = new Map(
            positionedEmotionNodes.map((node) => [
                String(node.label ?? ""),
                Math.atan2(node.y - centerY, node.x - centerX),
            ]),
        );

        const emotionBuckets = new Map<string, GraphNode[]>();
        visibleMemoryNodes.forEach((node) => {
            const emotion = String(node.emotion ?? "");
            if (!emotionBuckets.has(emotion)) {
                emotionBuckets.set(emotion, []);
            }
            emotionBuckets.get(emotion)?.push(node);
        });
        emotionBuckets.forEach((bucket) => {
            bucket.sort((a, b) => hashString(a.key) - hashString(b.key));
        });
        const emotionBucketIndex = new Map<string, Map<string, number>>();
        emotionBuckets.forEach((bucket, emotion) => {
            emotionBucketIndex.set(
                emotion,
                new Map(bucket.map((node, idx) => [node.key, idx])),
            );
        });

        const positionedMemoryNodes = visibleMemoryNodes.map((node, index) => {
            const nodeRadius = Math.max(2.5, 3.3 + Math.min(Number(node.size ?? 0), 10) * 0.22);
            const emotion = String(node.emotion ?? "");
            const relation = String(node.relation ?? "");
            const localIndex = emotionBucketIndex.get(emotion)?.get(node.key) ?? index;
            const bucketSize = emotionBuckets.get(emotion)?.length ?? visibleMemoryNodes.length;

            let x = centerX;
            let y = centerY;

            if (graphLayoutMode === "radial") {
                const baseAngle = emotionAngleMap.get(emotion) ?? ((index / Math.max(1, visibleMemoryNodes.length)) * Math.PI * 2 - Math.PI / 2);
                const ringCapacity = 24;
                const ringIndex = Math.floor(localIndex / ringCapacity);
                const slot = localIndex % ringCapacity;
                const ringCount = Math.min(ringCapacity, Math.max(1, bucketSize - ringIndex * ringCapacity));
                const spread = Math.PI * 0.95;
                const slotRatio = ringCount <= 1 ? 0.5 : slot / (ringCount - 1);
                const jitterA = (hashUnit(`${node.key}:radial-angle`) - 0.5) * 0.12;
                const angle = baseAngle - spread / 2 + spread * slotRatio + jitterA;
                const jitterR = (hashUnit(`${node.key}:radial-radius`) - 0.5) * 18;
                const radius = 185 + ringIndex * 48 + jitterR;
                x = centerX + Math.cos(angle) * radius;
                y = centerY + Math.sin(angle) * radius;

                const relationAnchor = relationAnchorMap.get(relation);
                if (relationAnchor) {
                    x = x * 0.92 + relationAnchor.x * 0.08;
                    y = y * 0.92 + relationAnchor.y * 0.08;
                }
            } else {
                // Galaxy: dense center + noisy spiral spread, weak semantic pull.
                const angle = hashUnit(`${node.key}:galaxy-angle`) * Math.PI * 2;
                const density = Math.pow(hashUnit(`${node.key}:galaxy-density`), 0.72);
                const radius = 38 + density * 260;
                const swirl = (index / Math.max(1, visibleMemoryNodes.length)) * Math.PI * 8;
                const finalAngle = angle + swirl;
                x = centerX + Math.cos(finalAngle) * radius;
                y = centerY + Math.sin(finalAngle) * radius;

                const emotionAnchor = emotionAnchorMap.get(emotion);
                const relationAnchor = relationAnchorMap.get(relation);
                if (emotionAnchor) {
                    x = x * 0.9 + emotionAnchor.x * 0.1;
                    y = y * 0.9 + emotionAnchor.y * 0.1;
                }
                if (relationAnchor) {
                    x = x * 0.94 + relationAnchor.x * 0.06;
                    y = y * 0.94 + relationAnchor.y * 0.06;
                }
            }

            return {
                ...node,
                x,
                y,
                radius: nodeRadius,
                color: getMemoryToneColor(emotion),
                visibleLabel: "",
            };
        });

        const positionedNodes = [...positionedEmotionNodes, ...positionedRelationNodes, ...positionedMemoryNodes];
        const positionedNodeByKey = new Map(positionedNodes.map((node) => [node.key, node]));

        const focusNodeKeys = new Set<string>();
        const focusEdgeKeys = new Set<string>();
        if (graphActiveNodeKey && positionedNodeByKey.has(graphActiveNodeKey)) {
            focusNodeKeys.add(graphActiveNodeKey);
            selectedEdges.forEach((edge) => {
                if (edge.source === graphActiveNodeKey || edge.target === graphActiveNodeKey) {
                    focusEdgeKeys.add(edge.edgeKey);
                    focusNodeKeys.add(edge.source);
                    focusNodeKeys.add(edge.target);
                }
            });
        }

        const emotionMetricByLabel = new Map<string, number>();
        const hasEmotionScore = visibleMemoryNodes.some((node) => Number.isFinite(node.emotion_score));
        visibleMemoryNodes.forEach((node) => {
            const label = String(node.emotion ?? "").trim();
            if (!label) {
                return;
            }
            const prev = emotionMetricByLabel.get(label) ?? 0;
            if (graphIntensityMetric === "score" && hasEmotionScore && Number.isFinite(node.emotion_score)) {
                emotionMetricByLabel.set(label, prev + Number(node.emotion_score));
                return;
            }
            emotionMetricByLabel.set(label, prev + 1);
        });

        const maxEmotionMetric = Math.max(...emotionMetricByLabel.values(), 0);

        const selectedNode = selectedGraphNodeKey ? positionedNodeByKey.get(selectedGraphNodeKey) ?? null : null;

        return {
            emotionOptions,
            relationOptions,
            positionedNodes,
            positionedNodeByKey,
            selectedEdges,
            selectedNode,
            focusNodeKeys,
            focusEdgeKeys,
            visibleMemoryCount: visibleMemoryNodes.length,
            graphNodeCount: positionedNodes.length,
            graphEdgeCount: selectedEdges.length,
            emotionMetricByLabel,
            maxEmotionMetric,
            hasEmotionScore,
        };
    }, [
        allMemoryNodesWithTs,
        graphData,
        graphDarkMode,
        graphEmotionFilter,
        graphIntensityMetric,
        graphLayoutMode,
        graphRelationFilter,
        graphActiveNodeKey,
        selectedGraphNodeKey,
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
        const recentStart = new Date(end.getTime() - recentDays * 24 * 60 * 60 * 1000);
        const baselineStart = new Date(end.getTime() - (recentDays + baselineDays) * 24 * 60 * 60 * 1000);
        const recent = memories.filter((item) => item._date >= recentStart && item._date <= end);
        const baseline = memories.filter((item) => item._date >= baselineStart && item._date < recentStart);

        if (recent.length < 10 || baseline.length < 20) {
            return [] as ChangeAlert[];
        }

        const recentEmotionRatios = ratioMap(countBy(recent, (item) => String(item.emotion ?? "UNKNOWN")), recent.length);
        const baselineEmotionRatios = ratioMap(countBy(baseline, (item) => String(item.emotion ?? "UNKNOWN")), baseline.length);
        const recentRelationRatios = ratioMap(countBy(recent, (item) => String(item.relation ?? "UNKNOWN")), recent.length);
        const baselineRelationRatios = ratioMap(countBy(baseline, (item) => String(item.relation ?? "UNKNOWN")), baseline.length);

        const alerts: ChangeAlert[] = [];
        const emotionCandidates: Array<{ emotion: string; recentValue: number; baselineValue: number; delta: number }> = [];
        recentEmotionRatios.forEach((value, emotion) => {
            const baselineValue = baselineEmotionRatios.get(emotion) ?? 0;
            const delta = value - baselineValue;
            const multiple = baselineValue > 0 ? value / baselineValue : (value >= 0.15 ? 999 : 0);
            if (value >= 0.18 && (multiple >= 1.6 || delta >= 0.12)) {
                emotionCandidates.push({ emotion, recentValue: value, baselineValue, delta });
            }
        });
        emotionCandidates
            .sort((a, b) => b.delta - a.delta)
            .slice(0, 3)
            .forEach((candidate) => {
                const evidence = recent
                    .filter((item) => String(item.emotion ?? "UNKNOWN") === candidate.emotion)
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
            const recentRelationItems = recent.filter((item) => String(item.relation ?? "UNKNOWN") === relation);
            const baselineRelationItems = baseline.filter((item) => String(item.relation ?? "UNKNOWN") === relation);
            if (recentRelationItems.length < 8 || baselineRelationItems.length < 8) {
                return;
            }
            const relationRecentRatio = ratioMap(countBy(recentRelationItems, (item) => String(item.emotion ?? "UNKNOWN")), recentRelationItems.length);
            const relationBaselineRatio = ratioMap(countBy(baselineRelationItems, (item) => String(item.emotion ?? "UNKNOWN")), baselineRelationItems.length);
            let best: { emotion: string; recentValue: number; baselineValue: number; delta: number } | null = null;
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

    const historyIdSet = useMemo(() => new Set(historyData.map((item) => item.id)), [historyData]);

    const selectedGraphHistoryId = useMemo(() => {
        if (!selectedGraphNodeKey || !graphView) {
            return null;
        }
        const selectedGraphNode = graphView.positionedNodeByKey.get(selectedGraphNodeKey);
        if (!selectedGraphNode || selectedGraphNode.type !== "memory") {
            return null;
        }
        const memoryId = extractMemoryIdFromKey(selectedGraphNode.key);
        return historyIdSet.has(memoryId) ? memoryId : null;
    }, [graphView, historyIdSet, selectedGraphNodeKey]);

    useEffect(() => {
        if (!graphView) {
            return;
        }
        if (selectedGraphNodeKey && !graphView.positionedNodeByKey.has(selectedGraphNodeKey)) {
            setSelectedGraphNodeKey(null);
        }
        if (hoveredGraphNodeKey && !graphView.positionedNodeByKey.has(hoveredGraphNodeKey)) {
            setHoveredGraphNodeKey(null);
        }
    }, [graphView, hoveredGraphNodeKey, selectedGraphNodeKey]);

    useEffect(() => {
        graphZoomRef.current = graphZoom;
    }, [graphZoom]);

    useEffect(() => {
        graphPanRef.current = graphPan;
    }, [graphPan]);

    useEffect(() => {
        if (viewMode !== "graph") {
            return;
        }
        const panel = graphPanelRef.current;
        if (!panel) {
            return;
        }

        const handleNativeWheel = (event: WheelEvent) => {
            event.preventDefault();
            event.stopPropagation();

            const svg = svgRef.current;
            if (!svg) {
                return;
            }
            const rect = svg.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) {
                return;
            }

            const cursor = {
                x: ((event.clientX - rect.left) / rect.width) * GRAPH_WIDTH,
                y: ((event.clientY - rect.top) / rect.height) * GRAPH_HEIGHT,
            };

            const currentZoom = graphZoomRef.current;
            const currentPan = graphPanRef.current;
            const zoomFactor = event.deltaY < 0 ? 1.12 : 0.9;
            const nextZoom = clamp(currentZoom * zoomFactor, 0.45, 4.5);
            const worldX = (cursor.x - currentPan.x) / currentZoom;
            const worldY = (cursor.y - currentPan.y) / currentZoom;
            const nextPan = {
                x: cursor.x - worldX * nextZoom,
                y: cursor.y - worldY * nextZoom,
            };

            graphZoomRef.current = nextZoom;
            graphPanRef.current = nextPan;
            setGraphZoom(nextZoom);
            setGraphPan(nextPan);
        };

        panel.addEventListener("wheel", handleNativeWheel, {
            passive: false,
            capture: true,
        });

        return () => {
            panel.removeEventListener("wheel", handleNativeWheel, true);
        };
    }, [viewMode, graphView]);

    const toViewCoordinates = (clientX: number, clientY: number) => {
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect || rect.width <= 0 || rect.height <= 0) {
            return null;
        }
        return {
            x: ((clientX - rect.left) / rect.width) * GRAPH_WIDTH,
            y: ((clientY - rect.top) / rect.height) * GRAPH_HEIGHT,
        };
    };

    const resetGraphViewport = () => {
        setGraphZoom(1);
        setGraphPan({ x: 0, y: 0 });
    };

    const handleGraphPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
        if (event.pointerType === "touch") {
            event.currentTarget.setPointerCapture(event.pointerId);
            touchPointersRef.current.set(event.pointerId, {
                x: event.clientX,
                y: event.clientY,
            });

            if (touchPointersRef.current.size === 1) {
                panRef.current = {
                    pointerId: event.pointerId,
                    startClientX: event.clientX,
                    startClientY: event.clientY,
                    startPanX: graphPanRef.current.x,
                    startPanY: graphPanRef.current.y,
                };
                setIsGraphPanning(true);
            }

            if (touchPointersRef.current.size >= 2) {
                const points = Array.from(touchPointersRef.current.values());
                const first = points[0];
                const second = points[1];
                const center = {
                    x: (first.x + second.x) / 2,
                    y: (first.y + second.y) / 2,
                };
                const distance = Math.hypot(first.x - second.x, first.y - second.y);
                const cursor = toViewCoordinates(center.x, center.y);
                if (cursor && distance > 0) {
                    const currentZoom = graphZoomRef.current;
                    const currentPan = graphPanRef.current;
                    pinchRef.current = {
                        startDistance: distance,
                        startZoom: currentZoom,
                        worldX: (cursor.x - currentPan.x) / currentZoom,
                        worldY: (cursor.y - currentPan.y) / currentZoom,
                    };
                }
                panRef.current = null;
                setIsGraphPanning(false);
            }
            return;
        }

        if (event.button !== 0 || event.target !== event.currentTarget) {
            return;
        }
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect || rect.width <= 0 || rect.height <= 0) {
            return;
        }
        event.currentTarget.setPointerCapture(event.pointerId);
        panRef.current = {
            pointerId: event.pointerId,
            startClientX: event.clientX,
            startClientY: event.clientY,
            startPanX: graphPan.x,
            startPanY: graphPan.y,
        };
        setIsGraphPanning(true);
    };

    const handleGraphPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
        if (event.pointerType === "touch") {
            if (!touchPointersRef.current.has(event.pointerId)) {
                return;
            }

            touchPointersRef.current.set(event.pointerId, {
                x: event.clientX,
                y: event.clientY,
            });

            if (touchPointersRef.current.size >= 2 && pinchRef.current) {
                const points = Array.from(touchPointersRef.current.values());
                const first = points[0];
                const second = points[1];
                const center = {
                    x: (first.x + second.x) / 2,
                    y: (first.y + second.y) / 2,
                };
                const distance = Math.hypot(first.x - second.x, first.y - second.y);
                if (distance > 0) {
                    const cursor = toViewCoordinates(center.x, center.y);
                    if (!cursor) {
                        return;
                    }
                    const pinch = pinchRef.current;
                    const nextZoom = clamp((pinch.startZoom * distance) / Math.max(1, pinch.startDistance), 0.45, 4.5);
                    const nextPan = {
                        x: cursor.x - pinch.worldX * nextZoom,
                        y: cursor.y - pinch.worldY * nextZoom,
                    };
                    graphZoomRef.current = nextZoom;
                    graphPanRef.current = nextPan;
                    setGraphZoom(nextZoom);
                    setGraphPan(nextPan);
                }
                return;
            }

            if (panRef.current && panRef.current.pointerId === event.pointerId) {
                const rect = svgRef.current?.getBoundingClientRect();
                if (!rect || rect.width <= 0 || rect.height <= 0) {
                    return;
                }
                const deltaX = ((event.clientX - panRef.current.startClientX) / rect.width) * GRAPH_WIDTH;
                const deltaY = ((event.clientY - panRef.current.startClientY) / rect.height) * GRAPH_HEIGHT;
                const nextPan = {
                    x: panRef.current.startPanX + deltaX,
                    y: panRef.current.startPanY + deltaY,
                };
                graphPanRef.current = nextPan;
                setGraphPan(nextPan);
            }
            return;
        }

        if (!panRef.current || panRef.current.pointerId !== event.pointerId) {
            return;
        }
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect || rect.width <= 0 || rect.height <= 0) {
            return;
        }
        const deltaX = ((event.clientX - panRef.current.startClientX) / rect.width) * GRAPH_WIDTH;
        const deltaY = ((event.clientY - panRef.current.startClientY) / rect.height) * GRAPH_HEIGHT;
        const nextPan = {
            x: panRef.current.startPanX + deltaX,
            y: panRef.current.startPanY + deltaY,
        };
        graphPanRef.current = nextPan;
        setGraphPan(nextPan);
    };

    const handleGraphPointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
        if (event.pointerType === "touch") {
            touchPointersRef.current.delete(event.pointerId);
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
            }

            if (touchPointersRef.current.size < 2) {
                pinchRef.current = null;
            }

            if (touchPointersRef.current.size === 1) {
                const remainingEntry = touchPointersRef.current.entries().next().value as [number, { x: number; y: number }];
                if (remainingEntry) {
                    const [remainingPointerId, point] = remainingEntry;
                    panRef.current = {
                        pointerId: remainingPointerId,
                        startClientX: point.x,
                        startClientY: point.y,
                        startPanX: graphPanRef.current.x,
                        startPanY: graphPanRef.current.y,
                    };
                    setIsGraphPanning(true);
                }
            } else {
                panRef.current = null;
                setIsGraphPanning(false);
            }
            return;
        }

        if (panRef.current && panRef.current.pointerId === event.pointerId) {
            panRef.current = null;
            setIsGraphPanning(false);
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
    };

        if (viewMode === "graph") {
        if (graphLoading && !graphView) {
            return (
                <div className="h-full bg-[#F0EEE9] pt-20 pb-8 px-3 sm:px-6">
                    <div className="mx-auto w-full max-w-6xl rounded-3xl border border-gray-200 bg-white p-8 shadow-sm text-sm text-gray-500">
                        그래프 데이터를 불러오는 중입니다.
                    </div>
                </div>
            );
        }

        if (graphError && !graphView) {
            return (
                <div className="h-full bg-[#F0EEE9] pt-20 pb-8 px-3 sm:px-6">
                    <div className="mx-auto w-full max-w-6xl rounded-3xl border border-rose-200 bg-rose-50 p-8 shadow-sm text-sm text-rose-700">
                        {graphError}
                    </div>
                </div>
            );
        }

        if (!graphView) {
            return (
                <div className="h-full bg-[#F0EEE9] pt-20 pb-8 px-3 sm:px-6">
                    <div className="mx-auto w-full max-w-6xl rounded-3xl border border-gray-200 bg-white p-8 shadow-sm text-sm text-gray-500">
                        표시할 그래프 데이터가 없습니다.
                    </div>
                </div>
            );
        }

        const isDark = graphDarkMode;
        const graphShell = isDark
            ? "border-slate-700/60 bg-slate-900 text-slate-100"
            : "border-white/60 bg-white/80 text-slate-900";
        const graphCanvasBg = isDark
            ? "radial-gradient(circle at 50% 45%, #131f35 0%, #0b1020 62%, #070b16 100%)"
            : "radial-gradient(circle at 50% 45%, #ffffff 0%, #f4f6f8 70%, #eef2f7 100%)";
        const panelClass = isDark
            ? "border-slate-700 bg-slate-900/90 text-slate-100"
            : "border-slate-200 bg-white text-slate-900";
        const selectClass = isDark
            ? "w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            : "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700";

        return (
            <div className="h-full bg-[#F0EEE9] pt-20 pb-8 px-2 sm:px-6 overflow-y-auto">
                <div className="mx-auto w-full max-w-6xl">
                    <div className={`rounded-3xl border backdrop-blur-md px-3 py-4 sm:px-5 sm:py-5 shadow-[0_8px_32px_rgba(0,0,0,0.04)] ${graphShell}`}>
                        <div className="grid grid-cols-1 gap-2.5 break-keep sm:grid-cols-2 lg:grid-cols-[auto_auto_1fr_1fr] lg:items-center">
                            <button
                                type="button"
                                onClick={() => setGraphDarkMode((prev) => !prev)}
                                className={`rounded-lg px-3 py-2 text-sm font-semibold ${isDark ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                            >
                                {isDark ? "라이트 모드" : "다크 모드"}
                            </button>

                            <div className="inline-flex rounded-lg border border-slate-500/40 overflow-hidden mx-auto">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setGraphLayoutMode("galaxy");
                                        setSelectedGraphNodeKey(null);
                                    }}
                                    className={`px-3 py-2 text-xs font-semibold ${graphLayoutMode === "galaxy" ? "bg-sky-600 text-white" : isDark ? "bg-slate-800 text-slate-200" : "bg-white text-slate-700"}`}
                                >
                                    Galaxy
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setGraphLayoutMode("radial");
                                        setSelectedGraphNodeKey(null);
                                    }}
                                    className={`px-3 py-2 text-xs font-semibold ${graphLayoutMode === "radial" ? "bg-amber-500 text-white" : isDark ? "bg-slate-800 text-slate-200" : "bg-white text-slate-700"}`}
                                >
                                    Radial
                                </button>
                            </div>

                            <select
                                value={graphEmotionFilter}
                                onChange={(event) => {
                                    setGraphEmotionFilter(event.target.value);
                                    setSelectedGraphNodeKey(null);
                                }}
                                className={selectClass}
                            >
                                <option value="ALL">전체 감정</option>
                                {graphView.emotionOptions.map((emotion) => (
                                    <option key={emotion} value={emotion}>{emotion}</option>
                                ))}
                            </select>

                            <select
                                value={graphRelationFilter}
                                onChange={(event) => {
                                    setGraphRelationFilter(event.target.value);
                                    setSelectedGraphNodeKey(null);
                                }}
                                className={selectClass}
                            >
                                <option value="ALL">전체 관계</option>
                                {graphView.relationOptions.map((relation) => (
                                    <option key={relation} value={relation}>{relation}</option>
                                ))}
                            </select>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-2 text-xs break-keep sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto]">
                            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300/40 px-2 py-2 break-keep">
                                <input
                                    type="checkbox"
                                    checked={graphShowEdgesOnHover}
                                    onChange={(event) => setGraphShowEdgesOnHover(event.target.checked)}
                                />
                                hover 시 이웃 엣지 표시
                            </label>

                            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300/40 px-2 py-2 break-keep">
                                glow 기준
                                <select
                                    value={graphIntensityMetric}
                                    onChange={(event) => setGraphIntensityMetric(event.target.value as "count" | "score")}
                                    className={selectClass}
                                >
                                    <option value="count">memory count</option>
                                    <option value="score" disabled={!graphView.hasEmotionScore}>emotion score</option>
                                </select>
                            </label>

                            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300/40 px-2 py-2 break-keep">
                                최근
                                <select value={recentDays} onChange={(event) => setRecentDays(Number(event.target.value))} className={selectClass}>
                                    <option value={7}>7일</option>
                                    <option value={14}>14일</option>
                                </select>
                            </label>

                            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300/40 px-2 py-2 break-keep">
                                기준
                                <select value={baselineDays} onChange={(event) => setBaselineDays(Number(event.target.value))} className={selectClass}>
                                    <option value={28}>28일</option>
                                    <option value={56}>56일</option>
                                </select>
                            </label>

                            <div className="grid grid-cols-1 gap-2">
                                <button
                                    type="button"
                                    onClick={resetGraphViewport}
                                    className={`rounded-lg px-3 py-2 font-semibold ${isDark ? "bg-slate-700 hover:bg-slate-600" : "bg-slate-200 hover:bg-slate-300"}`}
                                >
                                    뷰 리셋
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode("list")}
                                    className={`rounded-lg px-4 py-2 text-sm font-semibold ${isDark ? "bg-slate-100 text-slate-800 hover:bg-white" : "bg-slate-800 text-white hover:bg-slate-700"}`}
                                >
                                    리스트 보기
                                </button>
                            </div>
                        </div>

                        <p className={`mt-3 text-xs ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                            Nodes {graphView.graphNodeCount} / Edges {graphView.graphEdgeCount} / 기억 노드 {graphView.visibleMemoryCount}개                        </p>

                        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
                            <div
                                ref={graphPanelRef}
                                className={`rounded-2xl border p-1.5 sm:p-2 ${panelClass}`}
                                style={{ overscrollBehavior: "none" }}
                            >
                                <svg
                                    ref={svgRef}
                                    viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
                                    className={`h-auto w-full aspect-[4/3] max-h-[78vh] rounded-xl sm:aspect-[16/10] md:h-[600px] md:max-h-none md:aspect-auto ${isGraphPanning ? "cursor-grabbing" : "cursor-grab"}`}
                                    style={{ background: graphCanvasBg, touchAction: "none", overscrollBehavior: "contain" }}
                                    onPointerDown={handleGraphPointerDown}
                                    onPointerMove={handleGraphPointerMove}
                                    onPointerUp={handleGraphPointerUp}
                                    onPointerCancel={handleGraphPointerUp}
                                    onClick={(event) => {
                                        if (event.target === event.currentTarget) {
                                            setSelectedGraphNodeKey(null);
                                        }
                                    }}
                                >
                                    <defs>
                                        {graphView.positionedNodes
                                            .filter((node) => node.type === "emotion")
                                            .map((node) => {
                                                const id = `glow-${hashString(node.key)}`;
                                                return (
                                                    <radialGradient id={id} key={id}>
                                                        <stop offset="0%" stopColor={colorWithAlpha(node.color, isDark ? 0.36 : 0.24)} />
                                                        <stop offset="55%" stopColor={colorWithAlpha(node.color, isDark ? 0.18 : 0.12)} />
                                                        <stop offset="100%" stopColor={colorWithAlpha(node.color, 0)} />
                                                    </radialGradient>
                                                );
                                            })}
                                    </defs>

                                    <g transform={`matrix(${graphZoom},0,0,${graphZoom},${graphPan.x},${graphPan.y})`}>
                                        <circle cx={GRAPH_WIDTH / 2} cy={GRAPH_HEIGHT / 2} r={112} fill="none" stroke={isDark ? "rgba(148,163,184,0.2)" : "rgba(148,163,184,0.25)"} strokeWidth="1" />
                                        <circle cx={GRAPH_WIDTH / 2} cy={GRAPH_HEIGHT / 2} r={210} fill="none" stroke={isDark ? "rgba(148,163,184,0.15)" : "rgba(148,163,184,0.2)"} strokeWidth="1" />
                                        <circle cx={GRAPH_WIDTH / 2} cy={GRAPH_HEIGHT / 2} r={290} fill="none" stroke={isDark ? "rgba(148,163,184,0.1)" : "rgba(148,163,184,0.16)"} strokeWidth="1" />

                                        {graphView.positionedNodes
                                            .filter((node) => node.type === "emotion")
                                            .map((node) => {
                                                const label = String(node.label ?? "");
                                                const metric = graphView.emotionMetricByLabel.get(label) ?? 0;
                                                if (graphView.maxEmotionMetric <= 0 || metric <= 0) {
                                                    return null;
                                                }
                                                const ratio = metric / graphView.maxEmotionMetric;
                                                const radius = Math.max(24, node.radius * 2.8 + ratio * 90);
                                                return (
                                                    <circle
                                                        key={`glow-circle-${node.key}`}
                                                        cx={node.x}
                                                        cy={node.y}
                                                        r={radius}
                                                        fill={`url(#glow-${hashString(node.key)})`}
                                                    />
                                                );
                                            })}

                                        {graphView.selectedEdges.map((edge) => {
                                            if (!graphActiveNodeKey || !graphView.focusEdgeKeys.has(edge.edgeKey)) {
                                                return null;
                                            }
                                            const source = graphView.positionedNodeByKey.get(edge.source);
                                            const target = graphView.positionedNodeByKey.get(edge.target);
                                            if (!source || !target) {
                                                return null;
                                            }
                                            return (
                                                <line
                                                    key={edge.edgeKey}
                                                    x1={source.x}
                                                    y1={source.y}
                                                    x2={target.x}
                                                    y2={target.y}
                                                    stroke={isDark ? "rgba(148,163,184,0.24)" : "rgba(71,85,105,0.2)"}
                                                    strokeWidth={Math.max(0.45, (edge.weight ?? 1) * 0.55)}
                                                />
                                            );
                                        })}

                                        {graphView.positionedNodes.map((node) => {
                                            const isSelected = selectedGraphNodeKey === node.key;
                                            const isHovered = hoveredGraphNodeKey === node.key;
                                            const inNeighborhood = graphActiveNodeKey ? graphView.focusNodeKeys.has(node.key) : false;
                                            let fill = node.color;
                                            let stroke = isDark ? "rgba(15,23,42,0.55)" : "rgba(2,6,23,0.25)";
                                            let strokeWidth = 1;
                                            let opacity = 1;

                                            if (graphActiveNodeKey) {
                                                if (isSelected) {
                                                    fill = isDark ? "#f8fafc" : "#0f172a";
                                                    stroke = isDark ? "#38bdf8" : "#0284c7";
                                                    strokeWidth = 2;
                                                } else if (!inNeighborhood) {
                                                    fill = colorWithAlpha(node.color, isDark ? 0.22 : 0.32);
                                                    opacity = 0.55;
                                                }
                                            }
                                            if (isHovered) {
                                                stroke = isDark ? "#e2e8f0" : "#0f172a";
                                                strokeWidth = Math.max(strokeWidth, 1.6);
                                            }

                                            const shouldShowLabel = node.type !== "memory" || isSelected || isHovered;
                                            const label = node.type === "memory"
                                                ? String(node.label ?? "").slice(0, 22)
                                                : node.visibleLabel;

                                            return (
                                                <g key={node.key}>
                                                    <circle
                                                        cx={node.x}
                                                        cy={node.y}
                                                        r={node.radius}
                                                        fill={fill}
                                                        opacity={opacity}
                                                        stroke={stroke}
                                                        strokeWidth={strokeWidth}
                                                        className="cursor-pointer transition-all"
                                                        onMouseEnter={() => setHoveredGraphNodeKey(node.key)}
                                                        onMouseLeave={() => setHoveredGraphNodeKey((prev) => (prev === node.key ? null : prev))}
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            setSelectedGraphNodeKey(node.key);
                                                        }}
                                                    />
                                                    {node.type === "memory" && graphZoom > 1.25 && (
                                                        <circle
                                                            cx={node.x}
                                                            cy={node.y}
                                                            r={node.radius + 1.2}
                                                            fill="none"
                                                            stroke={colorWithAlpha(node.color, isDark ? 0.42 : 0.35)}
                                                            strokeWidth={Math.max(0.8, node.radius * 0.3)}
                                                            pointerEvents="none"
                                                        />
                                                    )}
                                                    {shouldShowLabel && label && (
                                                        <text
                                                            x={node.x}
                                                            y={node.y - (node.radius + 8)}
                                                            textAnchor="middle"
                                                            className={`text-[11px] font-medium ${isDark ? "fill-slate-100" : "fill-slate-700"}`}
                                                            pointerEvents="none"
                                                        >
                                                            {label}
                                                        </text>
                                                    )}
                                                </g>
                                            );
                                        })}
                                    </g>
                                </svg>
                                <p className={`mt-2 text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                    마우스 휠 또는 모바일 핀치로 확대/축소, 빈 배경 드래그로 이동, 노드 클릭으로 상세를 확인할 수 있습니다.
                                </p>
                            </div>

                            <aside className={`rounded-2xl border p-4 ${panelClass}`}>
                                <div className="max-h-[560px] overflow-y-auto space-y-4">
                                    <section className={`rounded-xl border p-3 ${isDark ? "border-slate-600 bg-slate-800/60" : "border-slate-200 bg-white"}`}>
                                        {!graphView.selectedNode && (
                                            <p className={`text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-500"}`}>
                                                노드를 선택하면 상세 정보를 볼 수 있습니다.
                                            </p>
                                        )}
                                        {graphView.selectedNode && (
                                            <div className="space-y-3">
                                                {selectedGraphHistoryId && (
                                                    <button
                                                        type="button"
                                                        className={`rounded-md px-2 py-1 text-xs font-semibold ${isDark ? "bg-sky-600 text-white hover:bg-sky-500" : "bg-sky-100 text-sky-800 border border-sky-200 hover:bg-sky-200"}`}
                                                        onClick={() => {
                                                            setSelectedId(selectedGraphHistoryId);
                                                            setViewMode("list");
                                                        }}
                                                    >
                                                        히스토리에서 보기
                                                    </button>
                                                )}
                                                <div>
                                                    <p className="text-xs text-slate-400">노드 유형</p>
                                                    <p className="text-sm font-semibold">{graphView.selectedNode.type ?? "unknown"}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-400">라벨</p>
                                                    <p className="text-sm font-semibold break-words">{graphView.selectedNode.label ?? graphView.selectedNode.key}</p>
                                                </div>
                                                {graphView.selectedNode.ts && (
                                                    <div>
                                                        <p className="text-xs text-slate-400">시각</p>
                                                        <p className="text-sm">{graphView.selectedNode.ts}</p>
                                                    </div>
                                                )}
                                                {graphView.selectedNode.full_text && (
                                                    <div>
                                                        <p className="text-xs text-slate-400">원문</p>
                                                        <p className="text-sm leading-6 whitespace-pre-wrap break-words max-h-[260px] overflow-y-auto">{graphView.selectedNode.full_text}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </section>

                                    <section>
                                        <p className={`text-xs font-semibold ${isDark ? "text-slate-300" : "text-slate-500"}`}>
                                            변화 알림 (최근 {recentDays}일 vs 이전 {baselineDays}일)
                                        </p>
                                        {graphAlerts.length === 0 && (
                                            <p className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                                표본이 충분하지 않아 알림을 만들지 못했습니다.
                                            </p>
                                        )}
                                        {graphAlerts.map((alert) => (
                                            <div key={alert.id} className={`mt-2 rounded-xl border p-3 ${isDark ? "border-slate-600 bg-slate-800/70" : "border-slate-200 bg-slate-50"}`}>
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="text-sm font-semibold">{alert.title}</p>
                                                    <span className={`text-[10px] font-bold uppercase ${alert.severity === "high" ? "text-rose-500" : alert.severity === "medium" ? "text-amber-500" : "text-slate-500"}`}>
                                                        {alert.severity}
                                                    </span>
                                                </div>
                                                <p className={`mt-1 text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>{alert.detail}</p>
                                                <p className={`mt-1 text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                                    {alert.window.baseline} / {alert.window.recent}
                                                </p>
                                                {alert.evidence.slice(0, 2).map((evidence) => (
                                                    <p key={`${alert.id}-${evidence.key}`} className={`mt-1 text-[11px] leading-5 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                                                        [{String(evidence.ts).slice(0, 16)}] {String(evidence.text).slice(0, 46)}...
                                                    </p>
                                                ))}
                                                <div className="mt-2 flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        className={`rounded-md px-2 py-1 text-xs font-semibold ${isDark ? "bg-slate-700 hover:bg-slate-600" : "bg-white border border-slate-300 hover:bg-slate-100"}`}
                                                        onClick={() => {
                                                            setSelectedGraphNodeKey(null);
                                                            setGraphEmotionFilter(alert.filters.emotion);
                                                            setGraphRelationFilter(alert.filters.relation);
                                                        }}
                                                    >
                                                        Open in Graph
                                                    </button>
                                                    {alert.evidence[0]?.key && (
                                                        <button
                                                            type="button"
                                                            className={`rounded-md px-2 py-1 text-xs font-semibold ${isDark ? "bg-slate-700 hover:bg-slate-600" : "bg-white border border-slate-300 hover:bg-slate-100"}`}
                                                            onClick={() => setSelectedGraphNodeKey(alert.evidence[0].key)}
                                                        >
                                                            Show Evidence
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </section>
                                </div>
                            </aside>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (selectedItem) {
        const sentiment = getSentimentStyle(selectedItem.summary?.sentiment ?? "");
        const title = buildTitle(selectedItem);
        const summaryText = selectedItem.summary?.context_summary?.trim() || "요약 정보가 없습니다.";
        const messages = parseTranscript(selectedItem.full_transcript);

        return (
            <div className="h-full bg-[#F0EEE9] pt-24 pb-8 px-6 overflow-y-auto">
                <div className="mx-auto w-full max-w-4xl space-y-4">
                    <button
                        type="button"
                        onClick={() => setSelectedId(null)}
                        className="inline-flex items-center gap-1 rounded-full bg-white/50 backdrop-blur border border-white/60 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white/80 transition-colors shadow-sm"
                    >
                        <ChevronLeft size={16} />
                        목록으로
                    </button>

                    <article className="relative overflow-hidden rounded-[28px] border border-white/60 bg-white/70 backdrop-blur-md px-5 py-5 shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
                        <div className={`absolute inset-x-0 top-0 h-[6px] ${sentiment.accentClass}`} />
                        <div className="flex items-start justify-between gap-3">
                            <h4 className="text-[20px] font-bold text-gray-900 tracking-[-0.01em] leading-tight">{title}</h4>
                            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm ${sentiment.className}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${sentiment.dotClass}`} />
                                {sentiment.label}
                            </span>
                        </div>

                        <div className="mt-5 rounded-2xl bg-white px-4 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] border border-white/60">
                            <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-500">
                                <MessageSquareText size={16} />
                                요약
                            </div>
                            <p className="mt-2 text-[15px] font-medium text-slate-800 leading-relaxed">{summaryText}</p>
                        </div>

                        <div className="mt-4 rounded-2xl bg-white px-4 py-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] border border-white/60">
                            <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-500 mb-6">
                                <ScrollText size={16} />
                                대화 전문
                            </div>

                            {messages.length === 0 ? (
                                <p className="text-[14px] text-gray-700 leading-6">대화 전문이 없습니다.</p>
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
                                            <div key={`${selectedItem.id}-${idx}`} className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
                                                <div className={`relative max-w-[85%] px-4 py-3 text-[15px] tracking-tight leading-relaxed break-words rounded-2xl shadow-sm ${bubbleColorClass}`}>
                                                    <p className="whitespace-pre-wrap relative z-10">{message.text}</p>
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
                                        <p className="text-xs font-semibold text-gray-500 mb-2">날짜 범위</p>

                                        <label className="block text-xs text-gray-500 mb-1">시작일</label>
                                        <input
                                            type="date"
                                            value={dateFrom}
                                            onChange={(event) => setDateFrom(event.target.value)}
                                            className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-sm outline-none mb-2"
                                        />

                                        <label className="block text-xs text-gray-500 mb-1">종료일</label>
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
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
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
                            const sentiment = getSentimentStyle(item.summary?.sentiment ?? "");
                            const title = buildTitle(item);
                            const summaryPreview = item.summary?.context_summary?.trim() || "요약 정보가 없습니다.";

                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setSelectedId(item.id)}
                                    className="group relative overflow-hidden rounded-[24px] border border-white/60 bg-white/70 backdrop-blur-md px-5 py-4 text-left shadow-[0_4px_16px_rgba(0,0,0,0.03)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
                                    style={{
                                        animation: "historyCardIn 0.2s ease-out both",
                                        animationDelay: `${Math.min(index, 6) * 40}ms`,
                                    }}
                                >
                                    <div className={`absolute inset-x-0 top-0 h-1 ${sentiment.accentClass}`} />

                                    <div className="flex items-start justify-between gap-3 relative z-10">
                                        <h4 className="text-[18px] font-bold text-gray-900 tracking-[-0.01em] leading-tight">{title}</h4>

                                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm bg-white ${sentiment.className}`}>
                                            <span className={`h-1.5 w-1.5 rounded-full ${sentiment.dotClass}`} />
                                            {sentiment.label}
                                        </span>
                                    </div>

                                    <div className="mt-4 rounded-2xl bg-white/80 px-4 py-3.5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] border border-white">
                                        <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-500">
                                            <MessageSquareText size={14} />
                                            요약
                                        </div>
                                        <p className="mt-2.5 text-[14px] text-gray-700 leading-6" style={clampThreeLines}>
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

