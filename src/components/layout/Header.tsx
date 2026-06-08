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
      : [["calendar", "Mon calendrier"]];

  return (
    <header className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl xl:text-4xl">
          Ma Plateforme Coaching Cycliste
        </h1>
        <p className="mt-2 text-sm text-zinc-400 sm:text-base">
          Calendriers individuels, bibliothèque, fiches athlètes, retours et propositions.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:gap-3">
        {nav.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`shrink-0 rounded-2xl px-4 py-3 text-sm font-semibold sm:px-5 sm:text-base ${
              view === key
                ? "bg-white text-black"
                : "border border-zinc-800 bg-zinc-900 hover:bg-zinc-800"
            }`}
          >
            {label}
          </button>
        ))}

        <button
          onClick={logout}
          className="shrink-0 rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-300 sm:px-5 sm:text-base"
        >
          Déconnexion
        </button>
      </div>
    </header>
  );
}