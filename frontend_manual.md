# AIRA Frontend 기능 상세 설명서

본 문서는 AIRA (AI Companion) 프론트엔드 프로젝트의 주요 UI/UX 기능과 기술적 구현 방식을 실제 구동 화면과 함께 설명합니다.

![AIRA Frontend 구동 데모 (WebP)](file:///C:/Users/EL096/.gemini/antigravity/brain/f74f30d1-04a9-4562-a155-d6cb614b0971/aira_frontend_demo_1771685817185.webp)

## 1. 기술 스택 (Tech Stack)
- **프레임워크**: React 19 (Vite 기반)
- **스타일링**: Tailwind CSS v4, 순수 CSS (Keyframes)
- **아이콘**: Lucide-React
- **PWA 및 네트워크**: `vite-plugin-pwa`, `@vitejs/plugin-basic-ssl` (로컬 기기 테스트용 HTTPS 지원)

---

## 2. 주요 페이지 및 UI 컴포넌트 기능

### 2.1 홈 화면 (Home Page) 및 배경 애니메이션
홈 화면은 AIRA의 페르소나(루미/라미)와 상호작용하는 핵심 공간입니다.

![홈 화면 그라데이션](file:///C:/Users/EL096/.gemini/antigravity/brain/f74f30d1-04a9-4562-a155-d6cb614b0971/home_page_gradient_1771685916087.png)

- **무한 유체 엑셀러레이션 (Fluid Aurora)**
  - `index.css`에 직접 정의된 `@keyframes aurora-float` 애니메이션을 기반으로 Primary, Center, Secondary 3개의 컬러 원형(Orb)이 무한히 궤도를 그리며 일렁입니다.
  - 마이크 입력이나 화면 크기 변화가 없어도 항상 살아있는 듯한 역동성을 제공합니다.
- **페르소나 면적 지배 (Dominance) 로직**
  - **루미(Rumi)** 또는 **라미(Lami)** 중 현재 활성화된(발화 중인) 페르소나의 컬러 원형이 화면의 `130vw` ~ `150vw`까지 거대해지며, 투명도(Opacity)가 상대측보다 2~3배 짙어지어 화면의 테마를 지배합니다.

### 2.2 대화 기록 (History Page)
과거 대화 내역 및 감정 요약을 보여주는 페이지입니다.

![대화 기록 화면](file:///C:/Users/EL096/.gemini/antigravity/brain/f74f30d1-04a9-4562-a155-d6cb614b0971/history_page_summary_1771685940494.png)

- **아이메시지(iMessage) 스타일 말풍선**
  - 사용자의 발화는 우측 회색톤(Gray) 모노크롬으로, AI의 발화는 좌측의 해당 페르소나 컬러(루미-오렌지, 라미-블루)로 렌더링됩니다.
  - CSS 가상 요소(`::before`, `::after`)와 SVG mask 기법을 활용하여 iOS 아이메시지 특유의 매끄러운 바깥쪽 곡선 꼬리(Tail)를 완벽하게 재현했습니다.
- **글래스모피즘 (Glassmorphism)**
  - 배경색과 이질감이 없도록 반투명 블러 효과(`backdrop-blur`)를 먹인 화이트/그레이 컨테이너를 사용하여 세련된 모바일 룩앤필을 구성했습니다.

### 2.3 브랜드 스토리 (Brand Story Page)
AIRA 서비스의 철학을 설명하는 페이지입니다.

![브랜드 스토리 화면](file:///C:/Users/EL096/.gemini/antigravity/brain/f74f30d1-04a9-4562-a155-d6cb614b0971/brand_story_top_1771685968541.png)

- **반응형 텍스트 래핑 (Responsive Text Wrapping)**
  - 국문과 영문이 혼용된 장문의 환경에서 어절 단위로 이상하게 글이 끊기는 현상을 방지하기 위해, 컨테이너에 `max-w` 제어 및 `break-keep` 속성을 일괄 채택했습니다.
  - 인위적인 `<br>` 태그 하드코딩을 제거하여 가로폭이 달라지는 여러 모바일 기기에서도 화면 우측 여백이 깨지지 않고 자연스러운 문단 정렬을 유지합니다.

### 2.4 실험실 (Laboratory) 및 동적 설정
사이드 메뉴의 하단에 위치한 커스텀 설정 공간입니다.

![실험실 설정 화면](file:///C:/Users/EL096/.gemini/antigravity/brain/f74f30d1-04a9-4562-a155-d6cb614b0971/laboratory_speed_fast_1771686143971.png)

- **단일 소스 진실 (Single Source of Truth) 기반 상태 관리**
  - 사이드바 내부의 스위치나 토글을 조작하면 `App.tsx`의 최상위 React State가 업데이트되고, 즉시 형제 컴포넌트인 `HomePage.tsx` 방향으로 Prop이 전달 (Prop Drilling)되어 화면 렌더링에 반영됩니다.
  - 예: 물결 속도를 '빠르게'로 설정할 경우, `HomePage.tsx` 내 `getAnimationDuration` 함수가 CSS `animation-duration`을 8초에서 4초(0.5배율) 수준으로 즉각 단축시킵니다.

---

## 3. PWA 및 기기 하드웨어 대응

- **앱 라이크 뷰 (App-like View)**
- **앱 라이크 뷰 (App-like View)**
  - `manifest.json` 의 `display: standalone` 설정을 통해 모바일 브라우저의 상하단 주소창이나 네비게이션 바 없이 진짜 네이티브 앱처럼 동작하게 설계되었습니다.
