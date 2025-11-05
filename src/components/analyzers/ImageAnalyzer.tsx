import { useState } from 'react';
import { Search, ThumbsUp, ThumbsDown, HelpCircle, Loader, Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface AnalysisResult {
  verdict: 'AUTHENTIC' | 'MANIPULATED' | 'UNCERTAIN';
  explanation: string;
  findings: string[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  timestamp: string;
}

export default function ImageAnalyzer() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const { toast } = useToast();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Error",
          description: 'Please upload a valid image file',
          variant: "destructive",
        });
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setResult(null);
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview('');
    setResult(null);
  };

  const analyzeImage = async () => {
    if (!imageFile) {
      toast({
        title: "Error",
        description: 'Please upload an image to analyze',
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result as string;

        const { data, error } = await supabase.functions.invoke('verify-image', {
          body: { image: base64Image },
        });

        if (error) throw error;

        setResult(data);

        if (userData.user) {
          await supabase.from('analysis_history').insert({
            user_id: userData.user.id,
            content_type: 'image',
            content: `Image analysis - ${imageFile.name}`,
            result: data,
          });
        }

        setLoading(false);
      };
      reader.readAsDataURL(imageFile);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || 'Failed to analyze image',
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const getVerdictIcon = () => {
    if (!result) return null;
    switch (result.verdict) {
      case 'AUTHENTIC':
        return <ThumbsUp className="h-12 w-12 text-success" />;
      case 'MANIPULATED':
        return <ThumbsDown className="h-12 w-12 text-destructive" />;
      default:
        return <HelpCircle className="h-12 w-12 text-warning" />;
    }
  };

  const getVerdictColor = () => {
    if (!result) return '';
    switch (result.verdict) {
      case 'AUTHENTIC':
        return 'from-success/20 to-success/5 border-success/50';
      case 'MANIPULATED':
        return 'from-destructive/20 to-destructive/5 border-destructive/50';
      default:
        return 'from-warning/20 to-warning/5 border-warning/50';
    }
  };

  const getVerdictText = () => {
    if (!result) return '';
    return result.verdict;
  };

  return (
    <div className="p-8 animate-fade-in">
      <h2 className="text-2xl font-bold mb-2 slide-up">Image Verification</h2>
      <p className="text-muted-foreground mb-6 fade-in-slow">Upload an image to check for manipulation or authenticity</p>

      <div className="space-y-6">
        <div className="animate-slide-in-from-left">
          <label className="block text-sm font-medium mb-2">
            Upload Image
          </label>
          
          {!imagePreview ? (
            <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-all hover:bg-accent/5 card-hover group relative overflow-hidden">
              <div className="shimmer absolute inset-0 opacity-0 group-hover:opacity-100" />
              <div className="flex flex-col items-center justify-center pt-5 pb-6 relative z-10">
                <Upload className="h-12 w-12 mb-3 text-muted-foreground group-hover:scale-110 transition-transform float" />
                <p className="mb-2 text-sm text-muted-foreground">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">PNG, JPG, JPEG, WEBP (MAX. 10MB)</p>
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleImageChange}
              />
            </label>
          ) : (
            <div className="relative rounded-xl overflow-hidden border-2 border-border animate-scale-in glow-effect">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-auto max-h-96 object-contain bg-muted"
              />
              <Button
                onClick={clearImage}
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 glow-effect hover-scale"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <Button
          onClick={analyzeImage}
          disabled={loading || !imageFile}
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
              Verify Image
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
              <h4 className="font-semibold mb-3 text-lg">Analysis</h4>
              <p className="leading-relaxed">{result.explanation}</p>
            </div>

            {result.findings.length > 0 && (
              <div className="bg-card rounded-xl p-6 border border-border glass-effect animate-fade-in">
                <h4 className="font-semibold mb-3 text-lg">Findings</h4>
                <ul className="space-y-2">
                  {result.findings.map((finding, index) => (
                    <li key={index} className="flex items-start space-x-2 hover-scale" style={{animationDelay: `${index * 0.1}s`}}>
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
