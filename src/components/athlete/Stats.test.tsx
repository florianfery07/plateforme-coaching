import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import AnnualLoadChart from "./AnnualLoadChart";
import TrainingDistribution from "./TrainingDistribution";

describe("statistics accessibility", () => {
  afterEach(cleanup);

  it("exposes an annual chart description and its weekly data", () => {
    render(
      <AnnualLoadChart
        weeks={[{ week: "S1", range: "01/01 - 07/01", sessionsList: [], total: 0 }]}
      />,
    );

    expect(screen.getByRole("img", { name: /Charge annuelle, fatigue et forme/i })).toBeVisible();
    expect(screen.getByText("Consulter les données hebdomadaires")).toBeVisible();
  });

  it("offers readable distribution details alongside the pie chart", () => {
    render(
      <TrainingDistribution
        sessions={[{
          id: "session-1",
          category: "Route",
          subcategory: "Endurance",
          feedback: { actualTime: "1h" },
          expectedRpeGlobal: "5",
        }]}
        categories={[{ name: "Route", color: "blue" }]}
        subcategories={[{ name: "Endurance", color: "green" }]}
      />,
    );

    expect(screen.getAllByRole("img", { name: /Répartition du temps réalisé/i })).toHaveLength(2);
    expect(screen.getAllByText("Route").length).toBeGreaterThan(0);
  });
});
