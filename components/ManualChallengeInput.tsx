import React, { useState } from 'react';
import { Check, X, AlertCircle, Loader } from 'lucide-react';
import { Button } from './Button';
import { WikiPageSummary } from '../types';
import { fetchPageSummary } from '../services/wikiService';

interface ManualChallengeInputProps {
  onConfirm: (startPage: WikiPageSummary, targetPage: WikiPageSummary) => void;
  onCancel: () => void;
}

export const ManualChallengeInput: React.FC<ManualChallengeInputProps> = ({
  onConfirm,
  onCancel,
}) => {
  const [startTitle, setStartTitle] = useState('');
  const [targetTitle, setTargetTitle] = useState('');
  const [startPage, setStartPage] = useState<WikiPageSummary | null>(null);
  const [targetPage, setTargetPage] = useState<WikiPageSummary | null>(null);
  const [isValidatingStart, setIsValidatingStart] = useState(false);
  const [isValidatingTarget, setIsValidatingTarget] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [targetError, setTargetError] = useState<string | null>(null);

  const validateStartPage = async () => {
    if (!startTitle.trim()) {
      setStartError('Veuillez entrer un titre');
      return;
    }

    setIsValidatingStart(true);
    setStartError(null);

    try {
      const page = await fetchPageSummary(startTitle.trim());
      setStartPage(page);
    } catch (error) {
      setStartError('Page introuvable sur Wikipédia');
      setStartPage(null);
    } finally {
      setIsValidatingStart(false);
    }
  };

  const validateTargetPage = async () => {
    if (!targetTitle.trim()) {
      setTargetError('Veuillez entrer un titre');
      return;
    }

    setIsValidatingTarget(true);
    setTargetError(null);

    try {
      const page = await fetchPageSummary(targetTitle.trim());
      setTargetPage(page);
    } catch (error) {
      setTargetError('Page introuvable sur Wikipédia');
      setTargetPage(null);
    } finally {
      setIsValidatingTarget(false);
    }
  };

  const handleConfirm = () => {
    if (startPage && targetPage) {
      onConfirm(startPage, targetPage);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Définir le défi manuellement</h2>
        <p className="text-sm text-gray-600">
          Entrez les titres des pages Wikipédia pour ce round
        </p>
      </div>

      {/* Start Page Input */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Page de départ
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={startTitle}
            onChange={(e) => {
              setStartTitle(e.target.value);
              setStartPage(null);
              setStartError(null);
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                validateStartPage();
              }
            }}
            placeholder="Ex: Football"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <Button
            onClick={validateStartPage}
            isLoading={isValidatingStart}
            disabled={!startTitle.trim() || isValidatingStart}
            className="px-4"
          >
            Vérifier
          </Button>
        </div>

        {startError && (
          <div className="mt-2 flex items-center text-red-600 text-sm">
            <AlertCircle className="w-4 h-4 mr-1" />
            {startError}
          </div>
        )}

        {startPage && (
          <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center text-green-700 mb-1">
              <Check className="w-4 h-4 mr-1" />
              <span className="font-semibold">Page trouvée</span>
            </div>
            <div className="font-medium text-gray-900">{startPage.title}</div>
            {startPage.description && (
              <div className="text-sm text-gray-600 mt-1">{startPage.description}</div>
            )}
          </div>
        )}
      </div>

      {/* Target Page Input */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Page cible
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={targetTitle}
            onChange={(e) => {
              setTargetTitle(e.target.value);
              setTargetPage(null);
              setTargetError(null);
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                validateTargetPage();
              }
            }}
            placeholder="Ex: Argent"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <Button
            onClick={validateTargetPage}
            isLoading={isValidatingTarget}
            disabled={!targetTitle.trim() || isValidatingTarget}
            className="px-4"
          >
            Vérifier
          </Button>
        </div>

        {targetError && (
          <div className="mt-2 flex items-center text-red-600 text-sm">
            <AlertCircle className="w-4 h-4 mr-1" />
            {targetError}
          </div>
        )}

        {targetPage && (
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center text-blue-700 mb-1">
              <Check className="w-4 h-4 mr-1" />
              <span className="font-semibold">Page trouvée</span>
            </div>
            <div className="font-medium text-gray-900">{targetPage.title}</div>
            {targetPage.description && (
              <div className="text-sm text-gray-600 mt-1">{targetPage.description}</div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Section */}
      {startPage && targetPage && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-sm text-purple-800 mb-2">
            Confirmez-vous que ces pages correspondent bien à vos intentions ?
          </p>
          <div className="text-xs text-purple-600">
            <strong>Départ:</strong> {startPage.title} → <strong>Cible:</strong> {targetPage.title}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button
          variant="ghost"
          onClick={onCancel}
          className="flex-1"
        >
          Annuler
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={!startPage || !targetPage}
          className="flex-1"
        >
          Confirmer le défi
        </Button>
      </div>
    </div>
  );
};
