// @ts-nocheck

export default function Header({
  view,
  setView,
  auth,
  logout,
  coachPilotageV2Enabled = false,
}) {
  const coachNavigation = coachPilotageV2Enabled
    ? [
        ["calendar", "Pilotage"],
        ["athlete", "Athlètes"],
        ["library", "Bibliothèque"],
        ["management", "Paramètres"],
      ]
    : [
        ["calendar", "Calendriers"],
        ["athlete", "Fiche athlète"],
        ["create", "Création séance"],
        ["library", "Bibliothèque"],
        ["management", "Paramètres athlètes"],
      ];

  const nav = auth?.role === "coach"
    ? coachNavigation
    : [
        ["calendar", "Mon calendrier"],
        ["athleteStats", "Mes stats"],
      ];

  return (
    <header className={`flex flex-col gap-4 border-b border-zinc-800/80 pb-4 xl:flex-row xl:items-end xl:justify-between ${
      coachPilotageV2Enabled ? "xl:gap-6" : ""
    }`}>
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-amber-300">
          {auth?.role === "coach" ? "Espace coach" : "Espace athlète"}
        </p>
        <h1 className="text-2xl font-bold sm:text-3xl">
          Ma Plateforme Coaching Cycliste
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          {coachPilotageV2Enabled
            ? "Pilotage, athlètes, bibliothèque et réglages du coaching."
            : "Calendriers individuels, bibliothèque, fiches athlètes, retours et propositions."}
        </p>
      </div>

      <nav aria-label="Navigation principale" className="grid w-full grid-cols-2 gap-1.5 sm:flex sm:w-auto sm:flex-wrap sm:gap-1.5">
        {nav.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            aria-current={view === key ? "page" : undefined}
            className={`min-h-11 rounded-lg px-3 py-2.5 text-sm font-semibold transition sm:min-h-10 sm:px-3 sm:py-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${
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
          className="min-h-11 rounded-lg border border-zinc-700 bg-transparent px-3 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-900 sm:min-h-10 sm:px-3 sm:py-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
        >
          Déconnexion
        </button>
      </nav>
    </header>
  );
}
