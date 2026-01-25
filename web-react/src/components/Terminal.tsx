// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { Terminal as TerminalIcon } from 'lucide-react';

export const Terminal = () => {
  const [lines, setLines] = useState<string[]>([
    "reMarkable Manager Web Terminal",
    "WebSocket connection will be implemented soon",
    "Type 'help' for available commands (mock)",
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const newLines = [...lines, `$ ${input}`];

      // Mock response logic
      if (input.trim() === 'help') {
        newLines.push("Available commands: help, clear, status");
        newLines.push("Note: Full terminal via WebSocket coming soon");
      } else if (input.trim() === 'clear') {
        setLines([]);
        setInput("");
        return;
      } else if (input.trim() === 'status') {
        newLines.push("Status: Mock terminal mode");
      } else if (input.trim() !== '') {
        newLines.push(`Command not found: ${input}`);
        newLines.push("WebSocket terminal integration pending");
      }

      setLines(newLines);
      setInput("");
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 rounded-lg overflow-hidden font-mono text-sm border border-slate-700 shadow-xl">
      <div className="bg-slate-800 px-4 py-2 flex items-center justify-between border-b border-slate-700">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-300 text-xs">Mock Terminal (WebSocket pending)</span>
        </div>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
        </div>
      </div>
      <div className="flex-1 p-4 overflow-auto text-slate-300 space-y-1">
        {lines.map((line, i) => (
          <div key={i} className="break-all">{line}</div>
        ))}
        <div ref={bottomRef}></div>
      </div>
      <div className="p-3 bg-slate-800 border-t border-slate-700 flex items-center gap-2">
        <span className="text-emerald-400 font-bold">$</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="bg-transparent border-none outline-none text-white w-full placeholder-slate-600"
          placeholder="Enter command..."
          autoFocus
        />
      </div>
    </div>
  );
};
