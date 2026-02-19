import React, { useState, useEffect, useRef } from "react";
import { AppState, Persona } from "./types";
import { COLORS, PERSONA_DATA } from "./constants";
import { Header, Drawer } from "./components/Layout";
import { getAIResponse } from "./services/geminiService";
import { composeHangul } from "./utils/hangul";
// Added missing Calendar and Mail icons to the import list
import {
  Mic,
  Send,
  Search,
  ArrowRight,
  FileText,
  Image as ImageIcon,
  Camera,
  Calendar,
  Mail,
  Keyboard,
  Settings,
  MapPin,
} from "lucide-react";

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.SPLASH);
  const [activePersonas, setActivePersonas] = useState<Persona[]>([
    "lumi",
    "rami",
  ]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [inputText, setInputText] = useState("");
  const [activeMessage, setActiveMessage] = useState<string>("");
  const [historyView, setHistoryView] = useState<"graph" | "list">("graph");
  const [isKorean, setIsKorean] = useState(true);

  const KOREAN_MAP: Record<string, string> = {
    Q: "ㅂ",
    W: "ㅈ",
    E: "ㄷ",
    R: "ㄱ",
    T: "ㅅ",
    Y: "ㅛ",
    U: "ㅕ",
    I: "ㅑ",
    O: "ㅐ",
    P: "ㅔ",
    A: "ㅁ",
    S: "ㄴ",
    D: "ㅇ",
    F: "ㄹ",
    G: "ㅎ",
    H: "ㅗ",
    J: "ㅓ",
    K: "ㅏ",
    L: "ㅣ",
    Z: "ㅋ",
    X: "ㅌ",
    C: "ㅊ",
    V: "ㅍ",
    B: "ㅠ",
    N: "ㅜ",
    M: "ㅡ",
  };

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const togglePersona = (p: Persona) => {
    setActivePersonas((prev) => {
      if (prev.includes(p)) {
        if (prev.length === 1) return prev; // Prevent empty selection
        return prev.filter((item) => item !== p);
      }
      return [...prev, p];
    });
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    // Swipe logic removed for single step onboarding
  };

  const history = [
    { id: "1", title: "테스트 대화 8", date: "2026-02-04" },
    { id: "2", title: "테스트 대화 7", date: "2026-02-04" },
    { id: "3", title: "테스트 대화 6", date: "2026-02-03" },
    { id: "4", title: "테스트 대화 5", date: "2026-02-03" },
    { id: "5", title: "테스트 대화 4", date: "2026-02-03" },
    { id: "6", title: "테스트 대화 3", date: "2026-02-02" },
    { id: "7", title: "테스트 대화 2", date: "2026-02-02" },
    { id: "8", title: "테스트 대화 1", date: "2026-01-28" },
  ];

  useEffect(() => {
    if (appState === AppState.SPLASH) {
      setTimeout(() => setAppState(AppState.PERMISSION), 2000);
    }
  }, [appState]);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const msg = inputText;
    setInputText("");
    setIsListening(false);

    setActiveMessage("...");
    const aiResp = await getAIResponse(msg, activePersonas);
    setActiveMessage(aiResp);
  };

  const handleKeyPress = (key: string) => {
    if (isKorean && /^[A-Z]$/.test(key)) {
      const koChar = KOREAN_MAP[key];
      if (koChar) {
        setInputText((prev) => composeHangul(prev, koChar));
        return;
      }
    }
    setInputText((prev) => prev + key);
  };

  const handleBackspace = () => {
    setInputText((prev) => prev.slice(0, -1));
  };

  const renderSplash = () => (
    <div className="h-screen w-full flex items-center justify-center bg-[#FDFBF7]">
      <div className="w-48 h-48 flex items-center justify-center">
        <img
          src="/aira-logo.png"
          alt="AIRA Logo"
          className="w-full h-full object-contain animate-pulse"
        />
      </div>
    </div>
  );

  const renderMicPermission = () => (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4">
      <div className="bg-white w-fit rounded-[40px] p-10 flex flex-col items-center shadow-2xl animate-slide-up">
        <Mic size={48} className="mb-6 text-black" />
        <p className="text-center font-medium mb-12 text-gray-800 text-lg">
          AIRA에서 오디오를 녹음하도록 허용하시겠습니까?
        </p>
        <div className="w-full flex flex-col gap-6">
          <button
            onClick={() => setAppState(AppState.ONBOARDING_1)}
            className="w-full py-2 text-2xl font-medium"
          >
            앱 사용중에만 허용
          </button>
          <button
            onClick={() => setAppState(AppState.ONBOARDING_1)}
            className="w-full py-2 text-2xl font-medium"
          >
            이번만 허용
          </button>
          <button
            onClick={() => setAppState(AppState.ONBOARDING_1)}
            className="w-full py-2 text-2xl font-medium"
          >
            허용 안 함
          </button>
        </div>
      </div>
    </div>
  );

  const renderLocationPermission = () => (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4">
      <div className="bg-white w-fit rounded-[40px] p-10 flex flex-col items-center shadow-2xl animate-slide-up">
        <MapPin size={48} className="mb-6 text-black" />
        <p className="text-center font-medium mb-12 text-gray-800 text-lg">
          AIRA에서 이 기기의 위치 정보에 액세스하도록 허용하시겠습니까?
        </p>
        <div className="w-full flex flex-col gap-6">
          <button
            onClick={() => setAppState(AppState.ONBOARDING_2)}
            className="w-full py-2 text-2xl font-medium"
          >
            앱 사용중에만 허용
          </button>
          <button
            onClick={() => setAppState(AppState.ONBOARDING_2)}
            className="w-full py-2 text-2xl font-medium"
          >
            이번만 허용
          </button>
          <button
            onClick={() => setAppState(AppState.ONBOARDING_2)}
            className="w-full py-2 text-2xl font-medium"
          >
            허용 안 함
          </button>
        </div>
      </div>
    </div>
  );

  const renderOnboarding = () => (
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
          onClick={() => setAppState(AppState.HOME)}
          className="flex items-center gap-2 text-xl font-medium"
        >
          시작 〉
        </button>
      </div>
    </div>
  );

  const renderHome = () => (
    <div className="flex flex-col h-full pb-10">
      {/* Main Display Card */}
      <div className="flex-1 w-full bg-white rounded-b-[40px] shadow-sm relative overflow-hidden flex flex-col items-center pt-60">
        {/* Text Content */}
        <h2 className="text-3xl font-bold text-center leading-tight text-gray-900 z-10 px-6">
          {activeMessage || (
            <>
              지난주에 다녀온 맛집,
              <br />
              다시 가볼까요?
            </>
          )}
        </h2>

        {/* Aurora Effect Container */}
        <div
          className={`aurora-container absolute bottom-0 inset-x-0 h-full transition-opacity duration-500 ${isListening ? "opacity-100" : "opacity-80"}`}
        >
          {activePersonas.includes("lumi") && (
            <div
              className="aurora-orb absolute"
              style={{
                backgroundColor: "#FF8A65",
                animationDelay: "0s",
                left: activePersonas.length > 1 ? "-20%" : "0",
                width: "120%",
                height: "120%",
                bottom: "-20%",
              }}
            />
          )}
          {activePersonas.includes("rami") && (
            <div
              className="aurora-orb absolute"
              style={{
                backgroundColor: "#4DD0E1",
                animationDelay: "1s",
                left: activePersonas.length > 1 ? "20%" : "0",
                width: "120%",
                height: "120%",
                bottom: "-20%",
              }}
            />
          )}
        </div>
      </div>

      {/* Bottom Buttons */}
      <div className="h-24 flex items-center justify-center gap-6 mt-6">
        <button
          onClick={() => setAppState(AppState.KEYBOARD)}
          className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg border border-gray-100 active:scale-95 transition-transform"
        >
          <Keyboard size={32} className="text-gray-900" />
        </button>

        <button
          onClick={() => setIsListening(!isListening)}
          className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg border border-gray-100 active:scale-95 transition-transform"
        >
          <Mic
            size={32}
            className={`${isListening ? (activePersonas.includes("lumi") ? "text-[#FF8A65]" : "text-[#4DD0E1]") : "text-gray-900"}`}
          />
        </button>
      </div>
    </div>
  );

  const renderLogin = () => (
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

  const renderChatFile = () => (
    <div className="flex flex-col h-full pt-20 pb-10 px-6">
      {/* Main Display Card */}
      <div className="flex-1 w-full bg-white rounded-[40px] shadow-sm relative overflow-hidden flex flex-col items-center pt-24">
        <h2 className="text-2xl font-bold text-center mb-16 leading-relaxed text-gray-900 z-10 px-6">
          대화에 필요한 자료를
          <br />
          추가하시겠어요?
        </h2>

        <div className="flex justify-center gap-6 z-10 w-full px-6">
          <button className="flex-1 aspect-square bg-[#F7F7F5] rounded-[24px] flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform hover:bg-[#F0F0ED]">
            <FileText size={32} className="text-gray-700" strokeWidth={1.5} />
            <span className="text-xs font-medium text-gray-500">파일</span>
          </button>
          <button className="flex-1 aspect-square bg-[#F7F7F5] rounded-[24px] flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform hover:bg-[#F0F0ED]">
            <ImageIcon size={32} className="text-gray-700" strokeWidth={1.5} />
            <span className="text-xs font-medium text-gray-500">사진</span>
          </button>
          <button className="flex-1 aspect-square bg-[#F7F7F5] rounded-[24px] flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform hover:bg-[#F0F0ED]">
            <Camera size={32} className="text-gray-700" strokeWidth={1.5} />
            <span className="text-xs font-medium text-gray-500">카메라</span>
          </button>
        </div>
      </div>

      {/* Bottom Buttons */}
      <div className="h-24 flex items-center justify-center gap-6 mt-6">
        <button
          onClick={() => setAppState(AppState.KEYBOARD)}
          className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg border border-gray-100 active:scale-95 transition-transform"
        >
          <Keyboard size={32} className="text-gray-900" />
        </button>

        <button
          onClick={() => setIsListening(!isListening)}
          className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg border border-gray-100 active:scale-95 transition-transform"
        >
          <Mic
            size={32}
            className={`${isListening ? (activePersonas.includes("lumi") ? "text-[#FF8A65]" : "text-[#4DD0E1]") : "text-gray-900"}`}
          />
        </button>
      </div>
    </div>
  );

  const renderHistory = () => {
    if (historyView === "graph") {
      // Mock data for emotion nodes
      const nodes = [
        { id: 1, label: "기쁨", x: 50, y: 30, size: 80, color: "#FFEB3B" },
        { id: 2, label: "평온", x: 20, y: 50, size: 60, color: "#81C784" },
        { id: 3, label: "설렘", x: 70, y: 60, size: 50, color: "#F06292" },
        { id: 4, label: "기대", x: 40, y: 75, size: 40, color: "#64B5F6" },
        { id: 5, label: "뿌듯", x: 80, y: 25, size: 45, color: "#BA68C8" },
      ];

      return (
        <div className="h-full bg-white pt-24 pb-8 flex flex-col items-center">
          <div className="flex-1 w-full relative overflow-hidden flex flex-col items-center">
            <h3 className="text-xl font-bold mb-4 text-gray-800">
              최근 대화의 감정 흐름
            </h3>

            <div className="flex-1 w-full relative">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {/* Connection lines */}
                <line
                  x1="50"
                  y1="30"
                  x2="20"
                  y2="50"
                  stroke="#E0E0E0"
                  strokeWidth="0.5"
                />
                <line
                  x1="50"
                  y1="30"
                  x2="70"
                  y2="60"
                  stroke="#E0E0E0"
                  strokeWidth="0.5"
                />
                <line
                  x1="50"
                  y1="30"
                  x2="80"
                  y2="25"
                  stroke="#E0E0E0"
                  strokeWidth="0.5"
                />
                <line
                  x1="20"
                  y1="50"
                  x2="40"
                  y2="75"
                  stroke="#E0E0E0"
                  strokeWidth="0.5"
                />
                <line
                  x1="70"
                  y1="60"
                  x2="40"
                  y2="75"
                  stroke="#E0E0E0"
                  strokeWidth="0.5"
                />

                {nodes.map((node) => (
                  <g key={node.id} className="cursor-pointer">
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.size / 10}
                      fill={node.color}
                      className="opacity-80 animate-pulse"
                      style={{ animationDuration: `${2 + node.id}s` }}
                    />
                    <text
                      x={node.x}
                      y={node.y}
                      textAnchor="middle"
                      dy="0.3em"
                      className="text-[3px] font-bold fill-gray-800 pointer-events-none"
                    >
                      {node.label}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          <button
            onClick={() => setHistoryView("list")}
            className="w-[80%] py-4 bg-[#F0EEE9] rounded-2xl font-bold text-lg shadow-sm active:scale-95 transition-transform"
          >
            전체 대화 목록 보기
          </button>
        </div>
      );
    }

    return (
      <div className="h-full bg-white pt-24">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => setHistoryView("graph")}
              className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-bold flex items-center gap-2"
            >
              〈 감정 그래프
            </button>
            <div className="relative flex-1 ml-4">
              <Search
                size={20}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="검색"
                className="w-full py-2 pl-10 pr-4 bg-[#F0EEE9] rounded-lg outline-none text-sm"
              />
            </div>
          </div>
        </div>
        <div className="overflow-y-auto px-6 h-[calc(100%-120px)]">
          {history.map((item) => (
            <div
              key={item.id}
              className="py-6 border-b border-gray-100 flex flex-col cursor-pointer active:bg-gray-50 transition-colors px-2"
            >
              <span className="text-2xl font-medium text-gray-900">
                {item.title}
              </span>
              <span className="text-sm text-gray-400 mt-2 font-bold">
                {item.date}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSchedule = () => (
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

  const renderEmail = () => (
    <div className="h-full bg-[#F0EEE9] pt-36 px-8 flex flex-col items-center">
      <h3 className="text-2xl font-bold text-center mb-10 leading-snug">
        이메일 관리가 필요하신가요?
      </h3>
      <p className="text-gray-500 text-center text-sm mb-16 leading-relaxed">
        사용하시는 이메일을 연결하시면
        <br />
        AIRA가 메일을 분류하고
        <br />
        중요한 내용을 알려드릴 수 있어요.
      </p>

      <div className="flex flex-col items-center gap-4 mb-20">
        <div className="w-48 h-48 bg-white rounded-[40px] flex items-center justify-center shadow-sm">
          <Mail size={100} strokeWidth={1.5} />
        </div>
        <span className="text-lg font-bold">이메일 연결</span>
      </div>

      <p className="text-[11px] text-gray-500 text-center leading-relaxed">
        '캘린더 연결'을 누르시면 이용 정책에 동의하시고
        <br />
        개인정보 처리방침을 확인했음에 동의하시는 것입니다.
      </p>
    </div>
  );

  const renderContent = () => {
    switch (appState) {
      case AppState.SPLASH:
        return renderSplash();
      case AppState.PERMISSION:
        return (
          <>
            <Header onMenuClick={() => {}} currentScreen={appState} />
            {renderHome()}
            {renderMicPermission()}
          </>
        );
      case AppState.ONBOARDING_1:
        return (
          <>
            <Header onMenuClick={() => {}} currentScreen={appState} />
            {renderHome()}
            {renderLocationPermission()}
          </>
        );
      case AppState.ONBOARDING_2:
        return (
          <>
            <Header onMenuClick={() => {}} currentScreen={appState} />
            {renderHome()}
            {renderOnboarding()}
          </>
        );
      case AppState.KEYBOARD:
        return (
          <>
            <Header
              onMenuClick={() => {}}
              currentScreen={appState}
              goBack={() => setAppState(AppState.HOME)}
            />
            <div className="flex flex-col h-full pt-32 px-8 bg-[#F0EEE9]">
              <div className="flex-1 flex flex-col items-center">
                <h2 className="text-3xl font-bold text-center mb-10 leading-tight text-gray-900">
                  {activeMessage || (
                    <>
                      지난주에 다녀온 맛집,
                      <br />
                      다시 가볼까요?
                    </>
                  )}
                </h2>

                {/* Input Display Area */}
                <div className="w-full bg-white rounded-[20px] p-6 shadow-sm flex items-center justify-between mb-8">
                  <div
                    className={`text-xl font-medium flex-1 ${inputText ? "text-gray-900" : "text-gray-400"}`}
                  >
                    {inputText || "오늘 기분 어떠신가요?"}
                    <span className="animate-pulse text-gray-400 ml-1">|</span>
                  </div>
                  <Mic
                    size={32}
                    className="text-black ml-4"
                    strokeWidth={2.5}
                  />
                </div>
              </div>

              {/* Mock Keyboard Area */}
              <div className="w-full bg-[#D1D5DB] p-2 pb-6 rounded-t-[20px]">
                {/* Toolbar */}
                <div className="flex justify-between px-4 py-3 mb-2 text-gray-600">
                  <div className="flex gap-4">
                    <div className="w-6 h-6 rounded-full border border-gray-500 flex items-center justify-center text-xs">
                      :)
                    </div>
                    <Settings size={20} />
                    <FileText size={20} />
                  </div>
                  <div className="flex gap-4">
                    <div className="w-6 h-6 bg-gray-600 rounded-full text-white text-xs flex items-center justify-center">
                      Pass
                    </div>
                    <div className="w-1 h-1 bg-gray-600 rounded-full mt-2"></div>
                    <div className="w-1 h-1 bg-gray-600 rounded-full mt-2"></div>
                    <div className="w-1 h-1 bg-gray-600 rounded-full mt-2"></div>
                  </div>
                </div>

                {/* Keys Rows */}
                <div className="flex flex-col gap-3">
                  {/* Row 1 */}
                  <div className="flex justify-center gap-1.5">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((k) => (
                      <div
                        key={k}
                        onClick={() => handleKeyPress(k.toString())}
                        className="w-[8.5%] aspect-[3/4] bg-white rounded-md flex items-center justify-center text-xl font-medium shadow-sm active:bg-gray-200 cursor-pointer"
                      >
                        {k}
                      </div>
                    ))}
                  </div>
                  {/* Row 2 */}
                  <div className="flex justify-center gap-1.5">
                    {["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"].map(
                      (k) => (
                        <div
                          key={k}
                          onClick={() => handleKeyPress(k)}
                          className="w-[8.5%] aspect-[3/4] bg-white rounded-md flex items-center justify-center text-xl font-medium shadow-sm active:bg-gray-200 cursor-pointer"
                        >
                          {isKorean ? KOREAN_MAP[k] : k}
                        </div>
                      ),
                    )}
                  </div>
                  {/* Row 3 */}
                  <div className="flex justify-center gap-1.5 px-4">
                    {["A", "S", "D", "F", "G", "H", "J", "K", "L"].map((k) => (
                      <div
                        key={k}
                        onClick={() => handleKeyPress(k)}
                        className="w-[9%] aspect-[3/4] bg-white rounded-md flex items-center justify-center text-xl font-medium shadow-sm active:bg-gray-200 cursor-pointer"
                      >
                        {isKorean ? KOREAN_MAP[k] : k}
                      </div>
                    ))}
                  </div>
                  {/* Row 4 */}
                  <div className="flex justify-center gap-3 px-2">
                    <div className="w-[12%] aspect-[3/4] bg-[#B0B8C1] rounded-md flex items-center justify-center shadow-sm cursor-pointer active:bg-gray-400">
                      <ArrowRight
                        size={24}
                        className="rotate-[-90deg] text-gray-700"
                      />
                    </div>
                    {["Z", "X", "C", "V", "B", "N", "M"].map((k) => (
                      <div
                        key={k}
                        onClick={() => handleKeyPress(k)}
                        className="w-[9%] aspect-[3/4] bg-white rounded-md flex items-center justify-center text-xl font-medium shadow-sm active:bg-gray-200 cursor-pointer"
                      >
                        {isKorean ? KOREAN_MAP[k] : k}
                      </div>
                    ))}
                    <div
                      onClick={handleBackspace}
                      className="w-[12%] aspect-[3/4] bg-[#B0B8C1] rounded-md flex items-center justify-center shadow-sm cursor-pointer active:bg-gray-400"
                    >
                      <div className="text-xl">⌫</div>
                    </div>
                  </div>
                  {/* Row 5 */}
                  <div className="flex justify-center gap-2 px-2 mt-1">
                    <div className="w-[12%] h-12 bg-[#B0B8C1] rounded-md flex items-center justify-center text-sm font-medium text-gray-700 shadow-sm cursor-pointer active:bg-gray-400">
                      !#1
                    </div>
                    <div
                      onClick={() => setIsKorean(!isKorean)}
                      className={`w-[12%] h-12 rounded-md flex items-center justify-center text-sm font-black shadow-sm cursor-pointer active:scale-95 transition-all ${isKorean ? "bg-black text-white" : "bg-[#B0B8C1] text-gray-700"}`}
                    >
                      {isKorean ? "한" : "영"}
                    </div>
                    <div className="w-[12%] h-12 bg-[#B0B8C1] rounded-md flex items-center justify-center text-sm font-medium text-gray-700 shadow-sm cursor-pointer active:bg-gray-400">
                      @
                    </div>
                    <div
                      onClick={() => handleKeyPress(" ")}
                      className="flex-1 h-12 bg-white rounded-md flex items-center justify-center shadow-sm cursor-pointer active:bg-gray-200"
                    >
                      <div className="w-1/2 h-1 bg-gray-300 rounded-full"></div>
                    </div>
                    <div
                      onClick={() => handleKeyPress(".")}
                      className="w-[12%] h-12 bg-white rounded-md flex items-center justify-center text-xl font-medium shadow-sm cursor-pointer active:bg-gray-200"
                    >
                      .
                    </div>
                    <div
                      onClick={handleSend}
                      className="w-[12%] h-12 bg-[#B0B8C1] rounded-md flex items-center justify-center shadow-sm cursor-pointer active:bg-gray-400"
                    >
                      <ArrowRight size={20} className="text-gray-700" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      case AppState.HOME:
        return renderHome();
      case AppState.LOGIN:
        return renderLogin();
      case AppState.CHAT_FILE:
        return renderChatFile();
      case AppState.HISTORY:
        return renderHistory();
      case AppState.EMAIL:
        return renderEmail();
      case AppState.SCHEDULE:
        return renderSchedule();
      default:
        return renderHome();
    }
  };

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full max-w-[500px] mx-auto overflow-hidden bg-[#F0EEE9] shadow-2xl">
      {/* Background decoration for Home */}
      {appState === AppState.HOME && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-white/30 blur-[100px] rounded-full -z-10"></div>
      )}

      {/* Main View */}
      <div className="h-full relative overflow-hidden">
        {appState !== AppState.SPLASH && appState !== AppState.PERMISSION && (
          <Header
            onMenuClick={() => setIsDrawerOpen(true)}
            currentScreen={appState}
            goBack={() => setAppState(AppState.HOME)}
          />
        )}
        {renderContent()}
      </div>

      {/* Overlays */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onNavigate={(state) => {
          if (state === AppState.HISTORY) setHistoryView("graph");
          setAppState(state);
          setIsDrawerOpen(false);
        }}
      />
    </div>
  );
};

export default App;
