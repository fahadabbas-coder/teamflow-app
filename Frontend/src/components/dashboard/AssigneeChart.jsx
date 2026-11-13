import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"


// Colors (design se match)

const COLORS = {
    open:    "#6366f1",  // primary-500
    done:    "#10b981",  // green-500
    overdue: "#ef4444"   // red-500
}

// Custom tooltip (module-level — render ke andar component create karna React compiler error deta hai)

function CustomTooltip({ active, payload }) {
    if (!active || !payload?.length) return null
    const row = payload[0]?.payload
    if (!row) return null

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
            <p className="font-semibold text-gray-900 mb-1">{row.name}</p>
            <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.open }} />
                    <span className="text-gray-600">Open:</span>
                    <span className="font-medium text-gray-900">{row.open}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.done }} />
                    <span className="text-gray-600">Done:</span>
                    <span className="font-medium text-gray-900">{row.done}</span>
                </div>
                {row.overdue > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.overdue }} />
                        <span className="text-gray-600">Overdue:</span>
                        <span className="font-medium text-red-600">{row.overdue}</span>
                    </div>
                )}
            </div>
        </div>
    )
}

// Custom Y-axis tick — avatar + name
// (chartData ki zaroorat nahi: payload.value hi shortName hai)

function CustomYAxisTick({ x, y, payload }) {
    const initial = payload.value?.[0]?.toUpperCase() || "?"

    return (
        <g transform={`translate(${x},${y})`}>
            {/* Avatar circle */}
            <circle cx={-8} cy={0} r={10} fill="#6366f1" />
            <text
                x={-8}
                y={0}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#fff"
                fontSize={10}
                fontWeight={600}
            >
                {initial}
            </text>
            {/* Name */}
            <text
                x={6}
                y={0}
                dy={4}
                textAnchor="start"
                fill="#374151"
                fontSize={12}
            >
                {payload.value}
            </text>
        </g>
    )
}


export default function AssigneeChart({ data = [] }) {

    // Empty state

    if (!data.length) {
        return (
            <div className="h-64 flex items-center justify-center text-sm text-gray-400">
                No assignees yet
            </div>
        )
    }


    // Prepare chart data
    // - Sort by total workload descending
    // - Truncate long names

    const chartData = [...data]
        .map((d) => ({
            name: d.name || d.username || "Unknown",
            shortName: (d.name || d.username || "?").split(" ")[0],  // first word only
            open: d.open || 0,
            done: d.done || 0,
            overdue: d.overdue || 0,
            total: (d.open || 0) + (d.done || 0)
        }))
        .sort((a, b) => b.total - a.total)

    if (!chartData.length) {
        return (
            <div className="h-64 flex items-center justify-center text-sm text-gray-400">
                No tasks assigned
            </div>
        )
    }

    // Chart height dynamic — per assignee ~40px
    const chartHeight = Math.max(180, chartData.length * 40 + 60)


    // Render

    return (
        <div style={{ height: chartHeight }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                    barCategoryGap={12}
                >
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#f3f4f6"
                        horizontal={false}
                    />

                    <XAxis
                        type="number"
                        allowDecimals={false}
                        tick={{ fill: "#9ca3af", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                    />

                    <YAxis
                        type="category"
                        dataKey="shortName"
                        width={90}
                        tick={<CustomYAxisTick />}
                        tickLine={false}
                        axisLine={false}
                    />

                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f9fafb" }} />

                    <Legend
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                    />

                    {/* Open bar */}
                    <Bar
                        dataKey="open"
                        name="Open"
                        stackId="a"
                        fill={COLORS.open}
                        radius={[4, 0, 0, 4]}
                    />

                    {/* Done bar (stacked) */}
                    <Bar
                        dataKey="done"
                        name="Done"
                        stackId="a"
                        fill={COLORS.done}
                        radius={[0, 4, 4, 0]}
                    />

                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}