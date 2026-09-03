import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/calendar/WorkoutBlock", () => ({ default: () => <div>Bloc de séance</div> }));
vi.mock("@/components/calendar/QuickCreate", () => ({ default: () => <div>Taxonomie rapide</div> }));

import CreatePage from "./CreatePage";

const draft = {
  category: "",
  subcategory: "",
  title: "",
  totalDuration: "",
  expectedRpe: "",
  expectedRpeGlobal: "",
  expectedSpecificDuration: "",
  expectedRpeSpecific: "",
  description: "",
  blocks: [],
};

function renderPage(overrides = {}) {
  return render(
    <CreatePage
      categories={[{ id: "road", name: "Route" }]}
      subcategories={[]}
      draft={draft}
      editingId={null}
      updateDraft={vi.fn()}
      updateBlock={vi.fn()}
      updateRepeat={vi.fn()}
      setDraft={vi.fn()}
      saveWorkout={vi.fn()}
      newCat={{ name: "", color: "" }}
      setNewCat={vi.fn()}
      newSub={{ name: "", color: "" }}
      setNewSub={vi.fn()}
      addItem={vi.fn()}
      {...overrides}
    />,
  );
}

describe("CreatePage", () => {
  afterEach(cleanup);

  it("explains missing required information inline before saving", () => {
    const saveWorkout = vi.fn();
    renderPage({ saveWorkout });

    fireEvent.click(screen.getByRole("button", { name: "Enregistrer dans la bibliothèque" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Choisis une discipline");
    expect(saveWorkout).not.toHaveBeenCalled();
  });

  it("keeps the existing save callback when the required information is present", () => {
    const saveWorkout = vi.fn();
    renderPage({ saveWorkout, draft: { ...draft, category: "Route", title: "Endurance" } });

    fireEvent.click(screen.getByRole("button", { name: "Enregistrer dans la bibliothèque" }));

    expect(saveWorkout).toHaveBeenCalledTimes(1);
  });
});
