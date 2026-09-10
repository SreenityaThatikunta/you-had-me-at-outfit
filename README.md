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

## Agent Skill

This repo includes a Codex skill at `.agents/skills/wardrobe-photo-polisher/SKILL.md`. People using Codex can use it to turn raw clothing or shoe photos into polished transparent catalog images, save them into `assets/generated-clothes/`, and wire the new pieces into `src/data/wardrobe.js`.
