import { NavLink, Link } from "react-router-dom"
import { Folder, LayoutDashboard, Plus, X } from "lucide-react"
import Logo from "../../assets/Logo.png"
import { useProjectStore } from "../../stores/projectStore"

export default function Sidebar({ mobileOpen, onMobileClose }) {
    const projects = useProjectStore((s) => s.projects)


    // Nav link style helper

    const linkClass = ({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
            ? "bg-primary-50 text-primary-700"
            : "text-gray-700 hover:bg-gray-100"
        }`


    // Sidebar content (desktop + mobile same)

    const content = (
        <>
            {/* Logo */}
            <div className="h-16 flex items-center justify-between px-5 border-b border-gray-200">
                <Link
                    to="/"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                    <img src={Logo} alt="TeamFlow logo" className="h-8 w-auto" />
                    <span className="text-xl font-bold text-primary-600">TeamFlow</span>
                </Link>
                {/* Close button (mobile only) */}
                <button
                    onClick={onMobileClose}
                    className="md:hidden p-1 text-gray-500 hover:text-gray-700"
                    aria-label="Close sidebar"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Create project button */}
            <div className="p-4">
                <Link
                    to="/projects?create=1"
                    onClick={onMobileClose}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                    <Plus size={18} />
                    New Project
                </Link>
            </div>

            {/* Scrollable nav area */}
            <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-6">

                {/* Main nav */}
                <div>
                    <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        Main
                    </p>
                    <div className="space-y-1">
                        <NavLink to="/projects" className={linkClass} onClick={onMobileClose}>
                            <Folder size={18} />
                            Projects
                        </NavLink>
                        <NavLink to="/" className={linkClass} onClick={onMobileClose} end>
                            <LayoutDashboard size={18} />
                            Dashboard
                        </NavLink>
                    </div>
                </div>

                {/* Projects list */}
                {projects.length > 0 && (
                    <div>
                        <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            My Projects
                        </p>
                        <div className="space-y-0.5">
                            {projects.slice(0, 8).map((p) => (
                                <Link
                                    key={p._id}
                                    to={`/projects/${p._id}`}
                                    onClick={onMobileClose}
                                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors group"
                                >
                                    {/* Color dot with first letter of key */}
                                    <span className="shrink-0 w-6 h-6 rounded bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center">
                                        {p.key?.[0]?.toUpperCase() || "P"}
                                    </span>
                                    <span className="truncate flex-1">{p.name}</span>
                                    <span className="text-xs text-gray-400 group-hover:text-gray-600">
                                        {p.key}
                                    </span>
                                </Link>
                            ))}

                            {projects.length > 8 && (
                                <Link
                                    to="/projects"
                                    onClick={onMobileClose}
                                    className="block px-3 py-2 text-xs text-primary-600 hover:underline"
                                >
                                    View all ({projects.length})
                                </Link>
                            )}
                        </div>
                    </div>
                )}

            </nav>
        </>
    )

    return (
        <>

            {/* DESKTOP — always visible (md+) */}

            <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col shrink-0">
                {content}
            </aside>


            {/* MOBILE — drawer + backdrop */}

            {mobileOpen && (
                <div className="fixed inset-0 z-40 md:hidden">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={onMobileClose}
                    />

                    {/* Drawer */}
                    <aside className="relative w-64 h-full bg-white flex flex-col shadow-xl">
                        {content}
                    </aside>
                </div>
            )}
        </>
    )
}