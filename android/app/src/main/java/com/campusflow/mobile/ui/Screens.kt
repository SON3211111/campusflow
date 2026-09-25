@file:OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
package com.campusflow.mobile.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.campusflow.mobile.AppState
import com.campusflow.mobile.AppViewModel
import com.campusflow.mobile.data.*
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.DateTimeFormatter

@Composable
fun LoginScreen(state: AppState, vm: AppViewModel) {
    var signup by rememberSaveable { mutableStateOf(false) }
    var name by rememberSaveable { mutableStateOf("") }
    var email by rememberSaveable { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var showServer by rememberSaveable { mutableStateOf(false) }
    var server by rememberSaveable(state.baseUrl) { mutableStateOf(state.baseUrl) }
    Column(Modifier.fillMaxSize().imePadding().verticalScroll(rememberScrollState()).padding(28.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Spacer(Modifier.height(24.dp))
        Surface(color = MaterialTheme.colorScheme.primary, shape = RoundedCornerShape(22.dp)) {
            Icon(Icons.Outlined.School, null, Modifier.padding(18.dp).size(36.dp), tint = MaterialTheme.colorScheme.onPrimary)
        }
        Text("함께하는 프로젝트,\n더 가볍게.", fontSize = 32.sp, lineHeight = 42.sp, fontWeight = FontWeight.ExtraBold)
        Text("CampusFlow", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
        Text(if (signup) "새 계정으로 팀 프로젝트를 시작하세요." else "웹에서 쓰던 계정으로 이어서 시작하세요.", color = MaterialTheme.colorScheme.onSurfaceVariant)
        if (signup) OutlinedTextField(name, { name = it }, label = { Text("이름") }, singleLine = true, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(email, { email = it }, label = { Text("이메일") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email), singleLine = true, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(password, { password = it }, label = { Text("비밀번호") }, visualTransformation = PasswordVisualTransformation(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password), singleLine = true, modifier = Modifier.fillMaxWidth())
        PrimaryButton(if (state.busy) "연결 중…" else if (signup) "회원가입" else "로그인", !state.busy) {
            if (signup) vm.signup(name, email, password) else vm.login(email, password)
        }
        TextButton({ signup = !signup }, modifier = Modifier.fillMaxWidth(), enabled = !state.busy) { Text(if (signup) "이미 계정이 있어요 · 로그인" else "처음이신가요? 회원가입") }
        HorizontalDivider()
        OutlinedButton(vm::enterDemo, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp), enabled = !state.busy) { Text("데모로 먼저 둘러보기") }
        TextButton({ showServer = !showServer }, modifier = Modifier.align(Alignment.CenterHorizontally), enabled = !state.busy) { Text("서버 연결 설정") }
        if (showServer) {
            OutlinedTextField(server, { server = it }, label = { Text("API 주소 (/api/ 포함)") }, supportingText = { Text("에뮬레이터: http://10.0.2.2:8080/api/\n실제 휴대폰: 같은 Wi-Fi의 PC IP 또는 HTTPS 서버") }, modifier = Modifier.fillMaxWidth())
            OutlinedButton({ vm.setBaseUrl(server) }, enabled = !state.busy) { Text("주소 저장") }
        }
    }
}

@Composable
fun HomeScreen(state: AppState, onTask: (Task) -> Unit, onBoard: () -> Unit, onAi: () -> Unit) {
    val today = LocalDate.now()
    val mine = state.myTasks.filter { it.status != "DONE" }.sortedBy { it.deadline ?: LocalDate.MAX }
    val schedules = state.schedules.filter { it.dayOfWeek == Validation.days[today.dayOfWeek.value - 1] }.sortedBy { it.startTime }
    LazyColumn(contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
        item {
            Text(today.format(DateTimeFormatter.ofPattern("M월 d일")) + " ${Validation.days[today.dayOfWeek.value - 1]}요일", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(8.dp))
            Text("${state.profile?.name ?: state.session?.name}님, 반가워요 👋", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text("오늘도 팀과 함께 한 걸음 나아가요.", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        item {
            Column(Modifier.fillMaxWidth().background(Brush.linearGradient(listOf(Color(0xFF4165EE), Color(0xFF687DF4))), RoundedCornerShape(26.dp)).padding(24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Text(state.workspace?.name ?: "첫 프로젝트를 시작해 보세요", color = Color.White.copy(alpha = .85f), style = MaterialTheme.typography.labelLarge)
                Text("오늘의 작은 완료가\n팀의 큰 진전이 되도록", color = Color.White, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Metric("${mine.size}", "남은 내 업무")
                    Metric("${state.tasks.count { it.status == "DONE" }}", "팀 완료 업무")
                    Metric("${schedules.size}", "오늘 일정")
                }
                FilledTonalButton(onBoard, colors = ButtonDefaults.filledTonalButtonColors(containerColor = Color.White, contentColor = Color(0xFF4165EE))) { Text("워크스페이스 보기  →") }
            }
        }
        item { SectionTitle("오늘의 일정", "내 반복 시간표") }
        if (schedules.isEmpty()) item { EmptyCard("오늘은 등록된 일정이 없어요", "시간표 탭에서 수업과 개인 일정을 추가하세요.") }
        items(schedules, key = { "schedule-${it.blockId}" }) { schedule ->
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                Row(Modifier.fillMaxWidth().padding(18.dp), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    Text(schedule.startTime.take(5), color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                    Column { Text(schedule.title, fontWeight = FontWeight.SemiBold); Text("${schedule.startTime.take(5)} – ${schedule.endTime.take(5)}", style = MaterialTheme.typography.bodySmall) }
                }
            }
        }
        item { SectionTitle("챙겨야 할 내 업무", state.workspace?.name ?: "워크스페이스를 선택해 주세요") }
        if (mine.isEmpty()) item { EmptyCard("남은 내 업무가 없어요", "팀 보드에서 담당 업무와 진행 상황을 확인하세요.") }
        items(mine.take(5), key = { it.taskId }) { task -> TaskCard(task) { onTask(task) } }
        item { OutlinedCard(onClick = onAi, modifier = Modifier.fillMaxWidth()) {
            Row(Modifier.padding(20.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                Icon(Icons.Outlined.AutoAwesome, null, tint = MaterialTheme.colorScheme.primary)
                Column { Text("시작이 막막할 땐 AI와 함께", fontWeight = FontWeight.Bold); Text("프로젝트 설명을 작은 업무로 나눠보세요.", style = MaterialTheme.typography.bodySmall) }
            }
        } }
    }
}

@Composable private fun Metric(value: String, label: String) {
    Column { Text(value, color = Color.White, fontSize = 28.sp, fontWeight = FontWeight.Bold); Text(label, color = Color.White.copy(alpha = .8f), style = MaterialTheme.typography.labelSmall) }
}

@Composable
fun WorkspaceScreen(state: AppState, onSwitch: () -> Unit, onAdd: () -> Unit, onMembers: () -> Unit, onTask: (Task) -> Unit) {
    var filter by rememberSaveable { mutableStateOf("ALL") }
    var mine by rememberSaveable { mutableStateOf(false) }
    val tasks = state.tasks.filter { (!mine || it.assigneeId == state.session?.userId) && (filter == "ALL" || it.status == filter) }
    LazyColumn(contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item { SectionTitle("워크스페이스", "팀의 진행 상황을 한곳에서", action = { IconButton(onSwitch) { Icon(Icons.Outlined.SwapHoriz, "워크스페이스 선택 또는 생성") } }) }
        item { OutlinedButton(onSwitch, modifier = Modifier.fillMaxWidth(), enabled = !state.busy) { Text(state.workspace?.name ?: "워크스페이스 만들기") } }
        if (state.workspace != null) {
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    TextButton(onMembers) { Icon(Icons.Outlined.Group, null); Spacer(Modifier.width(6.dp)); Text("팀원 ${state.members.size}명") }
                    Text("완료 ${state.tasks.count { it.status == "DONE" }} / ${state.tasks.size}", style = MaterialTheme.typography.labelLarge)
                }
                LinearProgressIndicator(progress = { if (state.tasks.isEmpty()) 0f else state.tasks.count { it.status == "DONE" }.toFloat() / state.tasks.size }, modifier = Modifier.fillMaxWidth())
            }
            item {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    FilterChip(mine, { mine = !mine }, label = { Text("내 업무만") })
                    Spacer(Modifier.weight(1f))
                    FilledTonalButton(onAdd, enabled = !state.busy) { Icon(Icons.Outlined.Add, null); Text("업무 추가") }
                }
                Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(filter == "ALL", { filter = "ALL" }, label = { Text("전체") })
                    TaskStatus.entries.forEach { status -> FilterChip(filter == status.name, { filter = status.name }, label = { Text("${status.label} ${state.tasks.count { it.status == status.name }}") }) }
                }
            }
            if (tasks.isEmpty()) item { EmptyCard("표시할 업무가 없어요", "업무를 추가하거나 필터를 바꿔보세요.") }
            items(tasks, key = { it.taskId }) { task -> TaskCard(task) { onTask(task) } }
        } else item { EmptyCard("팀의 첫 공간을 만들어 보세요", "위 버튼으로 워크스페이스를 만든 후 업무와 AI 결과를 공유하세요.") }
    }
}

@Composable
fun CalendarScreen(state: AppState, onAdd: () -> Unit, onDelete: (String) -> Unit, onTask: (Task) -> Unit) {
    var selected by rememberSaveable { mutableStateOf(LocalDate.now().toString()) }
    var monthly by rememberSaveable { mutableStateOf(false) }
    var deleting by remember { mutableStateOf<Schedule?>(null) }
    val date = LocalDate.parse(selected)
    val month = YearMonth.from(date)
    val start = if (monthly) month.atDay(1).minusDays((month.atDay(1).dayOfWeek.value - 1).toLong()) else date.minusDays((date.dayOfWeek.value - 1).toLong())
    val dates = (0 until if (monthly) 42 else 7).map { start.plusDays(it.toLong()) }
    val schedules = state.schedules.filter { it.dayOfWeek == Validation.days[date.dayOfWeek.value - 1] }.sortedBy { it.startTime }
    val deadlines = state.tasks.filter { it.deadline == date }
    LazyColumn(contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        item { SectionTitle("시간표 & 캘린더", "내 반복 일정과 선택한 팀의 업무 마감일", action = { IconButton(onAdd, enabled = !state.busy) { Icon(Icons.Outlined.Add, "일정 등록") } }) }
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("${date.year}년 ${date.monthValue}월", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                FilterChip(!monthly, { monthly = false }, label = { Text("주간") }); Spacer(Modifier.width(8.dp)); FilterChip(monthly, { monthly = true }, label = { Text("월간") })
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                IconButton({ selected = (if (monthly) date.minusMonths(1) else date.minusWeeks(1)).toString() }) { Icon(Icons.Outlined.ChevronLeft, "이전 기간") }
                TextButton({ selected = LocalDate.now().toString() }) { Text("오늘") }
                IconButton({ selected = (if (monthly) date.plusMonths(1) else date.plusWeeks(1)).toString() }) { Icon(Icons.Outlined.ChevronRight, "다음 기간") }
            }
            Row { Validation.days.forEach { Text(it, Modifier.weight(1f), textAlign = TextAlign.Center, color = MaterialTheme.colorScheme.onSurfaceVariant) } }
            dates.chunked(7).forEach { week ->
                Row {
                    week.forEach { day ->
                        val active = day == date
                        Column(Modifier.weight(1f).heightIn(min = 52.dp).background(if (active) MaterialTheme.colorScheme.primary else Color.Transparent, RoundedCornerShape(12.dp)).clickable { selected = day.toString() }.padding(vertical = 8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("${day.dayOfMonth}", color = if (active) MaterialTheme.colorScheme.onPrimary else if (monthly && day.month != date.month) MaterialTheme.colorScheme.outline else MaterialTheme.colorScheme.onSurface)
                            val hasData = state.tasks.any { it.deadline == day } || state.schedules.any { it.dayOfWeek == Validation.days[day.dayOfWeek.value - 1] }
                            Text(if (hasData) "•" else " ", fontSize = 10.sp, color = if (active) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.primary)
                        }
                    }
                }
            }
        }
        item { SectionTitle("${date.monthValue}월 ${date.dayOfMonth}일", "${Validation.days[date.dayOfWeek.value - 1]}요일 · ${schedules.size}개 반복 일정 / ${deadlines.size}개 마감") }
        if (schedules.isEmpty() && deadlines.isEmpty()) item { EmptyCard("등록된 일정이 없어요", "+ 버튼으로 매주 반복하는 수업 또는 개인 일정을 추가하세요.") }
        items(schedules, key = { it.blockId }) { schedule ->
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("${schedule.startTime.take(5)} – ${schedule.endTime.take(5)}", color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.labelLarge)
                        Text(schedule.title, fontWeight = FontWeight.SemiBold)
                        Text("매주 ${schedule.dayOfWeek}요일", style = MaterialTheme.typography.bodySmall)
                    }
                    IconButton({ deleting = schedule }, enabled = !state.busy) { Icon(Icons.Outlined.DeleteOutline, "${schedule.title} 일정 삭제") }
                }
            }
        }
        items(deadlines, key = { it.taskId }) { task -> TaskCard(task) { onTask(task) } }
    }
    deleting?.let { schedule -> AlertDialog(onDismissRequest = { deleting = null }, title = { Text("반복 일정을 삭제할까요?") }, text = { Text("${schedule.title} 일정이 모든 주의 시간표에서 삭제됩니다.") }, confirmButton = { TextButton({ onDelete(schedule.blockId); deleting = null }) { Text("삭제") } }, dismissButton = { TextButton({ deleting = null }) { Text("취소") } }) }
}

@Composable
fun AiScreen(state: AppState, vm: AppViewModel, onWorkspace: () -> Unit) {
    var regenerate by remember { mutableStateOf(false) }
    val focusManager = LocalFocusManager.current
    LazyColumn(contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp), modifier = Modifier.imePadding()) {
        item { SectionTitle("큰 아이디어를, 작은 업무로", "AI 업무 분해") }
        item { OutlinedTextField(state.prompt, vm::setPrompt, label = { Text("어떤 프로젝트를 만들고 있나요?") }, placeholder = { Text("예: 대학생 팀 프로젝트 협업 앱을 만듭니다. 로그인, 시간표, 업무 보드와 알림 기능이 필요합니다.") }, supportingText = { Text("목표와 주요 기능을 20~4,000자로 입력하세요. ${state.prompt.length}/4000") }, minLines = 5, enabled = !state.busy, modifier = Modifier.fillMaxWidth()) }
        item { PrimaryButton(if (state.busy) "처리 중… 잠시 기다려 주세요" else "AI로 업무 나누기", !state.busy && Validation.description(state.prompt)) {
            focusManager.clearFocus()
            if (state.drafts.isNotEmpty()) regenerate = true else vm.generate()
        } }
        if (state.drafts.isNotEmpty()) {
            item { SectionTitle("결과 확인 & 선택", "제목을 수정하고 팀에 공유할 업무를 선택하세요.") }
            if (state.aiFallback) item { Text(if (state.demo) "데모용 예시 업무입니다." else "AI 서버 대신 서버의 기본 템플릿으로 생성되었습니다.", color = MaterialTheme.colorScheme.secondary) }
            items(state.drafts, key = { it.id }) { draft ->
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Checkbox(draft.selected, { vm.toggleDraft(draft.id) }, enabled = !state.busy)
                            Text("${draft.task.category ?: "업무"} · ${draft.task.estimatedHours?.let { "${it}시간" } ?: "시간 미정"}", style = MaterialTheme.typography.labelLarge)
                        }
                        OutlinedTextField(draft.task.title, { vm.editDraft(draft.id, it) }, label = { Text("업무 제목") }, enabled = !state.busy, modifier = Modifier.fillMaxWidth())
                        Text(draft.task.description.orEmpty(), style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
            item { OutlinedButton(onWorkspace, enabled = !state.busy, modifier = Modifier.fillMaxWidth()) { Text(state.workspace?.name ?: "공유할 워크스페이스 선택") } }
            item { PrimaryButton("선택한 ${state.drafts.count { it.selected }}개 업무를 팀 보드에 등록", !state.busy && state.drafts.any { it.selected } && state.workspace != null, vm::publishDrafts) }
            item { Text("등록한 업무는 같은 워크스페이스의 웹과 앱에서 볼 수 있습니다. 등록 전 결과는 현재 앱 화면에만 유지됩니다.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
        }
    }
    if (regenerate) AlertDialog(onDismissRequest = { regenerate = false }, title = { Text("업무를 다시 생성할까요?") }, text = { Text("아직 보드에 등록하지 않은 현재 결과가 새 결과로 바뀝니다.") }, confirmButton = { TextButton({ regenerate = false; vm.generate() }) { Text("다시 생성") } }, dismissButton = { TextButton({ regenerate = false }) { Text("취소") } })
}

@Composable
fun ProfileScreen(state: AppState, onEdit: () -> Unit, onLogout: () -> Unit) {
    var logout by remember { mutableStateOf(false) }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp), verticalArrangement = Arrangement.spacedBy(20.dp)) {
        SectionTitle("마이페이지", "나의 캠퍼스, 나의 흐름")
        Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(24.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
            Column(Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Icon(Icons.Outlined.AccountCircle, null, Modifier.size(60.dp), tint = MaterialTheme.colorScheme.primary)
                Text(state.profile?.name ?: state.session!!.name, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                Text(state.profile?.email.orEmpty(), color = MaterialTheme.colorScheme.onSurfaceVariant)
                OutlinedButton(onEdit, enabled = !state.busy) { Text("프로필 이름 수정") }
            }
        }
        ListItem(headlineContent = { Text("참여 중인 워크스페이스") }, trailingContent = { Text("${state.workspaces.size}개") })
        ListItem(headlineContent = { Text("선택한 팀에서 완료한 내 업무") }, trailingContent = { Text("${state.myTasks.count { it.status == "DONE" }}개") })
        if (state.demo) Text("데모에서 변경한 내용은 서버에 전송되지 않으며, 데모를 다시 시작하면 초기화됩니다.", style = MaterialTheme.typography.bodySmall)
        Text("CampusFlow for Android · 1.0.0", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        OutlinedButton({ logout = true }, Modifier.fillMaxWidth(), enabled = !state.busy) { Text(if (state.demo) "데모 종료" else "로그아웃") }
    }
    if (logout) AlertDialog(onDismissRequest = { logout = false }, title = { Text(if (state.demo) "데모를 종료할까요?" else "로그아웃할까요?") }, text = { Text("등록 전 AI 결과는 사라집니다. 서버에 저장한 업무는 유지됩니다.") }, confirmButton = { TextButton({ logout = false; onLogout() }) { Text("확인") } }, dismissButton = { TextButton({ logout = false }) { Text("취소") } })
}
