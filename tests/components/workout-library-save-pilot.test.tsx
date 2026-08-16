import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import CreatePage from "../../src/components/library/CreatePage";

vi.mock("@/components/calendar/QuickCreate", () => ({ default: () => null }));
vi.mock("@/components/calendar/WorkoutBlock", () => ({ default: () => null }));

const props = {
  addItem: vi.fn(),
  categories: [],
  draft: {
    blocks: [],
    category: "Route",
    description: "",
    expectedRpe: "",
    expectedRpeGlobal: "",
    expectedRpeSpecific: "",
    expectedSpecificDuration: "",
    subcategory: "",
    title: "Séance locale",
    totalDuration: "",
  },
  editingId: "workout-1",
  newCat: { color: "", name: "" },
  newSub: { color: "", name: "" },
  saveWorkout: vi.fn(),
  setDraft: vi.fn(),
  setNewCat: vi.fn(),
  setNewSub: vi.fn(),
  subcategories: [],
  updateBlock: vi.fn(),
  updateDraft: vi.fn(),
  updateRepeat: vi.fn(),
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("workout library save pilot UI", () => {
  it("keeps the existing save button unavailable while the targeted write is pending", () => {
    render(<CreatePage {...props} savePending />);

    expect(screen.getByRole("button", { name: "Mettre à jour" })).toBeDisabled();
  });

  it("keeps the legacy save callback callable when no targeted write is pending", () => {
    render(<CreatePage {...props} savePending={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Mettre à jour" }));

    expect(props.saveWorkout).toHaveBeenCalledTimes(1);
  });
});
