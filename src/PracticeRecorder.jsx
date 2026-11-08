import { useCallback, useEffect, useRef, useState } from "react";
import { formatDuration } from "./lib/inspiration";
import {
  formatRecordingDate,
  MAX_PRACTICE_RECORDINGS,
  MAX_PRACTICE_SECONDS,
  recordingFileName,
  sortRecordings,
} from "./lib/practiceRecordings";
import {
  deletePracticeRecording,
  listPracticeRecordings,
  savePracticeRecording,
  useVoicePlayer,
  useVoiceRecorder,
} from "./voiceMemo";

// 작업실·연습실 탭의 연습 녹음: 녹음해서 이 기기에 저장하고, 다시 듣고, 파일로 내려받는다
function PracticeRecorder({ songs }) {
  const [recordings, setRecordings] = useState(null); // null = 불러오는 중
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [songId, setSongId] = useState("");
  const mountedRef = useRef(true);
  const songTitleRef = useRef("");
  const player = useVoicePlayer();
  const stopPlayer = player.stop;

  const songTitle = songs.find(song => String(song.id) === songId)?.title ?? "";
  useEffect(() => {
    songTitleRef.current = songTitle;
  }, [songTitle]);

  const reload = useCallback(() => {
    listPracticeRecordings()
      .then(list => {
        if (!mountedRef.current) return;
        setRecordings(sortRecordings(list));
        setLoadError("");
      })
      .catch(() => {
        if (!mountedRef.current) return;
        setRecordings([]);
        setLoadError("이 브라우저에서는 녹음을 저장할 수 없어요.");
      });
  }, []);

  // 녹음이 끝나면 바로 기기에 저장한다 (탭을 옮겨 화면이 사라진 뒤에도 저장)
  const recorder = useVoiceRecorder({
    maxSeconds: MAX_PRACTICE_SECONDS,
    onComplete: (blob, seconds) => {
      const now = new Date();
      savePracticeRecording({ id: now.getTime(), createdAt: now.toISOString(), seconds, songTitle: songTitleRef.current, blob })
        .then(() => {
          if (!mountedRef.current) return;
          setSaveError("");
          reload();
        })
        .catch(() => {
          if (mountedRef.current) setSaveError("녹음을 저장하지 못했어요. 기기 저장 공간을 확인해 주세요.");
        });
    },
  });
  const clearRecorder = recorder.clear;

  useEffect(() => {
    mountedRef.current = true;
    reload();
    return () => {
      mountedRef.current = false;
    };
  }, [reload]);

  // 저장한 녹음은 목록에 있으니 녹음 칸은 처음 상태로 돌린다
  useEffect(() => {
    if (recorder.status === "done") clearRecorder();
  }, [recorder.status, clearRecorder]);

  const recording = recorder.status === "recording" || recorder.status === "starting";
  const full = (recordings?.length ?? 0) >= MAX_PRACTICE_RECORDINGS;

  function startRecording() {
    stopPlayer();
    setSaveError("");
    recorder.start();
  }

  function download(item) {
    const url = URL.createObjectURL(item.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = recordingFileName(item.createdAt, item.blob.type);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  function remove(item) {
    if (!window.confirm("이 녹음을 삭제할까요?")) return;
    if (player.playingId === item.id) stopPlayer();
    deletePracticeRecording(item.id).then(reload).catch(() => setSaveError("녹음을 지우지 못했어요. 다시 눌러 주세요."));
  }

  return (
    <section className="chart-card practice-recorder">
      <div className="chart-head">
        <h3>연습 녹음</h3>
        <span>{recordings ? `${recordings.length} / ${MAX_PRACTICE_RECORDINGS}개` : ""}</span>
      </div>
      <p className="tuner-intro">녹음은 이 기기에만 저장되고 백업·계정에는 들어가지 않아요.</p>

      <div className="insp-record rec-controls">
        {recording ? (
          <>
            <span className="insp-record-time recording">
              ● 녹음 중 {formatDuration(recorder.seconds)} / {formatDuration(MAX_PRACTICE_SECONDS)}
            </span>
            <button className="primary-button" onClick={recorder.stop} disabled={recorder.status === "starting"}>
              녹음 끝
            </button>
          </>
        ) : (
          <>
            <select value={songId} onChange={e => setSongId(e.target.value)} aria-label="녹음할 연습곡">
              <option value="">자유 연습</option>
              {songs.map(song => (
                <option key={song.id} value={song.id}>{song.title}</option>
              ))}
            </select>
            <button className="primary-button" onClick={startRecording} disabled={full || !!loadError}>
              녹음 시작
            </button>
          </>
        )}
      </div>
      {full && !recording && <p className="tuner-error">녹음은 {MAX_PRACTICE_RECORDINGS}개까지 둘 수 있어요. 안 쓰는 녹음을 지워 주세요.</p>}
      {recorder.error && <p className="tuner-error" role="alert">{recorder.error}</p>}
      {(loadError || saveError) && <p className="tuner-error" role="alert">{loadError || saveError}</p>}
      {player.error && <p className="tuner-error" role="alert">{player.error.message}</p>}

      {recordings && recordings.length === 0 && !loadError && <p className="chart-empty">아직 녹음이 없어요.</p>}
      {recordings && recordings.length > 0 && (
        <ul className="rec-list">
          {recordings.map(item => (
            <li key={item.id} className="rec-item">
              <div className="rec-info">
                <strong>{item.songTitle || "자유 연습"}</strong>
                <span>{formatRecordingDate(item.createdAt)} · {formatDuration(item.seconds)}</span>
              </div>
              <div className="rec-actions">
                <button
                  className="practice-button"
                  onClick={() => (player.playingId === item.id ? stopPlayer() : player.play(item.id, item.blob))}
                  disabled={recording}
                >
                  {player.playingId === item.id ? "정지" : "듣기"}
                </button>
                <button className="practice-button" onClick={() => download(item)}>파일로 저장</button>
                <button className="practice-button" onClick={() => remove(item)} disabled={recording}>삭제</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default PracticeRecorder;
