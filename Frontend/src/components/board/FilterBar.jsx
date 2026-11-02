import { useState, useEffect, useRef } from "react"
import { Search, X, Filter } from "lucide-react"
import * as memberApi from "../../api/members"
import { hasActiveFilters } from "../../utils/filterTasks"

const PRIORITIES = [
    { value: "", label: "All priorities" },
    { value: "urgent", label: "Urgent" },
    { value: "high", label: "High" },
    { value: "medium", label: "Medium" },
    { value: "low", label: "Low" }
]

export default function FilterBar({ projectId, filters, onChange, resultCount }) {
    const [members, setMembers] = useState([])
    const [searchInput, setSearchInput] = useState(filters.q || "")
    const debounceRef = useRef(null)


    // Fetch members (for assignee dropdown)

    useEffect(() => {
        if (!projectId) return
        let cancelled = false
        memberApi.getMembers(projectId)
            .then((list) => { if (!cancelled) setMembers(list) })
            .catch(() => {})
        return () => { cancelled = true }
    }, [projectId])


    // Debounced search — 300ms

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
            if (searchInput !== (filters.q || "")) {
                onChange({ ...filters, q: searchInput })
            }
        }, 300)
        return () => clearTimeout(debounceRef.current)
    }, [searchInput]) 

    // Sync if external change (URL, clear)
    useEffect(() => {
        setSearchInput(filters.q || "")
    }, [filters.q])

    const active = hasActiveFilters(filters)

    function clearAll() {
        setSearchInput("")
        onChange({ q: "", priority: "", assigneeId: "" })
    }

    return (
        <div className="flex flex-wrap items-center gap-2 px-6 py-2.5 bg-white border-b border-gray-200 shrink-0">
            {/* Search */}
            <div className="relative flex-1 min-w-50 max-w-md">
                <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search tasks..."
                    className="w-full pl-9 pr-8 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                />
                {searchInput && (
                    <button
                        onClick={() => setSearchInput("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-700"
                        aria-label="Clear search"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* Priority */}
            <select
                value={filters.priority || ""}
                onChange={(e) => onChange({ ...filters, priority: e.target.value })}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
            >
                {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                ))}
            </select>

            {/* Assignee */}
            <select
                value={filters.assigneeId || ""}
                onChange={(e) => onChange({ ...filters, assigneeId: e.target.value })}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 max-w-45"
            >
                <option value="">All assignees</option>
                {members.map((m) => {
                    const u = m.userId || {}
                    return (
                        <option key={u._id} value={u._id}>
                            {u.name || u.username || "Unknown"}
                        </option>
                    )
                })}
            </select>

            {/* Result count */}
            {active && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Filter size={12} />
                    {resultCount} result{resultCount !== 1 ? "s" : ""}
                </span>
            )}

            {/* Clear */}
            {active && (
                <button
                    onClick={clearAll}
                    className="text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline"
                >
                    Clear all
                </button>
            )}
        </div>
    )
}