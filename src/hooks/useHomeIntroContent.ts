import { useEffect, useState } from "react";
import { HOME_CONTENT_FLAGS, HOME_CONTENT_TIMING } from "../config/homeContentConfig";
import { getRandomListeningQuote } from "../data/listeningQuotes";
import {
  getRandomIntroQuoteByKST,
  IntroQuoteContent,
} from "../data/timeBasedIntroQuotes";

export interface HomeIntroContentState {
  introQuote: IntroQuoteContent;
  listeningQuote: string;
  showListeningQuote: boolean;
}

export const useHomeIntroContent = (): HomeIntroContentState => {
  const [introQuote, setIntroQuote] = useState<IntroQuoteContent>(getRandomIntroQuoteByKST);
  const [listeningQuote, setListeningQuote] = useState("");
  const [showListeningQuote, setShowListeningQuote] = useState(false);

  useEffect(() => {
    if (HOME_CONTENT_FLAGS.forcePlaylistOnlyTestMode) {
      const introRotateTimer = window.setInterval(() => {
        setIntroQuote(getRandomIntroQuoteByKST());
      }, HOME_CONTENT_TIMING.introRotationMs);

      return () => {
        window.clearInterval(introRotateTimer);
      };
    }

    let listeningRotateTimer: number | undefined;
    const transitionTimer = window.setTimeout(() => {
      setListeningQuote(getRandomListeningQuote());
      setShowListeningQuote(true);

      listeningRotateTimer = window.setInterval(() => {
        setListeningQuote(getRandomListeningQuote());
      }, HOME_CONTENT_TIMING.listeningRotationMs);
    }, HOME_CONTENT_TIMING.introDurationMs);

    return () => {
      window.clearTimeout(transitionTimer);
      if (listeningRotateTimer) {
        window.clearInterval(listeningRotateTimer);
      }
    };
  }, []);

  return {
    introQuote,
    listeningQuote,
    showListeningQuote,
  };
};
