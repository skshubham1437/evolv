# 6. Web Audio API Synthesis for Focus Mode

Date: 2026-05-20

## Status

Accepted

## Context

Focus Mode includes ambient sound to aid concentration. The standard approach is to play pre-recorded audio files (MP3/WAV loops). An alternative is to synthesize audio programmatically using the Web Audio API.

## Decision

We will use the **Web Audio API** to synthesize ambient audio (binaural beats, rain wave shapes, white noise, forest ambience) directly in the browser. The waveform visualization is driven by real-time `AnalyserNode` data.

## Consequences

- **Pros:** No audio file downloads — instant playback with zero network cost. Prevents ear fatigue from looping static files. Dynamically adjustable parameters (frequency, amplitude). Interactive waveform visualization is driven by real audio data, not faked. Unique product differentiator vs. competitors using static MP3s.
- **Cons:** Higher CPU usage than decoding a compressed audio file. Browser compatibility varies for advanced Web Audio features. More complex code to maintain than a simple `<audio>` element.
- **Mitigations:** Audio synthesis is opt-in and only active during Focus Mode sessions. Falls back gracefully if Web Audio API is unavailable.
