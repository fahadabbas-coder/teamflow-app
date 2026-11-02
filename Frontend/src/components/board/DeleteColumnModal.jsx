import { useState, useEffect } from "react"
import { X, Trash2, AlertTriangle, ArrowRight } from "lucide-react"
import toast from "react-hot-toast"
import Button from "../ui/Button"
import { useBoardStore } from "../../stores/boardStore"
import * as columnApi from "../../api/columns"

export default function DeleteColumnModal({ projectId, column, onClose }) {
    const columns = useBoardStore((s) => s.columns)

    const [loading, setLoading] = useState(false)
    const [targetColumnId, setTargetColumnId] = useState("")

    // Task count is column me
    const taskCount = column?.taskIds?.length || 0
    const hasTasks = taskCount > 0

    // Doosre columns (migration targets)
    const otherColumns = columns.filter((c) => c._id !== column._id)


    // Default target — pehla available column

    useEffect(() => {
        if (hasTasks && otherColumns.length > 0 && !targetColumnId) {
            
            setTargetColumnId(otherColumns[0]._id)
        }
    }, [hasTasks, otherColumns, targetColumnId])

    // ESC → close
    useEffect(() => {
        function onEsc(e) {
            if (e.key === "Escape" && !loading) onClose()
        }
        document.addEventListener("keydown", onEsc)
        return () => document.removeEventListener("keydown", onEsc)
    }, [loading, onClose])


    // Delete flow

    async function handleDelete() {
        // Tasks hain, but no other column → block
        if (hasTasks && !targetColumnId) {
            toast.error("Select a column to move tasks to")
            return
        }

        setLoading(true)
        try {
            await columnApi.deleteColumn(
                projectId,
                column._id,
                hasTasks ? targetColumnId : null
            )
            // NOTE: Optimistic removeColumn yahan nahi — agar tasks migrate ho rahe hain
            // to removeColumn unhe tasksById se delete kar dega, phir socket
            // column:deleted ka applyColumnDeletion column nahi dhund pata aur tasks
            // migrate nahi honge. Socket event se applyColumnDeletion chalega jo
            // column hatayega aur tasks ko target column me move karega.
            toast.success("Column deleted")
            onClose()
        } catch (err) {
            const msg = err.response?.data?.message || "Failed to delete column"
            toast.error(msg)
        } finally {
            setLoading(false)
        }
    }


    // Case: only 1 column exists (can't delete last)

    if (otherColumns.length === 0) {
        return (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
                onClick={onClose}
            >
                <div
                    className="bg-white rounded-xl shadow-xl w-full max-w-md"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
                        <h2 className="text-base font-semibold text-gray-900">
                            Cannot delete
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                        >
                            <X size={18} />
                        </button>
                    </div>
                    <div className="p-6 text-center">
                        <AlertTriangle size={32} className="text-orange-500 mx-auto mb-3" />
                        <p className="text-sm text-gray-700 mb-1">
                            This is the only column in the project.
                        </p>
                        <p className="text-xs text-gray-500 mb-4">
                            Add another column first before deleting this one.
                        </p>
                        <Button variant="secondary" onClick={onClose}>
                            Close
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => !loading && onClose()}
        >
            <div
                className="bg-white rounded-xl shadow-xl w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                        <Trash2 size={18} className="text-red-600" />
                        <h2 className="text-base font-semibold text-gray-900">
                            Delete column?
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4">

                    {/* Warning */}
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                        <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
                        <div className="text-sm text-red-800">
                            <p className="font-medium">
                                "{column.name}" will be deleted
                            </p>
                            {hasTasks && (
                                <p className="text-xs mt-1 text-red-700">
                                    This column contains <strong>{taskCount} task{taskCount !== 1 ? "s" : ""}</strong>.
                                    They must be moved before deletion.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Migration selector (only if hasTasks) */}
                    {hasTasks && (
                        <div>
                            <label className="label flex items-center gap-1.5">
                                <ArrowRight size={14} />
                                Move tasks to:
                            </label>
                            <select
                                value={targetColumnId}
                                onChange={(e) => setTargetColumnId(e.target.value)}
                                className="input"
                                disabled={loading}
                            >
                                {otherColumns.map((c) => (
                                    <option key={c._id} value={c._id}>
                                        {c.name} ({c.taskIds.length} tasks)
                                    </option>
                                ))}
                            </select>
                            <p className="mt-1.5 text-xs text-gray-500">
                                Tasks will keep their content, but their status will update to match the target column's category.
                            </p>
                        </div>
                    )}

                    {/* If no tasks — simple confirm */}
                    {!hasTasks && (
                        <p className="text-sm text-gray-600">
                            This column is empty. Are you sure you want to delete it?
                        </p>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <Button
                            variant="secondary"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleDelete}
                            isLoading={loading}
                            disabled={hasTasks && !targetColumnId}
                        >
                            <Trash2 size={14} />
                            Delete column
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}