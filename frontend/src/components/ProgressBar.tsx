import React from 'react';

interface ProgressBarProps {
  progress: number;
  message: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, message }) => {
  return (
    <div className="w-full max-w-md p-4 border border-terminal-green rounded bg-[#0d1117] shadow-[0_0_10px_rgba(0,255,65,0.2)]">
      <div className="mb-2 flex justify-between text-xs font-mono text-terminal-green">
        <span>SYSTEM_STATUS</span>
        <span>{progress}%</span>
      </div>
      <div className="h-2 w-full bg-gray-900 rounded overflow-hidden border border-gray-800">
        <div
          className="h-full bg-terminal-green transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-2 text-xs font-mono text-terminal-text animate-pulse">
        {'>'} {message}
      </div>
    </div>
  );
};
