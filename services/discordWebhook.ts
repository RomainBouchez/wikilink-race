export interface DiscordSharePayload {
  playerName: string;
  startPage: string;
  targetPage: string;
  timeSeconds: number;
  clicks: number;
  mode: 'DAILY' | 'TRAINING' | 'MULTIPLAYER';
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

const MODE_LABELS: Record<DiscordSharePayload['mode'], string> = {
  DAILY: 'Daily Challenge',
  TRAINING: 'Training',
  MULTIPLAYER: 'Multiplayer',
};

const MODE_COLORS: Record<DiscordSharePayload['mode'], number> = {
  DAILY: 0xf59e0b,
  TRAINING: 0x3b82f6,
  MULTIPLAYER: 0x8b5cf6,
};

export async function sendDiscordShare(payload: DiscordSharePayload): Promise<void> {
  const webhookUrl = import.meta.env.VITE_DISCORD_WEBHOOK_URL as string | undefined;
  if (!webhookUrl) throw new Error('VITE_DISCORD_WEBHOOK_URL is not set');

  const leaderboardUrl = `${window.location.origin}/leaderboard`;

  const body = {
    embeds: [
      {
        title: '🏆 WikiLink Race — Victoire !',
        description: `**${payload.playerName}** a atteint **${payload.targetPage}** depuis **${payload.startPage}** !`,
        color: MODE_COLORS[payload.mode],
        fields: [
          { name: 'Mode', value: MODE_LABELS[payload.mode], inline: true },
          { name: 'Clics', value: String(payload.clicks), inline: true },
          { name: 'Temps', value: formatTime(payload.timeSeconds), inline: true },
          { name: 'Départ', value: payload.startPage, inline: true },
          { name: 'Cible', value: payload.targetPage, inline: true },
        ],
        footer: { text: 'WikiLink Race' },
        timestamp: new Date().toISOString(),
      },
    ],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 5,
            label: 'Voir le Leaderboard',
            url: leaderboardUrl,
          },
        ],
      },
    ],
  };

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Discord webhook error: ${res.status}`);
  }
}
