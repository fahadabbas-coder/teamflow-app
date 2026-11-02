import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Calendar, MessageSquare, AlertCircle } from "lucide-react"
import { format, isPast, isToday, isTomorrow } from "date-fns"


// Priority color mapping

const PRIORITY_STYLES = {
    low: { label: "Low", bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" },
    medium: { label: "Medium", bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
    high: { label: "High", bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500" },
    urgent: { label: "Urgent", bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" }
}


// Due date formatting

function formatDueDate(dueDate, status) {
    if (!dueDate) return null
    const d = new Date(dueDate)
    const done = status === "done"

    let label
    if (isToday(d)) label = "Today"
    else if (isTomorrow(d)) label = "Tomorrow"
    else label = format(d, "MMM d")

    const isOverdue = !done && isPast(d) && !isToday(d)
    const isTodayNotDone = !done && isToday(d)

    return {
        label,
        isOverdue,
        isSoon: isTodayNotDone,
        date: d
    }
}

export default function TaskCard({ task, isOverlay = false, onOpen }) {


    // Sortable — normal mode me hi
    // Overlay me ye hook zaroori nahi (drag ho raha hai already)

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: task._id,
        data: {
            type: "task",
            taskId: task._id,
            columnId: task.column
        },
        disabled: isOverlay
    })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition
    }

    const priority = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium
    const due = formatDueDate(task.dueDate, task.status)
    const assignees = task.assignedTo || []


    const Component = "div"

    return (
        <Component
            ref={isOverlay ? undefined : setNodeRef}
            style={isOverlay ? undefined : style}
            {...(isOverlay ? {} : attributes)}
            {...(isOverlay ? {} : listeners)}
            onClick={() => {
                if (isOverlay) return
                onOpen?.(task._id)
            }}
            className={`
                bg-white rounded-lg border border-gray-200 p-3
                cursor-pointer select-none
                transition-shadow
                hover:shadow-md hover:border-gray-300
                ${isDragging ? "opacity-30" : "opacity-100"}
                ${isOverlay ? "shadow-2xl cursor-grabbing" : ""}
            `}
        >

            {/* HEADER — Task ID + Priority */}

            <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400 font-mono">
                    {task.seq ? `#${task.seq}` : ""}
                </span>

                <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${priority.bg} ${priority.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`} />
                    {priority.label}
                </span>
            </div>


            {/* TITLE                                    */}

            <h4 className="text-sm font-medium text-gray-900 mb-2 line-clamp-2 leading-snug">
                {task.title}
            </h4>


            {/* DESCRIPTION PREVIEW (optional) */}

            {task.description && (
                <p className="text-xs text-gray-500 mb-2 line-clamp-1">
                    {task.description}
                </p>
            )}


            {/* FOOTER — Due date, assignees, etc */}

            {(due || assignees.length > 0 || task.commentCount > 0) && (
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">

                    {/* Left: due date + comments */}
                    <div className="flex items-center gap-2">
                        {/* Due date */}
                        {due && (
                            <span
                                className={`
                                    flex items-center gap-1 text-xs
                                    ${due.isOverdue ? "text-red-600 font-medium" : ""}
                                    ${due.isSoon ? "text-orange-600 font-medium" : ""}
                                    ${!due.isOverdue && !due.isSoon ? "text-gray-500" : ""}
                                `}
                            >
                                {due.isOverdue && <AlertCircle size={12} />}
                                {!due.isOverdue && <Calendar size={12} />}
                                {due.label}
                            </span>
                        )}

                        {/* Comments count */}
                        {task.commentCount > 0 && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                                <MessageSquare size={12} />
                                {task.commentCount}
                            </span>
                        )}
                    </div>

                    {/* Right: assignee avatars */}
                    {assignees.length > 0 && (
                        <div className="flex items-center -space-x-1.5">
                            {assignees.slice(0, 3).map((user) => {
                                const u = typeof user === "object" ? user : { _id: user, name: "?" }
                                const initial =
                                    u.name?.[0]?.toUpperCase() ||
                                    u.username?.[0]?.toUpperCase() ||
                                    "?"

                                return (
                                    <div
                                        key={u._id}
                                        title={u.name || u.username}
                                        className="w-6 h-6 rounded-full bg-primary-600 text-white text-[10px] font-semibold flex items-center justify-center ring-2 ring-white"
                                    >
                                        {initial}
                                    </div>
                                )
                            })}

                            {/* +N badge agar 3 se zyada */}
                            {assignees.length > 3 && (
                                <div className="w-6 h-6 rounded-full bg-gray-300 text-gray-700 text-[10px] font-semibold flex items-center justify-center ring-2 ring-white">
                                    +{assignees.length - 3}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </Component>
    )
}