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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
            <div
                className="bg-white w-fit rounded-[45px] py-14 px-10 flex flex-col items-center shadow-2xl text-center"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                <h2 className="text-2xl font-bold mb-10 leading-snug text-gray-800">
                    AIRA와 함께해 보세요
                </h2>

                <div className="mb-14">
                    <p className="text-2xl font-black mb-6 leading-relaxed">
                        당신의 감정을 읽고
                        <br />
                        바로 대화를 시작해요
                    </p>
                </div>

                <button
                    onClick={onStart}
                    className="flex items-center gap-2 text-xl font-medium"
                >
                    시작 〉
                </button>
            </div>
        </div>
    );
};

export default OnboardingPage;
