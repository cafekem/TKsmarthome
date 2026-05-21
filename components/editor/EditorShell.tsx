"use client";

import { useEffect, useState } from "react";
import { useDesignStore } from "@/lib/store";
import { TopBar } from "./TopBar";
import { LibraryPanel } from "./LibraryPanel";
import { PropertiesPanel } from "./PropertiesPanel";
import { StatusBar } from "./StatusBar";
import { Canvas2D } from "@/components/canvas2d/Canvas2D";
import { Scene3D } from "@/components/scene3d/Scene3D";
import { SimView } from "@/components/simulation/SimView";
import { AISurveyDialog } from "@/components/ai/AISurveyDialog";

function useHasHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  return hydrated;
}

export function EditorShell({ designId }: { designId: string }) {
  const ensureDesign = useDesignStore((s) => s.ensureDesign);
  const setCurrent = useDesignStore((s) => s.setCurrentDesign);
  const mode = useDesignStore((s) => s.viewMode);
  const aiSurveyOpen = useDesignStore((s) => s.aiSurveyOpen);
  const setAISurveyOpen = useDesignStore((s) => s.setAISurveyOpen);
  const hydrated = useHasHydrated();

  useEffect(() => {
    if (!hydrated) return;
    ensureDesign(designId);
    setCurrent(designId);
  }, [designId, ensureDesign, setCurrent, hydrated]);

  if (!hydrated) {
    return <div className="flex h-screen items-center justify-center" />;
  }

  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden">
      <TopBar />
      <div className="flex flex-1 min-h-0">
        <div className="w-64 shrink-0">
          <LibraryPanel />
        </div>
        <div className="relative flex-1 min-w-0">
          {mode === "2d" && <Canvas2D />}
          {mode === "3d" && <Scene3D />}
          {mode === "sim" && <SimView />}
        </div>
        <div className="w-80 shrink-0">
          <PropertiesPanel />
        </div>
      </div>
      <StatusBar />
      <AISurveyDialog
        open={aiSurveyOpen}
        onClose={() => setAISurveyOpen(false)}
      />
    </div>
  );
}
