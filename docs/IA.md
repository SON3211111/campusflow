# IA (Information Architecture)

## 전체 구조

```
[랜딩 페이지]
 ├ 서비스 소개
 ├ 로그인 / 회원가입
 └ 시작하기

↓

[홈]
├ [1Depth] My Workspace (개인)
└ [1Depth] Team Workspace (팀)
     ├ [2Depth] 프로젝트 목록
     │    ├ 프로젝트 선택 → Workspace 진입
     │    ├ 검색 / 필터
     │    └ 즐겨찾기
     └ [2Depth] 프로젝트 생성
```

---

## My Workspace (개인)

```
[1Depth] My Workspace
├ [2Depth] Private Task
│   ├ Today / This Week / Later
│   ├ ToDo / Doing / Done
│   ├ Task 생성 (수동)
│   ├ AI Task 생성 (Hybrid)
│   ├ 검색 / 필터 / 정렬
│   └ Task 속성 (우선순위 / 마감일 / 태그)
├ [2Depth] Calendar
│   └ 일정 보기 / 등록 / 수정 / 삭제
├ [2Depth] Dashboard
│   ├ 작업량 / 진행률 / 완료 통계
├ [2Depth] Notification
│   ├ 마감 임박 알림 / 일정 알림 / AI 추천 알림
└ [2Depth] 협업 전환
    └ 팀으로 전환
```

---

## Team Workspace (팀)

```
[1Depth] Team Workspace
├ [2Depth] 프로젝트
├ [2Depth] Dashboard
│   ├ 팀 진행상황 / 활동 로그
│   ├ 병목 구간 분석
│   ├ 팀원 기여도 (업무 분포)
│   └ 마감 임박 / 지연 Task
├ [2Depth] Task Board
│   ├ [3Depth] Task Pool
│   │    ├ Task 조회 / 선택 (Picking)
│   │    ├ AI Task 추가 생성
│   │    ├ 검색 / 필터
│   │    └ 댓글 / 대댓글 / 멘션 알림
│   ├ [3Depth] My Task
│   │    ├ Today / This Week / Later
│   │    ├ ToDo / Doing / Done
│   │    └ Drag & Drop / Task 속성 수정
│   └ [3Depth] Team Board
│        ├ 전체 Task 조회
│        └ 담당자별 상태 확인
├ [2Depth] Calendar
│   ├ 팀 일정 / 일정 공유 / 공강 시간 추천
├ [2Depth] Notification
│   ├ Task 할당 / 멘션 / 이슈 / 퀵 시그널 알림
└ [2Depth] Settings
    ├ 프로젝트 관리
    ├ 팀원 관리 (초대 링크 / 코드 / 이메일)
    └ 알림 / 프로필
```

---

## Step Flow — 프로젝트 생성

```
Step 1. 프로젝트 정보 입력
Step 2. 팀원 초대 (이메일 / 링크 / 코드 / 건너뛰기)
Step 3. Task 생성
 ├ 일반 생성
 └ AI 기반 생성
↓
Task Board 진입
```

---

## 핵심 구조 요약

```
My Workspace ≠ Team Workspace

Task 흐름: Task Pool → My Task → Team Board
```
