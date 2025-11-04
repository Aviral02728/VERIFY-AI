const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Lovable AI for text verification
    const geminiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{
            role: "user",
            content: `You are an expert fact-checker analyzing claims for accuracy. Use Google Search to find current information and fact-checks.

Text: "${content}"

CRITICAL GUIDELINES:
- Use Google Search to find recent information and fact-checks about this claim
- Prioritize fact-checks from reputable sources like Snopes, PolitiFact, Reuters, AP News
- Assess based on your knowledge, search results, and logical reasoning
- Identify factual claims vs opinions
- Look for red flags: sensational language, lack of sources, logical fallacies
- For recent events, use search results to verify current information
- Consider context and potential biases

Format:
VERDICT: [TRUE/FALSE/UNCERTAIN]
CONFIDENCE: [HIGH/MEDIUM/LOW]
EXPLANATION: [Include sources found via search if relevant]
KEY POINTS:
- [Factual assessment with sources]
- [Red flags or verification needs]
- [Additional context]`
          }],
          tools: [{
            google_search_retrieval: {
              dynamic_retrieval_config: {
                mode: "MODE_DYNAMIC",
                dynamic_threshold: 0.3
              }
            }
          }]
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("AI API error:", geminiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Verification failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiResponse.json();
    const responseText = geminiData.choices?.[0]?.message?.content || "";

    console.log("Gemini response:", responseText);

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