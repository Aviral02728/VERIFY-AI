const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyRequest {
  content: string;
  type: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { content, type }: VerifyRequest = await req.json();

    if (!content || content.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Content is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const GOOGLE_SEARCH_API_KEY = Deno.env.get("GOOGLE_SEARCH_API_KEY");
    const GOOGLE_SEARCH_ENGINE_ID = Deno.env.get("GOOGLE_SEARCH_ENGINE_ID");
    
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch Google Custom Search results for verification
    let searchContext = "";
    if (GOOGLE_SEARCH_API_KEY && GOOGLE_SEARCH_ENGINE_ID) {
      try {
        const searchQuery = encodeURIComponent(content.substring(0, 200));
        const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_SEARCH_API_KEY}&cx=${GOOGLE_SEARCH_ENGINE_ID}&q=${searchQuery}`;
        
        const searchResponse = await fetch(searchUrl);
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          if (searchData.items && searchData.items.length > 0) {
            searchContext = "\n\nRECENT SEARCH RESULTS:\n";
            searchData.items.slice(0, 5).forEach((item: any, index: number) => {
              searchContext += `\n${index + 1}. ${item.title}\n`;
              searchContext += `   Source: ${item.link}\n`;
              searchContext += `   Snippet: ${item.snippet}\n`;
            });
          }
        }
      } catch (e) {
        console.error("Google Search API error:", e);
      }
    }

    // Use Lovable AI Gateway (no Gemini billing/quota required)
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI gateway key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt =
      "You are a meticulous fact-checking assistant. " +
      "Return your answer strictly in the requested format. " +
      "If evidence is insufficient, choose UNCERTAIN.";

    const prompt = `Analyze this claim for factual accuracy. Use the search results provided to verify the claim.

Claim: "${content}"
${searchContext}

Provide analysis in this EXACT format:

VERDICT: [TRUE/FALSE/UNCERTAIN]
CONFIDENCE: [HIGH/MEDIUM/LOW]
EXPLANATION: [Your detailed analysis citing specific sources from search results]
KEY POINTS:
- [First key point with source]
- [Second key point with source]
- [Third key point]`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResp.ok) {
      const errorText = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, errorText);

      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please retry in a moment.", providerStatus: 429 }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits and retry.", providerStatus: 402 }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Verification failed", providerStatus: aiResp.status }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResp.json();
    console.log("Full AI response:", JSON.stringify(aiData, null, 2));

    const responseText: string = aiData?.choices?.[0]?.message?.content ?? "";
    console.log("Extracted response text:", responseText);

    // Parse the response
    const verdictMatch = responseText.match(/VERDICT:\s*(TRUE|FALSE|UNCERTAIN)/i);
    const confidenceMatch = responseText.match(/CONFIDENCE:\s*(HIGH|MEDIUM|LOW)/i);
    const explanationMatch = responseText.match(/EXPLANATION:\s*(.+?)(?=KEY POINTS:|$)/s);
    const keyPointsMatch = responseText.match(/KEY POINTS:([\s\S]+)/);

    const verdict = verdictMatch ? verdictMatch[1].toUpperCase() : "UNCERTAIN";
    const confidence = confidenceMatch ? confidenceMatch[1].toUpperCase() : "MEDIUM";
    const explanation = explanationMatch ? explanationMatch[1].trim() : "Analysis completed.";
    
    const keyPoints: string[] = [];
    if (keyPointsMatch) {
      const pointsText = keyPointsMatch[1];
      const points = pointsText.match(/- (.+)/g);
      if (points) {
        keyPoints.push(...points.map((p: string) => p.replace(/^- /, "").trim()));
      }
    }

    const result = {
      verdict,
      confidence,
      explanation,
      keyPoints: keyPoints.length > 0 ? keyPoints : ["Analysis completed based on available information"],
      timestamp: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in verify-text function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});