
import React, { useEffect, useRef, useState } from 'react';

interface TerminalProps {
  logs: string[];
  maxHeight?: string;
}

const Terminal = ({ logs, maxHeight = "300px" }: TerminalProps) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [isAutoScroll, setIsAutoScroll] = useState(true);

  useEffect(() => {
    if (isAutoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs, isAutoScroll]);

  return (
    <div className="rounded-md overflow-hidden border border-cyber-gray">
      <div className="terminal-header bg-cyber-gray px-3 py-1.5 flex items-center justify-between">
        <div className="flex space-x-1.5">
          <div className="terminal-dot bg-red-500"></div>
          <div className="terminal-dot bg-yellow-500"></div>
          <div className="terminal-dot bg-green-500"></div>
        </div>
        <div className="text-xs text-gray-400">Console Output</div>
        <div>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isAutoScroll}
              onChange={() => setIsAutoScroll(!isAutoScroll)}
              className="sr-only"
            />
            <div className={`mr-2 w-8 h-4 rounded-full ${isAutoScroll ? 'bg-cyber-blue' : 'bg-gray-600'} relative transition-colors duration-200`}>
              <div className={`absolute top-0.5 left-0.5 bg-white w-3 h-3 rounded-full transition-transform duration-200 ${isAutoScroll ? 'translate-x-4' : ''}`}></div>
            </div>
            <span className="text-xs text-gray-400">Auto-scroll</span>
          </label>
        </div>
      </div>
      <div
        ref={terminalRef}
        className="terminal font-mono text-sm overflow-auto p-3"
        style={{ maxHeight }}
      >
        {logs.length === 0 ? (
          <div className="text-gray-500 italic">No logs to display...</div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="leading-tight">
              <span className="text-cyber-blue mr-2">&gt;</span>
              <span>{log}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Terminal;
