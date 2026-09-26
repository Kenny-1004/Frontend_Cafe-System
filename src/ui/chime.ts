// Short two-note chime with the Web Audio API; silently skipped if the browser blocks audio
export function playChime(notes: number[] = [659.25, 880]) {
  try {
    const audio = new AudioContext()
    notes.forEach((frequency, index) => {
      const oscillator = audio.createOscillator()
      const gain = audio.createGain()
      const start = audio.currentTime + index * 0.22
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.55)
      oscillator.connect(gain).connect(audio.destination)
      oscillator.start(start)
      oscillator.stop(start + 0.6)
    })
    setTimeout(() => void audio.close(), 1_500)
  } catch {
    // audio is a nice-to-have
  }
}
