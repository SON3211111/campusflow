@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package com.campusflow.mobile.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
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
                    "notifications" -> {
                        SectionTitle("알림", "최근 알림부터 표시합니다")
                        if (state.notices.isEmpty()) EmptyCard("새로운 소식이 없어요", "팀의 업무 소식을 여기서 확인할 수 있어요.")
                        state.notices.sortedByDescending { it.createdAt }.forEach { notice ->
                            OutlinedCard(onClick = { if (!notice.read) vm.readNotice(notice) }, enabled = !state.busy, modifier = Modifier.fillMaxWidth()) {
                                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Text(noticeMessage(notice.message), fontWeight = if (notice.read) FontWeight.Normal else FontWeight.Bold)
                                    Text("${notice.createdAt?.replace('T', ' ')?.take(16).orEmpty()} · ${if (notice.read) "읽음" else "눌러서 읽음 처리"}", style = MaterialTheme.typography.labelSmall)
                                }
                            }
                        }
                    }
                    else -> state.tasks.find { it.taskId == taskId }?.let { task ->
                        SectionTitle(task.title, "${task.assigneeName ?: "담당자 미정"} · ${task.dueDate?.take(10) ?: "마감일 없음"}")
                        Text(task.description?.ifBlank { "업무 설명이 없습니다." } ?: "업무 설명이 없습니다.")
                        Text("업무 상태", fontWeight = FontWeight.Bold)
                        TaskStatus.entries.forEach { status ->
                            OutlinedButton({ vm.changeStatus(task, status) }, enabled = !state.busy && task.status != status.name, modifier = Modifier.fillMaxWidth()) {
                                Text((if (task.status == status.name) "✓  " else "") + status.label)
                            }
                        }
                    }
                }
            }
        }
    }
}

private fun noticeMessage(raw: String): String = if (raw.trim().startsWith("{")) runCatching {
    val value = com.google.gson.JsonParser.parseString(raw).asJsonObject
    if (value["type"]?.asString == "JOIN_REQUEST") "${value["requesterName"]?.asString ?: "사용자"}님이 ${value["workspaceName"]?.asString ?: "워크스페이스"} 참여를 요청했어요. 웹에서 요청을 확인해 주세요."
    else value["message"]?.asString ?: "새로운 워크스페이스 소식이 있습니다. 웹에서 확인해 주세요."
}.getOrDefault("새로운 워크스페이스 소식이 있습니다.") else raw
