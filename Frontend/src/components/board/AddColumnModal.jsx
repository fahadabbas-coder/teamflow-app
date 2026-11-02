import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { X, Plus } from "lucide-react"
import toast from "react-hot-toast"
import Input from "../ui/Input"
import Button from "../ui/Button"
import { useBoardStore } from "../../stores/boardStore"
import * as columnApi from "../../api/columns"
import { createColumnSchema } from "../../lib/validators"


export default function AddColumnModal({ projectId, onClose }) {
    const addColumn = useBoardStore((s) => s.addColumn)
    const [loading, setLoading] = useState(false)

    const { register, handleSubmit, watch, formState: { errors } } = useForm({
        resolver: zodResolver(createColumnSchema),
        defaultValues: { name: "", category: "todo" }
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
        setLoading(true)
        try {
            const column = await columnApi.createColumn(projectId, {
                name: data.name,
                category: data.category
            })
            addColumn(column)
            toast.success("Column created")
            onClose()
        } catch (err) {
            const msg = err.response?.data?.message || "Failed to create column"
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
                        <Plus size={18} className="text-primary-600" />
                        <h2 className="text-base font-semibold text-gray-900">
                            Add column
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
                        placeholder="Review, Testing, Blocked..."
                        autoFocus
                        error={errors.name?.message}
                        {...register("name")}
                    />

                    {/* Category */}
                    <div>
                        <label className="label">Category</label>
                        <select className="input" {...register("category")}>
                            {CATEGORY_OPTIONS.map((c) => (
                                <option key={c.value} value={c.value}>
                                    {c.label}
                                </option>
                            ))}
                        </select>
                        <p className="mt-1.5 text-xs text-gray-500">
                            {CATEGORY_OPTIONS.find((c) => c.value === watch("category"))?.desc}
                            {" — sets task status when moved here"}
                        </p>
                    </div>

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
                            Create column
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}