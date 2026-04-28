# CampusFlow 개발 가이드

> 개발이 처음이어도 괜찮아요. 순서대로 따라하면 됩니다.

---

## 리더 체크리스트

> 팀원들이 시작하기 전에 리더가 완료해야 할 항목

- [ ] 팀원 GitHub 초대 (Settings → Collaborators)
- [ ] `.env` 값 슬랙/노션으로 팀원 공유
- [ ] AI팀에게 서버에서 `docker-compose.ai.yml` 실행 요청
- [ ] 프론트 리드에게 `feature/frontend-init` PR 요청
- [ ] 백엔드 리드에게 `feature/backend-init` PR 요청
- [ ] 집에서 개발할 팀원 Tailscale 팀 초대

---

## 기술 스택

| 파트 | 기술 |
|------|------|
| Frontend | React + TypeScript (Vite) |
| Backend | Spring Boot + MySQL |
| AI | FastAPI + Ollama + Llama |

---

## 파트 리드 초기 세팅 (처음 한 번만)

> 각 파트에서 한 명만 하면 됩니다. 나머지 팀원은 건너뛰세요.

### 프론트엔드 리드

터미널을 열고 아래 명령어를 순서대로 입력하세요.

```bash
# 1. dev 브랜치에서 새 브랜치 만들기
git checkout dev
git checkout -b feature/frontend-init

# 2. frontend 폴더로 이동
cd frontend

# 3. React + TypeScript 프로젝트 생성
npm create vite@latest . -- --template react-ts

# 4. 패키지 설치
npm install

# 5. GitHub에 올리기
git add .
git commit -m "feat: frontend 초기 세팅"
git push origin feature/frontend-init
```

6. GitHub 사이트에서 `feature/frontend-init` → `dev` 로 **Pull Request** 생성

---

### 백엔드 리드

**1단계: Spring 프로젝트 생성**

1. 브라우저에서 [start.spring.io](https://start.spring.io) 접속
2. 아래와 같이 설정:

| 항목 | 선택값 |
|------|--------|
| Project | Gradle - Groovy |
| Language | Java |
| Spring Boot | 3.x.x (최신) |
| Java | 17 |

3. 오른쪽 **ADD DEPENDENCIES** 클릭 후 추가:
   - `Spring Web`
   - `Spring Data JPA`
   - `MySQL Driver`

4. **GENERATE** 버튼 클릭 → 압축 파일 다운로드

**2단계: 파일 이동 및 push**

다운로드된 압축 파일 안의 내용을 전부 `campusflow/backend/` 폴더에 붙여넣기

```bash
git checkout dev
git checkout -b feature/backend-init
git add .
git commit -m "feat: backend 초기 세팅"
git push origin feature/backend-init
```

GitHub 사이트에서 `feature/backend-init` → `dev` 로 **Pull Request** 생성

---

### AI 리드

`ai/` 폴더는 이미 세팅 완료. AI 서버 컴퓨터에서 아래만 실행하면 됩니다.

```bash
git clone https://github.com/SON3211111/campusflow.git
cd campusflow
cp .env.example .env
# .env 파일 열어서 값 채우기

docker-compose -f docker-compose.ai.yml up --build -d

# Llama 모델 다운로드 (최초 1회, 수 분 소요)
docker exec -it campusflow-ollama-1 ollama pull llama3
```

---

## 처음 시작할 때 (전원 1회)

### 1단계 — Docker Desktop 설치

1. [Docker Desktop 다운로드](https://www.docker.com/products/docker-desktop/) 클릭
2. 설치 후 **Docker Desktop 실행**
3. 화면 오른쪽 아래 트레이에서 고래 아이콘이 **초록색** 이 되면 준비 완료

> Docker는 개발 환경을 내 컴퓨터에 자동으로 세팅해주는 프로그램입니다. 설치하지 않으면 아무것도 실행이 안 돼요.

---

### 2단계 — 프로젝트 받기

터미널(Mac: Terminal, Windows: Git Bash)을 열고 입력:

```bash
git clone https://github.com/SON3211111/campusflow.git
cd campusflow
git checkout dev
```

> `git clone`은 GitHub에 있는 코드를 내 컴퓨터로 복사하는 명령어입니다.

---

### 3단계 — .env 파일 만들기

```bash
cp .env.example .env
```

그 다음 `.env` 파일을 열어서 리더에게 공유받은 값을 입력하세요.

> `.env` 파일에는 비밀번호 같은 민감한 정보가 담겨있어요. 절대 GitHub에 올리면 안 됩니다.

집에서 개발할 경우 `.env` 파일 안에서 이 부분을 수정하세요:

```env
# 이 줄을 주석처리하고
# AI_SERVER_URL=http://10.30.4.173:8000

# 아래 줄의 주석을 해제 후 Tailscale IP로 교체
AI_SERVER_URL=http://100.x.x.x:8000
```

> Tailscale IP는 리더에게 문의하세요.

---

## 매일 개발 시작할 때

### 일반 팀원 (Frontend / Backend)

**1. Docker Desktop 켜기**

바탕화면 또는 시작 메뉴에서 Docker Desktop 실행
→ 트레이 아이콘이 **초록색**이 될 때까지 기다리기

---

**2. 최신 코드 받기**

어제 다른 팀원이 작업한 내용을 내 컴퓨터에 반영합니다.

```bash
cd campusflow
git checkout dev
git pull origin dev
```

---

**3. 서버 실행**

```bash
# 내 파트만 켤 때 (빠름, 추천)
docker-compose --profile frontend up    # 프론트팀
docker-compose --profile backend up     # 백엔드팀 (MySQL 자동 포함)

# 전체 다 켤 때
docker-compose --profile main up
```

처음 실행할 때는 다운로드가 있어서 3~5분 걸릴 수 있어요.
`Starting...` 메시지가 멈추고 로그가 나오면 준비 완료입니다.

---

**4. 브라우저에서 확인**

| 서비스 | 주소 |
|--------|------|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:8080 |
| AI 서버 | http://10.30.4.173:8000/docs |

---

**5. 작업 브랜치 만들기**

```bash
git checkout -b feature/내작업이름
# 예시: git checkout -b feature/login-page
```

이제 코드 작업 시작!

---

### AI 팀

**1. VS Code 열기**

VS Code에서 Remote-SSH 확장 프로그램으로 AI 서버 접속:
- 왼쪽 아래 초록색 버튼 클릭 → `Connect to Host` → `10.30.4.173`

**2. AI 서버는 항상 켜져 있으므로 바로 개발 시작**

http://10.30.4.173:8000/docs 에서 API 동작 확인 가능

**3. 코드 수정 후 서버 재시작이 필요할 때**

```bash
docker-compose -f docker-compose.ai.yml up --build -d
```

---

### 개발 끝낼 때

```bash
# 서버 끄기
docker-compose --profile main down
# 또는
docker-compose --profile frontend down
docker-compose --profile backend down
```

Docker Desktop은 그냥 켜둬도 되고, 종료하려면 트레이 아이콘 우클릭 → `Quit Docker Desktop`

---

## 브랜치 전략

브랜치는 **작업 공간**이라고 생각하면 돼요. 각자 자기 공간에서 작업하고, 완성되면 팀 공간(dev)에 합칩니다.

```
main  ← 최종 완성본 (건드리지 마세요)
  └── dev ← 팀 통합 공간 (직접 push 금지)
        ├── feature/login-page       ← 내 작업 공간
        ├── feature/user-api
        └── feature/ai-chat
```

### 작업 흐름

```bash
# 작업 시작 전: 항상 dev 최신화
git checkout dev
git pull origin dev

# 내 작업 브랜치 만들기
git checkout -b feature/내작업이름

# 작업 후 저장
git add .
git commit -m "feat: 어떤 기능을 만들었는지 적기"

# GitHub에 올리기
git push origin feature/내작업이름
```

GitHub 사이트에서 **Pull Request** 생성 → 팀원 1명 확인 후 `dev`에 머지

---

### 커밋 메시지 규칙

커밋 메시지는 `타입: 내용` 형식으로 작성하세요.

| 타입 | 언제 쓰나요 | 예시 |
|------|------------|------|
| `feat:` | 새 기능 만들었을 때 | `feat: 로그인 페이지 추가` |
| `fix:` | 버그 고쳤을 때 | `fix: 버튼 클릭 오류 수정` |
| `style:` | 디자인/CSS 바꿨을 때 | `style: 헤더 색상 변경` |
| `refactor:` | 코드 정리했을 때 | `refactor: 함수 이름 정리` |
| `docs:` | 문서 수정했을 때 | `docs: README 업데이트` |

---

## 자주 쓰는 명령어 모음

```bash
# 서버 시작
docker-compose --profile main up

# 서버 종료
docker-compose --profile main down

# 로그 보기 (오류 확인할 때)
docker-compose logs -f frontend
docker-compose logs -f backend

# 서버 재시작
docker-compose --profile main restart

# DB 초기화 (주의: 데이터 전부 삭제됨)
docker-compose --profile main down -v
```

---

## 집에서 개발할 때 (Tailscale)

Tailscale은 학교 밖에서도 AI 서버에 접속할 수 있게 해주는 프로그램입니다.

1. [tailscale.com](https://tailscale.com) 에서 설치
2. 리더에게 팀 초대 요청
3. 초대 수락 후 `.env`의 `AI_SERVER_URL`을 Tailscale IP로 변경

---

## 주의사항

- `.env` 파일은 **절대 GitHub에 올리지 마세요** (비밀번호가 담겨있어요)
- `main`, `dev` 브랜치에 **직접 push 금지** → PR로만 머지
- PR 올리면 팀원 **1명 이상 확인** 후 머지
- `docker-compose` 명령어 실행 전 **Docker Desktop이 켜져있는지** 확인
