import type { FC } from "react";

export type OpenHistoryPayload =
  | string
  | {
    historyId?: string;
    memoryKey?: string;
    snippet?: string;
    fullText?: string;
  };

export interface HistoryGraphMvpProps {
  onOpenHistory?: (payload: OpenHistoryPayload) => void;
  useMockData?: boolean;
}

export default function HistoryGraphMvp(props: HistoryGraphMvpProps): JSX.Element;

