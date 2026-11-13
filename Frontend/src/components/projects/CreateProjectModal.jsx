import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { X } from "lucide-react"
import toast from "react-hot-toast"
import Input from "../ui/Input"
import Button from "../ui/Button"
import { useProjectStore } from "../../stores/projectStore"
import * as projectApi from "../../api/projects"
import { createProjectSchema } from "../../lib/validators"


export default function CreateProjectModal({ onClose }) {
    const addProject = useProjectStore((s) => s.addProject)
    const [loading, setLoading] = useState(false)

    const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
        resolver: zodResolver(createProjectSchema),
        defaultValues: { name: "", key: "", description: "" }
    })

    
    // Auto-generate key from name (agar user ne touch nahi kiya)
    
    const nameValue = watch("name")
    const keyValue = watch("key")

    useEffect(() => {
        // Sirf tab auto-fill karo jab key empty ho
        if (!keyValue && nameValue) {
            const suggested = nameValue
                .replace(/[^a-zA-Z0-9]/g, "")
                .slice(0, 5)
                .toUpperCase()
            if (suggested.length >= 2) {
                setValue("key", suggested, { shouldValidate: false })
            }
        }
    }, [nameValue]) 

    
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
            const project = await projectApi.createProject({
                name: data.name,
                key: data.key,
                description: data.description || ""
            })
            addProject(project)
            toast.success("Project created!")
            onClose()
        } catch (err) {
            const msg = err.response?.data?.message || "Failed to create project"
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
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Create new project
                    </h2>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50"
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="p-6 space-y-4"
                    noValidate
                >
                    {/* Name */}
                    <Input
                        label="Project Name"
                        placeholder="Website Redesign"
                        autoFocus
                        error={errors.name?.message}
                        {...register("name")}
                    />

                    {/* Key */}
                    <div>
                        <Input
                            label="Project Key"
                            placeholder="PROJ-42"
                            maxLength={10}
                            style={{ textTransform: "uppercase", fontFamily: "monospace" }}
                            error={errors.key?.message}
                            {...register("key")}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Short identifier — used for task IDs (e.g.{" "}
                            <span className="font-mono font-medium">
                                {(keyValue || "PROJ").toUpperCase()}-42
                            </span>
                            )
                        </p>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="label">Description</label>
                        <textarea
                            rows={3}
                            placeholder="What is this project about?"
                            className="input resize-none"
                            {...register("description")}
                        />
                        {errors.description && (
                            <p className="mt-1 text-sm text-red-600">
                                {errors.description.message}
                            </p>
                        )}
                    </div>

                    {/* Footer buttons */}
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
                            Create project
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}