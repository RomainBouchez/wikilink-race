import React, { useState } from 'react';
import { Copy, Check, Users, Play, LogOut, Crown } from 'lucide-react';
import { Button } from './Button';
import { LobbyState, User } from '../types';

interface LobbyWaitingRoomProps {
  lobby: LobbyState;
  currentUser: User | null;
  onStartGame: () => void;
  onLeave: () => void;
}

export const LobbyWaitingRoom: React.FC<LobbyWaitingRoomProps> = ({
  lobby,
  currentUser,
  onStartGame,
  onLeave,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(lobby.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isCreator = currentUser?.uid === lobby.createdBy;
  const playerCount = Object.keys(lobby.players).length;
  const canStart = playerCount >= 2 && isCreator;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-600 via-purple-700 to-pink-800 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Users className="w-12 h-12 text-purple-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Waiting for Players</h1>
          <p className="text-gray-600">Share the room code with your friends!</p>
        </div>

        {/* Room Code */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6 mb-6">
          <div className="text-center">
            <div className="text-sm font-semibold text-purple-600 uppercase tracking-wider mb-2">
              Room Code
            </div>
            <div className="flex items-center justify-center gap-3">
              <div className="text-5xl font-mono font-bold text-purple-900 tracking-widest">
                {lobby.roomCode}
              </div>
              <button
                onClick={handleCopyCode}
                className="p-3 bg-white rounded-lg hover:bg-purple-50 transition-colors border border-purple-200"
                title="Copy code"
              >
                {copied ? (
                  <Check className="w-6 h-6 text-green-600" />
                ) : (
                  <Copy className="w-6 h-6 text-purple-600" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Challenge Info */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-xs text-green-600 font-semibold mb-1">START PAGE</div>
            <div className="font-medium text-gray-900 text-sm">{lobby.startPage}</div>
            {lobby.startPageData?.description && (
              <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                {lobby.startPageData.description}
              </div>
            )}
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-xs text-blue-600 font-semibold mb-1">TARGET PAGE</div>
            <div className="font-medium text-gray-900 text-sm">{lobby.targetPage}</div>
            {lobby.targetPageData?.description && (
              <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                {lobby.targetPageData.description}
              </div>
            )}
          </div>
        </div>

        {/* Players List */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-gray-900">
              Players ({playerCount}/{lobby.maxPlayers})
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(lobby.players).map(([playerId, player]) => (
              <div
                key={playerId}
                className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center gap-3"
              >
                {player.photoURL ? (
                  <img
                    src={player.photoURL}
                    alt={player.displayName}
                    className="w-10 h-10 rounded-full border-2 border-purple-200"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center text-purple-700 font-bold">
                    {player.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 truncate flex items-center gap-2">
                    {player.displayName}
                    {playerId === lobby.createdBy && (
                      <Crown className="w-4 h-4 text-yellow-500" title="Creator" />
                    )}
                  </div>
                  <div className="text-xs text-green-600 font-medium">Ready</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info Message */}
        {!canStart && (
          <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            {playerCount < 2
              ? 'Waiting for at least 2 players to start...'
              : isCreator
              ? 'You can start the game now!'
              : `Waiting for ${lobby.createdByName} to start the game...`}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {isCreator && (
            <Button
              onClick={onStartGame}
              disabled={playerCount < 2}
              className="flex-1 flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" />
              Start Game
            </Button>
          )}
          <Button
            onClick={onLeave}
            variant="danger"
            className="flex items-center justify-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            Leave
          </Button>
        </div>
      </div>
    </div>
  );
};
