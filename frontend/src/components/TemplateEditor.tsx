"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { BACKEND_URL, TextLayer, QrCodeConfig, api, CustomFontData } from "@/lib/api";
import { fadeUp, cardTap } from "@/lib/animations";

const AVAILABLE_VARIABLES: { variable: TextLayer["variable"]; label: string; defaultText: string }[] = [
  { variable: "recipient_name", label: "Recipient Name", defaultText: "John Doe" },
  { variable: "event_name", label: "Event Name", defaultText: "Workshop 2026" },
  { variable: "date", label: "Date", defaultText: "May 29, 2026" },
  { variable: "verification_code", label: "Verification Code", defaultText: "CERT-A1B2C3D4" },
  { variable: "organizer", label: "Organizer", defaultText: "Proofsy Inc." },
  { variable: "duration", label: "Duration", defaultText: "2 Days" },
];

const GOOGLE_FONTS = [
  "Inter",
  "Arial",
  "Georgia",
  "Courier New",
  "Fira Code",
  "Fira Sans",
  "Playfair Display",
  "Poppins",
  "Roboto",
  "Outfit",
  "Montserrat",
  "Lora"
];

interface TemplateEditorProps {
  backgroundUrl: string;
  width: number;
  height: number;
  initialLayers?: TextLayer[];
  initialQrCode?: QrCodeConfig;
  onSave: (layers: TextLayer[], qrCode: QrCodeConfig) => void;
  saving?: boolean;
}

let layerCounter = 0;

export default function TemplateEditor({
  backgroundUrl,
  width,
  height,
  initialLayers = [],
  initialQrCode,
  onSave,
  saving = false,
}: TemplateEditorProps) {
  const [layers, setLayers] = useState<TextLayer[]>(initialLayers);
  const [qrCode, setQrCode] = useState<QrCodeConfig>(
    initialQrCode || { enabled: true, x: 880, y: 580, size: 120 }
  );

  // Selection state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<"text" | "qrcode" | null>(null);

  // Dragging state
  const [dragging, setDragging] = useState<{ id: string; type: "text" | "qrcode" } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Scale factor for responsive canvas display
  const [scale, setScale] = useState(1);

  // Dynamic Google Fonts loading
  useEffect(() => {
    const families = GOOGLE_FONTS.map((f) => f.replace(" ", "+")).join("|");
    const linkId = "google-fonts-editor";
    if (!document.getElementById(linkId)) {
      const link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css?family=${families}:400,700&display=swap`;
      document.head.appendChild(link);
    }
  }, []);

  const [customFonts, setCustomFonts] = useState<CustomFontData[]>([]);

  // Load workspace custom fonts
  useEffect(() => {
    async function loadFonts() {
      try {
        const res = await api.getCustomFonts();
        if (res.success && res.data) {
          setCustomFonts(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch custom fonts in editor:", err);
      }
    }
    loadFonts();
  }, []);

  // Dynamically load custom fonts into the document's head via @font-face
  useEffect(() => {
    if (customFonts.length === 0) return;
    const styleId = "custom-fonts-editor-style";
    let styleEl = document.getElementById(styleId) as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = customFonts
      .map(
        (font) => `
        @font-face {
          font-family: '${font.family}';
          src: url('${BACKEND_URL}${font.fontUrl}') format('truetype');
          font-weight: ${font.fontWeight === "bold" ? "bold" : "normal"};
          font-style: normal;
        }
      `
      )
      .join("\n");
  }, [customFonts]);

  // Recalculate scale on resize
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        setScale(Math.min(1, containerWidth / width));
      }
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [width]);

  // Selected item coordinates
  const getSelectedCoords = () => {
    if (!selectedId) return { x: 0, y: 0 };
    if (selectedType === "text") {
      const layer = layers.find((l) => l._id === selectedId);
      return layer ? { x: layer.x, y: layer.y } : { x: 0, y: 0 };
    }
    return { x: qrCode.x, y: qrCode.y };
  };

  const { x: selectedX, y: selectedY } = getSelectedCoords();

  // Keyboard Nudging (Arrow keys & Shift)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedId || !selectedType) return;

      const active = document.activeElement;
      if (
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "SELECT" ||
          active.tagName === "TEXTAREA")
      ) {
        return;
      }

      const step = e.shiftKey ? 10 : 1;
      let deltaX = 0;
      let deltaY = 0;

      if (e.key === "ArrowUp") deltaY = -step;
      else if (e.key === "ArrowDown") deltaY = step;
      else if (e.key === "ArrowLeft") deltaX = -step;
      else if (e.key === "ArrowRight") deltaX = step;
      else return;

      e.preventDefault();

      if (selectedType === "text") {
        const layer = layers.find((l) => l._id === selectedId);
        if (layer) {
          updateLayer(selectedId, {
            x: Math.max(0, Math.min(width, layer.x + deltaX)),
            y: Math.max(0, Math.min(height, layer.y + deltaY)),
          });
        }
      } else if (selectedType === "qrcode") {
        updateQrCode({
          x: Math.max(0, Math.min(width, qrCode.x + deltaX)),
          y: Math.max(0, Math.min(height, qrCode.y + deltaY)),
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, selectedType, layers, qrCode, width, height]);

  const selectedLayer = layers.find((l) => l._id === selectedId);

  const addLayer = (variable: TextLayer["variable"], label: string) => {
    const existing = layers.find((l) => l.variable === variable);
    if (existing && variable !== "custom") return;

    layerCounter++;
    const newLayer: TextLayer = {
      _id: `layer-${layerCounter}`,
      variable,
      label,
      x: Math.round(width / 2),
      y: Math.round(height / 2),
      fontSize: variable === "recipient_name" ? 42 : variable === "verification_code" ? 12 : 22,
      fontFamily: variable === "verification_code" ? "Courier New" : "Inter",
      fontWeight: variable === "recipient_name" ? "bold" : "normal",
      color: "#000000",
      textAlign: "center",
      maxWidth: variable === "recipient_name" ? 700 : 500,
    };

    setLayers((prev) => [...prev, newLayer]);
    setSelectedId(newLayer._id!);
    setSelectedType("text");
  };

  const removeLayer = (id: string) => {
    setLayers((prev) => prev.filter((l) => l._id !== id));
    if (selectedId === id) {
      setSelectedId(null);
      setSelectedType(null);
    }
  };

  const updateLayer = (id: string, updates: Partial<TextLayer>) => {
    setLayers((prev) =>
      prev.map((l) => (l._id === id ? { ...l, ...updates } : l))
    );
  };

  const updateQrCode = (updates: Partial<QrCodeConfig>) => {
    setQrCode((prev) => ({ ...prev, ...updates }));
  };

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, id: string, type: "text" | "qrcode") => {
      e.preventDefault();
      e.stopPropagation();
      setDragging({ id, type });
      setSelectedId(id);
      setSelectedType(type);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = Math.round((e.clientX - rect.left) / scale);
      const y = Math.round((e.clientY - rect.top) / scale);

      const posX = Math.max(0, Math.min(width, x));
      const posY = Math.max(0, Math.min(height, y));

      if (dragging.type === "text") {
        updateLayer(dragging.id, { x: posX, y: posY });
      } else if (dragging.type === "qrcode") {
        updateQrCode({ x: posX, y: posY });
      }
    },
    [dragging, scale, width, height]
  );

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  const getPreviewText = (layer: TextLayer) => {
    if (layer.variable === "custom") return layer.customText || "Custom Text";
    return AVAILABLE_VARIABLES.find((v) => v.variable === layer.variable)?.defaultText || layer.label;
  };

  // Nudge Buttons Logic
  const nudge = (axis: "x" | "y" | "fontSize" | "size", amount: number) => {
    if (!selectedId || !selectedType) return;

    if (selectedType === "text" && selectedLayer) {
      if (axis === "x") {
        updateLayer(selectedId, { x: Math.max(0, Math.min(width, selectedLayer.x + amount)) });
      } else if (axis === "y") {
        updateLayer(selectedId, { y: Math.max(0, Math.min(height, selectedLayer.y + amount)) });
      } else if (axis === "fontSize") {
        updateLayer(selectedId, { fontSize: Math.max(6, selectedLayer.fontSize + amount) });
      }
    } else if (selectedType === "qrcode") {
      if (axis === "x") {
        updateQrCode({ x: Math.max(0, Math.min(width, qrCode.x + amount)) });
      } else if (axis === "y") {
        updateQrCode({ y: Math.max(0, Math.min(height, qrCode.y + amount)) });
      } else if (axis === "size") {
        updateQrCode({ size: Math.max(20, qrCode.size + amount) });
      }
    }
  };

  const fullBgUrl = backgroundUrl.startsWith("http") ? backgroundUrl : `${BACKEND_URL}${backgroundUrl}`;

  return (
    <div className="flex gap-6 flex-col lg:flex-row">
      {/* Canvas area */}
      <div ref={containerRef} className="flex-1 min-w-0">
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <div
            ref={canvasRef}
            className="relative border-2 border-dashed border-[var(--color-border)] rounded-xl overflow-hidden bg-[var(--color-surface)] cursor-crosshair shadow-sm select-none"
            style={{
              width: width * scale,
              height: height * scale,
            }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onClick={() => {
              setSelectedId(null);
              setSelectedType(null);
            }}
          >
            {/* Background image */}
            <img
              src={fullBgUrl}
              alt="Certificate background"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              draggable={false}
            />

            {/* Smart Center Guides */}
            {selectedId && (
              <>
                {/* Vertical Center Rulers */}
                {Math.abs(selectedX - width / 2) < 5 && (
                  <div
                    className="absolute top-0 bottom-0 w-[1.5px] bg-blue-500/60 pointer-events-none border-l border-dashed border-white"
                    style={{ left: (width / 2) * scale }}
                  />
                )}
                {/* Horizontal Center Rulers */}
                {Math.abs(selectedY - height / 2) < 5 && (
                  <div
                    className="absolute left-0 right-0 h-[1.5px] bg-blue-500/60 pointer-events-none border-t border-dashed border-white"
                    style={{ top: (height / 2) * scale }}
                  />
                )}
              </>
            )}

            {/* Text layers */}
            {layers.map((layer) => (
              <div
                key={layer._id}
                className={`absolute cursor-move select-none transition-shadow ${
                  selectedId === layer._id && selectedType === "text"
                    ? "ring-2 ring-[var(--color-primary)] ring-offset-1 shadow-lg bg-blue-500/10"
                    : "hover:ring-1 hover:ring-[var(--color-primary)]/50"
                }`}
                style={{
                  left: layer.x * scale,
                  top: layer.y * scale,
                  transform: `translate(-50%, -50%) scale(${scale})`,
                  transformOrigin: "center center",
                  fontSize: layer.fontSize,
                  fontFamily: layer.fontFamily,
                  fontWeight: layer.fontWeight,
                  color: layer.color,
                  textAlign: layer.textAlign,
                  maxWidth: layer.maxWidth || "none",
                  whiteSpace: "nowrap",
                  padding: "4px 8px",
                  borderRadius: "4px",
                }}
                onPointerDown={(e) => handlePointerDown(e, layer._id!, "text")}
              >
                {getPreviewText(layer)}
                {/* Label badge */}
                <span
                  className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-primary)] text-white whitespace-nowrap opacity-80 font-sans"
                  style={{ fontSize: 9 / scale }}
                >
                  {`{{${layer.variable}}}`}
                </span>
              </div>
            ))}

            {/* QR Code placeholder (Interactive drag/resize) */}
            {qrCode.enabled && (
              <div
                className={`absolute border-2 border-dashed rounded flex flex-col items-center justify-center text-[10px] text-gray-600 font-mono bg-white/80 cursor-move ${
                  selectedId === "qrcode" && selectedType === "qrcode"
                    ? "ring-2 ring-[var(--color-primary)] ring-offset-1 border-blue-500 shadow-lg bg-blue-500/5"
                    : "border-gray-400 hover:border-blue-500"
                }`}
                style={{
                  left: qrCode.x * scale,
                  top: qrCode.y * scale,
                  width: qrCode.size * scale,
                  height: qrCode.size * scale,
                  transform: "translate(-50%, -50%)",
                }}
                onPointerDown={(e) => handlePointerDown(e, "qrcode", "qrcode")}
              >
                <svg className="w-5 h-5 mb-0.5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.875 19.5h.75a.75.75 0 0 1 .75.75v.75M16.875 16.5H15M19.5 16.5h.008v.008H19.5V16.5Zm0 2.25h.008v.008H19.5V18.75Zm-2.25-2.25h.008v.008H17.25V16.5ZM15 18.75h.008v.008H15V18.75Zm0 2.25h.008v.008H15V21Zm2.25 0h.008v.008H17.25V21ZM19.5 21h.008v.008H19.5V21Z" />
                </svg>
                <span className="text-[8px] font-bold select-none uppercase tracking-wide">QR Code</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Sidebar panel */}
      <div className="w-full lg:w-80 shrink-0 space-y-5">
        {/* Add layer */}
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-4">
          <h3 className="text-sm font-bold text-[var(--color-foreground)] mb-3">
            Add Text Layer
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {AVAILABLE_VARIABLES.map((v) => {
              const exists = layers.some((l) => l.variable === v.variable);
              return (
                <button
                  key={v.variable}
                  onClick={() => addLayer(v.variable, v.label)}
                  disabled={exists && v.variable !== "custom"}
                  className={`text-[11px] px-2.5 py-2 rounded-lg font-mono font-medium transition-colors cursor-pointer text-center ${
                    exists && v.variable !== "custom"
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                      : "bg-[var(--color-primary-faint)] text-[var(--color-primary)] border border-[var(--color-primary)]/10 hover:bg-[var(--color-primary)] hover:text-white"
                  }`}
                >
                  {`{{${v.variable}}}`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Global QR Code controller */}
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-[var(--color-foreground)]">
              Dynamic Verification QR
            </h3>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={qrCode.enabled}
                onChange={(e) => {
                  updateQrCode({ enabled: e.target.checked });
                  if (e.target.checked) {
                    setSelectedId("qrcode");
                    setSelectedType("qrcode");
                  } else if (selectedId === "qrcode") {
                    setSelectedId(null);
                    setSelectedType(null);
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
            </label>
          </div>
          <p className="text-[10px] text-[var(--color-muted)] leading-relaxed">
            Drag the QR Code placeholder to place it. Recipients scan this code to instant-verify via asymmetric signature.
          </p>
          {qrCode.enabled && (
            <button
              onClick={() => {
                setSelectedId("qrcode");
                setSelectedType("qrcode");
              }}
              className={`w-full mt-3 text-xs py-1.5 border rounded-lg font-medium cursor-pointer transition-colors ${
                selectedId === "qrcode" && selectedType === "qrcode"
                  ? "bg-[var(--color-primary-faint)] text-[var(--color-primary)] border-[var(--color-primary)]"
                  : "border-[var(--color-border)] text-[var(--color-foreground)] hover:bg-[var(--color-surface-alt)]"
              }`}
            >
              Configure QR Code
            </button>
          )}
        </div>

        {/* QR Code configuration properties */}
        {selectedId === "qrcode" && selectedType === "qrcode" && qrCode.enabled && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-4 space-y-3 shadow-sm border-blue-500/30 bg-blue-500/[0.01]"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--color-primary)] flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5Z" />
                </svg>
                Element: Verification QR
              </h3>
            </div>

            {/* QR Position */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--color-muted)] font-medium">Position X</span>
                <span className="text-xs font-mono font-semibold">{qrCode.x}px</span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="range"
                  min="0"
                  max={width}
                  value={qrCode.x}
                  onChange={(e) => updateQrCode({ x: +e.target.value })}
                  className="flex-1 accent-[var(--color-primary)]"
                />
                <div className="flex gap-0.5">
                  <button onClick={() => nudge("x", -10)} className="px-1.5 py-0.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded text-[9px] font-mono hover:bg-gray-200 cursor-pointer">-10</button>
                  <button onClick={() => nudge("x", -1)} className="px-1.5 py-0.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded text-[9px] font-mono hover:bg-gray-200 cursor-pointer">-1</button>
                  <button onClick={() => nudge("x", 1)} className="px-1.5 py-0.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded text-[9px] font-mono hover:bg-gray-200 cursor-pointer">+1</button>
                  <button onClick={() => nudge("x", 10)} className="px-1.5 py-0.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded text-[9px] font-mono hover:bg-gray-200 cursor-pointer">+10</button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--color-muted)] font-medium">Position Y</span>
                <span className="text-xs font-mono font-semibold">{qrCode.y}px</span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="range"
                  min="0"
                  max={height}
                  value={qrCode.y}
                  onChange={(e) => updateQrCode({ y: +e.target.value })}
                  className="flex-1 accent-[var(--color-primary)]"
                />
                <div className="flex gap-0.5">
                  <button onClick={() => nudge("y", -10)} className="px-1.5 py-0.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded text-[9px] font-mono hover:bg-gray-200 cursor-pointer">-10</button>
                  <button onClick={() => nudge("y", -1)} className="px-1.5 py-0.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded text-[9px] font-mono hover:bg-gray-200 cursor-pointer">-1</button>
                  <button onClick={() => nudge("y", 1)} className="px-1.5 py-0.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded text-[9px] font-mono hover:bg-gray-200 cursor-pointer">+1</button>
                  <button onClick={() => nudge("y", 10)} className="px-1.5 py-0.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded text-[9px] font-mono hover:bg-gray-200 cursor-pointer">+10</button>
                </div>
              </div>
            </div>

            {/* QR Size */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--color-muted)] font-medium">Size (px)</span>
                <span className="text-xs font-mono font-semibold">{qrCode.size}px</span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="range"
                  min="50"
                  max="300"
                  value={qrCode.size}
                  onChange={(e) => updateQrCode({ size: +e.target.value })}
                  className="flex-1 accent-[var(--color-primary)]"
                />
                <div className="flex gap-0.5">
                  <button onClick={() => nudge("size", -10)} className="px-1.5 py-0.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded text-[9px] font-mono hover:bg-gray-200 cursor-pointer">-10</button>
                  <button onClick={() => nudge("size", -1)} className="px-1.5 py-0.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded text-[9px] font-mono hover:bg-gray-200 cursor-pointer">-1</button>
                  <button onClick={() => nudge("size", 1)} className="px-1.5 py-0.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded text-[9px] font-mono hover:bg-gray-200 cursor-pointer">+1</button>
                  <button onClick={() => nudge("size", 10)} className="px-1.5 py-0.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded text-[9px] font-mono hover:bg-gray-200 cursor-pointer">+10</button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Selected text layer properties */}
        {selectedLayer && selectedType === "text" && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-4 space-y-4 shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5">
              <h3 className="text-sm font-bold text-[var(--color-foreground)] flex items-center gap-1.5">
                <span className="w-1.5 h-3 bg-[var(--color-primary)] rounded"></span>
                Layer: {selectedLayer.label}
              </h3>
              <button
                onClick={() => removeLayer(selectedLayer._id!)}
                className="text-[11px] text-[var(--color-error)] hover:bg-red-50 px-2 py-0.5 rounded cursor-pointer transition-colors border border-red-100"
              >
                Remove
              </button>
            </div>

            {/* Position inputs with precise nudge buttons */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--color-muted)] font-medium">Position X (px)</span>
                  <span className="text-xs font-mono font-semibold">{selectedLayer.x}px</span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="range"
                    min="0"
                    max={width}
                    value={selectedLayer.x}
                    onChange={(e) => updateLayer(selectedLayer._id!, { x: +e.target.value })}
                    className="flex-1 accent-[var(--color-primary)]"
                  />
                  <div className="flex gap-0.5">
                    <button onClick={() => nudge("x", -10)} className="px-1.5 py-0.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded text-[9px] font-mono hover:bg-gray-200 cursor-pointer">-10</button>
                    <button onClick={() => nudge("x", -1)} className="px-1.5 py-0.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded text-[9px] font-mono hover:bg-gray-200 cursor-pointer">-1</button>
                    <button onClick={() => nudge("x", 1)} className="px-1.5 py-0.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded text-[9px] font-mono hover:bg-gray-200 cursor-pointer">+1</button>
                    <button onClick={() => nudge("x", 10)} className="px-1.5 py-0.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded text-[9px] font-mono hover:bg-gray-200 cursor-pointer">+10</button>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--color-muted)] font-medium">Position Y (px)</span>
                  <span className="text-xs font-mono font-semibold">{selectedLayer.y}px</span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="range"
                    min="0"
                    max={height}
                    value={selectedLayer.y}
                    onChange={(e) => updateLayer(selectedLayer._id!, { y: +e.target.value })}
                    className="flex-1 accent-[var(--color-primary)]"
                  />
                  <div className="flex gap-0.5">
                    <button onClick={() => nudge("y", -10)} className="px-1.5 py-0.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded text-[9px] font-mono hover:bg-gray-200 cursor-pointer">-10</button>
                    <button onClick={() => nudge("y", -1)} className="px-1.5 py-0.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded text-[9px] font-mono hover:bg-gray-200 cursor-pointer">-1</button>
                    <button onClick={() => nudge("y", 1)} className="px-1.5 py-0.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded text-[9px] font-mono hover:bg-gray-200 cursor-pointer">+1</button>
                    <button onClick={() => nudge("y", 10)} className="px-1.5 py-0.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded text-[9px] font-mono hover:bg-gray-200 cursor-pointer">+10</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Font size control */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--color-muted)] font-medium">Font Size</span>
                <span className="text-xs font-mono font-semibold">{selectedLayer.fontSize}px</span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="range"
                  min="8"
                  max="120"
                  value={selectedLayer.fontSize}
                  onChange={(e) => updateLayer(selectedLayer._id!, { fontSize: +e.target.value })}
                  className="flex-1 accent-[var(--color-primary)]"
                />
                <div className="flex gap-0.5">
                  <button onClick={() => nudge("fontSize", -5)} className="px-1.5 py-0.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded text-[9px] font-mono hover:bg-gray-200 cursor-pointer">-5</button>
                  <button onClick={() => nudge("fontSize", -1)} className="px-1.5 py-0.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded text-[9px] font-mono hover:bg-gray-200 cursor-pointer">-1</button>
                  <button onClick={() => nudge("fontSize", 1)} className="px-1.5 py-0.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded text-[9px] font-mono hover:bg-gray-200 cursor-pointer">+1</button>
                  <button onClick={() => nudge("fontSize", 5)} className="px-1.5 py-0.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded text-[9px] font-mono hover:bg-gray-200 cursor-pointer">+5</button>
                </div>
              </div>
            </div>

            {/* Color control */}
            <div className="space-y-1.5">
              <span className="text-xs text-[var(--color-muted)] font-medium">Text Color</span>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={selectedLayer.color}
                  onChange={(e) => updateLayer(selectedLayer._id!, { color: e.target.value })}
                  className="w-10 h-10 rounded-xl border border-[var(--color-border)] cursor-pointer overflow-hidden p-0 bg-transparent shrink-0"
                />
                <input
                  type="text"
                  value={selectedLayer.color}
                  onChange={(e) => updateLayer(selectedLayer._id!, { color: e.target.value })}
                  className="flex-1 px-3 py-2 text-xs border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] font-mono text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            </div>

            {/* Font family selection */}
            <div className="space-y-1.5">
              <span className="text-xs text-[var(--color-muted)] font-medium">Font Family</span>
              <select
                value={selectedLayer.fontFamily}
                onChange={(e) => updateLayer(selectedLayer._id!, { fontFamily: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] font-medium text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-primary)]"
              >
                <optgroup label="Standard Fonts">
                  {GOOGLE_FONTS.map((f) => (
                    <option key={f} value={f} style={{ fontFamily: f }}>
                      {f}
                    </option>
                  ))}
                </optgroup>
                {customFonts.length > 0 && (
                  <optgroup label="Workspace Custom Fonts">
                    {customFonts.map((f) => (
                      <option key={f.family} value={f.family} style={{ fontFamily: f.family }}>
                        {f.name} ({f.fontWeight})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            {/* Weight & Align */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <span className="text-xs text-[var(--color-muted)] font-medium">Weight</span>
                <select
                  value={selectedLayer.fontWeight}
                  onChange={(e) =>
                    updateLayer(selectedLayer._id!, {
                      fontWeight: e.target.value as "normal" | "bold",
                    })
                  }
                  className="w-full px-3 py-2 text-xs border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] text-[var(--color-foreground)] focus:outline-none"
                >
                  <option value="normal">Normal</option>
                  <option value="bold">Bold</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <span className="text-xs text-[var(--color-muted)] font-medium">Align</span>
                <select
                  value={selectedLayer.textAlign}
                  onChange={(e) =>
                    updateLayer(selectedLayer._id!, {
                      textAlign: e.target.value as "left" | "center" | "right",
                    })
                  }
                  className="w-full px-3 py-2 text-xs border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] text-[var(--color-foreground)] focus:outline-none"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
            </div>

            {/* Max width */}
            <div className="space-y-1.5">
              <span className="text-xs text-[var(--color-muted)] font-medium">Max Width (px)</span>
              <input
                type="number"
                value={selectedLayer.maxWidth || ""}
                onChange={(e) => updateLayer(selectedLayer._id!, { maxWidth: e.target.value ? +e.target.value : null })}
                placeholder="Auto"
                className="w-full px-3 py-2 text-xs border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-primary)] placeholder:text-gray-300"
              />
            </div>

            {/* Custom text */}
            {selectedLayer.variable === "custom" && (
              <div className="space-y-1.5">
                <span className="text-xs text-[var(--color-muted)] font-medium">Custom Fixed Text</span>
                <input
                  type="text"
                  value={selectedLayer.customText || ""}
                  onChange={(e) => updateLayer(selectedLayer._id!, { customText: e.target.value })}
                  placeholder="Enter fixed text..."
                  className="w-full px-3 py-2 text-xs border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            )}
          </motion.div>
        )}

        {/* Layers list */}
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-4">
          <h3 className="text-sm font-bold text-[var(--color-foreground)] mb-3">
            Layers Checklist ({layers.length})
          </h3>
          {layers.length === 0 ? (
            <p className="text-xs text-[var(--color-muted)]">
              Click a variable above to add a text layer.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
              {layers.map((l) => (
                <div
                  key={l._id}
                  onClick={() => {
                    setSelectedId(l._id!);
                    setSelectedType("text");
                  }}
                  className={`text-xs px-3 py-2.5 border rounded-lg cursor-pointer flex items-center justify-between transition-colors ${
                    selectedId === l._id && selectedType === "text"
                      ? "bg-[var(--color-primary-faint)] text-[var(--color-primary)] border-[var(--color-primary)] font-semibold"
                      : "hover:bg-[var(--color-surface-alt)] text-[var(--color-foreground)] border-[var(--color-border)]"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] opacity-60"></span>
                    {l.label}
                  </span>
                  <span className="text-[10px] text-[var(--color-muted)] font-mono font-medium">
                    {l.x}x, {l.y}y
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save button */}
        <motion.button
          whileTap={cardTap}
          onClick={() => onSave(layers, qrCode)}
          disabled={saving}
          className="w-full bg-[var(--color-primary)] text-white px-5 py-3.5 rounded-xl font-semibold text-sm hover:bg-[var(--color-primary-dark)] disabled:opacity-50 cursor-pointer transition-colors shadow-sm hover:shadow flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              Saving Changes...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              Save Template Changes
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}
