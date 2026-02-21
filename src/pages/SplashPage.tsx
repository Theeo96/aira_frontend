import React from "react";

const SplashPage: React.FC = () => {
    return (
        <div className="h-[100dvh] w-full flex items-center justify-center bg-[#F0EEE9]">
            {/* Outer Drop Shadow Container (Soft Neumorphism) */}
            <div
                className="w-[260px] h-[260px] md:w-[300px] md:h-[300px] rounded-full flex items-center justify-center animate-pulse bg-[#F0EEE9] relative"
                style={{
                    boxShadow: '16px 16px 32px #e0ded8, -16px -16px 32px #ffffff'
                }}
            >
                {/* 1st Inner Ring (Recessed Cutout) */}
                <div
                    className="absolute w-[94%] h-[94%] rounded-full bg-[#f4f3ef]"
                    style={{
                        boxShadow: 'inset 6px 6px 14px rgba(212, 210, 206, 0.4), inset -6px -6px 14px rgba(255, 255, 255, 0.8)'
                    }}
                ></div>

                {/* 2nd Inner Ring (Raised Platform + Glow) */}
                <div
                    className="absolute w-[86%] h-[86%] rounded-full flex items-center justify-center overflow-hidden"
                    style={{
                        background: 'radial-gradient(circle, rgba(255,255,255,0.7) 0%, rgba(246,245,242,1) 50%, rgba(240,238,233,1) 100%)',
                        boxShadow: '4px 4px 10px rgba(212, 210, 206, 0.3), -4px -4px 10px rgba(255, 255, 255, 0.7), inset 2px 2px 4px rgba(255,255,255,0.8)'
                    }}
                >
                    <img
                        src="/aira-logo.png"
                        alt="AIRA Logo"
                        className="relative z-10 w-full h-full object-cover mix-blend-multiply opacity-95"
                    />
                </div>
            </div>
        </div>
    );
};

export default SplashPage;
