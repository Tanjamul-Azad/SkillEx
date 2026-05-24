import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { aiHelperService, type AiHelperResponse } from '@/services/aiHelperService';

export function AiContextPanel({ contextType, defaultPrompt }: { contextType: string; defaultPrompt: string }) {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [response, setResponse] = useState<AiHelperResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    setLoading(true);
    try {
      setResponse(await aiHelperService.ask({ contextType, prompt, pagePath: window.location.pathname }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold">AI Context Helper</h3>
      </div>
      <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} className="min-h-20 bg-background/80" />
      <Button className="mt-3 w-full" onClick={ask} disabled={loading}>
        {loading ? 'Thinking...' : 'Ask helper'}
      </Button>
      {response && (
        <div className="mt-4 space-y-2 text-sm">
          <p className="leading-relaxed">{response.response}</p>
          <div className="flex flex-wrap gap-2">
            {response.suggestedActions.map((action) => (
              <span key={action} className="rounded-full border border-primary/20 bg-background px-2 py-1 text-xs text-muted-foreground">{action}</span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{response.safetyNote}</p>
        </div>
      )}
    </div>
  );
}
