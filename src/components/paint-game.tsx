import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { COLORING_PAGES, coloringUrl } from "@/lib/coloring-pages";

const COLORS = [
  { id: "red", value: "#e85d4c" },
  { id: "orange", value: "#f08a24" },
  { id: "yellow", value: "#f0b429" },
  { id: "green", value: "#2f8f6b" },
  { id: "blue", value: "#3b82f6" },
  { id: "purple", value: "#8b5cf6" },
  { id: "pink", value: "#ec4899" },
  { id: "brown", value: "#8a5a32" },
];

const TOOLS = [
  { id: "fill", label: "Fill", hint: "Whole section" },
  { id: "pencil", label: "Pencil", hint: "Thin line" },
  { id: "crayon", label: "Crayon", hint: "Thick line" },
] as const;

type Tool = (typeof TOOLS)[number]["id"];

type Page = {
  wall: Uint8Array;
  region: Int32Array;
  width: number;
  height: number;
  pixels: ImageData;
  blank: Uint8ClampedArray;
};

function closeSmallGaps(wall: Uint8Array, width: number, height: number) {
  const sealed = new Uint8Array(wall);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (wall[index]) continue;
      const left = x > 0 && wall[index - 1];
      const right = x + 1 < width && wall[index + 1];
      const up = y > 0 && wall[index - width];
      const down = y + 1 < height && wall[index + width];
      if ((left && right) || (up && down)) sealed[index] = 1;
    }
  }
  return sealed;
}

function luminance(r: number, g: number, b: number) {
  return r * 0.299 + g * 0.587 + b * 0.114;
}

function buildPage(source: ImageData): Page {
  const { width, height, data } = source;
  const count = width * height;
  const raw = new Uint8Array(count);
  for (let i = 0; i < count; i += 1) {
    const p = i * 4;
    if (data[p + 3] > 40 && luminance(data[p], data[p + 1], data[p + 2]) < 186) raw[i] = 1;
  }
  const wall = closeSmallGaps(raw, width, height);

  const region = new Int32Array(count);
  const queue = new Int32Array(count);
  let nextId = 1;
  for (let start = 0; start < count; start += 1) {
    if (wall[start] || region[start]) continue;
    const id = nextId;
    nextId += 1;
    let head = 0;
    let tail = 0;
    queue[tail] = start;
    tail += 1;
    region[start] = id;
    while (head < tail) {
      const current = queue[head];
      head += 1;
      const x = current % width;
      const y = (current - x) / width;
      const neighbors = [
        x > 0 ? current - 1 : -1,
        x + 1 < width ? current + 1 : -1,
        y > 0 ? current - width : -1,
        y + 1 < height ? current + width : -1,
      ];
      for (const next of neighbors) {
        if (next < 0 || wall[next] || region[next]) continue;
        region[next] = id;
        queue[tail] = next;
        tail += 1;
      }
    }
  }

  return { wall, region, width, height, pixels: source, blank: new Uint8ClampedArray(data) };
}

function rgb(hex: string) {
  return [Number.parseInt(hex.slice(1, 3), 16), Number.parseInt(hex.slice(3, 5), 16), Number.parseInt(hex.slice(5, 7), 16)] as const;
}

function regionAt(page: Page, x: number, y: number) {
  if (x < 0 || y < 0 || x >= page.width || y >= page.height) return 0;
  const direct = page.region[y * page.width + x];
  if (direct) return direct;
  for (let radius = 1; radius <= 3; radius += 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= page.width || ny >= page.height) continue;
        const id = page.region[ny * page.width + nx];
        if (id) return id;
      }
    }
  }
  return 0;
}

function paintRegion(page: Page, id: number, color: readonly [number, number, number]) {
  const { data } = page.pixels;
  for (let i = 0; i < page.region.length; i += 1) {
    if (page.region[i] !== id || page.wall[i]) continue;
    const p = i * 4;
    data[p] = color[0];
    data[p + 1] = color[1];
    data[p + 2] = color[2];
    data[p + 3] = 255;
  }
}

function stamp(page: Page, x: number, y: number, radius: number, id: number, color: readonly [number, number, number]) {
  const { data } = page.pixels;
  const r2 = radius * radius;
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      if (dx * dx + dy * dy > r2) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= page.width || ny >= page.height) continue;
      const index = ny * page.width + nx;
      if (page.region[index] !== id || page.wall[index]) continue;
      const p = index * 4;
      data[p] = color[0];
      data[p + 1] = color[1];
      data[p + 2] = color[2];
      data[p + 3] = 255;
    }
  }
}

export function PaintGame() {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pageRef = useRef<Page | null>(null);
  const drawRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const [pageId, setPageId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [color, setColor] = useState(COLORS[0].value);
  const [tool, setTool] = useState<Tool>("fill");

  useEffect(() => {
    const canvas = canvasRef.current;
    const chosen = COLORING_PAGES.find((item) => item.id === pageId);
    if (!canvas || !chosen) return;
    let cancel = false;
    const url = coloringUrl(chosen.src);
    const image = new Image();
    image.onload = () => {
      if (cancel) return;
      const maxWidth = 900;
      const scale = Math.min(1, maxWidth / image.width);
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      pageRef.current = buildPage(ctx.getImageData(0, 0, canvas.width, canvas.height));
      drawRef.current = null;
      setReady(true);
      requestAnimationFrame(() => fitCanvas());
      if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    };
    setReady(false);
    image.src = url;
    return () => {
      cancel = true;
    };
  }, [pageId]);

  function fitCanvas() {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas || !canvas.width) return;
    const bounds = stage.getBoundingClientRect();
    const scale = Math.min(bounds.width / canvas.width, bounds.height / canvas.height);
    canvas.style.width = `${Math.max(1, Math.floor(canvas.width * scale))}px`;
    canvas.style.height = `${Math.max(1, Math.floor(canvas.height * scale))}px`;
  }

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new ResizeObserver(() => fitCanvas());
    observer.observe(stage);
    fitCanvas();
    return () => observer.disconnect();
  }, [pageId, ready]);

  function brushRadius(event: React.PointerEvent<HTMLCanvasElement>) {
    const base = tool === "crayon" ? 22 : 6;
    if (event.pointerType === "pen" && event.pressure > 0) return Math.max(2, Math.round(base * (0.4 + event.pressure)));
    return base;
  }

  function isPalm(event: React.PointerEvent<HTMLCanvasElement>) {
    return event.pointerType === "touch" && Math.max(event.width, event.height) > 38;
  }

  function flush() {
    const canvas = canvasRef.current;
    const page = pageRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !page || !ctx) return;
    ctx.putImageData(page.pixels, 0, 0);
  }

  function point(event: { clientX: number; clientY: number }) {
    return pointFrom(event.clientX, event.clientY);
  }

  function pointFrom(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.width) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const x = Math.round(((clientX - rect.left) / rect.width) * canvas.width);
    const y = Math.round(((clientY - rect.top) / rect.height) * canvas.height);
    return { x, y };
  }

  function onPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (isPalm(event)) return;
    event.preventDefault();
    const page = pageRef.current;
    const spot = point(event);
    if (!page || !spot) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const id = regionAt(page, spot.x, spot.y);
    if (!id) return;
    const ink = rgb(color);
    if (tool === "fill") {
      paintRegion(page, id, ink);
      flush();
      return;
    }
    drawRef.current = { id, x: spot.x, y: spot.y };
    stamp(page, spot.x, spot.y, brushRadius(event), id, ink);
    flush();
  }

  function strokeTo(page: Page, draw: { id: number; x: number; y: number }, spot: { x: number; y: number }, radius: number, ink: readonly [number, number, number]) {
    const steps = Math.max(Math.abs(spot.x - draw.x), Math.abs(spot.y - draw.y));
    for (let i = 1; i <= steps; i += 1) {
      const x = Math.round(draw.x + ((spot.x - draw.x) * i) / steps);
      const y = Math.round(draw.y + ((spot.y - draw.y) * i) / steps);
      stamp(page, x, y, radius, draw.id, ink);
    }
    draw.x = spot.x;
    draw.y = spot.y;
  }

  function onPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const page = pageRef.current;
    const draw = drawRef.current;
    if (!page || !draw || tool === "fill" || isPalm(event)) return;
    const ink = rgb(color);
    const radius = brushRadius(event);
    const native = event.nativeEvent;
    const samples = native.getCoalescedEvents?.() ?? [native];
    for (const sample of samples) {
      const spot = pointFrom(sample.clientX, sample.clientY);
      if (spot) strokeTo(page, draw, spot, radius, ink);
    }
    flush();
  }

  function onPointerUp() {
    drawRef.current = null;
  }

  function clearPage() {
    const page = pageRef.current;
    if (!page) return;
    page.pixels.data.set(page.blank);
    flush();
  }

  const chosen = COLORING_PAGES.find((item) => item.id === pageId);

  if (!chosen) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-5 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <Link to="/" className="text-sm font-extrabold text-muted">
              Home
            </Link>
            <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-6xl">Choose a page</h1>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {COLORING_PAGES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPageId(item.id)}
              className="overflow-hidden rounded-[1.6rem] bg-white text-left shadow-sm"
            >
              <img src={item.src} alt="" className="aspect-[3/4] w-full bg-white object-contain" />
              <span className="block px-3 py-3 text-lg font-black text-ink">{item.name}</span>
            </button>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 flex flex-col bg-[#f6f1ea]" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div ref={stageRef} className="flex min-h-0 flex-1 items-center justify-center p-2">
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="touch-none bg-white shadow-sm"
        />
      </div>
      <div className="flex items-center gap-2 overflow-x-auto border-t border-line bg-card/95 px-3 py-2 backdrop-blur">
        <button type="button" onClick={() => setPageId(null)} className="min-h-12 shrink-0 rounded-full bg-bg px-4 text-sm font-black">
          Pages
        </button>
        {TOOLS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={tool === item.id}
            onClick={() => setTool(item.id)}
            className={`min-h-12 shrink-0 rounded-full px-4 text-sm font-black ${tool === item.id ? "bg-ink text-card" : "bg-bg text-ink"}`}
          >
            {item.label}
          </button>
        ))}
        <div className="mx-1 h-8 w-px shrink-0 bg-line" />
        {COLORS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-label={item.id}
            aria-pressed={color === item.value}
            onClick={() => setColor(item.value)}
            className={`h-11 w-11 shrink-0 rounded-full ${color === item.value ? "ring-4 ring-ink ring-offset-2 ring-offset-card" : ""}`}
            style={{ background: item.value }}
          />
        ))}
        <button type="button" onClick={clearPage} className="min-h-12 shrink-0 rounded-full px-4 text-sm font-black text-muted">
          Clear
        </button>
      </div>
    </main>
  );
}
