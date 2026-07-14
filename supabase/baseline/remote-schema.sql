


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."is_coach"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  select exists (
    select 1
    from user_roles
    where user_id = auth.uid()
    and role = 'coach'
  );
$$;


ALTER FUNCTION "public"."is_coach"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."link_athlete_invite"("invite_token" "text", "athlete_email" "text", "auth_user_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  athlete_id uuid;
begin
  athlete_id := replace(invite_token, 'invite-', '')::uuid;

  update public.athletes
  set
    user_id = auth_user_id,
    email = lower(athlete_email)
  where id = athlete_id
    and user_id is null;

  if not found then
    raise exception 'Athlete invite not found or already linked';
  end if;

  return athlete_id;
end;
$$;


ALTER FUNCTION "public"."link_athlete_invite"("invite_token" "text", "athlete_email" "text", "auth_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."link_athlete_invite"("athlete_id" "uuid", "athlete_email" "text", "auth_user_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  update public.athletes
  set
    user_id = auth_user_id,
    email = lower(athlete_email)
  where id = athlete_id;

  if not found then
    raise exception 'Athlete not found';
  end if;

  return athlete_id;
end;
$$;


ALTER FUNCTION "public"."link_athlete_invite"("athlete_id" "uuid", "athlete_email" "text", "auth_user_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."athlete_goal_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "athlete_id" "uuid",
    "short_goal" "text",
    "medium_goal" "text",
    "long_goal" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."athlete_goal_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."athlete_group_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid",
    "athlete_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."athlete_group_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."athlete_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."athlete_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."athlete_observations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "title" "text" DEFAULT ''::"text" NOT NULL,
    "content" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."athlete_observations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."athlete_proposals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "athlete_id" "uuid",
    "date" "text",
    "type" "text",
    "title" "text",
    "message" "text",
    "status" "text" DEFAULT 'À traiter'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."athlete_proposals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."athlete_test_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "athlete_id" "uuid",
    "power5" "text",
    "power12" "text",
    "power20" "text",
    "weight" "text",
    "cp" "text",
    "w_prime" "text",
    "watts_per_kg" "text",
    "zones" "jsonb",
    "archived_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."athlete_test_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."athlete_week_colors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "athlete_id" "uuid",
    "year" integer,
    "week" "text",
    "color_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."athlete_week_colors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."athlete_week_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "year" integer NOT NULL,
    "week" "text" NOT NULL,
    "note" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."athlete_week_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."athlete_week_planning" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "year" integer NOT NULL,
    "week" "text" NOT NULL,
    "goal" "text" DEFAULT 'Off'::"text" NOT NULL,
    "category" "text" DEFAULT ''::"text" NOT NULL,
    "subcategory" "text" DEFAULT ''::"text" NOT NULL,
    "coach_comment" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'planned'::"text"
);


ALTER TABLE "public"."athlete_week_planning" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."athletes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "sport" "text",
    "weight" "text",
    "ftp" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "email" "text",
    "age" "text",
    "height" "text",
    "short_goal" "text",
    "medium_goal" "text",
    "long_goal" "text",
    "context" "text",
    "power5" "text",
    "power12" "text",
    "power20" "text",
    "user_id" "uuid",
    "active" boolean DEFAULT true NOT NULL,
    "goal_update_requested" boolean DEFAULT false,
    "color" "text" DEFAULT 'bg-blue-500'::"text"
);


ALTER TABLE "public"."athletes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."calendar_workouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "athlete_id" "uuid",
    "date" "text" NOT NULL,
    "workout_type" "text",
    "title" "text",
    "duration" "text",
    "completed" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "non_done" boolean DEFAULT false,
    "non_done_reason" "text",
    "non_done_fatigue" "text",
    "non_done_pain" "text",
    "non_done_comment" "text",
    "description" "text",
    "expected_rpe" "text",
    "blocks" "jsonb",
    "subcategory" "text",
    "expected_rpe_global" numeric,
    "expected_specific_duration" "text",
    "expected_rpe_specific" numeric,
    "adjusted_specific_duration" "text",
    "athlete_seen_at" timestamp with time zone
);


ALTER TABLE "public"."calendar_workouts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "role" "text" DEFAULT 'athlete'::"text" NOT NULL,
    "coach_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    CONSTRAINT "user_roles_role_check" CHECK (("role" = ANY (ARRAY['coach'::"text", 'athlete'::"text"])))
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."week_colors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "athlete_id" "uuid",
    "year" integer NOT NULL,
    "week" integer NOT NULL,
    "color" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."week_colors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workout_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "color" "text" DEFAULT 'bg-blue-500'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."workout_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workout_feedbacks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workout_id" "uuid",
    "rpe" integer,
    "motivation" integer,
    "pleasure" integer,
    "comment" "text",
    "real_duration" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "rpe_global" numeric,
    "rpe_specific" numeric
);


ALTER TABLE "public"."workout_feedbacks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workout_library" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "category" "text",
    "duration" "text",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "blocks" "jsonb" DEFAULT '[]'::"jsonb",
    "subcategory" "text",
    "total_duration" "text",
    "expected_rpe" "text",
    "expected_rpe_global" numeric,
    "expected_specific_duration" "text",
    "expected_rpe_specific" numeric
);


ALTER TABLE "public"."workout_library" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workout_proposals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "athlete_id" "uuid",
    "title" "text",
    "description" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."workout_proposals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workout_subcategories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "color" "text" DEFAULT 'bg-yellow-500'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."workout_subcategories" OWNER TO "postgres";


ALTER TABLE ONLY "public"."athlete_goal_history"
    ADD CONSTRAINT "athlete_goal_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."athlete_group_members"
    ADD CONSTRAINT "athlete_group_members_group_id_athlete_id_key" UNIQUE ("group_id", "athlete_id");



ALTER TABLE ONLY "public"."athlete_group_members"
    ADD CONSTRAINT "athlete_group_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."athlete_groups"
    ADD CONSTRAINT "athlete_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."athlete_observations"
    ADD CONSTRAINT "athlete_observations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."athlete_proposals"
    ADD CONSTRAINT "athlete_proposals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."athlete_test_history"
    ADD CONSTRAINT "athlete_test_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."athlete_week_colors"
    ADD CONSTRAINT "athlete_week_colors_athlete_id_year_week_key" UNIQUE ("athlete_id", "year", "week");



ALTER TABLE ONLY "public"."athlete_week_colors"
    ADD CONSTRAINT "athlete_week_colors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."athlete_week_notes"
    ADD CONSTRAINT "athlete_week_notes_athlete_id_year_week_key" UNIQUE ("athlete_id", "year", "week");



ALTER TABLE ONLY "public"."athlete_week_notes"
    ADD CONSTRAINT "athlete_week_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."athlete_week_planning"
    ADD CONSTRAINT "athlete_week_planning_athlete_id_year_week_key" UNIQUE ("athlete_id", "year", "week");



ALTER TABLE ONLY "public"."athlete_week_planning"
    ADD CONSTRAINT "athlete_week_planning_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."athletes"
    ADD CONSTRAINT "athletes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."calendar_workouts"
    ADD CONSTRAINT "calendar_workouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."week_colors"
    ADD CONSTRAINT "week_colors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workout_categories"
    ADD CONSTRAINT "workout_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workout_feedbacks"
    ADD CONSTRAINT "workout_feedbacks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workout_feedbacks"
    ADD CONSTRAINT "workout_feedbacks_workout_id_unique" UNIQUE ("workout_id");



ALTER TABLE ONLY "public"."workout_library"
    ADD CONSTRAINT "workout_library_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workout_proposals"
    ADD CONSTRAINT "workout_proposals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workout_subcategories"
    ADD CONSTRAINT "workout_subcategories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."athlete_goal_history"
    ADD CONSTRAINT "athlete_goal_history_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."athlete_group_members"
    ADD CONSTRAINT "athlete_group_members_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."athlete_group_members"
    ADD CONSTRAINT "athlete_group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."athlete_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."athlete_observations"
    ADD CONSTRAINT "athlete_observations_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."athlete_proposals"
    ADD CONSTRAINT "athlete_proposals_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."athlete_test_history"
    ADD CONSTRAINT "athlete_test_history_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."athlete_week_colors"
    ADD CONSTRAINT "athlete_week_colors_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."athlete_week_planning"
    ADD CONSTRAINT "athlete_week_planning_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."athletes"
    ADD CONSTRAINT "athletes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."calendar_workouts"
    ADD CONSTRAINT "calendar_workouts_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."week_colors"
    ADD CONSTRAINT "week_colors_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_feedbacks"
    ADD CONSTRAINT "workout_feedbacks_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "public"."calendar_workouts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_proposals"
    ADD CONSTRAINT "workout_proposals_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE CASCADE;



CREATE POLICY "Allow all week notes" ON "public"."athlete_week_notes" USING (true) WITH CHECK (true);



CREATE POLICY "Allow delete athletes" ON "public"."athletes" FOR DELETE TO "anon" USING (true);



CREATE POLICY "Allow delete calendar workouts" ON "public"."calendar_workouts" FOR DELETE TO "anon" USING (true);



CREATE POLICY "Allow delete workout feedbacks" ON "public"."workout_feedbacks" FOR DELETE TO "anon" USING (true);



CREATE POLICY "Allow insert athletes" ON "public"."athletes" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Allow insert calendar workouts" ON "public"."calendar_workouts" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Allow insert workout feedbacks" ON "public"."workout_feedbacks" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Allow public delete workout_library" ON "public"."workout_library" FOR DELETE USING (true);



CREATE POLICY "Allow public insert workout_library" ON "public"."workout_library" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow public read workout_library" ON "public"."workout_library" FOR SELECT USING (true);



CREATE POLICY "Allow public update workout_library" ON "public"."workout_library" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "Allow select athletes" ON "public"."athletes" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Allow select calendar workouts" ON "public"."calendar_workouts" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Allow select workout feedbacks" ON "public"."workout_feedbacks" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Allow update calendar workouts" ON "public"."calendar_workouts" FOR UPDATE TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Allow update workout feedbacks" ON "public"."workout_feedbacks" FOR UPDATE TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Allow users read own role" ON "public"."user_roles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Athlete insert own athlete_proposals" ON "public"."athlete_proposals" FOR INSERT TO "authenticated" WITH CHECK (("athlete_id" IN ( SELECT "athletes"."id"
   FROM "public"."athletes"
  WHERE ("athletes"."user_id" = "auth"."uid"()))));



CREATE POLICY "Athlete read own athlete_proposals" ON "public"."athlete_proposals" FOR SELECT TO "authenticated" USING (("athlete_id" IN ( SELECT "athletes"."id"
   FROM "public"."athletes"
  WHERE ("athletes"."user_id" = "auth"."uid"()))));



CREATE POLICY "Athlete read own athlete_week_colors" ON "public"."athlete_week_colors" FOR SELECT TO "authenticated" USING (("athlete_id" IN ( SELECT "athletes"."id"
   FROM "public"."athletes"
  WHERE ("athletes"."user_id" = "auth"."uid"()))));



CREATE POLICY "Athlete read own calendar_workouts" ON "public"."calendar_workouts" FOR SELECT TO "authenticated" USING (("athlete_id" IN ( SELECT "athletes"."id"
   FROM "public"."athletes"
  WHERE ("athletes"."user_id" = "auth"."uid"()))));



CREATE POLICY "Athlete read own profile" ON "public"."athletes" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Athlete read own workout_feedbacks" ON "public"."workout_feedbacks" FOR SELECT TO "authenticated" USING (("workout_id" IN ( SELECT "cw"."id"
   FROM ("public"."calendar_workouts" "cw"
     JOIN "public"."athletes" "a" ON (("a"."id" = "cw"."athlete_id")))
  WHERE ("a"."user_id" = "auth"."uid"()))));



CREATE POLICY "Athlete update own athlete_proposals" ON "public"."athlete_proposals" FOR UPDATE TO "authenticated" USING (("athlete_id" IN ( SELECT "athletes"."id"
   FROM "public"."athletes"
  WHERE ("athletes"."user_id" = "auth"."uid"())))) WITH CHECK (("athlete_id" IN ( SELECT "athletes"."id"
   FROM "public"."athletes"
  WHERE ("athletes"."user_id" = "auth"."uid"()))));



CREATE POLICY "Athlete update own calendar_workouts" ON "public"."calendar_workouts" FOR UPDATE TO "authenticated" USING (("athlete_id" IN ( SELECT "athletes"."id"
   FROM "public"."athletes"
  WHERE ("athletes"."user_id" = "auth"."uid"())))) WITH CHECK (("athlete_id" IN ( SELECT "athletes"."id"
   FROM "public"."athletes"
  WHERE ("athletes"."user_id" = "auth"."uid"()))));



CREATE POLICY "Athlete update own profile" ON "public"."athletes" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Athlete upsert own workout_feedbacks" ON "public"."workout_feedbacks" TO "authenticated" USING (("workout_id" IN ( SELECT "cw"."id"
   FROM ("public"."calendar_workouts" "cw"
     JOIN "public"."athletes" "a" ON (("a"."id" = "cw"."athlete_id")))
  WHERE ("a"."user_id" = "auth"."uid"())))) WITH CHECK (("workout_id" IN ( SELECT "cw"."id"
   FROM ("public"."calendar_workouts" "cw"
     JOIN "public"."athletes" "a" ON (("a"."id" = "cw"."athlete_id")))
  WHERE ("a"."user_id" = "auth"."uid"()))));



CREATE POLICY "Authenticated read workout_categories" ON "public"."workout_categories" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated read workout_library" ON "public"."workout_library" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated read workout_subcategories" ON "public"."workout_subcategories" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Coach full access athlete_proposals" ON "public"."athlete_proposals" TO "authenticated" USING ("public"."is_coach"()) WITH CHECK ("public"."is_coach"());



CREATE POLICY "Coach full access athlete_week_colors" ON "public"."athlete_week_colors" TO "authenticated" USING ("public"."is_coach"()) WITH CHECK ("public"."is_coach"());



CREATE POLICY "Coach full access athletes" ON "public"."athletes" TO "authenticated" USING ("public"."is_coach"()) WITH CHECK ("public"."is_coach"());



CREATE POLICY "Coach full access calendar_workouts" ON "public"."calendar_workouts" TO "authenticated" USING ("public"."is_coach"()) WITH CHECK ("public"."is_coach"());



CREATE POLICY "Coach full access workout_categories" ON "public"."workout_categories" TO "authenticated" USING ("public"."is_coach"()) WITH CHECK ("public"."is_coach"());



CREATE POLICY "Coach full access workout_feedbacks" ON "public"."workout_feedbacks" TO "authenticated" USING ("public"."is_coach"()) WITH CHECK ("public"."is_coach"());



CREATE POLICY "Coach full access workout_library" ON "public"."workout_library" TO "authenticated" USING ("public"."is_coach"()) WITH CHECK ("public"."is_coach"());



CREATE POLICY "Coach full access workout_subcategories" ON "public"."workout_subcategories" TO "authenticated" USING ("public"."is_coach"()) WITH CHECK ("public"."is_coach"());



CREATE POLICY "athlete can read own test history" ON "public"."athlete_test_history" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."athletes"
  WHERE (("athletes"."id" = "athlete_test_history"."athlete_id") AND ("athletes"."user_id" = "auth"."uid"())))));



CREATE POLICY "athlete insert own goal history" ON "public"."athlete_goal_history" FOR INSERT TO "authenticated" WITH CHECK (("athlete_id" IN ( SELECT "athletes"."id"
   FROM "public"."athletes"
  WHERE ("athletes"."user_id" = "auth"."uid"()))));



CREATE POLICY "athlete read own goal history" ON "public"."athlete_goal_history" FOR SELECT TO "authenticated" USING (("athlete_id" IN ( SELECT "athletes"."id"
   FROM "public"."athletes"
  WHERE ("athletes"."user_id" = "auth"."uid"()))));



CREATE POLICY "athlete read own test history" ON "public"."athlete_test_history" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."athletes"
  WHERE (("athletes"."id" = "athlete_test_history"."athlete_id") AND ("athletes"."user_id" = "auth"."uid"())))));



CREATE POLICY "athlete read own week planning" ON "public"."athlete_week_planning" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."athletes"
  WHERE (("athletes"."id" = "athlete_week_planning"."athlete_id") AND ("athletes"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."athlete_goal_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."athlete_group_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."athlete_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."athlete_observations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."athlete_proposals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."athlete_test_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."athlete_week_colors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."athlete_week_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."athlete_week_planning" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."athletes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."calendar_workouts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "coach can manage athlete group members" ON "public"."athlete_group_members" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "coach can manage athlete groups" ON "public"."athlete_groups" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "coach full access goal history" ON "public"."athlete_goal_history" TO "authenticated" USING ((NOT (EXISTS ( SELECT 1
   FROM "public"."athletes"
  WHERE ("athletes"."user_id" = "auth"."uid"()))))) WITH CHECK (true);



CREATE POLICY "coach full access observations" ON "public"."athlete_observations" TO "authenticated" USING ((NOT (EXISTS ( SELECT 1
   FROM "public"."athletes"
  WHERE ("athletes"."user_id" = "auth"."uid"()))))) WITH CHECK ((NOT (EXISTS ( SELECT 1
   FROM "public"."athletes"
  WHERE ("athletes"."user_id" = "auth"."uid"())))));



CREATE POLICY "coach full access test history" ON "public"."athlete_test_history" TO "authenticated" USING ((NOT (EXISTS ( SELECT 1
   FROM "public"."athletes"
  WHERE ("athletes"."user_id" = "auth"."uid"()))))) WITH CHECK ((NOT (EXISTS ( SELECT 1
   FROM "public"."athletes"
  WHERE ("athletes"."user_id" = "auth"."uid"())))));



CREATE POLICY "coach full access week planning" ON "public"."athlete_week_planning" TO "authenticated" USING ((NOT (EXISTS ( SELECT 1
   FROM "public"."athletes"
  WHERE ("athletes"."user_id" = "auth"."uid"()))))) WITH CHECK ((NOT (EXISTS ( SELECT 1
   FROM "public"."athletes"
  WHERE ("athletes"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."week_colors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workout_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workout_feedbacks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workout_library" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workout_proposals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workout_subcategories" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."is_coach"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_coach"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_coach"() TO "service_role";



GRANT ALL ON FUNCTION "public"."link_athlete_invite"("invite_token" "text", "athlete_email" "text", "auth_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."link_athlete_invite"("invite_token" "text", "athlete_email" "text", "auth_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."link_athlete_invite"("invite_token" "text", "athlete_email" "text", "auth_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."link_athlete_invite"("athlete_id" "uuid", "athlete_email" "text", "auth_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."link_athlete_invite"("athlete_id" "uuid", "athlete_email" "text", "auth_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."link_athlete_invite"("athlete_id" "uuid", "athlete_email" "text", "auth_user_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."athlete_goal_history" TO "anon";
GRANT ALL ON TABLE "public"."athlete_goal_history" TO "authenticated";
GRANT ALL ON TABLE "public"."athlete_goal_history" TO "service_role";



GRANT ALL ON TABLE "public"."athlete_group_members" TO "anon";
GRANT ALL ON TABLE "public"."athlete_group_members" TO "authenticated";
GRANT ALL ON TABLE "public"."athlete_group_members" TO "service_role";



GRANT ALL ON TABLE "public"."athlete_groups" TO "anon";
GRANT ALL ON TABLE "public"."athlete_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."athlete_groups" TO "service_role";



GRANT ALL ON TABLE "public"."athlete_observations" TO "anon";
GRANT ALL ON TABLE "public"."athlete_observations" TO "authenticated";
GRANT ALL ON TABLE "public"."athlete_observations" TO "service_role";



GRANT ALL ON TABLE "public"."athlete_proposals" TO "anon";
GRANT ALL ON TABLE "public"."athlete_proposals" TO "authenticated";
GRANT ALL ON TABLE "public"."athlete_proposals" TO "service_role";



GRANT ALL ON TABLE "public"."athlete_test_history" TO "anon";
GRANT ALL ON TABLE "public"."athlete_test_history" TO "authenticated";
GRANT ALL ON TABLE "public"."athlete_test_history" TO "service_role";



GRANT ALL ON TABLE "public"."athlete_week_colors" TO "anon";
GRANT ALL ON TABLE "public"."athlete_week_colors" TO "authenticated";
GRANT ALL ON TABLE "public"."athlete_week_colors" TO "service_role";



GRANT ALL ON TABLE "public"."athlete_week_notes" TO "anon";
GRANT ALL ON TABLE "public"."athlete_week_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."athlete_week_notes" TO "service_role";



GRANT ALL ON TABLE "public"."athlete_week_planning" TO "anon";
GRANT ALL ON TABLE "public"."athlete_week_planning" TO "authenticated";
GRANT ALL ON TABLE "public"."athlete_week_planning" TO "service_role";



GRANT ALL ON TABLE "public"."athletes" TO "anon";
GRANT ALL ON TABLE "public"."athletes" TO "authenticated";
GRANT ALL ON TABLE "public"."athletes" TO "service_role";



GRANT ALL ON TABLE "public"."calendar_workouts" TO "anon";
GRANT ALL ON TABLE "public"."calendar_workouts" TO "authenticated";
GRANT ALL ON TABLE "public"."calendar_workouts" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."week_colors" TO "anon";
GRANT ALL ON TABLE "public"."week_colors" TO "authenticated";
GRANT ALL ON TABLE "public"."week_colors" TO "service_role";



GRANT ALL ON TABLE "public"."workout_categories" TO "anon";
GRANT ALL ON TABLE "public"."workout_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_categories" TO "service_role";



GRANT ALL ON TABLE "public"."workout_feedbacks" TO "anon";
GRANT ALL ON TABLE "public"."workout_feedbacks" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_feedbacks" TO "service_role";



GRANT ALL ON TABLE "public"."workout_library" TO "anon";
GRANT ALL ON TABLE "public"."workout_library" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_library" TO "service_role";



GRANT ALL ON TABLE "public"."workout_proposals" TO "anon";
GRANT ALL ON TABLE "public"."workout_proposals" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_proposals" TO "service_role";



GRANT ALL ON TABLE "public"."workout_subcategories" TO "anon";
GRANT ALL ON TABLE "public"."workout_subcategories" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_subcategories" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







