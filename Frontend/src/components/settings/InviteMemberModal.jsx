import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { X, UserPlus } from "lucide-react"
import toast from "react-hot-toast"
import Input from "../ui/Input"
import Button from "../ui/Button"
import * as memberApi from "../../api/members"
import { addMemberSchema } from "../../lib/validators"


const ROLE_OPTIONS = [
    { value: "member",  label: "Member",  desc: "Can create & edit tasks" },
    { value: "manager", label: "Manager", desc: "Can also manage members" },
    { value: "viewer",  label: "Viewer",  desc: "Read-only access" }
]

export default function InviteMemberModal({ projectId, existingMembers = [], onClose, onInvited }) {
    const [loading, setLoading] = useState(false)

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors }
    } = useForm({
        resolver: zodResolver(addMemberSchema),
        defaultValues: { email: "", projectRole: "member" }
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
        const email = data.email.toLowerCase().trim()

        // Client-side duplicate check
        const already = existingMembers.find(
            (m) => m.userId?.email?.toLowerCase() === email
        )
        if (already) {
            toast.error("This user is already a project member")
            return
        }

        setLoading(true)
        try {
            const member = await memberApi.addMember(projectId, {
                email,
                projectRole: data.projectRole
            })
            onInvited?.(member)
            toast.success("Member invited")
        } catch (err) {
            const msg = err.response?.data?.message || "Failed to invite"
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
                        <UserPlus size={18} className="text-primary-600" />
                        <h2 className="text-base font-semibold text-gray-900">
                            Invite member
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
                    {/* Email */}
                    <Input
                        label="Email address"
                        type="email"
                        placeholder="teammate@example.com"
                        autoFocus
                        autoComplete="email"
                        error={errors.email?.message}
                        {...register("email")}
                    />

                    {/* Role */}
                    <div>
                        <label className="label">Project role</label>
                        <select className="input" {...register("projectRole")}>
                            {ROLE_OPTIONS.map((r) => (
                                <option key={r.value} value={r.value}>
                                    {r.label}
                                </option>
                            ))}
                        </select>
                        <p className="mt-1.5 text-xs text-gray-500">
                            {ROLE_OPTIONS.find((r) => r.value === watch("projectRole"))?.desc}
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
                            Send invite
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}