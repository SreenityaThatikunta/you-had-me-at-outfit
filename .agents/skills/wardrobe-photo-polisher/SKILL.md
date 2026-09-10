---
name: wardrobe-photo-polisher
description: Convert raw clothing or shoe photos in this wardrobe app into polished transparent catalog assets and wire them into the outfit picker.
---

# Wardrobe Photo Polisher

Use this skill when the user adds raw garment or shoe photos to `assets/` and asks to clean them up, polish them, correct existing wardrobe pieces, or make them usable in the outfit picker.

## Project Context

The app stores generated wardrobe cutouts in `assets/generated-clothes/` and registers them in `src/data/wardrobe.js`.

Each wardrobe item needs:

- A generated PNG asset with a transparent background.
- A `CLOTHING_IMAGES` entry pointing at that PNG.
- A `STARTER_ITEMS` entry with `id`, `name`, `category`, `color`, `accent`, `warmth`, `formality`, `tags`, and `image`.

Supported categories are `top`, `bottom`, `dress`, `outerwear`, and `shoes`.

## Workflow

1. Inspect the newest raw photos in `assets/`.
2. Make a small preview/contact sheet when there is more than one new source image, then visually identify each garment.
3. Generate one polished catalog cutout per source item using the built-in image generation flow.
4. Save every final project asset into `assets/generated-clothes/`; never leave app-referenced assets only in the default generated-images directory.
5. Update `src/data/wardrobe.js` with image imports and item metadata.
6. Regenerate `assets/generated-clothes/contact-sheet.png`.
7. Run `npm run build` and report whether it passes.

## Generation Guidance

Use the raw photo as the reference when possible. The output should look like a clean product catalog cutout:

- Isolated garment or shoe only.
- Front-facing or slight top-front product angle, depending on the item.
- Natural garment proportions and fabric texture.
- No person, bed, floor, hanger, props, watermark, or extra text.
- Preserve the garment identity: color, silhouette, sleeve length, neckline/collar, pockets, checks/stripes/graphics, and other visible details.

For best transparent results, prompt for a solid pure green `#00ff00` background, then remove it with the chroma-key helper:

```bash
python3 /Users/sreenityathatikunta/.codex/skills/.system/imagegen/scripts/remove_chroma_key.py \
  --input <generated-image.png> \
  --out assets/generated-clothes/<slug>.png \
  --key-color '#00ff00' \
  --soft-matte \
  --transparent-threshold 55 \
  --opaque-threshold 115 \
  --edge-feather 1 \
  --spill-cleanup \
  --force
```

If image generation returns an RGBA image with a real transparent background, copy that PNG directly into `assets/generated-clothes/`.

## Naming

Use stable lowercase slugs, for example:

- `white-samba-sneakers.png`
- `black-reebok-sneakers.png`
- `pastel-striped-button-shirt.png`
- `gray-check-trousers.png`

Prefer accurate item names over preserving an old mistaken slug. If changing a slug would touch many existing references, it is acceptable to keep the old filename and correct the user-facing `name` and `category`.

## Metadata Heuristics

Choose metadata that helps recommendations:

- `warmth`: `1` for sleeveless/light tees, `2` for shirts/light pants/shoes, `3` for jeans/trousers/layers, `4` for sweatshirts/winter layers.
- `formality`: `0` for sleep/homewear, `1` for casual tees/joggers/sweats, `2` for clean casual staples, `3` for button shirts/trousers/polished pieces.
- `tags`: use combinations such as `college`, `casual`, `everyday`, `street`, `clean`, `smart casual`, `cozy`, `winter`, `summer`, `denim`, `layer`, `home`, or `sleep`.

For shoes:

- White low-profile sneakers usually fit `["college", "casual", "clean", "everyday"]`.
- Black athletic sneakers usually fit `["college", "casual", "street", "everyday"]`.

## Blocked Graphic References

Graphic tees with recognizable characters, logos, or sensitive imagery can be blocked by image generation. If a reference-based attempt is blocked:

- Do not keep retrying the same blocked reference indefinitely.
- Generate a conservative, source-informed approximation without the reference image.
- Avoid recognizable IP, brand marks, readable lettering, or detailed weapons.
- Tell the user which item used an approximation.

## Verification

Before finishing:

- Use `file assets/generated-clothes/<slug>.png` to confirm final assets are RGBA PNGs.
- Refresh `assets/generated-clothes/contact-sheet.png` and visually inspect it.
- Run `npm run build`.
- Mention any missing source images, blocked references, or approximations in the final response.
