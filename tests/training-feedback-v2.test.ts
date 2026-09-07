import { describe, expect, it } from "vitest";

import {
  feedbackDone,
  feedbackV2Status,
  hasSpecificFeedbackRequirement,
} from "../src/lib/trainingUtils";

const completedFeedback = {
  actualTime: "1h20",
  comment: "",
  motivation: "8",
  pleasure: "4",
  rpe: "7",
  rpeGlobal: "7",
  rpeSpecific: "",
  sensation: "5",
  validated: true,
};

function session(overrides = {}) {
  return {
    category: "Endurance",
    date: "2026-09-05",
    expectedRpeSpecific: "",
    expectedSpecificDuration: "",
    feedback: { ...completedFeedback },
    nonDone: { validated: false },
    ...overrides,
  };
}

describe("P04 feedback state derivation", () => {
  it("requires a specific RPE only from the two explicit planning fields", () => {
    expect(hasSpecificFeedbackRequirement(session({ expectedRpeSpecific: "8", expectedSpecificDuration: "40 min" }))).toBe(true);
    expect(hasSpecificFeedbackRequirement(session({ expectedRpeSpecific: "8", expectedSpecificDuration: "" }))).toBe(false);
    expect(hasSpecificFeedbackRequirement(session({ expectedRpeSpecific: "", expectedSpecificDuration: "40 min" }))).toBe(false);
  });

  it("recognizes a complete V2 feedback without an optional comment", () => {
    expect(feedbackDone(completedFeedback)).toBe(true);
    expect(feedbackV2Status(session(), new Date("2026-09-06T12:00:00"))).toBe("complete");
  });

  it("derives each pilot status from the session state instead of a stored status", () => {
    const now = new Date("2026-09-06T12:00:00");

    expect(feedbackV2Status(session({ category: "Repos" }), now)).toBe("rest");
    expect(feedbackV2Status(session({ nonDone: { validated: true } }), now)).toBe("nonDone");
    expect(feedbackV2Status(session({ date: "2026-09-07" }), now)).toBe("scheduled");
    expect(feedbackV2Status(session({ feedback: { ...completedFeedback, validated: false } }), now)).toBe("incomplete");
    expect(feedbackV2Status(session({ feedback: { ...completedFeedback, actualTime: "", validated: false } }), now)).toBe("incomplete");
    expect(feedbackV2Status(session({ feedback: { actualTime: "", comment: "", motivation: "", pleasure: "", rpe: "", rpeGlobal: "", rpeSpecific: "", sensation: "", validated: false } }), now)).toBe("missing");
  });

  it("keeps legacy completion semantics for records without structured sensations", () => {
    const legacy = {
      actualTime: "1h20",
      comment: "Historique",
      motivation: "8",
      pleasure: "4",
      rpe: "7",
      rpeGlobal: "7",
      rpeSpecific: "8",
      validated: true,
      updatedAt: "2026-09-06T12:00:00.000Z",
    };

    expect(feedbackDone(legacy)).toBe(true);
    expect(feedbackV2Status(session({ feedback: legacy }), new Date("2026-09-06T12:00:00"))).toBe("complete");
  });
});
