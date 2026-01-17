import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ActivityPoint {
  timestamp: string;
  count: number;
  volume: number;
}

interface MarketChartProps {
  data: ActivityPoint[];
}

export function MarketChart({ data }: MarketChartProps) {
  const chartData =
    data.length > 0
      ? data
      : [
          { timestamp: 'Now', count: 0, volume: 0 },
          { timestamp: '-1h', count: 0, volume: 0 },
          { timestamp: '-2h', count: 0, volume: 0 },
          { timestamp: '-3h', count: 0, volume: 0 },
          { timestamp: '-4h', count: 0, volume: 0 },
          { timestamp: '-5h', count: 0, volume: 0 },
        ];

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 h-full border border-white/10">
      <h3 className="text-lg font-semibold mb-4 text-violet-100">Activity Over Time</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="timestamp"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              axisLine={{ stroke: '#374151' }}
              tickLine={{ stroke: '#374151' }}
            />
            <YAxis
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              axisLine={{ stroke: '#374151' }}
              tickLine={{ stroke: '#374151' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
              }}
              labelStyle={{ color: '#9ca3af' }}
            />
            <Area
              type="monotone"
              dataKey="volume"
              stroke="#8b5cf6"
              fillOpacity={1}
              fill="url(#colorVolume)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
