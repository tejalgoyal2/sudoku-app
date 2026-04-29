# Sudoku

A clean, ad-free Sudoku PWA. Algorithmically generated puzzles, 4 difficulty levels, timer, mistakes, streaks, dark/light mode. Works offline once installed.

## Local Development

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. The game is fully playable in the browser during development.

## Build & Preview

```bash
npm run build      # generates icons + builds production bundle
npm run preview    # serves the built files locally
```

---

## Deployment Guide: Cloudflare Pages + Your Domain

### Prerequisites

- A GitHub account (free)
- A Cloudflare account (you already have one — your DNS is there)
- Node.js 18+ installed on your computer
- Git installed on your computer

---

### Step 1: Set Up the Project Locally

Open your terminal and navigate to where you want the project:

```bash
# Clone or copy the project folder, then:
cd sudoku-app

# Install dependencies
npm install

# Test that it works
npm run dev
# Visit http://localhost:5173 in your browser
# Press Ctrl+C to stop the dev server when done
```

---

### Step 2: Create a GitHub Repository

1. Go to https://github.com/new
2. Repository name: `sudoku` (or whatever you like)
3. Set it to **Private** (unless you want it public)
4. Do NOT check "Add a README" (we already have one)
5. Click **Create repository**

GitHub will show you a page with setup instructions. Run these commands in your terminal (inside the `sudoku-app` folder):

```bash
git init
git add .
git commit -m "Initial commit - Sudoku PWA"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/sudoku.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

---

### Step 3: Connect Cloudflare Pages

1. Log in to https://dash.cloudflare.com
2. In the left sidebar, click **Workers & Pages**
3. Click **Create** (top right)
4. Click the **Pages** tab
5. Click **Connect to Git**
6. Authorize Cloudflare to access your GitHub (if first time)
7. Select your `sudoku` repository
8. Configure the build:
   - **Project name**: `sudoku` (this becomes `sudoku.pages.dev` temporarily)
   - **Production branch**: `main`
   - **Framework preset**: `None`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Node.js version** (under Environment variables): Add variable `NODE_VERSION` = `20`
9. Click **Save and Deploy**

Wait 1–2 minutes. Cloudflare will install dependencies, build the project, and deploy it. You'll see a green "Success" status and a URL like `sudoku.pages.dev`.

Visit that URL to verify it works.

---

### Step 4: Connect Your Domain (sudoku.tgoyal.me)

1. In Cloudflare Pages, go to your `sudoku` project
2. Click the **Custom domains** tab
3. Click **Set up a custom domain**
4. Enter: `sudoku.tgoyal.me` (or just `tgoyal.me` if you want it on the root domain)
5. Click **Continue**
6. Cloudflare will automatically add the DNS record since your domain is already on Cloudflare DNS. Click **Activate domain**
7. Wait a few minutes for DNS to propagate and SSL to activate

Your app is now live at `https://sudoku.tgoyal.me`.

---

### Step 5: Add to iPhone Home Screen

1. Open Safari on your iPhone
2. Go to `https://sudoku.tgoyal.me`
3. Tap the **Share** button (the square with an arrow at the bottom of the screen)
4. Scroll down and tap **Add to Home Screen**
5. It will show the app name "Sudoku" and the grid icon
6. Tap **Add**

The app now appears on your home screen with its own icon. When you open it:
- It runs in fullscreen (no Safari browser chrome)
- It works offline (service worker caches everything)
- No ads, no account, no tracking

---

### Updating the App

Whenever you want to make changes:

```bash
# Edit files locally
# Test with: npm run dev

# Push changes
git add .
git commit -m "description of changes"
git push
```

Cloudflare Pages auto-deploys on every push to `main`. The update is live in about 60 seconds. The service worker will auto-update on your phone next time you open the app.

---

## Project Structure

```
sudoku-app/
├── public/
│   ├── favicon.svg              ← SVG icon (source for PNGs)
│   └── icons/                   ← Generated PNG icons (by build script)
│       ├── icon-192.png
│       ├── icon-512.png
│       └── apple-touch-icon.png
├── src/
│   ├── App.jsx                  ← The entire Sudoku game
│   └── main.jsx                 ← React entry point
├── scripts/
│   └── generate-icons.js        ← Converts SVG → PNG icons
├── index.html                   ← App shell with PWA meta tags
├── package.json
├── vite.config.js               ← Vite + PWA plugin config
└── .gitignore
```

## Tech

- **Vite** — build tool
- **React 18** — UI
- **vite-plugin-pwa** — auto-generates service worker + manifest
- **sharp** — SVG → PNG icon conversion at build time
- **Cloudflare Pages** — free hosting with auto-deploy
- **localStorage** — all stats/streaks stored on-device

No backend. No database. No accounts. No ads. Free forever.
