import React from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };
  declare props: Readonly<{ children: React.ReactNode }>;

  constructor(props: { children: React.ReactNode }) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'Ralat sistem tidak dijangka berlaku.'
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let friendlyMessage = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message);
        if (parsed && parsed.error) {
          friendlyMessage = `${parsed.error} (${parsed.operationType} @ ${parsed.path || 'unknown'})`;
        }
      } catch {
        // plain string message
      }

      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-slate-900 border border-rose-500/40 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Ralat Akses atau Sistem</h2>
                <p className="text-xs text-slate-400">Operasi disekat atau gagal disahkan oleh pelayan Firestore.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-rose-300 break-words">
              {friendlyMessage}
            </div>

            <button
              onClick={() => window.location.reload()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center space-x-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Muat Semula Aplikasi</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
