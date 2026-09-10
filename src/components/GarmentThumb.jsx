import React from "react";
import { ImageOff } from "lucide-react";

export function GarmentThumb({ item }) {
  return <div className="garment-thumb">{item.image ? <img src={item.image} alt={item.name} loading="lazy" /> : <div className="missing-image"><ImageOff size={25} /><span>No photo yet</span></div>}</div>;
}
