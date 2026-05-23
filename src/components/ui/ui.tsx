// @ts-nocheck

import { COLORS } from "@/lib/platformDefaults";

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-zinc-400">
        {label}
      </span>
      {children}
    </label>
  );
}

export function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-3 text-base outline-none sm:py-2 ${className}`}
    />
  );
}

export function Textarea({ className = "", ...props }) {
  return (
    <textarea
      {...props}
      className={`w-full resize-none rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-3 text-base outline-none sm:py-2 ${className}`}
    />
  );
}

export function Select({ children, className = "", ...props }) {
  return (
    <select
      {...props}
      className={`w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-3 text-base outline-none sm:py-2 ${className}`}
    >
      {children}
    </select>
  );
}

export function Panel({ children, className = "" }) {
  return (
    <section
      className={`rounded-3xl border border-zinc-800 bg-zinc-900 p-3 shadow-xl sm:p-5 ${className}`}
    >
      {children}
    </section>
  );
}

export function Badge({ children, className = "" }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}

export function Btn({ children, variant = "secondary", className = "", ...props }) {
  const base =
    "rounded-xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed sm:py-2 sm:text-base";

  const styles = {
    primary: "bg-white text-black hover:opacity-90",
    secondary: "border border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700",
    danger: "bg-red-500 text-white hover:bg-red-600",
  };

  return (
    <button
      {...props}
      className={`${base} ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Empty({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-600 bg-zinc-800 p-8 text-center text-zinc-500">
      {text}
    </div>
  );
}

export function ColorSelect(props) {
  return (
    <Select {...props}>
      {COLORS.map(([label, value]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </Select>
  );
}