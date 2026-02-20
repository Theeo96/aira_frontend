import React from "react";
import { Mic, FileText, Image as ImageIcon, Camera, Keyboard } from "lucide-react";
import { Persona } from "../../types";

interface ChatFilePageProps {
    setAppState: (state: any) => void; // Using 'any' briefly to avoid circular import or verbose import, ideally import AppState
    isListening: boolean;
    setIsListening: (listening: boolean) => void;
    activePersonas: Persona[];
}

// Note: In a real app we would import AppState properly. Assuming simpler props for now.
import { AppState } from "../../types";

const ChatFilePage: React.FC<ChatFilePageProps> = ({
    setAppState,
    isListening,
    setIsListening,
    activePersonas,
}) => {
    return (
        <div className="flex flex-col h-full pt-20 pb-10 px-6">
            {/* Main Display Card */}
            <div className="flex-1 w-full bg-white rounded-[40px] shadow-sm relative overflow-hidden flex flex-col items-center pt-24">
                <h2 className="text-2xl font-bold text-center mb-16 leading-relaxed text-gray-900 z-10 px-6">
                    대화에 필요한 자료를
                    <br />
                    추가하시겠어요?
                </h2>

                <div className="flex justify-center gap-6 z-10 w-full px-6">
                    <button className="flex-1 aspect-square bg-[#F7F7F5] rounded-[24px] flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform hover:bg-[#F0F0ED]">
                        <FileText size={32} className="text-gray-700" strokeWidth={1.5} />
                        <span className="text-xs font-medium text-gray-500">파일</span>
                    </button>
                    <button className="flex-1 aspect-square bg-[#F7F7F5] rounded-[24px] flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform hover:bg-[#F0F0ED]">
                        <ImageIcon size={32} className="text-gray-700" strokeWidth={1.5} />
                        <span className="text-xs font-medium text-gray-500">사진</span>
                    </button>
                    <button className="flex-1 aspect-square bg-[#F7F7F5] rounded-[24px] flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform hover:bg-[#F0F0ED]">
                        <Camera size={32} className="text-gray-700" strokeWidth={1.5} />
                        <span className="text-xs font-medium text-gray-500">카메라</span>
                    </button>
                </div>
            </div>

            {/* Bottom Buttons */}
            <div className="h-24 flex items-center justify-center gap-6 mt-6">
                <button
                    onClick={() => setAppState(AppState.KEYBOARD)}
                    className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg border border-gray-100 active:scale-95 transition-transform"
                >
                    <Keyboard size={32} className="text-gray-900" />
                </button>

                <button
                    onClick={() => setIsListening(!isListening)}
                    className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg border border-gray-100 active:scale-95 transition-transform"
                >
                    <Mic
                        size={32}
                        className={`${isListening ? (activePersonas.includes("lumi") ? "text-[#FF8A65]" : "text-[#4DD0E1]") : "text-gray-900"}`}
                    />
                </button>
            </div>
        </div>
    );
};

export default ChatFilePage;
