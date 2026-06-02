import { useState, useEffect } from "react";
import client from "../api/client";
import "./PlannerDrawer.css";

interface Props {
  open: boolean;
  onClose: () => void;
  workspaceId?: string;
}

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

function getCalendarDays(year: number, month: number) {
  const first = new Date(year, month, 1).getDay();
  const last  = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = Array(first).fill(null);
  for (let i = 1; i <= last; i++) days.push(i);
  return days;
}

function getDaysLeft(dueDate: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due   = new Date(dueDate); due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / 86400000);
}

export default function PlannerDrawer({ open, onClose, workspaceId }: Props) {
  const TODAY = new Date();
  const [calYear, setCalYear]   = useState(TODAY.getFullYear());
  const [calMonth, setCalMonth] = useState(TODAY.getMonth());
  const [upcoming, setUpcoming] = useState<{ id: string; title: string; dueDate: string; daysLeft: number }[]>([]);

  useEffect(() => {
    if (!open || !workspaceId) return;
    client.get(`/workspaces/${workspaceId}/tasks`)
      .then((res) => {
        const tasks = res.data.data ?? [];
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const list = tasks
          .filter((t: any) => t.dueDate && t.status !== "DONE")
          .map((t: any) => ({ id: t.taskId, title: t.title, dueDate: t.dueDate, daysLeft: getDaysLeft(t.dueDate) }))
          .filter((t: any) => t.daysLeft >= 0)
          .sort((a: any, b: any) => a.daysLeft - b.daysLeft);
        setUpcoming(list);
      })
      .catch(() => {});
  }, [open, workspaceId]);

  const calDays = getCalendarDays(calYear, calMonth);

  // 마감일이 있는 날짜 Set
  const dueDays = new Set(
    upcoming
      .filter((t) => {
        const d = new Date(t.dueDate);
        return d.getFullYear() === calYear && d.getMonth() === calMonth;
      })
      .map((t) => new Date(t.dueDate).getDate())
  );

  return (
    <>
      {open && <div className="drawer-backdrop" onClick={onClose} />}
      <div className={`planner-drawer ${open ? "open" : ""}`}>
        <div className="drawer-handle" onClick={onClose} />
        <div className="drawer-header">
          <span className="drawer-title">Planner</span>
          <button className="drawer-close" onClick={onClose}>✕</button>
        </div>

        <div className="drawer-cal-header">
          <button className="drawer-cal-nav" onClick={() => { if (calMonth === 0) { setCalYear(y => y-1); setCalMonth(11); } else setCalMonth(m => m-1); }}>‹</button>
          <span className="drawer-cal-title">{calYear}년 {calMonth + 1}월</span>
          <button className="drawer-cal-nav" onClick={() => { if (calMonth === 11) { setCalYear(y => y+1); setCalMonth(0); } else setCalMonth(m => m+1); }}>›</button>
        </div>

        <div className="drawer-cal-grid">
          {DAYS.map((d) => (
            <div key={d} className={`drawer-cal-label ${d === "일" ? "sun" : d === "토" ? "sat" : ""}`}>{d}</div>
          ))}
          {calDays.map((d, i) => {
            const isToday = d === TODAY.getDate() && calMonth === TODAY.getMonth() && calYear === TODAY.getFullYear();
            const hasDue  = d !== null && dueDays.has(d);
            return (
              <div key={i} className={`drawer-cal-day ${!d ? "empty" : ""} ${isToday ? "today" : ""}`}>
                {d}
                {hasDue && <span className="drawer-cal-dot" />}
              </div>
            );
          })}
        </div>

        <div className="drawer-upcoming-label">다가오는 마감일</div>
        {upcoming.length === 0 ? (
          <div className="drawer-empty">마감 예정 업무가 없습니다.</div>
        ) : (
          <div className="drawer-upcoming-list">
            {upcoming.map((t) => (
              <div key={t.id} className={`drawer-upcoming-item ${t.daysLeft <= 3 ? "urgent" : ""}`}>
                <span className="drawer-upcoming-title">{t.title}</span>
                <span className="drawer-upcoming-days">{t.daysLeft === 0 ? "오늘" : `D-${t.daysLeft}`}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
