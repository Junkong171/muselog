import { describe, expect, it } from "vitest";
import { detectPitch, frequencyToNote, tuningState } from "./tuner";

const RATE = 48000;
const SIZE = 4096;

// 기본 주파수 + 배음(2배, 3배 …) 소리 조각
function tone(frequency, harmonics = [1], volume = 0.5) {
  const samples = new Float32Array(SIZE);
  for (let i = 0; i < SIZE; i++) {
    let value = 0;
    harmonics.forEach((amp, k) => {
      value += amp * Math.sin((2 * Math.PI * frequency * (k + 1) * i) / RATE);
    });
    samples[i] = volume * value;
  }
  return samples;
}

// 늘 같은 결과가 나오는 잡음
function noise(volume) {
  let seed = 12345;
  const samples = new Float32Array(SIZE);
  for (let i = 0; i < SIZE; i++) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    samples[i] = volume * (seed / 1073741824 - 1);
  }
  return samples;
}

describe("frequencyToNote (주파수 → 음)", () => {
  it("440Hz는 A4 라, 0센트", () => {
    expect(frequencyToNote(440)).toEqual({ name: "A", solfege: "라", octave: 4, cents: 0 });
  });

  it("가온 도(261.63Hz)는 C4", () => {
    expect(frequencyToNote(261.63)).toMatchObject({ name: "C", solfege: "도", octave: 4, cents: 0 });
  });

  it("조금 높거나 낮으면 센트로 알려 준다", () => {
    expect(frequencyToNote(445)).toMatchObject({ name: "A", octave: 4, cents: 20 });
    expect(frequencyToNote(435)).toMatchObject({ name: "A", octave: 4, cents: -20 });
  });

  it("반음 사이 넘어가면 다음 음, 센트는 -50~+50", () => {
    expect(frequencyToNote(466.16)).toMatchObject({ name: "A#", solfege: "라#", octave: 4, cents: 0 });
    for (let f = 100; f < 1000; f += 7.3) {
      const { cents } = frequencyToNote(f);
      expect(Math.abs(cents)).toBeLessThanOrEqual(50);
    }
  });

  it("베이스 낮은 E(41.2Hz)는 E1", () => {
    expect(frequencyToNote(41.2)).toMatchObject({ name: "E", octave: 1 });
  });

  it("0, 음수, 숫자 아님은 null", () => {
    [0, -10, NaN, Infinity, "440", null, undefined].forEach(value => {
      expect(frequencyToNote(value)).toBeNull();
    });
  });
});

describe("tuningState (맞음·낮음·높음)", () => {
  it("±5센트 안은 맞음", () => {
    expect(tuningState(0)).toBe("in");
    expect(tuningState(5)).toBe("in");
    expect(tuningState(-5)).toBe("in");
  });

  it("그 밖은 낮음 / 높음", () => {
    expect(tuningState(-6)).toBe("flat");
    expect(tuningState(12)).toBe("sharp");
  });
});

describe("detectPitch (소리에서 주파수 찾기)", () => {
  const within1Percent = (found, expected) => {
    expect(found).not.toBeNull();
    expect(Math.abs(found - expected) / expected).toBeLessThan(0.01);
  };

  it("사인파: 베이스 E1부터 C6까지", () => {
    [41.2, 55, 82.41, 110, 196, 261.63, 440, 659.25, 1046.5].forEach(f => {
      within1Percent(detectPitch(tone(f), RATE), f);
    });
  });

  it("배음이 섞인 악기 소리도 기본 음을 찾는다 (옥타브를 잘못 잡지 않음)", () => {
    within1Percent(detectPitch(tone(82.41, [1, 0.8, 0.6, 0.4]), RATE), 82.41); // 기타 6번 줄 E2
    within1Percent(detectPitch(tone(110, [0.4, 1, 0.5]), RATE), 110); // 2배음이 더 큰 소리
    within1Percent(detectPitch(tone(329.63, [1, 0.5, 0.3]), RATE), 329.63); // 기타 1번 줄 E4
  });

  it("울리다 작아진 소리도 계속 찾는다 (한 번 잡고 멈추지 않게)", () => {
    within1Percent(detectPitch(tone(440, [1], 0.03), RATE), 440);
    within1Percent(detectPitch(tone(82.41, [1, 0.6, 0.3], 0.005), RATE), 82.41);
    within1Percent(detectPitch(tone(329.63, [1, 0.5], 0.005), RATE), 329.63);
  });

  it("거의 조용하면 null", () => {
    expect(detectPitch(noise(0.001), RATE)).toBeNull();
    expect(detectPitch(new Float32Array(SIZE), RATE)).toBeNull();
  });

  it("음 높이가 없는 잡음은 null", () => {
    expect(detectPitch(noise(0.3), RATE)).toBeNull();
  });

  it("44100Hz 마이크에서도 같은 결과", () => {
    const samples = new Float32Array(SIZE);
    for (let i = 0; i < SIZE; i++) samples[i] = 0.5 * Math.sin((2 * Math.PI * 440 * i) / 44100);
    within1Percent(detectPitch(samples, 44100), 440);
  });
});
