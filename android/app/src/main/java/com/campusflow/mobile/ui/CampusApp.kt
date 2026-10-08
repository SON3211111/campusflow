@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class, androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
package com.campusflow.mobile.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.repeatOnLifecycle
import com.campusflow.mobile.AppState
import com.campusflow.mobile.AppViewModel
import com.campusflow.mobile.data.*
import kotlinx.coroutines.delay

private enum class Tab(val label: String, val icon: ImageVector) {
    HOME("홈", Icons.Outlined.Home), CALENDAR("시간표", Icons.Outlined.CalendarMonth),
    AI("AI", Icons.Outlined.AutoAwesome), WORKSPACE("워크스페이스", Icons.Outlined.Dashboard),
    PROFILE("마이페이지", Icons.Outlined.Person)
}

@Composable
fun CampusApp(vm: AppViewModel) {
    val state by vm.state.collectAsStateWithLifecycle()
    var tab by rememberSaveable { mutableStateOf(Tab.HOME) }
    var sheet by rememberSaveable { mutableStateOf<String?>(null) }
    var taskId by rememberSaveable { mutableStateOf<String?>(null) }
    val snackbar = remember { SnackbarHostState() }
    val lifecycle = LocalLifecycleOwner.current
    LaunchedEffect(state.message) { state.message?.let { snackbar.showSnackbar(it); vm.dismissMessage() } }
    LaunchedEffect(taskId) { taskId?.let(vm::loadTaskDetails) }
    LaunchedEffect(state.session?.userId) {
        tab = Tab.HOME; sheet = null; taskId = null
        if (state.session != null) lifecycle.lifecycle.repeatOnLifecycle(Lifecycle.State.STARTED) {
            while (true) { vm.refresh(silent = true); delay(30_000) }
        }
    }
    BackHandler(sheet != null || taskId != null || tab != Tab.HOME) {
        if (sheet != null || taskId != null) { sheet = null; taskId = null } else tab = Tab.HOME
    }
    Scaffold(
        snackbarHost = { SnackbarHost(snackbar) },
        topBar = {
            if (state.session != null) TopAppBar(title = {
                Column { Text("campusflow", fontWeight = FontWeight.ExtraBold)
                    if (state.demo) Text("데모 · 기기에 임시 저장", style = MaterialTheme.typography.labelSmall) }
            }, actions = {
                IconButton({ vm.refresh() }, enabled = !state.busy && !state.refreshing) { Icon(Icons.Outlined.Refresh, "새로고침") }
                IconButton({ sheet = "notifications" }) { BadgedBox(badge = { if (state.notices.any { !it.read }) Badge() }) { Icon(Icons.Outlined.Notifications, "알림") } }
            })
        },
        bottomBar = {
            if (state.session != null) NavigationBar {
                Tab.entries.forEach { item -> NavigationBarItem(selected = tab == item, onClick = { tab = item },
                    icon = { Icon(item.icon, item.label) }, label = { Text(item.label, maxLines = 1, style = MaterialTheme.typography.labelSmall) }) }
            }
        },
    ) { insets ->
        Column(Modifier.fillMaxSize().padding(insets)) {
            if (state.busy || state.refreshing) LinearProgressIndicator(Modifier.fillMaxWidth())
            if (state.session == null) LoginScreen(state, vm)
            else when (tab) {
                Tab.HOME -> HomeScreen(state, onTask = { taskId = it.taskId }, onBoard = { tab = Tab.WORKSPACE }, onAi = { tab = Tab.AI })
                Tab.CALENDAR -> CalendarScreen(state, onAdd = { sheet = "schedule" }, onDelete = vm::deleteSchedule, onTask = { taskId = it.taskId })
                Tab.AI -> AiScreen(state, vm, onWorkspace = { sheet = "workspaces" })
                Tab.WORKSPACE -> WorkspaceScreen(state, onSwitch = { sheet = "workspaces" }, onAdd = { sheet = "task" }, onMembers = { sheet = "members" }, onTask = { taskId = it.taskId })
                Tab.PROFILE -> ProfileScreen(state, onEdit = { sheet = "profile" }, onLogout = vm::logout)
            }
        }
    }
    if (sheet != null || taskId != null) {
        ModalBottomSheet(onDismissRequest = { sheet = null; taskId = null }, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
            Column(Modifier.fillMaxWidth().imePadding().verticalScroll(rememberScrollState()).padding(horizontal = 24.dp).padding(bottom = 32.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                val dismiss = { sheet = null; taskId = null }
                if (state.busy) LinearProgressIndicator(Modifier.fillMaxWidth())
                state.message?.let { Text(it, color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.bodyMedium) }
                when (sheet) {
                    "workspaces" -> {
                        SectionTitle("워크스페이스")
                        state.workspaces.forEach { workspace ->
                            OutlinedButton({ vm.selectWorkspace(workspace.workspaceId); dismiss() }, enabled = !state.busy, modifier = Modifier.fillMaxWidth()) {
                                Text((if (workspace.workspaceId == state.workspaceId) "✓  " else "") + workspace.name)
                            }
                        }
                        WorkspaceForm(state.busy) { name -> vm.createWorkspace(name, dismiss) }
                    }
                    "members" -> {
                        SectionTitle("함께하는 팀원", "${state.members.size}명 · 관리자/멤버 구분")
                        state.members.forEach { member -> ListItem(headlineContent = { Text(member.name) }, supportingContent = { Text(member.email.orEmpty()) }, trailingContent = { Text(if (member.role == "OWNER") "관리자" else "멤버") }) }
                        if (state.members.isEmpty()) Text("등록된 팀원이 없습니다.")
                    }
                    "task" -> TaskForm(state.busy, state.members, state.session!!.userId) { input -> vm.createTask(input, dismiss) }
                    "schedule" -> ScheduleForm(state.busy) { title, day, start, end, category -> vm.addSchedule(title, day, start, end, category, dismiss) }
                    "profile" -> NameForm(state.profile?.name ?: state.session!!.name, state.busy) { vm.updateName(it, dismiss) }
                    "notifications" -> NotificationCenterSheet(
                        state = state,
                        onRead = vm::readNotice,
                        onReadAll = vm::readAllNotices,
                        onOpenTask = { notice ->
                            if (!notice.read) vm.readNotice(notice)
                            notice.taskId?.let { taskId = it; sheet = null }
                        },
                    )
                    else -> state.tasks.find { it.taskId == taskId }?.let { task ->
                        TaskDetailSheet(
                            state = state,
                            task = task,
                            comments = state.taskComments[task.taskId].orEmpty(),
                            attachments = state.taskAttachments[task.taskId].orEmpty(),
                            onStatus = { vm.changeStatus(task, it) },
                            onDescription = { vm.saveTaskDescription(task, it) },
                            onStartDate = { vm.saveTaskStartDate(task, it) },
                            onDueDate = { vm.saveTaskDueDate(task, it) },
                            onAssignee = { vm.changeAssignee(task, it) },
                            onSignal = { vm.sendQuickSignal(task, it) },
                            onComment = { vm.addTaskComment(task, it) },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun TaskDetailSheet(
    state: AppState,
    task: Task,
    comments: List<Comment>,
    attachments: List<Attachment>,
    onStatus: (TaskStatus) -> Unit,
    onDescription: (String) -> Unit,
    onStartDate: (String) -> Unit,
    onDueDate: (String) -> Unit,
    onAssignee: (String?) -> Unit,
    onSignal: (String?) -> Unit,
    onComment: (String) -> Unit,
) {
    var description by rememberSaveable(task.taskId, task.description) { mutableStateOf(task.description.orEmpty()) }
    var startDate by rememberSaveable(task.taskId, task.startDate) { mutableStateOf(task.startDate?.take(10).orEmpty()) }
    var dueDate by rememberSaveable(task.taskId, task.dueDate) { mutableStateOf(task.dueDate?.take(10).orEmpty()) }
    var comment by rememberSaveable(task.taskId) { mutableStateOf("") }

    SectionTitle(task.title, "${task.assigneeName ?: "담당자 미정"} · ${task.dueDate?.take(10) ?: "마감일 없음"}")

    Text("업무 상태", fontWeight = FontWeight.Bold)
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        TaskStatus.entries.forEach { status ->
            FilterChip(
                selected = task.effectiveStatus == status.name,
                onClick = { onStatus(status) },
                label = { Text(status.label) },
                enabled = !state.busy,
            )
        }
    }

    Text("설명", fontWeight = FontWeight.Bold)
    OutlinedTextField(
        value = description,
        onValueChange = { description = it },
        placeholder = { Text("자세한 설명을 추가하세요.") },
        minLines = 3,
        enabled = !state.busy,
        modifier = Modifier.fillMaxWidth(),
    )
    OutlinedButton({ onDescription(description) }, enabled = !state.busy, modifier = Modifier.fillMaxWidth()) { Text("설명 저장") }

    Text("일정", fontWeight = FontWeight.Bold)
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        OutlinedTextField(
            value = startDate,
            onValueChange = { startDate = it },
            label = { Text("시작일") },
            placeholder = { Text("2026-10-08") },
            isError = startDate.isNotBlank() && !Validation.date(startDate),
            enabled = !state.busy,
            singleLine = true,
            modifier = Modifier.weight(1f),
        )
        OutlinedTextField(
            value = dueDate,
            onValueChange = { dueDate = it },
            label = { Text("마감일") },
            placeholder = { Text("2026-10-15") },
            isError = dueDate.isNotBlank() && !Validation.date(dueDate),
            enabled = !state.busy,
            singleLine = true,
            modifier = Modifier.weight(1f),
        )
    }
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        OutlinedButton({ onStartDate(startDate) }, enabled = !state.busy && (startDate.isBlank() || Validation.date(startDate)), modifier = Modifier.weight(1f)) { Text("시작일 저장") }
        OutlinedButton({ onDueDate(dueDate) }, enabled = !state.busy && dueDate.isNotBlank() && Validation.date(dueDate), modifier = Modifier.weight(1f)) { Text("마감일 저장") }
    }

    Text("담당자", fontWeight = FontWeight.Bold)
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        FilterChip(selected = task.assigneeId == null, onClick = { onAssignee(null) }, label = { Text("미배정") }, enabled = !state.busy)
        state.members.forEach { member ->
            FilterChip(selected = task.assigneeId == member.userId, onClick = { onAssignee(member.userId) }, label = { Text(member.name) }, enabled = !state.busy)
        }
    }

    Text("요청", fontWeight = FontWeight.Bold)
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        FilterChip(
            selected = task.quickSignal == "HELP_NEEDED",
            onClick = { onSignal(if (task.quickSignal == "HELP_NEEDED") null else "HELP_NEEDED") },
            label = { Text("도움 요청") },
            enabled = !state.busy,
        )
        FilterChip(
            selected = task.quickSignal == "FEEDBACK_NEEDED",
            onClick = { onSignal(if (task.quickSignal == "FEEDBACK_NEEDED") null else "FEEDBACK_NEEDED") },
            label = { Text("피드백 요청") },
            enabled = !state.busy,
        )
    }

    Text("첨부파일", fontWeight = FontWeight.Bold)
    if (attachments.isEmpty()) {
        Text("첨부파일이 없습니다. 모바일 업로드는 다음 단계에서 지원할 예정입니다.", color = MaterialTheme.colorScheme.onSurfaceVariant)
    } else {
        attachments.forEach { file ->
            ListItem(
                headlineContent = { Text(file.originalName) },
                supportingContent = { Text("${formatFileSize(file.fileSize)} · ${file.uploaderName ?: "업로더 미상"}") },
                leadingContent = { Icon(Icons.Outlined.AttachFile, null) },
            )
        }
        Text("다운로드와 업로드는 현재 웹에서 이용해 주세요.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }

    Text("댓글", fontWeight = FontWeight.Bold)
    OutlinedTextField(
        value = comment,
        onValueChange = { comment = it },
        placeholder = { Text("댓글 작성...") },
        enabled = !state.busy,
        modifier = Modifier.fillMaxWidth(),
    )
    OutlinedButton(
        onClick = { val text = comment; comment = ""; onComment(text) },
        enabled = !state.busy && comment.isNotBlank(),
        modifier = Modifier.fillMaxWidth(),
    ) { Text("댓글 등록") }
    if (comments.isEmpty()) {
        Text("아직 댓글이 없습니다.", color = MaterialTheme.colorScheme.onSurfaceVariant)
    } else {
        comments.sortedByDescending { it.createdAt.orEmpty() }.forEach { item ->
            ListItem(
                headlineContent = { Text(item.senderName ?: "사용자") },
                supportingContent = { Text(item.content) },
                trailingContent = { Text(item.createdAt?.replace('T', ' ')?.take(16).orEmpty(), style = MaterialTheme.typography.labelSmall) },
            )
        }
    }
}

private fun formatFileSize(bytes: Long): String = when {
    bytes < 1024 -> "${bytes}B"
    bytes < 1024 * 1024 -> "${bytes / 1024}KB"
    else -> "${bytes / (1024 * 1024)}MB"
}

@Composable
private fun NotificationCenterSheet(
    state: AppState,
    onRead: (Notice) -> Unit,
    onReadAll: () -> Unit,
    onOpenTask: (Notice) -> Unit,
) {
    var filter by rememberSaveable { mutableStateOf("ALL") }
    val validTypes = setOf("STATUS_CHANGE", "DUE_DATE", "BOTTLENECK", "QUICK_SIGNAL", "QUICK_SIGNAL_SENT", "COMMENT", "MENTION")
    val notices = state.notices.filter { it.type in validTypes || it.type == "INFO" }.sortedByDescending { it.createdAt.orEmpty() }
    val unread = notices.count { !it.read }
    val bottlenecks = notices.count { it.type == "BOTTLENECK" }
    val dueDates = notices.count { it.type == "DUE_DATE" }
    val requests = notices.count { it.type in setOf("QUICK_SIGNAL", "QUICK_SIGNAL_SENT", "COMMENT", "MENTION") }
    val filtered = notices.filter { notice ->
        when (filter) {
            "UNREAD" -> !notice.read
            "BOTTLENECK" -> notice.type == "BOTTLENECK"
            "TASK" -> notice.type in setOf("STATUS_CHANGE", "DUE_DATE", "BOTTLENECK")
            "REQUEST" -> notice.type in setOf("QUICK_SIGNAL", "QUICK_SIGNAL_SENT", "COMMENT", "MENTION")
            else -> true
        }
    }

    SectionTitle("알림 센터", "팀 프로젝트에서 놓치면 안 되는 소식을 확인하세요")
    Surface(
        color = MaterialTheme.colorScheme.primaryContainer,
        shape = androidx.compose.foundation.shape.RoundedCornerShape(22.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(Modifier.padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Outlined.Notifications, null, tint = MaterialTheme.colorScheme.primary)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text("미읽음", style = MaterialTheme.typography.labelMedium)
                Text("${unread}개", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.ExtraBold)
            }
            OutlinedButton(onReadAll, enabled = !state.busy && unread > 0) {
                Icon(Icons.Outlined.DoneAll, null)
                Spacer(Modifier.width(6.dp))
                Text("모두 읽음")
            }
        }
    }

    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
        NotificationMetric("병목", bottlenecks, Icons.Outlined.WarningAmber, Modifier.weight(1f))
        NotificationMetric("마감", dueDates, Icons.Outlined.Event, Modifier.weight(1f))
        NotificationMetric("요청", requests, Icons.Outlined.HelpOutline, Modifier.weight(1f))
    }

    Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        listOf(
            "ALL" to "전체",
            "UNREAD" to "미읽음",
            "BOTTLENECK" to "병목",
            "TASK" to "업무",
            "REQUEST" to "요청",
        ).forEach { (key, label) ->
            FilterChip(selected = filter == key, onClick = { filter = key }, label = { Text(label) })
        }
    }

    if (filtered.isEmpty()) {
        EmptyCard("표시할 알림이 없어요", "필터를 바꾸거나 새 알림을 기다려 주세요.")
    } else {
        filtered.forEach { notice ->
            NotificationItem(
                notice = notice,
                onRead = { onRead(notice) },
                onOpenTask = { onOpenTask(notice) },
            )
        }
    }
}

@Composable
private fun NotificationMetric(label: String, count: Int, icon: ImageVector, modifier: Modifier = Modifier) {
    OutlinedCard(modifier = modifier) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Icon(icon, null, tint = MaterialTheme.colorScheme.primary)
            Text("$count", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun NotificationItem(notice: Notice, onRead: () -> Unit, onOpenTask: () -> Unit) {
    val color = when (notice.type) {
        "BOTTLENECK" -> MaterialTheme.colorScheme.error
        "DUE_DATE" -> MaterialTheme.colorScheme.tertiary
        "QUICK_SIGNAL", "QUICK_SIGNAL_SENT" -> MaterialTheme.colorScheme.secondary
        else -> MaterialTheme.colorScheme.primary
    }
    val icon = when (notice.type) {
        "BOTTLENECK" -> Icons.Outlined.WarningAmber
        "DUE_DATE" -> Icons.Outlined.Event
        "QUICK_SIGNAL", "QUICK_SIGNAL_SENT" -> Icons.Outlined.HelpOutline
        "COMMENT" -> Icons.Outlined.ChatBubbleOutline
        "MENTION" -> Icons.Outlined.AlternateEmail
        else -> Icons.Outlined.Notifications
    }
    OutlinedCard(
        onClick = { if (notice.taskId != null) onOpenTask() else if (!notice.read) onRead() },
        modifier = Modifier.fillMaxWidth(),
        enabled = true,
        colors = CardDefaults.outlinedCardColors(containerColor = if (notice.read) MaterialTheme.colorScheme.surface else MaterialTheme.colorScheme.primary.copy(alpha = 0.05f)),
    ) {
        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            Surface(color = color.copy(alpha = 0.12f), shape = androidx.compose.foundation.shape.CircleShape) {
                Icon(icon, null, Modifier.padding(10.dp).size(20.dp), tint = color)
            }
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(notificationTypeLabel(notice), fontWeight = FontWeight.Bold)
                    if (!notice.read) {
                        Spacer(Modifier.width(8.dp))
                        Badge { Text("NEW") }
                    }
                }
                Text(noticeMessage(notice.message), style = MaterialTheme.typography.bodyMedium)
                Text("${notice.createdAt?.replace('T', ' ')?.take(16).orEmpty()} · ${if (notice.taskId != null) "태스크 보기" else if (notice.read) "읽음" else "눌러서 읽음"}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            if (!notice.read) {
                TextButton(onRead) { Text("확인") }
            }
        }
    }
}

private fun notificationTypeLabel(notice: Notice): String = when (notice.type) {
    "STATUS_CHANGE" -> "상태 변경"
    "DUE_DATE" -> "마감 임박"
    "BOTTLENECK" -> "병목 감지"
    "QUICK_SIGNAL" -> if (notice.message.contains("피드백")) "피드백 요청" else "도움 요청"
    "QUICK_SIGNAL_SENT" -> "보낸 요청"
    "COMMENT" -> "댓글"
    "MENTION" -> "멘션"
    else -> "알림"
}

private fun noticeMessage(raw: String): String = if (raw.trim().startsWith("{")) runCatching {
    val value = com.google.gson.JsonParser.parseString(raw).asJsonObject
    if (value["type"]?.asString == "JOIN_REQUEST") "${value["requesterName"]?.asString ?: "사용자"}님이 ${value["workspaceName"]?.asString ?: "워크스페이스"} 참여를 요청했어요. 웹에서 요청을 확인해 주세요."
    else value["message"]?.asString ?: "새로운 워크스페이스 소식이 있습니다. 웹에서 확인해 주세요."
}.getOrDefault("새로운 워크스페이스 소식이 있습니다.") else raw
