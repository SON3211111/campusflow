package com.campusflow.mobile.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.campusflow.mobile.AppState
import com.campusflow.mobile.data.*
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.TimeoutCancellationException
import retrofit2.HttpException
import java.io.IOException
import java.time.LocalDate
import java.time.temporal.ChronoUnit

@Composable
fun BottleneckReportPanel(
    state: AppState,
    loadReport: suspend (String) -> BottleneckReport,
    onOpenTask: (String) -> Unit,
) {
    val workspaceId = state.workspaceId
    if (workspaceId == null) {
        EmptyCard("워크스페이스를 선택하세요", "팀을 선택하면 해당 프로젝트의 병목과 후속 업무 영향을 확인할 수 있습니다.")
        return
    }
    // Workspace/session changes dispose old requests, preventing cross-team results.
    key(workspaceId, state.session?.accessToken) {
        var report by remember { mutableStateOf<BottleneckReport?>(null) }
        var error by remember { mutableStateOf<String?>(null) }
        var loading by remember { mutableStateOf(true) }
        var revision by remember { mutableIntStateOf(0) }
        val loader by rememberUpdatedState(loadReport)
        LaunchedEffect(revision, state.tasks) {
            loading = true
            report = null
            error = null
            try { report = loader(workspaceId) }
            catch (e: TimeoutCancellationException) { error = "응답 시간이 초과되었습니다. 다시 시도해 주세요." }
            catch (e: CancellationException) { throw e }
            catch (e: Exception) {
                error = when {
                    e is HttpException && e.code() == 401 -> "로그인이 만료되었습니다. 다시 로그인해 주세요."
                    e is IOException -> "서버에 연결하지 못했습니다. 네트워크를 확인해 주세요."
                    else -> "병목 리포트를 불러오지 못했습니다. 다시 시도해 주세요."
                }
            } finally { loading = false }
        }
        SectionTitle("병목 리포트", state.workspace?.name) {
            TextButton(onClick = { revision++ }, enabled = !loading) { Text("새로고침") }
        }
        Text("웹과 동일한 서버 분석 결과입니다. 지연 일수는 예상치이며 실제 일정과 다를 수 있습니다.",
            style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        when {
            loading -> {
                LinearProgressIndicator(Modifier.fillMaxWidth())
                Text("병목과 후속 업무 영향을 확인하고 있습니다.")
            }
            error != null -> {
                EmptyCard("리포트를 불러올 수 없어요", error!!)
                OutlinedButton(onClick = { revision++ }) { Text("다시 시도") }
            }
            report != null -> ReportContent(report!!, onOpenTask)
        }
    }
}

@Composable
private fun ReportContent(report: BottleneckReport, onOpenTask: (String) -> Unit) {
    if (report.bottlenecks.isEmpty()) {
        EmptyCard("현재 감지된 병목 업무가 없습니다", "서버의 병목 판정 기준에 해당하는 업무가 없습니다.")
        return
    }
    Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("병목 업무 ${report.bottlenecks.size}개", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Text("최대 ${report.totalDelayDays}일 지연 예상", style = MaterialTheme.typography.headlineSmall)
            Text("기준 마감: ${report.projectDeadline ?: "미설정"}")
            Text("예상 마감: ${report.estimatedNewDeadline ?: "계산할 날짜가 없습니다"}")
        }
    }
    SectionTitle("업무별 영향", "카드를 펼쳐 영향받는 후속 업무를 확인하세요")
    report.bottlenecks.forEach { item ->
        key(item.taskId) {
            var expanded by rememberSaveable { mutableStateOf(false) }
            OutlinedCard(onClick = { expanded = !expanded }, modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(item.title, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                    Text("${statusLabel(item.status)} · ${item.assigneeName ?: "담당자 미정"}")
                    Text("${item.daysStuck}일 정체 · ${item.delayDays}일 지연 예상 · 후속 업무 ${item.affectedTaskCount}개",
                        color = MaterialTheme.colorScheme.error)
                    Text("마감 ${item.dueDate ?: "미설정"}", style = MaterialTheme.typography.bodySmall)
                    DeadlineTimeline(item.dueDate, item.delayDays)
                    TextButton(onClick = { expanded = !expanded }) { Text(if (expanded) "영향 상세 접기" else "영향 상세 펼치기") }
                    if (expanded) {
                        Text("병목: ${item.title}", fontWeight = FontWeight.Bold)
                        if (item.affectedTasks.isEmpty()) Text("영향받는 후속 업무가 없습니다.")
                        item.affectedTasks.sortedBy { it.depth }.forEach { affected ->
                            HorizontalDivider()
                            Text("↓ ${if (affected.depth <= 1) "직접 영향" else "간접 영향 · ${affected.depth}단계"}", color = MaterialTheme.colorScheme.primary)
                            Text(affected.title, fontWeight = FontWeight.SemiBold)
                            Text("${affected.assigneeName ?: "담당자 미정"} · ${statusLabel(affected.status)}", style = MaterialTheme.typography.bodySmall)
                            Text("마감 ${affected.dueDate ?: "미설정"} · ${affected.estimatedDelayDays}일 지연 예상", style = MaterialTheme.typography.bodySmall)
                            OutlinedButton(onClick = { onOpenTask(affected.taskId) }) { Text("후속 업무 보기") }
                        }
                    }
                    OutlinedButton(onClick = { onOpenTask(item.taskId) }, modifier = Modifier.fillMaxWidth()) { Text("병목 업무 확인·수정") }
                }
            }
        }
    }
}

private fun statusLabel(status: String) = TaskStatus.entries.find { it.name == status }?.label ?: status

@Composable
private fun DeadlineTimeline(date: String?, delay: Int) {
    val deadline = runCatching { LocalDate.parse(date?.take(10)) }.getOrNull() ?: return
    val estimated = runCatching { deadline.plusDays(delay.coerceAtLeast(0).toLong()) }.getOrNull() ?: return
    if (delay <= 0) return
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(deadline.toString(), style = MaterialTheme.typography.labelSmall)
        Text("+${ChronoUnit.DAYS.between(deadline, estimated)}일", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.error)
        Text(estimated.toString(), style = MaterialTheme.typography.labelSmall)
    }
    HorizontalDivider(color = MaterialTheme.colorScheme.error, thickness = 3.dp)
}
