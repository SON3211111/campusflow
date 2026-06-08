import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Globe2,
  MessageSquareText,
  Sparkles,
  UsersRound,
  Zap,
} from "lucide-react";
import Header from "../components/Header";
import stressImg from "../assets/stress.png";
import { LANGUAGES, getLanguageMeta, getStoredLanguage, saveLanguage, type AppLanguage } from "../utils/appLanguage";
import "./MainPage.css";

type MainCopy = {
  eyebrow: string;
  headlineA: string;
  headlineB: string;
  headlineC: string;
  desc: string;
  openWorkspace: string;
  start: string;
  signup: string;
  progressLabel: string;
  aiSplit: string;
  lessStress: string;
  stressTitleA: string;
  stressTitleB: string;
  stressTitleC: string;
  deadline: string;
  unassigned: string;
  meeting: string;
  flow: string;
  flowTitle: string;
  tasks: string[];
  members: string[];
  prompt: string;
  splitBtn: string;
  results: string[];
  rhythm: string[][];
  ready: string;
  ctaTitle: string;
  ctaDesc: string;
  board: string;
  freeStart: string;
};

const mainCopy = {
  ko: {
    eyebrow: "TEAM PROJECT CONTROL ROOM",
    headlineA: "팀플이",
    headlineB: "굴러가기",
    headlineC: "시작합니다",
    desc: "과제 목표를 넣으면 AI가 업무를 쪼개고, 팀은 보드에서 바로 움직입니다.",
    openWorkspace: "워크스페이스 열기",
    start: "바로 시작하기",
    signup: "계정 만들기",
    progressLabel: "캡스톤 프로젝트 진행률",
    aiSplit: "AI 업무 분해",
    lessStress: "LESS PROJECT STRESS",
    stressTitleA: "흩어진 할 일을",
    stressTitleB: "한 번에",
    stressTitleC: "잡아줍니다",
    deadline: "마감 3일 전",
    unassigned: "담당자 미정",
    meeting: "회의록 정리",
    flow: "PROJECT FLOW",
    flowTitle: "목표가 업무로, 업무가 진행률로 바뀌는 순간",
    tasks: ["자료 조사", "와이어프레임", "API 연결", "발표 초안"],
    members: ["민지", "현우", "서연", "준호"],
    prompt: "이번 주까지 서비스 기획서, 화면 설계, 발표 자료를 끝내야 해",
    splitBtn: "AI로 쪼개기",
    results: ["기획서 목차 정리", "회의 액션아이템 추출", "진행률 대시보드 반영", "제출 전 체크리스트"],
    rhythm: [
      ["보드는 가볍게", "팀 업무를 Todo, Doing, Done 흐름으로 바로 옮깁니다."],
      ["멤버는 선명하게", "누가 무엇을 맡았는지, 어디서 막혔는지 빠르게 확인합니다."],
      ["마감은 놓치지 않게", "진행률과 알림을 이어 붙여 마지막 순간의 혼선을 줄입니다."],
    ],
    ready: "READY TO MOVE",
    ctaTitle: "다음 팀 과제는 여기서 굴려보세요",
    ctaDesc: "큰 목표를 작게 나누고, 팀이 바로 실행할 수 있는 흐름으로 바꿉니다.",
    board: "내 보드 보기",
    freeStart: "무료로 시작",
  },
  en: {
    eyebrow: "TEAM PROJECT CONTROL ROOM",
    headlineA: "Teamwork",
    headlineB: "starts",
    headlineC: "moving",
    desc: "Enter a project goal, let AI split the work, and move your team straight onto the board.",
    openWorkspace: "Open workspace",
    start: "Start now",
    signup: "Create account",
    progressLabel: "Capstone project progress",
    aiSplit: "AI task split",
    lessStress: "LESS PROJECT STRESS",
    stressTitleA: "Gather scattered tasks",
    stressTitleB: "in one",
    stressTitleC: "clear flow",
    deadline: "3 days before due",
    unassigned: "Unassigned",
    meeting: "Meeting notes",
    flow: "PROJECT FLOW",
    flowTitle: "When goals become tasks, and tasks become progress",
    tasks: ["Research", "Wireframe", "API setup", "Draft slides"],
    members: ["Minji", "Hyunwoo", "Seoyeon", "Junho"],
    prompt: "We need to finish the service plan, screens, and presentation this week",
    splitBtn: "Split with AI",
    results: ["Plan outline", "Meeting action items", "Dashboard progress", "Final checklist"],
    rhythm: [
      ["Boards stay light", "Move team work through Todo, Doing, and Done."],
      ["Members stay clear", "See who owns what and where work is blocked."],
      ["Deadlines stay visible", "Connect progress and alerts to reduce last-minute confusion."],
    ],
    ready: "READY TO MOVE",
    ctaTitle: "Run your next team project here",
    ctaDesc: "Turn big goals into small work items your team can start right away.",
    board: "View my board",
    freeStart: "Start free",
  },
  zh: {
    eyebrow: "团队项目控制室",
    headlineA: "团队协作",
    headlineB: "开始",
    headlineC: "流动",
    desc: "输入项目目标，AI 会拆分任务，团队可以直接在看板上推进。",
    openWorkspace: "打开工作区",
    start: "立即开始",
    signup: "创建账号",
    progressLabel: "毕业项目进度",
    aiSplit: "AI 任务拆分",
    lessStress: "减少项目压力",
    stressTitleA: "分散的任务",
    stressTitleB: "一次",
    stressTitleC: "整理清楚",
    deadline: "截止前 3 天",
    unassigned: "未分配",
    meeting: "会议记录",
    flow: "项目流程",
    flowTitle: "目标变成任务，任务变成进度",
    tasks: ["资料调查", "线框图", "API 连接", "发表草案"],
    members: ["敏智", "贤宇", "瑞妍", "俊昊"],
    prompt: "本周需要完成服务企划书、界面设计和发表资料",
    splitBtn: "用 AI 拆分",
    results: ["企划书目录", "会议行动项", "进度仪表盘", "提交前清单"],
    rhythm: [
      ["看板更轻便", "把团队任务放进 Todo、Doing、Done 流程。"],
      ["成员更清楚", "快速确认谁负责什么、哪里卡住了。"],
      ["截止更可见", "连接进度和通知，减少最后时刻的混乱。"],
    ],
    ready: "准备推进",
    ctaTitle: "下一个团队作业就在这里推进",
    ctaDesc: "把大目标拆成小任务，让团队马上开始执行。",
    board: "查看我的看板",
    freeStart: "免费开始",
  },
  ja: {
    eyebrow: "チームプロジェクト管制室",
    headlineA: "チーム作業が",
    headlineB: "動き",
    headlineC: "出します",
    desc: "課題の目標を入れると、AI が作業を分解し、チームはすぐボードで動けます。",
    openWorkspace: "ワークスペースを開く",
    start: "今すぐ始める",
    signup: "アカウント作成",
    progressLabel: "卒業制作プロジェクト進捗",
    aiSplit: "AI 作業分解",
    lessStress: "プロジェクトの負担を軽く",
    stressTitleA: "散らばった作業を",
    stressTitleB: "一度に",
    stressTitleC: "整理します",
    deadline: "締切 3 日前",
    unassigned: "担当者未定",
    meeting: "議事録整理",
    flow: "プロジェクトフロー",
    flowTitle: "目標が作業に、作業が進捗に変わる瞬間",
    tasks: ["資料調査", "ワイヤーフレーム", "API 接続", "発表草案"],
    members: ["ミンジ", "ヒョヌ", "ソヨン", "ジュノ"],
    prompt: "今週までに企画書、画面設計、発表資料を終わらせたい",
    splitBtn: "AI で分解",
    results: ["企画書構成", "会議アクション項目", "進捗ダッシュボード", "提出前チェックリスト"],
    rhythm: [
      ["ボードは軽く", "チームの作業を Todo、Doing、Done にすぐ移します。"],
      ["メンバーは明確に", "誰が何を担当し、どこで止まっているか確認できます。"],
      ["締切を見逃さない", "進捗と通知をつなげ、直前の混乱を減らします。"],
    ],
    ready: "READY TO MOVE",
    ctaTitle: "次のチーム課題はここで進めましょう",
    ctaDesc: "大きな目標を小さな作業に分け、チームがすぐ実行できる流れにします。",
    board: "自分のボードを見る",
    freeStart: "無料で始める",
  },
  ru: {
    eyebrow: "ЦЕНТР УПРАВЛЕНИЯ ПРОЕКТОМ",
    headlineA: "Командная",
    headlineB: "работа",
    headlineC: "движется",
    desc: "Введите цель проекта, AI разобьет работу на задачи, а команда сразу перейдет к доске.",
    openWorkspace: "Открыть workspace",
    start: "Начать сейчас",
    signup: "Создать аккаунт",
    progressLabel: "Прогресс capstone-проекта",
    aiSplit: "AI-разделение задач",
    lessStress: "МЕНЬШЕ СТРЕССА",
    stressTitleA: "Разрозненные задачи",
    stressTitleB: "в один",
    stressTitleC: "понятный поток",
    deadline: "За 3 дня до срока",
    unassigned: "Без исполнителя",
    meeting: "Протокол встречи",
    flow: "ПОТОК ПРОЕКТА",
    flowTitle: "Когда цели становятся задачами, а задачи прогрессом",
    tasks: ["Исследование", "Wireframe", "API", "Черновик слайдов"],
    members: ["Минджи", "Хёнву", "Соён", "Джунхо"],
    prompt: "До конца недели нужно закончить план сервиса, экраны и презентацию",
    splitBtn: "Разбить с AI",
    results: ["Структура плана", "Action items", "Дашборд прогресса", "Финальный чеклист"],
    rhythm: [
      ["Доска остается легкой", "Переносите работу через Todo, Doing и Done."],
      ["Участники видны ясно", "Быстро видно, кто что делает и где есть блокер."],
      ["Сроки под контролем", "Свяжите прогресс и уведомления, чтобы снизить хаос в конце."],
    ],
    ready: "ГОТОВО К ДВИЖЕНИЮ",
    ctaTitle: "Запустите следующий командный проект здесь",
    ctaDesc: "Разбейте большую цель на задачи, к которым команда может приступить сразу.",
    board: "Открыть мою доску",
    freeStart: "Начать бесплатно",
  },
  de: {
    eyebrow: "TEAMPROJEKT-KONTROLLRAUM",
    headlineA: "Teamarbeit",
    headlineB: "kommt",
    headlineC: "in Fluss",
    desc: "Gib ein Projektziel ein, AI teilt die Arbeit auf, und dein Team startet direkt im Board.",
    openWorkspace: "Workspace öffnen",
    start: "Jetzt starten",
    signup: "Konto erstellen",
    progressLabel: "Fortschritt des Capstone-Projekts",
    aiSplit: "AI-Aufgabenteilung",
    lessStress: "WENIGER PROJEKTSTRESS",
    stressTitleA: "Verstreute Aufgaben",
    stressTitleB: "in einen",
    stressTitleC: "klaren Flow",
    deadline: "3 Tage vor Abgabe",
    unassigned: "Nicht zugewiesen",
    meeting: "Meeting-Notizen",
    flow: "PROJEKT-FLOW",
    flowTitle: "Wenn Ziele zu Aufgaben und Aufgaben zu Fortschritt werden",
    tasks: ["Recherche", "Wireframe", "API-Anbindung", "Folienentwurf"],
    members: ["Minji", "Hyunwoo", "Seoyeon", "Junho"],
    prompt: "Diese Woche müssen Serviceplan, Screens und Präsentation fertig werden",
    splitBtn: "Mit AI aufteilen",
    results: ["Planstruktur", "Meeting-Aktionen", "Dashboard-Fortschritt", "Finale Checkliste"],
    rhythm: [
      ["Boards bleiben leicht", "Bewege Teamarbeit durch Todo, Doing und Done."],
      ["Mitglieder bleiben klar", "Sieh schnell, wer was macht und wo es hängt."],
      ["Deadlines bleiben sichtbar", "Verbinde Fortschritt und Alerts, damit kurz vor Schluss weniger Chaos entsteht."],
    ],
    ready: "BEREIT ZUM START",
    ctaTitle: "Steuere dein nächstes Teamprojekt hier",
    ctaDesc: "Mache aus großen Zielen kleine Aufgaben, mit denen dein Team sofort loslegen kann.",
    board: "Mein Board ansehen",
    freeStart: "Kostenlos starten",
  },
} satisfies Record<AppLanguage, MainCopy>;

const MainPage: React.FC = () => {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem("accessToken");
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState<AppLanguage>(() => getStoredLanguage());
  const copy = mainCopy[selectedLang];
  const selectedMeta = getLanguageMeta(selectedLang);

  const goStart = () => navigate(isLoggedIn ? "/workspace" : "/login");

  return (
    <div className="main-page-wrapper">
      <Header showSearch={false} />

      <main className="main-container">
        <section className="main-hero">
          <div className="hero-copy">
            <p className="main-eyebrow">
              <Sparkles size={15} />
              {copy.eyebrow}
            </p>
            <h1>
              {copy.headlineA}
              <span>{copy.headlineB}</span>
              {copy.headlineC}
            </h1>
            <p className="hero-desc">
              {copy.desc}
            </p>
            <div className="main-hero-actions">
              <button className="main-primary-btn" onClick={goStart}>
                {isLoggedIn ? copy.openWorkspace : copy.start}
                <ArrowRight size={17} />
              </button>
              <button className="main-secondary-btn" onClick={() => navigate("/signup")}>
                {copy.signup}
              </button>
            </div>
          </div>

          <div className="hero-motion-stage" aria-label="CampusFlow animated preview">
            <div className="motion-orbit orbit-one" />
            <div className="motion-orbit orbit-two" />
            <div className="motion-center">
              <span>CampusFlow</span>
              <strong>72%</strong>
              <p>{copy.progressLabel}</p>
            </div>
            <div className="motion-bubble bubble-ai">
              <Zap size={16} />
              {copy.aiSplit}
            </div>
            <div className="motion-bubble bubble-member">
              <UsersRound size={16} />
              5 members
            </div>
            <div className="motion-bubble bubble-done">
              <CheckCircle2 size={16} />
              15 done
            </div>
          </div>
        </section>

        <section className="kinetic-strip" aria-label="CampusFlow highlights">
          <div className="kinetic-track">
            <span>AI TASK SPLIT</span>
            <span>LIVE BOARD</span>
            <span>MEMBER FLOW</span>
            <span>DASHBOARD</span>
            <span>DEADLINE CHECK</span>
            <span>AI TASK SPLIT</span>
            <span>LIVE BOARD</span>
          </div>
        </section>

        <section className="stress-story-section">
          <div className="stress-giant-copy">
            <p className="main-eyebrow">{copy.lessStress}</p>
            <h2>
              {copy.stressTitleA}
              <span>{copy.stressTitleB}</span>
              {copy.stressTitleC}
            </h2>
          </div>
          <div className="stress-visual">
            <img src={stressImg} alt="Project stress visualization" />
            <div className="stress-float stress-float-one">{copy.deadline}</div>
            <div className="stress-float stress-float-two">{copy.unassigned}</div>
            <div className="stress-float stress-float-three">{copy.meeting}</div>
          </div>
        </section>

        <section className="task-wave-section">
          <div className="main-section-heading wide">
            <p className="main-eyebrow">{copy.flow}</p>
            <h2>{copy.flowTitle}</h2>
          </div>
          <div className="task-wave">
            <div className="wave-lane lane-one">
              {copy.tasks.map((task) => <span key={task}>{task}</span>)}
            </div>
            <div className="wave-lane lane-two">
              <span>Todo</span>
              <span>Doing</span>
              <span>Review</span>
              <span>Done</span>
            </div>
            <div className="wave-lane lane-three">
              {copy.members.map((member) => <span key={member}>{member}</span>)}
            </div>
          </div>
        </section>

        <section className="ai-burst-section">
          <div className="ai-prompt-block">
            <p>{copy.prompt}</p>
            <button onClick={goStart}>
              {copy.splitBtn}
              <ArrowRight size={16} />
            </button>
          </div>
          <div className="ai-result-stack">
            <div><ClipboardList size={18} />{copy.results[0]}</div>
            <div><MessageSquareText size={18} />{copy.results[1]}</div>
            <div><BarChart3 size={18} />{copy.results[2]}</div>
            <div><CheckCircle2 size={18} />{copy.results[3]}</div>
          </div>
        </section>

        <section className="feature-rhythm-section">
          {copy.rhythm.map(([title, desc], index) => (
            <div className="rhythm-line" key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{title}</strong>
              <p>{desc}</p>
            </div>
          ))}
        </section>

        <section className="main-cta-panel">
          <div>
            <p className="main-eyebrow">{copy.ready}</p>
            <h2>{copy.ctaTitle}</h2>
            <p>{copy.ctaDesc}</p>
          </div>
          <button className="main-primary-btn" onClick={goStart}>
            {isLoggedIn ? copy.board : copy.freeStart}
            <ArrowRight size={17} />
          </button>
        </section>

        <footer className="main-footer">
          <div className="main-footer-brand">CAMPUS_FLOW</div>
          <div className="lang-select-area">
            {isLangMenuOpen && (
              <div className="lang-dropdown">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    className={`lang-item ${lang.code === selectedLang ? "selected" : ""}`}
                    onClick={() => {
                      setSelectedLang(lang.code);
                      saveLanguage(lang.code);
                      setIsLangMenuOpen(false);
                    }}
                  >
                    <span className="lang-native">{lang.native}</span>
                    <span className="lang-label">{lang.label}</span>
                  </button>
                ))}
              </div>
            )}
            <button
              className="lang-btn"
              onClick={() => setIsLangMenuOpen((open) => !open)}
            >
              <Globe2 size={16} />
              <span>{selectedMeta.native}</span>
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default MainPage;
