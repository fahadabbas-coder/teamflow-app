import { useEffect } from "react"
import { Link } from "react-router-dom"
import { format, isPast, isToday, isTomorrow } from "date-fns"
import { ListTodo, CheckCircle2, AlertTriangle, ArrowRight, Calendar, Folder, Loader2 } from "lucide-react"

import { useAuthStore } from "../stores/authStore"
import { useDashboardStore } from "../stores/dashboardStore"
import { useProjectStore } from "../stores/projectStore"


// HELPERS

function formatDue(dueDate) {
    if (!dueDate) return null
    const d = new Date(dueDate)
    if (isToday(d)) return "Today"
    if (isTomorrow(d)) return "Tomorrow"
    if (isPast(d)) return format(d, "MMM d")
    return format(d, "MMM d")
}

function isOverdue(dueDate, status) {
    if (!dueDate || status === "done") return false
    const d = new Date(dueDate)
    return isPast(d) && !isToday(d)
}

const PRIORITY_STYLES = {
    low:    { color: "text-gray-600",   bg: "bg-gray-100" },
    medium: { color: "text-blue-700",   bg: "bg-blue-100" },
    high:   { color: "text-orange-700", bg: "bg-orange-100" },
    urgent: { color: "text-red-700",    bg: "bg-red-100" }
}


// MAIN COMPONENT

export default function Home() {
    const user = useAuthStore((s) => s.user)

    const myData = useDashboardStore((s) => s.myData)
    const myLoading = useDashboardStore((s) => s.myLoading)
    const fetchMyDashboard = useDashboardStore((s) => s.fetchMyDashboard)

    const fetchProjects = useProjectStore((s) => s.fetchProjects)


    // Fetch both on mount

    useEffect(() => {
        fetchMyDashboard()
        fetchProjects()
    }, [fetchMyDashboard, fetchProjects])

    const summary = myData?.summary || { total: 0, done: 0, overdue: 0 }
    const upcoming = myData?.upcoming || []
    const byProject = myData?.byProject || []

    // Projects list — only include ones with tasks (or all — choice)
    const visibleProjects = byProject.slice(0, 5)


    // Greeting

    const hour = new Date().getHours()
    const greeting =
        hour < 12 ? "Good Morning" :
        hour < 18 ? "Good Afternoon" :
        "Good Evening"

    const firstName = (user?.name || user?.username || "there").split(" ")[0]

    return (
        <div className="p-6 md:p-8 max-w-6xl mx-auto">

            {/*  WELCOME  */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">
                    {greeting}, {firstName} 👋
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    {format(new Date(), "EEEE, MMMM d")}
                </p>
            </div>

            {/*  SUMMARY CARDS  */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <StatCard
                    label="My tasks"
                    value={summary.total}
                    icon={ListTodo}
                    color="primary"
                    loading={myLoading && !myData}
                />
                <StatCard
                    label="Completed"
                    value={summary.done}
                    icon={CheckCircle2}
                    color="green"
                    loading={myLoading && !myData}
                />
                <StatCard
                    label="Overdue"
                    value={summary.overdue}
                    icon={AlertTriangle}
                    color={summary.overdue > 0 ? "red" : "gray"}
                    loading={myLoading && !myData}
                />
            </div>

            {/*  TWO COLUMN GRID  */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">


                {/* LEFT: MY PROJECTS */}

                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                            <Folder size={16} className="text-gray-400" />
                            My Projects
                        </h2>
                        <Link
                            to="/projects"
                            className="text-xs font-medium text-primary-600 hover:underline flex items-center gap-1"
                        >
                            View all <ArrowRight size={12} />
                        </Link>
                    </div>

                    {myLoading && !myData ? (
                        <div className="card p-6 flex items-center gap-2 text-gray-500 text-sm">
                            <Loader2 size={16} className="animate-spin" />
                            Loading...
                        </div>
                    ) : visibleProjects.length === 0 ? (
                        <div className="card p-8 text-center">
                            <p className="text-sm text-gray-500 mb-3">
                                No tasks assigned to you yet.
                            </p>
                            <Link to="/projects" className="btn-primary inline-flex text-sm">
                                Browse projects
                            </Link>
                        </div>
                    ) : (
                        <div className="card divide-y divide-gray-100">
                            {visibleProjects.map((p) => {
                                const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0
                                return (
                                    <Link
                                        key={p.projectId}
                                        to={`/projects/${p.projectId}`}
                                        className="block p-4 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {p.name}
                                            </p>
                                            <span className="text-xs text-gray-500 shrink-0 ml-2">
                                                {p.done}/{p.total}
                                            </span>
                                        </div>
                                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary-600 rounded-full transition-all"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </Link>
                                )
                            })}
                        </div>
                    )}
                </div>


                {/* RIGHT: UPCOMING*/}

                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                            <Calendar size={16} className="text-gray-400" />
                            Upcoming
                        </h2>
                        {upcoming.length > 0 && (
                            <span className="text-xs text-gray-500">
                                {upcoming.length} task{upcoming.length !== 1 ? "s" : ""}
                            </span>
                        )}
                    </div>

                    {myLoading && !myData ? (
                        <div className="card p-6 flex items-center gap-2 text-gray-500 text-sm">
                            <Loader2 size={16} className="animate-spin" />
                            Loading...
                        </div>
                    ) : upcoming.length === 0 ? (
                        <div className="card p-8 text-center">
                            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
                                <CheckCircle2 size={20} className="text-green-600" />
                            </div>
                            <p className="text-sm font-medium text-gray-900 mb-1">
                                All clear!
                            </p>
                            <p className="text-xs text-gray-500">
                                No upcoming deadlines.
                            </p>
                        </div>
                    ) : (
                        <div className="card divide-y divide-gray-100">
                            {upcoming.map((task) => (
                                <UpcomingTaskRow key={task._id} task={task} />
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}


// STAT CARD

function StatCard({ label, value, icon: Icon, color = "primary", loading }) {
    const colorMap = {
        primary: "text-primary-700 bg-primary-50",
        green:   "text-green-700 bg-green-50",
        red:     "text-red-700 bg-red-50",
        gray:    "text-gray-700 bg-gray-50"
    }

    return (
        <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {label}
                </p>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
                    <Icon size={16} />
                </div>
            </div>
            {loading ? (
                <div className="h-8 w-12 bg-gray-100 rounded animate-pulse" />
            ) : (
                <p className={`text-3xl font-bold ${colorMap[color].split(" ")[0]}`}>
                    {value}
                </p>
            )}
        </div>
    )
}


// UPCOMING TASK ROW

function UpcomingTaskRow({ task }) {
    const overdue = isOverdue(task.dueDate, task.status)
    const dueLabel = formatDue(task.dueDate)
    const priority = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium

    const projectId = task.project?._id || task.project
    const projectName = task.project?.name || "Project"
    const projectKey = task.project?.key

    return (
        <Link
            to={projectId ? `/projects/${projectId}?task=${task._id}` : "/projects"}
            className="block p-4 hover:bg-gray-50 transition-colors"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        {projectKey && (
                            <span className="text-[10px] font-mono text-gray-400 shrink-0">
                                {projectKey}
                            </span>
                        )}
                        <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${priority.bg} ${priority.color}`}>
                            {task.priority}
                        </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate">
                        {task.title}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                        {projectName}
                    </p>
                </div>

                {dueLabel && (
                    <span
                        className={`shrink-0 text-xs font-medium flex items-center gap-1 ${
                            overdue
                                ? "text-red-600"
                                : "text-gray-500"
                        }`}
                    >
                        <Calendar size={12} />
                        {dueLabel}
                    </span>
                )}
            </div>
        </Link>
    )
}