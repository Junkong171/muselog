// 튜너 계산 (순수 함수): 마이크 소리 조각에서 주파수 찾기, 주파수를 음 이름·센트로 바꾸기

export const A4_FREQUENCY = 440;
export const IN_TUNE_CENTS = 5; // 이만큼 안쪽이면 "맞음"

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const SOLFEGE = ["도", "도#", "레", "레#", "미", "파", "파#", "솔", "솔#", "라", "라#", "시"];

// 주파수 → 가장 가까운 음. cents = 그 음보다 얼마나 높은지(+)·낮은지(-), 반음 = 100센트
export function frequencyToNote(frequency, a4 = A4_FREQUENCY) {
  if (typeof frequency !== "number" || !Number.isFinite(frequency) || frequency <= 0) return null;
  const exact = 69 + 12 * Math.log2(frequency / a4); // MIDI 번호 (A4 = 69)
  const midi = Math.round(exact);
  const index = ((midi % 12) + 12) % 12;
  return {
    name: NOTE_NAMES[index],
    solfege: SOLFEGE[index],
    octave: Math.floor(midi / 12) - 1,
    cents: Math.round((exact - midi) * 100) || 0, // -0은 0으로
  };
}

// "in" = 맞음 / "flat" = 낮음 / "sharp" = 높음
export function tuningState(cents) {
  if (Math.abs(cents) <= IN_TUNE_CENTS) return "in";
  return cents < 0 ? "flat" : "sharp";
}

// 소리 조각(samples, -1~1 숫자 배열)의 기본 주파수(Hz). 소리가 너무 작거나 음 높이가 분명하지 않으면 null.
// 방법: 소리를 조금씩 밀어 가며 자기 자신과 얼마나 닮았는지(NSDF, 1에 가까울수록 닮음) 재고,
// 충분히 닮은 첫 봉우리의 간격을 한 주기로 본다. 첫 봉우리를 고르므로 배음 때문에 한 옥타브 낮게 잡히지 않는다.
export function detectPitch(samples, sampleRate, { minFrequency = 40, maxFrequency = 1500, minVolume = 0.002, minClarity = 0.6 } = {}) {
  const length = samples.length;
  const maxLag = Math.min(Math.floor(sampleRate / minFrequency), Math.floor(length / 2));
  const minLag = Math.max(2, Math.floor(sampleRate / maxFrequency));
  const window = length - maxLag;
  if (window <= 0 || minLag >= maxLag) return null;

  let power = 0;
  for (let i = 0; i < length; i++) power += samples[i] * samples[i];
  if (Math.sqrt(power / length) < minVolume) return null;

  // nsdf[lag] = 2·Σ x[i]x[i+lag] / Σ (x[i]² + x[i+lag]²), i는 0 ~ window-1
  const nsdf = new Float64Array(maxLag + 2);
  let headPower = 0;
  for (let i = 0; i < window; i++) headPower += samples[i] * samples[i];
  let tailPower = headPower;
  for (let lag = 0; lag <= maxLag + 1 && lag + window <= length; lag++) {
    if (lag > 0) tailPower += samples[lag + window - 1] ** 2 - samples[lag - 1] ** 2;
    let sum = 0;
    for (let i = 0; i < window; i++) sum += samples[i] * samples[i + lag];
    const total = headPower + tailPower;
    nsdf[lag] = total > 0 ? (2 * sum) / total : 0;
  }

  // 0에서 시작한 첫 언덕을 지나(값이 0 아래로 내려간 뒤) 나오는 봉우리들 중 가장 높은 것의 90% 이상인 첫 봉우리
  const peaks = [];
  let lag = 1;
  while (lag <= maxLag && nsdf[lag] > 0) lag++;
  for (; lag <= maxLag; lag++) {
    if (nsdf[lag] > 0 && nsdf[lag] >= nsdf[lag - 1] && nsdf[lag] > nsdf[lag + 1] && lag >= minLag) {
      peaks.push(lag);
    }
  }
  if (!peaks.length) return null;
  const highest = Math.max(...peaks.map(p => nsdf[p]));
  if (highest < minClarity) return null;
  const best = peaks.find(p => nsdf[p] >= highest * 0.9);

  // 봉우리 양옆 세 점으로 포물선을 그려 칸 사이의 정확한 위치를 찾는다
  const [a, b, c] = [nsdf[best - 1], nsdf[best], nsdf[best + 1]];
  const denominator = a - 2 * b + c;
  const shift = denominator === 0 ? 0 : (0.5 * (a - c)) / denominator;
  return sampleRate / (best + shift);
}
