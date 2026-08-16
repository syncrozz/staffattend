import React, { useState } from 'react';
import { FileSpreadsheet, Upload, Download, CheckCircle2, AlertCircle, RefreshCw, X, FileText } from 'lucide-react';
import { Staff } from '../types';
import { processStaffCSV, getSampleStaffCSV, CSVImportResult } from '../utils/csvHelper';
import { soundService } from '../services/soundService';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStaffList: Staff[];
  onSyncComplete: (newStaffList: Staff[], summary: { addedCount: number; updatedCount: number }) => void;
}

export const CSVImportModal: React.FC<CSVImportModalProps> = ({
  isOpen,
  onClose,
  currentStaffList,
  onSyncComplete
}) => {
  const [mode, setMode] = useState<'upload' | 'paste'>('upload');
  const [csvRawText, setCsvRawText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<CSVImportResult | null>(null);

  if (!isOpen) return null;

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        setCsvRawText(text);
        const res = processStaffCSV(text, currentStaffList);
        setImportResult(res);
      }
    };
    reader.readAsText(file);
  };

  // Handle Textarea Change
  const handleTextChange = (text: string) => {
    setCsvRawText(text);
    if (text.trim()) {
      const res = processStaffCSV(text, currentStaffList);
      setImportResult(res);
    } else {
      setImportResult(null);
    }
  };

  // Download Sample Template
  const handleDownloadSample = () => {
    const sampleText = getSampleStaffCSV();
    const blob = new Blob([sampleText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'templat_staf_kehadiran.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Execute Sync
  const handleConfirmSync = () => {
    if (!importResult || (importResult.added.length === 0 && importResult.updated.length === 0)) return;

    // Combine current staff list with updates & additions
    const staffMap = new Map<string, Staff>();
    currentStaffList.forEach((s) => staffMap.set(s.id.toUpperCase(), s));

    importResult.updated.forEach((s) => staffMap.set(s.id.toUpperCase(), s));
    importResult.added.forEach((s) => staffMap.set(s.id.toUpperCase(), s));

    const finalStaffList = Array.from(staffMap.values());

    soundService.playSuccess();
    onSyncComplete(finalStaffList, {
      addedCount: importResult.added.length,
      updatedCount: importResult.updated.length
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 text-white max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Import & Selaraskan Data CSV Staf</h3>
              <p className="text-xs text-slate-400">Padankan ahli/staf secara automatik melalui fail CSV</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar & Mode Switch */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setMode('upload')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                mode === 'upload'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Muat Naik Fail CSV</span>
            </button>
            <button
              onClick={() => setMode('paste')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                mode === 'paste'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Tampal Teks CSV</span>
            </button>
          </div>

          <button
            onClick={handleDownloadSample}
            className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Muat Turun Templat CSV</span>
          </button>
        </div>

        {/* Mode Content */}
        <div className="space-y-4 overflow-y-auto flex-1 pr-1">
          {mode === 'upload' ? (
            <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500/70 rounded-2xl p-6 text-center bg-slate-800/30 transition-all cursor-pointer relative">
              <input
                type="file"
                accept=".csv, text/csv"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-200">
                {fileName ? `Fail Terpilih: ${fileName}` : 'Klik atau seret fail CSV anda di sini'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Format disokong: CSV (Lajur disyorkan: <code className="text-indigo-300">ID Staf, Nama Penuh, Jabatan, Jawatan, Emel, Phone</code>)
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Tampal data CSV di bawah (termasuk baris pengepala):
              </label>
              <textarea
                rows={5}
                value={csvRawText}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder={`ID Staf,Nama Penuh,Jabatan,Jawatan,Emel,Telefon\nST010,"Dr Amirul","Sains Komputer","Pensyarah","amirul@inst.edu.my","+60 19-3334455"`}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-2xl p-3 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {/* Import Result & Sync Preview */}
          {importResult && (
            <div className="space-y-3 pt-2">
              {importResult.errors.length > 0 ? (
                <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-2xl text-xs text-rose-300 space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold">
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <span>Ralat Pembacaan CSV</span>
                  </div>
                  {importResult.errors.map((err, idx) => (
                    <p key={idx} className="text-[11px]">
                      • {err}
                    </p>
                  ))}
                </div>
              ) : (
                <>
                  {/* Summary Badges */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 bg-emerald-950/60 border border-emerald-500/30 rounded-2xl">
                      <div className="text-lg font-bold text-emerald-400">{importResult.added.length}</div>
                      <div className="text-[10px] text-emerald-300 font-medium">Staf Baharu (Add)</div>
                    </div>
                    <div className="p-3 bg-blue-950/60 border border-blue-500/30 rounded-2xl">
                      <div className="text-lg font-bold text-blue-400">{importResult.updated.length}</div>
                      <div className="text-[10px] text-blue-300 font-medium">Staf Dikemaskini (Update)</div>
                    </div>
                    <div className="p-3 bg-slate-800 border border-slate-700 rounded-2xl">
                      <div className="text-lg font-bold text-slate-300">{importResult.skipped}</div>
                      <div className="text-[10px] text-slate-400 font-medium">Baris Diabaikan</div>
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="border border-slate-800 rounded-2xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-800/80 text-slate-400 text-[10px] uppercase font-mono sticky top-0">
                        <tr>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5">ID Staf</th>
                          <th className="p-2.5">Nama Penuh</th>
                          <th className="p-2.5">Jabatan</th>
                          <th className="p-2.5">Jawatan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {importResult.added.map((staf) => (
                          <tr key={staf.id} className="bg-emerald-950/20 text-slate-200">
                            <td className="p-2.5">
                              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold px-2 py-0.5 rounded">
                                BAHARU
                              </span>
                            </td>
                            <td className="p-2.5 font-mono font-bold text-emerald-400">{staf.id}</td>
                            <td className="p-2.5 font-medium">{staf.name}</td>
                            <td className="p-2.5 text-slate-400">{staf.department}</td>
                            <td className="p-2.5 text-slate-400">{staf.position}</td>
                          </tr>
                        ))}
                        {importResult.updated.map((staf) => (
                          <tr key={staf.id} className="bg-blue-950/20 text-slate-200">
                            <td className="p-2.5">
                              <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[9px] font-bold px-2 py-0.5 rounded">
                                KEMAS KINI
                              </span>
                            </td>
                            <td className="p-2.5 font-mono font-bold text-blue-400">{staf.id}</td>
                            <td className="p-2.5 font-medium">{staf.name}</td>
                            <td className="p-2.5 text-slate-400">{staf.department}</td>
                            <td className="p-2.5 text-slate-400">{staf.position}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between flex-shrink-0">
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer"
          >
            Batal
          </button>

          <button
            onClick={handleConfirmSync}
            disabled={!importResult || (importResult.added.length === 0 && importResult.updated.length === 0)}
            className={`text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md flex items-center space-x-1.5 cursor-pointer ${
              importResult && (importResult.added.length > 0 || importResult.updated.length > 0)
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>
              Selaraskan Data Sekarang ({importResult ? importResult.added.length + importResult.updated.length : 0} Staf)
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
