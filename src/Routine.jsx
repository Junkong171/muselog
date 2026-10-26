import { useState } from "react";
import { MAX_ROUTINE_TITLE, routineProgress } from "./lib/routine";

// 루틴 항목 체크 목록. 작업실 카드와 대시보드 요약 카드가 함께 쓴다.
// onDelete가 없으면(대시보드) × 버튼을 그리지 않는다
export function RoutineChecklist({ items, done, onToggle, onDelete }) {
  return (
    <ul className="routine-list">
      {items.map(item => {
        const checked = done.includes(item.id);
        return (
          <li key={item.id} className={`routine-item ${checked ? "checked" : ""}`}>
            <button className="routine-check" aria-pressed={checked} onClick={() => onToggle(item.id)}>
              <span className="routine-box" aria-hidden="true">{checked ? "✓" : ""}</span>
              <span className="routine-title">{item.title}</span>
            </button>
            {onDelete && (
              <button className="routine-delete" onClick={() => onDelete(item.id)} aria-label={`${item.title} 삭제`}>
                ×
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// 작업실 맨 위의 "오늘의 루틴" 카드. 목록은 계속 남고, 체크는 그날에만 유효하다
function Routine({ items, done, onAdd, onToggle, onDelete }) {
  const [title, setTitle] = useState("");
  const progress = routineProgress(items, done);

  function addItem(e) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(title.trim());
    setTitle("");
  }

  return (
    <section className="chart-card routine">
      <div className="chart-head">
        <h3>오늘의 루틴</h3>
        <span>{progress.done} / {progress.total} 완료</span>
      </div>
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
        />
      </div>
      {progress.complete && <p className="routine-complete">오늘 루틴 완료!</p>}

      {items.length === 0 ? (
        <p className="chart-empty">매일 하는 기본기 연습을 추가해 보세요. (예: 크로매틱 워밍업)</p>
      ) : (
        <RoutineChecklist items={items} done={done} onToggle={onToggle} onDelete={onDelete} />
      )}

      <form className="routine-form" onSubmit={addItem}>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="루틴 항목 이름 (예: 메이저 스케일)"
          maxLength={MAX_ROUTINE_TITLE}
          aria-label="루틴 항목 이름"
        />
        <button className="primary-button" type="submit">추가</button>
      </form>
    </section>
  );
}

export default Routine;
