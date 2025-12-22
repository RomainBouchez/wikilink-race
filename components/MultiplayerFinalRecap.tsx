import React, { useState } from 'react';
import { Trophy, Home, Medal, Award } from 'lucide-react';
import { Button } from './Button';
import { LobbyState, User } from '../types';

interface MultiplayerFinalRecapProps {
  lobby: LobbyState;
  currentUser: User | null;
  onLeave: () => void;
}

export const MultiplayerFinalRecap: React.FC<MultiplayerFinalRecapProps> = ({
  lobby,
  currentUser,
  onLeave,
}) => {
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  // Calculate final rankings based on total scores
  const finalRankings = Object.entries(lobby.players)
    .map(([playerId, player]) => ({
      playerId,
      player,
      totalScore: player.totalScore || 999999,
    }))
    .sort((a, b) => a.totalScore - b.totalScore);

  const winner = finalRankings[0];

  const handleLeaveClick = () => {
    setShowLeaveModal(true);
  };

  const confirmLeave = () => {
    setShowLeaveModal(false);
    onLeave();
  };

  const cancelLeave = () => {
    setShowLeaveModal(false);
  };

  const getMedalIcon = (position: number) => {
    if (position === 1) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (position === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (position === 3) return <Award className="w-6 h-6 text-amber-600" />;
    return null;
  };

  const getMedalColor = (position: number) => {
    if (position === 1) return 'from-yellow-50 to-amber-50 border-yellow-300';
    if (position === 2) return 'from-gray-50 to-slate-50 border-gray-300';
    if (position === 3) return 'from-amber-50 to-orange-50 border-amber-300';
    return 'from-gray-50 to-gray-100 border-gray-200';
  };

  return (
    <>
      <div className="fixed inset-0 bg-gradient-to-br from-purple-600 via-purple-700 to-pink-800 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full p-8 my-8">
          {/* Header with Trophy */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Trophy className="w-20 h-20 text-yellow-500" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Partie terminée !
            </h1>
            <p className="text-xl text-gray-600">
              {winner.player.displayName} remporte la victoire !
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {lobby.config?.numberOfRounds || 1} rounds joués
            </p>
          </div>

          {/* Final Rankings */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Classement Final</h2>
            <div className="space-y-3">
              {finalRankings.map(({ playerId, player, totalScore }, index) => (
                <div
                  key={playerId}
                  className={`bg-gradient-to-r ${getMedalColor(index + 1)} border-2 rounded-lg p-4`}
                >
                  <div className="flex items-center gap-4">
                    {/* Position */}
                    <div className="flex items-center justify-center w-12">
                      {getMedalIcon(index + 1) || (
                        <div className="text-2xl font-bold text-gray-600">#{index + 1}</div>
                      )}
                    </div>

                    {/* Player Info */}
                    {player.photoURL ? (
                      <img
                        src={player.photoURL}
                        alt={player.displayName}
                        className="w-14 h-14 rounded-full border-2 border-white shadow"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-purple-200 flex items-center justify-center text-purple-700 font-bold text-xl border-2 border-white shadow">
                        {player.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900">{player.displayName}</h3>
                      <p className="text-sm text-gray-600">Score total: {totalScore}</p>
                    </div>

                    {/* Winner Crown */}
                    {index === 0 && (
                      <div className="text-yellow-500">
                        <Trophy className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Round by Round Breakdown */}
          {lobby.roundHistory && lobby.roundHistory.length > 0 && (
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Détails par round</h2>
              <div className="space-y-4">
                {lobby.roundHistory.map((round) => (
                  <div key={round.roundNumber} className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-bold text-lg text-gray-900 mb-3">
                      Round {round.roundNumber}
                      {round.winnerName && (
                        <span className="text-purple-600 ml-2">
                          - Vainqueur: {round.winnerName}
                        </span>
                      )}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {Object.entries(round.playerScores)
                        .sort((a, b) => a[1].position - b[1].position)
                        .map(([playerId, score]) => {
                          const player = lobby.players[playerId];
                          if (!player) return null;
                          return (
                            <div
                              key={playerId}
                              className={`flex items-center gap-2 p-2 rounded ${
                                playerId === round.winnerId
                                  ? 'bg-yellow-100 border border-yellow-300'
                                  : 'bg-white'
                              }`}
                            >
                              <div className="text-sm font-semibold text-gray-600 w-6">
                                #{score.position}
                              </div>
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900">
                                  {player.displayName}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {score.clicks} clics
                                  {score.timeTaken && <> • {score.timeTaken}s</>}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleLeaveClick}
              className="flex items-center justify-center gap-2 px-8"
            >
              <Home className="w-5 h-5" />
              Retour à l'accueil
            </Button>
          </div>
        </div>
      </div>

      {/* Leave Confirmation Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Quitter le lobby ?
            </h3>
            <p className="text-gray-600 mb-6">
              Voulez-vous vraiment quitter ce lobby et retourner à l'accueil ?
            </p>
            <div className="flex gap-3">
              <Button
                onClick={cancelLeave}
                variant="ghost"
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                onClick={confirmLeave}
                variant="danger"
                className="flex-1"
              >
                Quitter
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
