// @ts-nocheck
"use client";

export default function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-center">
      <div className="text-xs text-zinc-400">
        {label}
      </div>

      <div className="text-2xl font-bold">
        {value}
      </div>
    </div>
  );
}