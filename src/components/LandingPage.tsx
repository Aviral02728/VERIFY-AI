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

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        
        <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight animate-slide-in-from-bottom">
          Detect Fake News &<br />
          <span className="gradient-text">
            AI-Generated Content
          </span>
        </h1>

        <p className="text-xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed animate-fade-in" style={{animationDelay: '0.2s', opacity: 0, animationFillMode: 'forwards'}}>
          Verify articles, images, and claims with advanced AI analysis. Know what's real, what's fake, and what's generated.
        </p>

        <Button
          onClick={() => setShowAuth(true)}
          size="lg"
          className="glow-effect hover-scale relative overflow-hidden group animate-bounce-in"
          style={{animationDelay: '0.4s', opacity: 0, animationFillMode: 'forwards'}}
        >
          <span className="relative z-10">Start Verifying Now</span>
          <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </Button>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-gradient-to-br from-card to-card/50 rounded-2xl p-8 border border-border card-hover group animate-slide-in-from-left" style={{animationDelay: '0.1s', opacity: 0, animationFillMode: 'forwards'}}>
            <div className="h-14 w-14 bg-gradient-to-br from-primary to-primary/50 rounded-xl flex items-center justify-center mb-6 glow-effect group-hover:scale-110 transition-transform duration-300">
              <FileText className="h-7 w-7 text-primary-foreground" />
            </div>
            <h3 className="text-2xl font-bold mb-4">Text Verification</h3>
            <p className="text-muted-foreground leading-relaxed">
              Analyze articles, news, and claims for authenticity. Our AI checks facts and detects misinformation patterns.
            </p>
          </div>

          <div className="bg-gradient-to-br from-card to-card/50 rounded-2xl p-8 border border-border card-hover group animate-slide-in-from-bottom" style={{animationDelay: '0.2s', opacity: 0, animationFillMode: 'forwards'}}>
            <div className="h-14 w-14 bg-gradient-to-br from-accent to-accent/50 rounded-xl flex items-center justify-center mb-6 glow-accent group-hover:scale-110 transition-transform duration-300">
              <Image className="h-7 w-7 text-accent-foreground" />
            </div>
            <h3 className="text-2xl font-bold mb-4">Image Detection</h3>
            <p className="text-muted-foreground leading-relaxed">
              Identify deepfakes, manipulated photos, and AI-generated imagery with advanced computer vision analysis.
            </p>
          </div>

          <div className="bg-gradient-to-br from-card to-card/50 rounded-2xl p-8 border border-border card-hover group animate-slide-in-from-right" style={{animationDelay: '0.3s', opacity: 0, animationFillMode: 'forwards'}}>
            <div className="h-14 w-14 bg-gradient-to-br from-success to-success/50 rounded-xl flex items-center justify-center mb-6 shadow-[0_0_40px_-10px] shadow-success/50 group-hover:scale-110 transition-transform duration-300">
              <LinkIcon className="h-7 w-7 text-success-foreground" />
            </div>
            <h3 className="text-2xl font-bold mb-4">URL Verification</h3>
            <p className="text-muted-foreground leading-relaxed">
              Check source credibility and domain reputation to identify unreliable news websites.
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gradient-to-br from-primary/10 via-card to-accent/10 rounded-3xl p-12 border border-primary/20 relative overflow-hidden group animate-scale-in">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-accent/10 rounded-full blur-3xl" />
          
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-center relative z-10">
            Why <span className="gradient-text">VerifyAI</span>?
          </h2>
          <div className="grid md:grid-cols-2 gap-6 mt-8 relative z-10">
            {[
              'AI-powered fact checking',
              'Real-time verification',
              'Multiple content types',
              'Detailed analysis reports',
              'History tracking',
              'Source credibility scoring'
            ].map((feature, index) => (
              <div 
                key={index} 
                className="flex items-center space-x-3 hover-scale animate-fade-in"
                style={{animationDelay: `${index * 0.1}s`, opacity: 0, animationFillMode: 'forwards'}}
              >
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