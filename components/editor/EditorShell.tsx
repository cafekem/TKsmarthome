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
import { AIAdvisorPanel } from "@/components/ai/AIAdvisorPanel";
import { AIChatPanel } from "@/components/ai/AIChatPanel";

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
  const setViewMode = useDesignStore((s) => s.setViewMode);
  const mode = useDesignStore((s) => s.viewMode);
  const aiSurveyOpen = useDesignStore((s) => s.aiSurveyOpen);
  const setAISurveyOpen = useDesignStore((s) => s.setAISurveyOpen);
  const aiAdvisorOpen = useDesignStore((s) => s.aiAdvisorOpen);
  const setAIAdvisorOpen = useDesignStore((s) => s.setAIAdvisorOpen);
  const aiChatOpen = useDesignStore((s) => s.aiChatOpen);
  const setAIChatOpen = useDesignStore((s) => s.setAIChatOpen);
  const hydrated = useHasHydrated();

  useEffect(() => {
    if (!hydrated) return;
    ensureDesign(designId);
    setCurrent(designId);
    // Always land in 2D when the editor mounts — even if the user was in 3D or
    // Sim mode last time. They can still flip back to the other modes via the
    // mode switcher; this just prevents the editor from "stranding" the user
    // in a mode that requires content they haven't created yet.
    setViewMode("2d");
  }, [designId, ensureDesign, setCurrent, setViewMode, hydrated]);

  // ⌘K / Ctrl-K opens (or closes) the AI chat panel. We listen at the window
  // so any focused element can be interrupted by the shortcut.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAIChatOpen(!aiChatOpen);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aiChatOpen, setAIChatOpen]);

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
      <AIAdvisorPanel
        open={aiAdvisorOpen}
        onClose={() => setAIAdvisorOpen(false)}
      />
      <AIChatPanel open={aiChatOpen} onClose={() => setAIChatOpen(false)} />
    </div>
  );
}
