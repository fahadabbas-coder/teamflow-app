import { create } from "zustand"

export const useAuthStore = create((set, get) => ({
    user: null,  // { id, name, username, email, globalRole, ... }
    isAuthenticated: false,   // login hai ya nahi
    isInitialized: false,  // app boot hui? (spinner control)


    // Actions

    // Login success ke baad call 

    setAuth: (user) => set({
        user,
        isAuthenticated: true,
        isInitialized: true
    }),

    // Logout / session expire per

    clearAuth: () => set({
        user: null,
        isAuthenticated: false,
        isInitialized: true
    }),

    // App boot hone pe (agar refresh fail ho jaye)
    // FIX: set() call zaroori hai warna isInitialized false hi rehta hai

    setInitialized: () => set({ isInitialized: true }),

    // User profile update (naam badla, avatar badla)

    updateUser: (patch) => set((state) => ({
        user: state.user ? { ...state.user, ...patch } : null
    })),

    // Helper

    getUserId: () => get().user?.id || null

}))
