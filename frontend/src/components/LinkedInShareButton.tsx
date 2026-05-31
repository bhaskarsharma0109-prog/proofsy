"use client";

import { motion } from "framer-motion";
import { cardTap } from "@/lib/animations";

interface LinkedInShareButtonProps {
  linkedInAddUrl: string;
}

export default function LinkedInShareButton({ linkedInAddUrl }: LinkedInShareButtonProps) {
  if (!linkedInAddUrl) return null;

  return (
    <motion.a
      href={linkedInAddUrl}
      target="_blank"
      rel="noopener noreferrer"
      whileTap={cardTap}
      whileHover={{ scale: 1.02, filter: "brightness(1.05)" }}
      className="inline-flex items-center gap-2 bg-[#0077b5] text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md shadow-blue-500/10 transition-shadow hover:shadow-lg hover:shadow-blue-500/20"
    >
      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.8v8.37h2.8v-4.67c0-.25.02-.5.1-.68a1.14 1.14 0 0 1 1-.77c.76 0 1 .58 1 1.42v4.7h2.8M6.5 8.37a1.37 1.37 0 1 0 0-2.75 1.37 1.37 0 0 0 0 2.75M8 18.5V10.13H5v8.37h3z" />
      </svg>
      Add to LinkedIn
    </motion.a>
  );
}
