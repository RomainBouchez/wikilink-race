import React, { useEffect, useRef, useState } from 'react';
import { fetchPageHtml } from '../services/wikiService';
import { Loader2, AlertCircle } from 'lucide-react';

interface WikiViewerProps {
  title: string;
  onNavigate: (title: string) => void;
}

export const WikiViewer: React.FC<WikiViewerProps> = ({ title, onNavigate }) => {
  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    
    const loadContent = async () => {
      setLoading(true);
      setError(null);
      try {
        const content = await fetchPageHtml(title);
        if (isMounted) {
          // Basic sanitization/adjustment: ensure base tag doesn't mess us up, though we intercept.
          setHtml(content);
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to load Wikipedia content.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadContent();
    // Scroll to top on title change
    if (containerRef.current) {
        containerRef.current.scrollTop = 0;
    }

    return () => { isMounted = false; };
  }, [title]);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Find the closest anchor tag
    const anchor = target.closest('a');

    if (anchor) {
      e.preventDefault();
      
      const href = anchor.getAttribute('href');
      const titleAttr = anchor.getAttribute('title');

      if (!href) return;

      // Handle standard wiki links: ./Title or /wiki/Title
      let nextTitle = '';

      if (href.startsWith('./')) {
        nextTitle = decodeURIComponent(href.substring(2));
      } else if (href.startsWith('/wiki/')) {
        nextTitle = decodeURIComponent(href.substring(6));
      }

      // Ignore internal anchors (#section), file links (File:), or special pages (Special:)
      if (
        nextTitle &&
        !nextTitle.startsWith('#') &&
        !nextTitle.includes(':') // Crude way to filter Namespaces like File:, Help:, etc.
      ) {
        onNavigate(nextTitle);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 bg-white rounded-lg shadow-inner min-h-[400px]">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" />
        <p className="text-sm font-medium">Fetching article...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-500 bg-white rounded-lg shadow-inner min-h-[400px]">
        <AlertCircle className="w-10 h-10 mb-2" />
        <p>{error}</p>
        <button 
            onClick={() => window.location.reload()}
            className="mt-4 text-blue-600 hover:underline"
        >
            Retry
        </button>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="wiki-content h-full overflow-y-auto bg-white p-4 md:p-6 lg:p-8"
    >
      <h1 className="text-2xl md:text-3xl font-serif font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
        {title.replace(/_/g, ' ')}
      </h1>
      <div 
        onClick={handleContainerClick}
        className="prose prose-sm md:prose-base lg:prose-lg prose-slate max-w-none 
          prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
          prose-headings:font-serif prose-headings:text-gray-800
          prose-p:leading-relaxed prose-img:rounded-md
          [&_table]:block [&_table]:overflow-x-auto" // Important pour les tableaux wiki qui cassent le mobile
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
};