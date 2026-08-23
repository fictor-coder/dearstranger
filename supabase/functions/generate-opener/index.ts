// calls claude api to generate the openers, key stays server side
// if key isnt set yet or the call fails, frontend just falls back to the template version

const SYSTEM_PROMPT = `You are the writing engine behind "Pehla Message," a tool that helps someone in India craft a warm, respectful first message to a person they are interested in getting to know. You are given details about the sender, the recipient, and the context. Generate exactly 3 distinct opening messages the sender could actually send.

Rules:
- Keep every opener respectful, warm, and non-presumptuous. Never write anything that negs the other person, assumes attention is owed, or pressures them.
- Ground each opener in the specific details given (how they know each other, something noticed, interests) rather than generic pickup lines. If little detail is given, keep it simple, friendly and low-pressure instead of inventing false specifics.
- Match the requested tone and the chosen platform (a DM can be a touch more casual than an in-person opener).
- Match the stated intent: keep it clearly platonic if they said they just want to be friends, and only warmer/flirtier if they said they are interested romantically.
- Use conversation_stage to calibrate familiarity: if it is a first message to a stranger, keep it low-pressure with a light context hook; if they have talked a little already, you can be more casual and reference that; if they are already friends or besties, skip introductions entirely and write like a natural continuation of an existing conversation, matching the chosen tone.
- Write entirely in Hinglish: Hindi words spelled in Roman script, mixed naturally with English, exactly the way young Indians actually text day to day. Do not use Devanagari script. Do not write in pure formal English or pure formal Hindi.
- Each opener should be 1-3 sentences, short enough someone would actually send it as a text.
- Respond with ONLY valid JSON, no markdown code fences, no preamble, no explanation outside the JSON, in exactly this shape:
{"openers":[{"style":"2-4 word label for this style","message":"the opener text","why":"one short sentence on why it could work"}]}
The openers array must contain exactly 3 items.`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const form = await req.json();
    const userPrompt = "Here are the details for the opener:\n" + JSON.stringify(
      {
        your_age: form.yourAge || "not given",
        your_vibe: (form.yourVibe || []).join(", ") || "not given",
        their_name: form.theirName || "not given",
        their_age: form.theirAge || "not given",
        how_they_know_them: form.knowThemVia || "not given",
        something_noticed: form.noticedSomething || "not given",
        how_well_they_know_them: form.howWellKnown || "not given",
        platform: form.platform,
        intent: form.intent,
        conversation_stage: form.stage,
        tone: form.tone,
        output_language: "hinglish",
      },
      null,
      2,
    );

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    const anthropicJson = await anthropicRes.json();
    if (!anthropicRes.ok) {
      const message = anthropicJson?.error?.message || `Anthropic API error (${anthropicRes.status})`;
      return new Response(JSON.stringify({ error: message }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const textBlock = (anthropicJson.content || []).find((b: any) => b.type === "text");
    const raw = (textBlock?.text || "").replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(raw);
    if (!parsed.openers || !parsed.openers.length) throw new Error("empty response from model");

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
