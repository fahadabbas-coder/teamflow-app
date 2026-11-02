import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"


// Priority → color + label (design ke saath match)

const PRIORITY_META = {
    low:    { label: "Low",    color: "#9ca3af" },  // gray-400
    medium: { label: "Medium", color: "#3b82f6" },  // blue-500
    high:   { label: "High",   color: "#f97316" },  // orange-500
    urgent: { label: "Urgent", color: "#ef4444" }   // red-500
}

// Custom tooltip — total prop ke through pass hota hai
// (module-level: render ke andar component definitions react-compiler error deti hain)

function CustomTooltip({ active, payload, total }) {
    if (!active || !payload?.length) return null
    const item = payload[0]
    const pct = total ? Math.round((item.value / total) * 100) : 0

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
            <div className="flex items-center gap-2">
                <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: item.payload.color }}
                />
                <span className="font-medium text-gray-900">{item.name}</span>
            </div>
            <p className="text-gray-600 mt-1">
                {item.value} task{item.value !== 1 ? "s" : ""} ({pct}%)
            </p>
        </div>
    )
}

// Custom legend — 2 columns

function CustomLegend({ items }) {
    return (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs mt-3">
            {items.map((item) => (
                <div key={item.name} className="flex items-center gap-2 min-w-0">
                    <span
                        className="shrink-0 w-2 h-2 rounded-full"
                        style={{ backgroundColor: item.color }}
                    />
                    <span className="text-gray-700 truncate">{item.name}</span>
                    <span className="ml-auto font-medium text-gray-900">
                        {item.value}
                    </span>
                </div>
            ))}
        </div>
    )
}

export default function PriorityChart({ data = [] }) {

    // Empty state

    if (!data.length) {
        return (
            <div className="h-64 flex items-center justify-center text-sm text-gray-400">
                No data available
            </div>
        )
    }


    // Filter zero counts + sort by priority order

    const ORDER = ["urgent", "high", "medium", "low"]
    const chartData = [...data]
        .filter((d) => d.count > 0)
        .sort((a, b) => ORDER.indexOf(a.priority) - ORDER.indexOf(b.priority))
        .map((d) => ({
            name: PRIORITY_META[d.priority]?.label || d.priority,
            value: d.count,
            color: PRIORITY_META[d.priority]?.color || "#9ca3af"
        }))

    if (!chartData.length) {
        return (
            <div className="h-64 flex items-center justify-center text-sm text-gray-400">
                No tasks with priority
            </div>
        )
    }

    const total = chartData.reduce((sum, d) => sum + d.value, 0)

    return (
        <div className="h-64 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="45%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        stroke="#fff"
                        strokeWidth={2}
                    >
                        {chartData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                        ))}
                    </Pie>

                    <Tooltip content={<CustomTooltip total={total} />} />
                </PieChart>
            </ResponsiveContainer>

            {/* Center label — total */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ paddingBottom: "10%" }}>
                <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{total}</p>
                    <p className="text-xs text-gray-500">total</p>
                </div>
            </div>

            {/* Legend (chart ke neeche overlay) */}
            <div className="absolute left-0 right-0 bottom-0 px-1">
                <CustomLegend items={chartData} />
            </div>
        </div>
    )
}