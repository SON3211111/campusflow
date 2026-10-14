package com.campusflow.mobile.ui

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.campusflow.mobile.AppState
import com.campusflow.mobile.AppViewModel
import com.campusflow.mobile.data.*
import kotlinx.coroutines.*

@Composable
fun AttachmentPanel(state: AppState, task: Task, files: List<Attachment>, vm: AppViewModel) {
    var pendingDownloadId by rememberSaveable(task.taskId) { mutableStateOf<String?>(null) }
    var deleteTarget by remember { mutableStateOf<Attachment?>(null) }
    val upload = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) vm.uploadFile(task, uri)
    }
    val download = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/octet-stream")) { uri ->
        val file = files.find { it.attachmentId == pendingDownloadId }
        pendingDownloadId = null
        if (uri != null && file != null) vm.downloadFile(task, file, uri)
    }
    SectionTitle("첨부파일", "최대 50MB · 저장할 때 위치를 선택하세요")
    OutlinedButton({ upload.launch(arrayOf("*/*")) }, enabled = !state.busy, modifier = Modifier.fillMaxWidth()) { Text("파일 첨부") }
    if (files.isEmpty()) Text("첨부된 파일이 없습니다.")
    files.forEach { file ->
        OutlinedCard(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(file.originalName, fontWeight = FontWeight.SemiBold)
                Text("${file.fileSize / 1024}KB · ${file.uploaderName ?: "업로더 미상"}", style = MaterialTheme.typography.bodySmall)
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedButton({ pendingDownloadId = file.attachmentId; download.launch(file.originalName.substringAfterLast('/').substringAfterLast('\\')) }, enabled = !state.busy) { Text("저장") }
                    TextButton({ deleteTarget = file }, enabled = !state.busy) { Text("삭제", color = MaterialTheme.colorScheme.error) }
                }
            }
        }
    }
    deleteTarget?.let { file ->
        AlertDialog(onDismissRequest = { deleteTarget = null }, title = { Text("첨부파일을 삭제할까요?") },
            text = { Text("${file.originalName}\n삭제한 첨부파일은 복원할 수 없습니다.") },
            confirmButton = { TextButton({ deleteTarget = null; vm.deleteFile(task, file) }) { Text("삭제") } },
            dismissButton = { TextButton({ deleteTarget = null }) { Text("취소") } })
    }
}

@Composable
fun TrashPanel(state: AppState, vm: AppViewModel) {
    val id = state.workspaceId
    if (id == null) { EmptyCard("워크스페이스가 필요합니다", "실제 계정으로 로그인하고 팀을 선택하세요."); return }
    key(id, state.session?.userId) {
        var tasks by remember { mutableStateOf<List<Task>>(emptyList()) }
        var loading by remember { mutableStateOf(false) }
        var loaded by remember { mutableStateOf(false) }
        var error by remember { mutableStateOf<String?>(null) }
        val scope = rememberCoroutineScope()
        fun runAction(action: suspend () -> Unit) {
            if (loading) return
            loading = true; error = null
            scope.launch {
                try { withTimeout(30_000) { action() } }
                catch (e: TimeoutCancellationException) { error = "응답 시간이 초과되었습니다. 새로고침해 주세요." }
                catch (e: CancellationException) { throw e }
                catch (e: Exception) { error = "처리하지 못했습니다. 네트워크와 로그인 상태를 확인해 주세요." }
                finally { loading = false }
            }
        }
        fun reload() = runAction { tasks = vm.loadTrash(id); loaded = true }
        LaunchedEffect(Unit) { reload() }
        SectionTitle("휴지통", state.workspace?.name) { TextButton({ reload() }, enabled = !loading) { Text("새로고침") } }
        if (loading) LinearProgressIndicator(Modifier.fillMaxWidth())
        error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        if (loaded && tasks.isEmpty() && !loading && error == null) EmptyCard("삭제된 업무가 없습니다", "삭제한 업무는 여기서 복원할 수 있습니다.")
        tasks.forEach { task ->
            OutlinedCard(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(task.title, fontWeight = FontWeight.Bold)
                    Text("${task.assigneeName ?: "담당자 미정"} · ${task.dueDate ?: "마감일 없음"}")
                    OutlinedButton({ runAction { vm.restoreDeletedTask(id, task); tasks = tasks.filterNot { it.taskId == task.taskId } } }, enabled = !loading && !state.busy) { Text("업무 복원") }
                }
            }
        }
    }
}
