import React, { useState } from "react";
import { ChevronUp, FileText, Image as ImageIcon, Link as LinkIcon } from "lucide-react";

interface AiraPocketProps {
    isOpen: boolean;
    onToggle: () => void;
}

export default function AiraPocket({ isOpen, onToggle }: AiraPocketProps) {
    const [activeTab, setActiveTab] = useState<"files" | "photos" | "links">("files");

    return (
        <div
            className={`absolute bottom-[88px] left-0 w-full bg-white/70 backdrop-blur-3xl border-t border-white/60 shadow-[var(--shadow-crisp)] rounded-t-[32px] flex flex-col transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] z-20 ${isOpen ? "h-[350px] translate-y-0 opacity-100 pointer-events-auto" : "h-[0px] translate-y-full opacity-0 overflow-hidden pointer-events-none"
                }`}
        >
            {/* Drag Handle Indicator */}
            <div
                className="w-full h-8 flex items-center justify-center cursor-pointer pt-2 shrink-0 tap-feedback"
                onClick={onToggle}
            >
                <div className="w-[40px] h-[4px] bg-[#E0E0E0] rounded-full"></div>
            </div>

            {/* Pocket Header */}
            <div className="px-6 flex items-center justify-between shrink-0 mb-4">
                <h3 className="text-[18px] font-bold text-[#333333]">AIRA Pocket</h3>
                <div className="flex gap-2 bg-[#F5F5F5] p-1 rounded-full">
                    <button
                        onClick={() => setActiveTab("files")}
                        className={`text-[12px] px-3 py-1 rounded-full transition-colors ${activeTab === 'files' ? 'bg-white shadow-sm font-semibold' : 'text-[#666666]'}`}
                    >
                        Files
                    </button>
                    <button
                        onClick={() => setActiveTab("photos")}
                        className={`text-[12px] px-3 py-1 rounded-full transition-colors ${activeTab === 'photos' ? 'bg-white shadow-sm font-semibold' : 'text-[#666666]'}`}
                    >
                        Photos
                    </button>
                </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 px-6 pb-6 overflow-y-auto">
                <div className="w-full h-[120px] mb-4 border border-dashed border-[#BDBDBD] bg-white/50 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-[var(--color-persona-primary)] transition-colors">
                    <span className="text-[24px] mb-2 text-[#999]">📤</span>
                    <span className="text-[14px] text-[#666]">Drop {activeTab} here</span>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-2 noscrollbar">
                    {/* Dummy Items */}
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="min-w-[100px] h-[100px] bg-white/80 border border-white/60 rounded-2xl shadow-sm flex flex-col items-center justify-center shrink-0">
                            {activeTab === 'files' && <FileText size={24} className="text-[#BDBDBD] mb-2" />}
                            {activeTab === 'photos' && <ImageIcon size={24} className="text-[#BDBDBD] mb-2" />}
                            {activeTab === 'links' && <LinkIcon size={24} className="text-[#BDBDBD] mb-2" />}
                            <span className="text-[11px] text-[#666] truncate w-[80%] text-center">Item {i}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
