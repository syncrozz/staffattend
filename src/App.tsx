import React, { useState, useEffect } from 'react';
import { ActiveTab, EventItem, Staff, AttendanceRecord, EventStatus, ScanResult } from './types';
import { attendanceEngine } from './services/attendanceEngine';
import { soundService } from './services/soundService';

import { Header } from './components/Header';
import { SidebarNav } from './components/SidebarNav';
import { DashboardView } from './components/DashboardView';
import { ScannerView } from './components/ScannerView';
import { EventManagementView } from './components/EventManagementView';
import { StaffDirectoryView } from './components/StaffDirectoryView';
import { ReportsView } from './components/ReportsView';
import { ConceptGuideView } from './components/ConceptGuideView';
import { AdminPinModal } from './components/AdminPinModal';
import { CSVImportModal } from './components/CSVImportModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Admin Mode & Modal States
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isAdminPinModalOpen, setIsAdminPinModalOpen] = useState<boolean>(false);
  const [adminActionTitle, setAdminActionTitle] = useState<string>('Sila Aktifkan Mod Admin');
  const [isCSVModalOpen, setIsCSVModalOpen] = useState<boolean>(false);

  // Load and subscribe to real-time Firestore data
  useEffect(() => {
    const unsubStaff = attendanceEngine.subscribeStaff((data) => setStaffList(data));
    const unsubEvents = attendanceEngine.subscribeEvents((data) => setEvents(data));
    const unsubRecords = attendanceEngine.subscribeRecords((data) => setAttendanceRecords(data));

    return () => {
      unsubStaff();
      unsubEvents();
      unsubRecords();
    };
  }, []);

  const activeEvent = events.find((e) => e.status === 'OPEN') || null;

  // Toggle Admin Mode
  const handleToggleAdminMode = () => {
    if (isAdmin) {
      setIsAdmin(false);
      soundService.playSuccess();
    } else {
      setAdminActionTitle('Aktifkan Mod Pentadbir (Admin Mode)');
      setIsAdminPinModalOpen(true);
    }
  };

  // Request Admin Access with specific context
  const handleRequestAdminAccess = (actionName?: string) => {
    if (!isAdmin) {
      setAdminActionTitle(actionName ? `Akses Admin: ${actionName}` : 'Akses Admin Diperlukan');
      setIsAdminPinModalOpen(true);
    }
  };

  // Handle Event Status Change (OPEN / CLOSED / ARCHIVED)
  const handleSetEventStatus = (eventId: string, newStatus: EventStatus) => {
    const updatedEvents = attendanceEngine.setEventStatus(eventId, newStatus);
    setEvents(updatedEvents);
  };

  // Handle Create Event
  const handleCreateEvent = (newEventData: Omit<EventItem, 'id' | 'createdAt'>) => {
    const currentEvents = attendanceEngine.getEvents();
    const newId = `E00${currentEvents.length + 1}`;
    const newEvent: EventItem = {
      ...newEventData,
      id: newId,
      createdAt: new Date().toISOString()
    };

    // If new event status is OPEN, automatically close previously open events
    const updated = currentEvents.map((e) => ({
      ...e,
      status: (newEventData.status === 'OPEN' && e.status === 'OPEN' ? 'CLOSED' : e.status) as EventStatus
    }));

    const finalEvents = [newEvent, ...updated];
    attendanceEngine.saveEvents(finalEvents);
    setEvents(finalEvents);
  };

  // Handle Process Scan
  const handleProcessScan = (qrString: string, method: 'CAMERA_SCAN' | 'SIMULATOR' | 'MANUAL_OVERRIDE'): ScanResult => {
    const result = attendanceEngine.processScan(qrString, method);
    // Refresh records
    setAttendanceRecords(attendanceEngine.getAttendanceRecords());
    return result;
  };

  // Handle Quick Simulate Scan
  const handleQuickSimulateScan = (staffId: string): ScanResult => {
    return handleProcessScan(`STAFF|${staffId}`, 'SIMULATOR');
  };

  // Handle Add Staff
  const handleAddStaff = (newStaff: Staff) => {
    const updated = [newStaff, ...staffList];
    attendanceEngine.saveStaffList(updated);
    setStaffList(updated);
  };

  // Handle Delete Staff
  const handleDeleteStaff = (staffId: string) => {
    attendanceEngine.deleteStaff(staffId);
    setStaffList((prev) => prev.filter((s) => s.id !== staffId));
  };

  // Handle CSV Sync Complete
  const handleSyncCSVComplete = (newStaffList: Staff[]) => {
    attendanceEngine.saveStaffList(newStaffList);
    setStaffList(newStaffList);
  };

  // Handle Reset Demo Data
  const handleResetData = () => {
    if (window.confirm('Adakah anda pasti untuk mengeset semula data ke sampel asal?')) {
      attendanceEngine.resetToDefaultData();
      setStaffList(attendanceEngine.getStaffList());
      setEvents(attendanceEngine.getEvents());
      setAttendanceRecords(attendanceEngine.getAttendanceRecords());
    }
  };

  // Handle Clear Attendance Records
  const handleClearRecords = () => {
    if (window.confirm('Kosongkan semua rekod transaksi imbasan kehadiran?')) {
      attendanceEngine.saveAttendanceRecords([]);
      setAttendanceRecords([]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* App Header */}
      <Header
        activeEvent={activeEvent}
        soundEnabled={soundEnabled}
        isAdmin={isAdmin}
        onToggleSound={(enabled) => setSoundEnabled(enabled)}
        onResetData={handleResetData}
        onOpenScanner={() => setActiveTab('scanner')}
        onToggleAdminMode={handleToggleAdminMode}
      />

      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row">
        {/* Sidebar Nav */}
        <SidebarNav
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
          activeEventName={activeEvent?.name}
          todayCount={attendanceRecords.length}
        />

        {/* Main Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              activeEvent={activeEvent}
              staffList={staffList}
              attendanceRecords={attendanceRecords}
              onOpenScanner={() => setActiveTab('scanner')}
              onGoToEvents={() => setActiveTab('events')}
              onGoToStaff={() => setActiveTab('staff')}
              onCloseActiveEvent={(id) => handleSetEventStatus(id, 'CLOSED')}
              onQuickSimulateScan={handleQuickSimulateScan}
            />
          )}

          {activeTab === 'scanner' && (
            <ScannerView
              activeEvent={activeEvent}
              staffList={staffList}
              isAdmin={isAdmin}
              onRequestAdminAccess={handleRequestAdminAccess}
              onProcessScan={handleProcessScan}
              onGoToEvents={() => setActiveTab('events')}
              soundEnabled={soundEnabled}
              onToggleSound={(enabled) => setSoundEnabled(enabled)}
            />
          )}

          {activeTab === 'events' && (
            <EventManagementView
              events={events}
              attendanceRecords={attendanceRecords}
              isAdmin={isAdmin}
              onSetEventStatus={handleSetEventStatus}
              onCreateEvent={handleCreateEvent}
              onOpenScannerForEvent={() => setActiveTab('scanner')}
              onRequestAdminAccess={handleRequestAdminAccess}
            />
          )}

          {activeTab === 'staff' && (
            <StaffDirectoryView
              staffList={staffList}
              isAdmin={isAdmin}
              onAddStaff={handleAddStaff}
              onDeleteStaff={handleDeleteStaff}
              onSimulateScan={handleQuickSimulateScan}
              onRequestAdminAccess={handleRequestAdminAccess}
              onOpenCSVImport={() => setIsCSVModalOpen(true)}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              attendanceRecords={attendanceRecords}
              events={events}
              staffList={staffList}
              onClearRecords={handleClearRecords}
            />
          )}

          {activeTab === 'concept' && <ConceptGuideView />}
        </main>
      </div>

      {/* Admin PIN Verification Modal */}
      <AdminPinModal
        isOpen={isAdminPinModalOpen}
        onClose={() => setIsAdminPinModalOpen(false)}
        onSuccess={() => setIsAdmin(true)}
        actionTitle={adminActionTitle}
      />

      {/* CSV Sync Modal */}
      <CSVImportModal
        isOpen={isCSVModalOpen}
        onClose={() => setIsCSVModalOpen(false)}
        currentStaffList={staffList}
        onSyncComplete={handleSyncCSVComplete}
      />
    </div>
  );
}
