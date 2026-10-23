import { NUMBER_WORDS } from "./quantity";

export interface DurationMatch {
  start: number;
  end: number;
  seconds: number;
  text: string;
}

const NUM = `(?:\\d+(?:[.,]\\d+)?|${Object.keys(NUMBER_WORDS).join("|")})`;
const HOURS = `(?:heures?|hrs?|h)`;
const MINUTES = `(?:minutes?|mins?|mn)`;
const SECONDS = `(?:secondes?|secs?|s)`;

/**
 * « 15 min », « 10 à 15 minutes », « 1 h 30 », « 1h30 », « 30 secondes »,
 * « une demi-heure », « un quart d'heure ».
 */
const DURATION_PATTERN = new RegExp(
  [
    `(?<half>une\\s+demi-heure)`,
    `(?<quarters>(?:(?<qcount>trois)\\s+)?(?:un\\s+)?quarts?\\s+d['’]heure)`,
    `(?<n1>${NUM})(?:\\s*(?:à|-|–|ou)\\s*(?<n2>${NUM}))?\\s*(?:` +
      `(?<h>${HOURS})(?:\\s*(?<hm>\\d{1,2})(?:\\s*${MINUTES})?)?` +
      `|(?<m>${MINUTES})(?:\\s*(?<ms>\\d{1,2})(?:\\s*${SECONDS})?)?` +
      `|(?<s>${SECONDS})` +
      `)`,
  ]
    .map((part) => `(?<![\\p{L}\\d])${part}(?![\\p{L}\\d])`)
    .join("|"),
  "giu",
);

function toNumber(raw: string): number {
  const word = NUMBER_WORDS[raw.toLowerCase()];
  return word ?? Number(raw.replace(",", "."));
}

/** Finds every duration written in a piece of text. */
export function findDurations(text: string): DurationMatch[] {
  const matches: DurationMatch[] = [];
  for (const match of text.matchAll(DURATION_PATTERN)) {
    const groups = match.groups ?? {};
    let seconds = 0;
    if (groups.half) {
      seconds = 30 * 60;
    } else if (groups.quarters) {
      seconds = (groups.qcount ? 3 : 1) * 15 * 60;
    } else if (groups.n1) {
      // For a range (« 10 à 15 min ») the timer uses the lower bound: check
      // early rather than overcook.
      const value = toNumber(groups.n1);
      if (groups.h)
        seconds = value * 3600 + (groups.hm ? Number(groups.hm) * 60 : 0);
      else if (groups.m)
        seconds = value * 60 + (groups.ms ? Number(groups.ms) : 0);
      else if (groups.s) seconds = value;
    }
    seconds = Math.round(seconds);
    if (seconds <= 0) continue;
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      seconds,
      text: match[0],
    });
  }
  return matches;
}

export function parseDurationMinutes(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value))
    return value > 0 ? value : null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;
  if (/^\d+(?:[.,]\d+)?$/.test(text)) return toNumber(text) || null;
  const iso = /^PT(?:(\d+)H)?(?:(\d+)M)?$/i.exec(text);
  if (iso) return Number(iso[1] ?? 0) * 60 + Number(iso[2] ?? 0) || null;
  const total = findDurations(text).reduce(
    (sum, match) => sum + match.seconds,
    0,
  );
  return total > 0 ? Math.round(total / 60) : null;
}

/** « 1 h 30 », « 45 min », « 30 s ». */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${String(rest).padStart(2, "0")}` : `${hours} h`;
}

/** Countdown display: « 4:05 », « 1:02:30 ». */
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.ceil(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const ss = String(seconds).padStart(2, "0");
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${ss}`
    : `${minutes}:${ss}`;
}
