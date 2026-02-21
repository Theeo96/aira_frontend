import React, { useRef } from "react";

interface OnboardingPageProps {
    onStart: () => void;
}

const OnboardingPage: React.FC<OnboardingPageProps> = ({ onStart }) => {
    const touchStartX = useRef<number | null>(null);
    const touchEndX = useRef<number | null>(null);

    const onTouchStart = (e: React.TouchEvent) => {
        touchEndX.current = null;
        touchStartX.current = e.targetTouches[0].clientX;
    };

    const onTouchMove = (e: React.TouchEvent) => {
        touchEndX.current = e.targetTouches[0].clientX;
    };

    const onTouchEnd = () => {
        if (!touchStartX.current || !touchEndX.current) return;
        // const distance = touchStartX.current - touchEndX.current;
        // Swipe logic removed for single step onboarding
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-6 quote-font">
            <div
                className="bg-white/90 backdrop-blur-md w-full max-w-sm rounded-[2.5rem] py-14 px-8 flex flex-col items-center shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-white/50 text-center animate-slide-up"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                <h2 className="text-[20px] font-bold mb-10 text-[#1A1A1A] tracking-tight">
                    AIRA와 함께해 보세요
                </h2>

                <div className="mb-14">
                    <p className="text-[24px] font-black leading-[1.4] text-[#111111] tracking-tight break-keep">
                        당신의 감정을 읽고<br />바로 대화를 시작해요
                    </p>
                </div>

                <button
                    onClick={onStart}
                    className="flex items-center gap-1 text-[20px] font-medium text-[#333333] hover:text-black transition-colors"
                >
                    시작 〉
                </button>
            </div>
        </div>
    );
};

export default OnboardingPage;
