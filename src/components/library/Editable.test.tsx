import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ supabase: { from: vi.fn() } }));

import Editable from "./Editable";

const category = { color: "bg-blue-500", id: "category-1", name: "Route" };

describe("Editable taxonomy controls", () => {
  afterEach(cleanup);

  it("requires an accessible confirmation and communicates the impact before removal", async () => {
    const removeItem = vi.fn().mockResolvedValue(true);
    render(
      <Editable
        title="Disciplines"
        items={[category]}
        setItems={vi.fn()}
        kind="category"
        rename={vi.fn()}
        removeItem={removeItem}
        taxonomyPending={false}
        workouts={[{ category: "Route", id: "workout-1" }, { category: "Route", id: "workout-2" }] as never[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));

    expect(screen.getByRole("region", { name: "Supprimer « Route » ?" })).toHaveTextContent("2 séances liées seront également retirées");
    expect(removeItem).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Supprimer définitivement" }));

    await waitFor(() => expect(removeItem).toHaveBeenCalledWith("category", "Route", true));
    expect(screen.getByRole("status")).toHaveTextContent("Route a été supprimé.");
  });

  it("shows a safe error when the existing taxonomy operation fails", async () => {
    const removeItem = vi.fn().mockResolvedValue(false);
    render(
      <Editable
        title="Thèmes"
        items={[{ ...category, id: "subcategory-1", name: "Endurance" }]}
        setItems={vi.fn()}
        kind="subcategory"
        rename={vi.fn()}
        removeItem={removeItem}
        taxonomyPending={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    fireEvent.click(screen.getByRole("button", { name: "Supprimer définitivement" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("La suppression n’a pas pu être effectuée.");
  });
});
