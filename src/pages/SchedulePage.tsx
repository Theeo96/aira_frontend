import React from "react";
import { Calendar } from "lucide-react";

const SchedulePage: React.FC = () => {
    return (
        <div className="h-full bg-[#F0EEE9] pt-36 px-8 flex flex-col items-center">
            <h3 className="text-2xl font-bold text-center mb-10 leading-snug">
                일정 관리가 필요하신가요?
            </h3>
            <p className="text-gray-500 text-center text-sm mb-16 leading-relaxed">
                사용하시는 캘린더를 연결하시면
                <br />
                AIRA가 참고하고
                <br />
                리마인더를 드릴 수 있어요.
            </p>

            <div className="flex flex-col items-center gap-4 mb-20">
                <div className="w-48 h-48 bg-white rounded-[40px] flex items-center justify-center shadow-sm">
                    <Calendar size={100} strokeWidth={1.5} />
                </div>
                <span className="text-lg font-bold">캘린더 연결</span>
            </div>

            <p className="text-[11px] text-gray-500 text-center leading-relaxed">
                '캘린더 연결'을 누르시면 이용 정책에 동의하시고
                <br />
                개인정보 처리방침을 확인했음에 동의하시는 것입니다.
            </p>
        </div>
    );
};

export default SchedulePage;
