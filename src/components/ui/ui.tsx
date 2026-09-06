// @ts-nocheck

import { APP_COLORS } from "@/lib/colors";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400";

export function Field({ label, children, className = "" }) {
  return (
    <label className={`flex h-full flex-col ${className}`}>
      <span className="mb-1 flex min-h-6 items-end text-xs font-medium text-zinc-400">
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
      className={`min-h-11 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white transition placeholder:text-zinc-500 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-10 sm:py-1.5 ${focusRing} ${className}`}
    />
  );
}

export function Textarea({ className = "", ...props }) {
  return (
    <textarea
      {...props}
      className={`w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white transition placeholder:text-zinc-500 disabled:cursor-not-allowed disabled:opacity-50 sm:py-1.5 ${focusRing} ${className}`}
    />
  );
}

export function Select({ children, className = "", ...props }) {
  return (
    <select
      {...props}
      className={`min-h-11 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white transition disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-10 sm:py-1.5 ${focusRing} ${className}`}
    >
      {children}
    </select>
  );
}

export function Panel({ children, className = "" }) {
  return (
    <section
      className={`rounded-2xl border border-zinc-800/80 bg-zinc-900/80 p-3 sm:p-4 ${className}`}
    >
      {children}
    </section>
  );
}

export function Badge({ children, className = "" }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${className}`}>
      {children}
    </span>
  );
}

export function Btn({ children, variant = "secondary", className = "", ...props }) {
  const base =
    `min-h-11 rounded-lg px-3 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-10 sm:py-1.5 ${focusRing}`;

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
    <div
      role="status"
      className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-5 text-center text-sm text-zinc-400"
    >
      {text}
    </div>
  );
}

export function StatusMessage({ children, variant = "info", className = "" }) {
  const styles = {
    info: "border-zinc-700 bg-zinc-800 text-zinc-200",
    success: "border-emerald-400/40 bg-emerald-500/10 text-emerald-100",
    error: "border-red-400/40 bg-red-500/10 text-red-100",
  };

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
      className={`rounded-xl border p-2.5 text-sm font-medium ${styles[variant]} ${className}`}
    >
      {children}
    </div>
  );
}

export function ColorSelect(props) {
  return (
    <Select {...props}>
      {APP_COLORS.map(([label, value]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </Select>
  );
}
