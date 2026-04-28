# CampusFlow

대학생 협업 툴 프로젝트

## 기술 스택

| 파트 | 기술 |
|------|------|
| Frontend | React + TypeScript (Vite) |
| Backend | Spring Boot + MySQL |
| AI | FastAPI + Ollama + Llama |

---

## 팀 구성 & 초기 세팅 담당

> 각 파트 리드가 프레임워크 초기화 후 PR 올려주세요.

| 파트 | 담당 폴더 | 해야 할 것 |
|------|-----------|------------|
| Frontend 리드 | `frontend/` | Vite React+TS 초기화 |
| Backend 리드 | `backend/` | Spring Initializr 프로젝트 추가 |
| AI 리드 | `ai/` | ✅ 완료 (FastAPI 스캐폴딩 있음) |

### Frontend 초기화 (프론트 리드만)
```bash
git checkout -b feature/frontend-init
cd frontend
npm create vite@latest . -- --template react-ts
npm install
git add . && git commit -m "feat: frontend 초기 세팅"
git push origin feature/frontend-init
# → GitHub에서 dev로 PR 생성
```

### Backend 초기화 (백엔드 리드만)
1. [start.spring.io](https://start.spring.io) 접속
2. 아래 설정으로 생성:
   - **Build**: Gradle - Groovy
   - **Java**: 17
   - **Dependencies**: Spring Web, Spring Data JPA, MySQL Driver
3. 생성된 파일을 `backend/` 폴더에 압축 해제
```bash
git checkout -b feature/backend-init
git add . && git commit -m "feat: backend 초기 세팅"
git push origin feature/backend-init
# → GitHub에서 dev로 PR 생성
```

---

## 사전 준비 (전원 필수)

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) 설치 후 실행

---

## 초기 설정

```bash
# 1. 클론
git clone https://github.com/SON3211111/campusflow.git
cd campusflow

# 2. dev 브랜치로 이동
git checkout dev

# 3. .env 파일 생성 (슬랙/노션으로 공유받은 값 입력)
cp .env.example .env
```

`.env` 파일에서 아래 항목 확인:
```env
# 학교에서 개발할 때
AI_SERVER_URL=http://10.30.4.173:8000

# 집에서 개발할 때 → Tailscale IP로 교체 (리더한테 문의)
# AI_SERVER_URL=http://100.x.x.x:8000
```

---

## 실행

```bash
# 전체 실행 (Frontend + Backend + MySQL)
docker-compose --profile main up --build

# 처음 이후에는 (빌드 생략)
docker-compose --profile main up
```

| 서비스 | 주소 |
|--------|------|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:8080 |
| MySQL | localhost:3306 |
| AI 서버 | http://10.30.4.173:8000 |

---

## 브랜치 전략

```
main    ← 최종 릴리즈 (직접 push 금지)
└── dev ← 개발 통합 (직접 push 금지, PR 필수)
    ├── feature/frontend-로그인
    ├── feature/backend-유저API
    └── feature/ai-채팅모델
```

### 작업 흐름

```bash
# 1. 작업 시작 전 항상 dev 최신화
git checkout dev
git pull origin dev

# 2. feature 브랜치 생성
git checkout -b feature/내작업이름

# 3. 작업 후 커밋
git add .
git commit -m "feat: 작업 내용"

# 4. push 후 GitHub에서 dev로 PR 생성
git push origin feature/내작업이름
```

### 커밋 메시지 규칙

| 타입 | 설명 |
|------|------|
| `feat:` | 새 기능 |
| `fix:` | 버그 수정 |
| `style:` | UI/CSS 변경 |
| `refactor:` | 코드 리팩토링 |
| `docs:` | 문서 수정 |

---

## 자주 쓰는 명령어

```bash
# 컨테이너 중지
docker-compose --profile main down

# 로그 확인
docker-compose logs -f [서비스명]   # frontend / backend / mysql

# 컨테이너 재시작
docker-compose --profile main restart [서비스명]

# DB 초기화 (주의: 데이터 삭제됨)
docker-compose --profile main down -v
```

---

## 집에서 개발할 때 (Tailscale 설정)

1. [tailscale.com](https://tailscale.com) 에서 설치
2. 리더와 **같은 Tailscale 계정 팀**에 초대 요청
3. 초대 수락 후 `.env`의 `AI_SERVER_URL`을 Tailscale IP로 변경

---

## 주의사항

- `.env` 파일은 절대 GitHub에 올리지 마세요 (`.gitignore`에 포함됨)
- `main`, `dev` 브랜치에 직접 push 금지 → **반드시 PR로 머지**
- PR 머지 전 최소 1명 코드 리뷰 필수
- Docker Desktop이 실행 중인지 확인 후 `docker-compose` 명령어 사용
