"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { BACKEND_URL, TextLayer, QrCodeConfig } from "@/lib/api";
import { fadeUp, cardTap } from "@/lib/animations";

const AVAILABLE_VARIABLES: { variable: TextLayer["variable"]; label: string; defaultText: string }[] = [
  { variable: "recipient_name", label: "Recipient Name", defaultText: "John Doe" },
  { variable: "event_name", label: "Event Name", defaultText: "Workshop 2026" },
  { variable: "date", label: "Date", defaultText: "May 29, 2026" },
  { variable: "verification_code", label: "Verification Code", defaultText: "CERT-A1B2C3D4" },
  { variable: "organizer", label: "Organizer", defaultText: "Proofsy Inc." },
  { variable: "duration", label: "Duration", defaultText: "2 Days" },
];

const FONT_OPTIONS = ["Inter", "Arial", "Georgia", "Courier New", "Fira Code", "Fira Sans", "Playfair Display", "Poppins", "Roboto"];

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
  const [qrCode] = useState<QrCodeConfig>(
    initialQrCode || { enabled: true, x: 880, y: 580, size: 120 }
  );
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Calculate scale factor for responsive display
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const selectedLayer = layers.find((l) => l._id === selectedLayerId);

  const addLayer = (variable: TextLayer["variable"], label: string) => {
    const existing = layers.find((l) => l.variable === variable);
    if (existing && variable !== "custom") return; // Don't add duplicates

    layerCounter++;
    const newLayer: TextLayer = {
      _id: `layer-${layerCounter}`,
      variable,
      label,
      x: width / 2,
      y: height / 2,
      fontSize: variable === "recipient_name" ? 42 : variable === "verification_code" ? 12 : 22,
      fontFamily: variable === "verification_code" ? "Courier New" : "Inter",
      fontWeight: variable === "recipient_name" ? "bold" : "normal",
      color: "#000000",
      textAlign: "center",
      maxWidth: variable === "recipient_name" ? 700 : 500,
    };

    setLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(newLayer._id!);
  };

  const removeLayer = (id: string) => {
    setLayers((prev) => prev.filter((l) => l._id !== id));
    if (selectedLayerId === id) setSelectedLayerId(null);
  };

  const updateLayer = (id: string, updates: Partial<TextLayer>) => {
    setLayers((prev) =>
      prev.map((l) => (l._id === id ? { ...l, ...updates } : l))
    );
  };

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, layerId: string) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(layerId);
      setSelectedLayerId(layerId);
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
      updateLayer(dragging, {
        x: Math.max(0, Math.min(width, x)),
        y: Math.max(0, Math.min(height, y)),
      });
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

  const fullBgUrl = backgroundUrl.startsWith("http") ? backgroundUrl : `${BACKEND_URL}${backgroundUrl}`;

  return (
    <div className="flex gap-6 flex-col lg:flex-row">
      {/* Canvas area */}
      <div ref={containerRef} className="flex-1 min-w-0">
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <div
            ref={canvasRef}
            className="relative border-2 border-dashed border-[var(--color-border)] rounded-xl overflow-hidden bg-[var(--color-surface)] cursor-crosshair"
            style={{
              width: width * scale,
              height: height * scale,
            }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onClick={() => setSelectedLayerId(null)}
          >
            {/* Background image */}
            <img
              src={fullBgUrl}
              alt="Certificate background"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              draggable={false}
            />

            {/* Text layers */}
            {layers.map((layer) => (
              <div
                key={layer._id}
                className={`absolute cursor-move select-none transition-shadow ${
                  selectedLayerId === layer._id
                    ? "ring-2 ring-[var(--color-primary)] ring-offset-2 shadow-lg"
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
                  backgroundColor:
                    selectedLayerId === layer._id
                      ? "rgba(37, 99, 235, 0.08)"
                      : "transparent",
                }}
                onPointerDown={(e) => handlePointerDown(e, layer._id!)}
              >
                {getPreviewText(layer)}
                {/* Label badge */}
                <span
                  className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-primary)] text-white whitespace-nowrap opacity-80"
                  style={{ fontSize: 9 / scale }}
                >
                  {`{{${layer.variable}}}`}
                </span>
              </div>
            ))}

            {/* QR Code placeholder */}
            {qrCode.enabled && (
              <div
                className="absolute border-2 border-dashed border-gray-400 rounded flex items-center justify-center text-[10px] text-gray-500 font-mono bg-white/70"
                style={{
                  left: qrCode.x * scale,
                  top: qrCode.y * scale,
                  width: qrCode.size * scale,
                  height: qrCode.size * scale,
                  transform: "translate(-50%, -50%)",
                }}
              >
                QR
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
                  className={`text-xs px-3 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
                    exists && v.variable !== "custom"
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-[var(--color-primary-faint)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white"
                  }`}
                >
                  {`{{${v.variable}}}`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Layer properties */}
        {selectedLayer && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--color-foreground)]">
                Layer: {selectedLayer.label}
              </h3>
              <button
                onClick={() => removeLayer(selectedLayer._id!)}
                className="text-xs text-[var(--color-error)] hover:bg-red-50 px-2 py-1 rounded cursor-pointer"
              >
                Remove
              </button>
            </div>

            {/* Position */}
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-[var(--color-muted)]">
                X
                <input
                  type="number"
                  value={selectedLayer.x}
                  onChange={(e) => updateLayer(selectedLayer._id!, { x: +e.target.value })}
                  className="w-full mt-1 px-2 py-1.5 text-xs border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)]"
                />
              </label>
              <label className="text-xs text-[var(--color-muted)]">
                Y
                <input
                  type="number"
                  value={selectedLayer.y}
                  onChange={(e) => updateLayer(selectedLayer._id!, { y: +e.target.value })}
                  className="w-full mt-1 px-2 py-1.5 text-xs border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)]"
                />
              </label>
            </div>

            {/* Font size & color */}
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-[var(--color-muted)]">
                Font Size
                <input
                  type="number"
                  value={selectedLayer.fontSize}
                  onChange={(e) => updateLayer(selectedLayer._id!, { fontSize: +e.target.value })}
                  className="w-full mt-1 px-2 py-1.5 text-xs border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)]"
                />
              </label>
              <label className="text-xs text-[var(--color-muted)]">
                Color
                <div className="flex gap-1 mt-1">
                  <input
                    type="color"
                    value={selectedLayer.color}
                    onChange={(e) => updateLayer(selectedLayer._id!, { color: e.target.value })}
                    className="w-8 h-8 rounded border border-[var(--color-border)] cursor-pointer"
                  />
                  <input
                    type="text"
                    value={selectedLayer.color}
                    onChange={(e) => updateLayer(selectedLayer._id!, { color: e.target.value })}
                    className="flex-1 px-2 py-1.5 text-xs border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] font-mono"
                  />
                </div>
              </label>
            </div>

            {/* Font family */}
            <label className="text-xs text-[var(--color-muted)]">
              Font Family
              <select
                value={selectedLayer.fontFamily}
                onChange={(e) => updateLayer(selectedLayer._id!, { fontFamily: e.target.value })}
                className="w-full mt-1 px-2 py-1.5 text-xs border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)]"
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>

            {/* Font weight & alignment */}
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-[var(--color-muted)]">
                Weight
                <select
                  value={selectedLayer.fontWeight}
                  onChange={(e) =>
                    updateLayer(selectedLayer._id!, {
                      fontWeight: e.target.value as "normal" | "bold",
                    })
                  }
                  className="w-full mt-1 px-2 py-1.5 text-xs border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)]"
                >
                  <option value="normal">Normal</option>
                  <option value="bold">Bold</option>
                </select>
              </label>
              <label className="text-xs text-[var(--color-muted)]">
                Align
                <select
                  value={selectedLayer.textAlign}
                  onChange={(e) =>
                    updateLayer(selectedLayer._id!, {
                      textAlign: e.target.value as "left" | "center" | "right",
                    })
                  }
                  className="w-full mt-1 px-2 py-1.5 text-xs border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)]"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </label>
            </div>

            {/* Max width */}
            <label className="text-xs text-[var(--color-muted)]">
              Max Width (px)
              <input
                type="number"
                value={selectedLayer.maxWidth || ""}
                onChange={(e) => updateLayer(selectedLayer._id!, { maxWidth: e.target.value ? +e.target.value : null })}
                placeholder="Auto"
                className="w-full mt-1 px-2 py-1.5 text-xs border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)]"
              />
            </label>

            {/* Custom text (for custom variable) */}
            {selectedLayer.variable === "custom" && (
              <label className="text-xs text-[var(--color-muted)]">
                Custom Text
                <input
                  type="text"
                  value={selectedLayer.customText || ""}
                  onChange={(e) => updateLayer(selectedLayer._id!, { customText: e.target.value })}
                  placeholder="Enter fixed text..."
                  className="w-full mt-1 px-2 py-1.5 text-xs border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)]"
                />
              </label>
            )}
          </motion.div>
        )}

        {/* Layers list */}
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-4">
          <h3 className="text-sm font-bold text-[var(--color-foreground)] mb-3">
            Layers ({layers.length})
          </h3>
          {layers.length === 0 ? (
            <p className="text-xs text-[var(--color-muted)]">
              Click a variable above to add a text layer.
            </p>
          ) : (
            <div className="space-y-1.5">
              {layers.map((l) => (
                <div
                  key={l._id}
                  onClick={() => setSelectedLayerId(l._id!)}
                  className={`text-xs px-3 py-2 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${
                    selectedLayerId === l._id
                      ? "bg-[var(--color-primary-faint)] text-[var(--color-primary)] font-semibold"
                      : "hover:bg-[var(--color-surface-alt)] text-[var(--color-foreground)]"
                  }`}
                >
                  <span>{l.label}</span>
                  <span className="text-[10px] text-[var(--color-muted)] font-mono">
                    ({l.x}, {l.y})
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
          className="w-full bg-[var(--color-primary)] text-white px-5 py-3 rounded-xl font-semibold text-sm hover:bg-[var(--color-primary-dark)] disabled:opacity-50 cursor-pointer transition-colors"
        >
          {saving ? "Saving..." : "Save Template"}
        </motion.button>
      </div>
    </div>
  );
}
