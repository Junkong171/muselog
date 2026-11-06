import { useEffect, useState } from "react";
import {
  CHART_ROOTS,
  CHORD_TYPES,
  chartNotes,
  isBlackKey,
  KEYBOARD_FIRST,
  KEYBOARD_LAST,
  SCALE_TYPES,
} from "./lib/chordChart";
import { useChordPlayer } from "./useChordPlayer";

const INSTRUMENT = "acoustic_grand_piano";
const SCALE_NOTE_SECONDS = 0.4;
const PLAYER_ID = "chart";

// 건반 그림 크기 (SVG 안의 단위, 화면 너비에 맞춰 늘고 줄어든다)
const WHITE_WIDTH = 20;
const WHITE_HEIGHT = 84;
const BLACK_WIDTH = 12;
const BLACK_HEIGHT = 52;

const KEYS = (() => {
  const keys = [];
  let whiteIndex = 0;
  for (let midi = KEYBOARD_FIRST; midi <= KEYBOARD_LAST; midi++) {
    if (isBlackKey(midi)) {
      keys.push({ midi, black: true, x: whiteIndex * WHITE_WIDTH - BLACK_WIDTH / 2 });
    } else {
      keys.push({ midi, black: false, x: whiteIndex * WHITE_WIDTH });
      whiteIndex += 1;
    }
  }
  return { list: keys, width: whiteIndex * WHITE_WIDTH };
})();

function Keyboard({ marked, playing }) {
  const keyClass = key => {
    if (key.midi === playing) return "chart-key playing";
    return marked.has(key.midi) ? "chart-key marked" : "chart-key";
  };
  // 흰 건반을 먼저 그리고 검은 건반을 위에 그린다
  const whites = KEYS.list.filter(key => !key.black);
  const blacks = KEYS.list.filter(key => key.black);
  return (
    <svg className="chart-keyboard" viewBox={`0 0 ${KEYS.width} ${WHITE_HEIGHT}`} role="img" aria-label="피아노 건반 (C4부터 D6까지)">
      {whites.map(key => (
        <rect key={key.midi} className={`${keyClass(key)} white`} x={key.x + 0.5} y={0.5} width={WHITE_WIDTH - 1} height={WHITE_HEIGHT - 1} rx={2} />
      ))}
      {blacks.map(key => (
        <rect key={key.midi} className={`${keyClass(key)} black`} x={key.x} y={0.5} width={BLACK_WIDTH} height={BLACK_HEIGHT} rx={1.5} />
      ))}
    </svg>
  );
}

// 작업실 탭의 코드표·스케일표: 근음과 종류를 고르면 구성음과 건반을 보여 주고 피아노로 들려준다
function ChordChart() {
  const [kind, setKind] = useState("chord");
  const [root, setRoot] = useState(CHART_ROOTS[0].name);
  const [type, setType] = useState(CHORD_TYPES[0].value);
  const player = useChordPlayer();
  const stopPlayer = player.stop;

  const types = kind === "scale" ? SCALE_TYPES : CHORD_TYPES;
  const chart = chartNotes(kind, root, type);
  const marked = new Set(chart.notes.map(note => note.midi));
  const active = player.activeId === PLAYER_ID;
  const playingMidi = active && kind === "scale" && player.playingIndex !== null ? chart.notes[player.playingIndex]?.midi : null;

  // 고른 것이 바뀌면 소리를 멈춘다
  useEffect(() => stopPlayer, [kind, root, type, stopPlayer]);

  function changeKind(next) {
    if (next === kind) return;
    setKind(next);
    setType((next === "scale" ? SCALE_TYPES : CHORD_TYPES)[0].value);
  }

  function togglePlay() {
    if (active) {
      player.stop();
      return;
    }
    const midis = chart.notes.map(note => note.midi);
    if (kind === "scale") player.play(INSTRUMENT, midis.map(midi => [midi]), PLAYER_ID, SCALE_NOTE_SECONDS);
    else player.play(INSTRUMENT, [midis], PLAYER_ID);
  }

  return (
    <section className="chart-card chord-chart">
      <div className="chart-head">
        <h3>코드표·스케일표</h3>
        <div className="metro-beats" role="group" aria-label="코드 또는 스케일">
          {[["chord", "코드"], ["scale", "스케일"]].map(([value, label]) => (
            <button key={value} className={kind === value ? "active" : ""} aria-pressed={kind === value} onClick={() => changeKind(value)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="drone-notes" role="group" aria-label="근음">
        {CHART_ROOTS.map(option => (
          <button key={option.name} className={root === option.name ? "active" : ""} aria-pressed={root === option.name} onClick={() => setRoot(option.name)}>
            {option.name}
            <small>{option.solfege}</small>
          </button>
        ))}
      </div>

      <div className="metro-beats chart-types" role="group" aria-label={kind === "scale" ? "스케일 종류" : "코드 종류"}>
        {types.map(option => (
          <button key={option.value} className={type === option.value ? "active" : ""} aria-pressed={type === option.value} onClick={() => setType(option.value)}>
            {option.label}
          </button>
        ))}
      </div>

      <div className="chart-result" aria-live="polite">
        <strong>{chart.name}</strong>
        <p className="chart-notes">
          {chart.notes.map((note, i) => (
            <span key={i}>
              {i > 0 && " · "}
              <span className={note.midi === playingMidi ? "playing" : ""}>{note.name}</span>
            </span>
          ))}
        </p>
      </div>

      <Keyboard marked={marked} playing={playingMidi} />

      {player.audioError?.type === "unsupported" && <p className="time-error insp-error">이 브라우저에서는 소리를 낼 수 없어요.</p>}
      {player.audioError?.type === "load" && <p className="time-error insp-error">소리를 불러오지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.</p>}

      <div className="metro-actions">
        <button className="primary-button" onClick={togglePlay}>
          {!active ? "들어보기" : player.loadingSound ? "불러오는 중…" : "정지"}
        </button>
      </div>

      <p className="insp-credit">
        소리: FluidR3 GM (Frank Wen), <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">CC BY 3.0</a>,{" "}
        <a href="https://github.com/gleitz/midi-js-soundfonts" target="_blank" rel="noreferrer">midi-js-soundfonts</a>에서 가져옴
      </p>
    </section>
  );
}

export default ChordChart;
