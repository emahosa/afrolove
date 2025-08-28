import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  console.error("Missing Supabase environment variables.");
  Deno.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

serve(async (_req) => {
  try {
    const now = new Date().toISOString();

    // End active contests that have passed their end date
    const { data: activeContests, error: activeError } = await supabase
      .from("contests")
      .select("id")
      .eq("status", "active")
      .lt("end_date", now);

    if (activeError) throw activeError;

    if (activeContests.length > 0) {
      const idsToEnd = activeContests.map((c) => c.id);
      await supabase
        .from("contests")
        .update({ status: "completed" })
        .in("id", idsToEnd);
      console.log(`Ended ${idsToEnd.length} contests.`);
    }

    // Start upcoming contests that have passed their start date
    const { data: upcomingContests, error: upcomingError } = await supabase
      .from("contests")
      .select("id")
      .eq("status", "upcoming")
      .lt("start_date", now);

    if (upcomingError) throw upcomingError;

    if (upcomingContests.length > 0) {
      const idsToStart = upcomingContests.map((c) => c.id);
      await supabase
        .from("contests")
        .update({ status: "active" })
        .in("id", idsToStart);
      console.log(`Started ${idsToStart.length} contests.`);
    }

    return new Response("Contest statuses updated successfully.", {
      status: 200,
    });
  } catch (error) {
    console.error("Error updating contest statuses:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});
