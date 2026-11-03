import { useState } from "react";
import {
  formatIdeaChords,
  formatIdeaDate,
  MAX_IDEA_LENGTH,
  normalizeIdeas,
  sortIdeas,
} from "./lib/inspiration";

// 수첩 탭: 영감 탭에서 저장한 아이디어를 다시 보고 고치는 곳
function Notebook({ ideas, onChangeIdeas, onOpenInspiration }) {
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [editError, setEditError] = useState(false);

  function startEdit(idea) {
    setEditingId(idea.id);
    setEditingText(idea.text);
    setEditError(false);
  }

  function saveEdit(idea) {
    const [edited] = normalizeIdeas([{ ...idea, text: editingText }]);
    if (!edited) {
      setEditError(true);
      return;
    }
    onChangeIdeas(current => current.map(item => (item.id === idea.id ? edited : item)));
    setEditingId(null);
  }

  function deleteIdea(idea) {
    if (!window.confirm("이 아이디어를 삭제할까요?")) return;
    onChangeIdeas(current => current.filter(item => item.id !== idea.id));
    if (editingId === idea.id) setEditingId(null);
  }

  return (
    <>
      <section className="section-heading">
        <div>
          <p className="eyebrow">NOTEBOOK</p>
          <h2>수첩</h2>
          <p className="section-sub">적어 둔 아이디어를 다시 꺼내 봐.</p>
        </div>
      </section>

      <section className="chart-card">
        <div className="chart-head">
          <h3>아이디어</h3>
          <span>{ideas.length}개</span>
        </div>
        {ideas.length === 0 ? (
          <div className="insp-notebook-empty">
            <p className="chart-empty">아직 적어 둔 아이디어가 없어요.</p>
            <button className="cal-today-button" onClick={onOpenInspiration}>영감 탭으로 가기</button>
          </div>
        ) : (
          <div className="event-list">
            {sortIdeas(ideas).map(idea => (
              <div className="insp-idea" key={idea.id}>
                {editingId === idea.id ? (
                  <>
                    <textarea
                      value={editingText}
                      onChange={e => setEditingText(e.target.value)}
                      aria-label="아이디어 수정"
                      maxLength={MAX_IDEA_LENGTH}
                      rows={3}
                    />
                    {editError && <p className="time-error insp-error">메모를 적어 주세요.</p>}
                  </>
                ) : (
                  <p className="insp-idea-text">{idea.text}</p>
                )}
                <div className="insp-idea-foot">
                  <div className="insp-idea-meta">
                    {idea.createdAt && <span>{formatIdeaDate(idea.createdAt)}</span>}
                    {idea.keywords.length > 0 && <span>{idea.keywords.join(" · ")}</span>}
                    {idea.chords.length > 0 && <span>{formatIdeaChords(idea)}</span>}
                  </div>
                  {editingId === idea.id ? (
                    <>
                      <button className="practice-button" onClick={() => saveEdit(idea)}>수정 저장</button>
                      <button className="practice-button" onClick={() => setEditingId(null)}>취소</button>
                    </>
                  ) : (
                    <>
                      <button className="practice-button" onClick={() => startEdit(idea)}>수정</button>
                      <button className="practice-button" onClick={() => deleteIdea(idea)}>삭제</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

export default Notebook;
