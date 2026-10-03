// Tiny synthesized UI sounds (WebAudio, no asset files). Off until the user turns it on.
let audio: AudioContext | null = null;
let enabled = false;
let lastChime = 0;

export function setSoundEnabled(on: boolean) {
  enabled = on;
  if (on) audio ??= new AudioContext(); // created inside the toggle's click gesture
}

function tone(freq: number, duration: number, volume: number, type: OscillatorType = "sine") {
  if (!enabled || !audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
  osc.connect(gain).connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + duration);
}

export const sfx = {
  click: () => tone(660, 0.08, 0.05, "triangle"),
  // Throttled so a burst of backend events doesn't turn into a buzz.
  chime: () => {
    const now = performance.now();
    if (now - lastChime < 1500) return;
    lastChime = now;
    tone(880, 0.25, 0.03);
    setTimeout(() => tone(1320, 0.3, 0.025), 90);
  },
};
