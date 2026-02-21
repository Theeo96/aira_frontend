import React, { useState } from "react";
import { Mic, MicOff, Keyboard, Camera, MonitorUp, ArrowRight, X, AudioLines } from "lucide-react";
import { Persona, GradientTheme, GradientSpeed, GradientOpacity, GradientDirection } from "../../types";
import AiraPocket from "../components/AiraPocket";
import PlaylistRecommendationDisplay from "../components/PlaylistRecommendationDisplay";
import { useHomeIntroContent } from "../hooks/useHomeIntroContent";

interface HomePageProps {
    activeMessage: string;
    activePersona: Persona;
    isListening: boolean;
    inputText: string;
    setInputText: (text: string) => void;
    onSend: () => void;
    onMicToggle: () => void;
    onCameraClick: () => void;
    onScreenShareClick: () => void;
    onNavigateToUpload?: () => void;
    theme?: GradientTheme;
    gradientSpeed?: GradientSpeed;
    gradientOpacity?: GradientOpacity;
    gradientDirection?: GradientDirection;
}

const HomePage: React.FC<HomePageProps> = ({
    activeMessage,
    activePersona,
    isListening,
    inputText,
    setInputText,
    onSend,
    onMicToggle,
    onCameraClick,
    onScreenShareClick,
    onNavigateToUpload,
    theme = 'aira',
    gradientSpeed = 'normal',
    gradientOpacity = 'normal',
    gradientDirection = 'bottom',
}) => {
    const [showInput, setShowInput] = useState(false);
    const [isPocketOpen, setIsPocketOpen] = useState(false);
    const [touchStartY, setTouchStartY] = useState(0);
    const { introQuote, listeningQuote, showListeningQuote } = useHomeIntroContent();

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStartY(e.touches[0].clientY);
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        const touchEndY = e.changedTouches[0].clientY;
        if (touchStartY - touchEndY > 50) {
            onNavigateToUpload?.();
        }
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (e.deltaY > 30) {
            onNavigateToUpload?.();
        }
    };

    // Get dynamic styles based on props
    // We Map gradientSpeed to animationDuration for the continuous keyframes
    const getAnimationDuration = (baseSeconds: number) => {
        if (gradientSpeed === 'slow') return `${baseSeconds * 2}s`;
        if (gradientSpeed === 'fast') return `${baseSeconds * 0.5}s`;
        return `${baseSeconds}s`; // normal
    };

    const getOpacityMultiplier = () => {
        if (gradientOpacity === 'light') return 0.5;
        if (gradientOpacity === 'bold') return 1.5;
        return 1.0; // normal
    };

    const getColors = () => {
        if (theme === 'sunset') {
            return {
                primary: "rgba(255, 110, 60, 1)",
                center: "rgba(255, 60, 100, 1)",
                secondary: "rgba(255, 200, 80, 1)"
            };
        }
        if (theme === 'midnight') {
            return {
                primary: "rgba(50, 60, 80, 1)",
                center: "rgba(100, 110, 130, 1)",
                secondary: "rgba(150, 160, 180, 1)"
            };
        }
        // Default AIRA theme
        return {
            primary: "var(--color-rumi-primary)",
            center: "#A084E8",
            secondary: "var(--color-lami-primary)"
        };
    };

    const opacityMultiplier = getOpacityMultiplier();
    const colors = getColors();

    // Helper functions for directional styles
    // Note: Persona dominance logic is kept intact here (width/height differences)
    const getPrimaryStyle = () => {
        const isActive = activePersona === "rumi";
        const baseOpacity = (isActive ? 0.75 : 0.35) * opacityMultiplier;
        const listenScale = isListening && isActive ? 1.1 : 1;
        const listenTransform = isListening && isActive ? ' translateY(-5%)' : '';

        const styleObj: any = {
            backgroundColor: colors.primary,
            opacity: baseOpacity,
            animationDuration: getAnimationDuration(8),
        };

        if (gradientDirection === 'side') {
            styleObj.width = isActive ? "140vw" : "100vw";
            styleObj.height = "150vh";
            styleObj.left = "-40vw";
            styleObj.top = "-15vh";
            styleObj.bottom = "auto";
            styleObj.opacity = (isActive ? 0.95 : 0.6) * opacityMultiplier;
            // Keyframe animation handles transform, so we only apply static scaling/translate via width/height or margin if needed.
            // But since orb needs scale on listen, we can apply it to a wrapper OR inject it via CSS vars.
            // Simpler approach: we keep scale transform here and let keyframes override if needed. Actually it's better to avoid transform conflict.
            // Let's rely strictly on the keyframes. If isListening, we bump the size instead.
            if (isListening && isActive) {
                styleObj.width = "150vw";
                styleObj.height = "160vh";
            }
            return styleObj;
        }

        if (gradientDirection === 'center') {
            styleObj.width = isActive ? "130vw" : "90vw";
            styleObj.height = isActive ? "130vw" : "90vw";
            styleObj.left = isActive ? "-15vw" : "-20vw";
            styleObj.top = isActive ? "5vh" : "15vh";
            styleObj.bottom = "auto";
            styleObj.opacity = (isActive ? 0.9 : 0.5) * opacityMultiplier;
            if (isListening && isActive) {
                styleObj.width = "145vw";
                styleObj.height = "145vw";
            }
            return styleObj;
        }

        // Default: bottom
        styleObj.width = isActive ? "130vw" : "80vw";
        styleObj.height = isActive ? "130vw" : "80vw";
        styleObj.left = isActive ? "-20vw" : "-30vw";
        styleObj.bottom = isActive ? "-30vw" : "-40vw";
        if (isListening && isActive) {
            styleObj.width = "145vw";
            styleObj.height = "145vw";
            styleObj.bottom = "-20vw"; // simulate translateY(-5%)
        }
        return styleObj;
    };

    const getCenterStyle = () => {
        const baseOpacity = 0.5 * opacityMultiplier;

        const styleObj: any = {
            backgroundColor: colors.center,
            animationDuration: getAnimationDuration(12),
        };

        if (gradientDirection === 'side') {
            styleObj.width = "120vw";
            styleObj.height = "100vh";
            styleObj.left = "-10vw";
            styleObj.top = "10vh";
            styleObj.bottom = "auto";
            styleObj.opacity = baseOpacity * 1.2;
            if (isListening) styleObj.top = "5vh";
            return styleObj;
        }

        if (gradientDirection === 'center') {
            styleObj.width = "150vw";
            styleObj.height = "150vw";
            styleObj.left = "-25vw";
            styleObj.top = "-5vh";
            styleObj.bottom = "auto";
            styleObj.opacity = baseOpacity * 1.7;
            if (isListening) {
                styleObj.width = "160vw";
                styleObj.height = "160vw";
            }
            return styleObj;
        }

        // Default: bottom
        styleObj.width = "110vw";
        styleObj.height = "110vw";
        styleObj.left = "-5vw";
        styleObj.bottom = "-60vw";
        styleObj.opacity = baseOpacity;
        if (isListening) styleObj.bottom = "-55vw";
        return styleObj;
    };

    const getSecondaryStyle = () => {
        const isActive = activePersona === "lami";
        const baseOpacity = (isActive ? 0.75 : 0.35) * opacityMultiplier;

        const styleObj: any = {
            backgroundColor: colors.secondary,
            opacity: baseOpacity,
            animationDuration: getAnimationDuration(10),
        };

        if (gradientDirection === 'side') {
            styleObj.width = isActive ? "140vw" : "100vw";
            styleObj.height = "150vh";
            styleObj.right = "-40vw";
            styleObj.top = "-15vh";
            styleObj.bottom = "auto";
            styleObj.opacity = (isActive ? 0.95 : 0.6) * opacityMultiplier;
            if (isListening && isActive) {
                styleObj.width = "150vw";
                styleObj.height = "160vh";
            }
            return styleObj;
        }
        if (gradientDirection === 'center') {
            styleObj.width = isActive ? "130vw" : "90vw";
            styleObj.height = isActive ? "130vw" : "90vw";
            styleObj.right = isActive ? "-15vw" : "-20vw";
            styleObj.top = isActive ? "5vh" : "15vh";
            styleObj.bottom = "auto";
            styleObj.opacity = (isActive ? 0.9 : 0.5) * opacityMultiplier;
            if (isListening && isActive) {
                styleObj.width = "145vw";
                styleObj.height = "145vw";
            }
            return styleObj;
        }
        // Default: bottom
        styleObj.width = isActive ? "130vw" : "80vw";
        styleObj.height = isActive ? "130vw" : "80vw";
        styleObj.right = isActive ? "-20vw" : "-30vw";
        styleObj.bottom = isActive ? "-30vw" : "-40vw";
        styleObj.opacity = baseOpacity;
        if (isListening && isActive) {
            styleObj.width = "145vw";
            styleObj.height = "145vw";
            styleObj.bottom = "-20vw";
        }
        return styleObj;
    };

    return (
        <div
            className={`flex flex-col h-full bg-[#FAFAFA] relative overflow-hidden transition-all duration-1000 ${gradientDirection === 'center' ? 'bg-[#F2F2F2]' : ''}`}
            data-active-persona={activePersona}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
        >
            {/* [Aurora/Ink Diffusion Layer] 배경 효과 (z-0) */}
            <div className={`absolute inset-0 pointer-events-none overflow-hidden z-0 flex items-center justify-center transition-opacity duration-1000 ${gradientOpacity === 'light' ? 'opacity-50' : gradientOpacity === 'bold' ? 'opacity-100' : 'opacity-80'}`}>
                {/* Primary Orb (Left/Rumi Position) */}
                <div
                    className={`aurora-orb aurora-anim-1`}
                    style={getPrimaryStyle()}
                />

                {/* Center Wave Orb */}
                <div
                    className={`aurora-orb aurora-anim-3`}
                    style={getCenterStyle()}
                />

                {/* Secondary Orb (Right/Lami Position) */}
                <div
                    className={`aurora-orb aurora-anim-2`}
                    style={getSecondaryStyle()}
                />

                {/* 중립 화이트/그레이 블렌딩 (상단 자연스러운 페이드아웃) */}
                <div className="absolute inset-0 bg-gradient-to-t from-transparent via-[rgba(250,250,250,0.4)] to-[#FAFAFA] pointer-events-none opacity-100" />
            </div>

            {/* [Center Message Area] 중앙 메시지 영역 (z-10) */}
            <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-6 pt-[56px] pb-[88px]">
                <div
                    className="text-[24px] md:text-[28px] font-semibold text-[#222222] text-center leading-[1.6] max-w-[320px] sm:max-w-[500px] transition-all duration-500 tracking-tight"
                >
                    {activeMessage ? (
                        <h2 className="quote-font break-keep drop-shadow-md text-[#111111]">
                            {activeMessage}
                        </h2>
                    ) : showListeningQuote ? (
                        <div className="flex flex-col items-center justify-center gap-4 w-full">
                            <AudioLines
                                size={32}
                                className={`animate-pulse ${activePersona === 'rumi'
                                    ? 'text-[#E65C00]'
                                    : 'text-[#005C97]'
                                    } filter drop-shadow-[0_2px_12px_rgba(255,255,255,0.9)]`}
                            />
                            <h2
                                className={`quote-font break-keep whitespace-pre-line text-center leading-[1.6] tracking-tight font-bold text-[24px] md:text-[28px] max-w-[90%] md:max-w-full
                                bg-clip-text text-transparent
                                ${activePersona === 'rumi'
                                        ? 'bg-gradient-to-r from-[#E65C00] to-[#F9A826]'
                                        : 'bg-gradient-to-r from-[#005C97] to-[#363795]'}
                                filter drop-shadow-[0_2px_12px_rgba(255,255,255,0.9)]`}
                            >
                                {listeningQuote}
                            </h2>
                        </div>
                    ) : (
                        <>
                            {introQuote.playlistTheme && introQuote.playlistSong ? (
                                <PlaylistRecommendationDisplay
                                    theme={introQuote.playlistTheme}
                                    song={introQuote.playlistSong}
                                />
                            ) : (
                                <h2 className="quote-font leading-[1.4] whitespace-pre-line break-keep font-medium drop-shadow-sm text-[#1A1A1A]">
                                    {introQuote.wrapWithQuotes
                                        ? `"${introQuote.text}"`
                                        : introQuote.text}
                                </h2>
                            )}
                            {introQuote.author && (
                                <p className="quote-font mt-4 text-[15px] md:text-[16px] font-medium text-[#555555] block drop-shadow-sm tracking-normal">
                                    {introQuote.work
                                        ? `${introQuote.work} | ${introQuote.author}`
                                        : introQuote.author}
                                </p>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* [Bottom Input Bar & AIRA Pocket] 하단 영역 (z-20) */}
            <div className="absolute bottom-0 left-0 w-full z-20 flex flex-col justify-end">
                {/* AIRA Pocket (Floating Bottom Sheet) */}
                <AiraPocket isOpen={isPocketOpen} onToggle={() => setIsPocketOpen(!isPocketOpen)} />

                {/* Bottom Input Bar */}
                {showInput ? (
                    <div className="relative flex items-center gap-3 px-4 py-3 bg-white/20 backdrop-blur-md h-[88px] transition-all z-30">
                        <input
                            autoFocus
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && onSend()}
                            placeholder="메시지를 입력하세요..."
                            className="flex-1 text-[16px] text-[#333333] bg-transparent outline-none placeholder:text-[#333333] placeholder:opacity-60 pl-2 font-medium"
                        />
                        <button onClick={onSend} className="w-10 h-10 flex flex-col items-center justify-center bg-[color:var(--color-persona-primary)] text-white rounded-full flex-shrink-0 shadow-[var(--shadow-crisp)]">
                            <ArrowRight size={20} />
                        </button>
                        <button onClick={() => setShowInput(false)} className="w-[36px] h-[36px] flex flex-col items-center justify-center bg-transparent border border-white/40 rounded-full text-[#666666] flex-shrink-0 ml-1 shadow-[var(--shadow-crisp)] backdrop-blur-sm bg-white/50">
                            <X size={18} />
                        </button>
                    </div>
                ) : (
                    <div className="relative flex flex-col items-center justify-end px-4 h-[104px] z-30 pb-2">
                        <div className="flex items-center justify-center gap-[16px] md:gap-[20px] mb-3">

                            {/* 🖥️ 화면공유 아이콘 */}
                            <button
                                onClick={onScreenShareClick}
                                className="w-[36px] h-[36px] sm:w-[40px] sm:h-[40px] bg-white/70 backdrop-blur-md rounded-full border border-white/40 shadow-[var(--shadow-crisp)] flex items-center justify-center text-[#666666] hover:bg-[rgba(var(--color-persona-rgb),0.1)] transition-colors"
                            >
                                <MonitorUp size={20} strokeWidth={1.5} />
                            </button>

                            {/* ⌨️ 키보드 아이콘 */}
                            <button
                                onClick={() => setShowInput(true)}
                                className="w-[36px] h-[36px] sm:w-[40px] sm:h-[40px] bg-white/70 backdrop-blur-md rounded-full border border-white/40 shadow-[var(--shadow-crisp)] flex items-center justify-center text-[#666666] hover:bg-[rgba(var(--color-persona-rgb),0.1)] transition-colors"
                            >
                                <Keyboard size={20} strokeWidth={1.5} />
                            </button>

                            {/* 📷 카메라 아이콘 */}
                            <button
                                onClick={onCameraClick}
                                className="w-[36px] h-[36px] sm:w-[40px] sm:h-[40px] bg-white/70 backdrop-blur-md rounded-full border border-white/40 shadow-[var(--shadow-crisp)] flex items-center justify-center text-[#666666] hover:bg-[rgba(var(--color-persona-rgb),0.1)] transition-colors cursor-pointer"
                            >
                                <Camera size={20} strokeWidth={1.5} />
                            </button>

                            {/* 🎤 마이크 아이콘 (Primary) */}
                            <button
                                onClick={onMicToggle}
                                className={`w-[56px] h-[56px] sm:w-[56px] sm:h-[56px] rounded-full text-white flex items-center justify-center transition-transform ${isListening ? 'scale-[1.05]' : 'hover:scale-[1.05]'}`}
                                style={{
                                    backgroundColor: "var(--color-persona-primary)",
                                    boxShadow: "0 8px 24px rgba(var(--color-persona-rgb), 0.5), inset 0 2px 4px rgba(255,255,255,0.4)"
                                }}
                            >
                                {/* Ping 애니메이션 링 */}
                                {isListening && (
                                    <div className="absolute inset-0 rounded-full border-2 border-[color:var(--color-persona-primary)] animate-[ping-large_1s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
                                )}

                                {isListening ? (
                                    <Mic size={24} className={isListening ? 'animate-[pulse_0.8s_ease-in-out_infinite]' : ''} />
                                ) : (
                                    <MicOff size={24} />
                                )}
                            </button>
                        </div>

                        {/* 스와이프 유도 인디케이터 (데스크탑은 클릭 지원) */}
                        <div
                            className="w-full flex justify-center py-2 cursor-pointer opacity-50 hover:opacity-100 transition-opacity"
                            onClick={onNavigateToUpload}
                        >
                            <div className="w-12 h-1 bg-[#CCCCCC] rounded-full drop-shadow-sm"></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HomePage;
