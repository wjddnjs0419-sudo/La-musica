# RESULT: 노래 생성 즉시 Pending 피드백 - 2026-07-10

## Background
- 사용자가 Generate 클릭 후 노래 목록에 항목이 2~3초 늦게 뜬다고 보고. 원인은 클라이언트가 `/api/music/generate` 응답을 기다린 뒤에야 `upsertTrack(json.music)`을 호출하는 구조였음.
- 서버 generate route는 응답 전 인증/크레딧 조회, Gemini 번역, 프롬프트 정제, 크레딧 예약 RPC, Replicate prediction 생성, DB update, 남은 크레딧 조회까지 수행하므로 즉시 목록 반영이 불가능했음.
- 사용자 오해("버튼 눌렀는데 생성 안 되나?")를 줄이는 목적에는 API 분리보다 클라이언트 낙관적 pending row가 가장 작은 변경으로 효과가 큼.

## Implementation
- **`components/music-workspace.tsx`**: `handleSend` 시작 즉시 임시 `pending` 트랙(`Starting your track...`)을 목록 맨 위에 추가. 서버 응답 성공 시 임시 row를 실제 DB row로 교체하고 기존 polling 시작.
- generate 실패 시 임시 row 제거 후 기존 에러 UX 유지. `insufficient_credit`은 크레딧 모달을 열고, `lyrics_required`는 가사 필요 메시지를 표시.
- bootstrap 로딩 중 Generate를 눌러도 임시 row가 목록 bootstrap 응답에 덮어써지지 않도록, bootstrap setTracks에서 optimistic row를 보존 후 서버 tracks를 병합.
- 임시 row는 실제 DB id가 아니므로 polling 대상에서 제외하고, track action menu도 disabled 처리.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| Typecheck/build | `npm run build` | Passed |
| Lint | `npm run lint` | Passed |
| Optimistic row creation | 코드 확인 | `handleSend` 시작 즉시 temp `pending` track 추가 |
| Success replacement | 코드 확인 | server `json.music`로 temp row 교체 후 poll 시작 |
| Failure cleanup | 코드 확인 | 에러 시 temp row 제거 + 기존 에러/credit modal 처리 |
| Invalid temp server calls 방지 | 코드 확인 | temp row는 polling 제외, action menu disabled |

## Lessons
- 사용자에게 중요한 첫 피드백은 "완성"이 아니라 "접수됨"이다. 긴 서버 준비 단계를 기다리기 전에 pending row를 보여주면 클릭 실패로 오해할 여지가 줄어든다.
- optimistic row는 실제 DB row가 아니므로 polling/rename/delete 같은 서버 액션에서 제외해야 한다.
- bootstrap 후속 로딩과 optimistic UI가 동시에 존재할 수 있으므로, 서버 목록 로드가 임시 row를 지우지 않게 병합 로직이 필요했다.

## Follow-ups (미적용)
- 실제 로그인 세션에서 Generate 클릭 즉시 pending row가 보이고, 2~3초 후 실제 processing row로 교체되는지 브라우저 확인 필요.
- 다음 단계로 PromptBox send 버튼 자체를 request 중 disabled/loading 처리하면 중복 제출 방지도 더 명확해짐.
