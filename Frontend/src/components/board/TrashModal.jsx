import { useEffect, useState } from "react"
import { X, Trash2, RotateCcw, Loader2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import toast from "react-hot-toast"
import * as taskApi from "../../api/tasks"


// TRASH — soft-deleted tasks list + restore
// Props: { projectId, onRestored(task), onClose }

export default function TrashModal({ projectId, onRestored, onClose }) {
    const [tasks, setTasks] = useState([])
    const [loading, setLoading] = useState(true)
    const [restoringId, setRestoringId] = useState(null)

    useEffect(() => {
        let cancelled = false
        async function load() {
            setLoading(true)
            try {
                const list = await taskApi.getTrashedTasks(projectId)
                if (!cancelled) setTasks(list)
            } catch (err) {
                if (!cancelled) {
                    toast.error(err.response?.data?.message || "Failed to load trash")
                }
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        load()
        return () => { cancelled = true }
    }, [projectId])


    // ESC → close
    useEffect(() => {
        function onEsc(e) {
            if (e.key === "Escape" && !restoringId) onClose()
        }
        document.addEventListener("keydown", onEsc)
        return () => document.removeEventListener("keydown", onEsc)
    }, [onClose, restoringId])


    async function handleRestore(task) {
        setRestoringId(task._id)
        try {
            const restored = await taskApi.restoreTask(task._id)
            setTasks((prev) => prev.filter((t) => t._id !== task._id))
            // board pe wapas add (board addTask idempotent hai)
            onRestored?.(restored)
            toast.success(`"${task.title}" restored`)
        } catch (err) {
            toast.error(err.response?.data?.message || "Restore failed")
        } finally {
            setRestoringId(null)
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center p-4 md:p-8 bg-black/50 overflow-y-auto"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-xl shadow-xl w-full max-w-lg my-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-200">
                    <Trash2 size={16} className="text-gray-400" />
                    <h2 className="text-base font-semibold text-gray-900 flex-1">
                        Deleted Tasks
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4">
                    {loading && (
                        <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
                            <Loader2 size={16} className="animate-spin" />
                            Loading...
                        </div>
                    )}

                    {!loading && tasks.length === 0 && (
                        <p className="text-sm text-gray-400 italic text-center py-10">
                            Trash is empty
                        </p>
                    )}

                    {!loading && tasks.map((t) => (
                        <div
                            key={t._id}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50"
                        >
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    {t.seq ? <span className="text-xs text-gray-400 font-mono mr-1.5">{`TASK-${t.seq}`}</span> : null}
                                    {t.title}
                                </p>
                                <p className="text-xs text-gray-400">
                                    Deleted {t.deletedAt ? formatDistanceToNow(new Date(t.deletedAt), { addSuffix: true }) : ""}
                                </p>
                            </div>
                            <button
                                onClick={() => handleRestore(t)}
                                disabled={restoringId}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-50 rounded-md disabled:opacity-50 shrink-0"
                            >
                                {restoringId === t._id
                                    ? <Loader2 size={14} className="animate-spin" />
                                    : <RotateCcw size={14} />}
                                Restore
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
