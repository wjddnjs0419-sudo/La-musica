# RESULT: Create Song 언어 Auto 중복 제거 - 2026-08-18

## Background

Create Song Step 2 Advanced의 Language 선택 메뉴에서 Auto가 두 번 표시되는 문제를 해결한다.

## Implementation

- 공용 `Select` 컴포넌트의 하드코딩된 빈 값 Auto 옵션을 제거했다.
- `LANGUAGE_OPTIONS`의 Auto 항목만 렌더링해 선택 목록의 단일 기준을 유지했다.

## Verification

| Check | Result |
|---|---|
| `npm run build` | Passed |
| `npm run lint` | 0 errors; existing FullScreenPlayer `<img>` warning 1개 |
| `git diff --check` | Passed |

## Lessons

- 옵션 배열을 선택 메뉴의 단일 기준으로 두면 기본값 중복을 방지할 수 있다.
