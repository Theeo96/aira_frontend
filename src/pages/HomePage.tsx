import React, { useState } from "react";
import { Mic, MicOff, Keyboard, ArrowRight, Camera, MonitorUp } from "lucide-react";
import { Persona } from "../../types";

interface HomePageProps {
    activeMessage: string;
    activePersonas: Persona[];
    isListening: boolean;
    inputText: string;
    setInputText: (text: string) => void;
    onSend: () => void;
    onMicToggle: () => void;
    onCameraClick: () => void;
}

const HomePage: React.FC<HomePageProps> = ({
    activeMessage,
    activePersonas,
    isListening,
    inputText,
    setInputText,
    onSend,
    onMicToggle,
    onCameraClick,
}) => {
    // Local state to toggle between icon view and input view
    const [showInput, setShowInput] = useState(false);

    return (
        // [Container] 전체 홈 화면 컨테이너 (Full Height)
        <div
            className="home-page-container flex flex-col h-full bg-white relative overflow-hidden"
            data-section="home-container"
        >
            {/* [Aurora Effect] - Moved to background level to cover full screen */}
            <div
                className={`aurora-effect-container absolute inset-0 pointer-events-none transition-opacity duration-1000 ${isListening ? "opacity-100" : "opacity-30"}`}
                data-section="aurora-effect"
            >
                {/* Lumi: Pastel Orange - Bottom Left */}
                {activePersonas.includes("lumi") && (
                    <div
                        className="aurora-orb absolute"
                        style={{
                            backgroundColor: "#FFCC80", // Pastel Orange

                            // [Option 1: Height-based Circle (Original)]
                            // width: "60vh", height: "60vh", bottom: "-15vh", left: "-15vh",

                            // [Option 2: Width-based Circle]
                            // width: "70vw", height: "70vw", bottom: "-10vw", left: "-10vw",

                            // [Option 3: Ellipse with Proportional Overlap]
                            // width: "80vw", height: "50vh", bottom: "-15vh", left: "-15vw",

                            // [Option 4: Ellipse with Constant Overlap (~150px)]
                            // Goal: Overlap 150px centered at 50vw.
                            // Center of overlap = 50vw.
                            // Left Orb Right Edge = 50vw + 75px. 
                            // Left Position = Edge - Width = (50vw + 75px) - 80vw = calc(75px - 30vw)
                            width: "80vw",
                            height: "50vh",
                            bottom: "-15vh",
                            left: "calc(75px - 30vw)",

                            // Animation is handled by .aurora-orb class in index.css
                            zIndex: 0
                        }}
                    />
                )}

                {/* Rami: Pastel Sky Blue - Bottom Right */}
                {activePersonas.includes("rami") && (
                    <div
                        className="aurora-orb absolute"
                        style={{
                            backgroundColor: "#81D4FA", // Pastel Sky Blue

                            // [Option 1: Height-based Circle (Original)]
                            // width: "60vh", height: "60vh", bottom: "-15vh", right: "-15vh",

                            // [Option 2: Width-based Circle]
                            // width: "70vw", height: "70vw", bottom: "-10vw", right: "-10vw",

                            // [Option 3: Ellipse with Proportional Overlap]
                            // width: "80vw", height: "50vh", bottom: "-15vh", right: "-15vw",

                            // [Option 4: Ellipse with Constant Overlap (~150px)]
                            // Similar logic for Right Orb (positioned from right)
                            // Right Orb Left Edge = 50vw - 75px.
                            // Right Position (distance from right edge of screen) = 100vw - (Right Orb Right Edge)
                            // Right Orb Right Edge = Left Edge + Width = (50vw - 75px) + 80vw = 130vw - 75px.
                            // Right = 100vw - (130vw - 75px) = 100vw - 130vw + 75px = -30vw + 75px = calc(75px - 30vw).
                            width: "80vw",
                            height: "50vh",
                            bottom: "-15vh",
                            right: "calc(75px - 30vw)",

                            animationDelay: "2s",
                            zIndex: 0
                        }}
                    />
                )}
            </div>

            {/* [Main Content] 상단 메인 디스플레이 영역 (Message) */}
            <div
                className="main-display-area flex-1 flex flex-col items-center justify-center relative z-10"
                data-section="main-display"
            >
                {/* [Text] 중앙 메시지 텍스트 */}
                <h2 className="message-text text-3xl font-bold text-center leading-tight text-gray-900 px-6">
                    {activeMessage || (
                        <>
                            지난주에 다녀온 맛집,
                            <br />
                            다시 가볼까요?
                        </>
                    )}
                </h2>
            </div>

            {/* [Interaction Area] 하단 인터랙션 영역 (Input or Icons) - relative z-20 to sit on top of aurora */}
            {showInput ? (
                // [Input Mode] 텍스트 입력 모드
                <div
                    className="input-mode-area px-6 pb-8 pt-4 relative z-20"
                    data-section="input-mode"
                >
                    <div className="input-container w-full bg-white/80 backdrop-blur-md rounded-[20px] p-4 shadow-lg flex items-center gap-3 border border-white/50">
                        <div className="flex-1">
                            <input
                                autoFocus
                                type="text"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        onSend();
                                    }
                                }}
                                placeholder="오늘 기분 어떠신가요?"
                                className="w-full text-xl font-medium text-gray-900 placeholder-gray-500 outline-none bg-transparent"
                            />
                        </div>

                        <button onClick={onSend} className="send-button p-2">
                            {inputText ? (
                                <ArrowRight size={24} className="text-black" />
                            ) : (
                                <span className="animate-pulse text-gray-400">|</span>
                            )}
                        </button>

                        {/* [Button] 아이콘 뷰로 돌아가기 */}
                        <button
                            onClick={() => setShowInput(false)}
                            className="close-input-button p-2 ml-1"
                        >
                            <Keyboard size={24} className="text-gray-400" />
                        </button>
                    </div>
                </div>
            ) : (
                // [Icon Mode] 아이콘 버튼 모드 (Default)
                <div
                    className="icon-mode-area h-24 flex items-center justify-center gap-4 mt-6 mb-10 px-4 relative z-20"
                    data-section="icon-mode"
                >
                    {/* [Icon] Camera */}
                    <button
                        onClick={onCameraClick}
                        className="icon-button camera-button w-14 h-14 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border border-white/50 active:scale-95 transition-transform"
                    >
                        <Camera size={26} className="text-gray-900" />
                    </button>

                    {/* [Icon] Keyboard (Toggle Input) */}
                    <button
                        onClick={() => setShowInput(true)}
                        className="icon-button keyboard-button w-14 h-14 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border border-white/50 active:scale-95 transition-transform"
                    >
                        <Keyboard size={26} className="text-gray-900" />
                    </button>

                    {/* [Icon] Mic (Toggle Listening) - Main Actions */}
                    <button
                        onClick={onMicToggle}
                        className="icon-button mic-button w-14 h-14 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border border-white/50 active:scale-95 transition-transform"
                    >
                        {isListening ? (
                            <Mic size={26} className="text-gray-900" />
                        ) : (
                            <MicOff size={26} className="text-gray-900" />
                        )}
                    </button>

                    {/* [Icon] Screen Share */}
                    <button
                        onClick={() => alert("화면 공유 기능 준비 중")}
                        className="icon-button screen-share-button w-14 h-14 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border border-white/50 active:scale-95 transition-transform"
                    >
                        <MonitorUp size={26} className="text-gray-900" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default HomePage;
