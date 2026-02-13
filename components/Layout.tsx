import React from "react";
import {
  Menu,
  X,
  Settings,
  History,
  Calendar,
  Mail,
  Plus,
  Clock,
} from "lucide-react";
import { COLORS } from "../constants";
import { AppState, Persona } from "../types";

interface HeaderProps {
  onMenuClick: () => void;
  currentScreen: AppState;
  goBack?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onMenuClick,
  currentScreen,
  goBack,
}) => {
  const isSubPage = ![
    AppState.HOME,
    AppState.PERMISSION,
    AppState.ONBOARDING_1,
  ].includes(currentScreen);

  return (
    <div className="fixed top-0 left-0 w-full h-16 flex items-center justify-between px-6 z-40 bg-[#F0EEE9]/80 backdrop-blur-sm">
      <div className="flex items-center w-12">
        {isSubPage ? (
          <button onClick={goBack} className="p-2 -ml-2">
            <span className="text-2xl font-light">〈</span>
          </button>
        ) : (
          <button onClick={onMenuClick} className="p-2 -ml-2">
            <Menu size={24} color={COLORS.text} />
          </button>
        )}
      </div>

      <div className="flex-1 flex justify-center">
        {isSubPage ? (
          <h1 className="text-lg font-bold">
            {currentScreen === AppState.LOGIN && "로그인"}
            {currentScreen === AppState.CHAT_FILE && "대화+자료"}
            {currentScreen === AppState.HISTORY && "히스토리"}
            {currentScreen === AppState.EMAIL && "이메일 관리"}
            {currentScreen === AppState.SCHEDULE && "일정 관리"}
          </h1>
        ) : null}
      </div>

      <div className="w-12"></div>
    </div>
  );
};

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (state: AppState) => void;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`absolute top-0 left-0 h-full w-[85%] bg-white transition-transform duration-300 ease-out ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="p-8 h-full flex flex-col">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-4xl font-black italic tracking-tighter">
              AIRA
            </h2>
            <button onClick={onClose} className="hidden">
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1">
            <div className="border-t border-gray-100">
              <button
                onClick={() => onNavigate(AppState.LOGIN)}
                className="w-full flex items-center justify-between py-6 border-b border-gray-100 px-2"
              >
                <span className="text-3xl font-medium">로그인</span>
                <div className="px-3 py-1 text-xs border border-gray-300 rounded-md text-gray-500 font-bold">
                  로그아웃
                </div>
              </button>

              <button
                onClick={() => onNavigate(AppState.CHAT_FILE)}
                className="w-full flex items-center justify-between py-6 border-b border-gray-100 px-2"
              >
                <span className="text-3xl font-medium">대화+자료</span>
                <div className="w-10 h-10 border-2 border-black rounded-full flex items-center justify-center">
                  <Plus size={24} strokeWidth={3} />
                </div>
              </button>

              <button
                onClick={() => onNavigate(AppState.HISTORY)}
                className="w-full flex items-center justify-between py-6 border-b border-gray-100 px-2"
              >
                <span className="text-3xl font-medium">히스토리</span>
                <Clock size={32} />
              </button>

              <button
                onClick={() => onNavigate(AppState.SCHEDULE)}
                className="w-full flex items-center justify-between py-6 border-b border-gray-100 px-2"
              >
                <span className="text-3xl font-medium">일정 관리</span>
                <Calendar size={32} />
              </button>

              <button
                onClick={() => onNavigate(AppState.EMAIL)}
                className="w-full flex items-center justify-between py-6 border-b border-gray-100 px-2"
              >
                <span className="text-3xl font-medium">이메일 관리</span>
                <Mail size={32} />
              </button>
            </div>
          </nav>

          <div className="pt-4 mt-auto">
            <Settings size={32} className="text-black" />
          </div>
        </div>
      </div>
    </div>
  );
};
