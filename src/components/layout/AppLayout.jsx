import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationBell from '@/components/shared/NotificationBell';

export default function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="lg:hidden h-12" /> {/* Spacer for mobile menu button */}
        <div className="flex justify-end p-3 lg:p-4">
          <NotificationBell />
        </div>
        <div className="px-4 lg:px-8 pb-8 -mt-2">
          <Outlet />
        </div>
      </main>
    </div>
  );
}