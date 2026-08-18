# RESULT: Replicate Google Lyria 3 Pro 전환 - 2026-08-18

## Background

음악 생성 모델을 ACE-Step에서 Replicate의 공식 `google/lyria-3-pro`로 변경해야 했다. 사용자 경험의 비동기 생성·폴링·스토리지 저장 흐름과 이미 처리 중인 ACE-Step 작업의 완료 처리는 유지해야 했다.

## Implementation

- `replicate-google-lyria-3-pro` provider를 추가하고, 새 생성의 활성 provider로 지정했다.
- 음악 지시·목표 길이·섹션 태그 가사를 Lyria의 단일 `prompt` 입력으로 결합했다. instrumental 요청은 명시적으로 무보컬 트랙으로 지시한다.
- Replicate 모델 slug를 사용해 최신 Lyria 3 Pro prediction을 만들고, 출력 URL 문자열과 SDK 파일 객체 모두 완료 오디오로 정규화한다.
- Lyria의 파일당 $0.08 비용과 최대 180초 목표 길이를 기록한다. ACE-Step provider는 과거 job 폴링 호환을 위해 계속 등록한다.

## Verification

| Check | Result |
|---|---|
| `npm test` | 26 files, 151 tests passed |
| `npm run lint` | 0 errors; existing FullScreenPlayer `<img>` warning 1개 |
| `npm run build` | Passed |
| `git diff --check` | Passed |

## Lessons

- Replicate의 모델 slug 기반 provider는 API 토큰과 비동기 lifecycle을 그대로 재사용하면서 모델별 입력 계약만 교체할 수 있다.
