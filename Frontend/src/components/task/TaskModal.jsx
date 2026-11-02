import { useState, useEffect, useRef } from "react"
import { X, Trash2, Send, Calendar, Activity, MessageSquare, Loader2 } from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import toast from "react-hot-toast"

import { useAuthStore } from "../../stores/authStore"
import { useBoardStore } from "../../stores/boardStore"
import { useSocket } from "../../hooks/useSocket"
import * as taskApi from "../../api/tasks"
import * as commentApi from "../../api/comments"
import AssigneePicker from "./AssigneePicker"
import MentionTextarea from "./MentionTextarea"
import * as memberApi from "../../api/members"
import ConfirmModal from "../ui/ConfirmModal"

const PRIORITIES = ["low", "medium", "high", "urgent"]
const STATUSES = [
    { value: "todo", label: "Todo" },
    { value: "in_progress", label: "In Progress" },
    { value: "done", label: "Done" }
]

export default function TaskModal({ taskId, onClose }) {
    const currentUser = useAuthStore((s) => s.user)
    const removeTask = useBoardStore((s) => s.removeTask)
    const updateTaskInStore = useBoardStore((s) => s.updateTaskInStore)

    const { socket } = useSocket()

    const [task, setTask] = useState(null)
    const [loading, setLoading] = useState(true)
    const [members, setMembers] = useState([])

    // ─── Edit state ───
    const [titleDraft, setTitleDraft] = useState("")
    const [descDraft, setDescDraft] = useState("")
    const [editingTitle, setEditingTitle] = useState(false)
    const [editingDesc, setEditingDesc] = useState(false)
    const [saving, setSaving] = useState(false)

    // ─── Comments + activity ───
    const [comments, setComments] = useState([])
    const [activity, setActivity] = useState([])
    const [newComment, setNewComment] = useState("")
    const [postingComment, setPostingComment] = useState(false)
    const [tab, setTab] = useState("comments")

    // Confirm modals (replace browser popup)
    const [confirmDeleteTask, setConfirmDeleteTask] = useState(false)
    const [confirmDeleteComment, setConfirmDeleteComment] = useState(false)
    const [commentToDelete, setCommentToDelete] = useState(null)

    const titleRef = useRef(null)


    // Load on mount

    useEffect(() => {
        let cancelled = false
        async function load() {
            setLoading(true)
            try {
                const t = await taskApi.getTask(taskId)
                const [c, a, mems] = await Promise.all([
                    commentApi.getComments(taskId).catch(() => []),
                    commentApi.getTaskActivity(taskId).catch(() => []),
                    memberApi.getMembers(t.project).catch(() => [])
                ])
                if (cancelled) return
                setTask(t)
                setTitleDraft(t.title)
                setDescDraft(t.description || "")
                setComments(c)
                setActivity(a)
                setMembers(mems)
            } catch (err) {
                if (cancelled) return
                toast.error(err.response?.data?.message || "Failed to load task")
                onClose()
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        load()
        return () => { cancelled = true }
    }, [taskId]) // eslint-disable-line


    // Board members se meri role nikalo (moderation ke liye)

    const myRole = members.find((m) => (m.userId?._id || m.userId) === currentUser?.id)?.projectRole
    const canModerate = ["owner", "manager"].includes(myRole)


    // COMMENTS ko fresh tree ke saath refetch 
    // (backend threaded roots deta hai — replies nested)

    async function refetchComments() {
        try {
            const fresh = await commentApi.getComments(taskId)
            setComments(fresh)
        } catch { /* silent */ }
    }


    // SOCKET — realtime updates

    useEffect(() => {
        if (!socket || !task) return

        function onTaskUpdated({ task: t }) {
            if (!t || t._id !== taskId) return
            // Don't overwrite edits in progress
            setTask((prev) => {
                if (!prev) return prev
                return {
                    ...prev,
                    // Non-editing fields always sync
                    priority: t.priority,
                    dueDate: t.dueDate,
                    status: t.status,
                    assignedTo: t.assignedTo,
                    completedAt: t.completedAt,
                    // Title/desc — only if NOT editing
                    title: editingTitle ? prev.title : t.title,
                    description: editingDesc ? prev.description : t.description
                }
            })
            // Drafts update karo agar editing nahi
            if (!editingTitle) setTitleDraft(t.title)
            if (!editingDesc) setDescDraft(t.description || "")
            updateTaskInStore(t)
        }

        function onTaskMoved({ taskId: tid, status, columnId }) {
            if (tid !== taskId) return
            setTask((prev) => prev ? { ...prev, status, column: columnId } : prev)
        }

        function onTaskDeleted({ taskId: tid, deletedBy } = {}) {
            if (tid !== taskId) return
            // Khud ne delete kiya — modal already close ho raha hai, false "another user" toast nahi
            if (deletedBy && deletedBy === currentUser?.id) {
                onClose()
                return
            }
            toast.error("This task was deleted by another user", { icon: "🗑" })
            onClose()
        }

        function onCommentCreated({ taskId: tid, comment }) {
            if (tid !== taskId || !comment) return
            // reply aayi ho to poora tree refetch (nested count/replies sync)
            if (comment.parentId) {
                refetchComments()
                return
            }
            setComments((prev) => {
                if (prev.some((c) => c._id === comment._id)) return prev
                return [...prev, { ...comment, replies: [] }]
            })
        }

        function onCommentUpdated({ taskId: tid, comment }) {
            if (tid !== taskId || !comment) return
            refetchComments()
        }

        function onCommentDeleted({ taskId: tid, commentId }) {
            if (tid !== taskId || !commentId) return
            // root delete ho to replies bhi hatani hain → tree refetch
            refetchComments()
        }

        socket.on("task:updated", onTaskUpdated)
        socket.on("task:moved", onTaskMoved)
        socket.on("task:deleted", onTaskDeleted)
        socket.on("comment:created", onCommentCreated)
        socket.on("comment:updated", onCommentUpdated)
        socket.on("comment:deleted", onCommentDeleted)

        return () => {
            socket.off("task:updated", onTaskUpdated)
            socket.off("task:moved", onTaskMoved)
            socket.off("task:deleted", onTaskDeleted)
            socket.off("comment:created", onCommentCreated)
            socket.off("comment:updated", onCommentUpdated)
            socket.off("comment:deleted", onCommentDeleted)
        }
    }, [socket, task?._id, taskId, editingTitle, editingDesc, currentUser?.id, onClose, updateTaskInStore])

    // ESC → close
    useEffect(() => {
        function onEsc(e) {
            if (e.key === "Escape" && !editingTitle && !editingDesc && !postingComment) onClose()
        }
        document.addEventListener("keydown", onEsc)
        return () => document.removeEventListener("keydown", onEsc)
    }, [editingTitle, editingDesc, postingComment, onClose])


    // Patch task helper

    async function patchTask(patch) {
        try {
            const updated = await taskApi.updateTask(taskId, patch)
            setTask(updated)
            updateTaskInStore(updated)
            return { success: true }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update")
            return { success: false }
        }
    }

    async function saveTitle() {
        const t = titleDraft.trim()
        if (!t || t === task.title) {
            setTitleDraft(task.title)
            setEditingTitle(false)
            return
        }
        setSaving(true)
        await patchTask({ title: t })
        setSaving(false)
        setEditingTitle(false)
    }

    async function saveDescription() {
        const d = descDraft.trim()
        if (d === (task.description || "")) {
            setEditingDesc(false)
            return
        }
        setSaving(true)
        await patchTask({ description: d })
        setSaving(false)
        setEditingDesc(false)
    }

    async function handleDelete() {
        setConfirmDeleteTask(true)
    }

    async function executeDeleteTask() {
        try {
            await taskApi.deleteTask(taskId)
            removeTask(taskId)
            toast.success("Task deleted")
            setConfirmDeleteTask(false)
            onClose()
        } catch (err) {
            toast.error(err.response?.data?.message || "Delete failed")
            setConfirmDeleteTask(false)
        }
    }

    // Comment delete confirm

    async function handleCommentDelete(commentId) {
        setCommentToDelete(commentId)
        setConfirmDeleteComment(true)
    }

    async function executeDeleteComment() {
        if (!commentToDelete) return
        try {
            await commentApi.deleteComment(commentToDelete)
            await refetchComments()
            setConfirmDeleteComment(false)
            setCommentToDelete(null)
        } catch {
            toast.error("Failed to delete")
            setConfirmDeleteComment(false)
            setCommentToDelete(null)
        }
    }

    async function postComment() {
        const body = newComment.trim()
        if (!body) return
        setPostingComment(true)
        try {
            await commentApi.createComment(taskId, { body })
            setNewComment("")
            // threaded tree refetch (socket dedupe ki zaroorat nahi)
            await refetchComments()
            commentApi.getTaskActivity(taskId).then(setActivity).catch(() => { })
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to post comment")
        } finally {
            setPostingComment(false)
        }
    }


    // Loading

    if (loading || !task) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
                <div className="bg-white rounded-xl p-8 flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                    <Loader2 className="animate-spin text-primary-600" size={20} />
                    <span className="text-sm text-gray-600">Loading task...</span>
                </div>
            </div>
        )
    }

    return (
        <>
            <div
                className="fixed inset-0 z-50 flex items-start justify-center p-4 md:p-8 bg-black/50 overflow-y-auto"
                onClick={onClose}
            >
                <div
                    className="bg-white rounded-xl shadow-xl w-full max-w-4xl my-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                {/* ═══ HEADER ═══ */}
                <div className="flex items-start gap-3 px-5 py-4 border-b border-gray-200">
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-400 font-mono mb-1">
                            {task.seq ? `TASK-${task.seq}` : ""}
                        </p>
                        {editingTitle ? (
                            <input
                                ref={titleRef}
                                autoFocus
                                value={titleDraft}
                                onChange={(e) => setTitleDraft(e.target.value)}
                                onBlur={saveTitle}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") saveTitle()
                                    if (e.key === "Escape") {
                                        setTitleDraft(task.title)
                                        setEditingTitle(false)
                                    }
                                }}
                                className="w-full text-lg font-semibold text-gray-900 border-b-2 border-primary-500 outline-none bg-transparent"
                            />
                        ) : (
                            <h2
                                onClick={() => setEditingTitle(true)}
                                className="text-lg font-semibold text-gray-900 cursor-text hover:bg-gray-50 rounded px-1 -mx-1 truncate"
                                title={task.title}
                            >
                                {task.title}
                            </h2>
                        )}
                    </div>
                    <button
                        onClick={handleDelete}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Delete task"
                    >
                        <Trash2 size={18} />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                        title="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* ═══ BODY ═══ */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
                    {/* LEFT */}
                    <div className="md:col-span-2 p-5 space-y-6">
                        {/* Description */}
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                                Description
                            </label>
                            {editingDesc ? (
                                <div>
                                    <textarea
                                        autoFocus
                                        rows={4}
                                        value={descDraft}
                                        onChange={(e) => setDescDraft(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Escape") {
                                                setDescDraft(task.description || "")
                                                setEditingDesc(false)
                                            }
                                        }}
                                        className="input resize-none"
                                        placeholder="Add a description..."
                                    />
                                    <div className="flex gap-2 mt-2">
                                        <button
                                            onClick={saveDescription}
                                            disabled={saving}
                                            className="px-3 py-1.5 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700 disabled:opacity-50"
                                        >
                                            {saving ? "Saving..." : "Save"}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setDescDraft(task.description || "")
                                                setEditingDesc(false)
                                            }}
                                            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    onClick={() => setEditingDesc(true)}
                                    className="text-sm text-gray-700 whitespace-pre-wrap min-h-10 p-2 -mx-2 rounded cursor-text hover:bg-gray-50"
                                >
                                    {task.description || (
                                        <span className="text-gray-400 italic">Add a description...</span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Tabs */}
                        <div>
                            <div className="flex border-b border-gray-200 mb-3">
                                <button
                                    onClick={() => setTab("comments")}
                                    className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px flex items-center gap-1.5 ${tab === "comments"
                                        ? "border-primary-600 text-primary-700"
                                        : "border-transparent text-gray-500 hover:text-gray-700"
                                        }`}
                                >
                                    <MessageSquare size={14} />
                                    Comments ({comments.length})
                                </button>
                                <button
                                    onClick={() => setTab("activity")}
                                    className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px flex items-center gap-1.5 ${tab === "activity"
                                        ? "border-primary-600 text-primary-700"
                                        : "border-transparent text-gray-500 hover:text-gray-700"
                                        }`}
                                >
                                    <Activity size={14} />
                                    Activity
                                </button>
                            </div>

                            {tab === "comments" && (
                                <div className="space-y-3">
                                    {comments.length === 0 && (
                                        <p className="text-sm text-gray-400 italic text-center py-4">
                                            No comments yet. Be the first!
                                        </p>
                                    )}
                                    {comments.map((c) => (
                                        <CommentItem
                                            key={c._id}
                                            comment={c}
                                            currentUserId={currentUser?.id}
                                            canModerate={canModerate}
                                            onDeleted={(commentId) => handleCommentDelete(commentId)}
                                        />
                                    ))}

                                    <div className="flex items-start gap-2 pt-2">
                                        <div className="w-8 h-8 rounded-full bg-primary-600 text-white text-xs font-semibold flex items-center justify-center shrink-0">
                                            {(currentUser?.name?.[0] || currentUser?.username?.[0] || "U").toUpperCase()}
                                        </div>
                                        <div className="flex-1">
                                            <MentionTextarea
                                                value={newComment}
                                                onChange={setNewComment}
                                                members={members}
                                                rows={2}
                                                placeholder="Write a comment... (type @ to mention, Ctrl+Enter to send)"
                                                className="input resize-none"
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) postComment()
                                                }}
                                            />
                                            <div className="flex justify-end mt-1.5">
                                                <button
                                                    onClick={postComment}
                                                    disabled={!newComment.trim() || postingComment}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700 disabled:opacity-50"
                                                >
                                                    <Send size={14} />
                                                    {postingComment ? "Sending..." : "Send"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {tab === "activity" && (
                                <div className="space-y-2">
                                    {activity.length === 0 && (
                                        <p className="text-sm text-gray-400 italic text-center py-4">
                                            No activity yet
                                        </p>
                                    )}
                                    {activity.map((a) => (
                                        <div key={a._id} className="flex items-start gap-2 text-sm">
                                            <div className="w-6 h-6 rounded-full bg-gray-300 text-gray-700 text-[10px] font-semibold flex items-center justify-center shrink-0">
                                                {(a.actor?.name?.[0] || a.actor?.username?.[0] || "U").toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-gray-700">
                                                    <span className="font-medium">
                                                        {a.actor?.name || a.actor?.username || "Someone"}
                                                    </span>{" "}
                                                    <span className="text-gray-500">{formatAction(a)}</span>
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT — properties */}
                    <div className="md:col-span-1 bg-gray-50 border-t md:border-t-0 md:border-l border-gray-200 p-5 space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                                Status
                            </label>
                            <select
                                value={task.status}
                                onChange={(e) => patchTask({ status: e.target.value })}
                                className="input text-sm"
                            >
                                {STATUSES.map((s) => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                                Priority
                            </label>
                            <select
                                value={task.priority}
                                onChange={(e) => patchTask({ priority: e.target.value })}
                                className="input text-sm"
                            >
                                {PRIORITIES.map((p) => (
                                    <option key={p} value={p}>
                                        {p[0].toUpperCase() + p.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                <Calendar size={12} /> Due Date
                            </label>
                            <input
                                type="date"
                                value={task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : ""}
                                onChange={(e) => {
                                    const val = e.target.value
                                    patchTask({ dueDate: val ? new Date(val).toISOString() : null })
                                }}
                                className="input text-sm"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                                Assignees
                            </label>
                            <AssigneePicker
                                task={task}
                                projectId={task.project}
                                onChange={(updated) => {
                                    setTask(updated)
                                    updateTaskInStore(updated)
                                }}
                            />
                        </div>

                        <div className="pt-3 border-t border-gray-200 text-xs text-gray-500 space-y-1">
                            <p>Created {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}</p>
                            {task.completedAt && (
                                <p>Completed {formatDistanceToNow(new Date(task.completedAt), { addSuffix: true })}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Confirm: Delete task */}
        <ConfirmModal
            isOpen={confirmDeleteTask}
            onClose={() => setConfirmDeleteTask(false)}
            onConfirm={executeDeleteTask}
            title="Delete task"
            message={`Delete "${task?.title}" permanently? This cannot be undone.`}
            confirmLabel="Delete"
            cancelLabel="Cancel"
            variant="danger"
            loading={false}
        />

        {/* Confirm: Delete comment */}
        <ConfirmModal
            isOpen={confirmDeleteComment}
            onClose={() => setConfirmDeleteComment(false)}
            onConfirm={executeDeleteComment}
            title="Delete comment"
            message="Are you sure you want to delete this comment?"
            confirmLabel="Delete"
            cancelLabel="Cancel"
            variant="danger"
            loading={false}
        />
        </>
    )
}


// Comment item (recursive — nested replies render karta hai)

function CommentItem({ comment, currentUserId, canModerate, onDeleted, depth = 0 }) {
    const author = comment.user || {}
    const initial = (author.name?.[0] || author.username?.[0] || "U").toUpperCase()
    const isAuthor = (author._id || author.id) === currentUserId
    // author khud, ya project owner/manager moderation
    const canDelete = isAuthor || canModerate
    const replies = comment.replies || []

    async function handleDelete() {
        onDeleted?.(comment._id)
    }

    return (
        <div className={depth > 0 ? "ml-8 mt-2" : ""}>
            <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-400 text-white text-xs font-semibold flex items-center justify-center shrink-0">
                    {initial}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                        <div className="flex items-baseline justify-between gap-2">
                            <span className="text-sm font-medium text-gray-900">
                                {author.name || author.username || "User"}
                            </span>
                            <span className="text-xs text-gray-400 shrink-0">
                                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                            </span>
                        </div>
                        <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap wrap-break-word">
                            {comment.body}
                        </p>
                    </div>
                    {canDelete && (
                        <button
                            onClick={handleDelete}
                            className="text-xs text-gray-400 hover:text-red-600 mt-1 ml-1"
                        >
                            Delete
                        </button>
                    )}
                </div>
            </div>

            {/* Nested replies */}
            {replies.map((r) => (
                <CommentItem
                    key={r._id}
                    comment={r}
                    currentUserId={currentUserId}
                    canModerate={canModerate}
                    onDeleted={onDeleted}
                    depth={depth + 1}
                />
            ))}
        </div>
    )
}


// Activity formatter

function formatAction(a) {
    const m = a.meta || {}
    switch (a.action) {
        case "TASK_CREATED": return "created this task"
        case "TASK_UPDATED": return "updated the task"
        case "TASK_MOVED": return `moved to ${m.toColumnName || m.toCategory || "another column"}`
        case "TASK_ASSIGNED": return "assigned users"
        case "TASK_UNASSIGNED": return "unassigned a user"
        case "TASK_DELETED": return "deleted this task"
        case "COMMENT_ADDED": return "commented"
        default: return a.action.replace(/_/g, " ").toLowerCase()
    }
}