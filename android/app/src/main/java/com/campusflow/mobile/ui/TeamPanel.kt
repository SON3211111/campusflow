package com.campusflow.mobile.ui

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
import retrofit2.HttpException

@Composable
fun TeamPanel(state: AppState, vm: AppViewModel) {
    key(state.session?.userId, state.workspaceId) {
        var invitations by remember { mutableStateOf<List<Invitation>>(emptyList()) }
        var requests by remember { mutableStateOf<List<JoinRequest>>(emptyList()) }
        var busy by remember { mutableStateOf(false) }
        var message by remember { mutableStateOf<String?>(null) }
        var loadFailed by remember { mutableStateOf(false) }
        var email by rememberSaveable { mutableStateOf("") }
        var code by rememberSaveable { mutableStateOf("") }
        val scope = rememberCoroutineScope()
        suspend fun reload() {
            try {
                val inbox = vm.teamInbox()
                invitations = inbox.first; requests = inbox.second; loadFailed = false
            } catch (e: Exception) { loadFailed = true; throw e }
        }
        fun runAction(action: suspend () -> Unit) {
            if (busy) return
            busy = true; message = null
            scope.launch {
                try { withTimeout(30_000) { action() } }
                catch (e: TimeoutCancellationException) { message = "응답 시간이 초과되었습니다. 새로고침으로 처리 결과를 확인하세요." }
                catch (e: CancellationException) { throw e }
                catch (e: Exception) { message = if (e is HttpException) "요청 실패 (${e.code()}). 계정·초대 상태를 확인하세요." else e.message ?: "서버 연결을 확인하세요." }
                finally { busy = false }
            }
        }
        LaunchedEffect(Unit) { runAction { reload() } }
        SectionTitle("팀 초대·참여", state.workspace?.name ?: "아직 참여한 팀이 없습니다") {
            TextButton({ runAction { reload() } }, enabled = !busy) { Text("새로고침") }
        }
        if (busy) LinearProgressIndicator(Modifier.fillMaxWidth())
        message?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
        if (loadFailed) Text("초대 목록을 불러오지 못했습니다. 새로고침해 주세요.", color = MaterialTheme.colorScheme.error)
        if (state.workspaceId != null) {
            Text("현재 팀으로 초대", fontWeight = FontWeight.Bold)
            OutlinedTextField(email, { email = it }, label = { Text("초대할 팀원의 이메일") }, enabled = !busy, singleLine = true, modifier = Modifier.fillMaxWidth())
            OutlinedButton({ runAction {
                vm.sendTeamInvitation(state.workspaceId, email)
                email = ""; message = "초대를 보냈습니다. 상대방이 수락하면 팀에 참여합니다."
            } }, enabled = !busy && Validation.email(email)) { Text("초대 보내기") }
        }
        HorizontalDivider()
        Text("다른 팀에 참여 요청", fontWeight = FontWeight.Bold)
        OutlinedTextField(code, { code = it }, label = { Text("워크스페이스 ID 또는 초대 링크") }, enabled = !busy, modifier = Modifier.fillMaxWidth())
        OutlinedButton({ runAction { vm.requestTeamJoin(code); code = ""; message = "참여 요청을 보냈습니다. 관리자 승인 후 참여할 수 있습니다." } }, enabled = !busy && code.isNotBlank()) { Text("참여 요청") }
        HorizontalDivider()
        SectionTitle("받은 초대", "${invitations.size}개")
        if (!busy && !loadFailed && invitations.isEmpty()) Text("대기 중인 초대가 없습니다.")
        invitations.forEach { invitation ->
            OutlinedCard(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(invitation.workspaceName, fontWeight = FontWeight.Bold)
                    Text("${invitation.inviterName}님의 초대")
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Button({ runAction { vm.answerInvitation(invitation, true); invitations = invitations.filterNot { it.invitationId == invitation.invitationId }; message = "팀에 참여했습니다." } }, enabled = !busy) { Text("수락") }
                        OutlinedButton({ runAction { vm.answerInvitation(invitation, false); invitations = invitations.filterNot { it.invitationId == invitation.invitationId }; message = "초대를 거절했습니다." } }, enabled = !busy) { Text("거절") }
                    }
                }
            }
        }
        HorizontalDivider()
        SectionTitle("관리할 참여 요청", "${requests.size}개")
        if (!busy && !loadFailed && requests.isEmpty()) Text("대기 중인 참여 요청이 없습니다.")
        requests.forEach { request ->
            OutlinedCard(Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(request.workspaceName, fontWeight = FontWeight.Bold)
                    Text("${request.requesterName}님이 참여를 요청했습니다.")
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Button({ runAction { vm.answerJoinRequest(request, true); requests = requests.filterNot { it.notificationId == request.notificationId }; message = "참여를 승인했습니다." } }, enabled = !busy) { Text("승인") }
                        OutlinedButton({ runAction { vm.answerJoinRequest(request, false); requests = requests.filterNot { it.notificationId == request.notificationId }; message = "참여 요청을 거절했습니다." } }, enabled = !busy) { Text("거절") }
                    }
                }
            }
        }
    }
}
