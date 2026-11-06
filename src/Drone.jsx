import { useEffect, useRef, useState } from "react";
import { DRONE_MODES, DRONE_NOTES, DRONE_OCTAVES, droneFrequencies, droneLabel } from "./lib/drone";

const FADE_SEC = 0.3; // 켜고 끌 때, 음을 바꿀 때 소리가 커지고 작아지는 시간 (딸깍 소리 방지)

// 음량 막대(0~100) → 실제 소리 크기. 귀는 작은 소리 차이에 민감해서 제곱으로 바꾼다
function volumeGain(volume) {
  return (volume / 100) ** 2 * 0.6;
}

// 화음 하나를 만들어 0에서 부드럽게 키운다. 반환값 = { group, oscillators, key }
function startChord(audio, frequencies, key) {
  const { ctx, output } = audio;
  const now = ctx.currentTime;
  const group = ctx.createGain();
  group.gain.setValueAtTime(0, now);
  group.gain.linearRampToValueAtTime(1, now + FADE_SEC);
  group.connect(output);
  // 음이 많을수록 하나하나를 작게 해서 전체 크기를 비슷하게 맞춘다
  const each = 0.5 / Math.sqrt(frequencies.length);
  const oscillators = frequencies.map(frequency => {
    const osc = ctx.createOscillator();
    osc.type = "triangle"; // 부드러운 전자음
    osc.frequency.value = frequency;
    const gain = ctx.createGain();
    gain.gain.value = each;
    osc.connect(gain).connect(group);
    osc.start(now);
    return osc;
  });
  return { group, oscillators, key };
}

// 화음을 부드럽게 줄이고 멈춘다
function fadeOutChord(audio, chord) {
  const now = audio.ctx.currentTime;
  chord.group.gain.cancelScheduledValues(now);
  chord.group.gain.setValueAtTime(chord.group.gain.value, now);
  chord.group.gain.linearRampToValueAtTime(0, now + FADE_SEC);
  chord.oscillators.forEach(osc => osc.stop(now + FADE_SEC + 0.05));
}

// 작업실 탭의 기준음(드론): 고른 음을 끌 때까지 계속 울린다
function Drone({ settings, onChangeSettings }) {
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  const audioRef = useRef(null); // { ctx, master, output, chord }

  const { note, octave, mode, volume } = settings;
  const chordKey = `${note}-${octave}-${mode}`;

  function change(field, value) {
    onChangeSettings({ ...settings, [field]: value });
  }

  async function start() {
    setError("");
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      setError("이 브라우저에서는 소리를 낼 수 없어요.");
      return;
    }
    let audio = audioRef.current;
    if (!audio) {
      const ctx = new AudioCtx();
      const master = ctx.createGain();
      master.gain.value = volumeGain(volume);
      // 높은 배음을 깎아 귀에 덜 날카롭게
      const output = ctx.createBiquadFilter();
      output.type = "lowpass";
      output.frequency.value = 1800;
      output.connect(master).connect(ctx.destination);
      audio = { ctx, master, output, chord: null };
      audioRef.current = audio;
    }
    if (audio.ctx.state === "suspended") await audio.ctx.resume().catch(() => {});
    if (audio.chord) fadeOutChord(audio, audio.chord);
    audio.chord = startChord(audio, droneFrequencies({ note, octave, mode }), chordKey);
    setPlaying(true);
  }

  function stop() {
    const audio = audioRef.current;
    if (audio?.chord) {
      fadeOutChord(audio, audio.chord);
      audio.chord = null;
    }
    setPlaying(false);
  }

  // 울리는 중에 음·높이·울림을 바꾸면 이전 소리를 줄이면서 새 소리를 키운다 (끊기지 않게)
  useEffect(() => {
    const audio = audioRef.current;
    if (!playing || !audio?.chord || audio.chord.key === chordKey) return;
    fadeOutChord(audio, audio.chord);
    audio.chord = startChord(audio, droneFrequencies({ note, octave, mode }), chordKey);
  }, [playing, chordKey, note, octave, mode]);

  // 음량은 울리는 중에도 바로 적용
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.master.gain.setTargetAtTime(volumeGain(volume), audio.ctx.currentTime, 0.03);
  }, [volume]);

  // 탭을 떠나면(화면에서 사라지면) 소리를 멈추고 오디오를 닫는다
  useEffect(() => () => {
    audioRef.current?.ctx.close();
    audioRef.current = null;
  }, []);

  return (
    <section className="chart-card drone">
      <div className="chart-head">
        <h3>기준음</h3>
        <span>{droneLabel(settings)}</span>
      </div>
      <p className="tuner-intro">계속 울리는 음에 맞춰 노래하거나 연주해 보세요. 음정이 맞으면 소리가 하나로 겹쳐 들려요.</p>

      <div className="drone-notes" role="group" aria-label="음">
        {DRONE_NOTES.map(option => (
          <button
            key={option.value}
            className={note === option.value ? "active" : ""}
            aria-pressed={note === option.value}
            onClick={() => change("note", option.value)}
          >
            {option.solfege}
            <small>{option.name}</small>
          </button>
        ))}
      </div>

      <div className="metro-controls drone-options">
        <div className="metro-beats" role="group" aria-label="높이">
          {DRONE_OCTAVES.map(option => (
            <button
              key={option.value}
              className={octave === option.value ? "active" : ""}
              aria-pressed={octave === option.value}
              onClick={() => change("octave", option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="metro-beats" role="group" aria-label="울림">
          {DRONE_MODES.map(option => (
            <button
              key={option.value}
              className={mode === option.value ? "active" : ""}
              aria-pressed={mode === option.value}
              onClick={() => change("mode", option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <label className="drone-volume">
        <span className="metro-label">음량 {volume}</span>
        <input
          className="metro-slider"
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={e => change("volume", Number(e.target.value))}
          aria-label="기준음 음량"
        />
      </label>

      {error && <p className="tuner-error" role="alert">{error}</p>}

      <div className="metro-actions">
        <button className="primary-button" onClick={playing ? stop : start} aria-pressed={playing}>
          {playing ? "끄기" : "켜기"}
        </button>
      </div>
    </section>
  );
}

export default Drone;
