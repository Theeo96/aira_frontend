import React, { useState } from "react";
import { Search } from "lucide-react";

interface HistoryItem {
    id: string;
    title: string;
    date: string;
}

interface HistoryPageProps {
    historyData: HistoryItem[];
    viewMode: "graph" | "list";
    setViewMode: (mode: "graph" | "list") => void;
}

const HistoryPage: React.FC<HistoryPageProps> = ({ historyData, viewMode, setViewMode }) => {
    if (viewMode === "graph") {
        // Mock data for emotion nodes
        const nodes = [
            { id: 1, label: "기쁨", x: 50, y: 30, size: 80, color: "#FFEB3B" },
            { id: 2, label: "평온", x: 20, y: 50, size: 60, color: "#81C784" },
            { id: 3, label: "설렘", x: 70, y: 60, size: 50, color: "#F06292" },
            { id: 4, label: "기대", x: 40, y: 75, size: 40, color: "#64B5F6" },
            { id: 5, label: "뿌듯", x: 80, y: 25, size: 45, color: "#BA68C8" },
        ];

        return (
            <div className="h-full bg-white pt-24 pb-8 flex flex-col items-center">
                <div className="flex-1 w-full relative overflow-hidden flex flex-col items-center">
                    <h3 className="text-xl font-bold mb-4 text-gray-800">
                        최근 대화의 감정 흐름
                    </h3>

                    <div className="flex-1 w-full relative">
                        <svg viewBox="0 0 100 100" className="w-full h-full">
                            {/* Connection lines */}
                            <line x1="50" y1="30" x2="20" y2="50" stroke="#E0E0E0" strokeWidth="0.5" />
                            <line x1="50" y1="30" x2="70" y2="60" stroke="#E0E0E0" strokeWidth="0.5" />
                            <line x1="50" y1="30" x2="80" y2="25" stroke="#E0E0E0" strokeWidth="0.5" />
                            <line x1="20" y1="50" x2="40" y2="75" stroke="#E0E0E0" strokeWidth="0.5" />
                            <line x1="70" y1="60" x2="40" y2="75" stroke="#E0E0E0" strokeWidth="0.5" />

                            {nodes.map((node) => (
                                <g key={node.id} className="cursor-pointer">
                                    <circle
                                        cx={node.x}
                                        cy={node.y}
                                        r={node.size / 10}
                                        fill={node.color}
                                        className="opacity-80 animate-pulse"
                                        style={{ animationDuration: `${2 + node.id}s` }}
                                    />
                                    <text
                                        x={node.x}
                                        y={node.y}
                                        textAnchor="middle"
                                        dy="0.3em"
                                        className="text-[3px] font-bold fill-gray-800 pointer-events-none"
                                    >
                                        {node.label}
                                    </text>
                                </g>
                            ))}
                        </svg>
                    </div>
                </div>

                <button
                    onClick={() => setViewMode("list")}
                    className="w-[80%] py-4 bg-[#F0EEE9] rounded-2xl font-bold text-lg shadow-sm active:scale-95 transition-transform"
                >
                    전체 대화 목록 보기
                </button>
            </div>
        );
    }

    return (
        <div className="h-full bg-white pt-24">
            <div className="px-6 py-4">
                <div className="flex justify-between items-center mb-6">
                    <button
                        onClick={() => setViewMode("graph")}
                        className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-bold flex items-center gap-2"
                    >
                        〈 감정 그래프
                    </button>
                    <div className="relative flex-1 ml-4">
                        <Search
                            size={20}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                            type="text"
                            placeholder="검색"
                            className="w-full py-2 pl-10 pr-4 bg-[#F0EEE9] rounded-lg outline-none text-sm"
                        />
                    </div>
                </div>
            </div>
            <div className="overflow-y-auto px-6 h-[calc(100%-120px)]">
                {historyData.map((item) => (
                    <div
                        key={item.id}
                        className="py-6 border-b border-gray-100 flex flex-col cursor-pointer active:bg-gray-50 transition-colors px-2"
                    >
                        <span className="text-2xl font-medium text-gray-900">
                            {item.title}
                        </span>
                        <span className="text-sm text-gray-400 mt-2 font-bold">
                            {item.date}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HistoryPage;
