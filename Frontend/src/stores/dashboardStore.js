import { create } from "zustand"
import * as api from "../api/dashboard"

// IN-FLIGHT DEDUPE
const inflight = new Map()

export const useDashboardStore = create((set, get) => ({

    // PROJECT DASHBOARD

    projectId: null,
    range: 30,
    data: null,
    isLoading: false,
    error: null,
    hasFetched: false,

    // FETCH project dashboard
    // force = true → cache ignore, refetch
    fetchProjectDashboard: async (projectId, range = 30, force = false) => {
        const state = get()

        // Same project + range loaded? → skip
        if (
            !force &&
            state.hasFetched &&
            state.projectId === projectId &&
            state.range === range
        ) {
            return
        }

        const key = `fetchProjectDashboard:${projectId}:${range}`
        if (inflight.has(key)) return inflight.get(key)

        const promise = (async () => {
            try {
                set({
                    projectId,
                    range,
                    isLoading: true,
                    error: null
                })

                const data = await api.getProjectDashboard(projectId, range)
                set({
                    data,
                    isLoading: false,
                    hasFetched: true,
                    error: null
                })
            } catch (err) {
                const msg = err.response?.data?.message || "Failed to load dashboard"
                set({
                    isLoading: false,
                    error: msg,
                    data: null
                })
            } finally {
                inflight.delete(key)
            }
        })()

        inflight.set(key, promise)
        return promise
    },

    // Change range → refetch
    setRange: async (range) => {
        const { projectId } = get()
        set({ range })
        if (projectId) {
            await get().fetchProjectDashboard(projectId, range, true)
        }
    },

    // Manual refresh (after task changes)
    refresh: async () => {
        const { projectId, range } = get()
        if (projectId) {
            await get().fetchProjectDashboard(projectId, range, true)
        }
    },


    // MY DASHBOARD (optional — home page ke liye)

    myData: null,
    myLoading: false,
    myError: null,
    myFetched: false,

    fetchMyDashboard: async (force = false) => {
        if (!force && get().myFetched) return

        const key = "fetchMyDashboard"
        if (inflight.has(key)) return inflight.get(key)

        const promise = (async () => {
            try {
                set({ myLoading: true, myError: null })
                const data = await api.getMyDashboard()
                set({ myData: data, myLoading: false, myFetched: true })
            } catch (err) {
                set({
                    myLoading: false,
                    myError: err.response?.data?.message || "Failed to load"
                })
            } finally {
                inflight.delete(key)
            }
        })()

        inflight.set(key, promise)
        return promise
    },


    // RESET (logout / project switch)

    reset: () => set({
        projectId: null,
        range: 30,
        data: null,
        isLoading: false,
        error: null,
        hasFetched: false,
        myData: null,
        myLoading: false,
        myError: null,
        myFetched: false
    })
}))