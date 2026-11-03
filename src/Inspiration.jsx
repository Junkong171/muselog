import { useEffect, useRef, useState } from "react";
import {
  chordNames,
  chordNotes,
  drawKeywords,
  MAX_IDEA_LENGTH,
  normalizeIdeas,
  noteFileUrl,
  progressionNotes,
  progressionTokens,
} from "./lib/inspiration";
import { GENRES, INSTRUMENTS, KEYS, MOODS, PROGRESSIONS } from "./lib/inspirationData";

const CHORD_SECONDS = 2;

// 한 번 받은 음원은 다시 받지 않는다. 실패하면 다음에 다시 시도하도록 지운다
const noteFiles = new Map();

function fetchNoteFile(url) {
  if (!noteFiles.has(url)) {
    const request = fetch(url).then(response => {
      if (!response.ok) throw new Error(`음원을 받지 못함: ${url}`);
      return response.arrayBuffer();
    });
    request.catch(() => noteFiles.delete(url));
    noteFiles.set(url, request);
  }
  return noteFiles.get(url);
}

// 필요한 음을 모두 받아 { 음 번호: 소리 } 로 돌려준다
async function loadNotes(ctx, instrumentId, notes) {
  const buffers = await Promise.all(notes.map(async midi => {
    const file = await fetchNoteFile(noteFileUrl(instrumentId, midi));
    return [midi, await ctx.decodeAudioData(file.slice(0))];
  }));
  return Object.fromEntries(buffers);
}

// 코드 하나를 예약한다. 맨 앞 음이 베이스라 함께 울리고, 음이 많으면 소리가 뭉치지 않게 줄인다.
function scheduleChord(ctx, buffers, instrument, notes, time) {
  const end = time + CHORD_SECONDS;
  const level = instrument.gain * Math.min(1, 4 / notes.length);
  notes.forEach((midi, i) => {
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffers[midi];
    gain.gain.setValueAtTime(level, time);
    gain.gain.setValueAtTime(level, end - 0.08);
    gain.gain.linearRampToValueAtTime(0.0001, end);
    source.connect(gain).connect(ctx.destination);
    source.start(time + i * instrument.strum);
    source.stop(end);
  });
}

// 글자가 없으면 undefined
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
  const [loadingSound, setLoadingSound] = useState(false);
  const [playingIndex, setPlayingIndex] = useState(null); // 지금 나는 코드 번호, null = 재생 안 함
  const [audioError, setAudioError] = useState(null); // null / "unsupported" / "load"
  const [ideaText, setIdeaText] = useState("");
  const [withKeywords, setWithKeywords] = useState(true);
  const [withChords, setWithChords] = useState(true);
  const [ideaError, setIdeaError] = useState(false);
  const playbackRef = useRef(null); // { ctx, timer }

  const progressions = PROGRESSIONS[genre][mood];
  const progression = progressions[progressionIndex];
  const chords = chordNames(progression, songKey);

  function stopPlayback() {
    const playback = playbackRef.current;
    if (!playback) return;
    playbackRef.current = null;
    clearInterval(playback.timer);
    playback.ctx.close();
    setLoadingSound(false);
    setPlayingIndex(null);
  }

  // 진행·조·악기가 바뀌거나 다른 탭으로 가면(화면에서 사라지면) 소리를 멈춘다
  useEffect(() => stopPlayback, [progression, songKey, instrumentId]);

  async function startPlayback() {
    setAudioError(null);
    let ctx = null;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      ctx.resume().catch(() => {});
    } catch {
      ctx?.close();
      setAudioError("unsupported");
      return;
    }
    const playback = { ctx, timer: null };
    playbackRef.current = playback;
    setLoadingSound(true);
    try {
      const instrument = INSTRUMENTS.find(item => item.id === instrumentId);
      const buffers = await loadNotes(ctx, instrumentId, progressionNotes(progression, songKey));
      if (playbackRef.current !== playback) return; // 받는 동안 멈췄거나 선택이 바뀜
      setLoadingSound(false);
      const start = ctx.currentTime + 0.05;
      progressionTokens(progression).forEach((token, i) => {
        scheduleChord(ctx, buffers, instrument, chordNotes(token, songKey), start + i * CHORD_SECONDS);
      });
      setPlayingIndex(0);
      // 소리는 AudioContext가 정확히 내고, 화면 강조만 시계를 보고 따라간다
      playback.timer = setInterval(() => {
        const index = Math.floor((ctx.currentTime - start) / CHORD_SECONDS);
        if (index >= chords.length) stopPlayback();
        else setPlayingIndex(Math.max(0, index));
      }, 50);
    } catch {
      if (playbackRef.current !== playback) return;
      stopPlayback();
      setAudioError("load");
    }
  }

  function changeSelection(setter, value) {
    stopPlayback(); // 바뀐 진행의 코드가 우연히 같아도 멈춘다
    setter(value);
    setProgressionIndex(0);
  }

  function saveIdea(e) {
    e.preventDefault();
    const idea = buildIdea({
      text: ideaText,
      keywords: withKeywords ? keywords : [],
      key: withChords ? songKey : "",
      chords: withChords ? chords : [],
    });
    if (!idea) {
      setIdeaError(true);
      return;
    }
    onChangeIdeas(current => [...current, idea]);
    setIdeaText("");
    setIdeaError(false);
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
        {audioError === "unsupported" && <p className="time-error insp-error">이 브라우저에서는 소리를 낼 수 없어요.</p>}
        {audioError === "load" && <p className="time-error insp-error">소리를 불러오지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.</p>}
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
          <div className="insp-form-row">
            <label>
              <input type="checkbox" checked={withKeywords} onChange={e => setWithKeywords(e.target.checked)} />
              키워드 함께 저장
            </label>
            <label>
              <input type="checkbox" checked={withChords} onChange={e => setWithChords(e.target.checked)} />
              코드 함께 저장
            </label>
            <button className="primary-button" type="submit">아이디어 저장</button>
          </div>
        </form>
        {ideaError && <p className="time-error insp-error">메모를 적어 주세요.</p>}
        <div className="insp-notebook-link">
          <span>저장한 아이디어 {ideaCount}개</span>
          <button className="cal-today-button" onClick={onOpenNotebook}>수첩 열기</button>
        </div>
      </section>
    </>
  );
}

export default Inspiration;
