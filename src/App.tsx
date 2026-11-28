import React, { useState, useEffect, useMemo } from 'react';
import { ShieldAlert, Loader2 } from 'lucide-react';
import {
  ActiveTab,
  EventItem,
  Staff,
  AttendanceRecord,
  EventStatus,
  ScanResult,
  ScanMethod
} from './types';
import { useAuth } from './contexts/AuthContext';
import { useInstitution } from './contexts/InstitutionContext';
import { attendanceEngine } from './services/attendanceEngine';

import { LoginView } from './components/LoginView';
import { PendingAccessView } from './components/PendingAccessView';
import { Header } from './components/Header';
import { SidebarNav } from './components/SidebarNav';
import { DashboardView } from './components/DashboardView';
import { ScannerView } from './components/ScannerView';
import { EventManagementView } from './components/EventManagementView';
import { StaffDirectoryView } from './components/StaffDirectoryView';
import { ReportsView } from './components/ReportsView';
import { ConceptGuideView } from './components/ConceptGuideView';
import { InstitutionSettingsView } from './components/InstitutionSettingsView';
import { PlatformAdminView } from './components/PlatformAdminView';
import { CSVImportModal } from './components/CSVImportModal';

export default function App() {
  const {
    user,
    authReady,
    isPlatformOwner,
    memberships,
    membershipsLoaded,
    signOutUser
  } = useAuth();

  const {
    activeInstitutionId,
    activeInstitution,
    activeSettings,
    effectiveRole,
    isInstitutionAdmin,
    isOperator,
    isViewer,
    allInstitutions,
    institutionReady,
    selectInstitution
  } = useInstitution();

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isCSVModalOpen, setIsCSVModalOpen] = useState<boolean>(false);

  // Merge institutions available to user for Header Switcher
  const institutionOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; code: string }>();
    memberships.forEach((m) => {
      map.set(m.institutionId, {
        id: m.institutionId,
        name: m.institutionName,
        code: m.institutionCode
      });
    });
    allInstitutions.forEach((inst) => {
      map.set(inst.id, {
        id: inst.id,
        name: inst.name,
        code: inst.code
      });
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [memberships, allInstitutions]);

  // Tenant-scoped real-time Firestore subscriptions (only attached when authenticated & active member)
  useEffect(() => {
    if (!user || !activeInstitutionId || !isViewer) {
      setStaffList([]);
      setEvents([]);
      setAttendanceRecords([]);
      return;
    }

    const unsubStaff = attendanceEngine.subscribeStaff(activeInstitutionId, setStaffList);
    const unsubEvents = attendanceEngine.subscribeEvents(activeInstitutionId, setEvents);
    const unsubRecords = attendanceEngine.subscribeAttendanceRecords(
      activeInstitutionId,
      setAttendanceRecords
    );

    return () => {
      unsubStaff();
      unsubEvents();
      unsubRecords();
    };
  }, [user, activeInstitutionId, isViewer]);

  // Route guard when role or institution context changes
  useEffect(() => {
    if (isPlatformOwner && !activeInstitutionId && activeTab !== 'concept') {
      setActiveTab('platform');
      return;
    }
    if (activeTab === 'scanner' && !isOperator) {
      setActiveTab('dashboard');
    } else if (activeTab === 'institution' && !isInstitutionAdmin && !isPlatformOwner) {
      setActiveTab('dashboard');
    } else if (activeTab === 'platform' && !isPlatformOwner) {
      setActiveTab('dashboard');
    }
  }, [activeTab, activeInstitutionId, isPlatformOwner, isInstitutionAdmin, isOperator]);

  // Auth / Tenant Initialization Gate
  if (!authReady || !membershipsLoaded || !institutionReady) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-6 space-y-3">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        <p className="text-xs text-slate-400">Menyambung ke StaffAttend Cloud...</p>
      </div>
    );
  }

  // Require verified Google Sign-In
  if (!user) {
    return <LoginView />;
  }

  // Non-Platform-Owners without any active institution membership see Pending Access screen
  if (!isPlatformOwner && !activeInstitutionId) {
    return <PendingAccessView />;
  }

  const activeEvent = events.find((e) => e.status === 'OPEN') || null;

  const handleSetEventStatus = async (eventId: string, newStatus: EventStatus): Promise<void> => {
    if (!activeInstitutionId || !isInstitutionAdmin) return;
    await attendanceEngine.setEventStatus(activeInstitutionId, eventId, newStatus);
  };

  const handleCreateEvent = async (
    newEventData: Omit<EventItem, 'id' | 'institutionId' | 'createdAt' | 'updatedAt' | 'createdByUid'>
  ): Promise<void> => {
    if (!activeInstitutionId || !isInstitutionAdmin) return;
    await attendanceEngine.createEvent(activeInstitutionId, newEventData, user.uid);
  };

  const handleProcessScan = async (qrString: string, method: ScanMethod): Promise<ScanResult> => {
    if (!activeInstitutionId || !isOperator) {
      return {
        status: 'PERMISSION_DENIED',
        title: '✕ AKSES DITOLAK',
        message: 'Akaun anda tidak mempunyai peranan Operator atau Admin institusi ini.'
      };
    }

    return attendanceEngine.processScan({
      institutionId: activeInstitutionId,
      qrString,
      method,
      recordedByUid: user.uid,
      activeEventId: activeEvent?.id,
      qrPrefix: activeSettings?.qrPrefix || 'STAFF'
    });
  };

  const handleQuickSimulateScan = async (staffId: string): Promise<ScanResult> => {
    const prefix = activeSettings?.qrPrefix || 'STAFF';
    return handleProcessScan(`${prefix}|${staffId}`, 'SIMULATOR');
  };

  const handleAddStaff = async (newStaff: Staff): Promise<void> => {
    if (!activeInstitutionId || !isInstitutionAdmin) return;
    await attendanceEngine.upsertStaff(activeInstitutionId, newStaff, user.uid);
  };

  const handleDeleteStaff = async (staffId: string): Promise<void> => {
    if (!activeInstitutionId || !isInstitutionAdmin) return;
    await attendanceEngine.deleteStaff(activeInstitutionId, staffId);
  };

  const handleSyncCSVComplete = async (staffToUpsert: Staff[]): Promise<void> => {
    if (!activeInstitutionId || !isInstitutionAdmin) return;
    await attendanceEngine.syncStaffBatch(activeInstitutionId, staffToUpsert, user.uid);
  };

  const handleClearRecords = async (): Promise<void> => {
    if (!activeInstitutionId || !isInstitutionAdmin) return;
    if (window.confirm('Kosongkan semua rekod transaksi imbasan kehadiran bagi institusi ini?')) {
      await attendanceEngine.clearAttendanceRecords(activeInstitutionId);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white">
      <Header
        activeEvent={activeEvent}
        soundEnabled={soundEnabled}
        userEmail={user.email || ''}
        isPlatformOwner={isPlatformOwner}
        effectiveRole={effectiveRole}
        activeInstitutionId={activeInstitutionId}
        institutions={institutionOptions}
        canScan={isOperator && Boolean(activeInstitutionId)}
        onSelectInstitution={(id) => {
          selectInstitution(id);
          setActiveTab('dashboard');
        }}
        onToggleSound={(enabled) => setSoundEnabled(enabled)}
        onOpenScanner={() => {
          if (isOperator) setActiveTab('scanner');
        }}
        onSignOut={() => {
          void signOutUser();
        }}
      />

      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row">
        <SidebarNav
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
          activeEventName={activeEvent?.name}
          todayCount={attendanceRecords.length}
          canScan={isOperator}
          canManageInstitution={isInstitutionAdmin || isPlatformOwner}
          isPlatformOwner={isPlatformOwner}
          hasActiveInstitution={Boolean(activeInstitutionId)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {activeTab === 'platform' && isPlatformOwner && (
            <PlatformAdminView onEnterInstitutionDashboard={() => setActiveTab('dashboard')} />
          )}

          {activeTab === 'institution' && (isInstitutionAdmin || isPlatformOwner) && (
            <InstitutionSettingsView />
          )}

          {activeTab === 'concept' && <ConceptGuideView />}

          {activeInstitutionId && !isViewer && activeTab !== 'platform' && activeTab !== 'institution' && activeTab !== 'concept' && (
            <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-6 text-xs text-amber-200 flex items-start space-x-3">
              <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-sm text-white">Keahlian Operasi Diperlukan untuk Institusi Ini</div>
                <p className="leading-relaxed">
                  Anda sedang melihat institusi <strong>{activeInstitution?.name || activeInstitutionId}</strong> sebagai Platform Owner, namun UID anda belum ditambah ke senarai ahli institusi ini. Buka <strong>Tetapan Institusi</strong> atau <strong>Konsol Platform</strong> untuk melantik peranan <code className="font-mono">INSTITUTION_ADMIN</code> sebelum mengakses data staf dan kehadiran.
                </p>
              </div>
            </div>
          )}

          {activeInstitutionId && isViewer && activeTab === 'dashboard' && (
            <DashboardView
              activeEvent={activeEvent}
              staffList={staffList}
              attendanceRecords={attendanceRecords}
              isInstitutionAdmin={isInstitutionAdmin}
              canScan={isOperator}
              avatarBaseUrl={activeSettings?.avatarBaseUrl}
              onOpenScanner={() => setActiveTab('scanner')}
              onGoToEvents={() => setActiveTab('events')}
              onGoToStaff={() => setActiveTab('staff')}
              onCloseActiveEvent={(id) => {
                void handleSetEventStatus(id, 'CLOSED');
              }}
              onQuickSimulateScan={handleQuickSimulateScan}
            />
          )}

          {activeInstitutionId && isOperator && activeTab === 'scanner' && (
            <ScannerView
              activeEvent={activeEvent}
              staffList={staffList}
              isInstitutionAdmin={isInstitutionAdmin}
              canScan={isOperator}
              allowManualOverride={activeSettings?.allowManualOverride ?? true}
              qrPrefix={activeSettings?.qrPrefix || 'STAFF'}
              avatarBaseUrl={activeSettings?.avatarBaseUrl}
              onProcessScan={handleProcessScan}
              onGoToEvents={() => setActiveTab('events')}
              soundEnabled={soundEnabled}
              onToggleSound={(enabled) => setSoundEnabled(enabled)}
            />
          )}

          {activeInstitutionId && isViewer && activeTab === 'events' && (
            <EventManagementView
              events={events}
              attendanceRecords={attendanceRecords}
              staffList={staffList}
              isInstitutionAdmin={isInstitutionAdmin}
              canScan={isOperator}
              onSetEventStatus={handleSetEventStatus}
              onCreateEvent={handleCreateEvent}
              onOpenScannerForEvent={() => {
                if (isOperator) setActiveTab('scanner');
              }}
            />
          )}

          {activeInstitutionId && isViewer && activeTab === 'staff' && (
            <StaffDirectoryView
              staffList={staffList}
              institutionId={activeInstitutionId}
              isInstitutionAdmin={isInstitutionAdmin}
              canScan={isOperator}
              qrPrefix={activeSettings?.qrPrefix || 'STAFF'}
              defaultEmailDomain={activeSettings?.defaultEmailDomain}
              avatarBaseUrl={activeSettings?.avatarBaseUrl}
              onAddStaff={handleAddStaff}
              onDeleteStaff={handleDeleteStaff}
              onSimulateScan={handleQuickSimulateScan}
              onOpenCSVImport={() => setIsCSVModalOpen(true)}
            />
          )}

          {activeInstitutionId && isViewer && activeTab === 'reports' && (
            <ReportsView
              attendanceRecords={attendanceRecords}
              events={events}
              staffList={staffList}
              isInstitutionAdmin={isInstitutionAdmin}
              institutionName={activeInstitution?.name}
              onClearRecords={handleClearRecords}
            />
          )}
        </main>
      </div>

      {activeInstitutionId && isInstitutionAdmin && (
        <CSVImportModal
          isOpen={isCSVModalOpen}
          onClose={() => setIsCSVModalOpen(false)}
          institutionId={activeInstitutionId}
          defaultEmailDomain={activeSettings?.defaultEmailDomain}
          avatarBaseUrl={activeSettings?.avatarBaseUrl}
          currentStaffList={staffList}
          onSyncComplete={handleSyncCSVComplete}
        />
      )}
    </div>
  );
}
