import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import Editable from "../../src/components/library/Editable";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));

const props = {
  items: [{ color: "bg-blue-500", id: "category-1", name: "Route" }],
  kind: "category",
  removeItem: vi.fn(),
  rename: vi.fn(),
  setItems: vi.fn(),
  title: "Disciplines",
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("workout taxonomy pilot UI", () => {
  it("prevents a second taxonomy operation while the server command is pending", () => {
    render(<Editable {...props} taxonomyPending />);

    const remove = screen.getByRole("button", { name: "Supprimer" });
    expect(screen.getByRole("button", { name: "Modifier" })).toBeDisabled();
    expect(remove).toBeDisabled();

    fireEvent.click(remove);
    expect(props.removeItem).not.toHaveBeenCalled();
  });

  it("keeps the legacy callbacks available when the pilot has no pending command", () => {
    render(<Editable {...props} taxonomyPending={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Modifier" }));
    expect(screen.getByRole("button", { name: "Valider" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Annuler" })).toBeEnabled();
  });
});
