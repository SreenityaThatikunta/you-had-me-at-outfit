import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const CATEGORIES = ["top", "bottom", "dress", "shoes", "outerwear"];

function sendJson(response, status, body) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(body));
}

function responseText(response) {
  const text = response.output
    ?.flatMap((item) => item.content || [])
    .find((content) => content.type === "output_text")?.text;
  if (!text) throw new Error("The AI response did not include garment details.");
  return JSON.parse(text);
}

function imageBlobFromDataUrl(imageDataUrl) {
  const match = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error("Please upload an image file.");
  return new Blob([Buffer.from(match[2], "base64")], { type: match[1] });
}

function garmentAnalysisApi(env) {
  return {
    name: "garment-analysis-api",
    configureServer(server) {
      server.middlewares.use("/api/garment-analysis", async (request, response) => {
        if (request.method !== "POST") return sendJson(response, 405, { error: "Method not allowed." });
        if (!env.OPENAI_API_KEY) return sendJson(response, 503, { error: "AI setup is not complete." });

        try {
          let body = "";
          for await (const chunk of request) {
            body += chunk;
            if (body.length > MAX_IMAGE_BYTES * 1.4) throw new Error("Image is too large. Choose one under 5 MB.");
          }
          const { imageDataUrl } = JSON.parse(body);
          if (typeof imageDataUrl !== "string" || !imageDataUrl.startsWith("data:image/")) {
            return sendJson(response, 400, { error: "Please upload an image file." });
          }

          const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: env.OPENAI_GARMENT_MODEL || "gpt-5.6-luna",
              instructions: "You classify one garment for a personal wardrobe app. Use only visible details. Never identify people or infer body, age, gender, ethnicity, or a brand unless it is clearly printed on the garment.",
              input: [{ role: "user", content: [
                { type: "input_text", text: "Identify this garment and assign practical outfit-planning metadata." },
                { type: "input_image", image_url: imageDataUrl, detail: "low" },
              ] }],
              text: { format: { type: "json_schema", name: "garment_metadata", strict: true, schema: {
                type: "object", additionalProperties: false,
                properties: {
                  name: { type: "string" },
                  category: { type: "string", enum: CATEGORIES },
                  warmth: { type: "integer", minimum: 0, maximum: 5 },
                  formality: { type: "integer", minimum: 0, maximum: 5 },
                  tags: { type: "array", items: { type: "string" }, maxItems: 6 },
                },
                required: ["name", "category", "warmth", "formality", "tags"],
              } } },
            }),
          });
          if (!openAiResponse.ok) {
            console.error("Garment analysis failed", await openAiResponse.text());
            return sendJson(response, 502, { error: "AI analysis is temporarily unavailable." });
          }
          return sendJson(response, 200, { analysis: responseText(await openAiResponse.json()) });
        } catch (error) {
          console.error("Garment analysis failed", error);
          return sendJson(response, 400, { error: error.message || "Couldn't analyze that photo." });
        }
      });
    },
  };
}

function garmentPolishApi(env) {
  return {
    name: "garment-polish-api",
    configureServer(server) {
      server.middlewares.use("/api/polish-garment", async (request, response) => {
        if (request.method !== "POST") return sendJson(response, 405, { error: "Method not allowed." });
        if (!env.OPENAI_API_KEY) return sendJson(response, 503, { error: "AI setup is not complete." });

        try {
          let body = "";
          for await (const chunk of request) {
            body += chunk;
            if (body.length > MAX_IMAGE_BYTES * 1.4) throw new Error("Image is too large. Choose one under 5 MB.");
          }
          const { imageDataUrl } = JSON.parse(body);
          const form = new FormData();
          form.set("model", env.OPENAI_IMAGE_MODEL || "gpt-image-2");
          form.set("image", imageBlobFromDataUrl(imageDataUrl), "garment-source.png");
          form.set("size", "1024x1024");
          form.set("quality", "medium");
          form.set("output_format", "png");
          form.set("prompt", "Use case: background-extraction. Asset type: a personal wardrobe catalog image. Primary request: turn the garment in the source image into a clean product catalog cutout. Scene/backdrop: solid pure green #00ff00 background. Subject: only the garment or shoe. Style/medium: realistic product photography. Composition/framing: centered, front-facing or natural top-front angle, fully visible with a little empty space around it. Constraints: preserve the exact garment's color, silhouette, neckline or collar, sleeve length, pockets, pattern, graphic, and fabric texture. Remove any person, hanger, mannequin, room, bed, floor, props, watermark, and extra text. Avoid: redesigning the garment, extra items, logos not present in the source image.");

          const imageResponse = await fetch("https://api.openai.com/v1/images/edits", {
            method: "POST",
            headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
            body: form,
          });
          if (!imageResponse.ok) {
            const upstreamError = await imageResponse.json().catch(() => ({}));
            console.error("Garment polish failed", upstreamError);
            const detail = upstreamError?.error?.message;
            return sendJson(response, 502, {
              error: detail ? `AI polishing failed: ${detail}` : "AI polishing is temporarily unavailable.",
            });
          }
          const result = await imageResponse.json();
          const imageBase64 = result.data?.[0]?.b64_json;
          if (!imageBase64) throw new Error("The AI did not return an image.");
          return sendJson(response, 200, { imageDataUrl: `data:image/png;base64,${imageBase64}` });
        } catch (error) {
          console.error("Garment polish failed", error);
          return sendJson(response, 400, { error: error.message || "Couldn't polish that photo." });
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return { plugins: [react(), garmentAnalysisApi(env), garmentPolishApi(env)] };
});
