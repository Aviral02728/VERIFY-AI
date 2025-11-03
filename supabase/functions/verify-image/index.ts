const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();

    if (!image) {
      return new Response(
        JSON.stringify({ error: "Image is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const prompt = `You are an expert image forensics analyst. Analyze this image and determine if it appears to be authentic or manipulated. 

Provide your analysis in EXACTLY this format:

VERDICT: [AUTHENTIC/MANIPULATED/UNCERTAIN]

CONFIDENCE: [HIGH/MEDIUM/LOW]

EXPLANATION:
[Your detailed explanation of why you reached this verdict]

FINDINGS:
- [First specific finding or red flag]
- [Second specific finding]
- [Additional findings as needed]

Be thorough and look for signs of:
- AI generation artifacts
- Photo manipulation (cloning, warping, filtering)
- Inconsistent lighting or shadows
- Unnatural textures or patterns
- Metadata inconsistencies
- Digital alterations`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: image } }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to analyze image" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const data = await response.json();
    const analysisText = data.choices[0].message.content;

    // Parse the response
    const verdictMatch = analysisText.match(/VERDICT:\s*(\w+)/i);
    const confidenceMatch = analysisText.match(/CONFIDENCE:\s*(\w+)/i);
    const explanationMatch = analysisText.match(/EXPLANATION:\s*([^]*?)(?=FINDINGS:|$)/i);
    const findingsMatch = analysisText.match(/FINDINGS:\s*([^]*?)$/i);

    const verdict = verdictMatch ? verdictMatch[1].toUpperCase() : "UNCERTAIN";
    const confidence = confidenceMatch ? confidenceMatch[1].toUpperCase() : "MEDIUM";
    const explanation = explanationMatch ? explanationMatch[1].trim() : analysisText;

    const findings: string[] = [];
    if (findingsMatch) {
      const findingsText = findingsMatch[1];
      const points = findingsText.match(/- (.+)/g);
      if (points) {
        findings.push(...points.map((p: string) => p.replace(/^- /, "").trim()));
      }
    }

    const result = {
      verdict,
      confidence,
      explanation,
      findings,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in verify-image function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
