let context: AudioContext | null = null;

/**
 * Browsers only allow sound after a user gesture: call this from the click
 * that starts a timer so the alarm can ring later.
 */
export function unlockAudio(): void {
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume();
  } catch {
    context = null;
  }
}

/** Three short rising tones. */
export function playChime(): void {
  if (!context) unlockAudio();
  const audio = context;
  if (!audio) return;
  const start = audio.currentTime + 0.05;
  [880, 988, 1175].forEach((frequency, index) => {
    const at = start + index * 0.22;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.4, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.2);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(at);
    oscillator.stop(at + 0.22);
  });
}

export function vibrate(): void {
  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    // Not supported: nothing to do.
  }
}

/** Asks once for notifications so a finished timer can alert a hidden tab. */
export function requestNotifications(): void {
  if (typeof Notification === "undefined" || !window.isSecureContext) return;
  if (Notification.permission === "default")
    void Notification.requestPermission().catch(() => {});
}

export function notify(title: string, body: string, tag: string): void {
  if (
    typeof Notification === "undefined" ||
    Notification.permission !== "granted"
  )
    return;
  try {
    new Notification(title, { body, tag });
  } catch {
    // Some mobile browsers only allow notifications from a service worker.
  }
}
