import { useState } from 'react';
import { migrateLocalDataToFirestore, getLocalDataCount } from '../services/migrationService';

interface MigrationPromptProps {
  userId: string;
  onClose: () => void;
}

export function MigrationPrompt({ userId, onClose }: MigrationPromptProps) {
  const [migrating, setMigrating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const localCount = getLocalDataCount();

  const handleMigrate = async () => {
    setMigrating(true);
    setError(null);
    setProgress(0);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const result = await migrateLocalDataToFirestore(userId);

      clearInterval(progressInterval);
      setProgress(100);

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError(
          `Migration partiellement réussie: ${result.entriesMigrated}/${localCount} parties migrées. ${result.errors.length} erreurs.`
        );
      }
    } catch (err) {
      console.error('Migration failed:', err);
      setError('Échec de la migration. Veuillez réessayer.');
      setMigrating(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-md w-full p-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Migration réussie!</h3>
          <p className="text-gray-600">Vos parties ont été sauvegardées dans le cloud.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4">Importer vos parties</h2>

        {!migrating ? (
          <>
            <p className="text-gray-700 mb-4">
              Nous avons trouvé <strong>{localCount} partie{localCount > 1 ? 's' : ''}</strong> sauvegardée
              {localCount > 1 ? 's' : ''} localement sur cet appareil.
            </p>
            <p className="text-gray-600 mb-6">
              Voulez-vous les importer vers votre compte cloud? Cela vous permettra d'y accéder depuis n'importe quel
              appareil.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleSkip}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Ignorer
              </button>
              <button
                onClick={handleMigrate}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Importer
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Migration en cours...</span>
                <span className="text-sm text-gray-600">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Veuillez patienter pendant que nous importons vos parties...
            </p>
          </>
        )}
      </div>
    </div>
  );
}
