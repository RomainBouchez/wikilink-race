import React from 'react';
import { Trophy, Clock, Timer, Calendar, CalendarDays, Star } from 'lucide-react';
import { EnhancedUserStats, GameMode } from '../types';

interface ProfileStatsCardsProps {
  stats: EnhancedUserStats;
}

export const ProfileStatsCards: React.FC<ProfileStatsCardsProps> = ({ stats }) => {
  const getModeBadge = (mode: GameMode | null) => {
    if (!mode) return 'None';

    const badges = {
      [GameMode.DAILY]: 'Daily',
      [GameMode.TRAINING]: 'Training',
      [GameMode.MULTIPLAYER]: 'Multiplayer'
    };

    return badges[mode] || 'Unknown';
  };

  const getModeColor = (mode: GameMode | null) => {
    if (!mode) return 'bg-gray-100 text-gray-600';

    const colors = {
      [GameMode.DAILY]: 'bg-purple-100 text-purple-600',
      [GameMode.TRAINING]: 'bg-blue-100 text-blue-600',
      [GameMode.MULTIPLAYER]: 'bg-green-100 text-green-600'
    };

    return colors[mode] || 'bg-gray-100 text-gray-600';
  };

  const cards = [
    {
      icon: Trophy,
      label: 'Total Games',
      value: stats.totalGames.toString(),
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      icon: Clock,
      label: 'Best Time',
      value: stats.bestTime > 0 ? `${stats.bestTime}s` : '-',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      icon: Timer,
      label: 'Average Time',
      value: stats.avgTime > 0 ? `${Math.round(stats.avgTime)}s` : '-',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      icon: Calendar,
      label: 'Games This Month',
      value: stats.gamesThisMonth.toString(),
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      icon: CalendarDays,
      label: 'Games This Week',
      value: stats.gamesThisWeek.toString(),
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    },
    {
      icon: Star,
      label: 'Favorite Mode',
      value: null, // Special rendering
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      isBadge: true
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card, index) => (
        <div
          key={index}
          className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
          style={{
            animation: `fadeIn 0.3s ease-out ${index * 0.1}s both`
          }}
        >
          <div className={`${card.bgColor} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
            <card.icon className={`w-6 h-6 ${card.color}`} />
          </div>

          <div className="text-sm text-gray-600 mb-1">{card.label}</div>

          {card.isBadge ? (
            <div className="mt-2">
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${getModeColor(
                  stats.favoriteGameMode
                )}`}
              >
                {getModeBadge(stats.favoriteGameMode)}
              </span>
            </div>
          ) : (
            <div className={`text-4xl font-bold ${card.color}`}>
              {card.value}
            </div>
          )}
        </div>
      ))}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};
