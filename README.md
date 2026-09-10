# You Had Me at Outfit

A calm, weather-aware outfit picker for a personal wardrobe. It takes the decision out of getting dressed by choosing a practical look from the closet you already own.

**Live site:** [you-had-me-at-outfit.vercel.app](https://you-had-me-at-outfit.vercel.app/)

## Overview

The app has two focused views:

- **Today’s outfit** uses local weather and the wardrobe catalogue to suggest a look, explain the choice, and offer an alternative pick.
- **My closet** lets you browse the wardrobe by tops, bottoms, dresses, layers, and shoes.

The monthly view keeps the rotation practical: weekdays lean towards college/clean casual looks; weekends lean relaxed casual. It also avoids repeating the same top within a week where possible.

## Current features

- Weather-aware outfit recommendations using Open-Meteo and optional browser location.
- Deterministic, explainable outfit scoring based on temperature, rain, warmth, formality, tags, category coverage, and colour contrast.
- Daily and monthly outfit planning with weekly top rotation.
- Category-filtered closet browsing.
- Responsive, dark editorial UI with a custom wardrobe mark and favicon.
- Optimized WebP wardrobe assets committed in `public/wardrobe/`, so the full closet works on Vercel deployments.

## Technical details

| Area | Implementation |
| --- | --- |
| UI | React 19 with Vite |
| Styling | Plain CSS, no component library |
| Icons | Lucide React |
| Weather | Open-Meteo via `src/data/weather.js` |
| Recommendation engine | Local, deterministic scoring in `src/utils/recommendation.js` |
| Wardrobe metadata | `src/data/wardrobe.js` |
| Deployed garment images | `public/wardrobe/*.webp` |
| Hosting | Vercel static deployment |

The core recommendation flow does not need an API key. It runs in the browser from the wardrobe data plus the weather response.

### Recommendation model

Each garment has metadata such as category, dominant and accent colours, warmth, formality, and style tags. The scorer ranks valid combinations by:

- fit for perceived temperature and rain;
- occasion and vibe tags;
- practical layers in cold or wet conditions;
- balanced colour contrast and category coverage; and
- avoiding sleepwear and unnecessary repeats.

This is deliberately rules-based rather than generative, so the results remain quick and predictable.

## Run locally

```bash
npm install
npm run dev
```

The local server starts at the URL Vite prints, usually `http://localhost:5173`.

```bash
npm run build
npm run preview
```

## Project structure

```text
src/
  components/        UI panels and wardrobe cards
  data/              starter wardrobe and weather client
  utils/             recommendation and image-prep helpers
public/
  favicon.png        browser tab icon
  wardrobe/          optimized deployable garment images
```

`assets/` remains ignored because it contains high-resolution local source images. The deployable WebP copies live in `public/wardrobe/` instead.

## Parked features

These experiments remain in the codebase but are intentionally not exposed in the product UI.

### Personal closet uploads and AI garment tagging

`UploadPanel` can prepare a clothing photo locally and call `/api/garment-analysis` to prefill a garment name, category, warmth, dressiness, and tags. The “Add a piece to your closet” entry point is hidden while the personal-upload experience is being reconsidered.

The Vite development middleware reads `OPENAI_API_KEY` from `.env`; copy `.env.example` if you want to explore the prototype. Never expose that key through a `VITE_` variable. A production version would need a real serverless/API route and secret manager.

### AI photo polishing

`/api/polish-garment` is a proof of concept that uses image editing to make a catalog-style cutout and then removes a solid green backdrop locally. It is parked because image editing requires API credits and generated output needs a fidelity review before it is suitable for personal clothing photos.

### Wardrobe photo-polisher skill

For curating **starter wardrobe assets**, the repository includes [`wardrobe-photo-polisher`](.agents/skills/wardrobe-photo-polisher/SKILL.md). It turns raw source photos into transparent, polished catalogue assets and registers them in the wardrobe data. This is a development workflow, not a live app feature.

## Deployment notes

Vercel deploys from the GitHub repository. Because every image used by the live wardrobe is in `public/wardrobe/`, no local `assets/` folder is required for a production build.
