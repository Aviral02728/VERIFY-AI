import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface VerifyRequest {
  url: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { url }: VerifyRequest = await req.json();

    if (!url || url.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid URL format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    // Extract domain for analysis
    const urlObj = new URL(url);
    const domain = urlObj.hostname;

    // Call Gemini API for URL/domain verification
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are an expert at evaluating website credibility and detecting misinformation sources. Analyze this URL/domain for credibility.

URL: ${url}
Domain: ${domain}

Provide your analysis in this EXACT format:
VERDICT: [TRUSTWORTHY/SUSPICIOUS/UNCERTAIN]
DOMAIN_SCORE: [0-100]
REPUTATION: [EXCELLENT/GOOD/MODERATE/POOR/UNKNOWN]
KNOWN_MISINFORMATION: [YES/NO]
FINDINGS:
- [Finding 1]
- [Finding 2]
- [Finding 3]

Consider factors like domain reputation, known fact-checking sources, news organization credibility, and patterns common in misinformation websites.`
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
    const verdictMatch = responseText.match(/VERDICT:\s*(TRUSTWORTHY|SUSPICIOUS|UNCERTAIN)/i);
    const scoreMatch = responseText.match(/DOMAIN_SCORE:\s*(\d+)/);
    const reputationMatch = responseText.match(/REPUTATION:\s*(EXCELLENT|GOOD|MODERATE|POOR|UNKNOWN)/i);
    const misinfoMatch = responseText.match(/KNOWN_MISINFORMATION:\s*(YES|NO)/i);
    const findingsMatch = responseText.match(/FINDINGS:([\s\S]+)/);

    const verdict = verdictMatch ? verdictMatch[1].toLowerCase() : "uncertain";
    const domainScore = scoreMatch ? parseInt(scoreMatch[1]) : 50;
    const reputation = reputationMatch ? reputationMatch[1] : "UNKNOWN";
    const knownForMisinformation = misinfoMatch ? misinfoMatch[1].toUpperCase() === "YES" : false;
    
    const findings: string[] = [];
    if (findingsMatch) {
      const findingsText = findingsMatch[1];
      const points = findingsText.match(/- (.+)/g);
      if (points) {
        findings.push(...points.map(p => p.replace(/^- /, "").trim()));
      }
    }

    const result = {
      domainCredibility: domainScore,
      contentAnalysis: {
        aiProbability: knownForMisinformation ? 80 : 30,
        credibilityScore: domainScore
      },
      findings: findings.length > 0 ? findings : ["Domain analysis completed"],
      sourceInfo: {
        domain,
        reputation,
        knownForMisinformation
      },
      verdict: verdict === "trustworthy" ? "likely_real" : verdict === "suspicious" ? "likely_fake" : "uncertain"
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in verify-url function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});