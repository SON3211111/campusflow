import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar as NativeStatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const C = {
  brand: '#625BFF',
  ink: '#18233B',
  muted: '#8993AA',
  page: '#F4F6FC',
  line: '#EDF0F7',
  green: '#22BF78',
  red: '#FF786D',
  orange: '#FFA62B',
};

type TaskStatus = '할 일' | '진행 중' | '완료';
type Task = { id: string; title: string; detail: string; dueDate: string | null; estimatedHours?: number | null; status: TaskStatus; color: string };
type AiTaskSuggestion = { title: string; description?: string; category?: string; priority?: string; estimatedHours?: number | null };
const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || 'http://10.0.2.2:8080/api').replace(/\/$/, '');

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateAtOffset(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return toDateKey(date);
}

function formatDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function weekday(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return ['일', '월', '화', '수', '목', '금', '토'][new Date(year, month - 1, day).getDay()];
}

const initialTasks: Task[] = [
  { id: '1', title: '로그인 API 연동', detail: '카카오 · 네이버 로그인 콜백 처리와 토큰 발급 연결', dueDate: dateAtOffset(-1), status: '진행 중', color: C.red },
  { id: '2', title: '분실물 등록 화면', detail: '사진 첨부와 위치 선택 흐름, 팀 리뷰 후 확정', dueDate: dateAtOffset(1), status: '진행 중', color: '#9B6BFF' },
  { id: '3', title: '중간발표 슬라이드', detail: '진행 현황과 시연 흐름을 12장 구성', dueDate: dateAtOffset(2), status: '진행 중', color: '#4C81FF' },
  { id: '4', title: 'DB 스키마 설계', detail: '분실물 · 사용자 · 채팅 테이블 관계 정의', dueDate: dateAtOffset(6), status: '할 일', color: C.green },
];

const navItems = [
  { icon: '⌂', label: '홈' },
  { icon: '▦', label: '시간표' },
  { icon: '✦', label: 'AI' },
  { icon: '▤', label: '워크스페이스' },
  { icon: '♙', label: '마이페이지' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('홈');
  const [taskList, setTaskList] = useState(initialTasks);
  const [taskFilter, setTaskFilter] = useState<'전체' | TaskStatus>('전체');
  const [selectedDay, setSelectedDay] = useState(dateAtOffset(0));
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDetail, setNewDetail] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<AiTaskSuggestion[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFallback, setAiFallback] = useState(false);
  const [aiError, setAiError] = useState('');
  const completedCount = taskList.filter((task) => task.status === '완료').length;
  const today = dateAtOffset(0);
  const filteredTasks = useMemo(
    () => taskFilter === '전체' ? taskList : taskList.filter((task) => task.status === taskFilter),
    [taskFilter, taskList],
  );

  const addTask = () => {
    const title = newTitle.trim();
    if (!title) { Alert.alert('제목을 입력해 주세요'); return; }
    setTaskList((current) => [{ id: `${Date.now()}`, title, detail: newDetail.trim() || '설명 없음', dueDate: null, status: '할 일', color: C.brand }, ...current]);
    setNewTitle(''); setNewDetail(''); setTaskModalOpen(false);
  };

  const advanceTask = (id: string) => setTaskList((current) => current.map((task) => task.id !== id ? task : {
    ...task,
    status: task.status === '할 일' ? '진행 중' : task.status === '진행 중' ? '완료' : '할 일',
  }));
  const openTasks = () => { setTaskFilter('전체'); setActiveTab('워크스페이스'); };
  const setTaskDueDate = (id: string, dueDate: string | null) => {
    setTaskList((current) => current.map((task) => task.id === id ? { ...task, dueDate } : task));
  };
  const scheduleDays = Array.from({ length: 7 }, (_, offset) => dateAtOffset(offset));

  const generateAiTasks = async () => {
    const prompt = aiPrompt.trim();
    if (!prompt) { Alert.alert('프로젝트 내용을 입력해 주세요'); return; }
    setAiLoading(true); setAiError(''); setAiSuggestions([]); setAiFallback(false);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300_000);
    try {
      const response = await fetch(`${API_BASE_URL}/ai/generate-tasks?description=${encodeURIComponent(prompt)}`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || `서버 오류 (${response.status})`);
      const data = payload?.data;
      if (!Array.isArray(data?.tasks)) throw new Error('서버 응답 형식을 확인할 수 없습니다.');
      setAiSuggestions(data.tasks);
      setAiFallback(Boolean(data.fallback));
    } catch (error) {
      const message = error instanceof Error && error.name === 'AbortError'
        ? 'AI 응답 시간이 초과됐어요. 잠시 후 다시 시도해 주세요.'
        : error instanceof Error ? error.message : 'AI 요청에 실패했어요.';
      setAiError(`${message}\n백엔드 주소: ${API_BASE_URL}`);
    } finally {
      clearTimeout(timeoutId);
      setAiLoading(false);
    }
  };

  const addAiSuggestions = () => {
    if (!aiSuggestions.length) return;
    const timestamp = Date.now();
    setTaskList((current) => [
      ...aiSuggestions.map((suggestion, index) => ({
        id: `ai-${timestamp}-${index}`,
        title: suggestion.title,
        detail: suggestion.description || suggestion.category || 'AI 제안 Task',
        dueDate: null,
        estimatedHours: suggestion.estimatedHours,
        status: '할 일' as const,
        color: suggestion.priority === 'HIGH' ? C.red : suggestion.priority === 'LOW' ? C.green : C.brand,
      })),
      ...current,
    ]);
    setAiSuggestions([]); setTaskFilter('전체'); setActiveTab('워크스페이스');
    Alert.alert('보드에 추가했어요', 'AI가 제안한 Task를 모바일 보드에 추가했습니다.');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View style={styles.logo}><Text style={styles.logoText}>C</Text></View>
        <View style={styles.headerTitle}>
          <Text style={styles.brandName}>C'FLOW</Text>
          <Text style={styles.workspaceName}>캠스톤 디자인 1조  ▾</Text>
        </View>
        <TouchableOpacity accessibilityLabel="Task 추가" onPress={() => setTaskModalOpen(true)} style={styles.headerAction}><Text style={styles.headerPlus}>＋</Text></TouchableOpacity>
        <TouchableOpacity accessibilityLabel="알림" onPress={() => Alert.alert('알림', '새 알림이 없습니다.')} style={styles.bellButton}>
          <Text style={styles.bell}>♧</Text>
          <View style={styles.notificationDot} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === '홈' && <>
        <View style={styles.welcome}>
          <Text style={styles.welcomeTitle}>좋은 아침이에요, 홍태민님 👋</Text>
          <Text style={styles.welcomeSubtitle}>오늘도 팀의 흐름을 함께 만들어봐요</Text>
          <View style={styles.notice}>
            <Text style={styles.noticeIcon}>🔔</Text>
            <Text numberOfLines={1} style={styles.noticeText}>팀장님이 로그인 API 연동에서 도움을 요청했어요</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeading}>
            <Text style={styles.cardTitle}>오늘 일정  ·  {formatDate(today)} ({weekday(today)})</Text>
            <TouchableOpacity onPress={() => setActiveTab('시간표')}><Text style={styles.link}>시간표  ›</Text></TouchableOpacity>
          </View>
          <ScheduleRow time="09:00" title="소프트웨어공학" detail="공학관 402호" color="#4C81FF" />
          <ScheduleRow time="13:00" title="캠스톤 팀 회의" detail="온라인 · 캠스톤 디자인 1조" color={C.green} />
          <ScheduleRow time="19:00" title="중간발표 슬라이드 정리" detail="도서관 스터디룸" color="#9B6BFF" last />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>캠스톤 프로젝트 진행률</Text>
          <View style={styles.progressRow}>
            <View style={styles.progressCircle}><Text style={styles.progressText}>{taskList.length ? Math.round(completedCount / taskList.length * 100) : 0}%</Text></View>
            <View>
              <Text style={styles.progressTitle}>{taskList.length}개 Task 중 {completedCount}개 완료</Text>
              <Text style={styles.progressDetail}>진행 중 {taskList.filter((task) => task.status === '진행 중').length}  ·  할 일 {taskList.filter((task) => task.status === '할 일').length}  ·  완료 {completedCount}</Text>
            </View>
          </View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${taskList.length ? completedCount / taskList.length * 100 : 0}%` }]} /></View>
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>내 할 일</Text>
          <TouchableOpacity onPress={openTasks}><Text style={styles.link}>보드 보기  ›</Text></TouchableOpacity>
        </View>
        {taskList.slice(0, 3).map((task) => <TaskCard key={task.id} task={task} onAdvance={() => advanceTask(task.id)} onSetDue={(date) => setTaskDueDate(task.id, date)} />)}
        <View style={{ height: 18 }} />
        </>}

        {activeTab === '워크스페이스' && <>
          <Text style={styles.screenTitle}>워크스페이스 보드</Text>
          <Text style={styles.screenSubtitle}>캠스톤 디자인 1조 · Task {taskList.length}개</Text>
          <View style={styles.filterRow}>
            {(['전체', '할 일', '진행 중', '완료'] as const).map((filter) => (
              <TouchableOpacity key={filter} onPress={() => setTaskFilter(filter)} style={[styles.filterChip, taskFilter === filter && styles.filterChipActive]}>
                <Text style={[styles.filterText, taskFilter === filter && styles.filterTextActive]}>{filter}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {filteredTasks.length ? filteredTasks.map((task) => <TaskCard key={task.id} task={task} onAdvance={() => advanceTask(task.id)} onSetDue={(date) => setTaskDueDate(task.id, date)} />) : (
            <View style={styles.emptyCard}><Text style={styles.emptyTitle}>이 상태의 Task가 없어요</Text><Text style={styles.emptyText}>다른 필터를 선택하거나 새 Task를 추가해보세요.</Text></View>
          )}
          <TouchableOpacity style={styles.primaryButton} onPress={() => setTaskModalOpen(true)}><Text style={styles.primaryButtonText}>＋ Task 추가</Text></TouchableOpacity>
        </>}

        {activeTab === '시간표' && <>
          <Text style={styles.screenTitle}>시간표</Text>
          <Text style={styles.screenSubtitle}>{new Date().getFullYear()}년 {new Date().getMonth() + 1}월 · 날짜를 선택해 일정을 확인하세요</Text>
          <View style={styles.card}><View style={styles.weekRow}>{scheduleDays.map((day) => {
            const hasDeadline = taskList.some((task) => task.dueDate === day);
            return <TouchableOpacity key={day} onPress={() => setSelectedDay(day)} style={[styles.dayCell, selectedDay === day && styles.dayCellSelected]}>
              <Text style={[styles.dayName, selectedDay === day && styles.daySelectedText]}>{weekday(day)}</Text>
              <Text style={[styles.dayNumber, selectedDay === day && styles.daySelectedText]}>{Number(day.slice(-2))}</Text>
              {(hasDeadline || day === today) && <View style={[styles.dayDot, selectedDay === day && styles.dayDotSelected]} />}
            </TouchableOpacity>
          })}</View></View>
          <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>{formatDate(selectedDay)} 일정</Text><Text style={styles.link}>{weekday(selectedDay)}</Text></View>
          {selectedDay === today ? <View style={styles.card}>
            <ScheduleRow time="09:00" title="소프트웨어공학" detail="공학관 402호" color="#4C81FF" />
            <ScheduleRow time="13:00" title="캠스톤 팀 회의" detail="온라인 · 캠스톤 디자인 1조" color={C.green} />
            <ScheduleRow time="19:00" title="중간발표 슬라이드 정리" detail="도서관 스터디룸" color="#9B6BFF" last />
          </View> : <View style={styles.emptyCard}><Text style={styles.emptyTitle}>등록된 수업 일정이 없어요</Text><Text style={styles.emptyText}>Task 마감은 아래에서 함께 확인할 수 있습니다.</Text></View>}
          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>마감 Task</Text>
          {taskList.filter((task) => task.dueDate === selectedDay).map((task) => <TaskCard key={task.id} task={task} onAdvance={() => advanceTask(task.id)} onSetDue={(date) => setTaskDueDate(task.id, date)} />)}
          {taskList.every((task) => task.dueDate !== selectedDay) && <Text style={styles.emptyText}>이 날짜에 마감되는 Task가 없습니다.</Text>}
        </>}

        {activeTab === 'AI' && <>
          <Text style={styles.screenTitle}>AI 업무 도우미</Text>
          <View style={styles.welcome}><Text style={styles.welcomeTitle}>프로젝트 업무를 나눠볼까요? ✨</Text><Text style={styles.welcomeSubtitle}>내용을 보내면 CampusFlow AI가 Task를 제안해요.</Text></View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>프로젝트 설명</Text>
            <Text style={styles.scheduleDetail}>목표, 사용자, 필요한 기능 등을 구체적으로 적어주세요.</Text>
            <TextInput defaultValue={aiPrompt} onChangeText={setAiPrompt} inputMode="text" keyboardType="default" autoCorrect={false} placeholder="예: 캠퍼스 분실물을 등록하고 주인을 찾는 앱. 학생 로그인, 사진 등록, 위치 검색, 채팅 기능이 필요해요." placeholderTextColor={C.muted} style={[styles.input, styles.multilineInput, styles.aiPromptInput]} multiline textAlignVertical="top" editable={!aiLoading} />
            <TouchableOpacity disabled={aiLoading} style={[styles.primaryButton, aiLoading && styles.disabledButton]} onPress={generateAiTasks}>
              <Text style={styles.primaryButtonText}>{aiLoading ? 'AI가 업무를 정리하고 있어요…' : '✦  AI로 업무 분해하기'}</Text>
            </TouchableOpacity>
            {aiError ? <View style={styles.errorBox}><Text style={styles.errorText}>{aiError}</Text></View> : null}
            {aiFallback && <Text style={styles.fallbackNotice}>AI 서버 응답 대신 백엔드 기본 작업 템플릿을 받았습니다.</Text>}
          </View>
          {aiSuggestions.length > 0 && <>
            <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>AI 제안 {aiSuggestions.length}개</Text><Text style={styles.link}>검토 후 보드에 추가</Text></View>
            {aiSuggestions.map((suggestion, index) => <View key={`${index}-${suggestion.title}`} style={styles.suggestionCard}>
              <View style={styles.suggestionTop}><Text style={styles.taskTitle}>{suggestion.title}</Text><Text style={styles.categoryChip}>{suggestion.category || 'Task'}</Text></View>
              {suggestion.description ? <Text style={styles.taskDetail}>{suggestion.description}</Text> : null}
              <Text style={styles.suggestionMeta}>{suggestion.priority || 'MEDIUM'}{suggestion.estimatedHours ? `  ·  예상 ${suggestion.estimatedHours}시간` : ''}</Text>
            </View>)}
            <TouchableOpacity style={styles.primaryButton} onPress={addAiSuggestions}><Text style={styles.primaryButtonText}>제안한 Task 모두 보드에 추가</Text></TouchableOpacity>
          </>}
        </>}

        {activeTab === '마이페이지' && <>
          <Text style={styles.screenTitle}>마이페이지</Text>
          <View style={styles.profileCard}><View style={styles.avatar}><Text style={styles.avatarText}>홍</Text></View><View><Text style={styles.profileName}>홍태민</Text><Text style={styles.scheduleDetail}>taemin.hong@school.ac.kr</Text></View></View>
          <View style={styles.card}><Text style={styles.cardTitle}>내 활동</Text><View style={styles.profileRow}><Text style={styles.scheduleTitle}>담당 Task</Text><Text style={styles.profileValue}>{taskList.length}개</Text></View><View style={styles.profileRow}><Text style={styles.scheduleTitle}>완료한 Task</Text><Text style={styles.profileValue}>{completedCount}개</Text></View><View style={styles.profileRow}><Text style={styles.scheduleTitle}>워크스페이스</Text><Text style={styles.profileValue}>캠스톤 디자인 1조</Text></View></View>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => Alert.alert('계정 설정', '계정 설정은 서버 연동 후 사용할 수 있어요.')}><Text style={styles.secondaryButtonText}>계정 설정</Text></TouchableOpacity>
        </>}
      </ScrollView>

      <View style={styles.bottomBar}>
        {navItems.map((item) => (
          <TouchableOpacity key={item.label} onPress={() => setActiveTab(item.label)} style={styles.navItem}>
            <View style={[styles.navIconWrap, activeTab === item.label && styles.navIconActive]}>
              <Text style={[styles.navIcon, activeTab === item.label && styles.navIconSelected]}>{item.icon}</Text>
            </View>
            <Text style={[styles.navLabel, activeTab === item.label && styles.navLabelActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Modal visible={taskModalOpen} transparent animationType="slide" onRequestClose={() => setTaskModalOpen(false)}>
        <Pressable style={styles.modalScrim} onPress={() => setTaskModalOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={() => undefined}>
            <View style={styles.modalHandle} />
            <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Task 추가</Text><TouchableOpacity onPress={() => setTaskModalOpen(false)}><Text style={styles.link}>닫기</Text></TouchableOpacity></View>
            <Text style={styles.fieldLabel}>제목</Text><TextInput defaultValue={newTitle} onChangeText={setNewTitle} inputMode="text" keyboardType="default" autoCorrect={false} placeholder="할 일 제목" placeholderTextColor={C.muted} style={styles.input} autoFocus />
            <Text style={styles.fieldLabel}>설명</Text><TextInput defaultValue={newDetail} onChangeText={setNewDetail} inputMode="text" keyboardType="default" autoCorrect={false} placeholder="간단한 설명 (선택)" placeholderTextColor={C.muted} style={[styles.input, styles.multilineInput]} multiline />
            <TouchableOpacity style={styles.primaryButton} onPress={addTask}><Text style={styles.primaryButtonText}>추가하기</Text></TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function TaskCard({ task, onAdvance, onSetDue }: { task: Task; onAdvance: () => void; onSetDue: (date: string | null) => void }) {
  const [duePickerOpen, setDuePickerOpen] = useState(false);
  const dates = Array.from({ length: 7 }, (_, offset) => dateAtOffset(offset));
  return (
    <>
      <View style={styles.taskCard}>
        <View style={[styles.taskAccent, { backgroundColor: task.color }]} />
        <View style={styles.taskCopy}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          <Text numberOfLines={1} style={styles.taskDetail}>{task.detail}</Text>
          <TouchableOpacity onPress={() => setDuePickerOpen(true)} accessibilityLabel="마감일 설정">
            <Text style={[styles.taskDue, { color: task.color }]}>{task.dueDate ? `◷  ${formatDate(task.dueDate)} 마감 · 변경` : '◷  마감일 설정 +'}</Text>
          </TouchableOpacity>
          {task.estimatedHours ? <Text style={styles.estimateLabel}>예상 {task.estimatedHours}시간</Text> : null}
        </View>
        <TouchableOpacity onPress={onAdvance} style={styles.taskStatusButton} accessibilityLabel="Task 상태 변경">
          <Text style={[styles.taskTag, task.status === '완료' && styles.doneTag]}>{task.status} ↻</Text>
        </TouchableOpacity>
      </View>
      <Modal visible={duePickerOpen} transparent animationType="fade" onRequestClose={() => setDuePickerOpen(false)}>
        <Pressable style={styles.modalScrim} onPress={() => setDuePickerOpen(false)}>
          <Pressable style={styles.datePickerCard} onPress={() => undefined}>
            <Text style={styles.sectionTitle}>마감일 선택</Text>
            <Text style={styles.scheduleDetail}>Task를 시간표 날짜에 표시할 수 있어요.</Text>
            <View style={styles.dueDateGrid}>{dates.map((date) => <TouchableOpacity key={date} style={styles.dueDateOption} onPress={() => { onSetDue(date); setDuePickerOpen(false); }}><Text style={styles.dueDateOptionText}>{formatDate(date)}</Text></TouchableOpacity>)}</View>
            <TouchableOpacity style={styles.clearDueButton} onPress={() => { onSetDue(null); setDuePickerOpen(false); }}><Text style={styles.link}>마감일 지우기</Text></TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function ScheduleRow({ time, title, detail, color, last = false }: { time: string; title: string; detail: string; color: string; last?: boolean }) {
  return (
    <View style={styles.scheduleRow}>
      <Text style={styles.scheduleTime}>{time}</Text>
      <View style={[styles.scheduleLine, { backgroundColor: color, height: last ? 31 : 40 }]} />
      <View style={styles.scheduleCopy}>
        <Text style={styles.scheduleTitle}>{title}</Text>
        <Text style={styles.scheduleDetail}>{detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.page, paddingTop: NativeStatusBar.currentHeight ?? 0 },
  header: { height: 60, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18 },
  logo: { width: 34, height: 34, borderRadius: 11, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#FFFFFF', fontWeight: '900', fontSize: 19 },
  headerTitle: { flex: 1, marginLeft: 10 },
  brandName: { color: C.ink, fontWeight: '900', fontSize: 15 },
  workspaceName: { color: C.muted, fontSize: 11, marginTop: 2 },
  headerAction: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#F0F1FF', alignItems: 'center', justifyContent: 'center', marginRight: 5 },
  headerPlus: { color: C.brand, fontSize: 23, lineHeight: 27, fontWeight: '500' },
  bellButton: { padding: 7 },
  bell: { color: C.ink, fontSize: 22 },
  notificationDot: { position: 'absolute', width: 8, height: 8, borderRadius: 4, right: 4, top: 4, backgroundColor: '#FF5E65' },
  content: { paddingHorizontal: 16, paddingBottom: 12 },
  welcome: { marginTop: 14, borderRadius: 22, padding: 18, backgroundColor: C.brand },
  welcomeTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  welcomeSubtitle: { color: '#E2E1FF', fontSize: 12, marginTop: 5 },
  notice: { marginTop: 15, borderRadius: 12, backgroundColor: '#FFFFFF26', padding: 11, flexDirection: 'row', alignItems: 'center' },
  noticeIcon: { fontSize: 14, marginRight: 8 },
  noticeText: { flex: 1, color: '#FFFFFF', fontSize: 11 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginTop: 12, shadowColor: '#253458', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: C.ink, fontWeight: '800', fontSize: 13 },
  link: { color: C.muted, fontSize: 11 },
  scheduleRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 10 },
  scheduleTime: { color: C.muted, fontSize: 11, width: 48, paddingTop: 2 },
  scheduleLine: { width: 3, borderRadius: 2 },
  scheduleCopy: { marginLeft: 10 },
  scheduleTitle: { color: C.ink, fontSize: 12, fontWeight: '700' },
  scheduleDetail: { color: C.muted, fontSize: 10, marginTop: 3 },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 13 },
  progressCircle: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#5E7BFF', borderWidth: 6, borderColor: '#E8EBF5', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  progressText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  progressTitle: { color: C.ink, fontSize: 12, fontWeight: '700' },
  progressDetail: { color: C.muted, fontSize: 10, marginTop: 4 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: '#EDF0F7', marginTop: 13 },
  progressFill: { width: '33%', height: 6, borderRadius: 3, backgroundColor: C.green },
  sectionTitle: { color: C.ink, fontSize: 18, fontWeight: '800' },
  taskCard: { backgroundColor: '#FFFFFF', borderRadius: 17, padding: 14, marginTop: 9, flexDirection: 'row', alignItems: 'center', elevation: 1 },
  taskAccent: { width: 4, height: 48, borderRadius: 2 },
  taskCopy: { flex: 1, marginLeft: 11, marginRight: 8 },
  taskTitle: { color: C.ink, fontSize: 13, fontWeight: '800' },
  taskDetail: { color: C.muted, fontSize: 10, marginTop: 4 },
  taskDue: { fontSize: 10, fontWeight: '700', marginTop: 7 },
  taskTag: { color: C.brand, backgroundColor: '#EEF0FF', overflow: 'hidden', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, fontSize: 9, fontWeight: '700' },
  bottomBar: { minHeight: 66, backgroundColor: '#FFFFFF', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line, paddingBottom: 4 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navIconWrap: { width: 34, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  navIconActive: { backgroundColor: '#EEEEFF' },
  navIcon: { color: '#A6AEC0', fontSize: 19, fontWeight: '700' },
  navIconSelected: { color: C.brand },
  navLabel: { color: '#A6AEC0', fontSize: 9, marginTop: 1 },
  navLabelActive: { color: C.brand, fontWeight: '700' },
  screenTitle: { color: C.ink, fontSize: 23, fontWeight: '900', marginTop: 18 },
  screenSubtitle: { color: C.muted, fontSize: 12, marginTop: 5, marginBottom: 8 },
  filterRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, marginBottom: 4 },
  filterChip: { backgroundColor: '#FFFFFF', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 },
  filterChipActive: { backgroundColor: C.ink },
  filterText: { color: C.muted, fontSize: 11, fontWeight: '700' },
  filterTextActive: { color: '#FFFFFF' },
  taskStatusButton: { alignSelf: 'center' },
  estimateLabel: { color: C.muted, fontSize: 9, marginTop: 4 },
  doneTag: { color: C.green, backgroundColor: '#E9F9F0' },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 20, alignItems: 'center', marginTop: 12 },
  emptyTitle: { color: C.ink, fontWeight: '800', fontSize: 14 },
  emptyText: { color: C.muted, fontSize: 11, marginTop: 6, textAlign: 'center' },
  primaryButton: { backgroundColor: C.brand, borderRadius: 14, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 14, paddingHorizontal: 16 },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  secondaryButton: { backgroundColor: '#FFFFFF', borderRadius: 14, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  secondaryButtonText: { color: C.ink, fontWeight: '700', fontSize: 13 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCell: { width: 38, height: 66, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dayCellSelected: { backgroundColor: C.brand },
  dayName: { color: C.muted, fontSize: 10 },
  dayNumber: { color: C.ink, fontSize: 13, fontWeight: '800', marginTop: 6 },
  daySelectedText: { color: '#FFFFFF' },
  dayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.brand, marginTop: 4 },
  dayDotSelected: { backgroundColor: '#FFFFFF' },
  input: { borderWidth: 1, borderColor: '#E2E6F0', borderRadius: 13, paddingHorizontal: 13, paddingVertical: 12, color: C.ink, fontSize: 13, marginTop: 12, backgroundColor: '#FFFFFF' },
  multilineInput: { minHeight: 78, textAlignVertical: 'top' },
  helperText: { color: C.muted, fontSize: 10, marginTop: 10, lineHeight: 15 },
  aiPromptInput: { minHeight: 132 },
  disabledButton: { opacity: 0.6 },
  errorBox: { marginTop: 12, borderRadius: 12, padding: 12, backgroundColor: '#FFF0F0' },
  errorText: { color: '#C83D45', fontSize: 11, lineHeight: 16 },
  fallbackNotice: { color: '#9B6714', backgroundColor: '#FFF6DF', borderRadius: 10, padding: 10, fontSize: 10, lineHeight: 15, marginTop: 10 },
  suggestionCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginTop: 9, elevation: 1 },
  suggestionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  categoryChip: { color: C.brand, backgroundColor: '#EEF0FF', borderRadius: 8, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 5, fontSize: 9, fontWeight: '700' },
  suggestionMeta: { color: C.muted, fontSize: 10, marginTop: 9, fontWeight: '600' },
  profileCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, marginTop: 14, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#E8E9FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: C.brand, fontSize: 20, fontWeight: '900' },
  profileName: { color: C.ink, fontSize: 15, fontWeight: '800' },
  profileRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 17 },
  profileValue: { color: C.brand, fontSize: 12, fontWeight: '700' },
  fieldLabel: { color: C.ink, fontWeight: '700', fontSize: 12, marginTop: 17 },
  modalScrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#11182A77' },
  modalSheet: { backgroundColor: C.page, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28 },
  modalHandle: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, backgroundColor: '#D6DAE5', marginBottom: 16 },
  datePickerCard: { marginHorizontal: 22, borderRadius: 22, padding: 18, backgroundColor: '#FFFFFF' },
  dueDateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  dueDateOption: { minWidth: '28%', flexGrow: 1, borderRadius: 12, backgroundColor: '#F2F3FF', paddingVertical: 12, alignItems: 'center' },
  dueDateOptionText: { color: C.brand, fontWeight: '700', fontSize: 11 },
  clearDueButton: { alignSelf: 'center', padding: 12, marginTop: 6 },
});
