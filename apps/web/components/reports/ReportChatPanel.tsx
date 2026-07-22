'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useReportChat, useSendReportChat } from '@/lib/queries';

export function ReportChatPanel({ reportId }: { reportId: string }) {
  const chatQuery = useReportChat(reportId);
  const sendChat = useSendReportChat(reportId);
  const [draft, setDraft] = useState('');
  const [optimistic, setOptimistic] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const messages = chatQuery.data?.messages ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, optimistic]);

  const onSend = async () => {
    const text = draft.trim();
    if (!text || sendChat.isPending) return;
    setOptimistic(text);
    setDraft('');
    try {
      await sendChat.mutateAsync(text);
      setOptimistic(null);
    } catch {
      setDraft(text);
      setOptimistic(null);
    }
  };

  return (
    <Card className="flex h-[28rem] flex-col">
      <div className="mb-3">
        <h2 className="text-lg font-semibold">Ask about this report</h2>
        <p className="text-xs text-muted">
          Answers stay grounded in this report’s metrics and analysis — not a
          diagnosis.
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-xl border border-border bg-surface2/30 p-3">
        {messages.length === 0 && !optimistic ? (
          <p className="text-sm text-muted">
            Try “What does my LDL status mean?” or “Summarize what to discuss
            with my doctor.”
          </p>
        ) : null}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
              msg.role === 'user'
                ? 'ml-auto bg-accent/20 text-text'
                : 'mr-auto bg-surface text-muted'
            }`}
          >
            <p className="whitespace-pre-wrap">{msg.content}</p>
          </div>
        ))}
        {optimistic ? (
          <div className="ml-auto max-w-[90%] rounded-2xl bg-accent/20 px-3 py-2 text-sm">
            {optimistic}
          </div>
        ) : null}
        {sendChat.isPending ? (
          <p className="text-xs text-muted">Thinking…</p>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void onSend();
            }
          }}
          placeholder="Ask a question…"
          className="field flex-1"
          disabled={sendChat.isPending}
        />
        <Button
          onClick={() => void onSend()}
          disabled={sendChat.isPending || !draft.trim()}
        >
          Send
        </Button>
      </div>
    </Card>
  );
}
