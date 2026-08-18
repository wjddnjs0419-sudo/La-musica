# RESULT: 음악 생성 Provider 추상화 - 2026-08-18

## Background

ACE-Step/Replicate 모델 세부사항이 생성, 폴링, cron, 프롬프트 정제, 비용 계산에 직접 흩어져 있어 다음 모델 전환 때 여러 경로를 수정해야 했다. 과거 MiniMax/MusicGen 튜닝 지식도 현재 지침과 분리돼 있지 않았다.

## Implementation

- `MusicGenerationProvider` 계약과 `replicate-ace-step` 구현을 추가해 모델 입력, 상태 정규화, 비용 산정을 어댑터로 옮겼다.
- 생성 라우트, 사용자 폴링, cron reconciliation이 provider 계약을 사용한다. 신규 job은 `metadata.generation`을 저장하고, 기존 `prediction_id` job도 계속 복구한다.
- 공통 프롬프트 정제와 비용 로깅에서 ACE-Step 고정값을 제거하고, provider 정책·산정값을 받도록 변경했다.
- MiniMax/MusicGen의 검증된 튜닝 원칙과 모델 특화 가정을 `docs/legacy`에 보존했다.

## Verification

| Check | Result |
|---|---|
| `npm test` | 25 files, 148 tests passed |
| `npm run lint` | 0 errors; existing FullScreenPlayer `<img>` warning 1개 |
| `npm run build` | Passed |
| `git diff --check` | Passed |

## Lessons

- 공급자별 입력·상태·비용은 adapter 경계에 가둬야 모델 교체 시 UI와 데이터 lifecycle을 안정적으로 보존할 수 있다.
