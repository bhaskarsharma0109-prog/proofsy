import type { Variants } from "framer-motion";

// Page-level fade in with cinematic blur
export const pageVariants: Variants = {
  hidden: { opacity: 0, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: "easeOut", staggerChildren: 0.1 },
  },
};

// Stagger container for grids/lists
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.1 },
  },
};

// Fade up for cards and sections with blur and spring
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 350, damping: 25 },
  },
};

// Fade in from left for sidebar items
export const fadeLeft: Variants = {
  hidden: { opacity: 0, x: -16 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

// Scale up for interactive cards
export const scaleUp: Variants = {
  hidden: { opacity: 0, scale: 0.9, filter: "blur(5px)" },
  visible: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 400, damping: 20 },
  },
};

// For table rows
export const tableRow: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

// Header slide down
export const headerSlide: Variants = {
  hidden: { opacity: 0, y: -10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

// Hover spring for cards (magnetic-like feel)
export const cardHover = {
  scale: 1.03,
  y: -4,
  transition: { type: "spring" as const, stiffness: 500, damping: 20 },
};

// Satisfying Tap effect
export const cardTap = {
  scale: 0.95,
  transition: { type: "spring" as const, stiffness: 600, damping: 20 },
};

// Float animation (for decorative elements)
export const float: Variants = {
  animate: {
    y: [0, -8, 0],
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
  },
};

// Pulse glow
export const pulseGlow: Variants = {
  animate: {
    opacity: [0.4, 0.8, 0.4],
    scale: [1, 1.05, 1],
    transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
  },
};

// Rotate slowly (for decorative)
export const slowRotate: Variants = {
  animate: {
    rotate: [0, 360],
    transition: { duration: 20, repeat: Infinity, ease: "linear" },
  },
};
