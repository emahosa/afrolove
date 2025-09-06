import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const STORAGE_URL = Deno.env.get("SUPABASE_URL") + "/storage/v1";
const SERVICE_KEY = Deno.env.get("SUPABASE_ANON_KEY"); // Using anon key for client-side accessible function

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const formData = await req.formData();
    const videoFile = formData.get("video");

    if (!videoFile || !(videoFile instanceof File)) {
      throw new Error("No video file found in form data");
    }

    const { data, error } = await supabase.storage
      .from("public-assets")
      .upload("hero.mp4", videoFile, {
        cacheControl: "3600",
        upsert: true, // Overwrite if file exists
      });

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ message: "Video uploaded successfully!" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
