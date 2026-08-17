const SOUND_ALERT_PREFERENCE_KEY = "noland_ops_new_request_sound_enabled";

let audioContext: AudioContext | null = null;

export type IdentifiableRequest = { id: number | string };

export function formatNewRequestAlert(count: number, label: string): string {
  return `${count} new ${label}${count === 1 ? "" : "s"} received.`;
}

export function getNewRequestIds<T extends IdentifiableRequest>(
  knownIds: ReadonlySet<string>,
  currentItems: readonly T[]
): string[] {
  return currentItems
    .map(item => String(item.id))
    .filter(id => !knownIds.has(id));
}

export function getStoredOpsSoundAlertPreference(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SOUND_ALERT_PREFERENCE_KEY) === "true";
}

export function setStoredOpsSoundAlertPreference(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SOUND_ALERT_PREFERENCE_KEY, String(enabled));
}

/**
 * Plays a short two-tone alert. The first user-enabled playback also unlocks
 * the browser audio context, so future polling alerts can be heard reliably.
 */
export async function playOpsNewRequestSound(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const AudioContextConstructor = window.AudioContext
    ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) return false;

  try {
    audioContext ??= new AudioContextConstructor();
    if (audioContext.state === "suspended") await audioContext.resume();

    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(740, now);
    oscillator.frequency.setValueAtTime(988, now + 0.14);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.36);
    return true;
  } catch {
    return false;
  }
}
