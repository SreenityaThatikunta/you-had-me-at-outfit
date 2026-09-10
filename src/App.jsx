import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { ClosetPanel } from "./components/ClosetPanel";
import { RecommendationPanel } from "./components/RecommendationPanel";
import { UploadPanel } from "./components/UploadPanel";
import { WeatherPanel } from "./components/WeatherPanel";
import { STARTER_ITEMS, STYLE_MODES } from "./data/wardrobe";
import { coordsForCity, fetchOpenMeteoWeather, fallbackCityCoords } from "./data/weather";
import { outfitReason, recommendMonthlyOutfits } from "./utils/recommendation";
import { groupByCategory } from "./utils/wardrobe";

export function App() {
  const [items, setItems] = useState(STARTER_ITEMS);
  const [view, setView] = useState(() => window.location.hash === "#closet" ? "closet" : "outfit");
  const [styleMode, setStyleMode] = useState("college");
  const [city, setCity] = useState("");
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState("");
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [shuffleKey, setShuffleKey] = useState(0);
  const weatherStarted = useRef(false);
  const weatherRequest = useRef(0);
  const selectedMode = STYLE_MODES.find((mode) => mode.id === styleMode) || STYLE_MODES[0];
  const context = useMemo(() => ({ weather, occasion: selectedMode.occasion, vibe: selectedMode.vibe, label: selectedMode.label, shuffleKey }), [weather, selectedMode, shuffleKey]);
  const monthlyOutfits = useMemo(() => recommendMonthlyOutfits(items, context), [items, context]);
  const todayPlan = useMemo(() => monthlyOutfits.weeks.flat().find((cell) => cell?.dateNumber === new Date().getDate()), [monthlyOutfits]);
  const outfit = todayPlan?.outfit || null;
  const grouped = useMemo(() => groupByCategory(items), [items]);

  useEffect(() => {
    const onHash = () => { setView(window.location.hash === "#closet" ? "closet" : "outfit"); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", onHash);
    if (!weatherStarted.current) { weatherStarted.current = true; loadLiveWeather(); }
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  async function loadWeather(coords, request) {
    try {
      const result = await fetchOpenMeteoWeather(coords);
      if (weatherRequest.current === request) setWeather(result);
    } catch (error) {
      if (weatherRequest.current === request) { setWeather(null); setWeatherError(error.message); }
    } finally {
      if (weatherRequest.current === request) setLoadingWeather(false);
    }
  }

  function loadCityWeather() {
    const coords = coordsForCity(city);
    if (!coords) { setWeatherError("Choose a city to check its weather."); return; }
    const request = ++weatherRequest.current;
    setLoadingWeather(true); setWeatherError("");
    loadWeather(coords, request);
  }

  function loadLiveWeather() {
    const request = ++weatherRequest.current;
    setLoadingWeather(true); setWeatherError("");
    const fail = (message) => {
      if (weatherRequest.current !== request) return;
      setWeatherError(message + " Showing Hyderabad weather for now.");
      loadWeather(fallbackCityCoords(), request);
    };
    if (!navigator.geolocation) { fail("Location is unavailable. Choose a city below."); return; }
    const fallbackTimer = window.setTimeout(() => fail("Location is taking too long."), 5000);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (weatherRequest.current !== request) return;
        window.clearTimeout(fallbackTimer);
        loadWeather({ name: "Near you", latitude: position.coords.latitude, longitude: position.coords.longitude }, request);
      },
      () => {
        window.clearTimeout(fallbackTimer);
        fail("Couldn't get your location. Choose a city or try again.");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  }

  return (
    <main className="app-shell">
      <header className="site-header">
        <a className="wordmark" href="#outfit">you had me at outfit<span className="brand-period">.</span></a>
        <a className="nav-link" href={view === "outfit" ? "#closet" : "#outfit"}>
          {view === "outfit" ? <>My closet <span className="nav-count">{items.length}</span><ArrowUpRight size={15} /></> : <><ArrowLeft size={15} /> Back to outfit</>}
        </a>
      </header>
      {view === "outfit" ? <>
        <div className="page-intro"><p className="eyebrow">THE DAILY PICK</p><h1>A little less deciding.<br /><em>A little more you.</em></h1></div>
        <WeatherPanel weather={weather} city={city} setCity={setCity} loading={loadingWeather} error={weatherError} onCity={loadCityWeather} onGeo={loadLiveWeather} />
        <RecommendationPanel styleMode={styleMode} setStyleMode={(mode) => { setStyleMode(mode); setShuffleKey(0); }} outfit={outfit} monthlyOutfits={monthlyOutfits} reason={outfitReason(outfit, weather, todayPlan?.styleLabel || context.label, todayPlan?.dayIndex >= 5 ? "relaxed casual" : "clean casual")} onShuffle={() => setShuffleKey((key) => key + 1)} />
      </> : <>
        <ClosetPanel items={items} grouped={grouped} onRemove={(id) => setItems((current) => current.filter((item) => item.id !== id))} />
        <details className="add-piece"><summary>Add a piece to your closet</summary><UploadPanel onAdd={(item) => setItems((current) => [item, ...current])} /></details>
      </>}
      <footer><span>Your clothes. A fresh combination.</span><span>Made for the everyday.</span></footer>
    </main>
  );
}
