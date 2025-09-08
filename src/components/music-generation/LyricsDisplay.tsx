import React from 'react';

interface LyricsDisplayProps {
  lyrics: string | null;
}

const LyricsDisplay: React.FC<LyricsDisplayProps> = ({ lyrics }) => {
  if (!lyrics) {
    return (
      <div className="p-4 h-full flex items-center justify-center">
        <p className="text-gray-400">Select a song to see its lyrics.</p>
      </div>
    );
  }

  return (
    <div className="p-4 h-full overflow-y-auto">
      <pre className="whitespace-pre-wrap text-white">{lyrics}</pre>
    </div>
  );
};

export default LyricsDisplay;
