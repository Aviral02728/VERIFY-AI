import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Gemini API for text verification
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are an expert fact-checker and misinformation detector. Analyze the following text and determine if it is TRUE, FALSE, or UNCERTAIN.

Text to verify: "${content}"

Provide your analysis in this EXACT format:
VERDICT: [TRUE/FALSE/UNCERTAIN]
CONFIDENCE: [HIGH/MEDIUM/LOW]
EXPLANATION: [2-3 sentence explanation]
KEY POINTS:
- [Point 1]
- [Point 2]
- [Point 3]

Be thorough, objective, and cite reasoning for your verdict.`
            }]
          }]
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", geminiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Verification failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiResponse.json();
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

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
        keyPoints.push(...points.map(p => p.replace(/^- /, "").trim()));
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