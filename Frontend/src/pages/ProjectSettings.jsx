import { useState, useEffect } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { ArrowLeft, UserPlus, Trash2, Crown, Users as UsersIcon, Settings as SettingsIcon, AlertTriangle, Loader2 } from "lucide-react"
import toast from "react-hot-toast"

import { useAuthStore } from "../stores/authStore"
import { useProjectStore } from "../stores/projectStore"
import { useProjectSocket } from "../hooks/useSocket"
import * as memberApi from "../api/members"
import * as projectApi from "../api/projects"
import InviteMemberModal from "../components/settings/InviteMemberModal"
import ConfirmModal from "../components/ui/ConfirmModal"

const TABS = [
    { id: "members", label: "Members",    icon: UsersIcon },
    { id: "general", label: "General",    icon: SettingsIcon },
    { id: "danger",  label: "Danger zone",icon: AlertTriangle }
]

const ROLE_OPTIONS = [
    { value: "manager", label: "Manager" },
    { value: "member",  label: "Member" },
    { value: "viewer",  label: "Viewer" }
]

export default function ProjectSettings() {
    const { id: projectId } = useParams()
    const navigate = useNavigate()

    const currentUser = useAuthStore((s) => s.user)
    const projects = useProjectStore((s) => s.projects)
    const projectStoreLoading = useProjectStore((s) => s.isLoading)
    const updateProjectInStore = useProjectStore((s) => s.updateOne)
    const removeProject = useProjectStore((s) => s.removeProject)
    const project = projects.find((p) => p._id === projectId)

    const [activeTab, setActiveTab] = useState("members")
    const [members, setMembers] = useState([])
    const [loadingMembers, setLoadingMembers] = useState(true)
    const [showInvite, setShowInvite] = useState(false)
    const [projectLoading, setProjectLoading] = useState(true)

    // Confirm modals (replace browser popup)
    const [confirmRemove, setConfirmRemove] = useState(null)   // member object ya null
    const [confirmArchive, setConfirmArchive] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)

    // General form
    const [nameDraft, setNameDraft] = useState("")
    const [descDraft, setDescDraft] = useState("")
    const [savingProject, setSavingProject] = useState(false)

    // RBAC
    const myRole = project?.myRole || "viewer"
    const isOwner = myRole === "owner"
    const isManager = myRole === "manager"
    const canManageMembers = isOwner || isManager


    // Load members + prefill form

    useEffect(() => {
        if (!projectId) return
        let cancelled = false

        async function load() {
            setLoadingMembers(true)
            try {
                const list = await memberApi.getMembers(projectId)
                if (!cancelled) setMembers(list)
            } catch {
                if (!cancelled) toast.error("Failed to load members")
            } finally {
                if (!cancelled) {
                    setLoadingMembers(false)
                    setProjectLoading(false)
                }
            }
        }
        load()
        return () => { cancelled = true }
    }, [projectId])

    useEffect(() => {
        if (project) {
            //  -- project load hone par form fields prefill ho ga
            setNameDraft(project.name || "")
            setDescDraft(project.description || "")
        }
    }, [project?._id])


    // Role change

    async function handleRoleChange(userId, newRole) {
        try {
            await memberApi.changeRole(projectId, userId, newRole)
            setMembers((prev) =>
                prev.map((m) =>
                    m.userId?._id === userId ? { ...m, projectRole: newRole } : m
                )
            )
            toast.success("Role updated")
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to change role")
        }
    }


    // SOCKET — realtime member sync (doosre browsers ke liye)

    const { socket, connected } = useProjectSocket(projectId)

    useEffect(() => {
        if (!socket || !connected) return

        function onMemberAdded({ member } = {}) {
            if (!member?._id) return
            setMembers((prev) =>
                prev.some((m) => m._id === member._id)
                    ? prev
                    : [...prev, member]
            )
        }

        function onMemberRoleChanged({ userId, projectRole } = {}) {
            if (!userId) return
            setMembers((prev) =>
                prev.map((m) =>
                    (m.userId?._id || m.userId) === userId
                        ? { ...m, projectRole }
                        : m
                )
            )
        }

        function onMemberRemoved({ userId } = {}) {
            if (!userId) return
            setMembers((prev) =>
                prev.filter((m) => (m.userId?._id || m.userId) !== userId)
            )
        }

        socket.on("member:added", onMemberAdded)
        socket.on("member:roleChanged", onMemberRoleChanged)
        socket.on("member:removed", onMemberRemoved)

        return () => {
            socket.off("member:added", onMemberAdded)
            socket.off("member:roleChanged", onMemberRoleChanged)
            socket.off("member:removed", onMemberRemoved)
        }
    }, [socket, connected])


    // Remove member

    async function handleRemove(member) {
        setConfirmRemove(member)
    }

    async function executeRemove() {
        if (!confirmRemove) return
        const member = confirmRemove
        try {
            await memberApi.removeMember(projectId, member.userId._id)
            setMembers((prev) => prev.filter((m) => m._id !== member._id))
            toast.success("Member removed")
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to remove member")
        } finally {
            setConfirmRemove(null)
        }
    }


    // Save project (general)

    async function handleSaveProject() {
        const name = nameDraft.trim()
        if (!name) {
            toast.error("Project name required")
            return
        }
        if (name === project.name && descDraft === (project.description || "")) {
            return
        }

        setSavingProject(true)
        try {
            const updated = await projectApi.updateProject(projectId, {
                name,
                description: descDraft
            })
            updateProjectInStore(projectId, updated)
            toast.success("Project updated")
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to save")
        } finally {
            setSavingProject(false)
        }
    }


    // Archive / Delete

    async function handleArchive() {
        setConfirmArchive(true)
    }

    async function executeArchive() {
        try {
            await projectApi.archiveProject(projectId)
            removeProject(projectId)
            toast.success("Project archived")
            navigate("/projects", { replace: true })
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to archive")
        } finally {
            setConfirmArchive(false)
        }
    }

    async function handleDelete() {
        setConfirmDelete(true)
    }

    async function executeDelete() {
        try {
            await projectApi.deleteProject(projectId)
            removeProject(projectId)
            toast.success("Project deleted")
            navigate("/projects", { replace: true })
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to delete")
        } finally {
            setConfirmDelete(false)
        }
    }

    if (projectLoading || projectStoreLoading || !project) {
        return (
            <div className="p-6">
                <div className="card p-8 text-center text-gray-500 flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    {projectLoading || projectStoreLoading ? "Loading project..." : "Project not found"}
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 md:p-8 max-w-4xl mx-auto">

            {/* HEADER */}
            <div className="flex items-center gap-3 mb-6">
                <Link
                    to={`/projects/${projectId}`}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                >
                    <ArrowLeft size={20} />
                </Link>
                <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-bold text-gray-900 truncate">
                        {project.name}
                    </h1>
                    <p className="text-xs text-gray-500">
                        Project settings {project.key && `· ${project.key}`}
                    </p>
                </div>
            </div>

            {/* TABS */}
            <div className="flex border-b border-gray-200 mb-6">
                {TABS.map((t) => {
                    const Icon = t.icon
                    const active = activeTab === t.id
                    return (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px flex items-center gap-2 ${
                                active
                                    ? "border-primary-600 text-primary-700"
                                    : "border-transparent text-gray-500 hover:text-gray-900"
                            }`}
                        >
                            <Icon size={16} />
                            {t.label}
                        </button>
                    )
                })}
            </div>

            {/* MEMBERS TAB */}
            {activeTab === "members" && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">
                                Team members
                            </h2>
                            <p className="text-sm text-gray-500">
                                {members.length} member{members.length !== 1 ? "s" : ""}
                            </p>
                        </div>
                        {canManageMembers && (
                            <button
                                onClick={() => setShowInvite(true)}
                                className="btn-primary inline-flex gap-2"
                            >
                                <UserPlus size={16} />
                                Invite
                            </button>
                        )}
                    </div>

                    {loadingMembers ? (
                        <div className="card p-8 text-center text-gray-500 flex items-center justify-center gap-2">
                            <Loader2 size={16} className="animate-spin" />
                            Loading members...
                        </div>
                    ) : (
                        <div className="card overflow-hidden divide-y divide-gray-100">
                            {members.map((m) => (
                                <MemberRow
                                    key={m._id}
                                    member={m}
                                    currentUserId={currentUser?.id}
                                    myRole={myRole}
                                    onRoleChange={(r) => handleRoleChange(m.userId._id, r)}
                                    onRemove={() => handleRemove(m)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* GENERAL TAB */}
            {activeTab === "general" && (
                <div className="card p-6 space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900">
                        General
                    </h2>

                    <div>
                        <label className="label">Project name</label>
                        <input
                            type="text"
                            value={nameDraft}
                            onChange={(e) => setNameDraft(e.target.value)}
                            className="input"
                            disabled={!canManageMembers}
                        />
                    </div>

                    <div>
                        <label className="label">Description</label>
                        <textarea
                            rows={4}
                            value={descDraft}
                            onChange={(e) => setDescDraft(e.target.value)}
                            className="input resize-none"
                            disabled={!canManageMembers}
                            placeholder="What is this project about?"
                        />
                    </div>

                    <div>
                        <label className="label">Project key</label>
                        <input
                            type="text"
                            value={project.key || ""}
                            className="input font-mono bg-gray-50"
                            disabled
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Key cannot be changed after creation
                        </p>
                    </div>

                    {canManageMembers && (
                        <div className="flex justify-end">
                            <button
                                onClick={handleSaveProject}
                                disabled={savingProject}
                                className="btn-primary"
                            >
                                {savingProject ? "Saving..." : "Save changes"}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* DANGER TAB */}
            {activeTab === "danger" && (
                <div className="space-y-4">
                    <div className="card p-6">
                        <h3 className="text-base font-semibold text-gray-900 mb-1">
                            Archive project
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Hide this project from your list. You can unarchive later.
                        </p>
                        <button
                            onClick={handleArchive}
                            disabled={!isOwner}
                            className="btn-secondary disabled:opacity-50"
                        >
                            Archive project
                        </button>
                    </div>

                    <div className="card p-6 border-red-200">
                        <h3 className="text-base font-semibold text-red-700 mb-1 flex items-center gap-2">
                            <AlertTriangle size={16} />
                            Delete project
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Permanently delete this project and all its tasks, comments, and activity.
                            This action cannot be undone.
                        </p>
                        <button
                            onClick={handleDelete}
                            disabled={!isOwner}
                            className="btn-danger disabled:opacity-50"
                        >
                            <Trash2 size={14} />
                            Delete project
                        </button>
                        {!isOwner && (
                            <p className="text-xs text-gray-400 mt-2">
                                Only the project owner can delete this project.
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* INVITE MODAL */}
            {showInvite && (
                <InviteMemberModal
                    projectId={projectId}
                    existingMembers={members}
                    onClose={() => setShowInvite(false)}
                    onInvited={(newMember) => {
                        // optimistic add — socket "member:added" bhi aa sakta hai,
                        // isliye duplicate check karke add karo
                        setMembers((prev) =>
                            prev.some((m) => m._id === newMember._id) ? prev : [...prev, newMember]
                        )
                        setShowInvite(false)
                    }}
                />
            )}

            {/* Confirm: Remove member */}
            <ConfirmModal
                isOpen={!!confirmRemove}
                onClose={() => setConfirmRemove(null)}
                onConfirm={executeRemove}
                title="Remove member"
                message={`Remove "${confirmRemove?.userId?.name || confirmRemove?.userId?.username || "this member"}" from project?`}
                confirmLabel="Remove"
                cancelLabel="Cancel"
                variant="danger"
                loading={false}
            />

            {/* Confirm: Archive project */}
            <ConfirmModal
                isOpen={confirmArchive}
                onClose={() => setConfirmArchive(false)}
                onConfirm={executeArchive}
                title="Archive project"
                message={`Archive "${project.name}"?`}
                confirmLabel="Archive"
                cancelLabel="Cancel"
                variant="secondary"
                loading={false}
            />

            {/* Confirm: Delete project */}
            <ConfirmModal
                isOpen={confirmDelete}
                onClose={() => setConfirmDelete(false)}
                onConfirm={executeDelete}
                title="Delete project"
                message={`Delete "${project.name}"? This cannot be undone.`}
                confirmLabel="Delete"
                cancelLabel="Cancel"
                variant="danger"
                loading={false}
            />
        </div>
    )
}


// MEMBER ROW

function MemberRow({ member, currentUserId, myRole, onRoleChange, onRemove }) {
    const user = member.userId || {}
    const initial = (user.name?.[0] || user.username?.[0] || "?").toUpperCase()
    const isOwnerRow = member.projectRole === "owner"
    const isSelf = user._id === currentUserId

    // RBAC (backend routes ke mutabiq):
    // role change → owner only (PATCH /members/:userId = requireProjectRole("owner"))
    // remove      → manager+  (DELETE /members/:userId = requireProjectRole("manager"))

    const canChangeRole = myRole === "owner" && !isOwnerRow && !isSelf

    const canRemove =
        (myRole === "owner" && !isOwnerRow && !isSelf) ||
        (myRole === "manager" && ["member", "viewer"].includes(member.projectRole) && !isSelf)

    return (
        <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-primary-600 text-white text-sm font-semibold flex items-center justify-center shrink-0">
                {initial}
            </div>

            {/* Name + email */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-gray-900 truncate">
                        {user.name || user.username || "Unknown"}
                    </p>
                    {isOwnerRow && (
                        <Crown size={14} className="text-yellow-500 shrink-0" title="Owner" />
                    )}
                    {isSelf && (
                        <span className="text-xs text-gray-400">(you)</span>
                    )}
                </div>
                <p className="text-xs text-gray-500 truncate">{user.email || ""}</p>
            </div>

            {/* Role dropdown OR badge */}
            {canChangeRole ? (
                <select
                    value={member.projectRole}
                    onChange={(e) => onRoleChange(e.target.value)}
                    className="text-sm border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                    {ROLE_OPTIONS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                </select>
            ) : (
                <span
                    className={`text-xs font-medium px-2 py-1 rounded capitalize ${
                        member.projectRole === "owner"
                            ? "bg-yellow-100 text-yellow-700"
                            : member.projectRole === "manager"
                            ? "bg-blue-100 text-blue-700"
                            : member.projectRole === "viewer"
                            ? "bg-gray-100 text-gray-600"
                            : "bg-gray-100 text-gray-700"
                    }`}
                >
                    {member.projectRole}
                </span>
            )}

            {/* Remove */}
            {canRemove && (
                <button
                    onClick={onRemove}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Remove member"
                >
                    <Trash2 size={16} />
                </button>
            )}
        </div>
    )
}