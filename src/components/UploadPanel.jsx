import React, { useState } from "react";
import { Check, Loader2, Plus, Upload } from "lucide-react";
import { CATEGORIES } from "../data/wardrobe";
import { prepareClosetPhoto } from "../utils/imageImport";
import { splitTags } from "../utils/wardrobe";

function fileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Couldn't read that image."));
    reader.readAsDataURL(file);
  });
}

async function analyzeGarment(file) {
  if (file.size > 5 * 1024 * 1024) return null;
  const imageDataUrl = await fileAsDataUrl(file);
  const response = await fetch("/api/garment-analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageDataUrl }),
  });
  if (!response.ok) return null;
  const body = await response.json();
  return body.analysis || null;
}

export function UploadPanel({ onAdd }) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [analysisStatus, setAnalysisStatus] = useState("");
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
    if (!draft.name.trim() || processing) return;
    onAdd({
      ...draft,
      id: `${draft.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
      tags: splitTags(draft.tags),
      source: "custom",
      rawImage: undefined,
    });
    setDraft((current) => ({ ...current, name: "", image: null }));
  }

  async function importPhoto(file) {
    setProcessing(true);
    setError("");
    setAnalysisStatus("");

    try {
      const [prepared, analysis] = await Promise.all([
        prepareClosetPhoto(file),
        analyzeGarment(file).catch(() => null),
      ]);
      setDraft((current) => ({
        ...current,
        ...prepared,
        name: analysis?.name || current.name || file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
        category: analysis?.category || current.category,
        warmth: analysis?.warmth ?? current.warmth,
        formality: analysis?.formality ?? current.formality,
        tags: analysis?.tags?.join(", ") || current.tags,
      }));
      setAnalysisStatus(analysis ? "AI filled in the details — review anything you'd change." : "Photo cleaned up. Add any details you'd like.");
    } catch (importError) {
      setError(importError.message);
    } finally {
      setProcessing(false);
    }
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
          {processing ? <span><Loader2 className="spin" size={20} /> Reading your piece</span> : draft.image ? <img src={draft.image} alt="" /> : <span><Plus size={20} /> Upload photo</span>}
          <input
            type="file"
            accept="image/*"
            disabled={processing}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) importPhoto(file);
              event.target.value = "";
            }}
          />
        </label>
        {draft.image && <div className="import-status"><Check size={15} /> {analysisStatus || "Ready for outfit recommendations"}</div>}
        {error && <p className="inline-error">{error}</p>}
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
        <button className="primary" type="submit" disabled={processing || !draft.name.trim()}>
          {processing ? <Loader2 className="spin" size={17} /> : <Plus size={17} />}
          Add to recommendations
        </button>
      </form>
    </section>
  );
}
