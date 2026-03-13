import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { job_id, cv_storage_path } = await req.json();
    if (!job_id || !cv_storage_path) {
      return new Response(JSON.stringify({ error: "Missing job_id or cv_storage_path" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const geminiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      db: { schema: "hr" },
    });

    const supabaseStorage = createClient(supabaseUrl, serviceRoleKey);

    // 1. Get job description
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("title, description, requirements, responsibilities")
      .eq("id", job_id)
      .single();

    if (jobError || !job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Download CV from storage
    const { data: fileData, error: fileError } = await supabaseStorage.storage
      .from("hr-cv")
      .download(cv_storage_path);

    if (fileError || !fileData) {
      return new Response(JSON.stringify({ error: "CV file not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert to base64 for Gemini (chunk to avoid stack overflow)
    const arrayBuffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    const base64 = btoa(binary);

    // 3. Build job context
    const jobContext = [
      `Stanowisko: ${job.title}`,
      job.description ? `Opis: ${job.description}` : "",
      job.requirements?.length ? `Wymagania: ${job.requirements.join(", ")}` : "",
      job.responsibilities?.length ? `Obowiązki: ${job.responsibilities.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    // 4. Call Gemini API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: "application/pdf",
                  data: base64,
                },
              },
              {
                text: `Przeanalizuj to CV kandydata w kontekście poniższego stanowiska i zwróć dane w formacie JSON (bez markdown, sam obiekt JSON).

${jobContext}

Zwróć DOKŁADNIE taki JSON:
{
  "first_name": "imię kandydata",
  "last_name": "nazwisko kandydata",
  "email": "email lub null",
  "phone": "telefon lub null",
  "ai_summary": "2-3 zdania podsumowania kluczowych kompetencji kandydata po polsku",
  "ai_rating": liczba od 0 do 100 oznaczająca dopasowanie do stanowiska
}

ai_rating powinien uwzględniać: dopasowanie umiejętności, doświadczenie, wykształcenie i ogólne wrażenie z CV w kontekście wymagań stanowiska.`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error("Gemini error:", errText);
      return new Response(JSON.stringify({ error: "AI processing failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiData = await geminiResponse.json();
    const rawText =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Parse JSON from response (strip markdown if present)
    let parsed;
    try {
      const jsonStr = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse Gemini response:", rawText);
      return new Response(JSON.stringify({ error: "Failed to parse AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Get public URL for CV
    const { data: publicUrlData } = supabaseStorage.storage
      .from("hr-cv")
      .getPublicUrl(cv_storage_path);

    // 6. Insert application record
    const { data: appData, error: appError } = await supabase
      .from("applications")
      .insert({
        job_id,
        first_name: parsed.first_name || "Nieznany",
        last_name: parsed.last_name || "",
        email: parsed.email || null,
        phone: parsed.phone || null,
        ai_summary: parsed.ai_summary || null,
        ai_rating: Math.min(100, Math.max(0, parseInt(parsed.ai_rating) || 0)),
        cv_url: publicUrlData?.publicUrl || null,
        status: "new",
      })
      .select()
      .single();

    if (appError) {
      console.error("Insert error:", appError);
      return new Response(JSON.stringify({ error: "Failed to create application" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, application: appData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("parse-cv error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
