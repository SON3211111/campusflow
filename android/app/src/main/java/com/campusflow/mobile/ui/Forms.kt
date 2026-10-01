@file:OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
package com.campusflow.mobile.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.campusflow.mobile.data.*
import java.time.LocalDate

@Composable
fun WorkspaceForm(busy: Boolean, onSave: (String) -> Unit) {
    var name by rememberSaveable { mutableStateOf("") }
    Text("새 팀 공간 만들기", style = MaterialTheme.typography.titleMedium)
    OutlinedTextField(name, { name = it }, label = { Text("워크스페이스 이름") }, singleLine = true, enabled = !busy, modifier = Modifier.fillMaxWidth())
    PrimaryButton("워크스페이스 만들기", !busy && name.isNotBlank()) { onSave(name) }
}

@Composable
fun TaskForm(busy: Boolean, members: List<Member>, userId: String, onSave: (TaskInput) -> Unit) {
    var title by rememberSaveable { mutableStateOf("") }
    var description by rememberSaveable { mutableStateOf("") }
    var due by rememberSaveable { mutableStateOf("") }
    var assignee by rememberSaveable { mutableStateOf<String?>(userId) }
    var priority by rememberSaveable { mutableStateOf("MEDIUM") }
    SectionTitle("새 업무", "작은 할 일부터 시작해 보세요")
    OutlinedTextField(title, { title = it }, label = { Text("업무 제목") }, enabled = !busy, modifier = Modifier.fillMaxWidth())
    OutlinedTextField(description, { description = it }, label = { Text("업무 설명") }, minLines = 3, enabled = !busy, modifier = Modifier.fillMaxWidth())
    OutlinedTextField(due, { due = it }, label = { Text("마감일 · 선택") }, placeholder = { Text("2026-10-15") }, isError = !Validation.date(due), supportingText = { Text("YYYY-MM-DD 형식으로 입력하세요.") }, singleLine = true, enabled = !busy, modifier = Modifier.fillMaxWidth())
    Text("담당자")
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        FilterChip(assignee == null, { assignee = null }, label = { Text("미배정") }, enabled = !busy)
        members.forEach { member -> FilterChip(assignee == member.userId, { assignee = member.userId }, label = { Text(member.name) }, enabled = !busy) }
    }
    Text("우선순위")
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        listOf("HIGH" to "높음", "MEDIUM" to "보통", "LOW" to "낮음").forEach { (value, label) ->
            FilterChip(priority == value, { priority = value }, label = { Text(label) }, enabled = !busy)
        }
    }
    PrimaryButton("업무 등록", !busy && title.isNotBlank() && Validation.date(due)) { onSave(TaskInput(title, description, dueDate = due.takeIf { it.isNotBlank() }, assigneeId = assignee, priority = priority)) }
}

@Composable
fun ScheduleForm(busy: Boolean, onSave: (String, String, String, String, String) -> Unit) {
    var title by rememberSaveable { mutableStateOf("") }
    var day by rememberSaveable { mutableStateOf(Validation.days[LocalDate.now().dayOfWeek.value - 1]) }
    var start by rememberSaveable { mutableStateOf("09:00") }
    var end by rememberSaveable { mutableStateOf("10:00") }
    var category by rememberSaveable { mutableStateOf("CLASS") }
    SectionTitle("시간표 일정 등록", "매주 반복하는 일정으로 저장됩니다")
    OutlinedTextField(title, { title = it }, label = { Text("일정 이름") }, enabled = !busy, modifier = Modifier.fillMaxWidth())
    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) { Validation.days.forEach { item -> FilterChip(day == item, { day = item }, label = { Text(item) }, enabled = !busy) } }
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        OutlinedTextField(start, { start = it }, label = { Text("시작 HH:mm") }, singleLine = true, enabled = !busy, modifier = Modifier.weight(1f))
        OutlinedTextField(end, { end = it }, label = { Text("종료 HH:mm") }, singleLine = true, enabled = !busy, modifier = Modifier.weight(1f))
    }
    if (!Validation.times(start, end)) Text("시간을 HH:mm으로 입력하고 종료 시간을 시작 이후로 설정하세요.", color = MaterialTheme.colorScheme.error)
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        listOf("CLASS" to "수업", "PRIVATE" to "개인", "TASK" to "업무", "FREE" to "공강").forEach { (value, label) -> FilterChip(category == value, { category = value }, label = { Text(label) }, enabled = !busy) }
    }
    PrimaryButton("일정 저장", !busy && title.isNotBlank() && Validation.times(start, end)) { onSave(title, day, start, end, category) }
}

@Composable
fun NameForm(initial: String, busy: Boolean, onSave: (String) -> Unit) {
    var name by rememberSaveable { mutableStateOf(initial) }
    SectionTitle("프로필 이름 수정")
    OutlinedTextField(name, { name = it }, label = { Text("이름") }, singleLine = true, enabled = !busy, modifier = Modifier.fillMaxWidth())
    PrimaryButton("저장", !busy && name.isNotBlank()) { onSave(name) }
}
