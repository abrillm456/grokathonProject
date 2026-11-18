"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DIMENSION_COLOR } from "@/components/identity";
import type { Dimension } from "@/types";

const tooltipStyle = {
  contentStyle: {
    background: "#101d30",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    color: "#f4f7fb",
  },
};

export function DailyChart({ data }: { data: { label: string; xp: number }[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="label" stroke="#93a4b8" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#93a4b8" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip {...tooltipStyle} />
          <Bar dataKey="xp" name="XP" fill="#42d9f5" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HistoryChart({ data }: { data: { week: string; xp: number }[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="week" stroke="#93a4b8" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#93a4b8" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip {...tooltipStyle} />
          <Line type="monotone" dataKey="xp" name="XP" stroke="#42d9f5" strokeWidth={2.5} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryPie({ data }: { data: { name: string; value: number; key: Dimension }[] }) {
  const slices = data.filter((item) => item.value > 0);
  if (slices.length === 0) return <p className="text-sm text-muted">Log an activity to see the mix.</p>;
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={slices} dataKey="value" nameKey="name" innerRadius={58} outerRadius={84} paddingAngle={3}>
            {slices.map((slice) => (
              <Cell key={slice.key} fill={DIMENSION_COLOR[slice.key]} />
            ))}
          </Pie>
          <Tooltip {...tooltipStyle} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CompareRadar({
  data,
}: {
  data: { dimension: string; you: number; rival: number }[];
}) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid stroke="rgba(255,255,255,0.14)" />
          <PolarAngleAxis dataKey="dimension" tick={{ fill: "#93a4b8", fontSize: 12 }} />
          <Radar dataKey="you" name="You" stroke="#42d9f5" fill="#42d9f5" fillOpacity={0.35} />
          <Radar dataKey="rival" name="Rival" stroke="#f5b942" fill="#f5b942" fillOpacity={0.18} />
          <Legend />
          <Tooltip {...tooltipStyle} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StreakChart({ data }: { data: { week: string; streak: number }[] }) {
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="week" stroke="#93a4b8" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} stroke="#93a4b8" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip {...tooltipStyle} />
          <Line type="monotone" dataKey="streak" name="Streak" stroke="#f5b942" strokeWidth={2.5} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
