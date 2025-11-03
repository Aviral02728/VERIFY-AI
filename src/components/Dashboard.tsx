import { useState } from 'react';
import { Shield, LogOut, FileText, Link as LinkIcon, Image, History as HistoryIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import TextAnalyzer from './analyzers/TextAnalyzer';
import UrlAnalyzer from './analyzers/UrlAnalyzer';
import ImageAnalyzer from './analyzers/ImageAnalyzer';
import History from './analyzers/History';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Tab = 'text' | 'url' | 'image' | 'history';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('text');
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

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
          <Button
            onClick={handleSignOut}
            variant="ghost"
          >
            <LogOut className="h-5 w-5 mr-2" />
            Sign Out
          </Button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Content Verification</h1>
          <p className="text-muted-foreground">Verify articles and URLs with AI-powered analysis</p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)} className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-4 mb-6">
            <TabsTrigger value="text" className="transition-all duration-200">
              <FileText className="h-5 w-5 mr-2" />
              Text
            </TabsTrigger>
            <TabsTrigger value="url" className="transition-all duration-200">
              <LinkIcon className="h-5 w-5 mr-2" />
              URL
            </TabsTrigger>
            <TabsTrigger value="image" className="transition-all duration-200">
              <Image className="h-5 w-5 mr-2" />
              Image
            </TabsTrigger>
            <TabsTrigger value="history" className="transition-all duration-200">
              <HistoryIcon className="h-5 w-5 mr-2" />
              History
            </TabsTrigger>
          </TabsList>

          <div className="bg-card rounded-2xl border border-border shadow-lg transition-all duration-300 hover:shadow-xl">
            <TabsContent value="text" className="m-0">
              <TextAnalyzer />
            </TabsContent>
            <TabsContent value="url" className="m-0">
              <UrlAnalyzer />
            </TabsContent>
            <TabsContent value="image" className="m-0">
              <ImageAnalyzer />
            </TabsContent>
            <TabsContent value="history" className="m-0">
              <History />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}