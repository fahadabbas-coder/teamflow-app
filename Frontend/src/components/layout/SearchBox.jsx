import { useEffect, useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { Search, Loader2, FileText, Folder, MessageSquare } from "lucide-react"
import { globalSearch } from "../../api/search"

// Global search (header)
// Debounced (350ms), min 2 chars, `/api/search` se results.
// Sections: Tasks / Projects / Comments

export default function SearchBox() {
    const navigate = useNavigate()

    const [query, setQuery] = useState("")
    const [results, setResults] = useState({ tasks: [], projects: [], comments: [] })
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false)

    const boxRef = useRef(null)
    const seqRef = useRef(0)   // stale-response guard


    // Debounced search — 350ms

    useEffect(() => {
        const q = query.trim()
        if (q.length < 2) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- query short ho to results clear karna hai
            setResults({ tasks: [], projects: [], comments: [] })
            setLoading(false)
            return
        }

        setLoading(true)
        const timer = setTimeout(async () => {
            const seq = ++seqRef.current
            try {
                const data = await globalSearch(q)
                // stale response ignore karo
                if (seq !== seqRef.current) return
                setResults(data)
                setOpen(true)
            } catch {
                if (seq === seqRef.current) {
                    setResults({ tasks: [], projects: [], comments: [] })
                }
            } finally {
                if (seq === seqRef.current) setLoading(false)
            }
        }, 350)

        return () => clearTimeout(timer)
    }, [query])


    // Click outside → close dropdown

    useEffect(() => {
        function handleClickOutside(e) {
            if (boxRef.current && !boxRef.current.contains(e.target)) {
                setOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])


    // Navigation helpers

    function goTask(t) {
        const projectId = t.project?._id || t.project
        if (!projectId) return
        setOpen(false)
        setQuery("")
        navigate(`/projects/${projectId}?task=${t._id}`)
    }

    function goProject(p) {
        setOpen(false)
        setQuery("")
        navigate(`/projects/${p._id}`)
    }

    function goComment(c) {
        const task = c.task || {}
        const projectId = task.project?._id || task.project
        if (!projectId) return
        setOpen(false)
        setQuery("")
        navigate(`/projects/${projectId}?task=${task._id}`)
    }


    const hasResults =
        results.tasks.length || results.projects.length || results.comments.length

    return (
        <div className="flex-1 max-w-md relative" ref={boxRef}>
            {/* Input */}
            <div className="relative">
                <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                {loading && (
                    <Loader2
                        size={16}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin"
                    />
                )}
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query.trim().length >= 2 && setOpen(true)}
                    placeholder="Search tasks, projects, comments..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-100 border border-transparent rounded-lg text-sm focus:outline-none focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all"
                />
            </div>

            {/* Dropdown */}
            {open && query.trim().length >= 2 && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-y-auto max-h-96 z-50">

                    {!hasResults && !loading && (
                        <p className="px-4 py-6 text-sm text-gray-400 text-center italic">
                            No results for “{query.trim()}”
                        </p>
                    )}

                    {/* Tasks */}
                    {results.tasks.length > 0 && (
                        <div className="py-1">
                            <p className="px-4 pt-2 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Tasks
                            </p>
                            {results.tasks.map((t) => (
                                <button
                                    key={t._id}
                                    onClick={() => goTask(t)}
                                    className="w-full flex items-start gap-3 px-4 py-2 text-left hover:bg-gray-50"
                                >
                                    <FileText size={16} className="text-gray-400 mt-0.5 shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-sm text-gray-900 truncate">{t.title}</p>
                                        <p className="text-xs text-gray-400 truncate">
                                            {t.project?.name || ""}
                                            {t.priority ? ` · ${t.priority}` : ""}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Projects */}
                    {results.projects.length > 0 && (
                        <div className="py-1 border-t border-gray-100">
                            <p className="px-4 pt-2 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Projects
                            </p>
                            {results.projects.map((p) => (
                                <button
                                    key={p._id}
                                    onClick={() => goProject(p)}
                                    className="w-full flex items-start gap-3 px-4 py-2 text-left hover:bg-gray-50"
                                >
                                    <Folder size={16} className="text-gray-400 mt-0.5 shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-sm text-gray-900 truncate">{p.name}</p>
                                        {p.key && (
                                            <p className="text-xs text-gray-400 font-mono">{p.key}</p>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Comments */}
                    {results.comments.length > 0 && (
                        <div className="py-1 border-t border-gray-100">
                            <p className="px-4 pt-2 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Comments
                            </p>
                            {results.comments.map((c) => (
                                <button
                                    key={c._id}
                                    onClick={() => goComment(c)}
                                    className="w-full flex items-start gap-3 px-4 py-2 text-left hover:bg-gray-50"
                                >
                                    <MessageSquare size={16} className="text-gray-400 mt-0.5 shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-sm text-gray-700 line-clamp-2">{c.body}</p>
                                        <p className="text-xs text-gray-400 truncate">
                                            {c.user?.name || c.user?.username || "User"}
                                            {c.task?.title ? ` on ${c.task.title}` : ""}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
