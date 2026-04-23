"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import type { Project } from "@/lib/types";

interface ProjectContextValue {
  selectedProject: Project | null;
  setSelectedProject: (project: Project | null) => void;
}

const ProjectContext = createContext<ProjectContextValue>({
  selectedProject: null,
  setSelectedProject: () => {},
});

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [selectedProject, setSelectedProjectState] = useState<Project | null>(null);

  const setSelectedProject = useCallback((project: Project | null) => {
    setSelectedProjectState(project);
  }, []);

  return (
    <ProjectContext.Provider value={{ selectedProject, setSelectedProject }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectContext() {
  return useContext(ProjectContext);
}
