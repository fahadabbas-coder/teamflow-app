import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { X, Pencil } from "lucide-react"
import toast from "react-hot-toast"
import Input from "../ui/Input"
import Button from "../ui/Button"
import { useBoardStore } from "../../stores/boardStore"
import * as columnApi from "../../api/columns"
import { updateColumnSchema } from "../../lib/validators"


export default function RenameColumnModal({ projectId, column, onClose }) {
    const updateColumnInStore = useBoardStore((s) => s.updateColumnInStore)
    const [loading, setLoading] = useState(false)

    const { register, handleSubmit, formState: { errors } } = useForm({
        resolver: zodResolver(updateColumnSchema),
        defaultValues: { name: column?.name || "" }
    })

    // ESC → close
    useEffect(() => {
        function onEsc(e) {
            if (e.key === "Escape" && !loading) onClose()
        }
        document.addEventListener("keydown", onEsc)
        return () => document.removeEventListener("keydown", onEsc)
    }, [loading, onClose])


    // Submit

    async function onSubmit(data) {
        const name = data.name.trim()
        if (name === column.name) {
            onClose()
            return
        }

        setLoading(true)
        try {
            const updated = await columnApi.updateColumn(projectId, column._id, { name })
            updateColumnInStore(updated)
            toast.success("Column renamed")
            onClose()
        } catch (err) {
            const msg = err.response?.data?.message || "Failed to rename column"
            toast.error(msg)
        } finally {
            setLoading(false)
        }
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
                        <Pencil size={18} className="text-primary-600" />
                        <h2 className="text-base font-semibold text-gray-900">
                            Rename column
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

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4" noValidate>
                    {/* Name */}
                    <Input
                        label="Column name"
                        placeholder="Enter new name"
                        autoFocus
                        error={errors.name?.message}
                        {...register("name")}
                    />

                    {/* Info note */}
                    <p className="text-xs text-gray-500">
                        Category (<span className="font-medium capitalize">{column.category.replace("_", " ")}</span>) remains unchanged.
                        Only the display name will update.
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={loading}>
                            Save
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}