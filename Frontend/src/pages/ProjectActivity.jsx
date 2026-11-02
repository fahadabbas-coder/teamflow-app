import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { ArrowLeft, Loader2, Activity as ActivityIcon } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import * as activityApi from "../api/activity"
import { useProjectStore } from "../stores/projectStore"
import { useProjectSocket } from "../hooks/useSocket"


// Human-readable action text

function formatAction(a) {
    const m = a.meta || {}
    const b = (txt) => <span className="font-medium text-gray-900">{txt}</span>

    switch (a.action) {
        case "TASK_CREATED":
            return <>created {b(m.title || "a task")}</>
        case "TASK_UPDATED":
            return <>updated {b(m.title || "a task")}</>
        case "TASK_MOVED":
            return <>moved a task to {b(m.toColumnName || m.toCategory || "another column")}</>
        case "TASK_ASSIGNED":
            return <>assigned a task</>
        case "TASK_UNASSIGNED":
            return <>unassigned a task</>
        case "TASK_DELETED":
            return <>deleted {b(m.title || "a task")}</>
        case "TASK_RESTORED":
            return <>restored {b(m.title || "a task")}</>
        case "COMMENT_ADDED":
            return <>commented {m.preview ? <>— {b(`"${m.preview}"`)}</> : ""}</>
        case "MEMBER_ADDED":
            return <>added a new member</>
        case "MEMBER_REMOVED":
            return <>removed a member</>
        case "MEMBER_ROLE_CHANGED":
            return <>changed a member's role</>
        case "COLUMN_CREATED":
            return <>created column {b(m.name || "a column")}</>
        case "COLUMN_UPDATED":
            return <>renamed a column</>
        case "COLUMN_DELETED":
            return <>deleted a column</>
        default:
            return a.action.replace(/_/g, " ").toLowerCase()
    }
}

export default function ProjectActivity() {
    const { id: projectId } = useParams()
    const projects = useProjectStore((s) => s.projects)
    const project = projects.find((p) => p._id === projectId)

    const [activities, setActivities] = useState([])
    const [nextCursor, setNextCursor] = useState(null)
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [error, setError] = useState(null)

    // SOCKET — realtime "activity:new" prepend

    const { socket, connected } = useProjectSocket(projectId)

    useEffect(() => {
        if (!socket || !connected) return

        function onActivityNew({ log } = {}) {
            // isi project ka event ho
            if (!log || String(log.project) !== projectId) return
            setActivities((prev) => {
                // dedupe
                if (prev.some((a) => a._id === log._id)) return prev
                // cursor-paginated list ke top pe prepend
                return [log, ...prev]
            })
        }

        socket.on("activity:new", onActivityNew)
        return () => socket.off("activity:new", onActivityNew)
    }, [socket, connected, projectId])


    // Initial load

    useEffect(() => {
        if (!projectId) return
        let cancelled = false

        async function load() {
            setLoading(true)
            setError(null)
            try {
                const res = await activityApi.getProjectActivity(projectId, { limit: 30 })
                if (cancelled) return
                setActivities(res.activities)
                setNextCursor(res.nextCursor)
            } catch (err) {
                if (cancelled) return
                setError(err.response?.data?.message || "Failed to load activity")
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        load()
        return () => { cancelled = true }
    }, [projectId])


    // Load more (cursor)

    async function loadMore() {
        if (!nextCursor || loadingMore) return
        setLoadingMore(true)
        try {
            const res = await activityApi.getProjectActivity(projectId, {
                cursor: nextCursor,
                limit: 30
            })
            setActivities((prev) => {
                const existing = new Set(prev.map((a) => a._id))
                return [...prev, ...res.activities.filter((a) => !existing.has(a._id))]
            })
            setNextCursor(res.nextCursor)
        } catch {
            // silent
        } finally {
            setLoadingMore(false)
        }
    }

    return (
        <div className="p-6 md:p-8 max-w-4xl mx-auto">

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <Link
                    to={`/projects/${projectId}`}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                    aria-label="Back to board"
                >
                    <ArrowLeft size={20} />
                </Link>
                <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-bold text-gray-900 truncate flex items-center gap-2">
                        <ActivityIcon size={20} className="text-gray-400" />
                        Activity
                    </h1>
                    <p className="text-xs text-gray-500">
                        {project?.name || "Project"}
                        {project?.key && ` · ${project.key}`}
                    </p>
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className="card p-8 text-center flex items-center justify-center gap-2 text-gray-500">
                    <Loader2 size={16} className="animate-spin" />
                    Loading activity...
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                    {error}
                </div>
            )}

            {/* Empty */}
            {!loading && !error && activities.length === 0 && (
                <div className="card p-12 text-center">
                    <ActivityIcon size={28} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-sm font-medium text-gray-900 mb-1">
                        No activity yet
                    </p>
                    <p className="text-xs text-gray-500">
                        Actions on this project will appear here.
                    </p>
                </div>
            )}

            {/* Feed */}
            {activities.length > 0 && (
                <div className="card divide-y divide-gray-100">
                    {activities.map((a) => {
                        const actor = a.actor || {}
                        const initial = (actor.name?.[0] || actor.username?.[0] || "?").toUpperCase()
                        return (
                            <div key={a._id} className="flex items-start gap-3 p-4">
                                <div className="w-9 h-9 rounded-full bg-primary-600 text-white text-sm font-semibold flex items-center justify-center shrink-0">
                                    {initial}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-700">
                                        <span className="font-medium text-gray-900">
                                            {actor.name || actor.username || "Someone"}
                                        </span>{" "}
                                        {formatAction(a)}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                                    </p>
                                </div>
                            </div>
                        )
                    })}

                    {nextCursor && (
                        <div className="p-3">
                            <button
                                onClick={loadMore}
                                disabled={loadingMore}
                                className="w-full py-2 text-sm font-medium text-primary-600 hover:bg-gray-50 rounded-md disabled:opacity-50"
                            >
                                {loadingMore ? "Loading..." : "Load more"}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}