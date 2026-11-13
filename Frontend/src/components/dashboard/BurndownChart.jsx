import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { format, parseISO } from "date-fns"


// Compact X-axis labels (avoid clutter)

function formatXAxis(dateStr) {
    try {
        return format(parseISO(dateStr), "MMM d")
    } catch {
        // parseISO fail ho to raw string dikhao
        return dateStr
    }
}


// Custom tooltip (module-level — render ke andar component create karna React compiler error deta hai)

function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null

    let formattedDate = label
    try {
        formattedDate = format(parseISO(label), "EEE, MMM d")
    } catch {
        // parse fail ho to raw label dikhao
    }

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
            <p className="font-semibold text-gray-900 mb-1">{formattedDate}</p>
            {payload.map((entry) => (
                <div key={entry.dataKey} className="flex items-center gap-2">
                    <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-gray-600">{entry.name}:</span>
                    <span className="font-medium text-gray-900">
                        {entry.value}
                    </span>
                </div>
            ))}
        </div>
    )
}

export default function BurndownChart({ data = [] }) {

    // Empty state

    if (!data.length) {
        return (
            <div className="h-64 flex items-center justify-center text-sm text-gray-400">
                No data available
            </div>
        )
    }

    return (
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={data}
                    margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />

                    <XAxis
                        dataKey="date"
                        tickFormatter={formatXAxis}
                        tick={{ fill: "#9ca3af", fontSize: 11 }}
                        tickLine={false}
                        axisLine={{ stroke: "#e5e7eb" }}
                        interval="preserveStartEnd"
                        minTickGap={24}
                    />

                    <YAxis
                        allowDecimals={false}
                        tick={{ fill: "#9ca3af", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        width={32}
                    />

                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#e5e7eb" }} />

                    <Legend
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                    />

                    <Line
                        type="monotone"
                        dataKey="remaining"
                        name="Remaining"
                        stroke="#6366f1"
                        strokeWidth={2}
                        dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }}
                        activeDot={{ r: 5 }}
                    />

                    <Line
                        type="monotone"
                        dataKey="completed"
                        name="Completed"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }}
                        activeDot={{ r: 5 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}
