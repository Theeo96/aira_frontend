export type Persona = "lumi" | "rami";

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
  ONBOARDING_1 = "ONBOARDING_1",
  HOME = "HOME",
  SIDE_MENU = "SIDE_MENU",
  LOGIN = "LOGIN",
  CHAT_FILE = "CHAT_FILE",
  HISTORY = "HISTORY",
  EMAIL = "EMAIL",
  SCHEDULE = "SCHEDULE",
  KEYBOARD = "KEYBOARD",
}
