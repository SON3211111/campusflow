# feature/ai-subdivide 변경사항

## 개요
AI 세부 분할 기능을 전용 엔드포인트로 분리하고, 기존 범용 `/generate` 엔드포인트를 제거했습니다.

## 변경 내용

### ai/main.py
- `/generate` 엔드포인트 제거
- `/subdivide-task` 엔드포인트 추가
  - 입력: `{ task, category, model? }`
  - 출력: `{ tasks: ["세부업무1", "세부업무2"] }`
- `_build_subdivide_prompt()` 추가 (영어 프롬프트, 한국어 결과)

### backend
- `AiController.java` — `/recommend`, `/generate` 제거 → `/subdivide-task` 추가
- `AiService.java` — `generate()`, `getAiRecommendation()` 제거 → `subdivideTask()` 추가
- `AiRecommendationRequest.java`, `AiResponseDto.java` 삭제 (미사용 DTO)
- `SubdivideResponseDto.java` 추가

### frontend
- `AiTaskPage.tsx` — `handleSubDivide()` 수정
  - 기존: 한국어 프롬프트 직접 조립 후 `/api/ai/generate` 호출
  - 변경: `{ task, category }` 만 전달 후 `/api/ai/subdivide-task` 호출

## 이유
- 프롬프트 관리를 main.py로 집중 → 프론트에서 프롬프트 문자열 관리 불필요
- 영어 프롬프트 사용으로 모델 응답 정확도 향상
- 미사용 엔드포인트 및 DTO 제거
