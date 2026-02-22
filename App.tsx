import React, { useState, useEffect } from "react";
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
import MicTestModal from "./src/components/MicTestModal";

import SchedulePage from "./src/pages/SchedulePage";
import EmailPage from "./src/pages/EmailPage";
import { MicPermissionPage, CameraPermissionPage, LocationPermissionPage } from "./src/pages/PermissionPages";

const ONBOARDING_COMPLETE_KEY = "aira.onboarding.completed";
const LAB_MIC_TEST_ENABLED_KEY = "aira.lab.micTestEnabled";

const isOnboardingCompleted = () => {
  try {
    return localStorage.getItem(ONBOARDING_COMPLETE_KEY) === "true";
  } catch {
    return false;
  }
};

const setOnboardingCompleted = () => {
  try {
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
  } catch {
    // Ignore storage write failures (private mode, quota, etc.)
  }
};

const isLabMicTestEnabled = () => {
  try {
    return localStorage.getItem(LAB_MIC_TEST_ENABLED_KEY) === "true";
  } catch {
    return false;
  }
};

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.SPLASH);
  const [activePersona, setActivePersona] = useState<Persona>("rumi");
  const [speakerMode, setSpeakerMode] = useState<"rumi" | "lami" | "both">("both");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isListening, setIsListening] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [cameraFacingMode, setCameraFacingMode] = useState<"user" | "environment">("user");
  const [showMicTestModal, setShowMicTestModal] = useState(false);
  const [hasMicBeenTurnedOff, setHasMicBeenTurnedOff] = useState(false);
  const [hasShownMicTestModal, setHasShownMicTestModal] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(() => !isOnboardingCompleted());
  const [startSoundOption, setStartSoundOption] = useState<StartSoundOption>(() => {
    return (localStorage.getItem('startSoundOption') as StartSoundOption) || '1';
  });
  const [enableUISound, setEnableUISound] = useState<EnableUISound>(true);
  const [enableLabMicTest, setEnableLabMicTest] = useState<boolean>(() => isLabMicTestEnabled());

  // UI Sound Earcons
  const { playSuccess } = useEarcon(enableUISound);

  // Standard Input State (Replaces keyboard logic)
  const [inputText, setInputText] = useState("");

  const [activeMessage, setActiveMessage] = useState<string>("");
  const [historyView, setHistoryView] = useState<"graph" | "list">("graph");
  const [history, setHistory] = useState<any[]>([]);

  // Gradient Controls State
  const [theme, setTheme] = useState<GradientTheme>('aira');
  const [gradientSpeed, setGradientSpeed] = useState<GradientSpeed>('fast');
  const [gradientOpacity, setGradientOpacity] = useState<GradientOpacity>('bold');
  const [gradientDirection, setGradientDirection] = useState<GradientDirection>('bottom');

  // Legacy KOREAN_MAP and keyboard handlers removed

  useEffect(() => {
    let isMounted = true;

    const loadHistory = async () => {
      try {
        const response = await fetch("/historyFromGraph.json", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Failed to load history: ${response.status}`);
        }
        const payload = await response.json();
        if (!isMounted) {
          return;
        }
        setHistory(Array.isArray(payload) ? payload : []);
      } catch (error) {
        console.error("Failed to load graph history data", error);
        if (isMounted) {
          setHistory([]);
        }
      }
    };

    loadHistory();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (appState === AppState.SPLASH) {
      const nextState = isOnboarding ? AppState.PERMISSION : AppState.HOME;
      const timer = window.setTimeout(() => setAppState(nextState), 2000);
      return () => window.clearTimeout(timer);
    }
  }, [appState, isOnboarding]);

  useEffect(() => {
    localStorage.setItem('startSoundOption', startSoundOption);
  }, [startSoundOption]);

  useEffect(() => {
    try {
      localStorage.setItem(LAB_MIC_TEST_ENABLED_KEY, enableLabMicTest ? "true" : "false");
    } catch {
      // Ignore storage write failures.
    }
  }, [enableLabMicTest]);

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
      playSuccess();
      setAppState(AppState.CAMERA_PERMISSION);
    } else {
      alert("마이크 권한이 차단되어 있습니다.\n\n브라우저 주소창의 권한 설정에서 마이크를 허용해 주세요.");
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
    setOnboardingCompleted();
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
    alert("카메라를 사용하려면 권한 허용이 필요합니다.");
  };
  const stopCameraPreview = () => {
    setCameraStream((prev) => {
      if (prev) {
        prev.getTracks().forEach((track) => track.stop());
      }
      return null;
    });
    setIsCameraOn(false);
  };

  const startCameraPreview = async (facingMode: "user" | "environment") => {
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      });
      setCameraStream((prev) => {
        if (prev) {
          prev.getTracks().forEach((track) => track.stop());
        }
        return stream;
      });
      setIsCameraOn(true);
      return true;
    } catch (error) {
      console.error("Camera preview failed:", error);
      setCameraError("카메라에 연결할 수 없습니다. 권한 설정을 확인해주세요.");
      setIsCameraOn(false);
      return false;
    }
  };

  const handleCameraToggle = async () => {
    if (isCameraOn) {
      stopCameraPreview();
      setCameraError("");
      return;
    }

    await startCameraPreview(cameraFacingMode);
  };

  const handleSwitchCamera = async () => {
    const nextFacingMode = cameraFacingMode === "user" ? "environment" : "user";
    setCameraFacingMode(nextFacingMode);

    if (isCameraOn) {
      await startCameraPreview(nextFacingMode);
    }
  };

  const handleMicToggle = () => {
    const nextState = !isListening;
    setIsListening(nextState);

    if (!nextState) {
      setHasMicBeenTurnedOff(true);
      return;
    }

    if (nextState) {
      setActiveMessage(""); // Clear active message to let the "listening quote" show immediately
      if (enableLabMicTest && hasMicBeenTurnedOff && !hasShownMicTestModal) {
        setShowMicTestModal(true);
        setHasShownMicTestModal(true);
      }
    }
  };

  const handleScreenShareClick = async () => {
    try {
      // Trigger actual browser screen sharing prompt
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      // If user approves, we get the stream
      playSuccess();
      setActiveMessage("화면을 확인하고 있습니다.");

      // Stop the stream right away since this is just a dummy visual effect
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      console.log("Screen share cancelled or failed.", err);
    }
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
  useEffect(() => {
    return () => {
      stopCameraPreview();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const keepPreviewStates = new Set([
      AppState.HOME,
      AppState.PERMISSION,
      AppState.CAMERA_PERMISSION,
      AppState.ONBOARDING_1,
      AppState.ONBOARDING_2,
      AppState.KEYBOARD,
    ]);

    if (!keepPreviewStates.has(appState) && isCameraOn) {
      stopCameraPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState, isCameraOn]);
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
              onCameraClick={handleCameraToggle}
              onSwitchCamera={handleSwitchCamera}
              onScreenShareClick={handleScreenShareClick}
              onNavigateToUpload={() => setAppState(AppState.CHAT_FILE)}
              isCameraOn={isCameraOn}
              cameraStream={cameraStream}
              cameraError={cameraError}
            />
            <MicPermissionPage
              onPermissionGrant={handleMicPermission}
              onPermissionDeny={() => alert("마이크 권한이 차단되어 있습니다.\n\n브라우저 주소창의 권한 설정에서 마이크를 허용해 주세요.")}
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
              onCameraClick={handleCameraToggle}
              onSwitchCamera={handleSwitchCamera}
              onScreenShareClick={handleScreenShareClick}
              onNavigateToUpload={() => setAppState(AppState.CHAT_FILE)}
              isCameraOn={isCameraOn}
              cameraStream={cameraStream}
              cameraError={cameraError}
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
              onCameraClick={handleCameraToggle}
              onSwitchCamera={handleSwitchCamera}
              onScreenShareClick={handleScreenShareClick}
              onNavigateToUpload={() => setAppState(AppState.CHAT_FILE)}
              isCameraOn={isCameraOn}
              cameraStream={cameraStream}
              cameraError={cameraError}
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
              onCameraClick={handleCameraToggle}
              onSwitchCamera={handleSwitchCamera}
              onScreenShareClick={handleScreenShareClick}
              onNavigateToUpload={() => setAppState(AppState.CHAT_FILE)}
              isCameraOn={isCameraOn}
              cameraStream={cameraStream}
              cameraError={cameraError}
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
              onCameraClick={handleCameraToggle}
              onSwitchCamera={handleSwitchCamera}
              onScreenShareClick={handleScreenShareClick}
              onNavigateToUpload={() => setAppState(AppState.CHAT_FILE)}
              isCameraOn={isCameraOn}
              cameraStream={cameraStream}
              cameraError={cameraError}
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
          onCameraClick={handleCameraToggle}
          onSwitchCamera={handleSwitchCamera}
          onScreenShareClick={handleScreenShareClick}
          onNavigateToUpload={() => setAppState(AppState.CHAT_FILE)}
          isCameraOn={isCameraOn}
          cameraStream={cameraStream}
          cameraError={cameraError}
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
          onCameraClick={handleCameraToggle}
          onSwitchCamera={handleSwitchCamera}
          onScreenShareClick={handleScreenShareClick}
          onNavigateToUpload={() => setAppState(AppState.CHAT_FILE)}
          isCameraOn={isCameraOn}
          cameraStream={cameraStream}
          cameraError={cameraError}
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
        enableLabMicTest={enableLabMicTest} setEnableLabMicTest={setEnableLabMicTest}
      />
      <MicTestModal isOpen={showMicTestModal} onClose={() => setShowMicTestModal(false)} />
    </div>
  );
};

export default App;






