import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { eq, from } = vi.hoisted(() => {
  const eq = vi.fn().mockResolvedValue({ error: null });
  const remove = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ delete: remove }));
  return { eq, from };
});

vi.mock("@/lib/supabase", () => ({ supabase: { from } }));

import LibraryPage from "./LibraryPage";

describe("LibraryPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("requires an internal confirmation before deleting a library workout", async () => {
    const setLibrary = vi.fn();
    render(
      <LibraryPage
        categories={[]}
        setCategories={vi.fn()}
        subcategories={[]}
        setSubcategories={vi.fn()}
        filter={{ category: "", subcategory: "" }}
        setFilter={vi.fn()}
        filteredLibrary={[{ id: "workout-1", title: "Endurance", blocks: [] }]}
        editWorkout={vi.fn()}
        setLibrary={setLibrary}
        library={[{ id: "workout-1", title: "Endurance", blocks: [] }]}
        rename={vi.fn()}
        removeItem={vi.fn()}
        taxonomyPending={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    expect(from).not.toHaveBeenCalled();
    expect(screen.getByRole("region", { name: /Supprimer définitivement/ })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Supprimer définitivement" }));

    await waitFor(() => expect(from).toHaveBeenCalledWith("workout_library"));
    expect(eq).toHaveBeenCalledWith("id", "workout-1");
    expect(setLibrary).toHaveBeenCalledWith([]);
  });

  it("filters locally without changing the selected taxonomy filters", () => {
    render(
      <LibraryPage
        categories={[]}
        setCategories={vi.fn()}
        subcategories={[]}
        setSubcategories={vi.fn()}
        filter={{ category: "", subcategory: "" }}
        setFilter={vi.fn()}
        filteredLibrary={[
          { id: "workout-1", title: "Endurance", category: "Route", blocks: [] },
          { id: "workout-2", title: "Force", category: "VTT", blocks: [] },
        ]}
        editWorkout={vi.fn()}
        setLibrary={vi.fn()}
        library={[
          { id: "workout-1", title: "Endurance", category: "Route", blocks: [] },
          { id: "workout-2", title: "Force", category: "VTT", blocks: [] },
        ]}
        rename={vi.fn()}
        removeItem={vi.fn()}
        taxonomyPending={false}
      />,
    );

    fireEvent.change(screen.getByRole("searchbox", { name: "Rechercher une séance" }), { target: { value: "force" } });

    expect(screen.getByText("Force")).toBeVisible();
    expect(screen.queryByText("Endurance")).not.toBeInTheDocument();
  });

  it("keeps the workout visible and reports a deletion error", async () => {
    eq.mockResolvedValueOnce({ error: { message: "blocked" } });
    const workout = { id: "workout-1", title: "Endurance", blocks: [] };
    render(
      <LibraryPage
        categories={[]}
        setCategories={vi.fn()}
        subcategories={[]}
        setSubcategories={vi.fn()}
        filter={{ category: "", subcategory: "" }}
        setFilter={vi.fn()}
        filteredLibrary={[workout]}
        editWorkout={vi.fn()}
        setLibrary={vi.fn()}
        library={[workout]}
        rename={vi.fn()}
        removeItem={vi.fn()}
        taxonomyPending={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    fireEvent.click(screen.getByRole("button", { name: "Supprimer définitivement" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("n’a pas pu être supprimée");
    expect(screen.getByText("Endurance")).toBeVisible();
  });
});
