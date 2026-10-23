import { describe, expect, it } from "vitest";

import {
  findDurations,
  formatClock,
  formatDuration,
  parseDurationMinutes,
} from "./duration";

const seconds = (text: string) =>
  findDurations(text).map((match) => match.seconds);

describe("findDurations", () => {
  it.each([
    ["laissez mijoter 15 min", [900]],
    ["cuire 10 minutes", [600]],
    ["enfournez 12 à 15 minutes", [720]],
    ["remuez 30 secondes", [30]],
    ["1 h 30 de cuisson", [5400]],
    ["cuire 1h30", [5400]],
    ["repos 2 heures", [7200]],
    ["une demi-heure au frais", [1800]],
    ["un quart d'heure", [900]],
    ["trois quarts d'heure", [2700]],
    ["deux minutes", [120]],
    ["revenir 3 min puis ajoutez l'ail 1 min", [180, 60]],
    ["1 min 30", [90]],
  ])("%s", (text, expected) => {
    expect(seconds(text)).toEqual(expected);
  });

  it("ignores numbers that are not durations", () => {
    expect(seconds("préchauffez à 180 °C, cubes de 2 cm, 3 sachets")).toEqual(
      [],
    );
  });

  it("returns the matched text and position", () => {
    expect(findDurations("Cuire 5 min.")).toEqual([
      { start: 6, end: 11, seconds: 300, text: "5 min" },
    ]);
  });
});

describe("parseDurationMinutes", () => {
  it.each([
    ["15 min", 15],
    ["1 h 15", 75],
    ["45", 45],
    ["PT1H10M", 70],
    [20, 20],
    ["", null],
    ["rapide", null],
  ])("%s", (value, expected) => {
    expect(parseDurationMinutes(value)).toBe(expected);
  });
});

describe("formatting", () => {
  it("formats durations for people", () => {
    expect(formatDuration(30)).toBe("30 s");
    expect(formatDuration(900)).toBe("15 min");
    expect(formatDuration(5400)).toBe("1 h 30");
    expect(formatDuration(7200)).toBe("2 h");
  });

  it("formats countdowns", () => {
    expect(formatClock(245)).toBe("4:05");
    expect(formatClock(3750)).toBe("1:02:30");
    expect(formatClock(-3)).toBe("0:00");
    expect(formatClock(59.2)).toBe("1:00");
  });
});
