import React, { useState } from "react";
import {
  Menu,
  X,
  Settings,
  History,
  FolderOpen,
  User,
  Bell,
  Lock,
  Type,
  UserCircle,
  FlaskConical,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Palette,
  Activity,
  Droplets,
  ArrowRight,
  Volume2,
} from "lucide-react";
import { AppState, Persona, GradientTheme, GradientSpeed, GradientOpacity, GradientDirection, StartSoundOption, EnableUISound } from "../types";

interface HeaderProps {
  onMenuClick: () => void;
  currentScreen: AppState;
  goBack?: () => void;
  activePersona?: Persona;
  onTogglePersona?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onMenuClick,
  currentScreen,
  goBack,
  activePersona,
  onTogglePersona,
}) => {
  const isSubPage = ![
    AppState.HOME,
    AppState.PERMISSION,
    AppState.CAMERA_PERMISSION,
    AppState.ONBOARDING_1,
    AppState.ONBOARDING_2,
    AppState.CHAT_FILE,
  ].includes(currentScreen);

  return (
    <div
      className="fixed top-0 left-0 w-full h-[56px] flex items-center justify-between px-4 z-40 transition-all duration-300"
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 100%)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="flex items-center w-[80px]">
        {isSubPage ? (
          <button
            onClick={goBack}
            className="flex items-center justify-center w-[48px] h-[48px] -ml-2 touch-manipulation rounded-xl text-[#333333] hover:bg-black/5 active:scale-[0.96] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(var(--persona-rgb),0.45)]"
          >
            <span className="text-2xl font-light text-[#333333]">〈</span>
          </button>
        ) : (
          <button
            onClick={onMenuClick}
            className="group flex items-center justify-center w-[48px] h-[48px] -ml-2 touch-manipulation rounded-xl text-[#333333] hover:bg-black/5 active:scale-[0.96] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(var(--persona-rgb),0.45)]"
          >
            <Menu size={32} className="transition-transform duration-150 group-hover:scale-105" />
          </button>
        )}
      </div>

      <div className="flex-1 flex justify-center items-center mt-2">
        {isSubPage ? (
          <h1 className="text-lg font-bold text-[#333333]">
            {currentScreen === AppState.LOGIN && "로그인"}
            {currentScreen === AppState.MATERIAL && "[미정] - 자료 관리"}
            {currentScreen === AppState.HISTORY && "히스토리"}
            {currentScreen === AppState.SETTINGS && "설정"}
          </h1>
        ) : (
          <img
            src="/AIRA_LOGO-Photoroom.png"
            alt="AIRA"
            className="h-[72px] sm:h-[96px] w-[200px] object-contain mix-blend-multiply opacity-90 transition-all duration-500 scale-[1.3] md:scale-[1.4] translate-x-3 md:translate-x-4 mt-2"
          />
        )}
      </div>

      <div className="flex items-center justify-end w-[80px]">
        {/* Rumi/Lami 표시 기능 삭제됨 */}
      </div>
    </div>
  );
}

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (state: AppState) => void;
  theme: GradientTheme;
  setTheme: (t: GradientTheme) => void;
  gradientSpeed: GradientSpeed;
  setGradientSpeed: (s: GradientSpeed) => void;
  gradientOpacity: GradientOpacity;
  setGradientOpacity: (o: GradientOpacity) => void;
  speakerMode: "rumi" | "lami" | "both";
  setSpeakerMode: (mode: "rumi" | "lami" | "both") => void;
  setActivePersona: (persona: Persona) => void;
  gradientDirection: GradientDirection;
  onDirectionChange: (d: GradientDirection) => void;
  startSoundOption: StartSoundOption;
  setStartSoundOption: (option: StartSoundOption) => void;
  enableUISound: EnableUISound;
  setEnableUISound: (enabled: EnableUISound) => void;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  onNavigate,
  theme,
  setTheme,
  gradientSpeed,
  setGradientSpeed,
  gradientOpacity,
  setGradientOpacity,
  speakerMode,
  setSpeakerMode,
  setActivePersona,
  gradientDirection,
  onDirectionChange,
  startSoundOption,
  setStartSoundOption,
  enableUISound,
  setEnableUISound,
}) => {
  const [expandedSetting, setExpandedSetting] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const toggleSetting = (setting: string) => {
    setExpandedSetting(expandedSetting === setting ? null : setting);
  };

  const handleSoundPreview = (option: StartSoundOption) => {
    setStartSoundOption(option);
    if (option !== 'off') {
      const audio = new Audio(`/start_signal${option}.mp3`);
      audio.play().catch(e => console.log("Preview failed:", e));
    }
  };

  const drawerNavButtonClass =
    "w-full h-[64px] px-5 flex items-center gap-4 text-[#333333] rounded-xl " +
    "hover:bg-[#EEF2F7] hover:text-[#111827] hover:shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)] " +
    "active:bg-[#E2E8F0] active:scale-[0.995] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(var(--persona-rgb),0.45)]";

  const drawerSectionButtonClass =
    "w-full h-[48px] pl-10 pr-5 flex items-center justify-between text-[#333333] rounded-lg " +
    "hover:bg-[#F3F4F6] hover:text-[#111827] active:bg-[#E5E7EB] active:scale-[0.995] " +
    "transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(var(--persona-rgb),0.45)]";

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`absolute top-0 left-0 h-full w-[85%] md:w-[320px] bg-white transition-transform duration-300 ease-out flex flex-col ${isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        {/* Header inside Drawer */}
        <div className="w-full h-[150px] shrink-0 relative overflow-hidden">
          <img
            src="/sidebar-title-bg.jpg"
            alt="AIRA Logo"
            className="w-full h-full object-cover object-left"
            style={{
              maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)'
            }}
          />
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto w-full mt-4">
          {/* 1. 브랜드스토리 */}
          <button
            onClick={() => onNavigate(AppState.BRAND_STORY)}
            className={drawerNavButtonClass}
          >
            <BookOpen size={24} />
            <div className="text-left flex-1">
              <div className="text-[16px]">브랜드스토리</div>
              <div className="text-[12px] text-[#999999] mt-1">
                AIRA의 탄생과 이야기
              </div>
            </div>
          </button>

          {/* 2. 업로드 (자료+대화) */}
          <button
            onClick={() => onNavigate(AppState.CHAT_FILE)}
            className={drawerNavButtonClass}
          >
            <FolderOpen size={24} />
            <div className="text-left flex-1">
              <div className="text-[16px] flex items-center gap-2">
                업로드
              </div>
              <div className="text-[12px] text-[#999999] mt-1">
                파일과 사진을 함께
              </div>
            </div>
          </button>

          {/* 3. 히스토리 */}
          <button
            onClick={() => onNavigate(AppState.HISTORY)}
            className={drawerNavButtonClass}
          >
            <History size={24} />
            <div className="text-left flex-1">
              <div className="text-[16px]">히스토리</div>
              <div className="text-[12px] text-[#999999] mt-1">
                지난 대화 보기
              </div>
            </div>
          </button>

        </nav>

        {/* 4. 설정 (Bottom Fixed Area) */}
        <div className="border-t border-[#E0E0E0] bg-[#FAFAFA]">
          {/* 설정 헤더 */}
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="w-full h-[64px] px-5 flex items-center justify-between text-[#333333] font-semibold bg-white border-b border-[#E0E0E0] rounded-xl hover:bg-[#F3F4F6] hover:text-[#111827] active:bg-[#E5E7EB] active:scale-[0.995] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(var(--persona-rgb),0.45)]"
          >
            <div className="flex items-center gap-4">
              <Settings size={24} />
              <span className="text-[16px]">설정</span>
            </div>
            {isSettingsOpen ? <ChevronUp size={20} className="text-[#999999]" /> : <ChevronDown size={20} className="text-[#999999]" />}
          </button>

          {isSettingsOpen && (
            <div className="max-h-[300px] overflow-y-auto bg-white">
              {/* 설정 Accordions (계정, 알림, 프라이버시, 텍스트크기, 실험실) */}

              {/* 계정 (통합 및 축소) */}
              <div className="border-b border-[#F5F5F5]">
                <button onClick={() => toggleSetting('account')} className={drawerSectionButtonClass}>
                  <div className="flex items-center gap-3"><UserCircle size={18} /><span>계정</span></div>
                  {expandedSetting === 'account' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {expandedSetting === 'account' && (
                  <div className="pl-10 pr-5 pb-4 flex flex-col gap-3 mt-1">
                    <div className="flex items-center justify-between w-full bg-[#fcfcfc] border border-gray-100 p-2.5 rounded-lg">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[color:var(--color-persona-primary)] flex items-center justify-center text-white font-bold text-xs shadow-sm">K</div>
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-800 text-[13px] leading-tight">카리나님</span>
                          <span className="text-gray-400 text-[10px] leading-tight">user@email.com</span>
                        </div>
                      </div>
                      <button className="text-[11px] px-2.5 py-1 border border-gray-200 bg-white shadow-sm rounded text-gray-600 hover:bg-gray-50 transition-colors">로그아웃</button>
                    </div>

                    <button
                      onClick={() => onNavigate(AppState.LOGIN)}
                      className="w-full text-center px-3 py-2 텍스트text-[12px] text-[color:var(--color-persona-primary)] font-medium bg-[#fcfcfc] border border-gray-100 hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      <User size={14} /> 다른 계정으로 로그인
                    </button>
                  </div>
                )}
              </div>

              {/* 알림 */}
              <div className="border-b border-[#F5F5F5]">
                <button onClick={() => toggleSetting('notifications')} className={drawerSectionButtonClass}>
                  <div className="flex items-center gap-3"><Bell size={18} /><span>알림</span></div>
                  {expandedSetting === 'notifications' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {expandedSetting === 'notifications' && (
                  <div className="pl-10 pr-5 pb-5 pt-2 text-[14px] text-[#666666] flex flex-col gap-5">

                    {/* 방해금지 설정 */}
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-800">방해금지 모드</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[110%] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[3px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[color:var(--color-persona-primary)]"></div>
                      </label>
                    </div>

                    {/* 시간 설정 구역 */}
                    <div className="flex flex-col gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-700">모닝 브리핑</span>
                        <input
                          type="time"
                          defaultValue="07:00"
                          className="border border-gray-200 rounded-md px-2 py-1 flex items-center justify-center text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[color:var(--color-persona-primary)]"
                          style={{ WebkitAppearance: 'none' }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-700">퇴근 요약</span>
                        <input
                          type="time"
                          defaultValue="18:00"
                          className="border border-gray-200 rounded-md px-2 py-1 flex items-center justify-center text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[color:var(--color-persona-primary)]"
                          style={{ WebkitAppearance: 'none' }}
                        />
                      </div>
                    </div>

                  </div>
                )}
              </div>

              {/* 프라이버시 */}
              <div className="border-b border-[#F5F5F5]">
                <button onClick={() => toggleSetting('privacy')} className={drawerSectionButtonClass}>
                  <div className="flex items-center gap-3"><Lock size={18} /><span>프라이버시</span></div>
                  {expandedSetting === 'privacy' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {expandedSetting === 'privacy' && (
                  <div className="pl-10 pr-5 pb-4 text-[14px] text-[#666666] flex flex-col gap-3 mt-2">
                    <div>
                      <div className="font-semibold text-gray-800 mb-1">대화 기억</div>
                      <label className="flex items-center gap-2"><input type="radio" name="memory" defaultChecked /> 모든 대화 저장 (기본)</label>
                      <label className="flex items-center gap-2"><input type="radio" name="memory" /> 이번 세션만 (휘발성)</label>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800 mb-1">위치 정보</div>
                      <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> 교통·날씨에 활용</label>
                    </div>
                  </div>
                )}
              </div>

              {/* 텍스트 크기 */}
              <div className="border-b border-[#F5F5F5]">
                <button onClick={() => toggleSetting('textsize')} className={drawerSectionButtonClass}>
                  <div className="flex items-center gap-3"><Type size={18} /><span>텍스트 크기</span></div>
                  {expandedSetting === 'textsize' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {expandedSetting === 'textsize' && (
                  <div className="pl-10 pr-5 pb-4 text-[14px] text-[#666666] flex flex-col gap-2 mt-2">
                    <label className="flex items-center gap-2">
                      <input type="radio" name="textsize" onChange={() => document.documentElement.style.fontSize = "14px"} /> 작게
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="textsize" defaultChecked onChange={() => document.documentElement.style.fontSize = "16px"} /> 보통 (기본)
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="textsize" onChange={() => document.documentElement.style.fontSize = "18px"} /> 크게
                    </label>
                  </div>
                )}
              </div>


              {/* 실험실 */}
              <div>
                <button onClick={() => toggleSetting('lab')} className={drawerSectionButtonClass}>
                  <div className="flex items-center gap-3"><FlaskConical size={18} /><span>실험실 <span className="text-[10px] bg-red-100 text-red-600 px-1 rounded">NEW</span></span></div>
                  {expandedSetting === 'lab' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {expandedSetting === 'lab' && (
                  <div className="pl-10 pr-5 pb-6 text-[14px] text-[#666666] flex flex-col gap-6 mt-3">

                    {/* Gradient Controls */}
                    <div className="bg-[#fcfcfc] border border-gray-100 p-3 rounded-xl shadow-sm flex flex-col gap-4">

                      {/* Theme */}
                      <div>
                        <div className="font-semibold text-gray-800 text-[13px] mb-2 flex items-center gap-1.5"><Palette size={14} />홈 화면 테마</div>
                        <div className="flex flex-col gap-1.5 text-[13px]">
                          <label className="flex items-center gap-2">
                            <input type="radio" name="gradientTheme" checked={theme === 'aira'} onChange={() => setTheme('aira')} />
                            <span className="w-3 h-3 rounded-full bg-gradient-to-tr from-[#FF7300] to-[#A084E8] inline-block shadow-sm"></span> Aira (기본)
                          </label>
                          <label className="flex items-center gap-2">
                            <input type="radio" name="gradientTheme" checked={theme === 'sunset'} onChange={() => setTheme('sunset')} />
                            <span className="w-3 h-3 rounded-full bg-gradient-to-tr from-[#FF6E3C] to-[#FFC850] inline-block shadow-sm"></span> 선셋 (따뜻함)
                          </label>
                          <label className="flex items-center gap-2">
                            <input type="radio" name="gradientTheme" checked={theme === 'midnight'} onChange={() => setTheme('midnight')} />
                            <span className="w-3 h-3 rounded-full bg-gradient-to-tr from-[#323C50] to-[#96A0B4] inline-block shadow-sm"></span> 미드나잇 (모던)
                          </label>
                        </div>
                      </div>

                      {/* Speed */}
                      <div className="pt-3 border-t border-gray-100">
                        <div className="font-semibold text-gray-800 text-[13px] mb-2 flex items-center gap-1.5"><Activity size={14} />물결 속도</div>
                        <div className="flex items-center gap-4 text-[13px] justify-between px-1">
                          <label className="flex flex-col items-center gap-1 cursor-pointer">
                            <input type="radio" name="gradientSpeed" checked={gradientSpeed === 'slow'} onChange={() => setGradientSpeed('slow')} />
                            느리게
                          </label>
                          <label className="flex flex-col items-center gap-1 cursor-pointer">
                            <input type="radio" name="gradientSpeed" checked={gradientSpeed === 'normal'} onChange={() => setGradientSpeed('normal')} />
                            보통
                          </label>
                          <label className="flex flex-col items-center gap-1 cursor-pointer">
                            <input type="radio" name="gradientSpeed" checked={gradientSpeed === 'fast'} onChange={() => setGradientSpeed('fast')} />
                            빠르게
                          </label>
                        </div>
                      </div>

                      {/* Opacity */}
                      <div className="pt-3 border-t border-gray-100">
                        <div className="font-semibold text-gray-800 text-[13px] mb-2 flex items-center gap-1.5"><Droplets size={14} />진하기</div>
                        <div className="flex items-center justify-between text-[13px] px-1 bg-white rounded-lg p-1 border border-gray-50 shadow-inner">
                          <button onClick={() => setGradientOpacity('light')} className={`px-3 py-1.5 rounded-md transition-colors ${gradientOpacity === 'light' ? 'bg-gray-100 font-medium text-black shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>은은하게</button>
                          <button onClick={() => setGradientOpacity('normal')} className={`px-3 py-1.5 rounded-md transition-colors ${gradientOpacity === 'normal' ? 'bg-gray-100 font-medium text-black shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>보통</button>
                          <button onClick={() => setGradientOpacity('bold')} className={`px-3 py-1.5 rounded-md transition-colors ${gradientOpacity === 'bold' ? 'bg-gray-100 font-medium text-black shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>비비드</button>
                        </div>
                      </div>

                      {/* Direction */}
                      <div className="pt-3 border-t border-gray-100">
                        <div className="font-semibold text-gray-800 text-[13px] mb-2 flex items-center gap-1.5"><ArrowRight size={14} />오로라 퍼짐 방향</div>
                        <div className="flex flex-col gap-2 text-[13px] px-1">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="gradientDirection" checked={gradientDirection === 'bottom'} onChange={() => onDirectionChange('bottom')} />
                            <span className="text-gray-700">상하 피어오름 (기본)</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="gradientDirection" checked={gradientDirection === 'side'} onChange={() => onDirectionChange('side')} />
                            <span className="text-gray-700">좌우 대립 (교차)</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="gradientDirection" checked={gradientDirection === 'center'} onChange={() => onDirectionChange('center')} />
                            <span className="text-gray-700">중앙 발산 (몰입)</span>
                          </label>
                        </div>
                      </div>

                      {/* Start Signal Setup */}
                      <div className="pt-3 border-t border-gray-100">
                        <div className="font-semibold text-gray-800 text-[13px] mb-2 flex items-center gap-1.5"><Volume2 size={14} />시작 신호음</div>
                        <div className="grid grid-cols-5 gap-1 text-[12px] bg-white rounded-lg p-1 border border-gray-50 shadow-inner text-center">
                          <button onClick={() => handleSoundPreview('off')} className={`py-1.5 rounded-md transition-colors ${startSoundOption === 'off' ? 'bg-gray-100 font-medium text-black shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>OFF</button>
                          <button onClick={() => handleSoundPreview('1')} className={`py-1.5 rounded-md transition-colors ${startSoundOption === '1' ? 'bg-gray-100 font-medium text-black shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>음원1</button>
                          <button onClick={() => handleSoundPreview('2')} className={`py-1.5 rounded-md transition-colors ${startSoundOption === '2' ? 'bg-gray-100 font-medium text-black shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>음원2</button>
                          <button onClick={() => handleSoundPreview('3')} className={`py-1.5 rounded-md transition-colors ${startSoundOption === '3' ? 'bg-gray-100 font-medium text-black shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>음원3</button>
                          <button onClick={() => handleSoundPreview('4')} className={`py-1.5 rounded-md transition-colors ${startSoundOption === '4' ? 'bg-gray-100 font-medium text-black shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>음원4</button>
                        </div>
                      </div>

                      {/* UI Interaction Setup */}
                      <div className="pt-3 border-t border-gray-100">
                        <div className="font-semibold text-gray-800 text-[13px] mb-2 flex items-center gap-1.5"><Activity size={14} />UI 상호작용 사운드</div>
                        <div className="flex items-center justify-between text-[13px] px-1 bg-white rounded-lg p-1 border border-gray-50 shadow-inner">
                          <button onClick={() => setEnableUISound(true)} className={`px-3 py-1.5 rounded-md transition-colors ${enableUISound ? 'bg-gray-100 font-medium text-black shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>켜기 (ON)</button>
                          <button onClick={() => setEnableUISound(false)} className={`px-3 py-1.5 rounded-md transition-colors ${!enableUISound ? 'bg-gray-100 font-medium text-black shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>끄기 (OFF)</button>
                        </div>
                      </div>
                    </div>

                    {/* AI 발화자 페르소나 선택 */}
                    <div className="pt-3 mt-3 border-t border-gray-100">
                      <div className="font-semibold text-gray-800 text-[13px] mb-2 flex items-center gap-1.5"><UserCircle size={14} />AI 발화자 모드</div>
                      <div className="flex flex-col gap-2 text-[13px] px-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="speakerMode" checked={speakerMode === 'both'} onChange={() => setSpeakerMode('both')} />
                          <span className="w-3 h-3 rounded-full bg-gradient-to-r from-[#E65C00] to-[#005C97] inline-block shadow-sm"></span> 번갈아 대화 (Both)
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="speakerMode" checked={speakerMode === 'rumi'} onChange={() => { setSpeakerMode('rumi'); setActivePersona('rumi'); }} />
                          <span className="w-3 h-3 rounded-full bg-[#E65C00] inline-block shadow-sm"></span> Rumi 전용
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="speakerMode" checked={speakerMode === 'lami'} onChange={() => { setSpeakerMode('lami'); setActivePersona('lami'); }} />
                          <span className="w-3 h-3 rounded-full bg-[#005C97] inline-block shadow-sm"></span> Lami 전용
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
