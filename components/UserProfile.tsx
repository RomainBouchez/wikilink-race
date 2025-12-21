import type { User, UserProfile as UserProfileType } from '../types';

interface UserProfileProps {
  user: User;
  profile: UserProfileType | null;
  onClose: () => void;
}

export function UserProfile({ user, profile, onClose }: UserProfileProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Profil</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-4 mb-6">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || 'User'}
              className="w-20 h-20 rounded-full"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-blue-600 text-white flex items-center justify-center text-3xl font-bold">
              {(user.displayName || user.pseudo || 'U')[0].toUpperCase()}
            </div>
          )}
          <div>
            <h3 className="text-xl font-bold">{user.displayName || user.pseudo}</h3>
            {user.email && <p className="text-gray-600">{user.email}</p>}
            {user.isAnonymous && (
              <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded mt-1">
                Compte anonyme
              </span>
            )}
          </div>
        </div>

        {profile && (
          <div className="bg-gray-50 rounded-lg p-6">
            <h4 className="font-bold text-lg mb-4">Statistiques</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg">
                <p className="text-gray-600 text-sm">Parties jouées</p>
                <p className="text-2xl font-bold">{profile.stat.totalGames}</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-gray-600 text-sm">Temps moyen</p>
                <p className="text-2xl font-bold">{Math.round(profile.stat.avgTime)}s</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-gray-600 text-sm">Meilleur temps</p>
                <p className="text-2xl font-bold">{Math.round(profile.stat.bestTime)}s</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
