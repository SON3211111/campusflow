# Task Dependency Bottleneck Plan

## Goal

Make bottleneck reports explain real downstream impact instead of guessing from dates alone.

## Dependency Model

Use an explicit `task_dependencies` table.

- `predecessor_task_id`: the task that must finish first
- `successor_task_id`: the downstream task that can be delayed
- `workspace_id`: workspace boundary for safe querying
- `created_at`: audit timestamp

Example:

```text
보고서 초안 작성 -> 보고서 검토 및 수정 -> 보고서 최종 편집 및 제출 준비
PPT 발표 자료 제작 -> PPT 발표 연습 및 피드백
```

## AI Auto-Linking

When AI-generated tasks are sent to the board, tasks in the same AI category are linked in their generated order.

```text
category task 1 -> category task 2 -> category task 3
```

Users can still edit dependencies from the task detail card.

## Delay Calculation

Base delay:

```text
baseOverrunDays = daysStuck - thresholdDays
```

Weighted delay:

```text
delayDays = ceil(baseOverrunDays * priorityWeight * estimatedHoursWeight * statusWeight)
```

Weights:

- Priority: `HIGH = 1.3`, `MEDIUM = 1.0`, `LOW = 0.7`
- Estimated hours: `1-2h = 0.8`, `3-5h = 1.0`, `6h+ = 1.2`
- Status: `ISSUE = 1.3`, `DOING = 1.0`

## Bottleneck Report Rule

1. Detect bottleneck tasks by current status and stale status history.
2. Find affected downstream tasks through `task_dependencies`.
3. Exclude completed tasks from the affected list.
4. Propagate the weighted delay to the dependency chain.

Date-based fallback can remain only for legacy tasks with no dependency data, but explicit dependencies should be preferred.
