const CANVAS_SIZE = 760;
const EDGE_SAMPLE_STEP = 12;
const PIXEL_SAMPLE_STEP = 6;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function colorDistance(left, right) {
  return Math.sqrt((left.r - right.r) ** 2 + (left.g - right.g) ** 2 + (left.b - right.b) ** 2);
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't read that image."));
    };
    image.src = url;
  });
}

function averageBorderColor(data, width, height) {
  const totals = { r: 0, g: 0, b: 0, count: 0 };

  for (let y = 0; y < height; y += EDGE_SAMPLE_STEP) {
    for (let x = 0; x < width; x += EDGE_SAMPLE_STEP) {
      const isEdge = x < width * 0.12 || x > width * 0.88 || y < height * 0.12 || y > height * 0.88;
      if (!isEdge) continue;
      const index = (y * width + x) * 4;
      totals.r += data[index];
      totals.g += data[index + 1];
      totals.b += data[index + 2];
      totals.count += 1;
    }
  }

  return {
    r: totals.r / totals.count,
    g: totals.g / totals.count,
    b: totals.b / totals.count,
  };
}

function findSubjectBounds(data, width, height, background) {
  const threshold = 44;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let hits = 0;

  for (let y = 0; y < height; y += PIXEL_SAMPLE_STEP) {
    for (let x = 0; x < width; x += PIXEL_SAMPLE_STEP) {
      const index = (y * width + x) * 4;
      const pixel = { r: data[index], g: data[index + 1], b: data[index + 2] };
      const saturation = Math.max(pixel.r, pixel.g, pixel.b) - Math.min(pixel.r, pixel.g, pixel.b);
      if (colorDistance(pixel, background) < threshold && saturation < 38) continue;

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      hits += 1;
    }
  }

  if (hits < 12) return { x: 0, y: 0, width, height };

  const padX = (maxX - minX) * 0.14;
  const padY = (maxY - minY) * 0.14;
  return {
    x: clamp(minX - padX, 0, width),
    y: clamp(minY - padY, 0, height),
    width: clamp(maxX - minX + padX * 2, 1, width),
    height: clamp(maxY - minY + padY * 2, 1, height),
  };
}

function extractPalette(data, width, height, background) {
  const buckets = new Map();

  for (let y = 0; y < height; y += PIXEL_SAMPLE_STEP) {
    for (let x = 0; x < width; x += PIXEL_SAMPLE_STEP) {
      const index = (y * width + x) * 4;
      const pixel = { r: data[index], g: data[index + 1], b: data[index + 2] };
      if (colorDistance(pixel, background) < 50) continue;

      const key = [pixel.r, pixel.g, pixel.b].map((channel) => Math.round(channel / 32) * 32).join(",");
      const bucket = buckets.get(key) || { r: 0, g: 0, b: 0, count: 0 };
      bucket.r += pixel.r;
      bucket.g += pixel.g;
      bucket.b += pixel.b;
      bucket.count += 1;
      buckets.set(key, bucket);
    }
  }

  const colors = Array.from(buckets.values())
    .filter((bucket) => bucket.count > 1)
    .sort((a, b) => b.count - a.count)
    .map((bucket) => ({ r: bucket.r / bucket.count, g: bucket.g / bucket.count, b: bucket.b / bucket.count }));

  return {
    color: rgbToHex(colors[0] || { r: 216, g: 222, b: 233 }),
    accent: rgbToHex(colors.find((color) => colorDistance(color, colors[0] || background) > 80) || colors[1] || { r: 17, g: 24, b: 39 }),
  };
}

export async function prepareClosetPhoto(file) {
  const image = await loadImageFromFile(file);
  const scale = Math.min(1200 / image.naturalWidth, 1200 / image.naturalHeight, 1);
  const width = Math.round(image.naturalWidth * scale);
  const height = Math.round(image.naturalHeight * scale);
  const source = document.createElement("canvas");
  source.width = width;
  source.height = height;
  const sourceContext = source.getContext("2d", { willReadFrequently: true });
  sourceContext.drawImage(image, 0, 0, width, height);

  const sourceData = sourceContext.getImageData(0, 0, width, height);
  const background = averageBorderColor(sourceData.data, width, height);
  const bounds = findSubjectBounds(sourceData.data, width, height, background);
  const palette = extractPalette(sourceData.data, width, height, background);

  const output = document.createElement("canvas");
  output.width = CANVAS_SIZE;
  output.height = CANVAS_SIZE;
  const outputContext = output.getContext("2d");
  outputContext.fillStyle = "#f4f2ed";
  outputContext.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  const drawSize = CANVAS_SIZE * 0.82;
  const ratio = Math.min(drawSize / bounds.width, drawSize / bounds.height);
  const targetWidth = bounds.width * ratio;
  const targetHeight = bounds.height * ratio;
  const targetX = (CANVAS_SIZE - targetWidth) / 2;
  const targetY = (CANVAS_SIZE - targetHeight) / 2;

  outputContext.filter = "contrast(1.06) saturate(1.05) brightness(1.03)";
  outputContext.drawImage(source, bounds.x, bounds.y, bounds.width, bounds.height, targetX, targetY, targetWidth, targetHeight);

  return {
    image: output.toDataURL("image/jpeg", 0.88),
    ...palette,
  };
}

export function removeGreenScreen(imageDataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);

      for (let index = 0; index < pixels.data.length; index += 4) {
        const distance = Math.sqrt(
          pixels.data[index] ** 2
          + (pixels.data[index + 1] - 255) ** 2
          + pixels.data[index + 2] ** 2,
        );
        if (distance < 55) pixels.data[index + 3] = 0;
        else if (distance < 115) pixels.data[index + 3] = Math.round(((distance - 55) / 60) * pixels.data[index + 3]);
      }

      context.putImageData(pixels, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => reject(new Error("Couldn't prepare the polished image."));
    image.src = imageDataUrl;
  });
}
