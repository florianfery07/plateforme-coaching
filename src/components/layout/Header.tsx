// @ts-nocheck

export default function Header({ view, setView, auth, logout }) {
  const nav =
    auth?.role === "coach"
      ? [
          ["calendar", "Calendriers"],
          ["athlete", "Fiche athlète"],
          ["create", "Création séance"],
          ["library", "Bibliothèque"],
          ["management", "Paramètres athlètes"],
        ]
      : [
          ["calendar", "Mon calendrier"],
          ["athleteStats", "Mes stats"],
        ];

  return (
    <header className="flex flex-col gap-5 border-b border-zinc-800 pb-5 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-300">
          {auth?.role === "coach" ? "Espace coach" : "Espace athlète"}
        </p>
        <h1 className="text-2xl font-bold sm:text-3xl xl:text-4xl">
          Ma Plateforme Coaching Cycliste
        </h1>
        <p className="mt-2 text-sm text-zinc-400 sm:text-base">
          Calendriers individuels, bibliothèque, fiches athlètes, retours et propositions.
        </p>
      </div>

      <nav aria-label="Navigation principale" className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:gap-3">
        {nav.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            aria-current={view === key ? "page" : undefined}
            className={`min-h-11 rounded-2xl px-4 py-3 text-sm font-semibold transition sm:px-5 sm:text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${
              view === key
                ? "bg-white text-black"
                : "border border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
            }`}
          >
            {label}
          </button>
        ))}

        <button
          type="button"
          onClick={logout}
          className="min-h-11 rounded-2xl border border-zinc-600 bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800 sm:px-5 sm:text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
        >
          Déconnexion
        </button>
      </nav>
    </header>
  );
}
