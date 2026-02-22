import type { FC } from "react";

export type OpenHistoryPayload =
  | string
  | {
      historyId?: string;
      memoryKey?: string;
      snippet?: string;
      fullText?: string;
    };

declare const HistoryGraphMvp: FC<{
  onOpenHistory?: (payload: OpenHistoryPayload) => void;
}>;

export default HistoryGraphMvp;
