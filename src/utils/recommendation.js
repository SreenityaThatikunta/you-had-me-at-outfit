import { groupByCategory } from "./wardrobe";

export function weatherMood(weather) {
  if (!weather) return "unknown";
  if (weather.rainChance >= 45 || weather.condition.includes("rain") || weather.condition.includes("showers")) return "rainy";
  if (weather.feelsLikeC >= 30) return "hot";
  if (weather.feelsLikeC <= 16) return "cold";
  if (weather.windKph >= 24) return "windy";
  return "mild";
}

function tempTarget(weather) {
  if (!weather) return 2;
  if (weather.feelsLikeC >= 30) return 1;
  if (weather.feelsLikeC >= 23) return 2;
  if (weather.feelsLikeC >= 16) return 3;
  return 4;
}

function formalityTarget(occasion) {
  return { college: 2, "weekend casual": 1, fancy: 3 }[occasion] ?? 2;
}

function tagMatch(tags, value) {
  if (tags.includes(value)) return true;
  if (value === "weekend casual") return tags.some((tag) => ["casual", "cozy", "street", "everyday"].includes(tag));
  if (value === "clean casual") return tags.includes("clean") || tags.includes("casual");
  if (value === "relaxed casual") return tags.some((tag) => ["casual", "cozy", "street", "everyday", "denim"].includes(tag));
  if (value === "fancy") return tags.includes("smart casual") || tags.includes("clean");
  if (value === "polished") return tags.includes("smart casual") || tags.includes("clean");
  return false;
}

function scoreItem(item, { weather, occasion, vibe }) {
  const tags = item.tags || [];
  const mood = weatherMood(weather);
  let score = 50;

  score -= Math.abs(item.warmth - tempTarget(weather)) * 10;
  score -= Math.abs(item.formality - formalityTarget(occasion)) * 8;

  if (tagMatch(tags, occasion)) score += 22;
  if (tagMatch(tags, vibe)) score += 18;
  if (mood === "hot" && tags.some((tag) => ["breathable", "summer", "airy"].includes(tag))) score += 20;
  if (mood === "rainy" && tags.some((tag) => ["rain", "utility", "errands"].includes(tag))) score += 18;
  if (mood === "cold" && item.category === "outerwear") score += 22;
  if (tags.includes("sleep") || tags.includes("home")) score -= 35;
  if (occasion === "fancy" && item.formality >= 3) score += 16;
  if (occasion === "fancy" && item.formality <= 1) score -= 16;
  if (occasion === "weekend casual" && item.formality <= 2) score += 12;
  if (occasion === "weekend casual" && item.formality >= 3) score -= 8;
  if (occasion === "college" && item.formality <= 2) score += 8;
  if (weather?.rainChance >= 45 && item.color.toLowerCase() === "#f8fafc") score -= 12;

  return score;
}

function colorDistance(a, b) {
  const parse = (hex) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
  const left = parse(a);
  const right = parse(b);
  return Math.sqrt(left.reduce((sum, channel, index) => sum + (channel - right[index]) ** 2, 0));
}

function scoreCombo(combo, context) {
  const base = combo.reduce((sum, item) => sum + scoreItem(item, context), 0);
  const [top, bottom] = combo;
  const distance = top && bottom ? colorDistance(top.color, bottom.color) : 120;
  const colorScore = distance > 95 && distance < 285 ? 18 : -6;
  const categoryScore = new Set(combo.map((item) => item.category)).size * 6;
  return base + colorScore + categoryScore;
}

function hasSleepwear(combo) {
  return combo.some((item) => item.tags?.some((tag) => ["sleep", "home"].includes(tag)));
}

export function recommendOutfit(items, context) {
  const byCategory = groupByCategory(items);
  const excludedTopIds = context.excludedTopIds || [];
  const availableTops = byCategory.top || [];
  const tops = availableTops.filter((top) => !excludedTopIds.includes(top.id));
  const bottoms = byCategory.bottom || [];
  const dresses = byCategory.dress || [];
  const shoes = byCategory.shoes || [];
  const layers = byCategory.outerwear || [];
  const shouldLayer = context.weather && (context.weather.feelsLikeC <= 19 || context.weather.rainChance >= 40);
  const candidates = [];

  for (const top of tops) {
    for (const bottom of bottoms) {
      const shoeList = shoes.length ? shoes : [null];
      for (const shoe of shoeList) {
        const base = [top, bottom, shoe].filter(Boolean);
        candidates.push(base);
        if (shouldLayer) layers.forEach((layer) => candidates.push([...base, layer]));
      }
    }
  }

  for (const dress of (context.occasion === "college" || context.allowDresses === false ? [] : dresses)) {
    const shoeList = shoes.length ? shoes : [null];
    for (const shoe of shoeList) {
      const base = [dress, shoe].filter(Boolean);
      candidates.push(base);
      if (shouldLayer) layers.forEach((layer) => candidates.push([...base, layer]));
    }
  }

  const ranked = candidates
    .map((combo) => ({ items: combo, score: scoreCombo(combo, context) }))
    .sort((a, b) => b.score - a.score);
  const everydayRanked = ranked.filter((outfit) => !hasSleepwear(outfit.items));
  const usableRanked = everydayRanked.length ? everydayRanked : ranked;
  const bestScore = usableRanked[0]?.score ?? 0;
  const closeMatches = usableRanked.filter((outfit) => outfit.score >= bestScore - 35).slice(0, 8);
  const rotationPool = closeMatches.length > 1 ? closeMatches : usableRanked.slice(0, 8);
  const index = context.shuffleKey % Math.max(rotationPool.length, 1);

  return rotationPool[index];
}

export function recommendWeeklyOutfits(items, context) {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const usedTopIds = [];

  return days.map((day, index) => {
    const isWeekend = index >= 5;
    const dayContext = {
      ...context,
      occasion: isWeekend ? "weekend casual" : "college",
      vibe: isWeekend ? "relaxed casual" : "clean casual",
      label: isWeekend ? "Weekend Casual" : "College Wear",
      allowDresses: false,
      excludedTopIds: usedTopIds,
      shuffleKey: (context.shuffleKey || 0) + index,
    };
    const outfit = recommendOutfit(items, dayContext) || recommendOutfit(items, { ...dayContext, excludedTopIds: [] });
    const top = outfit?.items.find((item) => item.category === "top");
    if (top) usedTopIds.push(top.id);

    return { day, styleLabel: dayContext.label, outfit };
  });
}

export function recommendMonthlyOutfits(items, context, baseDate = new Date()) {
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const monthStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === monthStart.getFullYear() && today.getMonth() === monthStart.getMonth();
  const leadingDays = (monthStart.getDay() + 6) % 7;
  const daysInMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0).getDate();
  const monthLabel = monthStart.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const totalSlots = Math.ceil((leadingDays + daysInMonth) / 7) * 7;
  const cells = [];
  let usedTopIds = [];

  for (let slot = 0; slot < totalSlots; slot += 1) {
    const dateNumber = slot - leadingDays + 1;
    const dayIndex = slot % 7;

    if (dayIndex === 0) usedTopIds = [];
    if (dateNumber < 1 || dateNumber > daysInMonth) {
      cells.push(null);
      continue;
    }

    const isWeekend = dayIndex >= 5;
    const dayContext = {
      ...context,
      occasion: isWeekend ? "weekend casual" : "college",
      vibe: isWeekend ? "relaxed casual" : "clean casual",
      label: isWeekend ? "Weekend Casual" : "College Wear",
      allowDresses: false,
      excludedTopIds: usedTopIds,
      shuffleKey: (context.shuffleKey || 0) + dateNumber + slot,
    };
    const outfit = recommendOutfit(items, dayContext) || recommendOutfit(items, { ...dayContext, excludedTopIds: [] });
    const top = outfit?.items.find((item) => item.category === "top");
    if (top) usedTopIds.push(top.id);

    cells.push({ dateNumber, dayIndex, isToday: isCurrentMonth && dateNumber === today.getDate(), styleLabel: dayContext.label, outfit });
  }

  return {
    monthLabel,
    weekdays,
    weeks: Array.from({ length: totalSlots / 7 }, (_, index) => cells.slice(index * 7, index * 7 + 7)),
  };
}

export function outfitReason(outfit, weather, occasion, vibe) {
  if (!outfit) return "Add at least one top and one bottom to get a recommendation.";
  if (!weather) return "An easy combination for " + occasion.toLowerCase() + ". Weather isn't available yet.";
  const mood = weatherMood(weather);
  const note = { hot: "Keeping it light for the heat", cold: "A little extra warmth for the chill", rainy: "Picked with rain in mind", windy: "Ready for a breezy day", mild: "An easy fit for a mild day" }[mood];
  return `${note}. Feels like ${Math.round(weather.feelsLikeC)}°C outside.`;
}
