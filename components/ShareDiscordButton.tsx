import React, { useState, useRef } from 'react';
import { Button } from './Button';
import { sendDiscordShare } from '../services/discordWebhook';

interface ShareDiscordButtonProps {
  playerName: string;
  startPage: string;
  targetPage: string;
  timeSeconds: number;
  clicks: number;
  mode: 'DAILY' | 'TRAINING' | 'MULTIPLAYER';
  userId?: string;
}

type ButtonState = 'idle' | 'loading' | 'success' | 'error';

const DiscordIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="#5865F2"
    className="w-4 h-4 mr-2 shrink-0"
    aria-hidden="true"
  >
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

export const ShareDiscordButton: React.FC<ShareDiscordButtonProps> = ({
  playerName,
  startPage,
  targetPage,
  timeSeconds,
  clicks,
  mode,
  userId,
}) => {
  const [state, setState] = useState<ButtonState>('idle');
  const lastSentAt = useRef<number>(0);
  const COOLDOWN_MS = 300000;

  const webhookUrl = import.meta.env.VITE_DISCORD_WEBHOOK_URL as string | undefined;
  if (!webhookUrl) return null;

  const allowedUids = (import.meta.env.VITE_DISCORD_ALLOWED_UIDS as string | undefined)
    ?.split(',').map(u => u.trim()).filter(Boolean);
  if (allowedUids && allowedUids.length > 0 && (!userId || !allowedUids.includes(userId))) return null;

  const handleClick = async () => {
    if (state !== 'idle') return;
    if (Date.now() - lastSentAt.current < COOLDOWN_MS) return;
    setState('loading');
    lastSentAt.current = Date.now();
    try {
      await sendDiscordShare({ playerName, startPage, targetPage, timeSeconds, clicks, mode });
      setState('success');
    } catch {
      setState('error');
    } finally {
      setTimeout(() => setState('idle'), 3000);
    }
  };

  const label =
    state === 'loading' ? 'Envoi...' :
      state === 'success' ? '✅ Partagé !' :
        state === 'error' ? '❌ Erreur' :
          'Partager sur Discord';

  return (
    <Button
      variant="secondary"
      isLoading={state === 'loading'}
      disabled={state !== 'idle'}
      onClick={handleClick}
      className="flex items-center justify-center"
    >
      {state === 'idle' && <DiscordIcon />}
      {label}
    </Button>
  );
};
