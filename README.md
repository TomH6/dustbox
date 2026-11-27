# Dustbox

An 8-pad phrase sampler that runs in the browser, inspired by the Boss SP-303 Dr. Sample.

**Play it:** https://tomh6.github.io/dustbox/

- 8 banks × 8 pads: load your own audio files or record from an audio interface (guitar, mic)
- Waveform trimming, one-shot/gate/loop/reverse, Standard/Long 22k/Lo-fi 11k quality, pitch
- Fit loops to tempo, and chop samples equally or on hits
- Effects chain: Filter + drive, Isolator, Bit crusher, Dust comp (vinyl-style squash, crackle and wow), Tape echo, Reverb
- Step sequencer: 8 patterns, swing, loose timing, live recording, and a metronome
- Resample, and bounce a pattern to a pad
- Undo/redo, WAV export, MIDI input (notes 36–43), and autosave in the browser

It's plain HTML, CSS and JavaScript, with no build step.

## Run it locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Project layout

- `index.html`: the markup
- `css/style.css`: all styles
- `js/`: the app, split by area and loaded in order (see `AGENTS.md`)
- `tools/check.sh`: the check that runs on every pull request

## Working on it

See [CONTRIBUTING.md](CONTRIBUTING.md) for how we work together, and [AGENTS.md](AGENTS.md) for how the code fits together. AI coding assistants also read `AGENTS.md`.
