export type Persona = "rumi" | "lami";

export type GradientTheme = 'aira' | 'sunset' | 'midnight';
export type GradientSpeed = 'slow' | 'normal' | 'fast';
export type GradientOpacity = 'light' | 'normal' | 'bold';
export type GradientDirection = 'bottom' | 'side' | 'center';
export type StartSoundOption = 'off' | '1' | '2' | '3' | '4';
export type EnableUISound = boolean;

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  persona?: Persona;
  text: string;
  timestamp: Date;
}

export enum AppState {
  SPLASH = "SPLASH",
  PERMISSION = "PERMISSION",
  CAMERA_PERMISSION = "CAMERA_PERMISSION",
  ONBOARDING_1 = "ONBOARDING_1",
  ONBOARDING_2 = "ONBOARDING_2",
  HOME = "HOME",
  SIDE_MENU = "SIDE_MENU",
  LOGIN = "LOGIN",
  CHAT_FILE = "CHAT_FILE",
  HISTORY = "HISTORY",
  EMAIL = "EMAIL",
  SCHEDULE = "SCHEDULE",
  KEYBOARD = "KEYBOARD",
  MATERIAL = "MATERIAL",
  SETTINGS = "SETTINGS",
  BRAND_STORY = "BRAND_STORY",
}
