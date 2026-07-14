import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import type { Database } from "../../src/types/database";

type AthleteActive = Database["public"]["Tables"]["athletes"]["Row"]["active"];
type AccessAccount = Database["access_control"]["Tables"]["accounts"]["Row"];
type AthleteInsert = Database["public"]["Tables"]["athletes"]["Insert"];
type LinkAthleteInviteArgs = Database["public"]["Functions"]["link_athlete_invite"]["Args"];

const athleteActiveMustRemainBoolean: AthleteActive = true;
const accessAccountMustExposeStatus: AccessAccount["account_status"] = "active";
const athleteInsertMustAcceptNull: AthleteInsert = { name: "Athlete", sport: null };
const tokenInviteArguments: LinkAthleteInviteArgs = {
  invite_token: "invite-token",
  athlete_email: "athlete@example.test",
  auth_user_id: "user-id",
};
const athleteInviteArguments: LinkAthleteInviteArgs = {
  athlete_id: "athlete-id",
  athlete_email: "athlete@example.test",
  auth_user_id: "user-id",
};
const generatedDatabasePath = resolve(process.cwd(), "src/types/database.ts");

describe("generated Database type", () => {
  it("contains the controlled public and access-control schema references", () => {
    const source = readFileSync(generatedDatabasePath, "utf8");

    expect(source).toContain('"public": {');
    expect(source).toContain('"access_control": {');
    expect(source).toContain('"get_access_context_v2": {');
    expect(source).toContain('"organizations": {');
    expect(source).toContain("144e1614c8ee75288ae6c8521f4f7df1f7d2b9bac3165f83c526d251db4b6342");
  });

  it("does not expose local pgcrypto extension functions as application RPCs", () => {
    const source = readFileSync(generatedDatabasePath, "utf8");

    expect(source).not.toContain('"digest": {');
    expect(source).not.toContain('"gen_random_uuid": {');
  });

  it("keeps representative SQL primitives strongly typed", () => {
    expect(athleteActiveMustRemainBoolean).toBe(true);
    expect(accessAccountMustExposeStatus).toBe("active");
    expect(athleteInsertMustAcceptNull.sport).toBeNull();
    expect(tokenInviteArguments).toHaveProperty("invite_token");
    expect(athleteInviteArguments).toHaveProperty("athlete_id");
  });
});
