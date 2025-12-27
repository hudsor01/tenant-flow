-- User tour progress tracking

CREATE TABLE IF NOT EXISTS "public"."user_tour_progress" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "tour_key" "text" NOT NULL,
    "status" "text" DEFAULT 'not_started'::"text" NOT NULL,
    "current_step" integer DEFAULT 0,
    "completed_at" timestamp with time zone,
    "skipped_at" timestamp with time zone,
    "last_seen_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_tour_progress_status_check" CHECK (("status" = ANY (ARRAY['not_started'::"text", 'in_progress'::"text", 'completed'::"text", 'skipped'::"text"]))),
    CONSTRAINT "user_tour_progress_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."user_tour_progress" OWNER TO "postgres";

ALTER TABLE ONLY "public"."user_tour_progress"
    ADD CONSTRAINT "user_tour_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "user_tour_progress_user_id_tour_key_key" ON "public"."user_tour_progress" USING "btree" ("user_id", "tour_key");
CREATE INDEX IF NOT EXISTS "idx_user_tour_progress_user_id" ON "public"."user_tour_progress" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_tour_progress_status" ON "public"."user_tour_progress" USING "btree" ("status");

ALTER TABLE "public"."user_tour_progress" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_tour_progress_select_own" ON "public"."user_tour_progress"
  FOR SELECT TO "authenticated"
  USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));

CREATE POLICY "user_tour_progress_insert_own" ON "public"."user_tour_progress"
  FOR INSERT TO "authenticated"
  WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));

CREATE POLICY "user_tour_progress_update_own" ON "public"."user_tour_progress"
  FOR UPDATE TO "authenticated"
  USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")))
  WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));

CREATE POLICY "user_tour_progress_delete_own" ON "public"."user_tour_progress"
  FOR DELETE TO "authenticated"
  USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));

CREATE POLICY "user_tour_progress_service_role" ON "public"."user_tour_progress"
  TO "service_role" USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."user_tour_progress" TO "authenticated";
GRANT SELECT ON TABLE "public"."user_tour_progress" TO "authenticator";
