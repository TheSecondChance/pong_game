# Modern Pong (Vanilla JS + Canvas)

A lightweight, dependency-free Pong game with a crisp, glassy UI, responsive canvas, and HiDPI-aware rendering.

## Overview

- Tech: HTML5 Canvas + Vanilla JavaScript + CSS
- Runs locally in any modern browser (no build step)
- Start paused with Play/Pause and Reset controls

## Features

- Smooth gameplay at device refresh rates (requestAnimationFrame)
- Mouse and keyboard controls (Arrow Up/Down, Space to toggle)
- CPU AI with speed clamping for fair play
- Physics with angled paddle bounces and progressive ball speed-up
- HUD with tabular-numeric scores and accessible ARIA labels
- HiDPI rendering for sharp visuals on retina displays
- Responsive layout and subtle glow/vignette effects

## How to Run

- Double-click `index.html` to open in your browser; or
- Serve the folder with a simple static server (optional):
  - VS Code Live Server extension; or any static server you prefer

## Controls

- Move: Mouse (follow) or Arrow Up/Down
- Pause/Resume: Space or the Play/Pause button
- Reset: Reset button

## Project Structure

```
index.html   # Page layout, HUD, canvas, and script includes
pong.js      # Game logic: input, physics, AI, rendering loop
style.css    # Modern glass UI, responsive styling, effects
```

## Customization

- Gameplay tuning: edit `CONFIG` in `pong.js` (paddle size/speed, ball speed/max, AI speed, net, glow)
- Canvas logical size: `index.html` sets `canvas` to 800×500; CSS maintains aspect ratio
- Visuals: tweak CSS variables in `:root` (`--accent`, `--accent-2`, backgrounds, shadows)

## Technical Notes

- HiDPI: the drawing buffer scales with `devicePixelRatio` and `ctx.setTransform(...)` so physics use logical pixels
- Collision: circle-vs-AABB with clamped max bounce angle; ball speed ramps up to a max
- Loop: paused state keeps rendering an overlay for a crisp UI

## Accessibility

- Buttons and score regions include ARIA labels
- Large, tabular-number score digits for readability

## Troubleshooting

- Blurry canvas: ensure your browser zoom is 100% and OS scaling is expected; HiDPI is handled automatically
- No input with keyboard: make sure the tab is focused; mouse input follows the pointer within the canvas
