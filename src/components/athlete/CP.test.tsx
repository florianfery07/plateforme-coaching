import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

let historyRows: Array<Record<string, unknown>> = [];
const insert = vi.fn().mockResolvedValue({ error: null });
const remove = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      delete: () => ({ eq: remove }),
      insert,
      select: () => ({
        eq: () => ({
          order: vi.fn().mockImplementation(async () => ({ data: historyRows, error: null })),
        }),
      }),
    })),
  },
}));

import CP from "./CP";

const athlete = { id: "athlete-1", power5: "300", power12: "280", power20: "250", weight: "60" };
const cpData = {
  cp: 245,
  wattsPerKg: 4.08,
  wPrime: 18_000,
  zones: [{ id: "Z1", name: "Récupération" }],
};

describe("CP", () => {
  afterEach(() => {
    cleanup();
    historyRows = [];
    insert.mockClear();
    remove.mockClear();
  });

  it("uses an inline confirmation before removing an archived test", async () => {
    historyRows = [{ archived_at: "2026-08-20T10:00:00Z", id: "history-1", power5: "300", power12: "280", power20: "250", weight: "60" }];
    render(<CP athlete={athlete} updateAthlete={vi.fn()} cpData={cpData} />);

    await waitFor(() => expect(screen.getByText("20/08/2026")).toBeVisible());
    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));

    expect(await screen.findByRole("region", { name: "Confirmation de suppression du test" })).toBeVisible();
    expect(remove).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Supprimer le test" }));
    await waitFor(() => expect(remove).toHaveBeenCalledWith("id", "history-1"));
  });
});
