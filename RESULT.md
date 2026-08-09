# RESULT: 모달 기반 Google 인증 전환 - 2026-08-10

## Background

별도 `/auth` 화면이 메인·Workspace의 다크 에디토리얼 경험과 단절되고, OAuth 콜백도 항상 같은 Workspace 화면으로 이동했다.

## Implementation

- 랜딩의 Sign in·Create CTA, 가격 결제의 인증 요구, Workspace bootstrap의 비인증 처리에서 같은 모달 인증 흐름을 사용하도록 전환했다.
- 모달은 모노크롬 La Musica 마크·Google 단일 버튼·약관 링크·X/배경/Escape 닫기를 제공하며, near-black 표면과 절제된 흰색 UI로 구성했다.
- Google OAuth 시작 전 안전한 내부 `returnTo`만 httpOnly 임시 쿠키에 보관하고, 기존 code verifier·세션 교환·무료 크레딧 부여를 유지한 채 콜백 뒤 해당 목적지로 복귀하도록 했다.
- Hero/최종 CTA의 `create=1` 복귀는 Workspace에서 Create song composer 모달을 자동으로 열고 입력에 포커스를 준다. 기존 `/auth` 주소는 랜딩의 인증 모달 진입점으로 호환 처리한다.

## Verification Matrix

| Change | Checks | Result |
|---|---|---|
| Return-path security | `npm test -- lib/auth-return.test.ts` | 5 passed |
| Production build | `npm run build` | Passed |
| Lint | `npm run lint` | 0 errors; 기존 `FullScreenPlayer` `<img>` warning 1개 |
| Diff hygiene | `git diff --check` | Passed |

## Lessons

- OAuth의 원래 목적지 복원은 URL을 그대로 신뢰하지 않고, 서버에서 내부 경로만 허용한 뒤 짧은 수명의 httpOnly state로 보존해야 한다.
- 인증과 생성 의도는 분리해 저장하면 로그인 후 사용자가 하려던 작업을 즉시 이어갈 수 있다.
