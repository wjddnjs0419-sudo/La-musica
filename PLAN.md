# PLAN.md

Completed work is summarized in `RESULT.md`. Keep this file to active/planned work only. Done items are one-line `[Done]` summaries; keep at most 10 and remove the oldest first.

## Pending Approval
(none)

## In Progress
- Contact page and navigation link - Add a `/contact` page using existing La Musica styling/components, wire the main menu Contact link to it, and validate with build/lint.

## Done
- [Done] 신규 가입 무료 크레딧 1개 → 5개 인상 (2026-07-10) - 직전 버그 수정 배포 후 실제 재로그인으로 지급 정상 확인. ACE-Step 실측 원가(~$0.032/곡, MiniMax $0.15/곡 대비 ~4.7배 저렴)를 근거로 사용자가 5개로 인상 결정. 신규 마이그레이션으로 `grant_free_credit` 함수의 지급량 1→5 변경(멱등 로직 유지), 관련 주석/문서 동기화. vitest 70/lint/build 통과. 5개 반영 후 실제 재현 테스트는 아직 미실행. See RESULT.md.
- [Done] 신규 가입 무료 크레딧 미지급 버그 수정 (2026-07-10) - `grant_free_credit` RPC가 프로덕션에서 전면적으로 한 번도 실행되지 않고 있었음(InsForge 로그 실측으로 확인, 친구 2명만의 문제가 아니었음). 원인은 `.rpc()`가 실패해도 throw 안 하고 `{data,error}`를 반환하는데 기존 콜백 코드가 반환값을 버려 실패가 완전 무음 처리되던 구조. 신규 `lib/grantFreeCredit.ts`(`grantFreeCreditSafely`)로 교체해 에러를 반드시 로그. TDD RED→GREEN; vitest 70/lint/build 통과. 근본 원인(admin 클라이언트 env 설정 추정) 100% 미확정, 배포 후 실제 로그인 재현 확인 필요. See RESULT_ARCHIVE.md.
- [Done] MiniMax → ACE-Step 음악 생성 모델 전환 (2026-07-10) - 곡 생성이 2~4분(MiniMax) 걸리던 걸 ACE-Step(fishaudio/ace-step-1.5, 커뮤니티 모델이라 version 해시 고정)으로 완전 교체, 실제 예측 2회 실행으로 검증(한국어 가사 포함). `buildAceStepInput` 신규(프롬프트 500자/가사 3500자 클램프, `[Instrumental]` 리터럴), refine 결과 500자로 축소, 가사 없는 보컬 요청은 `lyrics_required` 400으로 거부(ACE-Step은 MiniMax와 달리 가사 즉석 생성 불가). MINIMAX 관련 코드/문서 전량 정리. TDD RED→GREEN; vitest 66/lint/build 통과. 브라우저 UI 스모크 테스트는 미실행(사용자 확인 필요). 커밋은 main에 직접 완료, 배포는 사용자. See RESULT.md.
- [Done] Gemini 무료티어 RPM 경합으로 인한 동시 사용 실패 수정 (2026-07-10) - 번역/정제/제목/가사 어시스턴트가 공유하는 `GEMINI_API_KEY` 무료티어(15 RPM) 경합이 원인. 공유 `fetchGeminiWithRetry`(429 백오프+타임아웃)를 번역/정제/가사 어시스턴트 3곳에 적용, 제목 생성은 Gemini 호출 자체를 없애고 로컬 휴리스틱으로 전환(곡 생성당 Gemini 호출 항상 최대 2콜: 번역+정제). vitest 62/lint/build 통과. 커밋/배포는 사용자. See RESULT.md.
- [Done] Workspace mobile scroll stability (2026-06-18) - Stabilized mobile workspace scrolling by moving AI Lyrics Assistant to a portal with body scroll lock, using `100dvh`/`min-h-0`/`overscroll-contain`, making Upgrade modal internally scrollable, and capping prompt composer expansion. build/lint passed. See RESULT_ARCHIVE.md.
- [Done] 정제 전/후 프롬프트 효과 실측 + 저작권 중복·타임아웃 수정 (2026-06-17) - InsForge SQL 로 `musics.metadata` 정제 전/후 6건 실측: 정제 4건 평균 ~30% 압축 + BPM/key 보강(양성), 폴백 33%(2/6), 저작권 의역 시 캐논 중복(2/4). `finalizeRefined` 재작성(캐논 부분문자열 제거→의역 절 strip→1회 부착, 음악내용 없으면 폴백) + system prompt 저작권 출력금지화 + `refineStylePrompt` 8s AbortController 타임아웃. vitest 49(RED→GREEN)/lint/build 통과. See RESULT_ARCHIVE.md.
- [Done] HelloTalk beta coupon credits (2026-06-18) - Added authenticated `HELLOTALK-BETA` coupon redemption for 1 song credit with 20 max redemptions, server-side atomic RPC, Upgrade modal UI, coupon ledger tracking, and default signup free-credit disabled. migration/build/lint passed. See RESULT_ARCHIVE.md.
- [Done] Lyrics-based title generation and title-centered covers (2026-06-18) - New songs no longer derive titles from prompt text; lyric-backed songs use Gemini after auth/credit checks, instrumental/lyricless songs use genre/mood fallbacks, and thumbnail prompts now center the saved title. test/build/lint passed. See RESULT_ARCHIVE.md.
- [Done] Auth-aware landing CTA label (2026-06-18) - Returning signed-in users now see `Open Workspace` on landing CTAs that already route to `/workspace`, while anonymous users keep `Get Started` to `/auth`. build/lint passed. See RESULT_ARCHIVE.md.
- [Done] Style prompt 정제(Gemini) + 가사 태그 동기화 + UI/인증 수정 (2026-06-17) - 신규 `lib/refineStylePrompt.ts` 가 컴파일된 프롬프트를 Gemini 로 응집 재작성(프리셋=가드레일, 번역과 별도 콜, 실패 시 폴백) 후 generate 라우트에서 `compile→정제→MiniMax` 연결·메타에 정제 전/후 둘 다 저장. 가사 어시스턴트 태그를 `CANON_TAGS` 와 동기화 + `CANONICAL_SECTION_TAGS` export + 가드 테스트. `window.prompt/confirm` 미지원 → 인라인 rename·2단계 delete(`resolveRenameTitle` TDD). 가사 라우트 갱신 토큰 `setAuthCookies` persist(세션 silent 만료 수정). vitest 46/lint/build 통과. See RESULT_ARCHIVE.md.

## Future / Later
- 언어 선택 UI 드롭다운 추가 — prompt-box에 Language 선택 컨트롤 추가해 `GenerateRequest.language` 를 실제로 전송. 컴파일러는 이미 vocal 모드에서 `sung in {language}` 주입을 지원함(현재 UI는 `language: undefined` 하드코딩 상태). 한국어/스페인어/프랑스어/영어 등 옵션 + Auto.
