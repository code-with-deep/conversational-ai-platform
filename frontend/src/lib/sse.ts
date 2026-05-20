import { fetchEventSource } from '@microsoft/fetch-event-source';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

interface SSEOptions {
  conversationId: string;
  message: string;
  onToken: (token: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}

export async function streamMessage(options: SSEOptions): Promise<void> {
  const { conversationId, message, onToken, onComplete, onError } = options;

  let fullText = '';
  let isCompleted = false;
  let isFailed = false;

  const completeOnce = () => {
    if (isCompleted) {
      return;
    }
    isCompleted = true;
    onComplete(fullText);
  };

  const failOnce = (error: Error) => {
    if (isFailed) {
      return;
    }
    isFailed = true;
    onError(error);
  };

  const raw = localStorage.getItem('auth-storage');
  let token = '';
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      token = parsed?.state?.accessToken ?? '';
    } catch {
      token = '';
    }
  }

  try {
    await fetchEventSource(`${API_BASE_URL}/conversations/${conversationId}/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content: message }),
      onmessage(ev) {
        if (ev.event === 'error') {
          let detail = 'Stream failed';
          if (ev.data) {
            try {
              detail = JSON.parse(ev.data).detail || detail;
            } catch {
              detail = ev.data;
            }
          }
          const err = new Error(detail);
          failOnce(err);
          throw err;
        }
        if (ev.event === 'done' || ev.data === '[DONE]') {
          completeOnce();
          return;
        }
        fullText += ev.data;
        onToken(ev.data);
      },
      onerror(err) {
        const normalized = err instanceof Error ? err : new Error(String(err));
        failOnce(normalized);
        throw normalized;
      },
      openWhenHidden: true,
    });
  } catch (err) {
    if (!isCompleted && !isFailed) {
      if (fullText) {
        completeOnce();
      } else {
        failOnce(err instanceof Error ? err : new Error('Stream failed'));
      }
    }
  }
}
