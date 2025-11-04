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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract domain for analysis
    const urlObj = new URL(url);
    const domain = urlObj.hostname;

    // Fetch actual webpage content
    let pageContent = "";
    try {
      const pageResponse = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsVerifier/1.0)' }
      });
      
      if (pageResponse.ok) {
        const html = await pageResponse.text();
        pageContent = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 8000);
      }
    } catch (e) {
      console.error("Failed to fetch page:", e);
    }

    // Call Lovable AI for verification
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
            content: `You are a fact-checking expert analyzing news for credibility and accuracy. Use Google Search to find current information and fact-checks about this article.

URL: ${url}
Domain: ${domain}
${pageContent ? `Article Content:\n${pageContent.substring(0, 4000)}` : 'Content unavailable'}

IMPORTANT:
- Use Google Search to find recent information and fact-checks about claims in this article
- Prioritize fact-checks from reputable sources like Snopes, PolitiFact, Reuters, AP News
- Analyze the source's reputation and journalistic standards
- Evaluate content for bias, sensationalism, or misinformation patterns
- For recent events, use search results to verify current information
- Consider writing quality, evidence citations, and fact-checkability
- Check if the domain or specific claims have been flagged by fact-checkers

Format:
VERDICT: [TRUSTWORTHY/SUSPICIOUS/UNCERTAIN]
DOMAIN_SCORE: [0-100]
REPUTATION: [EXCELLENT/GOOD/MODERATE/POOR/UNKNOWN]
KNOWN_MISINFORMATION: [YES/NO]
FINDINGS:
- [Finding about source/content quality with sources]
- [Finding about verifiability with search results]
- [Additional findings]`
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
        findings.push(...points.map((p: string) => p.replace(/^- /, "").trim()));
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