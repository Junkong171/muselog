import { useEffect, useState } from "react";
import {
  chordNames,
  chordNotes,
  drawKeywords,
  formatDuration,
  MAX_IDEA_LENGTH,
  MAX_RECORD_SECONDS,
  normalizeIdeas,
  progressionTokens,
} from "./lib/inspiration";
import { GENRES, INSTRUMENTS, KEYS, MOODS, PROGRESSIONS } from "./lib/inspirationData";
import { useChordPlayer } from "./useChordPlayer";
import { saveAudio, useVoicePlayer, useVoiceRecorder } from "./voiceMemo";

// 글자도 녹음도 없으면 undefined
function buildIdea(fields) {
  return normalizeIdeas([{ id: Date.now(), createdAt: new Date().toISOString(), ...fields }])[0];
}

function Inspiration({ ideaCount, onChangeIdeas, onOpenNotebook }) {
  const [keywords, setKeywords] = useState(() => drawKeywords());
  const [pinned, setPinned] = useState([false, false, false]);
  const [genre, setGenre] = useState(GENRES[0]);
  const [mood, setMood] = useState(MOODS[0]);
  const [songKey, setSongKey] = useState(KEYS[0]);
  const [progressionIndex, setProgressionIndex] = useState(0);
  const [instrumentId, setInstrumentId] = useState(INSTRUMENTS[0].id);
  const { loadingSound, playingIndex, audioError, play, stop: stopPlayback } = useChordPlayer();
  const [ideaText, setIdeaText] = useState("");
  const [withKeywords, setWithKeywords] = useState(true);
  const [withChords, setWithChords] = useState(true);
  const [ideaError, setIdeaError] = useState(false);
  const [audioSaveError, setAudioSaveError] = useState(false);
  const [savingIdea, setSavingIdea] = useState(false);
  const recorder = useVoiceRecorder();
  const voicePlayer = useVoicePlayer();
  const stopVoice = voicePlayer.stop;
  const recording = recorder.status === "starting" || recorder.status === "recording";

  const progressions = PROGRESSIONS[genre][mood];
  const progression = progressions[progressionIndex];
  const chords = chordNames(progression, songKey);

  // 진행·조·악기가 바뀌면 소리를 멈춘다
  useEffect(() => stopPlayback, [progression, songKey, instrumentId, stopPlayback]);

  function startPlayback() {
    stopVoice();
    play(instrumentId, progressionTokens(progression).map(token => chordNotes(token, songKey)));
  }

  function changeSelection(setter, value) {
    stopPlayback(); // 바뀐 진행의 코드가 우연히 같아도 멈춘다
    setter(value);
    setProgressionIndex(0);
  }

  function startRecording() {
    stopPlayback();
    stopVoice();
    setAudioSaveError(false);
    setIdeaError(false);
    recorder.start();
  }

  function clearRecording() {
    stopVoice();
    recorder.clear();
  }

  async function saveIdea(e) {
    e.preventDefault();
    if (recording || savingIdea) return;
    const audio = recorder.status === "done" ? recorder.blob : null;
    const idea = buildIdea({
      text: ideaText,
      keywords: withKeywords ? keywords : [],
      key: withChords ? songKey : "",
      chords: withChords ? chords : [],
      audioSeconds: audio ? recorder.seconds : 0,
    });
    if (!idea) {
      setIdeaError(true);
      return;
    }
    if (audio) {
      setSavingIdea(true);
      try {
        await saveAudio(idea.id, audio);
      } catch {
        setAudioSaveError(true);
        return;
      } finally {
        setSavingIdea(false);
      }
      stopVoice();
      recorder.clear();
    }
    onChangeIdeas(current => [...current, idea]);
    setIdeaText("");
    setIdeaError(false);
    setAudioSaveError(false);
  }

  return (
    <>
      <section className="section-heading">
        <div>
          <p className="eyebrow">SONGWRITING</p>
          <h2>영감</h2>
          <p className="section-sub">막막할 때 단어와 코드에서 시작해 봐.</p>
        </div>
      </section>

      <section className="chart-card">
        <div className="chart-head">
          <h3>키워드</h3>
          <button className="cal-today-button" onClick={() => setKeywords(drawKeywords(keywords, pinned))}>
            키워드 뽑기
          </button>
        </div>
        <div className="insp-keywords">
          {keywords.map((word, i) => (
            <button
              key={i}
              className={`insp-keyword ${pinned[i] ? "pinned" : ""}`}
              aria-pressed={pinned[i]}
              onClick={() => setPinned(current => current.map((value, k) => (k === i ? !value : value)))}
            >
              <strong>{word}</strong>
              <span>{pinned[i] ? "고정됨" : "고정"}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="chart-card">
        <div className="chart-head">
          <h3>코드 진행</h3>
          <span>{progressionIndex + 1} / {progressions.length}</span>
        </div>
        <div className="insp-selects">
          <label>
            장르
            <select value={genre} onChange={e => changeSelection(setGenre, e.target.value)}>
              {GENRES.map(option => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label>
            분위기
            <select value={mood} onChange={e => changeSelection(setMood, e.target.value)}>
              {MOODS.map(option => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label>
            조
            <select value={songKey} onChange={e => setSongKey(e.target.value)}>
              {KEYS.map(option => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label>
            악기
            <select value={instrumentId} onChange={e => setInstrumentId(e.target.value)}>
              {INSTRUMENTS.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
            </select>
          </label>
        </div>
        <div className="insp-chords">
          {chords.map((chord, i) => (
            <span key={i} className={`insp-chord ${playingIndex === i ? "playing" : ""}`}>{chord}</span>
          ))}
        </div>
        <div className="insp-actions">
          <button
            className="primary-button"
            onClick={() => (loadingSound || playingIndex !== null ? stopPlayback() : startPlayback())}
          >
            {loadingSound ? "불러오는 중…" : playingIndex === null ? "들어보기" : "정지"}
          </button>
          <button
            className="practice-button"
            onClick={() => setProgressionIndex(current => (current + 1) % progressions.length)}
          >
            다른 진행
          </button>
        </div>
        {audioError?.type === "unsupported" && <p className="time-error insp-error">이 브라우저에서는 소리를 낼 수 없어요.</p>}
        {audioError?.type === "load" && <p className="time-error insp-error">소리를 불러오지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.</p>}
        <p className="insp-credit">
          소리: FluidR3 GM (Frank Wen), <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">CC BY 3.0</a>,{" "}
          <a href="https://github.com/gleitz/midi-js-soundfonts" target="_blank" rel="noreferrer">midi-js-soundfonts</a>에서 가져옴
        </p>
      </section>

      <section className="chart-card">
        <div className="chart-head">
          <h3>아이디어 메모</h3>
          <span>떠오른 한 줄을 바로 적어 둬</span>
        </div>
        <form className="insp-form" onSubmit={saveIdea}>
          <textarea
            value={ideaText}
            onChange={e => setIdeaText(e.target.value)}
            placeholder="가사 한 줄, 곡 아이디어…"
            aria-label="아이디어 메모"
            maxLength={MAX_IDEA_LENGTH}
            rows={3}
          />
          <div className="insp-record">
            {recording ? (
              <>
                <span className="insp-record-time recording">● 녹음 중 {formatDuration(recorder.seconds)} / {formatDuration(MAX_RECORD_SECONDS)}</span>
                <button type="button" className="primary-button" onClick={recorder.stop} disabled={recorder.status === "starting"}>
                  녹음 끝
                </button>
              </>
            ) : recorder.status === "done" ? (
              <>
                <span className="insp-record-time">🎤 녹음 {formatDuration(recorder.seconds)}</span>
                <button
                  type="button"
                  className="practice-button"
                  onClick={() => {
                    if (voicePlayer.playingId) {
                      stopVoice();
                    } else {
                      stopPlayback();
                      voicePlayer.play("preview", recorder.blob);
                    }
                  }}
                >
                  {voicePlayer.playingId ? "정지" : "들어보기"}
                </button>
                <button type="button" className="practice-button" onClick={clearRecording}>지우기</button>
              </>
            ) : (
              <>
                <button type="button" className="practice-button" onClick={startRecording}>🎤 녹음</button>
                <span className="insp-record-hint">흥얼거린 멜로디를 최대 2분까지 녹음해 둬</span>
              </>
            )}
          </div>
          {recorder.error && <p className="time-error insp-error">{recorder.error}</p>}
          {voicePlayer.error && <p className="time-error insp-error">{voicePlayer.error.message}</p>}
          <div className="insp-form-row">
            <label>
              <input type="checkbox" checked={withKeywords} onChange={e => setWithKeywords(e.target.checked)} />
              키워드 함께 저장
            </label>
            <label>
              <input type="checkbox" checked={withChords} onChange={e => setWithChords(e.target.checked)} />
              코드 함께 저장
            </label>
            <button className="primary-button" type="submit" disabled={recording || savingIdea}>아이디어 저장</button>
          </div>
        </form>
        {ideaError && <p className="time-error insp-error">메모를 적어 주세요.</p>}
        {audioSaveError && <p className="time-error insp-error">녹음을 저장하지 못했어요. 저장 공간이 부족하지 않은지 확인하고 다시 눌러 주세요.</p>}
        <div className="insp-notebook-link">
          <span>저장한 아이디어 {ideaCount}개</span>
          <button className="cal-today-button" onClick={onOpenNotebook}>수첩 열기</button>
        </div>
      </section>
    </>
  );
}

export default Inspiration;
