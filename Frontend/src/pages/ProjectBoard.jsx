import { useEffect, useState, useCallback, useMemo } from "react"
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom"
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners, closestCenter } from "@dnd-kit/core"
import { SortableContext, horizontalListSortingStrategy, arrayMove } from "@dnd-kit/sortable"
import { ArrowLeft, Plus, Settings, BarChart3, Activity as ActivityIcon, Download, Trash2 } from "lucide-react"
import toast from "react-hot-toast"
import * as columnApi from "../api/columns"

import { useBoardStore } from "../stores/boardStore"
import { useProjectStore } from "../stores/projectStore"
import Column from "../components/board/Column"
import TaskCard from "../components/board/TaskCard"
import { useProjectSocket } from "../hooks/useSocket"
import TaskModal from "../components/task/TaskModal"
import AddColumnModal from "../components/board/AddColumnModal"
import TrashModal from "../components/board/TrashModal"
import FilterBar from "../components/board/FilterBar"
import { matchesFilters, hasActiveFilters } from "../utils/filterTasks"
import { exportTasksToCSV } from "../utils/csv"


export default function ProjectBoard() {
    const { id: projectId } = useParams()
    const navigate = useNavigate()

    const [searchParams, setSearchParams] = useSearchParams()

    const [exporting, setExporting] = useState(false)


    const taskFromUrl = searchParams.get("task")
    // Task modal URL se derive hota hai (?task=<id>) — extra state ki zaroorat nahi
    const openTaskId = taskFromUrl

    // Modal open/close helpers
    function openTaskModal(taskId) {
        searchParams.set("task", taskId)
        setSearchParams(searchParams, { replace: true })
    }

    function closeTaskModal() {
        if (searchParams.has("task")) {
            searchParams.delete("task")
            setSearchParams(searchParams, { replace: true })
        }
    }

    // Store subscriptions (selective)
    const columns = useBoardStore((s) => s.columns)
    const tasksById = useBoardStore((s) => s.tasksById)
    const isLoading = useBoardStore((s) => s.isLoading)
    const error = useBoardStore((s) => s.error)
    const fetchBoard = useBoardStore((s) => s.fetchBoard)
    const moveTask = useBoardStore((s) => s.moveTask)
    const addTask = useBoardStore((s) => s.addTask)
    const updateTaskInStore = useBoardStore((s) => s.updateTaskInStore)
    const removeTask = useBoardStore((s) => s.removeTask)
    const applyRemoteMove = useBoardStore((s) => s.applyRemoteMove)
    const reorderColumnsLocal = useBoardStore((s) => s.reorderColumnsLocal)
    const addColumn = useBoardStore((s) => s.addColumn)
    const updateColumnInStore = useBoardStore((s) => s.updateColumnInStore)
    const setColumnsRemote = useBoardStore((s) => s.setColumnsRemote)
    const applyColumnDeletion = useBoardStore((s) => s.applyColumnDeletion)
    const reset = useBoardStore((s) => s.reset)

    // Project info (header ke liye)
    const projects = useProjectStore((s) => s.projects)
    const project = projects.find((p) => p._id === projectId)

    // Drag overlay me dikhne wala task
    const [activeTask, setActiveTask] = useState(null)
    const [showAddColumn, setShowAddColumn] = useState(false)
    const [showTrash, setShowTrash] = useState(false)

    // 🔌 SOCKET — realtime sync

    const { socket, connected } = useProjectSocket(projectId)

    useEffect(() => {
        if (!socket || !connected) return

        // task:created
        function onTaskCreated({ task }) {
            if (!task) return
            console.log("🔔 task:created", task.title)
            addTask(task)
        }

        // task:updated
        function onTaskUpdated({ task }) {
            if (!task) return
            console.log("🔔 task:updated", task.title)
            updateTaskInStore(task)
        }

        // task:deleted
        function onTaskDeleted({ taskId }) {
            if (!taskId) return
            console.log("🔔 task:deleted", taskId)
            removeTask(taskId)
        }

        // task:moved
        function onTaskMoved(payload) {
            console.log("🔔 task:moved", payload)
            // idempotent — same position ho to skip
            if (!payload?.taskId || !payload?.toColumnId) return

            applyRemoteMove({
                taskId: payload.taskId,
                toColumnId: payload.toColumnId,
                position: payload.position,
                task: payload.task
            })
        }

        // task:restored (koi task delete se wapas)
        function onTaskRestored({ task } = {}) {
            if (!task?._id) return
            console.log("🔔 task:restored", task.title)
            addTask(task)
        }

        // column:created
        function onColumnCreated({ column }) {
            if (!column?._id) return
            console.log("🔔 column:created", column.name)
            // idempotent — already exists? skip
            const exists = useBoardStore.getState().columns.some((c) => c._id === column._id)
            if (exists) return
            addColumn(column)
        }

        // column:updated (rename)
        function onColumnUpdated({ column }) {
            if (!column?._id) return
            updateColumnInStore(column)
        }

        // column:reordered
        function onColumnReordered({ columns: colDocs } = {}) {
            if (!Array.isArray(colDocs)) return
            console.log("🔔 column:reordered")
            setColumnsRemote(colDocs)
        }

        // column:deleted (tasks migrate hue backend pe)
        function onColumnDeleted({ columnId, moveTo } = {}) {
            if (!columnId) return
            console.log("🔔 column:deleted", columnId)
            applyColumnDeletion({ columnId, moveTo })
        }

        // Register
        socket.on("task:created", onTaskCreated)
        socket.on("task:updated", onTaskUpdated)
        socket.on("task:deleted", onTaskDeleted)
        socket.on("task:moved", onTaskMoved)
        socket.on("task:restored", onTaskRestored)
        socket.on("column:created", onColumnCreated)
        socket.on("column:updated", onColumnUpdated)
        socket.on("column:reordered", onColumnReordered)
        socket.on("column:deleted", onColumnDeleted)

        // Cleanup
        return () => {
            socket.off("task:created", onTaskCreated)
            socket.off("task:updated", onTaskUpdated)
            socket.off("task:deleted", onTaskDeleted)
            socket.off("task:moved", onTaskMoved)
            socket.off("task:restored", onTaskRestored)
            socket.off("column:created", onColumnCreated)
            socket.off("column:updated", onColumnUpdated)
            socket.off("column:reordered", onColumnReordered)
            socket.off("column:deleted", onColumnDeleted)
        }
    }, [socket, connected, addTask, updateTaskInStore, removeTask, applyRemoteMove, addColumn, updateColumnInStore, setColumnsRemote, applyColumnDeletion])


    // Sensors — pointer (mouse + touch)
    // distance: 5px — chhota move ignore karo (click vs drag confusion)

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 5 }
        })
    )


    // Fetch on mount / unmount cleanup

    useEffect(() => {
        if (projectId) fetchBoard(projectId)
        return () => reset()
    }, [projectId, fetchBoard, reset])


    // Helper — kaunsa column is task ka owner hai

    function findColumnOfTask(taskId) {
        return columns.find((c) => c.taskIds.includes(taskId))
    }


    function handleDragStart(event) {
        const type = event.active.data.current?.type
        if (type === "task") {
            setActiveTask(tasksById[event.active.id] || null)
        }
    }

    async function handleDragEnd(event) {
        setActiveTask(null)
        const { active, over } = event
        if (!over || active.id === over.id) return

        const type = active.data.current?.type

        //  COLUMN DRAG
        if (type === "column") {
            const oldIndex = columns.findIndex((c) => c._id === active.id)
            const newIndex = columns.findIndex((c) => c._id === over.id)
            if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

            // Optimistic
            reorderColumnsLocal(oldIndex, newIndex)

            // New order compute
            const reordered = arrayMove(columns, oldIndex, newIndex)
            const orderedIds = reordered.map((c) => c._id)

            try {
                await columnApi.reorderColumns(projectId, orderedIds)
            } catch {
                // Rollback
                reorderColumnsLocal(newIndex, oldIndex)
                toast.error("Failed to reorder columns")
            }
            return
        }

        // TASK MOVE 
        const taskId = active.id
        const fromCol = findColumnOfTask(taskId)
        if (!fromCol) return

        let toCol = columns.find((c) => c._id === over.id)
        let newIndex

        if (toCol) {
            newIndex = toCol.taskIds.length
        } else {
            toCol = findColumnOfTask(over.id)
            if (!toCol) return
            newIndex = toCol.taskIds.indexOf(over.id)
        }

        if (fromCol._id === toCol._id) {
            const fromIndex = fromCol.taskIds.indexOf(taskId)
            if (fromIndex === newIndex) return
        }

        const result = await moveTask({
            taskId,
            fromColumnId: fromCol._id,
            toColumnId: toCol._id,
            newIndex
        })

        if (!result.success) {
            toast.error(result.error || "Failed to move task")
        }
    }

    const collisionDetection = useCallback((args) => {
        const draggedType = args.active.data.current?.type

        // Column drag → only columns as targets
        if (draggedType === "column") {
            return closestCenter({
                ...args,
                droppableContainers: args.droppableContainers.filter(
                    (c) => c.data.current?.type === "column"
                )
            })
        }

        // Task drag → tasks + columns (empty column drop ke liye)
        return closestCorners(args)
    }, [])


    // Filters — URL param se
    const filters = {
        q: searchParams.get("q") || "",
        priority: searchParams.get("priority") || "",
        assigneeId: searchParams.get("assignee") || ""
    }

    const filtersActive = hasActiveFilters(filters)

    // Update URL pe filter change (task param preserve karo)
    function setFilters(next) {
        if (next.q) searchParams.set("q", next.q)
        else searchParams.delete("q")

        if (next.priority) searchParams.set("priority", next.priority)
        else searchParams.delete("priority")

        if (next.assigneeId) searchParams.set("assignee", next.assigneeId)
        else searchParams.delete("assignee")

        setSearchParams(searchParams, { replace: true })
    }

    // Filtered tasks (memoized — every task peek hi check karta)
    const filteredTasksById = useMemo(() => {
        if (!filtersActive) return tasksById
        const result = {}
        for (const [id, task] of Object.entries(tasksById)) {
            if (matchesFilters(task, filters)) result[id] = task
        }
        return result
    }, [tasksById, filters.q, filters.priority, filters.assigneeId, filtersActive])

    // Total visible count (for filter result display)
    const visibleCount = filtersActive
        ? Object.keys(filteredTasksById).length
        : Object.keys(tasksById).length

    async function handleExportCSV() {
        setExporting(true)
        try {
            // Board already loaded — extract all tasks from store
            const allTasks = columns.flatMap((col) =>
                col.taskIds.map((id) => tasksById[id]).filter(Boolean)
            )
            if (allTasks.length === 0) {
                toast.error("No tasks to export")
                return
            }
            const ok = exportTasksToCSV(allTasks, project?.key || project?.name || "project")
            if (ok) toast.success(`Exported ${allTasks.length} task${allTasks.length !== 1 ? "s" : ""}`)
        } catch {
            toast.error("Export failed")
        } finally {
            setExporting(false)
        }
    }
    // LOADING state

    if (isLoading && columns.length === 0) {
        return (
            <div className="p-6">
                <div className="h-8 w-48 bg-gray-200 rounded mb-6 animate-pulse" />
                <div className="flex gap-4">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="w-80 h-96 bg-white rounded-xl border border-gray-200 animate-pulse"
                        />
                    ))}
                </div>
            </div>
        )
    }


    // ERROR state

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                    {error}
                </div>
                <button
                    onClick={() => navigate("/projects")}
                    className="btn-secondary"
                >
                    ← Back to projects
                </button>
            </div>
        )
    }


    // MAIN BOARD

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="h-full flex flex-col bg-gray-50">

                {/* Header */}
                <div className="px-6 py-3 border-b border-gray-200 bg-white flex items-center gap-3 shrink-0">
                    {/* Back */}
                    <Link
                        to="/projects"
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                        aria-label="Back to projects"
                    >
                        <ArrowLeft size={20} />
                    </Link>

                    {/* Project info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-bold text-gray-900 truncate">
                                {project?.name || "Board"}
                            </h1>
                            <span
                                className={`shrink-0 w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-gray-300"
                                    }`}
                                title={connected ? "Live" : "Connecting..."}
                            />
                        </div>
                        {project?.key && (
                            <p className="text-xs text-gray-500 font-mono">{project.key}</p>
                        )}
                    </div>

                    {/*  Nav actions  */}
                    <div className="flex items-center gap-1">
                        <Link
                            to={`/projects/${projectId}/dashboard`}
                            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-primary-600 transition-colors"
                            title="Dashboard"
                            aria-label="Dashboard"
                        >
                            <BarChart3 size={18} />
                        </Link>
                        <Link
                            to={`/projects/${projectId}/settings`}
                            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-primary-600 transition-colors"
                            title="Project settings"
                            aria-label="Project settings"
                        >
                            <Settings size={18} />
                        </Link>
                        <Link
                            to={`/projects/${projectId}/activity`}
                            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-primary-600 transition-colors"
                            title="Activity"
                        >
                            <ActivityIcon size={18} />
                        </Link>
                                                <button
                            onClick={handleExportCSV}
                            disabled={exporting}
                            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-primary-600 transition-colors disabled:opacity-50"
                            title="Export tasks as CSV"
                            aria-label="Export CSV"
                        >
                            <Download size={18} />
                        </button>
                        <button
                            onClick={() => setShowTrash(true)}
                            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-red-600 transition-colors"
                            title="Deleted tasks (trash)"
                            aria-label="Trash"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>

                {/* Filter bar */}
                <FilterBar
                    projectId={projectId}
                    filters={filters}
                    onChange={setFilters}
                    resultCount={visibleCount}
                />

                {/*  Columns (horizontal scroll)  */}
                <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
                    <div className="flex gap-4 items-start h-full min-w-max">
                        {/* SortableContext for columns */}
                        <SortableContext
                            items={columns.map((c) => c._id)}
                            strategy={horizontalListSortingStrategy}
                        >
                            {columns.map((col) => (
                                <Column
                                    key={col._id}
                                    column={col}
                                    tasks={col.taskIds.map((id) => filteredTasksById[id]).filter(Boolean)}
                                    projectId={projectId}
                                    onOpenTask={openTaskModal}
                                    isFiltered={filtersActive}
                                />
                            ))}
                        </SortableContext>

                        {/* Add column (placeholder) */}
                        <button
                            onClick={() => setShowAddColumn(true)}
                            className="shrink-0 w-80 h-12 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50/30 transition-colors flex items-center justify-center gap-2 font-medium text-sm"
                        >
                            <Plus size={18} />
                            Add column
                        </button>
                    </div>
                </div>
            </div>

            {/*  Drag overlay tasks only (activeTask null for column drag)  */}
            <DragOverlay>
                {activeTask && (
                    <div className="rotate-2 scale-105 opacity-90">
                        <TaskCard task={activeTask} isOverlay />
                    </div>
                )}
            </DragOverlay>
            {/*  Task modal (single source)  */}
            {openTaskId && (
                <TaskModal
                    taskId={openTaskId}
                    onClose={closeTaskModal}
                />
            )}

            {showAddColumn && (
                <AddColumnModal
                    projectId={projectId}
                    onClose={() => setShowAddColumn(false)}
                />
            )}

            {showTrash && (
                <TrashModal
                    projectId={projectId}
                    onRestored={(restored) => addTask(restored)}
                    onClose={() => setShowTrash(false)}
                />
            )}
        </DndContext>
    )
}