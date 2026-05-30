"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import { pageVariants, staggerContainer, fadeUp, headerSlide, cardHover, pulseGlow } from "@/lib/animations";

interface Pathway {
  id: string;
  name: string;
  steps: string[];
}

export default function PathwaysPage() {
  const [pathways, setPathways] = useState<Pathway[]>([
    {
      id: "path-1",
      name: "Security Analyst Journey",
      steps: ["Fundamentals", "Practical Assessment", "Certification"],
    },
  ]);
  const [name, setName] = useState("");

  const addPathway = () => {
    if (!name.trim()) return;

    setPathways((current) => [
      {
        id: `path-${Date.now()}`,
        name: name.trim(),
        steps: ["Step 1", "Step 2", "Final Credential"],
      },
      ...current,
    ]);
    setName("");
  };

  return (
    <div className="flex min-h-screen bg-[var(--color-background)]">
      <Sidebar />
      <main className="flex-1 overflow-auto relative">
        <motion.div variants={pulseGlow} animate="animate" className="absolute top-24 right-16 w-60 h-60 bg-teal-200/15 rounded-full blur-3xl pointer-events-none" />
        <motion.div variants={pulseGlow} animate="animate" style={{ animationDelay: '1.2s' }} className="absolute bottom-32 left-24 w-48 h-48 bg-indigo-200/10 rounded-full blur-3xl pointer-events-none" />

        <motion.header variants={headerSlide} initial="hidden" animate="visible" className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-[var(--color-border)] px-8 py-5">
          <h2 className="text-xl font-bold text-[var(--color-foreground)]">Pathways</h2>
          <p className="text-sm text-[var(--color-muted)] mt-0.5">Create structured learning journeys with visual roadmaps.</p>
        </motion.header>

        <motion.div variants={pageVariants} initial="hidden" animate="visible" className="px-8 py-8 space-y-6 relative z-[1]">
          <motion.section variants={fadeUp} className="bg-white rounded-2xl border border-[var(--color-border)] p-6">
            <div className="flex gap-3">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addPathway()}
                placeholder="New pathway name"
                className="flex-1 border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10"
              />
              <motion.button
                onClick={addPathway}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="bg-[var(--color-primary)] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[var(--color-primary-dark)] cursor-pointer"
              >
                Create Pathway
              </motion.button>
            </div>
          </motion.section>

          <motion.div variants={staggerContainer} className="grid gap-5">
            <AnimatePresence mode="popLayout">
              {pathways.map((pathway) => (
                <motion.section
                  key={pathway.id}
                  variants={fadeUp}
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                  whileHover={cardHover}
                  className="bg-white rounded-2xl border border-[var(--color-border)] p-6"
                >
                  <h3 className="text-lg font-bold text-[var(--color-foreground)]">{pathway.name}</h3>
                  <p className="text-sm text-[var(--color-muted)] mt-1">Use pathways to sequence learning, delivery, and credential issuance.</p>
                  <div className="mt-6 flex flex-col md:flex-row md:items-start gap-4">
                    {pathway.steps.map((step, index) => (
                      <motion.div
                        key={step}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 + index * 0.1, duration: 0.35 }}
                        className="flex-1 flex items-start gap-3"
                      >
                        <div className="w-9 h-9 rounded-full bg-[var(--color-primary-faint)] text-[var(--color-primary)] font-bold flex items-center justify-center shrink-0">
                          {index + 1}
                        </div>
                        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4 flex-1">
                          <p className="text-sm font-semibold text-[var(--color-foreground)]">{step}</p>
                          <p className="text-xs text-[var(--color-muted)] mt-1">Milestone {index + 1} in the pathway.</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.section>
              ))}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
