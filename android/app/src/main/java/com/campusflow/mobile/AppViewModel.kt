package com.campusflow.mobile

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.campusflow.mobile.data.*
import com.google.gson.JsonParser
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import retrofit2.HttpException
import java.io.IOException
import java.net.URLEncoder
import java.util.concurrent.TimeUnit
import java.util.UUID

data class AppState(
    val session: Session? = null, val demo: Boolean = false, val baseUrl: String = "",
    val busy: Boolean = false, val refreshing: Boolean = false, val message: String? = null,
    val workspaces: List<Workspace> = emptyList(), val workspaceId: String? = null,
    val tasks: List<Task> = emptyList(), val members: List<Member> = emptyList(),
    val schedules: List<Schedule> = emptyList(), val notices: List<Notice> = emptyList(),
    val profile: Profile? = null, val drafts: List<Draft> = emptyList(),
    val taskComments: Map<String, List<Comment>> = emptyMap(),
    val taskAttachments: Map<String, List<Attachment>> = emptyMap(),
    val aiFallback: Boolean = false, val prompt: String = "",
) {
    val workspace get() = workspaces.find { it.workspaceId == workspaceId }
    val myTasks get() = tasks.filter { it.assigneeId == session?.userId }
}

class AppViewModel(application: Application) : AndroidViewModel(application) {
    private val store = SessionStore(application)
    private val mutable = MutableStateFlow(AppState(session = store.load(), baseUrl = store.baseUrl))
    val state = mutable.asStateFlow()
    private var demoData = DemoData()
    private var epoch = 0
    private var operation: Job? = null
    private var refreshJob: Job? = null
    private var api = newApi()
    private val socketClient = OkHttpClient.Builder().readTimeout(0, TimeUnit.MILLISECONDS).build()
    private var taskSocket: WebSocket? = null
    private var taskSocketWorkspaceId: String? = null
    private var socketReconnectJob: Job? = null
    private fun newApi() = CampusApi.create(mutable.value.baseUrl) { mutable.value.session?.takeUnless { mutable.value.demo }?.accessToken }

    init { if (state.value.session != null) refresh() }

    fun dismissMessage() { mutable.update { it.copy(message = null) } }
    fun notify(message: String) { mutable.update { it.copy(message = message) } }
    fun setPrompt(value: String) { mutable.update { it.copy(prompt = value) } }
    fun setBaseUrl(value: String) {
        runCatching { Validation.baseUrl(value, BuildConfig.DEBUG) }
            .onSuccess { url -> store.baseUrl = url; mutable.update { it.copy(baseUrl = url) }; api = newApi(); closeTaskSocket(); notify("서버 주소를 저장했습니다.") }
            .onFailure { notify(it.message ?: "주소를 확인하세요.") }
    }

    private fun execute(block: suspend () -> Unit) {
        if (state.value.busy) return
        refreshJob?.cancel()
        mutable.update { it.copy(busy = true, refreshing = false, message = null) }
        val generation = epoch
        operation = viewModelScope.launch {
            try { block() }
            catch (e: CancellationException) { throw e }
            catch (e: Exception) { if (generation == epoch) handleError(e) }
            finally { if (generation == epoch) mutable.update { it.copy(busy = false) } }
        }
    }

    private fun handleError(e: Exception) {
        if (e is HttpException && e.code() == 401 && state.value.session != null) {
            logout(); notify("로그인이 만료되었습니다. 다시 로그인하세요."); return
        }
        val detail = if (e is HttpException) runCatching {
            JsonParser.parseString(e.response()?.errorBody()?.string()).asJsonObject["message"].asString
        }.getOrNull() else null
        notify(detail ?: when (e) {
            is IOException -> "서버에 연결하지 못했습니다. 서버 주소와 네트워크를 확인한 뒤 다시 시도하세요."
            else -> e.message ?: "요청을 처리하지 못했습니다. 다시 시도하세요."
        })
    }

    fun login(email: String, password: String) {
        if (!Validation.email(email) || password.isBlank()) { notify("이메일과 비밀번호를 확인하세요."); return }
        execute {
            val session = api.login(mapOf("email" to email.trim(), "password" to password)).value()
            store.save(session)
            mutable.update { it.copy(session = session, demo = false) }
            load()
        }
    }
    fun signup(name: String, email: String, password: String) {
        if (name.isBlank() || !Validation.email(email) || password.length < 8) { notify("이름, 이메일 형식, 8자 이상 비밀번호를 확인하세요."); return }
        execute {
            api.signup(mapOf("name" to name.trim(), "email" to email.trim(), "password" to password, "role" to "STUDENT"))
            notify("가입이 완료되었습니다. 로그인해 주세요.")
        }
    }
    fun enterDemo() {
        epoch++; operation?.cancel(); refreshJob?.cancel(); closeTaskSocket(); demoData = DemoData()
        mutable.value = AppState(session = demoData.session, demo = true, baseUrl = store.baseUrl)
        refresh()
    }
    fun logout() {
        epoch++; operation?.cancel(); refreshJob?.cancel(); closeTaskSocket(); store.clear()
        mutable.value = AppState(baseUrl = store.baseUrl)
    }
    fun selectWorkspace(id: String) {
        if (state.value.busy || id == state.value.workspaceId) return
        refreshJob?.cancel()
        closeTaskSocket()
        mutable.update { it.copy(workspaceId = id, tasks = emptyList(), members = emptyList()) }
        refresh()
    }
    fun refresh(silent: Boolean = false) {
        if (state.value.session == null || state.value.busy || refreshJob?.isActive == true) return
        val generation = epoch
        refreshJob = viewModelScope.launch {
            if (!silent) mutable.update { it.copy(refreshing = true) }
            try { load() }
            catch (e: CancellationException) { throw e }
            catch (e: Exception) { if (generation == epoch && !silent) handleError(e) }
            finally { if (generation == epoch) mutable.update { it.copy(refreshing = false) } }
        }
    }
    private suspend fun load() {
        val snapshot = state.value
        val user = snapshot.session ?: return
        if (snapshot.demo) {
            val id = snapshot.workspaceId?.takeIf { target -> demoData.workspaces.any { it.workspaceId == target } } ?: demoData.workspaces.firstOrNull()?.workspaceId
            mutable.update { it.copy(workspaces = demoData.workspaces.toList(), workspaceId = id,
                tasks = demoData.tasks[id]?.toList() ?: emptyList(), members = demoData.members,
                schedules = demoData.schedules.toList(), notices = demoData.notices.toList(), profile = demoData.profile) }
            return
        }
        coroutineScope {
            val workspaces = async { api.workspaces(user.userId).value() }
            val schedules = async { api.schedules(user.userId) }
            val notices = async { api.notices(user.userId, snapshot.workspaceId).value() }
            val profile = async { api.profile(user.userId).value() }
            val spaces = workspaces.await()
            val id = snapshot.workspaceId?.takeIf { target -> spaces.any { it.workspaceId == target } } ?: spaces.firstOrNull()?.workspaceId
            val tasks = async { id?.let { api.tasks(it).value() } ?: emptyList() }
            val members = async { id?.let { api.members(it).value() } ?: emptyList() }
            val updated = snapshot.copy(workspaces = spaces, workspaceId = id, tasks = tasks.await(), members = members.await(),
                schedules = schedules.await(), notices = notices.await().sortedByDescending { it.createdAt }, profile = profile.await())
            mutable.update { current -> updated.copy(busy = current.busy, refreshing = current.refreshing, message = current.message,
                drafts = current.drafts, prompt = current.prompt, aiFallback = current.aiFallback) }
            connectTaskSocket(id)
        }
    }
    fun createWorkspace(name: String, done: () -> Unit) {
        if (name.isBlank()) { notify("워크스페이스 이름을 입력하세요."); return }
        execute {
            val user = state.value.session ?: return@execute
            val workspace = if (state.value.demo) Workspace(UUID.randomUUID().toString(), name.trim(), "TEAM", user.userId).also {
                demoData.workspaces.add(it); demoData.tasks[it.workspaceId] = mutableListOf()
            } else api.createWorkspace(user.userId, mapOf("name" to name.trim(), "type" to "TEAM")).value()
            mutable.update { it.copy(workspaceId = workspace.workspaceId) }; done(); load()
        }
    }
    private suspend fun saveTask(input: TaskInput): Task {
        val s = state.value
        val id = requireNotNull(s.workspaceId) { "워크스페이스를 먼저 선택하세요." }
        return if (s.demo) Task(UUID.randomUUID().toString(), input.title, input.description, input.status, dueDate = input.dueDate,
            assigneeId = input.assigneeId, assigneeName = s.members.find { it.userId == input.assigneeId }?.name, priority = input.priority, estimatedHours = input.estimatedHours).also {
            demoData.tasks.getOrPut(id) { mutableListOf() }.add(it)
        } else api.createTask(id, input).value()
    }
    fun createTask(input: TaskInput, done: () -> Unit) {
        if (input.title.isBlank() || !Validation.date(input.dueDate.orEmpty())) { notify("업무 제목과 마감일(YYYY-MM-DD)을 확인하세요."); return }
        execute { saveTask(input.copy(title = input.title.trim())); done(); load() }
    }
    fun changeStatus(task: Task, status: TaskStatus) = execute {
        val s = state.value
        if (s.demo) {
            val list = demoData.tasks[s.workspaceId]!!
            val index = list.indexOfFirst { it.taskId == task.taskId }
            list[index] = task.copy(status = status.name)
        } else api.status(s.workspaceId!!, task.taskId, status.name, s.session!!.userId)
        load()
    }

    fun loadTaskDetails(taskId: String) {
        val s = state.value
        if (s.session == null || s.demo || s.workspaceId == null) return
        viewModelScope.launch {
            runCatching {
                val comments = async { api.comments(s.workspaceId, taskId).value() }
                val attachments = async { api.attachments(s.workspaceId, taskId).value() }
                mutable.update {
                    it.copy(
                        taskComments = it.taskComments + (taskId to comments.await()),
                        taskAttachments = it.taskAttachments + (taskId to attachments.await())
                    )
                }
            }
        }
    }

    fun saveTaskDescription(task: Task, description: String) = execute {
        val s = state.value
        if (s.demo) {
            updateTaskLocal(task.taskId) { it.copy(description = description) }
        } else {
            api.description(s.workspaceId!!, task.taskId, mapOf("description" to description))
            updateTaskLocal(task.taskId) { it.copy(description = description) }
        }
    }

    fun saveTaskStartDate(task: Task, startDate: String) = execute {
        if (startDate.isNotBlank() && !Validation.date(startDate)) {
            notify("시작일은 YYYY-MM-DD 형식으로 입력하세요.")
            return@execute
        }
        val s = state.value
        val value = startDate.trim()
        if (s.demo) {
            updateTaskLocal(task.taskId) { it.copy(startDate = value.ifBlank { null }) }
        } else {
            api.startDate(s.workspaceId!!, task.taskId, value)
            updateTaskLocal(task.taskId) { it.copy(startDate = value.ifBlank { null }) }
        }
    }

    fun saveTaskDueDate(task: Task, dueDate: String) = execute {
        if (!Validation.date(dueDate) || dueDate.isBlank()) {
            notify("마감일은 YYYY-MM-DD 형식으로 입력하세요.")
            return@execute
        }
        val s = state.value
        val value = dueDate.trim()
        if (s.demo) {
            updateTaskLocal(task.taskId) { it.copy(dueDate = value) }
        } else {
            api.dueDate(s.workspaceId!!, task.taskId, value)
            updateTaskLocal(task.taskId) { it.copy(dueDate = value) }
        }
    }

    fun changeAssignee(task: Task, assigneeId: String?) = execute {
        val s = state.value
        val member = s.members.find { it.userId == assigneeId }
        if (s.demo) {
            updateTaskLocal(task.taskId) { it.copy(assigneeId = assigneeId, assigneeName = member?.name) }
        } else {
            val updated = api.assignee(s.workspaceId!!, task.taskId, assigneeId).value()
            updateTaskLocal(task.taskId) { it.copy(assigneeId = updated.assigneeId, assigneeName = updated.assigneeName) }
        }
    }

    fun sendQuickSignal(task: Task, signal: String?) = execute {
        val s = state.value
        if (s.demo) {
            updateTaskLocal(task.taskId) { it.copy(quickSignal = signal) }
        } else {
            if (signal == null) api.clearQuickSignal(s.workspaceId!!, task.taskId)
            else api.quickSignal(s.workspaceId!!, task.taskId, signal, s.session!!.userId)
            updateTaskLocal(task.taskId) { it.copy(quickSignal = signal) }
        }
    }

    fun addTaskComment(task: Task, content: String) = execute {
        if (content.isBlank()) return@execute
        val s = state.value
        if (s.demo) {
            val comment = Comment(UUID.randomUUID().toString(), s.session?.userId, s.session?.name, content.trim(), null)
            mutable.update { it.copy(taskComments = it.taskComments + (task.taskId to ((it.taskComments[task.taskId] ?: emptyList()) + comment))) }
        } else {
            val saved = api.addComment(s.workspaceId!!, task.taskId, mapOf("senderId" to s.session!!.userId, "content" to content.trim())).value()
            mutable.update { it.copy(taskComments = it.taskComments + (task.taskId to ((it.taskComments[task.taskId] ?: emptyList()) + saved))) }
        }
    }

    private fun updateTaskLocal(taskId: String, transform: (Task) -> Task) {
        mutable.update { app -> app.copy(tasks = app.tasks.map { if (it.taskId == taskId) transform(it) else it }) }
    }

    private fun connectTaskSocket(workspaceId: String?) {
        val s = state.value
        if (workspaceId == null || s.session == null || s.demo) {
            closeTaskSocket()
            return
        }
        if (taskSocket != null && taskSocketWorkspaceId == workspaceId) return

        closeTaskSocket()
        taskSocketWorkspaceId = workspaceId

        val wsUrl = runCatching {
            val apiRoot = s.baseUrl.trimEnd('/').removeSuffix("/api")
            val wsRoot = apiRoot
                .replaceFirst("https://", "wss://")
                .replaceFirst("http://", "ws://")
            val encodedWorkspaceId = URLEncoder.encode(workspaceId, "UTF-8")
            "$wsRoot/ws/tasks?workspaceId=$encodedWorkspaceId"
        }.getOrElse { return }

        val request = Request.Builder()
            .url(wsUrl)
            .header("Authorization", "Bearer ${s.session.accessToken}")
            .build()

        taskSocket = socketClient.newWebSocket(request, object : WebSocketListener() {
            override fun onMessage(webSocket: WebSocket, text: String) {
                handleTaskSocketMessage(text)
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                if (taskSocketWorkspaceId == workspaceId) scheduleTaskSocketReconnect(workspaceId)
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                if (taskSocketWorkspaceId == workspaceId) scheduleTaskSocketReconnect(workspaceId)
            }
        })
    }

    private fun scheduleTaskSocketReconnect(workspaceId: String) {
        if (socketReconnectJob?.isActive == true) return
        socketReconnectJob = viewModelScope.launch {
            delay(3_000)
            if (state.value.workspaceId == workspaceId && state.value.session != null && !state.value.demo) {
                taskSocket = null
                connectTaskSocket(workspaceId)
            }
        }
    }

    private fun closeTaskSocket() {
        socketReconnectJob?.cancel()
        socketReconnectJob = null
        taskSocketWorkspaceId = null
        taskSocket?.close(1000, null)
        taskSocket = null
    }

    private fun handleTaskSocketMessage(text: String) {
        val json = runCatching { JsonParser.parseString(text).asJsonObject }.getOrNull() ?: return
        when (json["type"]?.asString) {
            "STATUS_CHANGE" -> {
                val taskId = json["taskId"]?.asString ?: return
                val newStatus = json["newStatus"]?.asString ?: return
                mutable.update { app ->
                    app.copy(tasks = app.tasks.map { task ->
                        if (task.taskId == taskId) task.copy(status = newStatus) else task
                    })
                }
            }
            "TASK_UPDATED" -> {
                val taskId = json["taskId"]?.asString ?: return
                val field = json["field"]?.asString ?: return
                val value = json["value"]?.asString.orEmpty()
                updateTaskLocal(taskId) { task ->
                    when (field) {
                        "description" -> task.copy(description = value)
                        "startDate" -> task.copy(startDate = value.ifBlank { null })
                        "dueDate" -> task.copy(dueDate = value.ifBlank { null })
                        "assigneeName" -> task.copy(assigneeName = value.ifBlank { null })
                        "assigneeId" -> task.copy(assigneeId = value.ifBlank { null })
                        else -> task
                    }
                }
            }
        }
    }

    override fun onCleared() {
        closeTaskSocket()
        socketClient.dispatcher.executorService.shutdown()
        super.onCleared()
    }
    fun addSchedule(title: String, day: String, start: String, end: String, category: String, done: () -> Unit) {
        if (title.isBlank() || day !in Validation.days || !Validation.times(start, end)) { notify("일정 이름과 시간(HH:mm)을 확인하세요. 종료 시간은 시작 이후여야 합니다."); return }
        execute {
            val s = state.value
            if (s.demo) demoData.schedules.add(Schedule(UUID.randomUUID().toString(), title.trim(), category, day, start, end))
            else api.addSchedule(ScheduleInput(s.session!!.userId, title.trim(), category, day, start, end))
            done(); load()
        }
    }
    fun deleteSchedule(id: String) = execute {
        if (state.value.demo) demoData.schedules.removeAll { it.blockId == id }
        else { val response = api.deleteSchedule(id); if (!response.isSuccessful) throw HttpException(response) }
        load()
    }
    fun readNotice(notice: Notice) = execute {
        if (state.value.demo) { val index = demoData.notices.indexOfFirst { it.notificationId == notice.notificationId }; demoData.notices[index] = notice.copy(read = true) }
        else api.readNotice(notice.notificationId)
        load()
    }
    fun readAllNotices() = execute {
        val unread = state.value.notices.filterNot { it.read }
        if (state.value.demo) {
            demoData.notices.replaceAll { it.copy(read = true) }
        } else {
            unread.forEach { api.readNotice(it.notificationId) }
        }
        mutable.update { app -> app.copy(notices = app.notices.map { it.copy(read = true) }) }
    }
    fun updateName(name: String, done: () -> Unit) {
        if (name.isBlank()) { notify("이름을 입력하세요."); return }
        execute {
            val s = state.value
            if (s.demo) demoData.profile = demoData.profile.copy(name = name.trim())
            else api.updateProfile(s.session!!.userId, mapOf("name" to name.trim()))
            done(); load()
        }
    }
    fun generate() {
        if (!Validation.description(state.value.prompt)) { notify("목표와 필요한 기능을 20~4,000자로 구체적으로 입력하세요."); return }
        execute {
            val result = if (state.value.demo) AiResult(listOf(
                AiTask("요구사항 정리", "프로젝트의 사용자, 목표, 핵심 기능을 정리합니다.", "기획", "HIGH", 2),
                AiTask("모바일 화면 구현", "핵심 사용자 흐름과 모바일 화면을 구현합니다.", "개발", "HIGH", 8),
                AiTask("통합 테스트", "로그인부터 업무 완료까지 검증합니다.", "테스트", "MEDIUM", 4)), true)
            else api.generate(state.value.prompt.trim()).value()
            mutable.update { it.copy(drafts = result.tasks.map { task -> Draft(UUID.randomUUID().toString(), task) }, aiFallback = result.fallback) }
            if (result.tasks.isEmpty()) notify("생성된 업무가 없습니다. 설명을 보완해 다시 시도하세요.")
        }
    }
    fun editDraft(id: String, title: String) { mutable.update { s -> s.copy(drafts = s.drafts.map { if (it.id == id) it.copy(task = it.task.copy(title = title)) else it }) } }
    fun toggleDraft(id: String) { mutable.update { s -> s.copy(drafts = s.drafts.map { if (it.id == id) it.copy(selected = !it.selected) else it }) } }
    fun publishDrafts() {
        val selected = state.value.drafts.filter { it.selected }
        if (selected.isEmpty() || selected.any { it.task.title.isBlank() }) { notify("제목이 있는 업무를 하나 이상 선택하세요."); return }
        if (state.value.workspaceId == null) { notify("워크스페이스를 먼저 만들어 주세요."); return }
        execute {
            var count = 0
            try {
                for (draft in selected) {
                    val task = draft.task
                    val saved = saveTask(TaskInput(task.title.trim(), task.description.orEmpty(), priority = task.priority ?: "MEDIUM", estimatedHours = task.estimatedHours))
                    // Remove each confirmed task immediately so retrying a partial batch cannot resend it.
                    mutable.update { it.copy(drafts = it.drafts.filterNot { d -> d.id == draft.id }, tasks = it.tasks + saved) }
                    count++
                }
            } catch (e: CancellationException) { throw e }
            catch (e: Exception) { throw IllegalStateException("${count}개 등록 완료. 나머지 등록 중 오류가 발생했습니다. 보드에서 확인 후 다시 시도하세요.", e) }
            notify("${count}개 업무가 팀 보드에 공유되었습니다.")
        }
    }
}
