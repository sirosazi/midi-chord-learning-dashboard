import { Upload, Clock } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { MidiFileAnalyzer } from '@/app/components/MidiFileAnalyzer';
import { useState } from 'react';

interface ChordHistoryItem {
  chord: string;
  time: string;
}

interface ChordLibrarySidebarProps {
  history?: ChordHistoryItem[];
}

export function ChordLibrarySidebar({ history = [] }: ChordLibrarySidebarProps) {
  const [activeTab, setActiveTab] = useState<'history' | 'midi'>('history');

  return (
    <div className="w-80 bg-[#0a0a0a] border-l border-gray-800 flex flex-col">
      <div className="p-6 border-b border-gray-800">
        <h2 className="text-lg font-bold text-gray-200 mb-4">Chord Library</h2>
        
        {/* タブ切り替え */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <Clock className="w-4 h-4 inline mr-2" />
            History
          </button>
          <button
            onClick={() => setActiveTab('midi')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'midi'
                ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <Upload className="w-4 h-4 inline mr-2" />
            MIDI
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-hidden">
        {activeTab === 'history' ? (
          <ScrollArea className="h-full">
            <div className="space-y-2">
              {history.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No chords played yet</p>
              ) : (
                history.map((item, index) => (
                  <div
                    key={index}
                    className="p-3 bg-gray-900/50 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors cursor-pointer"
                  >
                    <div className="font-semibold text-cyan-300">{item.chord}</div>
                    <div className="text-xs text-gray-500 mt-1">{item.time}</div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        ) : (
          <MidiFileAnalyzer />
        )}
      </div>
    </div>
  );
}