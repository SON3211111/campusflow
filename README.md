# CampusFlow

## 프로젝트 소개

CampusFlow는 대학생 팀 프로젝트에서 발생하는
업무 분배 불균형, 진행 상황 가시성 부족, 협업 비효율 문제를 해결하기 위한 AI 기반 협업 플랫폼입니다.

기존 협업 도구는 기능 중심 구조로 인해
역할 편중, 참여도 저하, 소통 단절 문제를 해결하지 못합니다.

CampusFlow는 이를 해결하기 위해
Task 중심 협업 구조와 자율 업무 선택 시스템을 기반으로 설계되었습니다.

---

## 핵심 가치

* 공정한 협업: 업무 선택 기반 구조
* 높은 가시성: 실시간 상태 공유
* 데이터 기반 참여도 분석
* AI 기반 빠른 시작 지원

---

## 시스템 아키텍처

```
[Client]
   ↓
[Frontend (React)]
   ↓
[Backend (Spring Boot)]
   ↓
[Database (MySQL)]
   ↓
[AI Server (FastAPI + Ollama)]
```

---

## 주요 기능

### Task 중심 협업
* 모든 작업을 Task 단위로 관리
* Thread 기반 대화 구조

### 자율 Task 선택
* 팀원이 직접 업무 선택
* 충돌 방지 시스템

### 실시간 협업
* 상태 즉시 반영
* 진행 상황 가시성 확보

### 일정 최적화
* 공강 시간 분석
* 회의 시간 자동 도출

### 협업 데이터 분석
* 참여도 기록 및 분석

---

## AI 기능

* 프로젝트 초기 Task 자동 생성
* 업무 구조 설계 보조

AI는 협업을 대체하지 않고 협업을 더 빠르게 시작하게 만드는 도구입니다.

---

# 개발 가이드

> 반드시 읽어주세요. 개발 환경부터 협업 규칙까지 정리했습니다.

---

## 리더 체크리스트

> 팀원들이 시작하기 전에 리더가 완료해야 할 항목

- [x] 팀원 GitHub 초대 (Settings → Collaborators)
- [x] `.env` 값 슬랙/노션으로 팀원 공유
- [ ] AI팀에게 서버에서 AI 서버 실행 요청 (`--profile ai`)
- [x] 프론트 리드 — `feature/frontend-init` PR 완료
- [x] 백엔드 리드에게 `feature/backend-init` PR 요청

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

### 프론트엔드 리드 — 완료

React + TypeScript (Vite) 초기 세팅이 완료되어 있습니다. 별도 작업 불필요.

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

**2단계: application.properties 설정**

`src/main/resources/application.properties` 파일을 열어 아래 내용으로 교체하세요.

```properties
spring.jpa.hibernate.ddl-auto=update
```

> DB 접속 정보(URL, 계정, 비밀번호)는 `.env` 파일에 이미 설정되어 있어서 여기에 적으면 안 됩니다. Docker가 자동으로 주입해줍니다.

**3단계: 파일 이동 및 push**

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

docker-compose --profile ai up --build -d

# Llama 모델 다운로드 (최초 1회만! 4~5GB, 수 분 소요)
# 이 명령어 한 번만 실행하면 다음부터는 안 해도 됩니다
docker exec -it campusflow-ai-1 ollama pull llama3
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
docker-compose --profile frontend up          # 프론트팀
docker-compose --profile backend up           # 백엔드팀 (MySQL 자동 포함)
docker-compose --profile ai up                # AI팀

# 전체 다 켤 때
docker-compose --profile main up              # frontend + backend + mysql
docker-compose --profile main --profile ai up # 전체 (AI 포함)
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

> AI 팀은 별도의 AI 서버 컴퓨터에서 개발합니다. 내 노트북에서 VS Code로 원격 접속해서 작업해요.

---

**1단계 — Remote-SSH 확장 프로그램 설치 (최초 1회)**

1. VS Code 실행
2. 왼쪽 사이드바 확장 프로그램 아이콘 클릭 (또는 `Ctrl+Shift+X`)
3. `Remote - SSH` 검색 후 설치

---

**2단계 — AI 서버 접속**

1. VS Code 왼쪽 아래 **초록색 버튼** 클릭
2. `Connect to Host...` 선택
3. `Add New SSH Host...` 선택
4. 아래 입력 후 Enter

```
ssh 계정명@AI서버공인IP
```

5. 비밀번호 입력하면 접속 완료
6. `Open Folder` → `campusflow/ai` 폴더 열기

> 이제부터는 내 노트북에서 작업하는 것처럼 AI 서버의 파일을 바로 수정할 수 있어요.

---

**3단계 — 개발 시작**

`ai/main.py` 파일에 기능을 추가하면 됩니다.

현재 사용 가능한 엔드포인트:
- `GET /health` — 서버 상태 확인
- `POST /generate` — 프롬프트를 보내면 Llama3가 응답

새 기능은 이 파일에 엔드포인트를 추가하는 방식으로 개발해요.

---

**4단계 — 코드 수정 후 서버 반영**

VS Code 터미널(`Ctrl+`\`)을 열고:

```bash
docker-compose --profile ai up --build -d
```

---

**5단계 — 동작 확인**

브라우저에서 아래 주소 접속:

```
http://AI서버공인IP:8000/docs
```

Swagger UI 페이지가 뜨면 API를 바로 테스트할 수 있어요. (코드 없이 버튼 클릭으로 테스트 가능)

---

**로그 확인 (오류 났을 때)**

```bash
docker-compose logs -f ai
docker-compose logs -f ollama
```

---

### 개발 끝낼 때

```bash
# 서버 끄기
docker-compose --profile main down
docker-compose --profile main --profile ai down  # AI까지 포함해서 끌 때
# 또는
docker-compose --profile frontend down
docker-compose --profile backend down
docker-compose --profile ai down
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
docker-compose --profile main up                       # frontend + backend + mysql
docker-compose --profile main --profile ai up          # 전체 (AI 포함)

# 서버 종료
docker-compose --profile main down
docker-compose --profile main --profile ai down        # AI까지 포함해서 끌 때

# 로그 보기 (오류 확인할 때)
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f ai
docker-compose logs -f ollama

# 백엔드 코드 변경 후 재시작 (이미지 재빌드 불필요)
docker-compose restart backend

# 전체 재시작
docker-compose --profile main restart

# build.gradle 변경 후 (이미지 재빌드 필요)
docker-compose --profile backend up --build

# DB 초기화 (주의: 데이터 전부 삭제됨)
docker-compose --profile main down -v
```

---

## 주의사항

- `.env` 파일은 **절대 GitHub에 올리지 마세요** (비밀번호가 담겨있어요)
- `main`, `dev` 브랜치에 **직접 push 금지** → PR로만 머지
- PR 올리면 팀원 **1명 이상 확인** 후 머지
- `docker-compose` 명령어 실행 전 **Docker Desktop이 켜져있는지** 확인
