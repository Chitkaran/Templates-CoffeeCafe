# Maison Sorrel — Café & Artisanal Deli

Interactive scroll-driven café & artisanal deli web app built with React, Vite, Tailwind CSS, Motion, and Firebase Firestore/Authentication.

## Local Development

```bash
npm install
npm run dev
```

Runs at `http://localhost:3000`.

## Production Build

```bash
npm run build
```

Outputs a self-contained static bundle to `dist/` (including `dist/src/assets/*` images).

## Deploy to GitHub & Render

### 1. Push to GitHub
Push this repository to GitHub (via AI Studio's GitHub export or local `git`):

```bash
git init
git add .
git commit -m "Initial Maison Sorrel release"
git branch -M main
git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO>.git
git push -u origin main
```

### 2. Deploy on Render (Recommended: Static Site / Blueprint)
Because `render.yaml` is included at the repository root, you can deploy automatically:

- **Option A — Render Blueprint (Fastest):**
  1. In Render Dashboard, click **New + → Blueprint**.
  2. Connect your GitHub repository.
  3. Render reads `render.yaml` and creates the `maison-sorrel` Static Site automatically.

- **Option B — Manual Static Site:**
  1. In Render Dashboard, click **New + → Static Site**.
  2. Connect your GitHub repository.
  3. Set:
     - **Build Command:** `npm run build` (or `npm install && npm run build`)
     - **Publish Directory:** `dist`
  4. Under **Redirects / Rewrites**, add:
     - Source: `/*` → Destination: `/index.html` → Action: `Rewrite`

### 3. Authorize Your Render Domain in Firebase (Required for Live Text Editing)
Public visitors can read saved text immediately, and the owner (`chitkaran@gmail.com`) can long-press the **Maison Sorrel** logo (600ms) to edit and save text permanently to Firestore.

After Render gives you a URL (e.g. `https://maison-sorrel.onrender.com`):
1. Open [Firebase Console](https://console.firebase.google.com/) → project `gen-lang-client-0946939921`.
2. Go to **Authentication → Settings → Authorized domains**.
3. Click **Add domain** and add `maison-sorrel.onrender.com` (and your custom domain if you attach one).
