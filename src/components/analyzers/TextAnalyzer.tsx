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

      if (error) throw error;

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
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-2">Text Verification</h2>
      <p className="text-muted-foreground mb-6">Paste any article, claim, or text to verify its authenticity with AI</p>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            Enter Text to Verify
          </label>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="h-64 resize-none"
            placeholder="Paste the text you want to verify here..."
          />
        </div>

        <Button
          onClick={analyzeText}
          disabled={loading || !text.trim()}
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
              Verify Text
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
              <p className="text-lg text-muted-foreground">
                Confidence: {result.confidence}
              </p>
            </div>

            <div className="bg-card rounded-xl p-6 mb-4 border border-border">
              <h4 className="font-semibold mb-3 text-lg">Analysis</h4>
              <p className="leading-relaxed">{result.explanation}</p>
            </div>

            {result.keyPoints.length > 0 && (
              <div className="bg-card rounded-xl p-6 border border-border">
                <h4 className="font-semibold mb-3 text-lg">Key Points</h4>
                <ul className="space-y-2">
                  {result.keyPoints.map((point, index) => (
                    <li key={index} className="flex items-start space-x-2">
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
