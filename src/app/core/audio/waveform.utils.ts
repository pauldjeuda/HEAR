export function generateTrackWaveform(seed: string | number = 'hear', count = 44): number[] {
  let hash = 0;
  const str = String(seed);
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }

  // Base envelope mimicking the user's uploaded image (starts low, swells, has dips & peaks, ends tapered)
  const pattern = [
    0.3, 0.45, 0.65, 0.85, 0.95, 0.75, 0.6, 0.8, 1.0, 0.88, 0.65, 0.5, 0.75, 0.9, 0.82, 0.6, 0.45,
    0.68, 0.92, 0.8, 0.55, 0.72, 0.88, 1.0, 0.85, 0.62, 0.48, 0.7, 0.86, 0.94, 0.78, 0.58, 0.42,
    0.66, 0.82, 0.9, 0.76, 0.58, 0.44, 0.6, 0.72, 0.5, 0.35, 0.22,
  ];

  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    const base = pattern[i % pattern.length];
    // Mild deterministic pseudorandom variation per song
    const pseudo = Math.abs(Math.sin((hash + (i + 1) * 31) * 0.17));
    const finalVal = Math.max(0.18, Math.min(1.0, base * 0.75 + pseudo * 0.25));
    bars.push(Math.round(finalVal * 100) / 100);
  }
  return bars;
}
