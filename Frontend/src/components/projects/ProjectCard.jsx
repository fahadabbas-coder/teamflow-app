import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { MoreVertical, Pencil, Trash2, Archive, Users } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useProjectStore } from "../../stores/projectStore"
import * as projectApi from "../../api/projects"
import toast from "react-hot-toast"
import ConfirmModal from "../ui/ConfirmModal"

export default function ProjectCard({ project }) {
    const navigate = useNavigate()
    const removeProject = useProjectStore((s) => s.removeProject)

    const [menuOpen, setMenuOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const menuRef = useRef(null)

    const [confirmDelete, setConfirmDelete] = useState(false)
    const [confirmArchive, setConfirmArchive] = useState(false)


    // Click outside → close menu

    useEffect(() => {
        function handleClickOutside(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpen(false)
            }
        }
        if (menuOpen) {
            document.addEventListener("mousedown", handleClickOutside)
            return () => document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [menuOpen])


    // Open project

    function openProject() {
        navigate(`/projects/${project._id}`)
    }


    // Delete (owner only)

    async function handleDelete(e) {
        e.stopPropagation()
        setMenuOpen(false)
        setConfirmDelete(true)
    }

    async function executeDelete() {
        try {
            setDeleting(true)
            await projectApi.deleteProject(project._id)
            removeProject(project._id)
            toast.success("Project deleted")
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to delete project")
        } finally {
            setDeleting(false)
            setConfirmDelete(false)
        }
    }


    // Archive (owner only)

    async function handleArchive(e) {
        e.stopPropagation()
        setMenuOpen(false)
        setConfirmArchive(true)
    }

    async function executeArchive() {
        try {
            await projectApi.archiveProject(project._id)
            removeProject(project._id)
            toast.success("Project archived")
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to archive project")
        } finally {
            setConfirmArchive(false)
        }
    }


    // Role badge color

    const roleColors = {
        owner: "bg-purple-100 text-purple-700",
        manager: "bg-blue-100 text-blue-700",
        member: "bg-gray-100 text-gray-700",
        viewer: "bg-yellow-100 text-yellow-700"
    }
    const roleClass = roleColors[project.myRole] || roleColors.member

    const isOwner = project.myRole === "owner"
    const canManage = isOwner || project.myRole === "manager"

    // Initial for avatar
    const initial = project.key?.[0]?.toUpperCase() || project.name?.[0]?.toUpperCase() || "P"

    return (
        <>
            <div
            onClick={openProject}
            className={`
                card p-5 cursor-pointer transition-all
                hover:shadow-md hover:border-primary-200 hover:-translate-y-0.5
                relative group
                ${deleting ? "opacity-50 pointer-events-none" : ""}
            `}
        >
            {/* Header: avatar + name + menu */}
            <div className="flex items-start gap-3 mb-3">

                {/* Avatar with initial */}
                <div className="shrink-0 w-10 h-10 rounded-lg bg-primary-600 text-white text-sm font-bold flex items-center justify-center">
                    {initial}
                </div>

                {/* Name + meta */}
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate" title={project.name}>
                        {project.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-mono text-gray-500">
                            {project.key}
                        </span>
                        <span className="text-xs text-gray-300">·</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${roleClass}`}>
                            {project.myRole}
                        </span>
                    </div>
                </div>

                {/* Menu button */}
                {canManage && (
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                setMenuOpen((v) => !v)
                            }}
                            className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Project menu"
                        >
                            <MoreVertical size={16} />
                        </button>

                        {menuOpen && (
                            <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20"
                            >
                                <button
                                    onClick={() => {
                                        setMenuOpen(false)
                                        // TODO: edit modal (Phase 2+)
                                        toast("Edit coming soon", { icon: "🚧" })
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                                >
                                    <Pencil size={14} /> Rename
                                </button>

                                {isOwner && (
                                    <button
                                        onClick={handleArchive}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                                    >
                                        <Archive size={14} /> Archive
                                    </button>
                                )}

                                {isOwner && (
                                    <button
                                        onClick={handleDelete}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 text-left border-t border-gray-100"
                                    >
                                        <Trash2 size={14} /> Delete
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Description */}
            <p className="text-sm text-gray-600 mb-4 line-clamp-2 min-h-10">
                {project.description || "No description"}
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-100">
                <span>
                    {project.createdAt
                        ? formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })
                        : ""}
                </span>
                <Users size={14} />
            </div>
        </div>

        {/* Confirm: Delete project */}
        <ConfirmModal
            isOpen={confirmDelete}
            onClose={() => setConfirmDelete(false)}
            onConfirm={executeDelete}
            title="Delete project"
            message={`Delete "${project.name}" permanently? This cannot be undone.`}
            confirmLabel="Delete"
            cancelLabel="Cancel"
            variant="danger"
            loading={deleting}
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
        </>
    )
}