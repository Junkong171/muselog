import { useEffect, useState } from "react";
import {
  formatDuration,
  formatIdeaChords,
  formatIdeaDate,
  ideaChordNotes,
  MAX_IDEA_LENGTH,
  normalizeIdeas,
  sortIdeas,
} from "./lib/inspiration";
import { INSTRUMENTS } from "./lib/inspirationData";
import { useChordPlayer } from "./useChordPlayer";
import { deleteAudio, loadAudio, savedAudioIds, useVoicePlayer } from "./voiceMemo";

// 수첩 탭: 영감 탭에서 저장한 아이디어를 다시 보고 고치는 곳
function Notebook({ ideas, onChangeIdeas, onOpenInspiration }) {
  const voice = useVoicePlayer();
  const stopVoice = voice.stop;
  // 이 기기에 녹음 파일이 있는 아이디어 id 목록 (null = 아직 확인 중)
  const [audioIds, setAudioIds] = useState(null);

  useEffect(() => {
    let cancelled = false;
    savedAudioIds()
      .then(ids => !cancelled && setAudioIds(new Set(ids)))
      .catch(() => !cancelled && setAudioIds(new Set()));
    return () => {
      cancelled = true;
    };
  }, [ideas]);

  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [editError, setEditError] = useState(false);
  const [instrumentId, setInstrumentId] = useState(INSTRUMENTS[0].id);
  const player = useChordPlayer();
  const stopPlayer = player.stop;

  // 악기를 바꾸면 소리를 멈춘다
  useEffect(() => stopPlayer, [instrumentId, stopPlayer]);

  function stopIfPlaying(idea) {
    if (player.activeId === idea.id) player.stop();
    if (voice.playingId === idea.id) stopVoice();
  }

  function toggleVoice(idea) {
    if (voice.playingId === idea.id) {
      stopVoice();
      return;
    }
    player.stop();
    voice.play(idea.id, () => loadAudio(idea.id));
  }

  function startEdit(idea) {
    stopIfPlaying(idea);
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
    stopIfPlaying(idea);
    onChangeIdeas(current => current.filter(item => item.id !== idea.id));
    if (idea.audioSeconds > 0) deleteAudio(idea.id).catch(() => {});
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
        {ideas.length > 0 && (
          <div className="insp-selects insp-notebook-instrument">
            <label>
              악기
              <select value={instrumentId} onChange={e => setInstrumentId(e.target.value)}>
                {INSTRUMENTS.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
              </select>
            </label>
          </div>
        )}
        {ideas.length === 0 ? (
          <div className="insp-notebook-empty">
            <p className="chart-empty">아직 적어 둔 아이디어가 없어요.</p>
            <button className="cal-today-button" onClick={onOpenInspiration}>영감 탭으로 가기</button>
          </div>
        ) : (
          <div className="event-list">
            {sortIdeas(ideas).map(idea => {
              const chordList = ideaChordNotes(idea.chords);
              const active = player.activeId === idea.id;
              const audioError = player.audioError?.id === idea.id ? player.audioError.type : null;
              const hasVoice = idea.audioSeconds > 0 && audioIds?.has(idea.id);
              const voiceMissing = idea.audioSeconds > 0 && audioIds && !audioIds.has(idea.id);
              return (
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
                  <p className="insp-idea-text">{idea.text || <span className="insp-idea-voice-only">음성 메모</span>}</p>
                )}
                <div className="insp-idea-foot">
                  <div className="insp-idea-meta">
                    {idea.createdAt && <span>{formatIdeaDate(idea.createdAt)}</span>}
                    {idea.audioSeconds > 0 && <span>🎤 {formatDuration(idea.audioSeconds)}</span>}
                    {idea.keywords.length > 0 && <span>{idea.keywords.join(" · ")}</span>}
                    {idea.chords.length > 0 && (
                      active && player.playingIndex !== null ? (
                        <span>
                          {idea.key && `${idea.key}조 · `}
                          {idea.chords.map((chord, i) => (
                            <span key={i}>
                              {i > 0 && " "}
                              <span className={player.playingIndex === i ? "insp-idea-chord playing" : "insp-idea-chord"}>{chord}</span>
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span>{formatIdeaChords(idea)}</span>
                      )
                    )}
                  </div>
                  {editingId === idea.id ? (
                    <>
                      <button className="practice-button" onClick={() => saveEdit(idea)}>수정 저장</button>
                      <button className="practice-button" onClick={() => setEditingId(null)}>취소</button>
                    </>
                  ) : (
                    <>
                      {hasVoice && (
                        <button className="practice-button" onClick={() => toggleVoice(idea)}>
                          {voice.playingId === idea.id ? "정지" : "녹음 듣기"}
                        </button>
                      )}
                      {chordList && (
                        <button
                          className="practice-button"
                          onClick={() => {
                            if (active) {
                              player.stop();
                            } else {
                              stopVoice();
                              player.play(instrumentId, chordList, idea.id);
                            }
                          }}
                        >
                          {!active ? "들어보기" : player.loadingSound ? "불러오는 중…" : "정지"}
                        </button>
                      )}
                      <button className="practice-button" onClick={() => startEdit(idea)}>수정</button>
                      <button className="practice-button" onClick={() => deleteIdea(idea)}>삭제</button>
                    </>
                  )}
                </div>
                {audioError === "unsupported" && <p className="time-error insp-error">이 브라우저에서는 소리를 낼 수 없어요.</p>}
                {audioError === "load" && <p className="time-error insp-error">소리를 불러오지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.</p>}
                {voiceMissing && editingId !== idea.id && <p className="insp-voice-missing">녹음은 녹음한 기기에서만 들을 수 있어요.</p>}
                {voice.error?.id === idea.id && <p className="time-error insp-error">{voice.error.message}</p>}
              </div>
              );
            })}
          </div>
        )}
        {ideas.length > 0 && (
          <p className="insp-credit">
            소리: FluidR3 GM (Frank Wen), <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">CC BY 3.0</a>,{" "}
            <a href="https://github.com/gleitz/midi-js-soundfonts" target="_blank" rel="noreferrer">midi-js-soundfonts</a>에서 가져옴
          </p>
        )}
      </section>
    </>
  );
}

export default Notebook;
