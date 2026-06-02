import { useState, useEffect } from "react";
import client from "../api/client";

interface Props {
  visible: boolean;
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

export default function WorkspacePlannerPanel({ visible, workspaceId }: Props) {
  const TODAY = new Date();
  const [calYear,  setCalYear]  = useState(TODAY.getFullYear());
  const [calMonth, setCalMonth] = useState(TODAY.getMonth());
  const [upcoming, setUpcoming] = useState<{ id: string; title: string; dueDate: string; daysLeft: number }[]>([]);

  useEffect(() => {
    if (!visible || !workspaceId) return;
    client.get(`/workspaces/${workspaceId}/tasks`)
      .then((res) => {
        const today = new Date(); today.setHours(0,0,0,0);
        const list = (res.data.data ?? [])
          .filter((t: any) => t.dueDate && t.status !== "DONE")
          .map((t: any) => {
            const due = new Date(t.dueDate); due.setHours(0,0,0,0);
            return { id: t.taskId, title: t.title, dueDate: t.dueDate, daysLeft: Math.ceil((due.getTime() - today.getTime()) / 86400000) };
          })
          .filter((t: any) => t.daysLeft >= 0)
          .sort((a: any, b: any) => a.daysLeft - b.daysLeft);
        setUpcoming(list);
      })
      .catch(() => {});
  }, [visible, workspaceId]);

  const calDays = getCalendarDays(calYear, calMonth);
  const dueDays = new Set(
    upcoming.filter((t) => { const d = new Date(t.dueDate); return d.getFullYear() === calYear && d.getMonth() === calMonth; })
            .map((t) => new Date(t.dueDate).getDate())
  );

  return (
    <aside className={`wsp-planner ${visible ? "panel-visible" : "panel-hidden"}`}>
      <div className="wsp-panel-title"><span className="wsp-panel-icon"></span> Planner</div>
      <div className="wsp-cal-header">
        <button className="wsp-cal-nav" onClick={() => { if (calMonth === 0) { setCalYear(y=>y-1); setCalMonth(11); } else setCalMonth(m=>m-1); }}>‹</button>
        <span className="wsp-cal-title">{calYear}년 {calMonth+1}월</span>
        <button className="wsp-cal-nav" onClick={() => { if (calMonth === 11) { setCalYear(y=>y+1); setCalMonth(0); } else setCalMonth(m=>m+1); }}>›</button>
      </div>
      <div className="wsp-cal-grid">
        {DAYS.map((d) => (
          <div key={d} className={`wsp-cal-day-label ${d==="일"?"sun":d==="토"?"sat":""}`}>{d}</div>
        ))}
        {calDays.map((d, i) => {
          const isToday = d === TODAY.getDate() && calMonth === TODAY.getMonth() && calYear === TODAY.getFullYear();
          const hasDue  = d !== null && dueDays.has(d);
          return (
            <div key={i} className={`wsp-cal-day ${!d?"empty":""} ${isToday?"today":""}`} style={{ position: "relative" }}>
              {d}
              {hasDue && <span style={{ position:"absolute", bottom:1, left:"50%", transform:"translateX(-50%)", width:4, height:4, borderRadius:"50%", background:"#f97316", display:"block" }} />}
            </div>
          );
        })}
      </div>
      <div className="wsp-upcoming-label">다가오는 마감일</div>
      {upcoming.length === 0
        ? <div className="wsp-upcoming-empty">마감일이 없습니다.</div>
        : <div className="wsp-upcoming-list">
            {upcoming.map((t) => (
              <div key={t.id} className={`wsp-upcoming-item ${t.daysLeft<=3?"urgent":""}`}>
                <span className="wsp-upcoming-title">{t.title}</span>
                <span className="wsp-upcoming-days">{t.daysLeft===0?"오늘":`D-${t.daysLeft}`}</span>
              </div>
            ))}
          </div>
      }
    </aside>
  );
}
