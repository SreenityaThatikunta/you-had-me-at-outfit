import React, { useState } from "react";
import { CloudSun, LocateFixed, LoaderCircle } from "lucide-react";

export function WeatherPanel({ weather, city, setCity, loading, error, onCity, onGeo }) {
  const [editing, setEditing] = useState(false);
  return <section className="weather-panel" aria-label="Local weather">
    <div className="weather-line">
      <div className="weather-summary" role="status">{loading ? <LoaderCircle className="spin" size={18} /> : <CloudSun size={18} />}<span>{loading ? "Checking the weather near you…" : weather ? <><strong>{Math.round(weather.tempC)}°C</strong><span className="weather-divider">/</span>{weather.condition}<span className="weather-place"> · {weather.place}</span></> : "Weather unavailable"}</span></div>
      {!loading && <button className="text-button" type="button" aria-expanded={editing || Boolean(error)} onClick={() => setEditing(!editing)}>Change location</button>}
    </div>
    {!loading && (editing || error) && <div className="weather-edit">
      {error && <p className="inline-error" role="status">{error}</p>}
      <form className="location-row" onSubmit={(event) => { event.preventDefault(); onCity(); setEditing(false); }}>
        <select aria-label="Weather city" required value={city} onChange={(event) => setCity(event.target.value)}><option value="" disabled>Choose a city</option>{["Hyderabad", "Mumbai", "Bengaluru", "Delhi", "New York", "London", "San Francisco"].map((name) => <option key={name}>{name}</option>)}</select>
        <button type="submit">Use city</button><button type="button" onClick={onGeo}><LocateFixed size={16} /> Use location</button>
      </form>
    </div>}
  </section>;
}
