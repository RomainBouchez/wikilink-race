import React, { useEffect, useState } from 'react';
import { WikiPageSummary } from '../types';
import { Flag, MousePointer2, Clock, Map, ChevronRight } from 'lucide-react';

interface GameSidebarProps {
  targetPage: WikiPageSummary;
  startPage: WikiPageSummary;
  history: string[];
  clicks: number;
  startTime: number | null;
  isPlaying: boolean;
}

export const GameSidebar: React.FC<GameSidebarProps> = ({
  targetPage,
  startPage,
  history,
  clicks,
  startTime,
  isPlaying,
}) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying && startTime) {
      interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, startTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 border-l border-gray-200 w-full lg:w-80 flex-shrink-0">
      {/* Target Header */}
      <div className="p-4 bg-white border-b border-gray-200 shadow-sm">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
          Target Article
        </div>
        <div className="flex items-start space-x-3">
            <div className="flex-1">
                 <h2 className="text-lg font-bold text-blue-800 leading-tight">
                    {targetPage.title}
                </h2>
                {targetPage.description && (
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {targetPage.description}
                    </p>
                )}
            </div>
             {targetPage.thumbnail && (
                <img 
                    src={targetPage.thumbnail.source} 
                    alt="Target" 
                    className="w-12 h-12 rounded object-cover border border-gray-200"
                />
            )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-px bg-gray-200">
        <div className="bg-white p-4 flex flex-col items-center justify-center">
            <div className="flex items-center text-gray-500 mb-1">
                <MousePointer2 className="w-4 h-4 mr-1" />
                <span className="text-xs uppercase font-bold">Clicks</span>
            </div>
            <span className="text-2xl font-mono font-semibold text-gray-800">
                {clicks}
            </span>
        </div>
        <div className="bg-white p-4 flex flex-col items-center justify-center">
             <div className="flex items-center text-gray-500 mb-1">
                <Clock className="w-4 h-4 mr-1" />
                <span className="text-xs uppercase font-bold">Time</span>
            </div>
            <span className="text-2xl font-mono font-semibold text-gray-800">
                {formatTime(elapsed)}
            </span>
        </div>
      </div>

      {/* Breadcrumbs / Path */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center text-gray-500 mb-4">
            <Map className="w-4 h-4 mr-2" />
            <span className="text-xs uppercase font-bold tracking-wider">Your Path</span>
        </div>
        
        <div className="space-y-3">
             {/* Start Node */}
            <div className="flex items-start group">
                <div className="flex flex-col items-center mr-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 ring-4 ring-green-100"></div>
                    <div className="w-0.5 h-full bg-gray-200 my-1"></div>
                </div>
                <div className="text-sm font-medium text-gray-600 pb-4">
                    {startPage.title}
                </div>
            </div>

            {/* History Nodes */}
            {history.slice(1).map((title, index) => (
                <div key={index} className="flex items-start animate-fade-in-up">
                    <div className="flex flex-col items-center mr-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-gray-300"></div>
                        {(index !== history.length - 2) && (
                             <div className="w-0.5 h-full bg-gray-200 my-1"></div>
                        )}
                    </div>
                     <div className="text-sm text-gray-600 pb-3 truncate max-w-[180px]">
                        {title.replace(/_/g, ' ')}
                    </div>
                </div>
            ))}
        </div>
      </div>

      <div className="p-4 bg-gray-50 text-center border-t border-gray-200">
        <p className="text-xs text-gray-400">
            Wikipedia Link Race
        </p>
      </div>
    </div>
  );
};