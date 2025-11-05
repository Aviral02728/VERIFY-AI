import { useEffect, useState } from 'react';
import { History as HistoryIcon, FileText, Link as LinkIcon, Image, Trash2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface HistoryItem {
  id: string;
  content_type: 'text' | 'url' | 'image';
  content: string;
  result: any;
  created_at: string;
}

export default function History() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('analysis_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setHistory((data || []) as HistoryItem[]);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || 'Failed to load history',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('analysis_history')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: 'History item deleted',
      });
      fetchHistory();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || 'Failed to delete item',
        variant: "destructive",
      });
    }
  };

  const clearHistory = async () => {
    try {
      const { error } = await supabase
        .from('analysis_history')
        .delete()
        .gte('id', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;

      toast({
        title: "Success",
        description: 'History cleared',
      });
      fetchHistory();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || 'Failed to clear history',
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'text':
        return <FileText className="h-5 w-5" />;
      case 'url':
        return <LinkIcon className="h-5 w-5" />;
      case 'image':
        return <Image className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getVerdictBadge = (result: any) => {
    const verdict = result?.verdict || result?.verdict;
    
    if (!verdict) return null;

    let variant: "default" | "destructive" | "secondary" = "default";
    let text = verdict;

    if (verdict === 'TRUE' || verdict === 'AUTHENTIC' || verdict === 'likely_real') {
      variant = "default";
      text = 'REAL';
    } else if (verdict === 'FALSE' || verdict === 'MANIPULATED' || verdict === 'likely_fake') {
      variant = "destructive";
      text = 'FAKE';
    } else {
      variant = "secondary";
      text = 'UNCERTAIN';
    }

    return <Badge variant={variant}>{text}</Badge>;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <HistoryIcon className="h-7 w-7" />
            Analysis History
          </h2>
          <p className="text-muted-foreground">View your past verification results</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchHistory} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {history.length > 0 && (
            <Button onClick={clearHistory} variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-xl border border-border">
          <HistoryIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No History Yet</h3>
          <p className="text-muted-foreground">Start analyzing content to see your history here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <div
              key={item.id}
              className="bg-card rounded-xl border border-border p-4 sm:p-6 hover:shadow-lg transition-all duration-300 animate-in fade-in-50 slide-in-from-bottom-4"
            >
              <div className="flex items-start justify-between gap-2 sm:gap-4">
                <div className="flex items-start gap-2 sm:gap-4 flex-1 min-w-0 overflow-hidden">
                  <div className="mt-1 text-primary shrink-0">
                    {getIcon(item.content_type)}
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
                      <Badge variant="outline" className="capitalize shrink-0">
                        {item.content_type}
                      </Badge>
                      {getVerdictBadge(item.result)}
                    </div>
                    <p className="text-sm text-muted-foreground break-words mb-1 overflow-hidden">
                      {item.content}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(item.created_at)}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => deleteItem(item.id)}
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
