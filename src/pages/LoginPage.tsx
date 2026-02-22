import React from "react";

interface LoginPageProps {
    onLogin: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
    const handleGoogleLogin = () => {
        const backendLoginUrl = "https://thimblelike-nonopprobrious-lannie.ngrok-free.dev/login";
        const redirectTarget = window.location.origin;
        window.location.href = `${backendLoginUrl}?redirect_target=${encodeURIComponent(redirectTarget)}`;
    };

    return (
        <div className="h-full bg-white flex flex-col items-center justify-center px-8 pb-32">
            <div className="w-full max-w-sm flex flex-col items-center">
                <h3 className="text-3xl font-black text-center mb-6 text-gray-900 tracking-tight leading-snug">
                    AI 컴패니언<br />
                    <span className="text-blue-600">AIRA</span>와 함께하세요
                </h3>

                <p className="text-gray-500 text-center text-sm mb-16 leading-relaxed">
                    로그인하여 대화를 시작하고<br />
                    나만의 AI 비서를 만나보세요.
                </p>

                <button
                    onClick={handleGoogleLogin}
                    className="w-full bg-white border border-gray-200 py-4 rounded-xl shadow-sm flex items-center justify-center gap-3 active:scale-95 transition-transform hover:bg-gray-50"
                >
                    <img
                        src="https://www.google.com/favicon.ico"
                        className="w-5 h-5"
                        alt="Google"
                    />
                    <span className="font-medium text-gray-700">
                        Google 계정으로 로그인
                    </span>
                </button>

                <p className="text-[11px] text-gray-400 text-center mt-8 leading-relaxed">
                    로그인 시 이용 약관 및<br />
                    개인정보 처리방침에 동의하게 됩니다.
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
