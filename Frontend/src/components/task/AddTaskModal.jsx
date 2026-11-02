import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { X } from "lucide-react"
import toast from "react-hot-toast"
import Input from "../ui/Input"
import Button from "../ui/Button"
import { useBoardStore } from "../../stores/boardStore"
import * as taskApi from "../../api/tasks"
import { createTaskSchema } from "../../lib/validators"


export default function AddTaskModal({ projectId, columnId, columnName, onClose }) {
    const addTask = useBoardStore((s) => s.addTask)
    const [loading, setLoading] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors }
    } = useForm({
        resolver: zodResolver(createTaskSchema),
        defaultValues: {
            title: "",
            description: "",
            priority: "medium",
            dueDate: ""
        }
    })

    
    // ESC key → close
    
    useEffect(() => {
        function handleEsc(e) {
            if (e.key === "Escape" && !loading) onClose()
        }
        document.addEventListener("keydown", handleEsc)
        return () => document.removeEventListener("keydown", handleEsc)
    }, [loading, onClose])

    
    // Submit
    
    async function onSubmit(data) {
        setLoading(true)
        try {
            const task = await taskApi.createTask(projectId, {
                title: data.title,
                description: data.description || "",
                columnId,
                priority: data.priority,
                dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null
            })
            addTask(task)
            toast.success("Task created")
            onClose()
        } catch (err) {
            const msg = err.response?.data?.message || "Failed to create task"
            toast.error(msg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-24 bg-black/50 overflow-y-auto"
            onClick={() => !loading && onClose()}
        >
            <div
                className="bg-white rounded-xl shadow-xl w-full max-w-lg"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
                    <div>
                        <h2 className="text-base font-semibold text-gray-900">
                            New task
                        </h2>
                        {columnName && (
                            <p className="text-xs text-gray-500">
                                in <span className="font-medium">{columnName}</span>
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="p-5 space-y-4"
                    noValidate
                >
                    {/* Title */}
                    <Input
                        label="Title"
                        placeholder="What needs to be done?"
                        autoFocus
                        error={errors.title?.message}
                        {...register("title")}
                    />

                    {/* Description */}
                    <div>
                        <label className="label">Description</label>
                        <textarea
                            rows={3}
                            placeholder="Add more details (optional)"
                            className="input resize-none"
                            {...register("description")}
                        />
                        {errors.description && (
                            <p className="mt-1 text-sm text-red-600">
                                {errors.description.message}
                            </p>
                        )}
                    </div>

                    {/* Priority + Due date — 2 columns */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="label">Priority</label>
                            <select className="input" {...register("priority")}>
                                {["low", "medium", "high", "urgent"].map((p) => (
                                    <option key={p} value={p}>
                                        {p[0].toUpperCase() + p.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="label">Due date</label>
                            <input
                                type="date"
                                className="input"
                                {...register("dueDate")}
                            />
                        </div>
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
                            Create task
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}