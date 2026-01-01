import { useState } from 'react';
import { Search, ThumbsUp, ThumbsDown, HelpCircle, Loader } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface AnalysisResult {
  verdict: 'TRUE' | 'FALSE' | 'UNCERTAIN';
  explanation: string;
  keyPoints: string[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  timestamp: string;
}

export default function TextAnalyzer() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const { toast } = useToast();

  const analyzeText = async () => {
    if (!text.trim()) {
      toast({
        title: "Error",
        description: 'Please enter some text to analyze',
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase.functions.invoke('verify-text', {
        body: { content: text, type: 'text' },
      });

      if (error) {
        let message = error.message || 'Failed to analyze text';
        const anyErr: any = error;
        // supabase-js Functions errors often include a Response in `context`
        if (anyErr?.context instanceof Response) {
          try {
            const body = await anyErr.context.json();
            if (body?.error) message = body.error;
          } catch {
            // ignore
          }
        }
        throw new Error(message);
      }

      setResult(data);
      setText(''); // Clear input after successful analysis

      if (userData.user) {
        await supabase.from('analysis_history').insert({
          user_id: userData.user.id,
          content_type: 'text',
          content: text.substring(0, 500),
          result: data,
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || 'Failed to analyze text',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getVerdictIcon = () => {
    if (!result) return null;
    switch (result.verdict) {
      case 'TRUE':
        return <ThumbsUp className="h-12 w-12 text-success" />;
      case 'FALSE':
        return <ThumbsDown className="h-12 w-12 text-destructive" />;
      default:
        return <HelpCircle className="h-12 w-12 text-warning" />;
    }
  };

  const getVerdictColor = () => {
    if (!result) return '';
    switch (result.verdict) {
      case 'TRUE':
        return 'from-success/20 to-success/5 border-success/50';
      case 'FALSE':
        return 'from-destructive/20 to-destructive/5 border-destructive/50';
      default:
        return 'from-warning/20 to-warning/5 border-warning/50';
    }
  };

  const getVerdictText = () => {
    if (!result) return '';
    return result.verdict === 'TRUE' ? 'REAL' : result.verdict === 'FALSE' ? 'FAKE' : 'UNCERTAIN';
  };

  return (
    <div className="p-8 animate-fade-in">
      <h2 className="text-2xl font-bold mb-2 slide-up">Text Verification</h2>
      <p className="text-muted-foreground mb-6 fade-in-slow">Paste text or an article to analyze for authenticity and detect potential misinformation</p>

      <div className="space-y-6">
        <div className="animate-slide-in-from-left">
          <label className="block text-sm font-medium mb-2">
            Enter Text to Analyze
          </label>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your text here..."
            className="min-h-[200px] glass-effect"
          />
        </div>

        <Button
          onClick={analyzeText}
          disabled={loading || !text.trim()}
          className="w-full glow-effect hover-scale group relative overflow-hidden"
          size="lg"
        >
          {loading ? (
            <>
              <Loader className="h-5 w-5 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Search className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
              Analyze Text
            </>
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-20 transition-opacity" />
        </Button>

        {result && (
          <div className={`bg-gradient-to-br ${getVerdictColor()} rounded-2xl p-8 border-2 animate-scale-in`}>
            <div className="flex items-center justify-center mb-6 bounce-in">
              {getVerdictIcon()}
            </div>

            <div className="text-center mb-6 slide-up">
              <h3 className="text-4xl font-bold mb-2 gradient-text">{getVerdictText()}</h3>
              <p className="text-lg text-muted-foreground">
                Confidence: {result.confidence}
              </p>
            </div>

            <div className="bg-card rounded-xl p-6 mb-4 border border-border glass-effect animate-slide-in-from-bottom" style={{animationDelay: '0.2s', opacity: 0, animationFillMode: 'forwards'}}>
              <h4 className="font-semibold mb-3 text-lg">Explanation</h4>
              <p className="leading-relaxed">{result.explanation}</p>
            </div>

            {result.keyPoints.length > 0 && (
              <div className="bg-card rounded-xl p-6 border border-border glass-effect animate-fade-in">
                <h4 className="font-semibold mb-3 text-lg">Key Points</h4>
                <ul className="space-y-2">
                  {result.keyPoints.map((point, index) => (
                    <li key={index} className="flex items-start space-x-2 hover-scale" style={{animationDelay: `${index * 0.1}s`}}>
                      <span className="text-primary mt-1">•</span>
                      <span className="flex-1">{point}</span>
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
