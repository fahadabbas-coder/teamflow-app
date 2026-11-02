import { useEffect, useState } from "react"
import { Plus, Archive, ArchiveRestore } from "lucide-react"
import { useLocation, useSearchParams } from "react-router-dom"
import toast from "react-hot-toast"
import { useProjectStore } from "../stores/projectStore"
import * as projectApi from "../api/projects"
import ProjectCard from "../components/projects/ProjectCard"
import CreateProjectModal from "../components/projects/CreateProjectModal"

// Human-readable role label (urdu bhi cm ho sakta)
const ROLE_LABELS = { owner: "Owner", manager: "Manager", member: "Member", viewer: "Viewer" }

export default function Projects() {
    const [searchParams, setSearchParams] = useSearchParams()
    const { search } = useLocation()
    const projects = useProjectStore((s) => s.projects)
    const isLoading = useProjectStore((s) => s.isLoading)
    const error = useProjectStore((s) => s.error)
    const fetchProjects = useProjectStore((s) => s.fetchProjects)

    // Sidebar ka "New Project" yahan modal khole (create=1)
    const [showCreateModal, setShowCreateModal] = useState(
        () => searchParams.get("create") === "1"
    )

    // Jab query param change ho (sidebar Link se navigation) toh modal state sync karo.
    // useLocation().search string use ki hai kyunki searchParams object same route
    // par query change hone pe reference change nahi karta, jis se useEffect trigger nahi hota.
    useEffect(() => {
        const params = new URLSearchParams(search)
        setShowCreateModal(params.get("create") === "1")
    }, [search])

    function closeCreateModal() {
        setShowCreateModal(false)
        if (searchParams.get("create")) {
            searchParams.delete("create")
            setSearchParams(searchParams, { replace: true })
        }
    }


    // ARCHIVED view

    const [showArchived, setShowArchived] = useState(false)
    const [archived, setArchived] = useState([])
    const [archivedLoading, setArchivedLoading] = useState(false)
    const [unarchivingId, setUnarchivingId] = useState(null)

    useEffect(() => {
        if (!showArchived) return
        let cancelled = false
        async function load() {
            setArchivedLoading(true)
            try {
                const list = await projectApi.getArchivedProjects()
                if (!cancelled) setArchived(list)
            } catch (err) {
                if (!cancelled) toast.error(err.response?.data?.message || "Failed to load archived")
            } finally {
                if (!cancelled) setArchivedLoading(false)
            }
        }
        load()
        return () => { cancelled = true }
    }, [showArchived])

    async function handleUnarchive(p) {
        setUnarchivingId(p._id)
        try {
            await projectApi.unarchiveProject(p._id)
            setArchived((prev) => prev.filter((x) => x._id !== p._id))
            // live list refresh (active projects me wapas aayega)
            fetchProjects(true)
            toast.success(`"${p.name}" unarchived`)
        } catch (err) {
            toast.error(err.response?.data?.message || "Unarchive failed")
        } finally {
            setUnarchivingId(null)
        }
    }


    // Fetch on mount (hasFetched flag se double-fetch nahi hoga)

    useEffect(() => {
        fetchProjects()
    }, [fetchProjects])

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto">

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {projects.length > 0
                            ? `${projects.length} project${projects.length > 1 ? "s" : ""}`
                            : "Manage all your team projects in one place"}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowArchived((v) => !v)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                            showArchived
                                ? "bg-primary-600 border-primary-600 text-white"
                                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                    >
                        <Archive size={16} />
                        Archived
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        <Plus size={18} />
                        <span className="hidden sm:inline">New Project</span>
                    </button>
                </div>
            </div>

            {/* ARCHIVED VIEW */}
            {showArchived && (
                <>
                    {archivedLoading && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="card p-5 animate-pulse">
                                    <div className="h-4 bg-gray-200 rounded mb-2 w-3/4" />
                                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                                </div>
                            ))}
                        </div>
                    )}

                    {!archivedLoading && archived.length === 0 && (
                        <div className="card p-12 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                                <Archive size={28} className="text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                No archived projects
                            </h3>
                            <p className="text-sm text-gray-500">
                               Archived projects will be listed here, and you can unarchive them anytime.
                            </p>
                        </div>
                    )}

                    {!archivedLoading && archived.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {archived.map((p) => (
                                <div key={p._id} className="card p-5 opacity-90">
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 truncate">
                                                {p.name}
                                            </p>
                                            <p className="text-xs text-gray-400 font-mono">
                                                {p.key}
                                            </p>
                                        </div>
                                        <span className="shrink-0 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                                            Archived
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-4">
                                        You are {ROLE_LABELS[p.myRole] || p.myRole || "member"}
                                    </p>
                                    {p.myRole === "owner" && (
                                        <button
                                            onClick={() => handleUnarchive(p)}
                                            disabled={unarchivingId === p._id}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-md disabled:opacity-50"
                                        >
                                            <ArchiveRestore size={14} />
                                            Unarchive
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* ACTIVE VIEW */}
            {!showArchived && (
                <>
            {/* Error state */}
            {error && !isLoading && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                    {error}
                </div>
            )}

            {/* Loading skeleton */}
            {isLoading && projects.length === 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="card p-5 animate-pulse">
                            <div className="flex items-start gap-3 mb-4">
                                <div className="w-10 h-10 rounded-lg bg-gray-200" />
                                <div className="flex-1">
                                    <div className="h-4 bg-gray-200 rounded mb-2 w-3/4" />
                                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                                </div>
                            </div>
                            <div className="h-3 bg-gray-100 rounded mb-2" />
                            <div className="h-3 bg-gray-100 rounded w-2/3" />
                        </div>
                    ))}
                </div>
            )}

            {/* Empty state */}
            {!isLoading && projects.length === 0 && !error && (
                <div className="card p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-50 flex items-center justify-center">
                        <Plus size={28} className="text-primary-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        No projects yet
                    </h3>
                    <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
                        Create your first project to start organizing tasks with your team.
                    </p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        <Plus size={18} />
                        Create your first project
                    </button>
                </div>
            )}

            {/* Projects grid */}
            {projects.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projects.map((p) => (
                        <ProjectCard key={p._id} project={p} />
                    ))}
                </div>
            )}
                </>
            )}

            {/* Create modal */}
            {showCreateModal && (
                <CreateProjectModal
                    onClose={closeCreateModal}
                />
            )}
        </div>
    )
}

