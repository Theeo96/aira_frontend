import React from "react";

const SplashPage: React.FC = () => {
    return (
        <div className="h-screen w-full flex items-center justify-center bg-[#F0EEE9]">
            <div className="w-48 h-48 flex items-center justify-center animate-pulse">
                <img
                    src="/aira-logo.png"
                    alt="AIRA Logo"
                    className="w-full h-full object-contain"
                />
            </div>
        </div>
    );
};

export default SplashPage;
