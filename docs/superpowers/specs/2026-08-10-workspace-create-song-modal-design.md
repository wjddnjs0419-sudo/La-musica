# Workspace Create Song Modal Design

## Goal

기존 `/workspace` 라우트 안에서 실제 음악 생성 흐름을 유지한 채, Create Song 경험을 `Lyrics → Sound → Create`의 3단계 모달과 몰입형 생성 진행/완료 상태로 재구성한다.

## Scope

- 기존 Workspace의 목록, 검색, 생성 API, 크레딧, optimistic track, 폴링, 환불, 오디오 재생 상태를 재사용한다.
- 독립 `workspace_renew` 앱이나 새 라우트를 만들지 않는다.
- 라이브러리 전체와 플레이어의 대규모 시각 리뉴얼은 후속 범위다.

## Component Architecture

`components/workspace/WorkspaceShell.tsx`는 데이터와 작업 상태의 단일 소유자로 남긴다. 모달은 별도 클라이언트 컴포넌트로 분리하고, 완료/실패/닫기 이벤트를 명시적인 콜백으로 Shell에 전달한다.

```text
WorkspaceShell
├─ TrackList / MiniPlayer / FullScreenPlayer (기존)
└─ CreateSongModal
   ├─ Lyrics step
   ├─ Sound step
   ├─ Create step
   ├─ Generating state
   └─ Ready state
```

`WorkspaceShell`은 생성 요청 성공 뒤 반환된 실제 `Music` ID를 모달에 전달한다. 이후 기존 폴링 결과가 해당 ID의 완료·실패를 감지해 모달 상태를 갱신한다. 생성 중 모달을 닫더라도 optimistic row와 폴링은 유지된다.

## Interaction Design

### Responsive shell

- Desktop: 왼쪽 세로 단계 내비게이션, 오른쪽 현재 단계 편집 영역.
- Mobile: 상단 가로 `1 → 2 → 3` 단계 내비게이션, 그 아래 현재 단계 편집 영역.
- 모든 단계와 동작은 모바일과 데스크톱에서 동등하게 제공한다.
- Back/Continue 버튼과 단계 탭으로 이동하며, 미완료 단계로 이동해도 입력 값은 보존한다.

### Lyrics

- 직접 작성과 AI 가사 작성은 기존 `LyricsAssistantModal` 및 현재 가사 상태를 사용한다.
- 보컬 곡에서 비어 있는 가사는 기존 서버의 자동 가사 생성 동작을 유지한다.
- Instrumental을 선택해도 이미 작성한 가사는 삭제하지 않는다.

### Sound

- 핵심 제어: Genre 단일 선택, Mood 최대 3개, Vocal 단일 선택, Duration(60/180초) 단일 선택.
- `instrumental`과 가사가 함께 존재하면 “Lyrics won't be used for this generation.” 안내를 보인다.
- Language, Use case, Quick presets는 접힌 Advanced settings에 둔다.
- 자유 텍스트 sound direction은 선택 입력이며 구조화된 설정과 충돌할 경우 구조화된 설정이 우선한다.

### Create and credit confirmation

- 실제 계산된 생성 비용과 `remainingCredit`을 표시한다.
- 잔액이 부족하면 Create 대신 Get credits를 표시하고 기존 CreditModal을 연다.
- Create 클릭은 기존과 동일한 `POST /api/music/generate` 요청을 단 한 번 시작한다.

### Generating, ready, failed

- Create 클릭 직후 같은 모달이 영상 배경, 어두운 오버레이, 추정 진행률, 사용자 중심 상태 문구로 전환된다.
- 추정 진행률은 실제 백엔드 진행률처럼 보이지 않으며 완료 응답 전 100%에 도달하지 않는다.
- “Back to My music”은 모달만 닫고 생성은 취소하지 않는다. 생성 중에는 다른 생성 진입점을 비활성화한다.
- 완료 시 실제 title, thumbnail fallback, duration을 보여 준다. `Listen now` 클릭만 재생을 시작하며 자동 재생은 하지 않는다.
- 실패 시 기존 환불 상태 정보를 포함한 실패 UI를 표시하고, 재시도/프롬프트 수정은 새 생성 요청을 자동으로 시작하지 않는다.

## Data and Error Handling

- 하드코딩된 tracks, credits, timers, selected track은 사용하지 않는다.
- `Music`, `GenerateRequest`, `remainingCredit`, API 반환 데이터와 기존 audio element가 진실의 원천이다.
- 초기 요청 실패, insufficient credit, lyrics generation failure는 현재의 사용자 친화적 메시지와 CreditModal 연결을 보존한다.
- 썸네일이 아직 준비되지 않은 완료 곡은 `MusicThumbnail`의 기존 fallback을 렌더한다.

## Verification

- request payload 조립, mood 최대 3개, instrumental 가사 보존, 비용 부족 차단은 단위 테스트로 검증한다.
- `npm run build`, `npm run lint`를 통과해야 한다.
- 데스크톱과 모바일에서 단계 전환, 생성 중 이탈, 완료 후 명시적 재생, 실패·환불 상태를 수동 검증한다.
