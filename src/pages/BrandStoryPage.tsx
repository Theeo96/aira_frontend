import React from 'react';
import { X } from 'lucide-react';
import { AppState } from '../../types';

interface BrandStoryPageProps {
    setAppState: (state: AppState) => void;
}

const BrandStoryPage: React.FC<BrandStoryPageProps> = ({ setAppState }) => {
    return (
        <div className="w-full h-[100dvh] flex flex-col bg-white/60 backdrop-blur-3xl px-6 pt-12 pb-8 overflow-y-auto">
            <div className="w-full max-w-[600px] mx-auto flex flex-col h-full">
                {/* Header Close Button */}
                <div className="flex justify-between items-start mb-6 shrink-0">
                    <div>
                        <h1 className="text-[28px] font-bold text-[#333333] leading-tight tracking-tight shadow-sm font-['Montserrat',sans-serif]">AIRA</h1>
                        <p className="text-[14px] text-[#999999] font-medium leading-[1.3] tracking-wide mt-1">
                            Artificial Intelligence for Rational Affect
                        </p>
                    </div>
                    <button
                        onClick={() => setAppState(AppState.HOME)}
                        className="p-2 w-10 h-10 bg-white/40 rounded-full hover:bg-black/5 transition-colors shadow-sm flex items-center justify-center shrink-0 border border-white/50"
                    >
                        <X size={20} className="text-[#333333]" />
                    </button>
                </div>

                <div className="flex-1 w-full text-[#333333] space-y-9 pb-16 font-['Pretendard'] break-keep">
                    {/* Intro */}
                    <div className="space-y-4 pt-4 border-t border-black/10 max-w-[480px] w-full mx-auto">
                        <h2 className="text-[22px] font-bold leading-snug">
                            "가장 무거운 퇴근길, 당신의 마음을 뉘일 곳이 되기 위하여"
                        </h2>
                        <p className="text-[16px] leading-[1.7] font-medium text-gray-700">
                            어느 늦은 밤, 피로가 내려앉은 퇴근길 지하철 안이었습니다.
                            지친 기색이 역력한 50대 직장인 분이 화면 속 AI에게 남들에게는 차마 말하지
                            못했던 깊은 고민을 조심스레 털어놓고 계셨습니다. 그 굽은 뒷모습을 보며
                            문득 하나의 확신이 스쳤습니다.
                        </p>
                        <blockquote className="border-l-4 border-[#333333] pl-4 py-2 mt-4 text-[17px] font-semibold text-[#111111] bg-white/30 rounded-r-lg">
                            "아, 우리 모두에게는 수많은 연락처보다, 내 마음속 무거운 짐을
                            편견 없이 털어놓을 단 한 명의 대상이 절실하구나."
                        </blockquote>
                        <p className="text-[16px] leading-[1.7] text-gray-700 mt-4">
                            기술이 이토록 발전한 시대라면, 영화 &lt;Her&gt;의 사만다처럼 그저 정답을
                            내뱉는 기계를 넘어 내 감정의 온도를 온전히 이해하는 동반자를 만들 수
                            있지 않을까? 그 질문과 도전 의식이 AIRA의 시작이 되었습니다.
                        </p>
                    </div>

                    {/* Two Personas */}
                    <div className="space-y-4 max-w-[480px] w-full mx-auto">
                        <h3 className="text-[19px] font-bold text-[#222222]">
                            이해의 완성, 두 개의 시선
                        </h3>
                        <p className="text-[16px] leading-[1.7] text-gray-700">
                            사람의 마음은 복잡해서, 때로는 조건 없는 위로가 필요하고 때로는
                            현실적인 조언이 필요합니다. 그래서 우리는 당신의 일상에
                            서로 다른 매력을 가진 두 명의 친구를 초대했습니다.
                        </p>

                        <div className="flex flex-col gap-3 py-2">
                            <div className="bg-white/40 p-4 rounded-xl border border-white/60 shadow-sm">
                                <p className="text-[16px] leading-[1.6]">
                                    당신의 상처와 감정에 깊이 공감하고 다독여주는 따뜻한 친구,
                                    <strong className="text-[#FF7A59]"> 루미(Rumi)</strong>.
                                </p>
                            </div>
                            <div className="bg-white/40 p-4 rounded-xl border border-white/60 shadow-sm">
                                <p className="text-[16px] leading-[1.6]">
                                    당신의 고민을 객관적으로 바라보고 명쾌한 해결책을 짚어주는
                                    이성적인 친구, <strong className="text-[#20B2AA]">라미(Lami)</strong>.
                                </p>
                            </div>
                        </div>

                        <p className="text-[16px] leading-[1.7] text-gray-700">
                            하나의 상황을 두고 두 자아가 나누는 티키타카를 듣다 보면,
                            꽉 막혔던 고민도 어느새 새로운 시각으로 풀려나가는 것을
                            경험하게 될 것입니다.
                        </p>
                    </div>

                    {/* Conclusion */}
                    <div className="space-y-4 max-w-[480px] w-full mx-auto">
                        <h3 className="text-[19px] font-bold text-[#222222] font-['Montserrat',sans-serif]">
                            A.I.R.A : Artificial Intelligence for Rational Affect
                        </h3>
                        <p className="text-[16px] leading-[1.7] text-gray-700">
                            '이성(Rational)'과 '감성(Affect)'을 아우르는 AI, 아이라(A.I.R.A).
                            우리는 당신을 가르치려 들거나 차갑게 평가하지 않습니다. 그저 당신이
                            있는 곳의 날씨를 살피고, 퇴근길의 안전을 걱정하며, 언제든 부르면
                            달려오는 <strong>'편안하고 오래된 친구'</strong>가 되고자 합니다.
                        </p>
                        <div className="mt-8 text-center pt-8 border-t border-black/10">
                            <p className="text-[18px] font-semibold text-[#111111]">
                                오늘 하루도 정말 수고 많으셨습니다.
                            </p>
                            <p className="text-[16px] text-gray-600 mt-2">
                                이제, 아이라에게 당신의 진짜 이야기를 들려주세요.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BrandStoryPage;
