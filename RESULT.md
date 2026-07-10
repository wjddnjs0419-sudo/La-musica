# RESULT: 브랜드 로고 교체 - 2026-07-10

## Background
- 사용자가 확정한 새 로고(보라-파랑 그라디언트 심볼)로 교체하기 위해 프로젝트 상위에 `la_musica_logo_assets_exact/`(favicon, icon/horizontal 라이트·다크 세트, og-image, 사용 가이드)를 준비해둠.
- 기존 `components/logo.tsx`는 손으로 그린 리본 SVG를 `currentColor` 단색 stroke로 그리는 방식이라, 그라디언트가 들어간 새 심볼을 그대로 대체할 수 없었음 — 파일 참조(`<img>`) 방식으로 전환 필요.
- 로고 사용처 8곳(헤더 데스크톱/모바일메뉴, 푸터, 워크스페이스 네브바, 워크스페이스 로딩화면, 법적고지, 문의, 인증페이지)을 전수 확인한 결과 전부 다크 배경(`text-white` 컨텍스트)이라 dark 배리언트만 필요.
- `logoguide.md` 기준으로 "웹사이트 헤더/푸터"는 가로형(심볼+워드마크), "앱 내부 심볼/로딩화면/네브바"는 아이콘 단독을 권장 — 용도별로 분리 적용.
- `node_modules/next/dist/docs`의 Next 16 favicon/OG 파일 컨벤션 문서를 확인해, 가이드가 제시한 `<link>` 태그와 동일한 `metadata.icons` 수동 설정으로 구현.

## Implementation
- **에셋 이동**: `la_musica_logo_assets_exact/`의 favicon 세트(`favicon.ico/svg/16~512.png`), `apple-touch-icon.png`, `logo-icon-{light,dark}.svg`, `logo-horizontal-{light,dark}.svg`, `og-image.png`를 `public/`으로 이동. 중복 래스터 PNG 로고본·source crop·문서 파일은 이동하지 않음.
- **정리**: 구 `app/icon.svg`(수동 `metadata.icons`로 대체), 구 `public/og.png`(→`og-image.png`) 삭제. 이동 완료 후 `la_musica_logo_assets_exact/` 폴더 전체 삭제.
- **`app/layout.tsx`**: `metadata.icons`(favicon.ico + favicon.svg + apple-touch-icon) 추가, OG/Twitter 이미지를 `/og.png` → `/og-image.png`로 변경.
- **`components/logo.tsx`**: 인라인 SVG 컴포넌트를 `<img>` 기반으로 재작성. `variant: "icon" | "horizontal"` prop 추가(기본값 `icon`), 항상 dark 배리언트(`/logo-icon-dark.svg`, `/logo-horizontal-dark.svg`)를 렌더. 기존 `className`/`title` prop 시그니처는 유지해 호출부 대부분 무변경.
- **호출부 8곳 배리언트 배정**:
  - 가로형(`variant="horizontal"`): `headersection.tsx`(데스크톱 헤더 + 모바일 메뉴), `legal-page.tsx`, `contact-page.tsx`, `app/auth/page.tsx`, `footer-section.tsx`
  - 아이콘 단독(기본값): `workspace-navbar.tsx`, `app/workspace/loading.tsx`
- **`footer-section.tsx`**: 별도 `"La Musica"` 텍스트 span 제거(가로형 이미지에 워드마크 포함), `className`을 `h-9 w-16 shrink-0 sm:h-10 sm:w-20`(고정 폭) → `h-9 w-auto shrink-0 sm:h-10`(자동 폭)로 수정 — 정사각 아이콘 비율을 고정 폭에 넣으면 이미지가 찌그러지는 문제(가이드에서 명시적으로 금지) 방지.
- `components/logo.tsx`의 `<img>`에 `@next/next/no-img-element` eslint-disable 주석 추가(정적 브랜드 에셋이라 최적화 불필요).

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| Typecheck/build | `npm run build` | Passed (17 routes 생성) |
| Lint | `npm run lint` | Passed (0 errors, 0 warnings) |
| 신규 에셋 라우트 200 확인 | `curl` 로 `/`, `/logo-horizontal-dark.svg`, `/logo-icon-dark.svg`, `/favicon.svg`, `/apple-touch-icon.png`, `/og-image.png` | 전부 200 |
| 헤더에 가로형 로고 렌더 확인 | `curl` HTML에서 `src="/logo-horizontal-dark.svg"` 존재 확인 | 확인됨 |
| favicon/apple-touch-icon `<link>` 태그 확인 | `curl` HTML head 파싱 | `favicon.ico`(sizes=any), `favicon.svg`, `apple-touch-icon.png` 3개 모두 출력됨 |
| 임시 폴더 제거 | `ls` | `la_musica_logo_assets_exact/` 삭제 확인 |

## Lessons
- 정사각 아이콘 → 가로형 워드마크 이미지로 교체할 때는 호출부의 고정 폭(`w-16` 등) className을 `w-auto`로 함께 손보지 않으면 이미지가 찌그러진다 — 배리언트 교체는 항상 aspect-ratio 가정도 같이 점검해야 한다.
- `currentColor` 기반 단색 SVG는 그라디언트가 들어간 브랜드 자산으로 넘어가는 순간 재사용 불가 — 그라디언트 로고는 파일 참조(`<img>`/`next/image`)로 갈 수밖에 없다.
- `@next/next/no-img-element`는 severity가 `warn`이라 `npm run lint`(에러만 실패 처리) 자체는 통과하지만, `eslint-disable` 주석은 실제로 경고가 발생하는 줄 바로 위에 둬야 "unused directive" 경고가 새로 생기지 않는다.

## Follow-ups (미적용)
- 실제 브라우저에서 다크/라이트 다양한 화면(헤더, 푸터, 워크스페이스, 인증 페이지)을 육안으로 최종 확인 권장(이번엔 `curl` HTML/에셋 200 확인까지만 진행).
- `public/`에 남겨둔 `favicon-16~512.png`는 현재 `metadata.icons`에서 직접 참조하지 않음 — 추후 PWA manifest를 추가할 계획이 있다면 그때 연결.
