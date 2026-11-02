import { create } from "zustand"
import * as projectApi from "../api/projects"

export const useProjectStore = create((set, get) => ({

    // State

    projects: [],
    isLoading: false,
    error: null,
    hasFetched: false,   // ek baar fetch ho gaya? (double-call avoid)


    // FETCH all my projects

    fetchProjects: async (force = false) => {
        // Already loaded? Skip (unless force = true)
        if (get().hasFetched && !force) return get().projects

        set({ isLoading: true, error: null })
        try {
            const projects = await projectApi.getMyProjects()
            set({
                projects,
                isLoading: false,
                hasFetched: true,
                error: null
            })
            return projects
        } catch (err) {
            const msg = err.response?.data?.message || "Failed to load projects"
            set({ isLoading: false, error: msg })
            return []
        }
    },


    // CREATE — new project list me add karo

    addProject: (project) => set((state) => ({
        projects: [
            { ...project, myRole: project.myRole || "owner" },
            ...state.projects
        ]
    })),


    // UPDATE — ek project patch karo

    updateOne: (id, patch) => set((state) => ({
        projects: state.projects.map((p) =>
            p._id === id ? { ...p, ...patch } : p
        )
    })),


    // REMOVE — list se hataao (delete / leave ke baad)

    removeProject: (id) => set((state) => ({
        projects: state.projects.filter((p) => p._id !== id)
    })),


    // GET one by id (find in current list)

    getProjectById: (id) => get().projects.find((p) => p._id === id) || null,


    // RESET — logout pe call karo

    reset: () => set({
        projects: [],
        isLoading: false,
        error: null,
        hasFetched: false
    })
}))