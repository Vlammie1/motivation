import React, { createContext, useContext } from 'react';
import { useSupabaseProjects } from '../hooks/useSupabaseProjects';

type ProjectsValue = ReturnType<typeof useSupabaseProjects>;

const ProjectsContext = createContext<ProjectsValue | null>(null);

/** Eén gedeelde projectlijst: de timer, de projectenpagina en het logformulier
 *  moeten dezelfde projecten zien zodra er één bijkomt. */
export const ProjectsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const value = useSupabaseProjects();
    return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
};

export const useProjects = (): ProjectsValue => {
    const ctx = useContext(ProjectsContext);
    if (!ctx) throw new Error('useProjects moet binnen een ProjectsProvider staan');
    return ctx;
};
