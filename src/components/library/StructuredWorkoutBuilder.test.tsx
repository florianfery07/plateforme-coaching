import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import StructuredWorkoutBuilder, { emptyWorkoutStructureV2 } from "./StructuredWorkoutBuilder";

describe("StructuredWorkoutBuilder", () => {
  afterEach(cleanup);
  it("adds a compact block and exposes calculated durations", () => {
    const onChange = vi.fn();
    render(<StructuredWorkoutBuilder value={emptyWorkoutStructureV2()} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "+ Bloc" }));

    expect(onChange).toHaveBeenCalledOnce();
    const next = onChange.mock.calls[0][0];
    expect(next.blocks).toHaveLength(1);
    expect(next.blocks[0]).toMatchObject({ durationSeconds: 300, kind: "warmup", isSpecific: false });
  });

  it("creates a repeat block with independent child identifiers", () => {
    const onChange = vi.fn();
    render(<StructuredWorkoutBuilder value={emptyWorkoutStructureV2()} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "+ Répétition" }));

    const next = onChange.mock.calls[0][0];
    expect(next.blocks[0]).toMatchObject({ kind: "repeat", repetitions: 4 });
    expect(next.blocks[0].steps[0].id).not.toBe(next.blocks[0].steps[1].id);
  });

  it("keeps an empty builder readable without pretending it has a duration", () => {
    render(<StructuredWorkoutBuilder value={emptyWorkoutStructureV2()} onChange={vi.fn()} />);
    expect(screen.getByText("Ajoute un premier bloc.")).toBeVisible();
    expect(screen.getByText("Durée totale")).toHaveTextContent("—");
  });
});
