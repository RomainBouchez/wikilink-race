import React, { useState } from 'react';
import { X, Users, Copy, Check } from 'lucide-react';
import { Button } from './Button';
import { User, LobbyState, WikiPageSummary } from '../types';
import { multiplayerService } from '../services/multiplayerService';
import { fetchRandomPage } from '../services/wikiService';

interface MultiplayerLobbyModalProps {
  action: 'create' | 'join' | null;
  user: User | null;
  onClose: () => void;
  onLobbyCreated: (lobby: LobbyState) => void;
  onLobbyJoined: (lobby: LobbyState) => void;
}

export const MultiplayerLobbyModal: React.FC<MultiplayerLobbyModalProps> = ({
  action,
  user,
  onClose,
  onLobbyCreated,
  onLobbyJoined,
}) => {
  const [roomCode, setRoomCode] = useState('');
  const [startPage, setStartPage] = useState<WikiPageSummary | null>(null);
  const [targetPage, setTargetPage] = useState<WikiPageSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingPages, setGeneratingPages] = useState(false);

  const handleGeneratePages = async () => {
    setGeneratingPages(true);
    setError(null);
    try {
      const [start, target] = await Promise.all([
        fetchRandomPage(),
        fetchRandomPage(),
      ]);
      setStartPage(start);
      setTargetPage(target);
    } catch (err) {
      setError('Failed to generate random pages. Please try again.');
    } finally {
      setGeneratingPages(false);
    }
  };

  const handleCreateLobby = async () => {
    if (!user) {
      setError('You must be signed in to create a lobby');
      return;
    }

    if (!startPage || !targetPage) {
      setError('Please select start and target pages');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const lobby = await multiplayerService.createLobby(
        user.uid,
        user.displayName || user.pseudo || 'Player',
        user.photoURL,
        startPage,
        targetPage
      );
      onLobbyCreated(lobby);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create lobby');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinLobby = async () => {
    if (!user) {
      setError('You must be signed in to join a lobby');
      return;
    }

    if (roomCode.length !== 6) {
      setError('Room code must be 6 characters');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const lobby = await multiplayerService.joinLobby(
        roomCode.toUpperCase(),
        user.uid,
        user.displayName || user.pseudo || 'Player',
        user.photoURL
      );
      onLobbyJoined(lobby);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join lobby');
    } finally {
      setIsLoading(false);
    }
  };

  if (!action) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex items-center mb-6">
          <Users className="w-8 h-8 text-purple-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">
            {action === 'create' ? 'Create Lobby' : 'Join Lobby'}
          </h2>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {action === 'create' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Challenge Pages
              </label>
              {!startPage || !targetPage ? (
                <Button
                  onClick={handleGeneratePages}
                  isLoading={generatingPages}
                  className="w-full"
                >
                  Generate Random Pages
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="text-xs text-green-600 font-semibold mb-1">START PAGE</div>
                    <div className="font-medium text-gray-900">{startPage.title}</div>
                    {startPage.description && (
                      <div className="text-xs text-gray-600 mt-1">{startPage.description}</div>
                    )}
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="text-xs text-blue-600 font-semibold mb-1">TARGET PAGE</div>
                    <div className="font-medium text-gray-900">{targetPage.title}</div>
                    {targetPage.description && (
                      <div className="text-xs text-gray-600 mt-1">{targetPage.description}</div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    onClick={handleGeneratePages}
                    isLoading={generatingPages}
                    className="w-full"
                  >
                    Regenerate
                  </Button>
                </div>
              )}
            </div>

            <Button
              onClick={handleCreateLobby}
              isLoading={isLoading}
              disabled={!startPage || !targetPage}
              className="w-full"
            >
              Create Lobby
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Room Code
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={6}
                placeholder="XXXXXX"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center text-2xl font-mono tracking-widest uppercase"
              />
            </div>

            <Button
              onClick={handleJoinLobby}
              isLoading={isLoading}
              disabled={roomCode.length !== 6}
              className="w-full"
            >
              Join Lobby
            </Button>
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full text-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
