'use client';
import { useState } from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { api } from '@/lib/api';

interface MonthlyPurgeProps {
  currentYear: number;
  currentMonth: string; // e.g. "Jul" from top navbar toggle
  onRefresh: () => void;
}

export default function MonthlyPurgeControl({ currentYear, currentMonth, onRefresh }: MonthlyPurgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const executeMonthlyPurge = async () => {
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const res = await api.purgeMonth(currentYear, currentMonth);
      if (res.status === 'success') {
        alert(res.message || `Clearance pipeline executed for all records in ${currentMonth} ${currentYear}.`);
        setIsOpen(false);
        onRefresh();
      } else {
        setErrorMsg('Purge failure response from server API.');
      }
    } catch (err: any) {
      console.error("Network communication drop during drop execution:", err);
      setErrorMsg(err.message || 'Network communication error during purge.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {/* Stealth Toggle Button added near "Local Analysis" top segment */}
      <button 
        onClick={() => setIsOpen(true)}
        className="btn btn-ghost btn-purge"
        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
      >
        <Trash2 size={13} /> Clear {currentMonth} Data
      </button>

      {/* High-Contrast Focused Overlay Portal */}
      {isOpen && (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: '420px' }}>
            
            {/* Header */}
            <div className="modal-header">
              <div className="modal-title" style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Confirm Structural Purge
              </div>
              <button onClick={() => setIsOpen(false)} className="btn btn-ghost btn-icon" style={{ border: 'none', background: 'none' }}>
                <X size={16} />
              </button>
            </div>

            {/* Warning Content Area */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div className="modal-danger-alert">
                <AlertTriangle size={18} style={{ color: '#ff4a4a', flexShrink: 0, marginTop: '2px' }} />
                <p className="modal-danger-text">
                  Warning: You are about to wipe all transactions logged within the matrix window of <span style={{ fontWeight: 'bold', textDecoration: 'underline', color: 'var(--text-primary)' }}>{currentMonth} {currentYear}</span>. This action is irreversible.
                </p>
              </div>

              {errorMsg && (
                <div style={{ color: '#ff4a4a', fontSize: '12px', textAlign: 'center' }}>
                  ⚠️ {errorMsg}
                </div>
              )}
            </div>

            {/* Action Targets */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setIsOpen(false)}
                className="btn btn-ghost"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                onClick={executeMonthlyPurge}
                disabled={isProcessing}
                className="btn btn-confirm-purge"
                style={{ flex: 1, fontWeight: 'bold' }}
              >
                {isProcessing ? 'Purging...' : 'Confirm Drop'}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
