import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// L06 recorded these pre-existing legacy files. The base rule remains enabled
// everywhere else, so a new @ts-nocheck is still rejected by CI.
const legacyTsNoCheckFiles = [
  "src/app/page.tsx",
  "src/components/athlete/AnnualLoadChart.tsx",
  "src/components/athlete/AthleteGoalUpdatePanel.tsx",
  "src/components/athlete/AthletePage.tsx",
  "src/components/athlete/AthleteProfilePage.tsx",
  "src/components/athlete/AthleteSelector.tsx",
  "src/components/athlete/AthleteStatsPage.tsx",
  "src/components/athlete/AthleteTestsReadOnly.tsx",
  "src/components/athlete/CP.tsx",
  "src/components/athlete/ManagementPage.tsx",
  "src/components/athlete/StatCard.tsx",
  "src/components/athlete/Stats.tsx",
  "src/components/athlete/TrainingDistribution.tsx",
  "src/components/athlete/WeekDetail.tsx",
  "src/components/athlete/WeekIndicators.tsx",
  "src/components/athlete/WeekPicker.tsx",
  "src/components/athlete/WeeklyLoadChart.tsx",
  "src/components/athlete/WeeklyReviewPage.tsx",
  "src/components/auth/AuthPage.tsx",
  "src/components/calendar/AthleteBehaviorAnalysis.tsx",
  "src/components/calendar/AthleteGoalUpdateBanner.tsx",
  "src/components/calendar/AthleteNotificationsBanner.tsx",
  "src/components/calendar/AthleteProposalForm.tsx",
  "src/components/calendar/Block.tsx",
  "src/components/calendar/CalendarPage.tsx",
  "src/components/calendar/CalendarPageOld.tsx",
  "src/components/calendar/CalendarToolbar.tsx",
  "src/components/calendar/DayView.tsx",
  "src/components/calendar/FilterSelects.tsx",
  "src/components/calendar/MonthView.tsx",
  "src/components/calendar/Proposal.tsx",
  "src/components/calendar/QuickCreate.tsx",
  "src/components/calendar/QuickLibrary.tsx",
  "src/components/calendar/RpeHelp.tsx",
  "src/components/calendar/Session.tsx",
  "src/components/calendar/WorkoutBlock.tsx",
  "src/components/calendar/YearView.tsx",
  "src/components/dev/DevChecks.tsx",
  "src/components/layout/Header.tsx",
  "src/components/library/CreatePage.tsx",
  "src/components/library/Editable.tsx",
  "src/components/library/LibraryPage.tsx",
  "src/components/ui/ui.tsx",
  "src/lib/api/RroupCalendar.ts",
  "src/lib/api/groups.ts",
  "src/lib/platformDefaults.ts",
  "src/lib/proposalUtils.ts",
  "src/lib/trainingUtils.ts",
];

const legacyReactCompilerDebt = [
  {
    files: [
      "src/app/page.tsx",
      "src/components/athlete/AthleteProfilePage.tsx",
      "src/components/athlete/CP.tsx",
      "src/components/athlete/Stats.tsx",
      "src/components/athlete/WeeklyReviewPage.tsx",
    ],
    rules: { "react-hooks/set-state-in-effect": "warn" },
  },
  {
    files: [
      "src/components/athlete/AthleteProfilePage.tsx",
      "src/components/athlete/TrainingDistribution.tsx",
    ],
    rules: { "react-hooks/immutability": "warn" },
  },
  {
    files: ["src/components/athlete/AthleteProfilePage.tsx"],
    rules: { "react-hooks/static-components": "warn" },
  },
  {
    files: ["src/components/calendar/CalendarPageOld.tsx"],
    rules: { "react-hooks/preserve-manual-memoization": "warn" },
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  ...legacyReactCompilerDebt,
  {
    files: legacyTsNoCheckFiles,
    rules: { "@typescript-eslint/ban-ts-comment": "off" },
  },
]);

export default eslintConfig;
