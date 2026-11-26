import React from 'react';
import { LayoutDashboard, QrCode, Calendar, Users, FileText, BookOpen, Settings, ShieldCheck } from 'lucide-react';
import { ActiveTab } from '../types';

interface SidebarNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  activeEventName?: string | null;
  todayCount: number;
  canScan: boolean;
  canManageInstitution: boolean;
  isPlatformOwner: boolean;
  hasActiveInstitution: boolean;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeTab,
  onTabChange,
  activeEventName,
  todayCount,
  canScan,
  canManageInstitution,
  isPlatformOwner,
  hasActiveInstitution
}) => {
  const navItems: {
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
    visible: boolean;
  }[] = [
    {
      id: 'dashboard',
      label: 'Pusat Operasi',
      icon: LayoutDashboard,
      visible: hasActiveInstitution
    },
    {
      id: 'scanner',
      label: 'Pengimbas QR',
      icon: QrCode,
      badge: activeEventName ? 'AKTIF' : undefined,
      visible: hasActiveInstitution && canScan
    },
    {
      id: 'events',
      label: 'Pengurusan Event',
      icon: Calendar,
      visible: hasActiveInstitution
    },
    {
      id: 'staff',
      label: 'Direktori Staf & QR',
      icon: Users,
      visible: hasActiveInstitution
    },
    {
      id: 'reports',
      label: 'Laporan Kehadiran',
      icon: FileText,
      badge: todayCount > 0 ? todayCount : undefined,
      visible: hasActiveInstitution
    },
    {
      id: 'institution',
      label: 'Tetapan Institusi',
      icon: Settings,
      visible: hasActiveInstitution && canManageInstitution
    },
    {
      id: 'platform',
      label: 'Konsol Platform',
      icon: ShieldCheck,
      badge: 'OWNER',
      visible: isPlatformOwner
    },
    {
      id: 'concept',
      label: 'Panduan Konsep',
      icon: BookOpen,
      visible: true
    }
  ];

  return (
    <nav id="main-sidebar-nav" className="bg-slate-900/95 border-b md:border-b-0 md:border-r border-slate-800 w-full md:w-64 flex-shrink-0 p-2 sm:p-3 md:min-h-[calc(100vh-65px)]">
      <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible no-scrollbar pb-1 md:pb-0 touch-pan-x">
        <div className="hidden md:block px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Navigasi Utama
        </div>

        {navItems
          .filter((item) => item.visible)
          .map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-tab-${item.id}`}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : item.badge === 'AKTIF'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : item.badge === 'OWNER'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
      </div>

      <div className="hidden md:block mt-8 p-3.5 rounded-xl bg-slate-800/60 border border-slate-800/80 text-xs">
        <div className="text-indigo-400 font-bold mb-1 flex items-center gap-1.5">
          <span>Prinsip Konsep</span>
        </div>
        <p className="text-slate-400 text-[11px] leading-relaxed">
          &quot;QR menjadi identiti staf, Event menjadi konteks kehadiran, dan Attendance menjadi rekod transaksi.&quot;
        </p>
      </div>
    </nav>
  );
};
