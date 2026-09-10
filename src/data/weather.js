const WEATHER_CODES = {
  0: "clear",
  1: "mostly clear",
  2: "partly cloudy",
  3: "cloudy",
  45: "foggy",
  48: "foggy",
  51: "drizzle",
  53: "drizzle",
  55: "drizzle",
  61: "rain",
  63: "rain",
  65: "heavy rain",
  71: "snow",
  73: "snow",
  75: "snow",
  80: "showers",
  81: "showers",
  82: "heavy showers",
  95: "thunderstorm",
};

const CITY_COORDS = {
  "new york": { name: "New York", latitude: 40.7128, longitude: -74.006 },
  hyderabad: { name: "Hyderabad", latitude: 17.385, longitude: 78.4867 },
  mumbai: { name: "Mumbai", latitude: 19.076, longitude: 72.8777 },
  bengaluru: { name: "Bengaluru", latitude: 12.9716, longitude: 77.5946 },
  delhi: { name: "Delhi", latitude: 28.6139, longitude: 77.209 },
  london: { name: "London", latitude: 51.5072, longitude: -0.1276 },
  "san francisco": { name: "San Francisco", latitude: 37.7749, longitude: -122.4194 },
};

export function coordsForCity(city) {
  return CITY_COORDS[city.trim().toLowerCase()] || null;
}

export function fallbackCityCoords() {
  return CITY_COORDS.hyderabad;
}

export async function fetchOpenMeteoWeather(coords) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: coords.latitude,
    longitude: coords.longitude,
    current: "temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m",
    daily: "precipitation_probability_max",
    forecast_days: "1",
    timezone: "auto",
  });

  const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error("Weather is not reachable right now.");

  const data = await response.json();
  return {
    place: coords.name || "Current location",
    tempC: data.current.temperature_2m,
    feelsLikeC: data.current.apparent_temperature,
    condition: WEATHER_CODES[data.current.weather_code] || "mixed",
    rainChance: data.daily.precipitation_probability_max?.[0] ?? Math.round((data.current.precipitation || 0) * 20),
    windKph: data.current.wind_speed_10m,
  };
}
