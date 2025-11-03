import { useState } from 'react';
import { Search, ExternalLink, Shield, AlertTriangle, HelpCircle, Loader } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface AnalysisResult {
  domainCredibility: number;
  contentAnalysis: {
    aiProbability: number;
    credibilityScore: number;
  };
  findings: string[];
  sourceInfo: {
    domain: string;
    reputation: string;
    knownForMisinformation: boolean;
  };
  verdict: 'likely_fake' | 'uncertain' | 'likely_real';
}

export default function UrlAnalyzer() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const { toast } = useToast();

  const analyzeUrl = async () => {
    if (!url.trim()) {
      toast({
        title: "Error",
        description: 'Please enter a URL to analyze',
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke('verify-url', {
        body: { url },
      });

      if (error) throw error;

      setResult(data);
      setUrl(''); // Clear input after successful analysis

      if (userData.user) {
        await supabase.from('analysis_history').insert({
          user_id: userData.user.id,
          content_type: 'url',
          content: url,
          result: data,
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || 'Failed to analyze URL',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getVerdictIcon = () => {
    if (!result) return null;
    switch (result.verdict) {
      case 'likely_real':
        return <Shield className="h-12 w-12 text-success" />;
      case 'likely_fake':
        return <AlertTriangle className="h-12 w-12 text-destructive" />;
      default:
        return <HelpCircle className="h-12 w-12 text-warning" />;
    }
  };

  const getVerdictColor = () => {
    if (!result) return '';
    switch (result.verdict) {
      case 'likely_real':
        return 'from-success/20 to-success/5 border-success/50';
      case 'likely_fake':
        return 'from-destructive/20 to-destructive/5 border-destructive/50';
      default:
        return 'from-warning/20 to-warning/5 border-warning/50';
    }
  };

  const getVerdictText = () => {
    if (!result) return '';
    return result.verdict === 'likely_real' ? 'TRUSTWORTHY' : result.verdict === 'likely_fake' ? 'SUSPICIOUS' : 'UNCERTAIN';
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-2">URL Verification</h2>
      <p className="text-muted-foreground mb-6">Enter a URL to analyze the webpage and check source credibility</p>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            Enter URL to Analyze
          </label>
          <div className="flex gap-3">
            <Input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/article"
              className="flex-1"
            />
          </div>
        </div>

        <Button
          onClick={analyzeUrl}
          disabled={loading || !url.trim()}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader className="h-5 w-5 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Search className="h-5 w-5 mr-2" />
              Verify URL
            </>
          )}
        </Button>

        {result && (
          <div className={`bg-gradient-to-br ${getVerdictColor()} rounded-2xl p-8 border-2 animate-in fade-in-50 duration-500`}>
            <div className="flex items-center justify-center mb-6">
              {getVerdictIcon()}
            </div>

            <div className="text-center mb-6">
              <h3 className="text-4xl font-bold mb-2">{getVerdictText()}</h3>
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <ExternalLink className="h-4 w-4" />
                <span className="text-sm">{result.sourceInfo.domain}</span>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="bg-card rounded-xl p-4 border border-border">
                <div className="text-sm text-muted-foreground mb-1">Domain Score</div>
                <div className="text-3xl font-bold">{result.domainCredibility}/100</div>
              </div>
              <div className="bg-card rounded-xl p-4 border border-border">
                <div className="text-sm text-muted-foreground mb-1">Reputation</div>
                <div className="text-xl font-semibold">{result.sourceInfo.reputation}</div>
              </div>
            </div>

            {result.sourceInfo.knownForMisinformation && (
              <div className="bg-destructive/10 border border-destructive/50 rounded-xl p-4 mb-4">
                <p className="text-destructive font-medium">⚠️ This source is known for spreading misinformation</p>
              </div>
            )}

            {result.findings.length > 0 && (
              <div className="bg-card rounded-xl p-6 border border-border">
                <h4 className="font-semibold mb-3 text-lg">Findings</h4>
                <ul className="space-y-2">
                  {result.findings.map((finding, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-primary mt-1">•</span>
                      <span className="flex-1">{finding}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
