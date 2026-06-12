# RESULT: Music card metadata cleanup — 2026-06-12

## 배경
- 요청: 생성 중인 음악 카드 제목 아래에 `--:-- * Today`처럼 보이는 메타 정보를 숨김.
- 요청: 완료된 음악 카드에서도 길이와 날짜 사이의 `*` 구분자 제거.

## 구현
- **`components/music-workspace.tsx`**: `pending`/`processing` 상태에서는 제목 아래 메타 줄을 렌더링하지 않도록 변경.
- **`components/music-workspace.tsx`**: 완료된 곡의 메타 줄에서 `*` 구분자를 제거하고, 길이와 날짜만 간격으로 표시하도록 정리.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| 전체 코드 | `npm run lint` | 통과 |
| 타입/프로덕션 빌드 | `npm run build` | 통과 |

## 교훈
- 생성 중인 항목은 아직 확정된 길이가 없으므로, placeholder metadata를 보여주는 것보다 조용히 비워두는 편이 덜 헷갈린다.

## 배포
- 미배포(로컬). git 커밋/푸시는 사용자 요청 필요.
