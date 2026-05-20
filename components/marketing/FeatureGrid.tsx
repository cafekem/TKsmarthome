"use client";

import { motion } from "framer-motion";
import {
  Boxes,
  Eye,
  Footprints,
  Layers,
  Play,
  Wifi,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  accent: string;
}

const features: Feature[] = [
  {
    icon: Layers,
    title: "2D ↔ 3D toggle",
    description:
      "Design in clean top-down 2D, then press a key and your plan inflates into a real 3D world. Same data, two views, zero friction.",
    accent: "from-emerald-400/30 to-emerald-400/0",
  },
  {
    icon: Footprints,
    title: "First-person walkthrough",
    description:
      "WASD through the building you just designed. See exactly what each camera sees, find dead zones with your own eyes.",
    accent: "from-sky-400/30 to-sky-400/0",
  },
  {
    icon: Play,
    title: "Threat simulation",
    description:
      "Drop a threat actor, draw their path, hit play. Cameras light up green when they see, red when they don't. Get an after-action report.",
    accent: "from-rose-400/30 to-rose-400/0",
  },
  {
    icon: Eye,
    title: "Live camera POV",
    description:
      "Hover any camera in 3D to see its actual point of view. Picture-in-picture monitoring wall, in your browser.",
    accent: "from-amber-400/30 to-amber-400/0",
  },
  {
    icon: Wifi,
    title: "Coverage heatmaps",
    description:
      "Color the floor by camera redundancy and WiFi signal strength. Spot blind spots and weak coverage instantly.",
    accent: "from-violet-400/30 to-violet-400/0",
  },
  {
    icon: Boxes,
    title: "BoM & PDF export",
    description:
      "One click for a branded survey report with the device list, floor plans, and a simulation summary. Built for your customer, not for you.",
    accent: "from-teal-400/30 to-teal-400/0",
  },
];

export function FeatureGrid() {
  return (
    <section id="features" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl mb-16">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Built for the way modern security teams actually work.
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Six things the old tools either don&apos;t do or do badly.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.45, ease: "easeOut", delay: i * 0.05 }}
              className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/30"
            >
              <div
                className={`absolute -top-12 -right-12 size-40 rounded-full blur-3xl opacity-60 bg-gradient-to-br ${feature.accent}`}
              />
              <div className="relative">
                <div className="inline-flex items-center justify-center rounded-lg border border-border bg-background/60 p-2.5">
                  <feature.icon className="size-5 text-primary" />
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
