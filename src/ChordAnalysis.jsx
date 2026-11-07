import { useEffect, useMemo, useState } from "react";
import {
  analyzeProgression,
  ANALYSIS_KEYS,
  chordMidis,
  diatonicTable,
  findKey,
  MAX_PROGRESSION_CHORDS,
  parseChord,
  parseProgression,
} from "./lib/chordAnalysis";
import { useChordPlayer } from "./useChordPlayer";

const INSTRUMENT = "acoustic_grand_piano";
const PROGRESSION_ID = "progression";

const tensionText = tensions => tensions.map(t => `${t.label}(${t.note})`).join(", ");

// 카드 내용: 조의 다이아토닉 코드·텐션 표, 직접 입력한 코드 진행 분석 (분석 내용은 저장하지 않음).
// 카드를 끄면 이 부분이 화면에서 빠져 소리가 멈추고, 다시 켜면 처음 상태로 보인다
function AnalysisBody() {
  const [view, setView] = useState("diatonic");
  const [tableKey, setTableKey] = useState("0:major");
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(null); // 분석한 글자 (아직 안 했으면 null)
  const [keyChoice, setKeyChoice] = useState("auto");
  const player = useChordPlayer();
  const stopPlayer = player.stop;

  const table = diatonicTable(tableKey);
  const tableMode = findKey(tableKey).mode;
  const parsed = useMemo(() => (submitted === null ? null : parseProgression(submitted)), [submitted]);
  const problem = !parsed
    ? ""
    : parsed.invalid.length
      ? `읽을 수 없는 코드: ${parsed.invalid.join(", ")}`
      : parsed.tooMany
        ? `코드는 ${MAX_PROGRESSION_CHORDS}개까지 분석할 수 있어요.`
        : parsed.chords.length === 0
          ? "코드를 입력해 주세요."
          : "";
  const result = useMemo(
    () => (parsed && !problem ? analyzeProgression(parsed.chords, keyChoice === "auto" ? null : keyChoice) : null),
    [parsed, problem, keyChoice],
  );

  // 보기·조·입력이 바뀌면 소리를 멈춘다
  useEffect(() => stopPlayer, [view, tableKey, text, submitted, keyChoice, stopPlayer]);

  function changeMode(mode) {
    const pitch = findKey(tableKey).pitch;
    setTableKey(`${pitch}:${mode}`);
  }

  function playRow(index) {
    const id = `row-${index}`;
    if (player.activeId === id) {
      stopPlayer();
      return;
    }
    player.play(INSTRUMENT, [chordMidis(parseChord(table[index].seventh))], id);
  }

  function analyze(e) {
    e.preventDefault();
    setSubmitted(text.trim());
  }

  function toggleProgression() {
    if (player.activeId === PROGRESSION_ID) {
      stopPlayer();
      return;
    }
    player.play(INSTRUMENT, result.items.map(item => chordMidis(item.chord)), PROGRESSION_ID);
  }

  const progressionActive = player.activeId === PROGRESSION_ID;
  const playingIndex = progressionActive ? player.playingIndex : null;

  return (
    <>
      <div className="metro-beats ana-options" role="group" aria-label="보기">
        {[["diatonic", "다이아토닉"], ["progression", "진행 분석"]].map(([value, label]) => (
          <button key={value} className={view === value ? "active" : ""} aria-pressed={view === value} onClick={() => setView(value)}>
            {label}
          </button>
        ))}
      </div>

      {view === "diatonic" ? (
        <>
          <div className="metro-beats ana-options" role="group" aria-label="장조 또는 단조">
            {[["major", "장조"], ["minor", "단조 (내추럴 마이너)"]].map(([mode, label]) => (
              <button key={mode} className={tableMode === mode ? "active" : ""} aria-pressed={tableMode === mode} onClick={() => changeMode(mode)}>
                {label}
              </button>
            ))}
          </div>
          <div className="drone-notes" role="group" aria-label="조">
            {ANALYSIS_KEYS.filter(key => key.mode === tableMode).map(key => (
              <button key={key.id} className={tableKey === key.id ? "active" : ""} aria-pressed={tableKey === key.id} onClick={() => setTableKey(key.id)}>
                {key.tonic}
              </button>
            ))}
          </div>

          <p className="metro-hint ana-caption">{findKey(tableKey).name}의 다이아토닉 코드 · 줄을 누르면 7화음을 들려줘요</p>
          <ul className="ana-table">
            {table.map((row, i) => (
              <li key={row.roman}>
                <button className={`ana-row ${player.activeId === `row-${i}` ? "playing" : ""}`} onClick={() => playRow(i)}>
                  <span className="ana-roman">{row.roman}</span>
                  <span className="ana-chords">
                    <strong>{row.triad}</strong> · {row.seventh}
                  </span>
                  <span className={`ana-func f-${row.function}`}>{row.function}</span>
                  <span className="ana-tension">텐션 {tensionText(row.tensions)}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <form className="ana-form" onSubmit={analyze}>
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="예: C G/B Am7 D7 G7 C"
              aria-label="분석할 코드 진행 (띄어쓰기로 구분)"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            <button className="primary-button" type="submit">분석</button>
          </form>
          <label className="ana-key">
            <span className="metro-label">조</span>
            <select value={keyChoice} onChange={e => setKeyChoice(e.target.value)} aria-label="분석할 조">
              <option value="auto">자동으로 찾기</option>
              {ANALYSIS_KEYS.map(key => (
                <option key={key.id} value={key.id}>{key.name}</option>
              ))}
            </select>
          </label>
          <p className="metro-hint ana-caption">코드는 띄어쓰기로 구분해요. 예: Cmaj7 Em7 A7 Dm7 G7 Cmaj7</p>

          {problem && <p className="tuner-error" role="alert">{problem}</p>}

          {result && (
            <div className="ana-result" aria-live="polite">
              <p className="ana-summary">
                {keyChoice === "auto" ? "어울리는 조" : "분석한 조"}: <strong>{result.key.name}</strong>{" "}
                ({result.items.length}개 중 {result.fits}개가 조 안의 코드)
              </p>

              {result.flows.length > 0 && (
                <ul className="ana-flows">
                  {result.flows.map(flow => (
                    <li key={`${flow.start}-${flow.label}`}>
                      <span>{result.items.slice(flow.start, flow.end + 1).map(item => item.chord.name).join(" → ")}</span>
                      <strong>{flow.label}</strong>
                    </li>
                  ))}
                </ul>
              )}

              <ol className="ana-items">
                {result.items.map((item, i) => (
                  <li key={i} className={`ana-item k-${item.kind} ${playingIndex === i ? "playing" : ""}`}>
                    <div className="ana-item-head">
                      <strong>{item.chord.name}</strong>
                      <span className="ana-roman">{item.roman}</span>
                      <span className="ana-kind">
                        {item.label}
                        {item.function && item.kind !== "secondary" && item.kind !== "subV" && item.kind !== "dominant" ? ` · ${item.function}` : ""}
                      </span>
                    </div>
                    <p className="ana-notes">
                      {item.notes.join(" · ")}
                      {item.chord.bass && ` (베이스 ${item.chord.bass})`}
                    </p>
                    {item.detail && <p className="ana-detail">{item.detail}</p>}
                    {item.tensions.length > 0 && <p className="ana-detail">텐션 {tensionText(item.tensions)}</p>}
                  </li>
                ))}
              </ol>

              <div className="metro-actions">
                <button className="primary-button" onClick={toggleProgression}>
                  {!progressionActive ? "들어보기" : player.loadingSound ? "불러오는 중…" : "정지"}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {player.audioError?.type === "unsupported" && <p className="time-error insp-error">이 브라우저에서는 소리를 낼 수 없어요.</p>}
      {player.audioError?.type === "load" && <p className="time-error insp-error">소리를 불러오지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.</p>}

      <p className="insp-credit">
        소리: FluidR3 GM (Frank Wen), <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">CC BY 3.0</a>,{" "}
        <a href="https://github.com/gleitz/midi-js-soundfonts" target="_blank" rel="noreferrer">midi-js-soundfonts</a>에서 가져옴
      </p>
    </>
  );
}

// 작업실 탭의 코드 분석 카드. 켜기·끄기는 App이 저장한다 (muselog-chord-analysis)
function ChordAnalysis({ settings, onChangeSettings }) {
  const { on } = settings;
  return (
    <section className="chart-card chord-analysis">
      <div className="chart-head">
        <h3>코드 분석</h3>
        <div className="metro-beats">
          <button className={on ? "active" : ""} aria-pressed={on} onClick={() => onChangeSettings({ on: !on })}>
            {on ? "켜짐" : "꺼짐"}
          </button>
        </div>
      </div>
      {on ? <AnalysisBody /> : <p className="chart-empty">코드 분석이 꺼져 있어요.</p>}
    </section>
  );
}

export default ChordAnalysis;
