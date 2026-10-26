# Sudoku

A simple, ad-free Sudoku that works on laptops and phones. Installs as an app and plays offline. No accounts, no tracking.

**Play:** [sudoku.tgoyal.me](https://sudoku.tgoyal.me)

## Features

- **Four difficulties**, graded by the techniques a person needs to solve them. Every puzzle has exactly one solution.
- **Daily puzzle**, the same for everyone, with a streak.
- **Hints that teach**: point at the area, explain the technique, then place the digit.
- **Challenges**: Blitz, Sudden Death, Pen Only, Fog and Purist, each with up to three stars.
- **11 themes**, each with its own colors, board style, keys and digits.
- **Keyboard shortcuts** for everything (press `?` in the app).
- Notes, undo/redo, zen mode, synthesized sounds and auto-save.

## Run locally

```bash
npm install
npm run dev
```

```bash
npm test
npm run build
```

Built with React 19 and Vite. Hosted on Cloudflare Pages, which deploys every push to `main`. Stats and saved games stay in your browser.
