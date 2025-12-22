import React, { useState } from 'react';
import { X, Users, Settings, Gamepad2, Clock, Target, Shuffle, List, Edit } from 'lucide-react';
import { Button } from './Button';
import { User, LobbyConfig, GameEndMode, ChallengeMode, WikiPageSummary } from '../types';
import { fetchRandomPage } from '../services/wikiService';

interface LobbyConfigPageProps {
  user: User | null;
  onClose: () => void;
  onCreateLobby: (config: LobbyConfig, startPage: WikiPageSummary, targetPage: WikiPageSummary) => void;
}

const AVAILABLE_THEMES = [
  'Histoire',
  'Géographie',
  'Science',
  'Art',
  'Musique',
  'Sport',
  'Technologie',
  'Cinéma',
  'Littérature',
  'Philosophie',
];

const ROUND_OPTIONS = [1, 3, 5, 10];

export const LobbyConfigPage: React.FC<LobbyConfigPageProps> = ({
  user,
  onClose,
  onCreateLobby,
}) => {
  const [selectedThemes, setSelectedThemes] = useState<string[]>(['all']);
  const [numberOfRounds, setNumberOfRounds] = useState<number>(1);
  const [gameEndMode, setGameEndMode] = useState<GameEndMode>(GameEndMode.FIRST_FINISH);
  const [challengeMode, setChallengeMode] = useState<ChallengeMode>(ChallengeMode.RANDOM);
  const [startPage, setStartPage] = useState<WikiPageSummary | null>(null);
  const [targetPage, setTargetPage] = useState<WikiPageSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingPages, setGeneratingPages] = useState(false);
  const [turnTime, setTurnTime] = useState<number>(30); // Temps par tour en secondes (20 à 90)

  const handleThemeToggle = (theme: string) => {
    if (theme === 'all') {
      setSelectedThemes(['all']);
    } else {
      const newThemes = selectedThemes.includes('all')
        ? [theme]
        : selectedThemes.includes(theme)
        ? selectedThemes.filter((t) => t !== theme)
        : [...selectedThemes, theme];

      setSelectedThemes(newThemes.length === 0 ? ['all'] : newThemes);
    }
  };

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
      setError('Échec de la génération des pages aléatoires. Veuillez réessayer.');
    } finally {
      setGeneratingPages(false);
    }
  };

  const handleCreateLobby = async () => {
    if (!user) {
      setError('Vous devez être connecté pour créer un lobby');
      return;
    }

    // Pour le mode aléatoire, on doit avoir les pages
    if (challengeMode === ChallengeMode.RANDOM && (!startPage || !targetPage)) {
      setError('Veuillez générer les pages de départ et d\'arrivée');
      return;
    }

    // Pour les modes semi-aléatoire et manuel, on crée des pages temporaires
    // qui seront remplacées dans la waiting room
    let finalStartPage = startPage;
    let finalTargetPage = targetPage;

    if (challengeMode !== ChallengeMode.RANDOM && (!finalStartPage || !finalTargetPage)) {
      // Pages temporaires pour la création du lobby
      finalStartPage = {
        title: 'À définir',
        displaytitle: 'À définir',
        description: 'Les pages seront choisies dans la salle d\'attente'
      };
      finalTargetPage = {
        title: 'À définir',
        displaytitle: 'À définir',
        description: 'Les pages seront choisies dans la salle d\'attente'
      };
    }

    const config: LobbyConfig = {
      themes: selectedThemes,
      numberOfRounds,
      gameEndMode,
      challengeMode,
    };

    onCreateLobby(config, finalStartPage!, finalTargetPage!);
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    } else {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return secs > 0 ? `${mins}min ${secs}s` : `${mins}min`;
    }
  };

  const getChallengeModeLabel = (mode: ChallengeMode): string => {
    switch (mode) {
      case ChallengeMode.RANDOM:
        return 'Aléatoire';
      case ChallengeMode.SEMI_RANDOM:
        return 'Semi-aléatoire';
      case ChallengeMode.MANUAL:
        return 'Manuel';
    }
  };

  const getChallengeModeDescription = (mode: ChallengeMode): string => {
    switch (mode) {
      case ChallengeMode.RANDOM:
        return 'L\'application choisit automatiquement les défis';
      case ChallengeMode.SEMI_RANDOM:
        return 'L\'app propose 3 défis, le chef de lobby choisit';
      case ChallengeMode.MANUAL:
        return 'Le chef entre manuellement les pages de départ et d\'arrivée';
    }
  };


  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 p-4 overflow-y-auto z-50">
      <div className="max-w-4xl mx-auto py-8">
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="flex items-center">
              <Settings className="w-8 h-8 text-white mr-3" />
              <h1 className="text-3xl font-bold text-white">Configuration du Lobby</h1>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="m-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <div className="p-6 space-y-8">
            {/* Themes Selection */}
            <section>
              <div className="flex items-center mb-4">
                <Gamepad2 className="w-6 h-6 text-purple-600 mr-2" />
                <h2 className="text-xl font-bold text-gray-900">Thèmes</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                <button
                  onClick={() => handleThemeToggle('all')}
                  className={`px-4 py-3 rounded-lg font-medium transition-all ${
                    selectedThemes.includes('all')
                      ? 'bg-purple-600 text-white shadow-lg scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Tous les thèmes
                </button>
                {AVAILABLE_THEMES.map((theme) => (
                  <button
                    key={theme}
                    onClick={() => handleThemeToggle(theme)}
                    disabled={selectedThemes.includes('all')}
                    className={`px-4 py-3 rounded-lg font-medium transition-all ${
                      selectedThemes.includes(theme) && !selectedThemes.includes('all')
                        ? 'bg-purple-600 text-white shadow-lg scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
                  >
                    {theme}
                  </button>
                ))}
              </div>
            </section>

            {/* Number of Rounds */}
            <section>
              <div className="flex items-center mb-4">
                <Target className="w-6 h-6 text-purple-600 mr-2" />
                <h2 className="text-xl font-bold text-gray-900">Nombre de rounds</h2>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {ROUND_OPTIONS.map((rounds) => (
                  <button
                    key={rounds}
                    onClick={() => setNumberOfRounds(rounds)}
                    className={`px-6 py-4 rounded-lg font-bold text-lg transition-all ${
                      numberOfRounds === rounds
                        ? 'bg-purple-600 text-white shadow-lg scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {rounds}
                  </button>
                ))}
              </div>
            </section>

            {/* Challenge Mode */}
            <section>
              <div className="flex items-center mb-4">
                <Shuffle className="w-6 h-6 text-purple-600 mr-2" />
                <h2 className="text-xl font-bold text-gray-900">Mode de sélection des défis</h2>
              </div>
              <div className="space-y-3">
                {Object.values(ChallengeMode).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setChallengeMode(mode)}
                    className={`w-full text-left px-6 py-4 rounded-lg transition-all ${
                      challengeMode === mode
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <div className="font-bold text-lg mb-1 flex items-center gap-2">
                      {mode === ChallengeMode.RANDOM && <Shuffle className="w-5 h-5" />}
                      {mode === ChallengeMode.SEMI_RANDOM && <List className="w-5 h-5" />}
                      {mode === ChallengeMode.MANUAL && <Edit className="w-5 h-5" />}
                      {getChallengeModeLabel(mode)}
                    </div>
                    <div className={`text-sm ${challengeMode === mode ? 'text-purple-100' : 'text-gray-600'}`}>
                      {getChallengeModeDescription(mode)}
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Turn-based Timer (Disabled - Coming Soon) */}
            <section>
              <div className="flex items-center mb-4">
                <Clock className="w-6 h-6 text-gray-400 mr-2" />
                <h2 className="text-xl font-bold text-gray-400">Mode tour par tour</h2>
                <span className="ml-3 px-2 py-1 bg-gray-200 text-gray-500 text-xs font-semibold rounded">
                  Prochainement
                </span>
              </div>
              <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 opacity-60">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-600">
                      Temps par tour
                    </label>
                    <span className="text-lg font-bold text-gray-600">
                      {formatTime(turnTime)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="90"
                    value={turnTime}
                    onChange={(e) => setTurnTime(Number(e.target.value))}
                    disabled
                    className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-not-allowed"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>20s</span>
                    <span>1min 30s</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Le mode tour par tour permettra à chaque joueur d'avoir un temps limité pour faire un clic. Cette fonctionnalité sera bientôt disponible.
                </p>
              </div>
            </section>

            {/* Pages Generation - Only for RANDOM mode */}
            {challengeMode === ChallengeMode.RANDOM && (
              <section>
                <div className="flex items-center mb-4">
                  <Users className="w-6 h-6 text-purple-600 mr-2" />
                  <h2 className="text-xl font-bold text-gray-900">Pages du défi</h2>
                </div>
                {!startPage || !targetPage ? (
                  <Button
                    onClick={handleGeneratePages}
                    isLoading={generatingPages}
                    className="w-full"
                  >
                    Générer des pages aléatoires
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                      <div className="text-sm text-green-700 font-bold mb-2">PAGE DE DÉPART</div>
                      <div className="font-bold text-gray-900 text-lg">{startPage.title}</div>
                      {startPage.description && (
                        <div className="text-sm text-gray-600 mt-2">{startPage.description}</div>
                      )}
                    </div>
                    <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                      <div className="text-sm text-blue-700 font-bold mb-2">PAGE CIBLE</div>
                      <div className="font-bold text-gray-900 text-lg">{targetPage.title}</div>
                      {targetPage.description && (
                        <div className="text-sm text-gray-600 mt-2">{targetPage.description}</div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      onClick={handleGeneratePages}
                      isLoading={generatingPages}
                      className="w-full"
                    >
                      Régénérer
                    </Button>
                  </div>
                )}
              </section>
            )}

            {/* Info for Semi-Random and Manual modes */}
            {challengeMode !== ChallengeMode.RANDOM && (
              <section>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Users className="w-5 h-5 text-blue-600 mr-2" />
                    <h3 className="font-bold text-blue-900">
                      {challengeMode === ChallengeMode.SEMI_RANDOM ? 'Choix semi-aléatoire' : 'Choix manuel'}
                    </h3>
                  </div>
                  <p className="text-sm text-blue-700">
                    {challengeMode === ChallengeMode.SEMI_RANDOM
                      ? 'Les défis seront proposés dans la salle d\'attente. Le chef du lobby pourra choisir parmi 3 options à chaque round.'
                      : 'Vous pourrez entrer manuellement les pages de départ et d\'arrivée dans la salle d\'attente avant chaque round.'}
                  </p>
                </div>
              </section>
            )}


            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                variant="ghost"
                onClick={onClose}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                onClick={handleCreateLobby}
                isLoading={isLoading}
                disabled={challengeMode === ChallengeMode.RANDOM && (!startPage || !targetPage)}
                className="flex-1"
              >
                Créer le lobby
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
