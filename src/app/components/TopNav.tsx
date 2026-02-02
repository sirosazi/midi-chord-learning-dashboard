import { Music } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';

interface TopNavProps {
  midiInputs: MIDIInput[];
  selectedMidiInput: string;
  onMidiInputChange: (inputId: string) => void;
}

export function TopNav({ midiInputs, selectedMidiInput, onMidiInputChange }: TopNavProps) {
  return (
    <nav className="flex items-center justify-between px-8 py-4 bg-[#0a0a0a] border-b border-gray-800">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-lg flex items-center justify-center">
          <Music className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
          Chord Master Pro
        </h1>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-6">
        {/* MIDI Input Selector */}
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-400 uppercase tracking-wide">MIDI Input</label>
          <Select 
            value={selectedMidiInput || 'none'} 
            onValueChange={(value) => value !== 'none' && onMidiInputChange(value)}
          >
            <SelectTrigger className="w-[220px] bg-gray-900 border-gray-700 text-gray-200">
              <SelectValue placeholder="Select MIDI device" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              {midiInputs.length === 0 ? (
                <SelectItem value="none" className="text-gray-400">
                  No Device Connected
                </SelectItem>
              ) : (
                midiInputs.map((input) => (
                  <SelectItem 
                    key={input.id} 
                    value={input.id || ''} 
                    className="text-gray-300"
                  >
                    {input.name || 'Unknown Device'}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Status Indicator */}
        {midiInputs.length > 0 && selectedMidiInput && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 border border-green-500/50 rounded-lg">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-300 uppercase tracking-wide">Connected</span>
          </div>
        )}

      </div>
    </nav>
  );
}
