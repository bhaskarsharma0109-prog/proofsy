import type { Variants } from "framer-motion";

// Page-level fade in
export const pageVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.4, ease: "easeOut", staggerChildren: 0.08 },
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

// Fade up for cards and sections
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] },
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
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
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

// Hover spring for cards
export const cardHover = {
  scale: 1.02,
  y: -2,
  transition: { type: "spring" as const, stiffness: 400, damping: 25 },
};

// Tap effect
export const cardTap = {
  scale: 0.98,
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
