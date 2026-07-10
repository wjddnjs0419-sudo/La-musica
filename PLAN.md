# PLAN.md

Completed work is summarized in `RESULT.md`. Keep this file to active/planned work only. Done items are one-line `[Done]` summaries; keep at most 10 and remove the oldest first.

## Pending Approval
(none)

## In Progress
- Contact page and navigation link - Add a `/contact` page using existing La Musica styling/components, wire the main menu Contact link to it, and validate with build/lint.

## Done
- [Done] 브랜드 로고 교체 (2026-07-10) - 사용자가 준비한 `la_musica_logo_assets_exact/` 새 로고(그라디언트 심볼)를 `public/`으로 이동하고 임시 폴더 삭제. `app/layout.tsx`에 `metadata.icons`(favicon.ico/svg+apple-touch-icon) 추가, OG 이미지를 `og-image.png`로 교체. `components/logo.tsx`를 `<img>` 기반 `variant: icon|horizontal` 컴포넌트로 재작성(항상 dark 배리언트), 헤더/푸터/법적고지/문의/인증은 가로형, 워크스페이스 네브바/로딩화면은 아이콘 단독 적용. footer 고정폭 className을 w-auto로 수정해 찌그러짐 방지. build/lint 통과, curl로 신규 에셋 200 + head 태그 확인. See RESULT.md.
- [Done] 노래 생성 즉시 Pending 피드백 (2026-07-10) - Generate submit 즉시 임시 `pending` row(`Starting your track...`)를 목록 상단에 표시, 서버 성공 시 실제 music row로 교체 후 polling 시작. 실패 시 임시 row 제거 + 기존 에러/credit modal 처리. bootstrap 로드와 충돌하지 않게 optimistic row 보존, temp row polling/action 비활성화. build/lint 통과. See RESULT.md.
- [Done] Workspace 스켈레톤 로딩 전환 (2026-07-10) - `/workspace` 서버 렌더에서 musics/credit DB 조회 제거, shell은 auth 사용자 정보만 받고 즉시 렌더. 신규 `/api/workspace/bootstrap` no-store API로 최근 음악 50개+크레딧 후속 로드, list skeleton 및 `app/workspace/loading.tsx` route skeleton 추가. build/lint 통과, local production `/workspace` 134ms→5~13ms 확인. See RESULT.md.
- [Done] 랜딩 페이지 전환 성능 개선 (2026-07-10) - `/` 서버 인증 확인 제거 + 1시간 ISR 정적 응답 전환, auth-aware CTA는 클라이언트 사후 갱신(`/api/auth/status`)으로 분리. `/workspace`는 동적 유지하고 musics/credit 조회만 병렬화. Turbopack root 경고 제거. build/lint 통과, production `/` cache HIT 99ms→5ms 확인. 인라인 스타일은 Tailwind 중심에 제한적 예외만 있음을 확인. See RESULT.md.
- [Done] 신규 가입 무료 크레딧 1개 → 5개 인상 (2026-07-10) - 직전 버그 수정 배포 후 실제 재로그인으로 지급 정상 확인. ACE-Step 실측 원가(~$0.032/곡, MiniMax $0.15/곡 대비 ~4.7배 저렴)를 근거로 사용자가 5개로 인상 결정. 신규 마이그레이션으로 `grant_free_credit` 함수의 지급량 1→5 변경(멱등 로직 유지), 관련 주석/문서 동기화. vitest 70/lint/build 통과. 5개 반영 후 실제 재현 테스트는 아직 미실행. See RESULT.md.
- [Done] 신규 가입 무료 크레딧 미지급 버그 수정 (2026-07-10) - `grant_free_credit` RPC가 프로덕션에서 전면적으로 한 번도 실행되지 않고 있었음(InsForge 로그 실측으로 확인, 친구 2명만의 문제가 아니었음). 원인은 `.rpc()`가 실패해도 throw 안 하고 `{data,error}`를 반환하는데 기존 콜백 코드가 반환값을 버려 실패가 완전 무음 처리되던 구조. 신규 `lib/grantFreeCredit.ts`(`grantFreeCreditSafely`)로 교체해 에러를 반드시 로그. TDD RED→GREEN; vitest 70/lint/build 통과. 근본 원인(admin 클라이언트 env 설정 추정) 100% 미확정, 배포 후 실제 로그인 재현 확인 필요. See RESULT_ARCHIVE.md.
- [Done] MiniMax → ACE-Step 음악 생성 모델 전환 (2026-07-10) - 곡 생성이 2~4분(MiniMax) 걸리던 걸 ACE-Step(fishaudio/ace-step-1.5, 커뮤니티 모델이라 version 해시 고정)으로 완전 교체, 실제 예측 2회 실행으로 검증(한국어 가사 포함). `buildAceStepInput` 신규(프롬프트 500자/가사 3500자 클램프, `[Instrumental]` 리터럴), refine 결과 500자로 축소, 가사 없는 보컬 요청은 `lyrics_required` 400으로 거부(ACE-Step은 MiniMax와 달리 가사 즉석 생성 불가). MINIMAX 관련 코드/문서 전량 정리. TDD RED→GREEN; vitest 66/lint/build 통과. 브라우저 UI 스모크 테스트는 미실행(사용자 확인 필요). 커밋은 main에 직접 완료, 배포는 사용자. See RESULT.md.
- [Done] Gemini 무료티어 RPM 경합으로 인한 동시 사용 실패 수정 (2026-07-10) - 번역/정제/제목/가사 어시스턴트가 공유하는 `GEMINI_API_KEY` 무료티어(15 RPM) 경합이 원인. 공유 `fetchGeminiWithRetry`(429 백오프+타임아웃)를 번역/정제/가사 어시스턴트 3곳에 적용, 제목 생성은 Gemini 호출 자체를 없애고 로컬 휴리스틱으로 전환(곡 생성당 Gemini 호출 항상 최대 2콜: 번역+정제). vitest 62/lint/build 통과. 커밋/배포는 사용자. See RESULT.md.
- [Done] Workspace mobile scroll stability (2026-06-18) - Stabilized mobile workspace scrolling by moving AI Lyrics Assistant to a portal with body scroll lock, using `100dvh`/`min-h-0`/`overscroll-contain`, making Upgrade modal internally scrollable, and capping prompt composer expansion. build/lint passed. See RESULT_ARCHIVE.md.
- [Done] 정제 전/후 프롬프트 효과 실측 + 저작권 중복·타임아웃 수정 (2026-06-17) - InsForge SQL 로 `musics.metadata` 정제 전/후 6건 실측: 정제 4건 평균 ~30% 압축 + BPM/key 보강(양성), 폴백 33%(2/6), 저작권 의역 시 캐논 중복(2/4). `finalizeRefined` 재작성(캐논 부분문자열 제거→의역 절 strip→1회 부착, 음악내용 없으면 폴백) + system prompt 저작권 출력금지화 + `refineStylePrompt` 8s AbortController 타임아웃. vitest 49(RED→GREEN)/lint/build 통과. See RESULT_ARCHIVE.md.
- [Done] HelloTalk beta coupon credits (2026-06-18) - Added authenticated `HELLOTALK-BETA` coupon redemption for 1 song credit with 20 max redemptions, server-side atomic RPC, Upgrade modal UI, coupon ledger tracking, and default signup free-credit disabled. migration/build/lint passed. See RESULT_ARCHIVE.md.

## Future / Later
- 언어 선택 UI 드롭다운 추가 — prompt-box에 Language 선택 컨트롤 추가해 `GenerateRequest.language` 를 실제로 전송. 컴파일러는 이미 vocal 모드에서 `sung in {language}` 주입을 지원함(현재 UI는 `language: undefined` 하드코딩 상태). 한국어/스페인어/프랑스어/영어 등 옵션 + Auto.
