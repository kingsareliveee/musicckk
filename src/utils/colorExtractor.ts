/**
 * colorExtractor.ts
 * 
 * Extracts the dominant color from an image URL using an off-screen canvas.
 * Used to drive the ambient glow effect that matches the current song's artwork.
 * Results are cached by URL to avoid redundant processing.
 */

interface RGB { r: number; g: number; b: number }

const cache = new Map<string, RGB>();

/**
 * Loads an image from `url` into a 32×32 canvas, samples all pixels,
 * and returns the average vibrant color. Falls back to the accent color
 * if the image fails to load.
 */
export async function extractDominantColor(url: string): Promise<RGB> {
  if (cache.has(url)) return cache.get(url)!;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const SIZE = 32;
        const canvas = document.createElement("canvas");
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(fallback()); return; }

        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        const data = ctx.getImageData(0, 0, SIZE, SIZE).data;

        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          const pr = data[i], pg = data[i + 1], pb = data[i + 2];
          // Skip very dark or very light pixels — they don't make good glows
          const brightness = (pr + pg + pb) / 3;
          if (brightness < 20 || brightness > 235) continue;
          r += pr; g += pg; b += pb; count++;
        }

        if (count === 0) { resolve(fallback()); return; }

        const result = {
          r: Math.round(r / count),
          g: Math.round(g / count),
          b: Math.round(b / count),
        };

        cache.set(url, result);
        resolve(result);
      } catch {
        resolve(fallback());
      }
    };

    img.onerror = () => resolve(fallback());
    img.src = url;
  });
}

/** Apply extracted color to CSS custom properties for ambient glow */
export function applyAmbientColor(rgb: RGB) {
  const root = document.documentElement;
  root.style.setProperty("--ambient-r", String(rgb.r));
  root.style.setProperty("--ambient-g", String(rgb.g));
  root.style.setProperty("--ambient-b", String(rgb.b));
}

function fallback(): RGB {
  return { r: 139, g: 207, b: 198 }; // Default mint
}
