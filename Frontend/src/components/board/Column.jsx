import { useState } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Plus, MoreVertical, Pencil, Trash2, GripVertical } from "lucide-react"
import TaskCard from "./TaskCard"
import AddTaskModal from "../task/AddTaskModal"
import RenameColumnModal from "./RenameColumnModal"
import DeleteColumnModal from "./DeleteColumnModal"

export default function Column({ column, tasks, projectId, onOpenTask, isFiltered = false }) {
    const [menuOpen, setMenuOpen] = useState(false)
    const [showAddTask, setShowAddTask] = useState(false)
    const [showRename, setShowRename] = useState(false)
    const [showDelete, setShowDelete] = useState(false)

    // useSortable — column ko draggable + droppable dono banata
    const { setNodeRef, attributes, listeners, transform, transition, isDragging,isOver } = useSortable({
        id: column._id,
        data: {
            type: "column",
            columnId: column._id
        }
    })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1
    }

    const taskIds = tasks.map((t) => t._id)

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`
                shrink-0 w-80 max-h-full flex flex-col rounded-xl
                bg-gray-100 border transition-colors
                ${isOver && !isDragging ? "border-primary-400 bg-primary-50/50" : "border-gray-200"}
            `}
        >
            {/*  HEADER  */}
            <div className="flex items-center justify-between px-3 py-2.5 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                    {/* rag handle — sirf isse column drag hoga */}
                    <button
                        {...attributes}
                        {...listeners}
                        className="p-0.5 text-gray-400 hover:text-gray-700 cursor-grab active:cursor-grabbing touch-none"
                        title="Drag column"
                        aria-label="Drag column"
                    >
                        <GripVertical size={16} />
                    </button>

                    <h3 className="font-semibold text-gray-900 text-sm truncate">
                        {column.name}
                    </h3>
                    <span className="shrink-0 text-xs font-medium text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200">
                        {tasks.length}
                    </span>
                </div>

                {/* Menu */}
                <div className="relative">
                    <button
                        onClick={() => setMenuOpen((v) => !v)}
                        className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-200"
                        aria-label="Column menu"
                    >
                        <MoreVertical size={16} />
                    </button>

                    {menuOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setMenuOpen(false)}
                            />
                            <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20">
                                <button
                                    onClick={() => {
                                        setMenuOpen(false)
                                        setShowRename(true)
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                                >
                                    <Pencil size={14} /> Rename
                                </button>
                                <button
                                    onClick={() => {
                                        setMenuOpen(false)
                                        setShowDelete(true)
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 text-left border-t border-gray-100"
                                >
                                    <Trash2 size={14} /> Delete
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/*  TASKS  */}
            <div className="flex-1 overflow-y-auto px-2 pb-2 min-h-20">
                <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                        {tasks.map((task) => (
                            <TaskCard key={task._id} task={task} onOpen={onOpenTask} />
                        ))}

                        {tasks.length === 0 && (
                            <div className="text-center py-8 text-xs text-gray-400">
                                {isFiltered ? "No matching tasks" : "No tasks yet"}
                            </div>
                        )}
                    </div>
                </SortableContext>
            </div>

            {/*  ADD TASK  */}
            <div className="p-2 shrink-0">
                <button
                    onClick={() => setShowAddTask(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors"
                >
                    <Plus size={16} />
                    Add task
                </button>
            </div>

            {/* Modals */}
            {showAddTask && (
                <AddTaskModal
                    projectId={projectId}
                    columnId={column._id}
                    columnName={column.name}
                    onClose={() => setShowAddTask(false)}
                />
            )}
            {showRename && (
                <RenameColumnModal
                    projectId={projectId}
                    column={column}
                    onClose={() => setShowRename(false)}
                />
            )}
            {showDelete && (
                <DeleteColumnModal
                    projectId={projectId}
                    column={column}
                    onClose={() => setShowDelete(false)}
                />
            )}
        </div>
    )
}