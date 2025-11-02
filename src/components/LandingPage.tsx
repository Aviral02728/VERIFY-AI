import { useState } from 'react';
import { Shield, CheckCircle, Zap, FileText, Image, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Auth from './Auth';

export default function LandingPage() {
  const [showAuth, setShowAuth] = useState(false);

  if (showAuth) {
    return <Auth onBack={() => setShowAuth(false)} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card/50 backdrop-blur-sm border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              VerifyAI
            </span>
          </div>
          <Button onClick={() => setShowAuth(true)}>
            Get Started
          </Button>
        </div>
      </nav>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="inline-flex items-center space-x-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-6 border border-primary/20">
          <Zap className="h-4 w-4" />
          <span>Powered by Google Gemini AI</span>
        </div>

        <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
          Detect Fake News &<br />
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            AI-Generated Content
          </span>
        </h1>

        <p className="text-xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
          Verify articles, images, and claims with advanced AI analysis. Know what's real, what's fake, and what's generated.
        </p>

        <Button
          onClick={() => setShowAuth(true)}
          size="lg"
          className="glow-primary"
        >
          Start Verifying Now
        </Button>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-card rounded-2xl p-8 border border-border hover:border-primary/50 transition-all">
            <div className="h-14 w-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
              <FileText className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-4">Text Verification</h3>
            <p className="text-muted-foreground leading-relaxed">
              Analyze articles, news, and claims for authenticity. Our AI checks facts and detects misinformation patterns.
            </p>
          </div>

          <div className="bg-card rounded-2xl p-8 border border-border hover:border-accent/50 transition-all">
            <div className="h-14 w-14 bg-accent/10 rounded-xl flex items-center justify-center mb-6">
              <Image className="h-7 w-7 text-accent" />
            </div>
            <h3 className="text-2xl font-bold mb-4">Image Detection</h3>
            <p className="text-muted-foreground leading-relaxed">
              Identify deepfakes, manipulated photos, and AI-generated imagery with advanced computer vision analysis.
            </p>
          </div>

          <div className="bg-card rounded-2xl p-8 border border-border hover:border-success/50 transition-all">
            <div className="h-14 w-14 bg-success/10 rounded-xl flex items-center justify-center mb-6">
              <LinkIcon className="h-7 w-7 text-success" />
            </div>
            <h3 className="text-2xl font-bold mb-4">URL Verification</h3>
            <p className="text-muted-foreground leading-relaxed">
              Check source credibility and domain reputation to identify unreliable news websites.
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-3xl p-12 border border-primary/20">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-center">
            Why VerifyAI?
          </h2>
          <div className="grid md:grid-cols-2 gap-6 mt-8">
            {[
              'AI-powered fact checking',
              'Real-time verification',
              'Multiple content types',
              'Detailed analysis reports',
              'History tracking',
              'Source credibility scoring'
            ].map((feature, index) => (
              <div key={index} className="flex items-center space-x-3">
                <CheckCircle className="h-6 w-6 text-success flex-shrink-0" />
                <span className="text-lg">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}