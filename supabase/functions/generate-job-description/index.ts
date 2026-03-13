import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth check
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }

  const anonClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const { title, department, draft_description, draft_responsibilities, draft_requirements } = await req.json();

    if (!title) {
      return json({ error: "Title is required" }, 400);
    }

    const geminiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY")!;

    const userInput = [
      `Stanowisko: ${title}`,
      department ? `Dział: ${department}` : "",
      draft_description ? `Notatki do opisu: ${draft_description}` : "",
      draft_responsibilities ? `Szkic obowiązków: ${draft_responsibilities}` : "",
      draft_requirements ? `Szkic wymagań: ${draft_requirements}` : "",
    ].filter(Boolean).join("\n");

    const systemPrompt = `Jesteś asystentem HR firmy MMorska — firmy z branży jachtowej i konstrukcji stalowych z siedzibą w Gdańsku. 
Firma ceni sobie:
- przyjazne podejście do ludzi i życia
- pracę w małym, zgranym zespole
- profesjonalizm i pasję do morza
- otwartość na nowe pomysły i rozwój

Na podstawie podanego stanowiska i ewentualnych notatek wygeneruj profesjonalne, atrakcyjne ogłoszenie rekrutacyjne po polsku.

Zwróć DOKŁADNIE taki JSON (bez markdown, sam obiekt JSON):
{
  "description": "opis stanowiska — 3-5 zdań, zachęcający ton, nawiązanie do specyfiki MMorskiej",
  "responsibilities": ["obowiązek 1", "obowiązek 2", ...],
  "requirements": ["wymaganie 1", "wymaganie 2", ...]
}

Wygeneruj 5-8 obowiązków i 5-8 wymagań. Bądź konkretny i dostosuj treść do branży jachtowej/konstrukcji stalowych. Uwzględnij miękkie kompetencje jak umiejętność pracy w małym zespole, komunikatywność, pozytywne nastawienie.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemPrompt + "\n\n" + userInput },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error("Gemini error:", errText);
      return json({ error: "AI processing failed" }, 500);
    }

    const geminiData = await geminiResponse.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let parsed;
    try {
      const jsonStr = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse Gemini response:", rawText);
      return json({ error: "Failed to parse AI response" }, 500);
    }

    return json({
      description: parsed.description || "",
      responsibilities: Array.isArray(parsed.responsibilities) ? parsed.responsibilities : [],
      requirements: Array.isArray(parsed.requirements) ? parsed.requirements : [],
    });
  } catch (err: any) {
    console.error("generate-job-description error:", err);
    return json({ error: err.message || "Unknown error" }, 500);
  }
});
