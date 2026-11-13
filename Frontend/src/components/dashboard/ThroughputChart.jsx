import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { format, parseISO } from "date-fns"


// X-axis label formatter

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

    const value = payload[0].value

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
            <p className="font-semibold text-gray-900 mb-1">{formattedDate}</p>
            <div className="flex items-center gap-2">
                <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: "#8b5cf6" }}
                />
                <span className="text-gray-600">Created:</span>
                <span className="font-medium text-gray-900">
                    {value} task{value !== 1 ? "s" : ""}
                </span>
            </div>
        </div>
    )
}

export default function ThroughputChart({ data = [] }) {

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
                <AreaChart
                    data={data}
                    margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
                >
                    {/* Gradient fill — neeche fade out */}
                    <defs>
                        <linearGradient id="throughputFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
                        </linearGradient>
                    </defs>

                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#f3f4f6"
                        vertical={false}
                    />

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

                    <Tooltip
                        content={<CustomTooltip />}
                        cursor={{ stroke: "#e5e7eb", strokeDasharray: "3 3" }}
                    />

                    <Area
                        type="monotone"
                        dataKey="created"
                        name="Created"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        fill="url(#throughputFill)"
                        dot={false}
                        activeDot={{ r: 5, fill: "#8b5cf6", stroke: "#fff", strokeWidth: 2 }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}
