# Working on Dustbox

This file is for anyone changing the code, people and AI coding assistants alike. Read it before you start.

## What this is

Dustbox is an 8-pad phrase sampler that runs in the browser and is inspired by the Boss SP-303. It is plain HTML, CSS and JavaScript, with no framework, no build step and no dependencies. It is hosted on GitHub Pages from the `main` branch: https://tomh6.github.io/dustbox/

## Run it locally

Serve the folder over http. Opening the file directly with `file://` works, but it disables the AudioWorklet and storage.

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

Before you push, run the same check the CI runs:

```sh
./tools/check.sh
```

If you change the sequencer, the scheduler or playback, also run the sequencer test. It plays a pattern for a few bars in headless Chrome and checks that each pad fires on the right steps, that hits are scheduled ahead of time, that sound comes out, and that Stop silences it. It serves the folder itself and needs Node 22 or later and Chrome or Edge.

```sh
node tools/seq-test.js            # options: --pattern 2, --bars 8, --shot playing.png, --chrome <path>
```

## How the code is organised

`index.html` holds the markup. `css/style.css` holds all styling. The JavaScript is split into files under `js/`, loaded as **classic scripts, in order**, at the end of `index.html`. They share one global scope: a `const` or `function` declared in an earlier file can be used in a later one. Keep the order in `index.html` the same as the list below. When you add a file, add a `<script>` tag in the right place.

| File | What's in it |
|---|---|
| `js/core.js` | Shared state (`S`, `pads`, `patterns`), helpers (`$`, `esc`, `clamp`), the audio graph (`master`, `fxIn`, `dry`) and the AudioWorklet source code |
| `js/effects.js` | Effect units (`mkUnit`, the `U` object) and `wire()` for the chain order |
| `js/pads.js` | The pad model (`mkPad`), the quality/reverse buffer cache, playback (`trigger`, `stopPad`) |
| `js/ui.js` | Undo/redo, `toast`, `ask`, and rendering of pads, the pad panel and the LCD |
| `js/waveform.js` | Waveform drawing, the playhead and start/end dragging |
| `js/files.js` | Loading audio files onto pads |
| `js/sequencer.js` | The scheduler (lookahead), swing, rolls, live recording and grid rendering. Step values: 1 = hit, 2 = soft hit, 3 = roll (two 32nd-note hits in one step). |
| `js/fx-panel.js` | The Effects tab UI |
| `js/input.js` | Sound-card input, channel routing, monitoring and the meter |
| `js/recording.js` | Record input, Resample and Bounce pattern |
| `js/chop.js` | Equal chops and onset detection |
| `js/export.js` | WAV encoding and downloads |
| `js/storage.js` | Autosave and loading from IndexedDB |
| `js/kit.js` | The synthesized starter kit and pattern |
| `js/midi.js` | MIDI input |
| `js/main.js` | Pad interaction, event bindings, the frame loop and startup. Always last. |

## Rules that keep things working

- **Undo:** call `pushUndo()` before any destructive change (load, record, chop, clear). For slider-style edits, call `gesture()`, which groups changes made within 0.8 s into one undo step.
- **Saving:** call `save()` after any change to the project. It is debounced. If you add a field to a pad, a pattern or `S`, make sure `doSave()` and `loadProject()` in `storage.js` keep it, and that older saved projects without the field still load.
- **User text:** file names and pad names come from users. Escape them with `esc()` before putting them in HTML, or set them with `textContent`.
- **Audio timing:** schedule sounds against `ctx.currentTime`, never with `setTimeout`. The sequencer schedules 120 ms ahead.
- **Two hosts:** the same code runs on GitHub Pages and as a Claude artifact. `inClaude` is true in the artifact, where microphone and MIDI access are blocked and downloads go through `window.claude.use('downloads')`. Don't remove those branches.
- **Phones:** every control needs a touch target of at least 44 px, and layouts must work at 360 px wide.
- **Style:** the UI text is in plain English and in sentence case. Keep the hardware look: rubber-grey body, dark LCD with soft green, and one coral accent (`--acc`).

## Git workflow

- Never push straight to `main`. Make a branch, for example `feature/song-mode` or `fix/gate-release`.
- Keep pull requests small and about one thing. Open one early as a draft if you want feedback.
- The other person reviews, then the pull request is squash-merged. GitHub Pages redeploys within a minute or two.
- Before starting work, run `git pull` on `main` and branch from it. If your branch is behind, merge `main` into it.
- Claim work by assigning yourself to the issue, so the two of you don't build the same thing.
