import React, { useState } from "react";
import { FileText, Image as ImageIcon, FolderArchive, ArrowUp } from "lucide-react";
import { Persona } from "../../types";

interface ChatFilePageProps {
    setAppState: (state: any) => void;
    isListening: boolean;
    setIsListening: (listening: boolean) => void;
    activePersona: Persona;
}

import { AppState } from "../../types";

const ChatFilePage: React.FC<ChatFilePageProps> = ({
    setAppState,
    isListening,
    setIsListening,
    activePersona,
}) => {
    const [touchStartY, setTouchStartY] = useState(0);

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStartY(e.touches[0].clientY);
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        const touchEndY = e.changedTouches[0].clientY;
        // Swipe down
        if (touchEndY - touchStartY > 50) {
            setAppState(AppState.HOME);
        }
    };

    const handleWheel = (e: React.WheelEvent) => {
        // Scroll down
        if (e.deltaY < -30) {
            setAppState(AppState.HOME);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        // You would handle the actual files here
        if (e.target.files && e.target.files.length > 0) {
            console.log("Selected files:", e.target.files);
            // Optionally auto-close or enable the button
        }
    };

    return (
        <div
            className="flex flex-col h-full bg-[#FAFAFA] pb-6 px-6 relative"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
        >
            {/* 스와이프 다운 인디케이터 (상단) */}
            <div
                className="w-full flex flex-col items-center py-4 cursor-pointer relative"
                onClick={() => setAppState(AppState.HOME)}
            >
                <div className="w-12 h-1 bg-[#DDDDDD] rounded-full mb-3"></div>
                <div className="text-[13px] font-bold text-gray-500 tracking-[0.1em] uppercase">Upload</div>
            </div>

            {/* Main Display Card */}
            <div className="flex-1 w-full bg-white rounded-[32px] shadow-[var(--shadow-crisp)] relative overflow-hidden flex flex-col items-center pt-16">
                <h2 className="text-[22px] font-bold text-center mb-10 text-gray-900 tracking-tight leading-relaxed">
                    대화에 필요한 자료를<br />추가하시겠어요?
                </h2>

                <div className="flex justify-center gap-4 md:gap-6 z-10 w-full px-4 md:px-8">
                    {/* 파일 선택 */}
                    <label className="flex-1 aspect-square bg-[#F7F7F5] rounded-[24px] flex flex-col items-center justify-center gap-3 cursor-pointer active:scale-95 transition-transform hover:bg-[#F0F0ED]">
                        <input type="file" multiple accept="*/*" className="hidden" onChange={handleFileUpload} />
                        <FileText size={32} className="text-[#333333]" strokeWidth={1.5} />
                        <span className="text-sm font-medium text-gray-700">파일</span>
                    </label>

                    {/* 사진 선택 */}
                    <label className="flex-1 aspect-square bg-[#F7F7F5] rounded-[24px] flex flex-col items-center justify-center gap-3 cursor-pointer active:scale-95 transition-transform hover:bg-[#F0F0ED]">
                        <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} />
                        <ImageIcon size={32} className="text-[#333333]" strokeWidth={1.5} />
                        <span className="text-sm font-medium text-gray-700">사진</span>
                    </label>

                    {/* 폴더 선택 (웹킷 속성 사용) */}
                    <label className="flex-1 aspect-square bg-[#F7F7F5] rounded-[24px] flex flex-col items-center justify-center gap-3 cursor-pointer active:scale-95 transition-transform hover:bg-[#F0F0ED]">
                        <input type="file" {...{ webkitdirectory: "true", directory: "true" } as any} className="hidden" onChange={handleFileUpload} />
                        <FolderArchive size={32} className="text-[#333333]" strokeWidth={1.5} />
                        <span className="text-sm font-medium text-gray-700">폴더</span>
                    </label>
                </div>

                {/* GPT-4o-mini Guidelines */}
                <div className="mt-8 px-8 w-full max-w-[400px]">
                    <div className="flex flex-col gap-1.5 pt-4 border-t border-[#F0F0F0]">
                        <div className="text-[13px] font-bold text-[#555555] flex items-center gap-1.5">
                            <span className="w-1 h-3 bg-[color:var(--color-persona-primary)] rounded-full inline-block"></span>
                            GPT 4o-mini 지원 규격
                        </div>
                        <p className="text-[12px] text-[#777777] leading-relaxed">
                            PDF, TXT, DOCX, CSV, JPG, PNG 등<br />단일 파일 최대 <span className="font-semibold text-[#555555]">20MB</span> 권장.
                        </p>
                        <p className="text-[11px] text-[#999999] mt-1 leading-tight">
                            * 기기 내 폴더 원본 업로드 시, 모든 파일이 개별 분리되어 전송되므로 압축(ZIP) 방식보다 인식률이 높습니다.
                        </p>
                    </div>
                </div>
            </div>

            {/* Bottom Single Button */}
            <div className="h-20 flex items-center justify-center mt-6">
                <button
                    onClick={() => setAppState(AppState.HOME)}
                    className="w-full h-14 bg-[color:var(--color-persona-primary)] rounded-[16px] flex items-center justify-center gap-2 shadow-[var(--shadow-crisp)] active:scale-[0.98] transition-all text-white font-bold text-lg"
                >
                    <ArrowUp size={20} strokeWidth={2.5} />
                    업로드
                </button>
            </div>
        </div>
    );
};

export default ChatFilePage;
