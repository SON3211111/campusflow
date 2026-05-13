import { useState, useEffect, useCallback } from "react";
import "./BoardSlideView.css";

interface CardItem {
  id: string;
  title: string;
  desc: string;
  comments: { user: string; text: string; time: string }[];
}

interface Props {
  visible: boolean;
  initialCards: CardItem[];
  gradient?: string;
  onCardClick?: (card: { title: string; desc: string; comments: any[] }) => void;
}

const STATUS_COLS = [
  { key: "none",       label: "상태 없음",    dot: "",  color: "#888" },
  { key: "notStarted", label: "시작하지 않음", dot: "●", color: "#aaa" },
  { key: "inProgress", label: "진행 중",       dot: "●", color: "#4f7cff" },
  { key: "hold",       label: "보류 중",       dot: "●", color: "#f59e0b" },
  { key: "done",       label: "완료",          dot: "●", color: "#22c55e" },
];

type ColMap = { [key: string]: CardItem[] };

export default function BoardSlideView({ visible, initialCards, gradient, onCardClick }: Props) {
  const [colMap, setColMap] = useState<ColMap>({
    none: [], notStarted: [], inProgress: [], hold: [], done: [],
  });
  const [draggingId, setDraggingId]   = useState<string | null>(null);
  const [draggingCol, setDraggingCol] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  useEffect(() => {
    setColMap((prev) => {
      const existingIds = new Set(Object.values(prev).flat().map((c) => c.id));
      const newCards = initialCards.filter((c) => !existingIds.has(c.id));
      if (newCards.length === 0) return prev;
      return { ...prev, none: [...prev.none, ...newCards] };
    });
  }, [initialCards]);

  const handleDragStart = (id: string, colKey: string) => {
    setDraggingId(id);
    setDraggingCol(colKey);
  };

  const saveStats = useCallback((map: ColMap) => {
    localStorage.setItem("board_stats", JSON.stringify({
      inProgress: map.inProgress.length,
      done: map.done.length,
      hold: map.hold.length,
      notStarted: map.notStarted.length,
    }));
  }, []);

  const handleDrop = (targetCol: string) => {
    if (!draggingId || !draggingCol || draggingCol === targetCol) return;
    setColMap((prev) => {
      const card = prev[draggingCol].find((c) => c.id === draggingId);
      if (!card) return prev;
      const next = {
        ...prev,
        [draggingCol]: prev[draggingCol].filter((c) => c.id !== draggingId),
        [targetCol]: [...prev[targetCol], card],
      };
      saveStats(next);
      return next;
    });
    setDraggingId(null);
    setDraggingCol(null);
    setDragOverCol(null);
  };

  return (
    <div className={`bsv-wrap ${visible ? "bsv-visible" : "bsv-hidden"}`}>
      <div className="bsv-columns">
        {STATUS_COLS.map((col) => (
          <div
            key={col.key}
            className={`bsv-column ${dragOverCol === col.key ? "drag-over" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.key); }}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={() => handleDrop(col.key)}
          >
            <div className="bsv-col-header">
              {col.dot && <span className="bsv-dot" style={{ color: col.color }}>{col.dot}</span>}
              <span className="bsv-col-title" style={{ color: col.color }}>{col.label}</span>
              <span className="bsv-col-count">{colMap[col.key].length}</span>
            </div>
            <div className="bsv-col-body">
              {colMap[col.key].map((card) => (
                <div
                  key={card.id}
                  className={`bsv-card ${draggingId === card.id ? "dragging" : ""}`}
                  draggable
                  onDragStart={() => handleDragStart(card.id, col.key)}
                  onDragEnd={() => { setDraggingId(null); setDraggingCol(null); }}
                  onClick={() => onCardClick?.({ title: card.title, desc: card.desc, comments: card.comments })}
                >
                  <span className="bsv-card-check" style={{ color: col.color }}>✔</span>
                  <span className="bsv-card-title">{card.title}</span>
                </div>
              ))}
              {colMap[col.key].length === 0 && (
                <div className="bsv-col-empty">업무 없음</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
