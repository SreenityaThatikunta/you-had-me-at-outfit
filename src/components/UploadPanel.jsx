import React, { useState } from "react";
import { Plus, Upload } from "lucide-react";
import { CATEGORIES } from "../data/wardrobe";
import { splitTags } from "../utils/wardrobe";

export function UploadPanel({ onAdd }) {
  const [draft, setDraft] = useState({
    name: "",
    category: "top",
    color: "#d8dee9",
    accent: "#111827",
    warmth: 2,
    formality: 2,
    tags: "casual, clean",
    image: null,
  });

  function addItem(event) {
    event.preventDefault();
    if (!draft.name.trim()) return;
    onAdd({
      ...draft,
      id: `${draft.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
      tags: splitTags(draft.tags),
    });
    setDraft((current) => ({ ...current, name: "", image: null }));
  }

  return (
    <section className="panel upload-panel">
      <div className="section-heading">
        <div>
          <p>Wardrobe</p>
          <h2>Add a piece</h2>
        </div>
        <Upload size={24} />
      </div>
      <form onSubmit={addItem}>
        <label className="photo-drop">
          {draft.image ? <img src={draft.image} alt="" /> : <span><Plus size={20} /> Upload photo</span>}
          <input
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) setDraft((current) => ({ ...current, image: URL.createObjectURL(file), name: current.name || file.name.replace(/\.[^.]+$/, "") }));
            }}
          />
        </label>
        <input aria-label="Piece name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Black tee" />
        <div className="two-col">
          <select aria-label="Piece category" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>
            {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
          </select>
          <input aria-label="Piece color" type="color" value={draft.color} onChange={(event) => setDraft({ ...draft, color: event.target.value })} />
        </div>
        <div className="slider-field">
          <span>Warmth {draft.warmth}</span>
          <input aria-label="Warmth" type="range" min="0" max="5" value={draft.warmth} onChange={(event) => setDraft({ ...draft, warmth: Number(event.target.value) })} />
        </div>
        <div className="slider-field">
          <span>Dressy {draft.formality}</span>
          <input aria-label="Dressiness" type="range" min="0" max="5" value={draft.formality} onChange={(event) => setDraft({ ...draft, formality: Number(event.target.value) })} />
        </div>
        <input aria-label="Piece tags" value={draft.tags} onChange={(event) => setDraft({ ...draft, tags: event.target.value })} placeholder="casual, rain, college" />
        <button className="primary" type="submit">
          <Plus size={17} />
          Add piece
        </button>
      </form>
    </section>
  );
}
