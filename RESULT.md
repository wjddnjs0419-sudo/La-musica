# RESULT: Workspace Shell Fidelity Correction - 2026-08-10

## Background

초기 Library/Player 리뉴얼은 기능 구조만 일부 반영해, 실제 `workspace_renew` 시안의 배경색·폭·헤더·검색 위치·Composer/Player 이중 바·Credits 모달과 큰 차이가 남아 있었다.

## Implementation

- Workspace 바탕을 순수 near-black으로 전환하고, 헤더를 90px 얇은 보더 바 형태로 바꿨다. 라이브 잔액을 포함한 Credits 버튼과 프로토타입 계층의 Account/Upgrade/Sign out 메뉴를 제공한다.
- 검색을 헤더에서 Library의 `generated tracks` 행으로 옮기고, 실제 `query` 상태를 직접 갱신한다. 콘텐츠는 시안처럼 넓은 데스크톱 폭과 큰 수직 여백을 사용한다.
- 상단 Create song과 별도로 Composer bar를 복원했다. Composer는 active player가 있으면 player bar 위에, 없으면 화면 하단에 고정된다. Create Song 모달을 여는 기존 로직을 계속 사용한다.
- Credit modal은 현재 잔액, 3개의 실제 checkout 플랜, 베타 코드 redeem 입력을 시안의 대형 사각 패널·monochrome button hierarchy로 재구성했다. checkout과 coupon API는 변경하지 않았다.

## Verification Matrix

| Change | Checks | Result |
|---|---|---|
| Existing automated suite | `npm test` | 21 files, 139 passed |
| Production build + types | `npm run build` | Passed |
| Lint | `npm run lint` | 0 errors; 기존 `FullScreenPlayer` 배경 `<img>` warning 1개 |
| Diff hygiene | `git diff --check` | Passed |

## Note

이 환경에는 Playwright/브라우저 자동화 도구가 없어 렌더된 화면의 스크린샷 검증은 수행하지 못했다.
