import { useState, useEffect, useRef } from "react"
import { Plus, X, Check, Search, Loader2 } from "lucide-react"
import toast from "react-hot-toast"
import * as taskApi from "../../api/tasks"
import * as memberApi from "../../api/members"

export default function AssigneePicker({ task, projectId, onChange }) {
    const [open, setOpen] = useState(false)
    const [members, setMembers] = useState([])
    const [loadingMembers, setLoadingMembers] = useState(false)
    const [search, setSearch] = useState("")
    const [busyUserId, setBusyUserId] = useState(null)  // loading state per user

    const popoverRef = useRef(null)


    // Fetch members when popover opens first time

    useEffect(() => {
        if (!open || members.length > 0) return
        let cancelled = false

        async function load() {
            setLoadingMembers(true)
            try {
                const list = await memberApi.getMembers(projectId)
                if (!cancelled) setMembers(list)
            } catch {
                if (!cancelled) {
                    toast.error("Failed to load members")
                }
            } finally {
                if (!cancelled) setLoadingMembers(false)
            }
        }
        load()
        return () => { cancelled = true }
    }, [open, projectId, members.length])


    // Click outside → close

    useEffect(() => {
        function handleClickOutside(e) {
            if (popoverRef.current && !popoverRef.current.contains(e.target)) {
                setOpen(false)
                setSearch("")
            }
        }
        if (open) {
            document.addEventListener("mousedown", handleClickOutside)
            return () => document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [open])


    // Check if user is assigned

    const assignedIds = new Set(
        (task.assignedTo || []).map((u) =>
            typeof u === "object" ? u._id : u
        )
    )

    function isAssigned(userId) {
        return assignedIds.has(userId)
    }


    // Toggle assign / unassign

    async function toggleAssignee(userId) {
        if (busyUserId) return   // prevent double-click
        setBusyUserId(userId)

        try {
            if (isAssigned(userId)) {
                await taskApi.unassignUser(task._id, userId)
            } else {
                await taskApi.assignUsers(task._id, [userId])
            }
            // Refetch task to get fully populated assignedTo
            const fresh = await taskApi.getTask(task._id)
            onChange?.(fresh)
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update assignees")
        } finally {
            setBusyUserId(null)
        }
    }


    // Filter members by search

    const filteredMembers = members.filter((m) => {
        if (!search) return true
        const u = m.userId || {}
        const q = search.toLowerCase()
        return (
            u.name?.toLowerCase().includes(q) ||
            u.username?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q)
        )
    })


    // Current assignees (for avatar display)

    const assignees = task.assignedTo || []

    return (
        <div className="relative" ref={popoverRef}>


            {/* Trigger: avatars + "Add" button    */}

            <div className="flex items-center flex-wrap gap-1.5 min-h-8">
                {assignees.map((u) => {
                    const user = typeof u === "object" ? u : { _id: u, name: "?" }
                    const initial = (user.name?.[0] || user.username?.[0] || "?").toUpperCase()
                    return (
                        <div
                            key={user._id}
                            className="relative group"
                            title={user.name || user.username}
                        >
                            <div className="w-8 h-8 rounded-full bg-primary-600 text-white text-xs font-semibold flex items-center justify-center">
                                {initial}
                            </div>
                            {/* Remove button on hover */}
                            <button
                                onClick={() => toggleAssignee(user._id)}
                                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                title="Remove"
                            >
                                <X size={10} />
                            </button>
                        </div>
                    )
                })}

                {/* Add button */}
                <button
                    onClick={() => setOpen((v) => !v)}
                    className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 text-gray-400 hover:border-primary-500 hover:text-primary-600 transition-colors flex items-center justify-center"
                    title="Add assignee"
                >
                    <Plus size={16} />
                </button>
            </div>


            {/* Dropdown                            */}

            {open && (
                <div className="absolute left-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-30 overflow-hidden">

                    {/* Search */}
                    <div className="p-2 border-b border-gray-100">
                        <div className="relative">
                            <Search
                                size={14}
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                            <input
                                autoFocus
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search members..."
                                className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                            />
                        </div>
                    </div>

                    {/* Member list */}
                    <div className="max-h-64 overflow-y-auto">
                        {loadingMembers && (
                            <div className="p-4 text-center text-sm text-gray-500 flex items-center justify-center gap-2">
                                <Loader2 size={14} className="animate-spin" />
                                Loading members...
                            </div>
                        )}

                        {!loadingMembers && filteredMembers.length === 0 && (
                            <div className="p-4 text-center text-sm text-gray-400 italic">
                                {search ? "No members match" : "No members"}
                            </div>
                        )}

                        {!loadingMembers && filteredMembers.map((m) => {
                            const user = m.userId || {}
                            const assigned = isAssigned(user._id)
                            const busy = busyUserId === user._id
                            const initial = (user.name?.[0] || user.username?.[0] || "?").toUpperCase()

                            return (
                                <button
                                    key={m._id}
                                    onClick={() => toggleAssignee(user._id)}
                                    disabled={busy}
                                    className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left disabled:opacity-50 ${
                                        assigned ? "bg-primary-50/50" : ""
                                    }`}
                                >
                                    {/* Avatar */}
                                    <div className="w-7 h-7 rounded-full bg-primary-600 text-white text-xs font-semibold flex items-center justify-center shrink-0">
                                        {initial}
                                    </div>

                                    {/* Name + role */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            {user.name || user.username || "User"}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate capitalize">
                                            {m.projectRole}
                                        </p>
                                    </div>

                                    {/* Checkmark / spinner */}
                                    <div className="shrink-0 w-5 flex items-center justify-center">
                                        {busy ? (
                                            <Loader2 size={14} className="animate-spin text-primary-600" />
                                        ) : assigned ? (
                                            <Check size={16} className="text-primary-600" />
                                        ) : null}
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}