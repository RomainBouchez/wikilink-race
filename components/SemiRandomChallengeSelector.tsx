import React, { useState, useEffect } from 'react';
import { RefreshCw, Check } from 'lucide-react';
import { Button } from './Button';
import { WikiPageSummary } from '../types';
import { fetchRandomPage } from '../services/wikiService';

interface ChallengeOption {
  id: number;
  startPage: WikiPageSummary;
  targetPage: WikiPageSummary;
}

interface SemiRandomChallengeSelectorProps {
  onConfirm: (startPage: WikiPageSummary, targetPage: WikiPageSummary) => void;
  onCancel: () => void;
}

export const SemiRandomChallengeSelector: React.FC<SemiRandomChallengeSelectorProps> = ({
  onConfirm,
  onCancel,
}) => {
  const [options, setOptions] = useState<ChallengeOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateOptions = async () => {
    setIsGenerating(true);
    setSelectedOption(null);

    try {
      const newOptions: ChallengeOption[] = [];

      for (let i = 0; i < 3; i++) {
        const [startPage, targetPage] = await Promise.all([
          fetchRandomPage(),
          fetchRandomPage(),
        ]);

        newOptions.push({
          id: i + 1,
          startPage,
          targetPage,
        });
      }

      setOptions(newOptions);
    } catch (error) {
      console.error('Failed to generate challenge options:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    generateOptions();
  }, []);

  const handleConfirm = () => {
    if (selectedOption !== null) {
      const selected = options.find((opt) => opt.id === selectedOption);
      if (selected) {
        onConfirm(selected.startPage, selected.targetPage);
      }
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choisissez un défi</h2>
        <p className="text-sm text-gray-600">
          Sélectionnez l'un des 3 défis proposés ci-dessous
        </p>
      </div>

      {isGenerating ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-purple-600 mb-4"></div>
          <p className="text-gray-600">Génération des défis...</p>
        </div>
      ) : (
        <>
          {/* Challenge Options */}
          <div className="space-y-3">
            {options.map((option) => (
              <button
                key={option.id}
                onClick={() => setSelectedOption(option.id)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  selectedOption === option.id
                    ? 'border-purple-600 bg-purple-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        selectedOption === option.id
                          ? 'border-purple-600 bg-purple-600'
                          : 'border-gray-300'
                      }`}
                    >
                      {selectedOption === option.id && (
                        <Check className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <span className="font-bold text-gray-900">Défi #{option.id}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 ml-8">
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <div className="text-xs text-green-600 font-semibold mb-1">DÉPART</div>
                    <div className="font-medium text-gray-900 text-sm">
                      {option.startPage.title}
                    </div>
                    {option.startPage.description && (
                      <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {option.startPage.description}
                      </div>
                    )}
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <div className="text-xs text-blue-600 font-semibold mb-1">CIBLE</div>
                    <div className="font-medium text-gray-900 text-sm">
                      {option.targetPage.title}
                    </div>
                    {option.targetPage.description && (
                      <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {option.targetPage.description}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Regenerate Button */}
          <Button
            variant="ghost"
            onClick={generateOptions}
            isLoading={isGenerating}
            className="w-full flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Générer 3 nouveaux défis
          </Button>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="ghost"
              onClick={onCancel}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selectedOption === null}
              className="flex-1"
            >
              Confirmer le choix
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
