import { useState } from "react"
import { Outlet } from "react-router-dom"
import Sidebar from "./Sidebar"
import Topbar from "./Topbar"

export default function AppLayout() {
    // Mobile pe sidebar drawer khula hai ya band
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

    return (
        <div className="h-screen flex bg-gray-50 overflow-hidden">

            {/* Sidebar (fixed / drawer) */}
            <Sidebar
                mobileOpen={mobileSidebarOpen}
                onMobileClose={() => setMobileSidebarOpen(false)}
            />

            {/* Right column: Topbar + Content */}
            <div className="flex-1 flex flex-col min-w-0">
                <Topbar onMenuClick={() => setMobileSidebarOpen(true)} />

                <main className="flex-1 overflow-y-auto">
                    <Outlet />
                </main>
            </div>

        </div>
    )
}