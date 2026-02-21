import { HOME_CONTENT_FLAGS } from "../config/homeContentConfig";

export interface IntroQuoteContent {
  text: string;
  author?: string;
  work?: string;
  wrapWithQuotes: boolean;
  playlistTheme?: string;
  playlistSong?: string;
}

const RATIONAL_WEEKDAY_QUOTES: Record<number, string[]> = {
  1: [
    "정교하게 설계된 계획은 불필요한 의사결정 비용을 줄여주는 가장 강력한 도구입니다",
    "거창한 포부보다 구체적인 우선순위 설정이 오늘 하루의 실질적인 성패를 결정합니다",
    "월요일의 막연한 중압감은 객관적인 데이터와 할 일 목록으로 분해할 때 사라집니다",
    "변수를 통제하려 애쓰기보다 변화에 즉각 대응할 수 있는 유연한 시스템을 구축하세요",
    "일주일의 첫 단추는 단순한 열정이 아니라 냉철하게 계산된 시간 배분에서 시작됩니다",
  ],
  2: [
    "일관된 루틴은 의지력을 소모하지 않고도 성과를 지속하게 돕는 가장 안정적인 동력입니다",
    "감정에 매몰되지 않고 논리에 집중할 때 문제의 본질은 비로소 그 실체를 드러냅니다",
    "작은 성취를 반복하여 데이터로 기록하는 행위가 뇌에 가장 긍정적인 피드백을 전달합니다",
    "주변의 소음과 유의미한 신호를 구분하는 감각이 당신의 생산성을 결정짓는 열쇠입니다",
    "완벽한 환경을 기다리는 것보다 현재 주어진 자원 안에서 최적의 해답을 도출해내세요",
  ],
  3: [
    "중간 점검은 목표와의 오차를 수정하여 자원 낭비를 사전에 차단하는 필수 공정입니다",
    "업무의 밀도가 정체되는 구간에서는 작업의 순서를 재배열하여 흐름을 전환해야 합니다",
    "복잡하게 얽힌 과제들은 작게 쪼개어 수치화할수록 해결을 위한 논리가 명확해집니다",
    "효율이 떨어지는 지점을 파악하고 의도적으로 속도를 조절하는 것이 장기적인 이득입니다",
    "협업에서 명확하고 건조한 언어의 선택은 불필요한 감정 소모와 오해의 비용을 낮춥니다",
  ],
  4: [
    "누적된 데이터와 경험치는 예기치 못한 변수 앞에서도 가장 정확한 판단 기준이 됩니다",
    "피로가 몰려오는 시점일수록 감각적인 판단보다 확립된 원칙에 의존하는 것이 안전합니다",
    "해결되지 않는 난제는 잠시 물리적 거리를 두고 객관적인 관찰자의 시선으로 조망하세요",
    "마지막 스퍼트의 속도보다 안정적인 마무리가 최종 결과물의 완성도를 결정짓는 변수입니다",
    "임계점에 도달했을 때 발휘되는 집중력은 당신의 직무 역량을 한 단계 더 확장시킵니다",
  ],
  5: [
    "일주일의 성과를 객관적으로 분석하는 습관이 다음 성장을 위한 가장 확실한 지표가 됩니다",
    "업무의 종료는 단순한 멈춤이 아니라 유의미한 데이터를 아카이브에 축적하는 행위입니다",
    "해결되지 않는 과제를 명확히 정의해두는 것만으로도 휴식기 동안의 인지 부하를 줄일 수 있습니다",
    "성공과 실패의 원인을 감정에서 분리하여 시스템적 결함으로 파악할 때 개선이 시작됩니다",
    "업무 환경을 정돈하고 다음 주를 위한 초기 상태를 설정하는 것으로 한 주를 마감하세요",
  ],
  6: [
    "완전한 오프라인 상태를 유지하는 것은 뇌의 처리 능력을 회복하기 위한 필수적인 투자입니다",
    "일과 무관한 정보를 섭취하는 행위는 창의적인 연결을 위한 새로운 데이터 입력 과정입니다",
    "뇌의 연상 작용을 돕기 위해 의도적으로 환경을 전환하여 감각의 자극점을 바꿔주어야 합니다",
    "비선형적인 사고는 업무의 압박이 제거된 여유로운 무작위성 속에서 비로소 발생합니다",
    "휴식은 낭비되는 매몰 비용이 아니라 다음 주기의 효율을 극대화하기 위한 자본 확충입니다",
  ],
  0: [
    "다가올 한 주를 위해 신체와 정신의 자원을 효율적으로 배분하는 전략적 안식이 필요합니다",
    "정돈된 개인의 환경은 다가올 복잡한 과제들에 대응할 수 있는 심리적 가용 공간을 확보해줍니다",
    "다음 주의 우선순위를 미리 머릿속에 시뮬레이션해두면 월요일의 실행 속도가 비약적으로 상승합니다",
    "충분한 영양 섭취와 수면은 지적 활동을 지속하기 위한 가장 기본적인 연료 공급 과정입니다",
    "평온한 일요일의 끝은 새로운 시스템을 완벽하게 가동하기 위한 최적의 대기 상태여야 합니다",
  ],
};

interface SongRecommendation {
  title: string;
  artist: string;
}

interface SongRecommendationTheme {
  theme: string;
  songs: SongRecommendation[];
}

interface EmotionalQuote {
  quote: string;
  author: string;
  work?: string;
}

const EVENING_SONG_RECOMMENDATION_THEMES: SongRecommendationTheme[] = [
  {
    theme: "열정이 넘치는 날",
    songs: [
      { title: "매직 카펫 라이드", artist: "자우림" },
      { title: "Highlight", artist: "터치드" },
      { title: "끝없이 우리는", artist: "아디오스 오디오" },
      { title: "Havin'a Good Time", artist: "카디" },
      { title: "청록", artist: "이츠" },
      { title: "60's Cardin", artist: "글렌체크" },
      { title: "주인공의법칙", artist: "김승주" },
    ],
  },
  {
    theme: "생각이 많아지는 날",
    songs: [
      { title: "춤", artist: "브로콜리너마저" },
      { title: "피터팬", artist: "김여명" },
      { title: "NO PAIN", artist: "실리카겔" },
      { title: "아름다운 세상", artist: "파란노을" },
      { title: "철의 삶", artist: "정우" },
      { title: "1:03", artist: "넬" },
      { title: "노래가 되면 예쁠거야", artist: "산만한시선" },
    ],
  },
  {
    theme: "사랑이 필요한 날",
    songs: [
      { title: "멸종위기/사랑", artist: "이찬혁" },
      { title: "한시 오분 (1:05)", artist: "검정치마" },
      { title: "눈이 마주쳤을 때", artist: "0.0.0" },
      { title: "LETTER", artist: "유다빈밴드" },
      { title: "YOU", artist: "라쿠나" },
      { title: "초록", artist: "윤마치" },
      { title: "LOVE YA!", artist: "혁오" },
    ],
  },
  {
    theme: "위로 받고 싶은 날",
    songs: [
      { title: "0+0", artist: "한로로" },
      { title: "서울", artist: "쏜애플" },
      { title: "등대", artist: "하현상" },
      { title: "꿈과 힘과 벽", artist: "잔나비" },
      { title: "월드투어", artist: "보수동쿨러, 해서웨이" },
      { title: "일인칭 관찰자 시점", artist: "신인류" },
      { title: "들키고 싶은 마음에게", artist: "이승윤" },
    ],
  },
];

const EVENING_EMOTIONAL_QUOTES: EmotionalQuote[] = [
  { quote: "가장 중요한 것은 눈에 보이지 않고 오직 마음으로 보아야만 선명해집니다.", author: "생텍쥐페리", work: "어린 왕자" },
  { quote: "사막이 아름다운 것은 어딘가에 우물을 감추고 있기 때문입니다.", author: "생텍쥐페리", work: "어린 왕자" },
  { quote: "태어난다는 것은 하나의 세계를 파괴하는 일이며 새로운 비상을 위한 시작입니다.", author: "헤르만 헤세", work: "데미안" },
  { quote: "모든 인간의 삶은 자기 자신에게로 이르는 길이며 그 길 위의 고독한 탐험입니다.", author: "헤르만 헤세", work: "데미안" },
  { quote: "별을 노래하는 마음으로 모든 죽어가는 것들을 사랑해야겠다고 다짐합니다.", author: "윤동주", work: "서시" },
  { quote: "풀리지 않는 모든 의문들을 그저 마음속에 품은 채 계절이 지나가기를 기다리세요.", author: "라이너 마리아 릴케" },
  { quote: "우리는 흐르는 강물처럼 끊임없이 변하며 비로소 완성되지 않는 아름다움을 배웁니다.", author: "헤르만 헤세", work: "싯다르타" },
  { quote: "웅덩이에 고인 물도 하늘을 담을 수 있으며 당신은 온 세상을 품을 수 있는 사람입니다.", author: "칼릴 지브란", work: "모래와 거품" },
  { quote: "자연의 속도에 맞춰 걷는 걸음은 당신의 영혼을 가장 본질적인 평온함으로 인도합니다.", author: "헨리 데이비드 소로", work: "월든" },
  { quote: "파도가 해안에 닿아 부서지는 순간조차 바다의 깊은 중심은 흔들림 없이 고요합니다.", author: "버지니아 울프", work: "파도" },
  { quote: "마음의 깊은 바닥에 닿은 고요는 세상의 모든 소란을 잠재우는 가장 강한 힘입니다.", author: "표도르 도스토옙스키", work: "카라마조프 가의 형제들" },
  { quote: "가장 단순한 삶의 방식이 당신을 세상에서 가장 먼 곳까지 안전하게 데려다줄 것입니다.", author: "헨리 데이비드 소로", work: "월든" },
  { quote: "무너진 자리마다 새살이 돋아나듯 당신의 시련은 가장 아름다운 무늬로 남을 것입니다.", author: "한용운", work: "님의 침묵" },
  { quote: "당신의 마음속에 부는 거센 바람은 당신을 꺾으려는 것이 아니라 단단하게 세우려는 것입니다.", author: "에밀리 브론테", work: "폭풍의 언덕" },
  { quote: "당신의 마음이라는 요새 안에는 그 무엇도 침범할 수 없는 가장 안전하고 투명한 평화가 머물고 있습니다.", author: "마르쿠스 아우렐리우스", work: "명상록" },
  { quote: "고통이 당신의 영혼에 깊은 우물을 팔수록 그 자리에 더 맑은 기쁨이 고이게 된다는 사실을 믿으세요.", author: "칼릴 지브란", work: "예언자" },
  { quote: "진정한 발견은 새로운 풍경을 찾는 것이 아니라 세상을 바라보는 새로운 눈을 갖는 일에서 시작됩니다.", author: "마르셀 프루스트", work: "잃어버린 시간을 찾아서" },
  { quote: "사소한 일상의 순간들이 모여 당신이라는 찬란한 존재의 무늬를 오늘도 소리 없이 정교하게 엮어가고 있습니다.", author: "버지니아 울프", work: "등대로" },
  { quote: "희망은 원래부터 있는 것도 없는 것도 아니며 당신이 묵묵히 내딛는 그 발걸음이 모여 비로소 길이 됩니다.", author: "루쉰", work: "고향" },
  { quote: "당신 안에 잠든 거대한 힘을 믿으세요 세상의 그 어떤 바람도 당신의 중심을 결코 흔들 수는 없습니다.", author: "랄프 왈도 에머슨" },
  { quote: "스스로를 신뢰하는 순간 당신은 비로소 어떻게 살아가야 할지를 알게 됩니다.", author: "요한 볼프강 폰 괴테", work: "파우스트" },
  { quote: "자신의 내면을 깊이 들여다보는 사람은 세상에서 가장 넓은 우주를 발견하게 됩니다.", author: "칼릴 지브란", work: "모래와 거품" },
  { quote: "진정한 자유는 무언가를 더하는 것이 아니라 마음속의 불필요한 짐을 덜어내는 일입니다.", author: "블레즈 파스칼", work: "팡세" },
  { quote: "당신의 삶은 다른 누구와도 비교할 수 없는 단 하나뿐인 고귀한 서사시입니다.", author: "월트 휘트먼", work: "풀잎" },
  { quote: "가장 어두운 밤일수록 당신이 품은 작은 불꽃은 더욱 선명하고 고결하게 빛납니다.", author: "빅토르 위고", work: "레 미제라블" },
  { quote: "타인의 시선에서 자유로워질 때 비로소 당신만의 가장 선명한 색깔이 피어납니다.", author: "제인 오스틴", work: "오만과 편견" },
  { quote: "어둠 속에서 홀로 빛나는 별은 누군가의 길을 비추는 고요하고 다정한 약속입니다.", author: "윤동주", work: "별 헤는 밤" },
  { quote: "가파른 산길을 오를 때 마주하는 맑은 샘물처럼 당신의 휴식은 가장 고귀한 선물입니다.", author: "니체", work: "차라투스트라는 이렇게 말했다" },
  { quote: "폭풍이 지나간 자리의 고요는 당신이 이겨낸 모든 시간들에 대한 자연의 깊은 경의입니다.", author: "허먼 멜빌", work: "모비 딕" },
  { quote: "오늘 하루를 견뎌낸 당신의 발걸음은 온 우주가 함께 축하해야 할 가장 위대한 기적입니다.", author: "랄프 왈도 에머슨" },
];

const WEEKDAY_FROM_SHORT: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const getRandomItem = <T>(items: T[]): T => {
  return items[Math.floor(Math.random() * items.length)];
};

const getRandomSongRecommendation = (): { theme: string; song: SongRecommendation } => {
  const selectedTheme = getRandomItem(EVENING_SONG_RECOMMENDATION_THEMES);
  const selectedSong = getRandomItem(selectedTheme.songs);
  return {
    theme: selectedTheme.theme,
    song: selectedSong,
  };
};

const getSongRecommendationIntro = (): IntroQuoteContent => {
  const { theme, song } = getRandomSongRecommendation();
  return {
    text: `${theme}\n${song.title} - ${song.artist}`,
    wrapWithQuotes: false,
    playlistTheme: theme,
    playlistSong: `${song.title} - ${song.artist}`,
  };
};

const getKSTDayAndHour = (): { day: number; hour: number } => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    weekday: "short",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const weekdayPart = parts.find((part) => part.type === "weekday")?.value ?? "Mon";
  const hourPart = parts.find((part) => part.type === "hour")?.value ?? "09";

  const day = WEEKDAY_FROM_SHORT[weekdayPart] ?? 1;
  const hour = Number.parseInt(hourPart, 10);

  return { day, hour: Number.isNaN(hour) ? 9 : hour };
};

const getTimeBand = (hour: number): "rational" | "emotional" => {
  if (hour >= 18 || hour < 6) {
    return "emotional";
  }

  return "rational";
};

export const getRandomIntroQuoteByKST = (): IntroQuoteContent => {
  if (HOME_CONTENT_FLAGS.forcePlaylistOnlyTestMode) {
    return getSongRecommendationIntro();
  }

  const { day, hour } = getKSTDayAndHour();
  const timeBand = getTimeBand(hour);

  if (timeBand === "emotional") {
    const shouldRecommendSong =
      EVENING_SONG_RECOMMENDATION_THEMES.length > 0 && Math.random() < 0.5;

    if (shouldRecommendSong) {
      return getSongRecommendationIntro();
    }

    const emotionalQuote = getRandomItem(EVENING_EMOTIONAL_QUOTES);
    return {
      text: emotionalQuote.quote,
      author: emotionalQuote.author,
      work: emotionalQuote.work,
      wrapWithQuotes: true,
    };
  }

  const weekdayQuotes = RATIONAL_WEEKDAY_QUOTES[day] ?? RATIONAL_WEEKDAY_QUOTES[1];
  return {
    text: getRandomItem(weekdayQuotes),
    wrapWithQuotes: false,
  };
};
