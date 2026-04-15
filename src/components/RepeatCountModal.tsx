import { useState } from 'react';

interface RepeatCountModalProps {
  count: number;
  onConfirm: (count: number) => void;
  onClose: () => void;
}

const PRESETS = [5, 10, 20, 30];

export function RepeatCountModal({ count, onConfirm, onClose }: RepeatCountModalProps) {
  const [input, setInput] = useState(String(count));

  const handleConfirm = () => {
    const value = parseInt(input, 10);
    if (value > 0) onConfirm(value);
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg p-6 mx-4 min-w-[280px] max-w-[320px] shadow-lg"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">Repeat count</h2>

        <div className="flex flex-wrap gap-2 mb-4">
          {PRESETS.map(preset => (
            <button
              key={preset}
              onClick={() => setInput(String(preset))}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                String(preset) === input ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {preset}x
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 mb-4">
          <input
            type="number"
            min="1"
            value={input}
            onChange={e => setInput(e.target.value)}
            className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
            placeholder="Custom"
          />
          <span className="text-sm text-gray-500">times</span>
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium text-white transition-colors"
          >
            Set
          </button>
        </div>
      </div>
    </div>
  );
}
