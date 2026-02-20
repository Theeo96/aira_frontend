import React from "react";

const LoginPage: React.FC = () => {
    return (
        <div className="h-full bg-[#F0EEE9] pt-28 px-8 flex flex-col items-center">
            <h3 className="text-2xl font-black text-center mb-4 text-gray-900 tracking-tight leading-snug">
                상주형 AI 컴패니언 서비스가
                <br />
                필요하다면
            </h3>
            <p className="text-gray-600 text-center text-sm mb-16 leading-relaxed">
                회원가입/로그인을 위해 이메일을 입력해주세요.
                <br />
                인증 메일을 보내드리겠습니다.
            </p>

            <button className="w-full bg-white border border-gray-200 py-4 rounded-xl shadow-sm flex items-center justify-center gap-3 mb-10">
                <img
                    src="https://www.google.com/favicon.ico"
                    className="w-5 h-5"
                    alt="Google"
                />
                <span className="font-medium text-gray-700">
                    Google 계정으로 로그인 하기
                </span>
            </button>

            <div className="w-full flex items-center gap-4 mb-10">
                <div className="flex-1 h-[1px] bg-gray-300"></div>
                <span className="text-xs text-gray-400 font-bold">or</span>
                <div className="flex-1 h-[1px] bg-gray-300"></div>
            </div>

            <input
                type="email"
                placeholder="email@domain.com"
                className="w-full py-5 px-6 rounded-xl border border-gray-200 mb-6 bg-white outline-none text-lg text-center"
            />

            <button className="w-full py-5 bg-black text-white rounded-xl font-bold text-lg mb-10">
                계속하기
            </button>

            <p className="text-[11px] text-gray-500 text-center leading-relaxed">
                '계속하기'를 누르시면 이용 정책에 동의하시고
                <br />
                개인정보 처리방침을 확인했음에 동의하시는 것입니다.
            </p>
        </div>
    );
};

export default LoginPage;
