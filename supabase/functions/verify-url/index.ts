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
    const GOOGLE_SEARCH_API_KEY = Deno.env.get("GOOGLE_SEARCH_API_KEY");
    const GOOGLE_SEARCH_ENGINE_ID = Deno.env.get("GOOGLE_SEARCH_ENGINE_ID");
    
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

    // Fetch Google Custom Search results about the URL/domain
    let searchContext = "";
    if (GOOGLE_SEARCH_API_KEY && GOOGLE_SEARCH_ENGINE_ID && pageContent) {
      try {
        const searchQuery = encodeURIComponent(`${domain} ${pageContent.substring(0, 100)} fact check`);
        const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_SEARCH_API_KEY}&cx=${GOOGLE_SEARCH_ENGINE_ID}&q=${searchQuery}`;
        
        const searchResponse = await fetch(searchUrl);
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          if (searchData.items && searchData.items.length > 0) {
            searchContext = "\n\nRELATED SEARCH RESULTS:\n";
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

    // Call native Gemini API with Google Search grounding
    const geminiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Analyze this news article for credibility and accuracy. Use the search results to verify claims and check reputation.

URL: ${url}
Domain: ${domain}
${pageContent ? `Content:\n${pageContent.substring(0, 4000)}` : 'Content unavailable'}
${searchContext}

Based on the search results and your knowledge, provide analysis in this EXACT format:

VERDICT: [TRUSTWORTHY/SUSPICIOUS/UNCERTAIN]
DOMAIN_SCORE: [0-100]
REPUTATION: [EXCELLENT/GOOD/MODERATE/POOR/UNKNOWN]
KNOWN_MISINFORMATION: [YES/NO]
FINDINGS:
- [First finding citing specific sources]
- [Second finding with verification]
- [Third finding]`
            }]
          }],
          tools: [{
            googleSearch: {}
          }],
          generationConfig: {
            temperature: 0.7
          }
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", geminiResponse.status, errorText);

      if (geminiResponse.status === 429) {
        return new Response(
          JSON.stringify({
            error: "AI quota exceeded. Please retry later or update the API key / billing.",
            providerStatus: 429,
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          error: "Verification failed",
          providerStatus: geminiResponse.status,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiResponse.json();
    console.log("Full Gemini response:", JSON.stringify(geminiData, null, 2));
    
    // Extract text from candidates
    let responseText = "";
    if (geminiData.candidates?.[0]?.content?.parts) {
      responseText = geminiData.candidates[0].content.parts
        .filter((part: any) => part.text)
        .map((part: any) => part.text)
        .join("\n");
    }

    console.log("Extracted response text:", responseText);

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