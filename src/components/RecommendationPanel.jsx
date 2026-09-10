import React from "react";
import { Shuffle } from "lucide-react";
import { STYLE_MODES } from "../data/wardrobe";
import { GarmentThumb } from "./GarmentThumb";

const labels = { top: "Top", bottom: "Bottom", shoes: "Shoes", dress: "Dress" };

function outfitCategories(outfit) {
  return outfit?.items.some((item) => item.category === "dress") ? ["dress", "shoes"] : ["top", "bottom", "shoes"];
}

function OutfitPieces({ outfit, compact = false }) {
  const categories = outfitCategories(outfit);
  return <div className={`outfit-stage ${categories.length === 2 ? "two-pieces" : ""} ${compact ? "compact" : ""}`} aria-live={compact ? undefined : "polite"}>
    {categories.map((category, index) => {
      const item = outfit?.items.find((piece) => piece.category === category);
      return <article className="outfit-piece" key={category}>
        <div className="piece-label"><span>{labels[category]}</span><span>0{index + 1}</span></div>
        {item ? <GarmentThumb item={item} /> : <div className="empty-piece">Add {category === "shoes" ? "shoes" : `a ${category}`} in <a href="#closet">your closet</a>.</div>}
        <div className="piece-caption"><h3>{item?.name || `No ${category} yet`}</h3><span>{item?.tags.slice(0, 2).join(" · ") || "Ready when you are"}</span></div>
      </article>;
    })}
  </div>;
}

function MonthOutfitPreview({ outfit }) {
  const pieces = ["top", "bottom", "shoes"].map((category) => ({ category, item: outfit?.items.find((piece) => piece.category === category) }));
  return <div className="month-preview">
    {pieces.map(({ category, item }) => <div className={`month-piece ${category}`} key={item?.id || category}>
      {item ? <GarmentThumb item={item} /> : <span />}
    </div>)}
  </div>;
}

export function RecommendationPanel({ styleMode, setStyleMode, outfit, monthlyOutfits, reason, onShuffle }) {
  const layer = outfit?.items.find((item) => item.category === "outerwear");
  return <section className="recommendation-panel" aria-label="Today's outfit">
    <div className="outfit-toolbar"><h2>Today's outfit</h2><label className="style-control"><span>Style mode</span><select aria-label="Style mode" value={styleMode} onChange={(event) => setStyleMode(event.target.value)}>{STYLE_MODES.map((mode) => <option value={mode.id} key={mode.id}>{mode.label}</option>)}</select></label></div>
    <OutfitPieces outfit={outfit} />
    {layer && <div className="layer-note"><GarmentThumb item={layer} /><span>Bring a layer<strong>{layer.name}</strong></span></div>}
    <div className="outfit-bottom"><p>{reason}</p><button className="primary shuffle" type="button" disabled={!outfit} onClick={onShuffle}><Shuffle size={16} /> Pick another</button></div>
    <div className="calendar-section">
      <div className="calendar-heading"><h2>{monthlyOutfits?.monthLabel || "Monthly outfits"}</h2></div>
      <div className="calendar-grid">
        {monthlyOutfits?.weekdays.map((day) => <div className="calendar-weekday" key={day}>{day}</div>)}
        {monthlyOutfits?.weeks.flatMap((week, weekIndex) => week.map((cell, dayIndex) => cell ? <article className={`calendar-day ${cell.dayIndex >= 5 ? "weekend" : ""} ${cell.isToday ? "today" : ""}`} key={`${weekIndex}-${dayIndex}`}>
          <div className="calendar-date"><span>{cell.dateNumber}</span></div>
          <MonthOutfitPreview outfit={cell.outfit} />
        </article> : <div className="calendar-day empty" key={`${weekIndex}-${dayIndex}`} />))}
      </div>
    </div>
  </section>;
}
