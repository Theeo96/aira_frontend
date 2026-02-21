export const LISTENING_QUOTES: string[] = [
  "당신의 마음을\n들려주세요",
  "당신의 이야기를\n마음속에 소중히 정리하고 있어요",
  "고요한 사유의 시간을 지나\n당신에게 가는 중입니다",
  "이 대화가 끝날 즈음엔\n당신의 마음이 조금 더 가벼워지길",
  "제 진심이 당신의 하루에\n작은 온기가 되길 바라요",
  "당신의 오늘을\n소중히 기억할게요",
  "지금 우리는\n함께 흐르는 중입니다",
];

let lastListeningQuoteIndex = -1;

const sanitizeListeningQuote = (text: string): string => {
  return text
    .trim()
    .replace(/^["'“”’「」<>]+|["'“”’「」<>]+$/g, "")
    .replace(/[.!?…。！？]+$/g, "");
};

export const getRandomListeningQuote = (): string => {
  if (LISTENING_QUOTES.length === 0) {
    return "";
  }

  if (LISTENING_QUOTES.length === 1) {
    return sanitizeListeningQuote(LISTENING_QUOTES[0]);
  }

  let nextIndex = Math.floor(Math.random() * LISTENING_QUOTES.length);
  while (nextIndex === lastListeningQuoteIndex) {
    nextIndex = Math.floor(Math.random() * LISTENING_QUOTES.length);
  }

  lastListeningQuoteIndex = nextIndex;
  return sanitizeListeningQuote(LISTENING_QUOTES[nextIndex]);
};
