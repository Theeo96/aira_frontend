import React, { useState, useEffect, useRef } from "react";
import {
  requestMicPermission,
  requestCameraPermission,
  requestLocationPermission,
  requestWakeLock,
} from "./services/permissionService";
import { AppState, Persona, ChatMessage, GradientTheme, GradientSpeed, GradientOpacity, GradientDirection, StartSoundOption, EnableUISound } from "./types";
import { Header, Drawer } from "./components/Layout";
import { getAIResponse } from "./services/geminiService";
import { useEarcon } from "./src/hooks/useEarcon";

// Page Imports
import SplashPage from "./src/pages/SplashPage";
import OnboardingPage from "./src/pages/OnboardingPage";
import LoginPage from "./src/pages/LoginPage";
import HomePage from "./src/pages/HomePage";
import HistoryPage from "./src/pages/HistoryPage";
import ChatFilePage from "./src/pages/ChatFilePage";
import BrandStoryPage from "./src/pages/BrandStoryPage";

import SchedulePage from "./src/pages/SchedulePage";
import EmailPage from "./src/pages/EmailPage";
import { MicPermissionPage, CameraPermissionPage, LocationPermissionPage } from "./src/pages/PermissionPages";

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.SPLASH);
  const [activePersona, setActivePersona] = useState<Persona>("rumi");
  const [speakerMode, setSpeakerMode] = useState<"rumi" | "lami" | "both">("both");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isListening, setIsListening] = useState(true);
  const [isOnboarding, setIsOnboarding] = useState(true);
  const [startSoundOption, setStartSoundOption] = useState<StartSoundOption>(() => {
    return (localStorage.getItem('startSoundOption') as StartSoundOption) || '1';
  });
  const [enableUISound, setEnableUISound] = useState<EnableUISound>(true);

  // UI Sound Earcons
  const { playSuccess } = useEarcon(enableUISound);

  // Standard Input State (Replaces keyboard logic)
  const [inputText, setInputText] = useState("");

  const [activeMessage, setActiveMessage] = useState<string>("");
  const [historyView, setHistoryView] = useState<"graph" | "list">("graph");

  // Gradient Controls State
  const [theme, setTheme] = useState<GradientTheme>('aira');
  const [gradientSpeed, setGradientSpeed] = useState<GradientSpeed>('fast');
  const [gradientOpacity, setGradientOpacity] = useState<GradientOpacity>('bold');
  const [gradientDirection, setGradientDirection] = useState<GradientDirection>('bottom');

  // Legacy KOREAN_MAP and keyboard handlers removed

  const history = [
    {
      id: "1",
      user_id: "user_001",
      date: "2026-02-04T15:30:00Z",
      full_transcript: "User: 이번 주말에 서울 근교로 드라이브 가고 싶은데 추천해줄래?\nAIRA: 서울 근교라면 양평 두물머리나 남양주 물의 정원이 좋습니다. 특히 양평은 강변을 따라 예쁜 카페가 많아 휴식하기 좋아요. 날씨가 좋다면 팔당댐을 따라 드라이브하는 코스도 추천합니다.\nUser: 양평 좋네! 거기서 유명한 맛집도 있을까?\nAIRA: 네, 양평에는 두물머리 연핫도그가 유명하고, 강변을 바라보며 식사할 수 있는 한정식 집과 장어구이 식당이 많습니다. '초계국수' 본점도 팔당교 근처에 있어 시원하게 드시기 좋습니다.\nUser: 완벽해! 이번 주말 일정은 그걸로 정했어. 고마워!\nAIRA: 도움이 되어 기쁩니다! 안전하고 즐거운 주말 드라이브 되시길 바랍니다.",
      summary: {
        context_summary: "서울 근교 드리이브 코스 및 맛집 추천 (양평 두물머리, 남양주)",
        sentiment: "positive",
      },
    },
    {
      id: "2",
      user_id: "user_001",
      date: "2026-02-04T09:15:00Z",
      full_transcript: "User: 오늘 오후에 강남역에서 회의가 있는데, 지금 출발하면 얼마나 걸릴까?\nAIRA: 현재 위치에서 강남역까지 교통 상황을 확인해보니 예상 소요 시간은 약 45분입니다. 강변북로 일부 구간에 정체가 있어 조금 여유 있게 출발하시는 것이 좋겠습니다.\nUser: 알겠어. 그럼 10분 뒤에 출발할게. 혹시 버스가 더 빠를까?\nAIRA: 현재로서는 지하철 이용 시 약 35분, 버스 이용 시 약 50분이 소요될 것으로 예상됩니다. 정체 구간을 고려하면 지하철이 더 빠르고 정확합니다.\nUser: 고마워! 지하철로 가야겠다.",
      summary: {
        context_summary: "강남역 이동 시간 확인 및 교통 수단 추천 요청 (지하철 추천)",
        sentiment: "neutral",
      },
    },
    {
      id: "3",
      user_id: "user_001",
      date: "2026-02-03T18:40:00Z",
      full_transcript: "User: 요즘 너무 피곤해서 밤에 잠이 안 와. 어떻게 하면 좋을까?\nAIRA: 불면증으로 힘드신 것 같네요. 잠들기 1~2시간 전에는 따뜻한 우유나 캐모마일 차를 드시는 것이 도움이 될 수 있습니다. 스마트폰 불빛은 수면을 방해하므로 자기 전에는 화면을 보지 않는 것이 좋습니다.\nUser: 스마트폰을 계속 보게 되더라고... 내일부터 조심해야겠어. \nAIRA: 네, 수면 패턴을 일정하게 유지하는 것도 중요합니다. 편안한 음악이나 명상이 필요하시다면 틀어드릴까요?\nUser: 아니, 오늘은 괜찮아. 조언 고마워.\nAIRA: 편안한 밤 되시기를 바랍니다.",
      summary: {
        context_summary: "수면 장애 고민 터놓기 및 수면 유도 팁 제공",
        sentiment: "negative",
      },
    },
    {
      id: "4",
      user_id: "user_001",
      date: "2026-02-03T13:20:00Z",
      full_transcript: "User: 내일 발표 자료 만들어야 하는데 아이디어가 안 떠올라.\nAIRA: 발표 준비로 부담이 크시군요. 어떤 주제의 발표인지 간단히 알려주시면, 브레인스토밍을 도와드리겠습니다.\nUser: 우리 팀의 새로운 AI 프로젝트에 관한 내용이야.\nAIRA: 좋습니다. 첫째, 프로젝트의 '해결하고자 하는 문제'를 명확히 하고. 둘째, '우리만의 차별점'을 강조하며. 셋째, '기대 효과'를 수치로 보여주는 구조를 추천합니다. 관련된 구체적인 사례가 있으신가요?\nUser: 오, 구조가 잡힌다! 사례는 내가 정리해 볼게. 고마워!\nAIRA: 훌륭합니다! 언제든 더 필요한 부분이 있다면 말씀해주세요.",
      summary: {
        context_summary: "새로운 프로젝트 발표 자료 구성을 위한 브레인스토밍 지원",
        sentiment: "positive",
      },
    },
    {
      id: "5",
      user_id: "user_001",
      date: "2026-02-03T08:10:00Z",
      full_transcript: "User: 아침부터 비가 오네. 오늘 우산 챙겨야겠지?\nAIRA: 네, 오늘은 하루 종일 비가 예보되어 있습니다. 꼭 튼튼한 우산을 챙기시길 바랍니다.\nUser: 알았어. 비 오는 날 어울리는 음악 추천해줘.\nAIRA: 비 오는 날 듣기 좋은 차분한 재즈나 어쿠스틱 팝을 추천해 드립니다. 지금 바로 재생할까요?\nUser: 응, 틀어줘.\nAIRA: 네, 비 내리는 날의 감성 플레이리스트를 재생합니다.",
      summary: {
        context_summary: "날씨 확인 및 비 오는 날 분위기의 음악 재생 요청",
        sentiment: "neutral",
      },
    },
    {
      id: "6",
      user_id: "user_001",
      date: "2026-02-02T21:05:00Z",
      full_transcript: "User: 오늘 진짜 짜증 나는 일이 있었어. 직장 동료가 내 아이디어를 가로챘거든.\nAIRA: 정말 속상하시겠어요. 열심히 준비한 아이디어인데 상실감이 크실 것 같습니다.\nUser: 맞아... 증명할 방법도 없고 너무 답답해.\nAIRA: 지금은 무엇보다 마음을 추스르는 것이 중요해 보입니다. 감정이 조금 진정된 후에 동료와 조용히 대화를 나누어 보거나, 다음번에는 아이디어를 문서화해서 기록을 남겨두는 것도 방법이 될 수 있습니다.\nUser: 그래, 기록을 잘 남겨야겠어. 내 말 들어줘서 고마워.\nAIRA: 언제든지 힘든 일이 있으면 편하게 말씀해주세요. 제가 항상 들어드릴게요.",
      summary: {
        context_summary: "직장 내 갈등에 대한 하소연 및 정서적 위로 제공",
        sentiment: "negative",
      },
    },
    {
      id: "7",
      user_id: "user_001",
      date: "2026-02-02T12:30:00Z",
      full_transcript: "User: 점심 메뉴 추천해줘. 오늘 엄청 매운 거 먹고 싶어.\nAIRA: 매운 음식이 당기시는군요! 근처에 마라탕, 매운 떡볶이, 쭈꾸미 볶음, 그리고 불닭 음식점들이 있습니다. 어떤 종류가 제일 끌리시나요?\nUser: 마라탕이 좋겠다. 근처 평점 4점 이상인 곳 있어?\nAIRA: 네, 현재 위치에서 도보 5분 거리에 평점 4.5점인 '호우양꼬치 마라탕'이 있습니다. \nUser: 좋아, 거기로 가야겠다.\nAIRA: 맛있는 점심 식사 되세요!",
      summary: {
        context_summary: "매운 점심 메뉴 추천 및 근처 평점 높은 마라탕 식당 안내",
        sentiment: "positive",
      },
    },
    {
      id: "8",
      user_id: "user_001",
      date: "2026-01-28T10:00:00Z",
      full_transcript: "User: 처음 써보는데 어떻게 사용하는 거야?\nAIRA: 안녕하세요! 저는 আপনার 일상을 돕는 AI 어시스턴트 AIRA입니다. 음성이나 텍스트로 질문을 하셔도 좋고, 일정 관리나 정보 검색 등을 요청하셔도 됩니다. 무엇을 도와드릴까요?\nUser: 그렇구나. 반가워. 앞으로 잘 부탁해.\nAIRA: 저도 반갑습니다! 앞으로 최고의 도움을 드릴 수 있도록 노력하겠습니다.",
      summary: {
        context_summary: "앱 최초 실행 및 온보딩 대화",
        sentiment: "positive",
      },
    },
  ];

  useEffect(() => {
    if (appState === AppState.SPLASH) {
      setTimeout(() => setAppState(AppState.PERMISSION), 2000);
    }
  }, [appState]);

  useEffect(() => {
    localStorage.setItem('startSoundOption', startSoundOption);
  }, [startSoundOption]);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const msg = inputText;
    // Keep inputText or clear it? Usually clear it.
    setInputText("");
    setIsListening(false);

    setActiveMessage("...");
    const aiResp = await getAIResponse(msg, [activePersona]);
    setActiveMessage(aiResp);

    // Toggle persona output if speaker mode is 'both'
    if (speakerMode === "both") {
      setActivePersona(prev => (prev === "rumi" ? "lami" : "rumi"));
    }
  };

  // ----- Onboarding Permission Handlers -----

  const handleMicPermission = async () => {
    const granted = await requestMicPermission();
    if (granted) {
      setAppState(AppState.CAMERA_PERMISSION);
    } else {
      alert("마이크 권한이 차단되었습니다.\n\n브라우저 주소 표시줄의 자물쇠/설정 아이콘을 눌러\n마이크 권한을 '허용' 또는 '재설정' 해주세요.");
    }
  };

  const handleOnboardingCameraGrant = async () => {
    await requestCameraPermission();
    playSuccess();
    setAppState(AppState.ONBOARDING_1);
  };

  const handleOnboardingCameraDeny = () => {
    // Skip permission request, just move next
    setAppState(AppState.ONBOARDING_1);
  };

  const handleOnboardingLocationGrant = async () => {
    await requestLocationPermission();
    playSuccess();
    setAppState(AppState.ONBOARDING_2);
  };

  const handleOnboardingLocationDeny = () => {
    // Skip permission request, just move next
    setAppState(AppState.ONBOARDING_2);
  };

  const startHome = () => {
    if (startSoundOption !== 'off') {
      const audio = new Audio(`/start_signal${startSoundOption}.mp3`);
      audio.play().catch(e => console.log("Audio play failed:", e));
    }
    setIsOnboarding(false);
    setAppState(AppState.HOME);
  };

  // ----- Retry Permission Handlers (From Home) -----

  const handleCameraClick = async () => {
    // We could check permission here if possible, but simplest is to just show the request page
    // assuming the user wants to enable it now.
    setAppState(AppState.CAMERA_PERMISSION);
  };

  const handleRetryCameraGrant = async () => {
    const granted = await requestCameraPermission();
    if (granted) {
      // Feature ready
      setAppState(AppState.HOME);
      // In a real app, we might open the camera view here.
      alert("카메라 기능이 준비되었습니다.");
    } else {
      // User denied in browser prompt
      handleRetryCameraDeny();
    }
  };

  const handleRetryCameraDeny = () => {
    setAppState(AppState.HOME);
    alert("카메라를 이용하시려면 권한이 필요합니다.");
  };

  const handleMicToggle = () => {
    const nextState = !isListening;
    setIsListening(nextState);
    if (nextState) {
      setActiveMessage(""); // Clear active message to let the "listening quote" show immediately
    }
  };

  const handleScreenShareClick = async () => {
    try {
      // Trigger actual browser screen sharing prompt
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      // If user approves, we get the stream
      playSuccess();
      setActiveMessage("화면을 분석하고 있습니다.");

      // Stop the stream right away since this is just a dummy visual effect
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      console.log("Screen share cancelled or failed.", err);
    }
  };

  const handleCameraFakeClick = () => {
    // Show a fake feedback for vision analysis
    setActiveMessage("화면을 분석하고 있습니다.");
  };

  const handleLogin = () => {
    // In real app, we might fetch user profile here
    setAppState(AppState.HOME);
  };

  useEffect(() => {
    const initWakeLock = async () => {
      await requestWakeLock();
    };

    initWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        initWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const renderContent = () => {
    switch (appState) {
      case AppState.SPLASH:
        return <SplashPage />;
      case AppState.PERMISSION:
        return (
          <>
            <Header onMenuClick={() => { setIsDrawerOpen(true); }} currentScreen={appState} activePersona={activePersona} onTogglePersona={() => setActivePersona(prev => prev === "rumi" ? "lami" : "rumi")} />
            <HomePage
              activeMessage={activeMessage}
              activePersona={activePersona}
              isListening={isListening}
              inputText={inputText}
              setInputText={setInputText}
              onSend={handleSend}
              onMicToggle={handleMicToggle}
              onCameraClick={handleCameraFakeClick}
              onScreenShareClick={handleScreenShareClick}
              onNavigateToUpload={() => setAppState(AppState.CHAT_FILE)}
            />
            <MicPermissionPage
              onPermissionGrant={handleMicPermission}
              onPermissionDeny={() => alert("마이크 권한이 차단되었습니다.\n\n브라우저 주소 표시줄의 자물쇠/설정 아이콘을 눌러\n마이크 권한을 '허용' 또는 '재설정' 해주세요.")}
            />
          </>
        );
      case AppState.CAMERA_PERMISSION:
        // Use different handlers based on whether we are in onboarding or retry mode
        return (
          <>
            <Header onMenuClick={() => { setIsDrawerOpen(true); }} currentScreen={appState} activePersona={activePersona} onTogglePersona={() => setActivePersona(prev => prev === "rumi" ? "lami" : "rumi")} />
            <HomePage
              activeMessage={activeMessage}
              activePersona={activePersona}
              isListening={isListening}
              inputText={inputText}
              setInputText={setInputText}
              onSend={handleSend}
              onMicToggle={handleMicToggle}
              onCameraClick={handleCameraFakeClick}
              onScreenShareClick={handleScreenShareClick}
              onNavigateToUpload={() => setAppState(AppState.CHAT_FILE)}
              theme={theme}
              gradientSpeed={gradientSpeed}
              gradientOpacity={gradientOpacity}
              gradientDirection={gradientDirection}
            />
            <CameraPermissionPage
              onPermissionGrant={isOnboarding ? handleOnboardingCameraGrant : handleRetryCameraGrant}
              onPermissionDeny={isOnboarding ? handleOnboardingCameraDeny : handleRetryCameraDeny}
            />
          </>
        );
      case AppState.ONBOARDING_1:
        return (
          <>
            <Header onMenuClick={() => { setIsDrawerOpen(true); }} currentScreen={appState} activePersona={activePersona} onTogglePersona={() => setActivePersona(prev => prev === "rumi" ? "lami" : "rumi")} />
            <HomePage
              activeMessage={activeMessage}
              activePersona={activePersona}
              isListening={isListening}
              inputText={inputText}
              setInputText={setInputText}
              onSend={handleSend}
              onMicToggle={handleMicToggle}
              onCameraClick={handleCameraFakeClick}
              onScreenShareClick={handleScreenShareClick}
              onNavigateToUpload={() => setAppState(AppState.CHAT_FILE)}
              theme={theme}
              gradientSpeed={gradientSpeed}
              gradientOpacity={gradientOpacity}
            />
            <LocationPermissionPage
              onPermissionGrant={handleOnboardingLocationGrant}
              onPermissionDeny={handleOnboardingLocationDeny}
            />
          </>
        );
      case AppState.ONBOARDING_2:
        return (
          <>
            <Header onMenuClick={() => { setIsDrawerOpen(true); }} currentScreen={appState} activePersona={activePersona} onTogglePersona={() => setActivePersona(prev => prev === "rumi" ? "lami" : "rumi")} />
            <HomePage
              activeMessage={activeMessage}
              activePersona={activePersona}
              isListening={isListening}
              inputText={inputText}
              setInputText={setInputText}
              onSend={handleSend}
              onMicToggle={handleMicToggle}
              onCameraClick={handleCameraFakeClick}
              onScreenShareClick={handleScreenShareClick}
              onNavigateToUpload={() => setAppState(AppState.CHAT_FILE)}
              theme={theme}
              gradientSpeed={gradientSpeed}
              gradientOpacity={gradientOpacity}
            />
            <OnboardingPage onStart={startHome} />
          </>
        );
      case AppState.KEYBOARD:
        // Map to Home logic
        return (
          <>
            <Header onMenuClick={() => setIsDrawerOpen(true)} currentScreen={AppState.HOME} activePersona={activePersona} onTogglePersona={() => setActivePersona(prev => prev === "rumi" ? "lami" : "rumi")} />
            <HomePage
              activeMessage={activeMessage}
              activePersona={activePersona}
              isListening={isListening}
              inputText={inputText}
              setInputText={setInputText}
              onSend={handleSend}
              onMicToggle={handleMicToggle}
              onCameraClick={handleCameraFakeClick}
              onScreenShareClick={handleScreenShareClick}
              onNavigateToUpload={() => setAppState(AppState.CHAT_FILE)}
              theme={theme}
              gradientSpeed={gradientSpeed}
              gradientOpacity={gradientOpacity}
            />
          </>
        );
      case AppState.CHAT_FILE:
      case AppState.HOME:
        return <HomePage
          activeMessage={activeMessage}
          activePersona={activePersona}
          isListening={isListening}
          inputText={inputText}
          setInputText={setInputText}
          onSend={handleSend}
          onMicToggle={handleMicToggle}
          onCameraClick={handleCameraFakeClick}
          onScreenShareClick={handleScreenShareClick}
          onNavigateToUpload={() => setAppState(AppState.CHAT_FILE)}
          theme={theme}
          gradientSpeed={gradientSpeed}
          gradientOpacity={gradientOpacity}
        />;
      case AppState.LOGIN:
        return <LoginPage onLogin={handleLogin} />;

      case AppState.HISTORY:
        return <HistoryPage
          historyData={history}
          viewMode={historyView}
          setViewMode={setHistoryView}
          persona={activePersona}
        />;
      case AppState.EMAIL:
        return <EmailPage />;
      case AppState.SCHEDULE:
        return <SchedulePage />;
      default:
        return <HomePage
          activeMessage={activeMessage}
          activePersona={activePersona}
          isListening={isListening}
          inputText={inputText}
          setInputText={setInputText}
          onSend={handleSend}
          onMicToggle={handleMicToggle}
          onCameraClick={handleCameraFakeClick}
          onScreenShareClick={handleScreenShareClick}
          onNavigateToUpload={() => setAppState(AppState.CHAT_FILE)}
          theme={theme}
          gradientSpeed={gradientSpeed}
          gradientOpacity={gradientOpacity}
        />;
    }
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#F0EEE9] shadow-2xl">
      {/* Background decoration for Home */}
      {(appState === AppState.HOME || appState === AppState.CHAT_FILE || appState === AppState.BRAND_STORY || appState === AppState.PERMISSION || appState === AppState.CAMERA_PERMISSION || appState === AppState.ONBOARDING_1 || appState === AppState.ONBOARDING_2) && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-white/30 blur-[100px] rounded-full -z-10"></div>
      )}

      {/* Main View */}
      <div className="h-full relative overflow-hidden">
        {appState !== AppState.SPLASH && appState !== AppState.PERMISSION && appState !== AppState.CAMERA_PERMISSION && appState !== AppState.ONBOARDING_1 && (
          <Header
            onMenuClick={() => setIsDrawerOpen(true)}
            currentScreen={appState}
            goBack={() => setAppState(AppState.HOME)}
            activePersona={activePersona}
            onTogglePersona={() => setActivePersona(prev => prev === "rumi" ? "lami" : "rumi")}
          />
        )}
        {renderContent()}
      </div>

      {/* Overlays */}
      {/* 5. Upload Tab Slide-up Overlay */}
      <div
        className={`absolute inset-0 z-[45] bg-[#F0EEE9] transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${appState === AppState.CHAT_FILE ? "translate-y-0" : "translate-y-full"
          }`}
      >
        <ChatFilePage
          setAppState={setAppState}
          isListening={isListening}
          setIsListening={setIsListening}
          activePersona={activePersona}
        />
      </div>

      {/* 6. Brand Story Slide-up Overlay */}
      <div
        className={`absolute inset-0 z-[46] bg-[#F0EEE9]/30 transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${appState === AppState.BRAND_STORY ? "translate-y-0" : "translate-y-full"
          }`}
      >
        <BrandStoryPage setAppState={setAppState} />
      </div>

      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onNavigate={(state) => {
          if (state === AppState.HISTORY) setHistoryView("graph");
          setAppState(state);
          setIsDrawerOpen(false);
        }}
        theme={theme} setTheme={setTheme}
        gradientSpeed={gradientSpeed} setGradientSpeed={setGradientSpeed}
        gradientOpacity={gradientOpacity} setGradientOpacity={setGradientOpacity}
        speakerMode={speakerMode} setSpeakerMode={setSpeakerMode}
        setActivePersona={setActivePersona}
        gradientDirection={gradientDirection} onDirectionChange={setGradientDirection}
        startSoundOption={startSoundOption} setStartSoundOption={setStartSoundOption}
        enableUISound={enableUISound} setEnableUISound={setEnableUISound}
      />
    </div>
  );
};

export default App;
