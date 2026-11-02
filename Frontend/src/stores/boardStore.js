import { create } from "zustand"
import * as taskApi from "../api/tasks"


// Helper — incoming nested board ko normalized me convert

function normalizeBoard(board) {
    const columns = []
    const tasksById = {}

    for (const col of board) {
        const taskIds = []
        for (const task of col.tasks || []) {
            tasksById[task._id] = task
            taskIds.push(task._id)
        }
        columns.push({
            _id: col._id,
            name: col.name,
            category: col.category,
            position: col.position,
            taskIds
        })
    }

    // columns sort by position
    columns.sort((a, b) => a.position - b.position)

    return { columns, tasksById }
}


// Helper — array me item move karo (immutable)

function arrayMove(arr, fromIndex, toIndex) {
    const result = [...arr]
    const [item] = result.splice(fromIndex, 1)
    result.splice(toIndex, 0, item)
    return result
}


// Helper — move task between columns (immutable)

function applyMove(columns, taskId, fromColId, toColId, newIndex) {
    return columns.map((col) => {
        // Source column — task remove karo
        if (col._id === fromColId && fromColId !== toColId) {
            return {
                ...col,
                taskIds: col.taskIds.filter((id) => id !== taskId)
            }
        }
        // Target column — task insert karo naye position pe
        if (col._id === toColId) {
            // Same column me reorder — pehle remove phir insert
            const withoutTask = col.taskIds.filter((id) => id !== taskId)
            const result = [...withoutTask]
            result.splice(newIndex, 0, taskId)
            return { ...col, taskIds: result }
        }
        return col
    })
}


// STORE

export const useBoardStore = create((set, get) => ({
    // State
    projectId: null,
    myRole: null,
    columns: [],
    tasksById: {},
    isLoading: false,
    error: null,
    hasFetched: false,


    // FETCH board

    fetchBoard: async (projectId, force = false) => {
        const current = get()
        // Already loaded same project? skip
        if (!force && current.hasFetched && current.projectId === projectId) {
            return
        }

        set({ isLoading: true, error: null, projectId })
        try {
            const board = await taskApi.getBoard(projectId)
            const { columns, tasksById } = normalizeBoard(board)
            set({
                columns,
                tasksById,
                isLoading: false,
                hasFetched: true,
                error: null
            })
        } catch (err) {
            const msg = err.response?.data?.message || "Failed to load board"
            set({ isLoading: false, error: msg })
        }
    },


    // MOVE task (drag & drop) — OPTIMISTIC
    // args: { taskId, fromColumnId, toColumnId, newIndex }
    // Returns: { success, error? }

    moveTask: async ({ taskId, fromColumnId, toColumnId, newIndex }) => {
        const prevColumns = get().columns
        const prevTasks = get().tasksById

        // 1. Optimistic local update
        const newColumns = applyMove(prevColumns, taskId, fromColumnId, toColumnId, newIndex)

        // 2. Status bhi update karo (target column ka category)
        const targetCol = newColumns.find((c) => c._id === toColumnId)
        const targetTask = prevTasks[taskId]
        const updatedTasks = {
            ...prevTasks,
            [taskId]: targetTask
                ? { ...targetTask, status: targetCol?.category || targetTask.status, column: toColumnId }
                : targetTask
        }

        set({ columns: newColumns, tasksById: updatedTasks })

        // 3. Compute neighbors (fractional indexing)
        const targetColumn = newColumns.find((c) => c._id === toColumnId)
        const prevTaskId = targetColumn.taskIds[newIndex - 1] || null
        const nextTaskId = targetColumn.taskIds[newIndex + 1] || null

        // 4. API call
        try {
            const fresh = await taskApi.moveTask(taskId, {
                columnId: toColumnId,
                prevTaskId,
                nextTaskId
            })
            // backend se latest task (with correct order) merge
            if (fresh) {
                set((state) => ({
                    tasksById: { ...state.tasksById, [taskId]: fresh }
                }))
            }
            return { success: true }
        } catch (err) {
            // 5. Rollback on failure
            set({ columns: prevColumns, tasksById: prevTasks })
            const msg = err.response?.data?.message || "Failed to move task"
            return { success: false, error: msg }
        }
    },

    //moveTask ke baad add 
    
    applyRemoteMove: ({ taskId, toColumnId, position, task }) => {
        set((state) => {
            const existing = state.tasksById[taskId]

            // idempotent — same column + same order? skip
            if (
                existing &&
                existing.column === toColumnId &&
                existing.order === position
            ) {
                return state
            }

            // Task data update
            const updatedTask = task || existing
            const newTasks = { ...state.tasksById, [taskId]: updatedTask }

            // Columns rebuild — old se remove, new me add, order se sort
            const newColumns = state.columns.map((col) => {
                // Old column — task remove karo
                if (col.taskIds.includes(taskId) && col._id !== toColumnId) {
                    return {
                        ...col,
                        taskIds: col.taskIds.filter((id) => id !== taskId)
                    }
                }
                // Target column — add karo
                if (col._id === toColumnId) {
                    const withoutTask = col.taskIds.filter((id) => id !== taskId)
                    const combined = [...withoutTask, taskId]

                    // order ke hisaab se sort karo
                    const sorted = combined.sort((a, b) => {
                        const orderA = newTasks[a]?.order ?? 0
                        const orderB = newTasks[b]?.order ?? 0
                        return orderA - orderB
                    })

                    return { ...col, taskIds: sorted }
                }
                return col
            })

            return { columns: newColumns, tasksById: newTasks }
        })
    },


    // ADD task (create ke baad)
    // Backend ke order me last position hoti hai → append (prepend nahi)
    //  — idempotent

    addTask: (task) => {
        if (!task?._id) return
        set((state) => {
            // lready exists? skip
            if (state.tasksById[task._id]) return state

            const columns = state.columns.map((col) =>
                col._id === task.column
                    ? { ...col, taskIds: [...col.taskIds, task._id] }
                    : col
            )
            return {
                columns,
                tasksById: { ...state.tasksById, [task._id]: task }
            }
        })
    },


    // UPDATE one task (title, desc, priority, etc.)

    updateTaskInStore: (task) => {
        if (!task?._id) return
        set((state) => ({
            tasksById: { ...state.tasksById, [task._id]: task }
        }))
    },


    // REMOVE task (delete ke baad)

    removeTask: (taskId) => {
        set((state) => {
            const tasksById = { ...state.tasksById }
            delete tasksById[taskId]
            const columns = state.columns.map((col) => ({
                ...col,
                taskIds: col.taskIds.filter((id) => id !== taskId)
            }))
            return { columns, tasksById }
        })
    },


    // REORDER columns (left-right drag)

    reorderColumnsLocal: (fromIndex, toIndex) => {
        set((state) => ({
            columns: arrayMove(state.columns, fromIndex, toIndex)
        }))
    },


    // ADD column (create ke baad) — idempotent: duplicate na ho

    addColumn: (column) => {
        set((state) => {
            if (state.columns.some((c) => c._id === column._id)) return state
            return {
                columns: [
                    ...state.columns,
                    { ...column, taskIds: [] }
                ]
            }
        })
    },


    // REMOVE column (delete ke baad)

    removeColumn: (columnId) => {
        set((state) => {
            const col = state.columns.find((c) => c._id === columnId)
            const tasksById = { ...state.tasksById }
            // Us column ke tasks bhi hataao
            col?.taskIds.forEach((tid) => delete tasksById[tid])
            return {
                columns: state.columns.filter((c) => c._id !== columnId),
                tasksById
            }
        })
    },


    // REMOTE column deletion (socket se — tasks migrate hue hain backend pe)
    // payload: { columnId, moveTo }

    applyColumnDeletion: ({ columnId, moveTo }) => {
        set((state) => {
            const col = state.columns.find((c) => c._id === columnId)
            if (!col) return state

            const movedTaskIds = col.taskIds
            const tasksById = { ...state.tasksById }
            let columns

            if (moveTo) {
                // tasks target column me migrate — local copy bhi wahan bhejo
                columns = state.columns
                    .filter((c) => c._id !== columnId)
                    .map((c) =>
                        c._id === moveTo
                            ? { ...c, taskIds: [...c.taskIds, ...movedTaskIds] }
                            : c
                    )
                movedTaskIds.forEach((id) => {
                    if (tasksById[id]) tasksById[id] = { ...tasksById[id], column: moveTo }
                })
            } else {
                columns = state.columns.filter((c) => c._id !== columnId)
                movedTaskIds.forEach((id) => delete tasksById[id])
            }

            return { columns, tasksById }
        })
    },


    // REMOTE column reorder/rename — position ke hisaab se rebuild
    // columnDocs: backend se aayi columns array (position sorted)

    setColumnsRemote: (columnDocs) => {
        if (!Array.isArray(columnDocs)) return
        set((state) => {
            const newColumns = columnDocs
                .map((col) => {
                    const existing = state.columns.find((c) => c._id === col._id)
                    return {
                        _id: col._id,
                        name: col.name,
                        category: col.category,
                        position: col.position,
                        taskIds: existing ? existing.taskIds : []
                    }
                })
                .sort((a, b) => a.position - b.position)
            return { columns: newColumns }
        })
    },


    // UPDATE column name (rename)

    updateColumnInStore: (column) => {
        set((state) => ({
            columns: state.columns.map((c) =>
                c._id === column._id ? { ...c, name: column.name } : c
            )
        }))
    },


    // Helpers

    getTaskById: (taskId) => get().tasksById[taskId] || null,
    getColumnById: (columnId) => get().columns.find((c) => c._id === columnId) || null,


    // RESET (navigate away / logout)

    reset: () =>
        set({
            projectId: null,
            myRole: null,
            columns: [],
            tasksById: {},
            isLoading: false,
            error: null,
            hasFetched: false
        })
}))