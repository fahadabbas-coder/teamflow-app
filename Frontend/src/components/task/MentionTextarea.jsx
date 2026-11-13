import { useState, useRef } from "react"

export default function MentionTextarea({ value, onChange, members = [], placeholder, className, rows = 2, onKeyDown: externalKeyDown }) {
    const ref = useRef(null)
    const [showSuggest, setShowSuggest] = useState(false)
    const [query, setQuery] = useState("")
    const [mentionStart, setMentionStart] = useState(-1)
    const [selectedIdx, setSelectedIdx] = useState(0)

    function handleChange(e) {
        const text = e.target.value
        const pos = e.target.selectionStart
        onChange(text)

        // Detect @ before cursor
        const beforeCursor = text.slice(0, pos)
        const lastAt = beforeCursor.lastIndexOf("@")
        if (lastAt === -1) return setShowSuggest(false)

        const charBefore = lastAt > 0 ? text[lastAt - 1] : " "
        if (charBefore !== " " && charBefore !== "\n") return setShowSuggest(false)

        const q = beforeCursor.slice(lastAt + 1)
        if (!/^[a-zA-Z0-9_]*$/.test(q)) return setShowSuggest(false)

        setQuery(q)
        setMentionStart(lastAt)
        setShowSuggest(true)
        setSelectedIdx(0)
    }

    const filteredMembers = members
        .filter((m) => {
            const u = m.userId || {}
            const q = query.toLowerCase()
            return (
                u.username?.toLowerCase().includes(q) ||
                u.name?.toLowerCase().includes(q)
            )
        })
        .slice(0, 6)

    function selectMember(member) {
        const u = member.userId || {}
        const username = u.username || u.name?.toLowerCase().replace(/\s+/g, "")
        if (!username) return

        const cursorPos = ref.current?.selectionStart ?? value.length
        const before = value.slice(0, mentionStart)
        const after = value.slice(cursorPos)
        const newValue = `${before}@${username} ${after}`
        onChange(newValue)
        setShowSuggest(false)

        setTimeout(() => {
            ref.current?.focus()
            const newPos = mentionStart + username.length + 2
            ref.current?.setSelectionRange(newPos, newPos)
        }, 0)
    }

    function handleKeyDown(e) {
        if (showSuggest && filteredMembers.length > 0) {
            if (e.key === "ArrowDown") {
                e.preventDefault()
                setSelectedIdx((i) => (i + 1) % filteredMembers.length)
                return
            }
            if (e.key === "ArrowUp") {
                e.preventDefault()
                setSelectedIdx((i) => (i - 1 + filteredMembers.length) % filteredMembers.length)
                return
            }
            if (e.key === "Enter") {
                e.preventDefault()
                selectMember(filteredMembers[selectedIdx])
                return
            }
            if (e.key === "Escape") {
                setShowSuggest(false)
                return
            }
        }
        externalKeyDown?.(e)
    }

    return (
        <div className="relative">
            <textarea
                ref={ref}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                rows={rows}
                placeholder={placeholder}
                className={className}
            />

            {showSuggest && filteredMembers.length > 0 && (
                <div className="absolute bottom-full left-0 mb-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-56 overflow-y-auto">
                    <div className="px-3 py-1.5 text-xs font-medium text-gray-500 border-b border-gray-100">
                        Mention someone
                    </div>
                    {filteredMembers.map((m, i) => {
                        const u = m.userId || {}
                        const initial = (u.name?.[0] || u.username?.[0] || "?").toUpperCase()
                        return (
                            <button
                                key={m._id}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => selectMember(m)}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                                    i === selectedIdx ? "bg-primary-50" : ""
                                }`}
                            >
                                <span className="w-7 h-7 rounded-full bg-primary-600 text-white text-xs font-semibold flex items-center justify-center shrink-0">
                                    {initial}
                                </span>
                                <span className="flex-1 min-w-0">
                                    <span className="block truncate font-medium text-gray-900">
                                        {u.name || u.username}
                                    </span>
                                    <span className="block truncate text-xs text-gray-500">
                                        @{u.username}
                                    </span>
                                </span>
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}