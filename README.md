# You Had Me at Outfit

A Vite + React outfit picker that recommends daily looks from a closet, style mode, and local weather.

## Features

- Daily outfit recommendation view
- Closet browsing grouped by garment category
- Style modes for college, cozy, going out, and polished looks
- Weather-aware suggestions using Open-Meteo
- Upload flow for adding new wardrobe pieces locally

## Setup

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Assets

Wardrobe images are stored locally in `assets/` and are intentionally ignored by Git. To run the current starter closet exactly as-is, add the referenced image files under `assets/generated-clothes/`.

The app source is committed without those private/local assets.

## AI garment details

When an image is added through **Add a piece to your closet**, the development server can use OpenAI vision to prefill the piece name, category, warmth, dressiness, and tags. The app keeps those fields editable and continues with the normal local image cleanup if AI is unavailable.

1. Copy `.env.example` to `.env`.
2. Set `OPENAI_API_KEY` to an OpenAI API key.
3. Run `npm run dev` normally.

The key stays in Vite's server process; do not use a `VITE_` prefix. The provided endpoint is for Vite development. Before deploying, move the same `/api/garment-analysis` handler to your host's serverless/API route and set `OPENAI_API_KEY` in that host's secret manager.

### Parked: adding personal closet pieces

The “Add a piece to your closet” interface is currently hidden from the app. Its upload and local-storage implementation remains in the codebase while the product direction for personal uploads is decided.

### Parked: AI photo polishing

The project contains a server-side `/api/polish-garment` proof of concept for creating a catalog-style cutout with image editing and removing a solid green background locally. The upload UI does not expose this feature right now. It is parked pending a decision on API credits, generated-image fidelity, and whether a browser-only background-removal option is preferable.

## Agent Skill

This repo includes a Codex skill at `.agents/skills/wardrobe-photo-polisher/SKILL.md`. People using Codex can use it to turn raw clothing or shoe photos into polished transparent catalog images, save them into `assets/generated-clothes/`, and wire the new pieces into `src/data/wardrobe.js`.
