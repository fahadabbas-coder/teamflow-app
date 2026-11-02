import { useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { ArrowLeft, RefreshCw } from "lucide-react"
import { useDashboardStore } from "../stores/dashboardStore"
import { useProjectStore } from "../stores/projectStore"
import StatCard from "../components/dashboard/StatCard"
import BurndownChart from "../components/dashboard/BurndownChart"
import PriorityChart from "../components/dashboard/PriorityChart"
import AssigneeChart from "../components/dashboard/AssigneeChart"
import ThroughputChart from "../components/dashboard/ThroughputChart"

const RANGES = [
    { value: 7, label: "7 days" },
    { value: 30, label: "30 days" },
    { value: 90, label: "90 days" }
]

export default function ProjectDashboard() {
    const { id: projectId } = useParams()

    const data = useDashboardStore((s) => s.data)
    const range = useDashboardStore((s) => s.range)
    const isLoading = useDashboardStore((s) => s.isLoading)
    const error = useDashboardStore((s) => s.error)
    const fetchProjectDashboard = useDashboardStore((s) => s.fetchProjectDashboard)
    const setRange = useDashboardStore((s) => s.setRange)
    const refresh = useDashboardStore((s) => s.refresh)
    const reset = useDashboardStore((s) => s.reset)

    const projects = useProjectStore((s) => s.projects)
    const project = projects.find((p) => p._id === projectId)


    // Fetch on mount

    useEffect(() => {
        if (projectId) fetchProjectDashboard(projectId, range)
        return () => reset()
    }, [projectId])


    // LOADING

    if (isLoading && !data) {
        return (
            <div className="p-6 md:p-8 max-w-7xl mx-auto">
                <div className="h-8 w-48 bg-gray-200 rounded mb-6 animate-pulse" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="card p-5 animate-pulse">
                            <div className="h-3 w-20 bg-gray-200 rounded mb-3" />
                            <div className="h-8 w-12 bg-gray-200 rounded" />
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="card p-5 h-72 animate-pulse bg-gray-50" />
                    ))}
                </div>
            </div>
        )
    }


    // ERROR

    if (error) {
        return (
            <div className="p-6 md:p-8 max-w-7xl mx-auto">
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                    {error}
                </div>
                <Link to="/projects" className="btn-secondary inline-flex">
                    ← Back to projects
                </Link>
            </div>
        )
    }

    const summary = data?.summary || {}
    const completionPct = summary.total
        ? Math.round((summary.done / summary.total) * 100)
        : 0


    // EMPTY (no tasks at all)

    const isEmpty = !summary.total

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto">

            {/* HEADER */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
                <Link
                    to={`/projects/${projectId}`}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                    aria-label="Back to board"
                >
                    <ArrowLeft size={20} />
                </Link>

                <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-bold text-gray-900 truncate">
                        {project?.name || "Dashboard"}
                    </h1>
                    {project?.key && (
                        <p className="text-xs text-gray-500 font-mono">{project.key}</p>
                    )}
                </div>

                {/* Range selector */}
                <div className="flex items-center gap-2">
                    <div className="flex bg-gray-100 rounded-lg p-0.5">
                        {RANGES.map((r) => (
                            <button
                                key={r.value}
                                onClick={() => setRange(r.value)}
                                disabled={isLoading}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-50 ${range === r.value
                                    ? "bg-white text-gray-900 shadow-sm"
                                    : "text-gray-600 hover:text-gray-900"
                                    }`}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => refresh()}
                        disabled={isLoading}
                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                        title="Refresh"
                    >
                        <RefreshCw
                            size={16}
                            className={isLoading ? "animate-spin" : ""}
                        />
                    </button>
                </div>
            </div>

            {/* EMPTY STATE */}
            {isEmpty ? (
                <div className="card p-12 text-center">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        No tasks yet
                    </h3>
                    <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
                        Add some tasks to the board to see your dashboard come to life.
                    </p>
                    <Link
                        to={`/projects/${projectId}`}
                        className="btn-primary inline-flex"
                    >
                        Go to board
                    </Link>
                </div>
            ) : (
                <>
                    {/* SUMMARY CARDS */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <StatCard
                            label="Total tasks"
                            value={summary.total || 0}
                            sublabel={`${completionPct}% complete`}
                            color="primary"
                        />
                        <StatCard
                            label="Completed"
                            value={summary.done || 0}
                            sublabel={`of ${summary.total || 0}`}
                            color="green"
                        />
                        <StatCard
                            label="In Progress"
                            value={summary.inProgress || 0}
                            sublabel={`${summary.todo || 0} in todo`}
                            color="blue"
                        />
                        <StatCard
                            label="Overdue"
                            value={summary.overdue || 0}
                            sublabel={
                                summary.overdue > 0 ? "Needs attention" : "All good"
                            }
                            color={summary.overdue > 0 ? "red" : "gray"}
                        />
                    </div>

                    {/* CHARTS GRID */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                        {/* Burndown — line chart */}
                        <div className="card p-5">
                            <h3 className="text-sm font-semibold text-gray-900 mb-4">
                                Burndown
                            </h3>
                            <BurndownChart data={data?.burndown || []} />
                        </div>

                        {/* Priority — pie/donut */}
                        <div className="card p-5">
                            <h3 className="text-sm font-semibold text-gray-900 mb-4">
                                By Priority
                            </h3>
                            <PriorityChart data={data?.byPriority || []} />
                        </div>

                        {/* Assignee — bar */}
                        <div className="card p-5">
                            <h3 className="text-sm font-semibold text-gray-900 mb-4">
                                Workload by Assignee
                            </h3>
                            <AssigneeChart data={data?.byAssignee || []} />
                        </div>

                        {/* Throughput — area */}
                        <div className="card p-5">
                            <h3 className="text-sm font-semibold text-gray-900 mb-4">
                                Throughput (tasks created)
                            </h3>
                            <ThroughputChart data={data?.throughput || []} />
                        </div>

                    </div>
                </>
            )}
        </div>
    )
}