# RESULT: Workspace Create Song 3단계 모달 + 생성 경험 리뉴얼 - 2026-08-10

## Background

`workspace_renew`의 Create Song 시안은 실제 서비스와 분리된 Vite 프로토타입이며, mock 곡·크레딧·진행 타이머를 사용했다. 이를 새 라우트로 연결하지 않고, 현재 Workspace의 실제 생성·크레딧·폴링·오디오 흐름에 반영해야 했다.

## Implementation

- `CreateSongModal`을 추가해 Lyrics → Sound → Create 단계를 구현했다. 데스크톱은 좌측 세로 내비게이션, 모바일은 좌→우 가로 내비게이션을 제공하며 기능을 축소하지 않는다.
- Lyrics는 `Write my own lyrics`와 `Generate with AI` 탭으로 나눴다. AI 탭의 주제 입력은 기존 대화형 작사 API를 즉시 시작하고, Apply lyrics 결과를 동일 탭의 편집 가능한 가사 영역으로 돌려준다. 대화 모달도 Create Song과 같은 다크 에디토리얼 UI로 정리했다.
- Sound는 프로토타입과 같이 `Simple`(필수 sound direction)과 `Advanced`(구조화된 Genre/Mood/Vocal/Duration 및 고급 설정) 모드로 나눴으며, 두 모드의 입력 상태는 유지된다.
- 데스크톱 모달은 단계별 콘텐츠 높이에 흔들리지 않는 고정 캔버스로 만들고, 좌측 단계 버튼은 모두 동일한 폭·높이로 고정했다. 콘텐츠가 긴 경우 우측 편집 영역만 스크롤된다.
- 기존 장르·무드·보컬·길이·언어·용도·프리셋을 실제 `GenerateRequest`로 변환했다. Mood는 최대 3개로 제한하고 Instrumental 전환에도 가사 초안을 보존한다.
- 프로토타입 영상을 서비스 정적 자산으로 옮기고, 기존 폴링의 실제 상태에 맞춰 모달 안에서 추정 진행·완료·환불 실패 UI를 표시한다. 모달을 닫아도 생성과 optimistic row 폴링은 계속된다.
- 완료 곡은 자동 재생하지 않고 `Listen now`를 눌렀을 때만 기존 audio 상태에 연결한다. 시안의 mock track·credit·타이머·선택 곡은 사용하지 않는다.
- 독립 Vite 프로토타입은 자체 TypeScript/ESLint 구성을 가지므로, 루트 Next.js build/lint 대상에서 제외했다.

## Verification Matrix

| Change | Checks | Result |
|---|---|---|
| Create-song form rules | `npm test -- lib/workspace/create-song.test.ts` | 5 passed |
| Production build | `npm run build` | Passed |
| Lint | `npm run lint` | 0 errors; 기존 `FullScreenPlayer` `<img>` warning 1개 |
| Diff hygiene | `git diff --check` | Passed |

## Lessons

- 디자인 프로토타입의 화면 구조는 유용하지만, 상태·가격·데이터는 반드시 서비스의 실제 원천으로 재연결해야 한다.
- 반응형 모달은 단순 축소가 아니라 단계 내비게이션의 방향과 편집 영역의 우선순위를 별도로 설계해야 한다.
