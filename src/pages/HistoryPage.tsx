import React, { useMemo, useState } from "react";
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

type Speaker = "ai" | "user" | "unknown";

interface TranscriptMessage {
    speaker: Speaker;
    text: string;
}

const clampThreeLines: React.CSSProperties = {
    display: "-webkit-box",
    WebkitLineClamp: 3,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
};

const speakerTokenRegex = /(AI|Assistant|Bot|AIRA|Lumi|Rami|User|사용자|유저|나|Me)\s*[:：]/gi;

const normalizeSpeaker = (token: string): Speaker => {
    const key = token.toLowerCase();
    if (["user", "사용자", "유저", "나", "me"].includes(key)) {
        return "user";
    }
    if (["ai", "assistant", "bot", "aira", "lumi", "rami"].includes(key)) {
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

    if (viewMode === "graph") {
        const positive = historyData.filter((item) => {
            const sentiment = item.summary?.sentiment ?? "";
            return sentiment.toLowerCase().includes("positive") || sentiment.includes("긍정");
        }).length;

        const negative = historyData.filter((item) => {
            const sentiment = item.summary?.sentiment ?? "";
            return sentiment.toLowerCase().includes("negative") || sentiment.includes("부정");
        }).length;

        const neutral = Math.max(historyData.length - positive - negative, 0);

        return (
            <div className="h-full bg-[#F0EEE9] pt-24 pb-8 px-6 flex flex-col items-center">
                <div className="mx-auto w-full max-w-4xl flex-1 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800">감정 요약</h3>
                    <p className="mt-2 text-sm text-gray-500">전체 {historyData.length}개의 대화를 분석한 간단한 분포입니다.</p>

                    <div className="mt-6 grid grid-cols-3 gap-3">
                        <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
                            <p className="text-xs font-semibold text-emerald-700">긍정</p>
                            <p className="mt-2 text-2xl font-bold text-emerald-800">{positive}</p>
                        </div>
                        <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
                            <p className="text-xs font-semibold text-gray-700">중립</p>
                            <p className="mt-2 text-2xl font-bold text-gray-800">{neutral}</p>
                        </div>
                        <div className="rounded-2xl bg-rose-50 border border-rose-100 p-4">
                            <p className="text-xs font-semibold text-rose-700">부정</p>
                            <p className="mt-2 text-2xl font-bold text-rose-800">{negative}</p>
                        </div>
                    </div>
                </div>

                <div className="mx-auto w-full max-w-4xl">
                    <button
                        onClick={() => setViewMode("list")}
                        className="mt-5 w-full py-3.5 bg-slate-800 text-white rounded-2xl font-bold text-base shadow-lg shadow-slate-200 hover:bg-slate-700 active:scale-[0.99] transition-all"
                    >
                        카드 목록 보기
                    </button>
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
                                        const isRumi = persona === "rumi";

                                        // 1. User gets the soft gray tone with user tail
                                        // 2. AI gets the Persona color with AI tail
                                        const bubbleColorClass = isUser
                                            ? "bg-[#E5E5EA] text-[#1F2937] imessage-tail-user"
                                            : isRumi
                                                ? "bg-[#FF9A76] text-white imessage-tail-ai"
                                                : "bg-[#52B2CF] text-white imessage-tail-ai";

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
        <div className="h-full bg-[#F0EEE9] pt-24">
            <div className="px-6 py-4">
                <div className="mx-auto w-full max-w-4xl">
                    <div className="mb-5 space-y-2.5">
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
