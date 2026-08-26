/**
 * Pulse112 Tactical Call History & Audit Log
 */

'use client';

import { useState } from 'react';
import { EmergencyCall } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  History,
  Search,
  Filter,
  Download,
  X,
  Phone,
  Clock,
  MapPin,
  Sparkles,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { getTimeElapsed } from '@/lib/mock-data';

interface CallHistoryOverlayProps {
  open: boolean;
  onClose: () => void;
  calls: EmergencyCall[];
  onSelectCall?: (callId: string) => void;
}

export default function CallHistoryOverlay({
  open,
  onClose,
  calls,
  onSelectCall,
}: CallHistoryOverlayProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  if (!open) return null;

  const filteredCalls = calls.filter((call) => {
    const matchesSearch =
      (call.chief_complaint?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (call.incident_subtype?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (call.caller_number || '').includes(searchQuery) ||
      (call.caller_location?.address?.toLowerCase() || '').includes(searchQuery.toLowerCase());

    const matchesSeverity = filterSeverity === 'all' || call.severity === filterSeverity;
    return matchesSearch && matchesSeverity;
  });

  return (
    <div className="fixed inset-0 z-[2000] bg-slate-950/90 backdrop-blur-2xl text-slate-100 flex flex-col animate-in fade-in">
      {/* Header */}
      <header className="px-6 py-4 bg-slate-900/90 border-b border-white/10 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-widest text-slate-400">
                AUDIT ARCHIVE & CALL LOGS
              </span>
              <span className="text-slate-600">•</span>
              <Badge className="bg-blue-500/20 text-blue-300 font-mono text-[10px]">
                {filteredCalls.length} INCIDENTS LOGGED
              </Badge>
            </div>
            <h2 className="text-lg font-bold text-white tracking-wide">
              Historical Emergency Dispatch & AI Handoff Ledger
            </h2>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-slate-400 hover:text-white hover:bg-white/10 rounded-lg"
        >
          <X className="w-5 h-5" />
        </Button>
      </header>

      {/* Filter Toolbar */}
      <div className="px-6 py-3 bg-slate-950/70 border-b border-white/5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by incident, address, caller phone or complaint..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {['all', 'critical', 'high', 'medium', 'low'].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-3 py-1 rounded-lg text-xs font-mono uppercase transition-all ${
                filterSeverity === sev
                  ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-900 border border-white/5'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* High-density Tactical Table */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="rounded-xl border border-white/10 bg-slate-900/60 overflow-hidden shadow-2xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-slate-950/80 font-mono text-[11px] text-slate-400 uppercase tracking-wider">
                <th className="p-3.5">Priority</th>
                <th className="p-3.5">Incident Subtype</th>
                <th className="p-3.5">Chief Complaint</th>
                <th className="p-3.5">Location</th>
                <th className="p-3.5">Caller ID</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Time</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredCalls.map((call) => {
                const pColor =
                  call.severity === 'critical'
                    ? 'text-red-400 bg-red-500/10 border-red-500/30'
                    : call.severity === 'high'
                    ? 'text-orange-400 bg-orange-500/10 border-orange-500/30'
                    : call.severity === 'medium'
                    ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
                    : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';

                return (
                  <tr
                    key={call.id}
                    className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    onClick={() => {
                      if (onSelectCall) onSelectCall(call.id);
                      onClose();
                    }}
                  >
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border uppercase ${pColor}`}>
                        {call.priority_code || (call.severity === 'critical' ? 'P1' : 'P2')}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-white max-w-[180px] truncate">
                      {call.incident_subtype || call.incident_type}
                    </td>
                    <td className="p-3.5 text-slate-300 max-w-[280px] truncate">
                      {call.chief_complaint || 'Emergency reported'}
                    </td>
                    <td className="p-3.5 text-slate-400 font-mono max-w-[200px] truncate">
                      📍 {call.caller_location?.address || 'Triangulated GPS'}
                    </td>
                    <td className="p-3.5 font-mono text-slate-400">{call.caller_number}</td>
                    <td className="p-3.5">
                      <Badge className="bg-slate-800 text-slate-300 font-mono text-[9px] uppercase">
                        {call.status || 'Active'}
                      </Badge>
                    </td>
                    <td className="p-3.5 font-mono text-slate-400">{getTimeElapsed(call.created_at)}</td>
                    <td className="p-3.5 text-right">
                      <span className="text-blue-400 hover:text-blue-300 font-mono font-bold flex items-center justify-end gap-1">
                        VIEW <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
