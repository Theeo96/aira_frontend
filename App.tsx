import React, { useState, useEffect, useRef } from "react";
import {
  requestMicPermission,
  requestCameraPermission,
  requestLocationPermission,
  requestWakeLock,
} from "./services/permissionService";
import { AppState, Persona } from "./types";
import { Header, Drawer } from "./components/Layout";
import { getAIResponse } from "./services/geminiService";

// Page Imports
import SplashPage from "./src/pages/SplashPage";
import OnboardingPage from "./src/pages/OnboardingPage";
import LoginPage from "./src/pages/LoginPage";
import HomePage from "./src/pages/HomePage";
import HistoryPage from "./src/pages/HistoryPage";
import ChatFilePage from "./src/pages/ChatFilePage";
import SchedulePage from "./src/pages/SchedulePage";
import EmailPage from "./src/pages/EmailPage";
import { MicPermissionPage, CameraPermissionPage, LocationPermissionPage } from "./src/pages/PermissionPages";

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.SPLASH);
  const [activePersonas, setActivePersonas] = useState<Persona[]>([
    "lumi",
    "rami",
  ]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isListening, setIsListening] = useState(true);
  const [isOnboarding, setIsOnboarding] = useState(true);

  // Standard Input State (Replaces keyboard logic)
  const [inputText, setInputText] = useState("");

  const [activeMessage, setActiveMessage] = useState<string>("");
  const [historyView, setHistoryView] = useState<"graph" | "list">("graph");

  // Legacy KOREAN_MAP and keyboard handlers removed

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
    // Keep inputText or clear it? Usually clear it.
    setInputText("");
    setIsListening(false);

    setActiveMessage("...");
    const aiResp = await getAIResponse(msg, activePersonas);
    setActiveMessage(aiResp);
  };

  // ----- Onboarding Permission Handlers -----

  const handleMicPermission = async () => {
    const granted = await requestMicPermission();
    if (granted) {
      setAppState(AppState.CAMERA_PERMISSION);
    } else {
      alert("마이크 권한은 필수입니다.");
    }
  };

  const handleOnboardingCameraGrant = async () => {
    await requestCameraPermission();
    setAppState(AppState.ONBOARDING_1);
  };

  const handleOnboardingCameraDeny = () => {
    // Skip permission request, just move next
    setAppState(AppState.ONBOARDING_1);
  };

  const handleOnboardingLocationGrant = async () => {
    await requestLocationPermission();
    setAppState(AppState.ONBOARDING_2);
  };

  const handleOnboardingLocationDeny = () => {
    // Skip permission request, just move next
    setAppState(AppState.ONBOARDING_2);
  };

  const startHome = () => {
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
            <Header onMenuClick={() => { setIsDrawerOpen(true); }} currentScreen={appState} />
            <HomePage
              activeMessage={activeMessage}
              activePersonas={activePersonas}
              isListening={isListening}
              inputText={inputText}
              setInputText={setInputText}
              onSend={handleSend}
              onMicToggle={() => setIsListening(!isListening)}
              onCameraClick={handleCameraClick}
            />
            <MicPermissionPage
              onPermissionGrant={handleMicPermission}
              onPermissionDeny={() => alert("마이크 권한은 필수입니다.")}
            />
          </>
        );
      case AppState.CAMERA_PERMISSION:
        // Use different handlers based on whether we are in onboarding or retry mode
        return (
          <>
            <Header onMenuClick={() => { setIsDrawerOpen(true); }} currentScreen={appState} />
            <HomePage
              activeMessage={activeMessage}
              activePersonas={activePersonas}
              isListening={isListening}
              inputText={inputText}
              setInputText={setInputText}
              onSend={handleSend}
              onMicToggle={() => setIsListening(!isListening)}
              onCameraClick={handleCameraClick}
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
            <Header onMenuClick={() => { setIsDrawerOpen(true); }} currentScreen={appState} />
            <HomePage
              activeMessage={activeMessage}
              activePersonas={activePersonas}
              isListening={isListening}
              inputText={inputText}
              setInputText={setInputText}
              onSend={handleSend}
              onMicToggle={() => setIsListening(!isListening)}
              onCameraClick={handleCameraClick}
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
            <Header onMenuClick={() => { setIsDrawerOpen(true); }} currentScreen={appState} />
            <HomePage
              activeMessage={activeMessage}
              activePersonas={activePersonas}
              isListening={isListening}
              inputText={inputText}
              setInputText={setInputText}
              onSend={handleSend}
              onMicToggle={() => setIsListening(!isListening)}
              onCameraClick={handleCameraClick}
            />
            <OnboardingPage onStart={startHome} />
          </>
        );
      case AppState.KEYBOARD:
        // Map to Home logic
        return (
          <>
            <Header onMenuClick={() => setIsDrawerOpen(true)} currentScreen={AppState.HOME} />
            <HomePage
              activeMessage={activeMessage}
              activePersonas={activePersonas}
              isListening={isListening}
              inputText={inputText}
              setInputText={setInputText}
              onSend={handleSend}
              onMicToggle={() => setIsListening(!isListening)}
              onCameraClick={handleCameraClick}
            />
          </>
        );
      case AppState.HOME:
        return <HomePage
          activeMessage={activeMessage}
          activePersonas={activePersonas}
          isListening={isListening}
          inputText={inputText}
          setInputText={setInputText}
          onSend={handleSend}
          onMicToggle={() => setIsListening(!isListening)}
          onCameraClick={handleCameraClick}
        />;
      case AppState.LOGIN:
        return <LoginPage />;
      case AppState.CHAT_FILE:
        return <ChatFilePage
          setAppState={setAppState}
          isListening={isListening}
          setIsListening={setIsListening}
          activePersonas={activePersonas}
        />;
      case AppState.HISTORY:
        return <HistoryPage
          historyData={history}
          viewMode={historyView}
          setViewMode={setHistoryView}
        />;
      case AppState.EMAIL:
        return <EmailPage />;
      case AppState.SCHEDULE:
        return <SchedulePage />;
      default:
        return <HomePage
          activeMessage={activeMessage}
          activePersonas={activePersonas}
          isListening={isListening}
          inputText={inputText}
          setInputText={setInputText}
          onSend={handleSend}
          onMicToggle={() => setIsListening(!isListening)}
          onCameraClick={handleCameraClick}
        />;
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#F0EEE9] shadow-2xl">
      {/* Background decoration for Home */}
      {(appState === AppState.HOME || appState === AppState.PERMISSION || appState === AppState.CAMERA_PERMISSION || appState === AppState.ONBOARDING_1 || appState === AppState.ONBOARDING_2) && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-white/30 blur-[100px] rounded-full -z-10"></div>
      )}

      {/* Main View */}
      <div className="h-full relative overflow-hidden">
        {appState !== AppState.SPLASH && appState !== AppState.PERMISSION && appState !== AppState.CAMERA_PERMISSION && appState !== AppState.ONBOARDING_1 && (
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
