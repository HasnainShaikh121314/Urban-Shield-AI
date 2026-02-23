import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Flow, the official AI assistant for UrbanShield AI — a flood prediction and early warning system.

ROLE: You provide flood safety information EXCLUSIVELY from official sources:
- FEMA (Federal Emergency Management Agency)
- NOAA (National Oceanic and Atmospheric Administration)
- CDC (Centers for Disease Control and Prevention)
- Ready.gov (official U.S. preparedness resource)
- USGS (U.S. Geological Survey)
- NWS (National Weather Service)
- Local emergency management agencies

RULES:
1. ONLY cite official government sources. Never give generic or unverified advice.
2. Always include which source your information comes from using brackets like [FEMA] or [NOAA].
3. If you don't know or the question is outside flood/weather/emergency topics, say so clearly and redirect.
4. Be concise but thorough. Use bullet points and headers for readability.
5. When discussing risk levels, use this official classification:
   - Low (0-30%): Minimal flood risk
   - Moderate (31-60%): Some flood risk, stay informed
   - High (61-85%): Significant flood risk, prepare now
   - Severe (86-100%): Extreme flood risk, take immediate action
6. For evacuation or emergency advice, always recommend following local authorities first.
7. Format responses with markdown for readability.
8. Keep answers focused and actionable.

You will receive context about which page the user is on and relevant data. Use this to provide contextual answers.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, pageContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build context-aware system message
    let contextAddition = "";
    if (pageContext) {
      contextAddition = `\n\nCURRENT CONTEXT:\n- Page: ${pageContext.page}\n`;
      if (pageContext.riskLevel) contextAddition += `- Current risk level: ${pageContext.riskLevel}\n`;
      if (pageContext.rainfall) contextAddition += `- Current rainfall: ${pageContext.rainfall}mm\n`;
      if (pageContext.location) contextAddition += `- Location: ${pageContext.location}\n`;
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT + contextAddition },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI service temporarily unavailable." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("flow-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
