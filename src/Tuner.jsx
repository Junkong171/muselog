import { useEffect, useRef, useState } from "react";
import { isInstalledApp, micErrorMessage } from "./lib/mic";
import { A4_FREQUENCY, detectPitch, frequencyToNote, tuningState } from "./lib/tuner";

const BUFFER_SIZE = 4096; // 한 번에 듣는 소리 길이 (48kHz에서 약 0.085초, 베이스 낮은 E도 몇 주기 들어감)
const LISTEN_EVERY_MS = 40; // 1초에 약 25번 다시 잰다
const HOLD_MS = 1000; // 소리가 멈춘 뒤 마지막 음을 흐리게 보여 주는 시간

const STATE_TEXT = { in: "맞음", flat: "낮음", sharp: "높음" };

function Tuner() {
  const [status, setStatus] = useState("off"); // off / starting / on
  const [error, setError] = useState("");
  const [reading, setReading] = useState(null); // { frequency, note, stale }

  const audioRef = useRef(null); // { stream, ctx, timer }
  const mountedRef = useRef(true);

  // 마이크와 오디오를 모두 놓는다 (주소창 마이크 표시가 사라짐)
  function release() {
    const audio = audioRef.current;
    audioRef.current = null;
    if (!audio) return;
    clearInterval(audio.timer);
    audio.stream.getTracks().forEach(track => track.stop());
    audio.ctx.close();
  }

  async function start() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("이 브라우저에서는 마이크를 쓸 수 없어요. 최신 크롬·엣지·사파리에서 열어 주세요.");
      return;
    }
    setStatus("starting");
    let stream;
    try {
      // 소리 보정(잡음 제거 등)을 끄면 음 높이가 덜 흔들린다
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch (e) {
      if (!mountedRef.current) return;
      setError(micErrorMessage(e, isInstalledApp()));
      setStatus("off");
      return;
    }
    // 허락을 기다리는 사이 다른 탭으로 옮겼으면 바로 끈다
    if (!mountedRef.current) {
      stream.getTracks().forEach(track => track.stop());
      return;
    }

    let ctx, analyser;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = ctx.createAnalyser();
      analyser.fftSize = BUFFER_SIZE;
      ctx.createMediaStreamSource(stream).connect(analyser);
    } catch {
      // 오디오 준비에 실패하면 이미 켠 마이크를 끄고 안내한다
      stream.getTracks().forEach(track => track.stop());
      ctx?.close();
      setError("이 브라우저에서는 튜너를 쓸 수 없어요. 최신 크롬·엣지·사파리에서 열어 주세요.");
      setStatus("off");
      return;
    }
    const samples = new Float32Array(BUFFER_SIZE);
    let heardAt = 0;
    let smoothed = null;

    const timer = setInterval(() => {
      analyser.getFloatTimeDomainData(samples);
      const frequency = detectPitch(samples, ctx.sampleRate);
      const now = performance.now();
      if (frequency) {
        // 같은 음이 이어지면 조금씩 따라가 숫자가 덜 떨리게, 음이 바뀌면 바로 새 값
        const sameNote = smoothed && Math.abs(12 * Math.log2(frequency / smoothed)) < 0.5;
        smoothed = sameNote ? smoothed * 0.5 + frequency * 0.5 : frequency;
        heardAt = now;
        setReading({ frequency: smoothed, note: frequencyToNote(smoothed), stale: false });
      } else if (now - heardAt > HOLD_MS) {
        smoothed = null;
        setReading(null);
      } else {
        setReading(current => (current && !current.stale ? { ...current, stale: true } : current));
      }
    }, LISTEN_EVERY_MS);

    audioRef.current = { stream, ctx, timer };
    setStatus("on");
  }

  function stop() {
    release();
    setReading(null);
    setStatus("off");
  }

  // 탭을 떠나면(화면에서 사라지면) 마이크를 끈다
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      release();
    };
  }, []);

  const note = reading?.note;
  const state = note ? tuningState(note.cents) : null;

  return (
    <section className="chart-card tuner">
      <div className="chart-head">
        <h3>튜너</h3>
        <span>A4 = {A4_FREQUENCY}Hz</span>
      </div>

      {status === "on" ? (
        <div className={`tuner-display${reading?.stale ? " stale" : ""}`} role="status" aria-live="polite">
          {note ? (
            <>
              <strong className="tuner-note">
                {note.name}
                <sub>{note.octave}</sub>
                <span> · {note.solfege}</span>
              </strong>
              <span className="tuner-frequency">{reading.frequency.toFixed(1)} Hz</span>
            </>
          ) : (
            <>
              <strong className="tuner-note waiting">—</strong>
              <span className="tuner-frequency">소리를 내 보세요</span>
            </>
          )}

          <div className="tuner-meter" aria-hidden="true">
            <div className="tuner-zone" />
            <div className="tuner-center" />
            {note && <div className={`tuner-needle ${state}`} style={{ left: `${50 + note.cents}%` }} />}
          </div>
          <div className="tuner-scale" aria-hidden="true">
            <span>-50</span>
            <span>0</span>
            <span>+50</span>
          </div>
          <p className={`tuner-state ${state ?? ""}`}>
            {note ? `${STATE_TEXT[state]} · ${note.cents > 0 ? "+" : ""}${note.cents}센트` : " "}
          </p>
        </div>
      ) : (
        <p className="tuner-intro">
          악기를 튕기거나 노래하면 가장 가까운 음과, 그 음보다 얼마나 높은지·낮은지 보여 줘요.
          마이크 소리는 이 브라우저 안에서만 계산하고 어디에도 보내지 않아요.
        </p>
      )}

      {error && <p className="tuner-error" role="alert">{error}</p>}

      <div className="metro-actions">
        <button className="primary-button" onClick={status === "on" ? stop : start} disabled={status === "starting"}>
          {status === "on" ? "튜너 끄기" : status === "starting" ? "마이크 켜는 중…" : "튜너 켜기"}
        </button>
      </div>
    </section>
  );
}

export default Tuner;
