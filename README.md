# Sudoku

Nine boxes, nine digits, zero ads.

I wanted a Sudoku without banner ads, a coin shop or a pop-up begging for five stars after every puzzle. I couldn't find one, so I built one.

**Play it here:** [sudoku.tgoyal.me](https://sudoku.tgoyal.me)

![The home screen](docs/home.png)

## What's inside

- **A daily puzzle.** Same grid for everyone, so you can argue about it in the group chat. Easy on Monday, mean by Sunday.
- **Hints that teach.** First a nudge, then the actual technique explained on the board, then the move. Your brain does the work; the hint just holds the flashlight.
- **Challenges.** Blitz gives you a minute and trades seconds for correct digits. Sudden Death gives you one mistake. Fog only shows you what's near your cursor. Pen Only and Purist take your notes and hints away.
- **11 themes.** Each one has its own board, keys and digits, not just a new paint job.
- **Zen mode.** No timer, no mistakes counter, no side panel. Just you and 81 squares.
- **On your phone.** Add it to your home screen and it opens full screen, works offline and looks like a real app. No app store involved.

Every puzzle has exactly one solution and is graded by how a person would solve it, not by counting empty squares.

## Run it yourself

```bash
npm install
npm run dev
```

`npm test` checks the puzzle engine and the rules. `npm run build` builds the site, and every push to `main` goes live on Cloudflare Pages.

Built with React and Vite, plus a hand-written puzzle engine. No backend, no accounts, no tracking. Your stats never leave your browser, which is exactly where they belong.

Made by [Tejal Goyal](https://tgoyal.me).
