import React, { useState } from "react";
import { Trash2 } from "lucide-react";
import { CATEGORIES, CATEGORY_LABELS } from "../data/wardrobe";
import { GarmentThumb } from "./GarmentThumb";

export function ClosetPanel({ items, grouped, onRemove }) {
  const [category, setCategory] = useState("all");
  const visibleCategories = category === "all" ? CATEGORIES : [category];
  return <section className="closet-panel">
    <div className="closet-intro"><h1>A closet, all yours.</h1></div>
    <div className="category-nav" aria-label="Filter closet by category"><button aria-pressed={category === "all"} onClick={() => setCategory("all")}>All <span>{items.length}</span></button>{CATEGORIES.map((value) => <button aria-pressed={category === value} key={value} onClick={() => setCategory(value)}>{CATEGORY_LABELS[value]} <span>{grouped[value]?.length || 0}</span></button>)}</div>
    <div className="closet-groups">{visibleCategories.map((value) => <section className="closet-group" key={value}><h2>{CATEGORY_LABELS[value]}<span>{grouped[value]?.length || 0}</span></h2>
      <div className="closet-list">{(grouped[value] || []).map((item) => <article className="closet-item" key={item.id}><GarmentThumb item={item} /><div className="closet-caption"><h3>{item.name}</h3><button type="button" className="remove-item" aria-label={`Remove ${item.name}`} onClick={() => onRemove(item.id)}><Trash2 size={15} /></button></div><p>{item.tags.slice(0, 2).join(" · ")}</p></article>)}</div>
      {!grouped[value]?.length && <p className="empty-category">No {CATEGORY_LABELS[value].toLowerCase()} yet.</p>}
    </section>)}</div>
  </section>;
}
