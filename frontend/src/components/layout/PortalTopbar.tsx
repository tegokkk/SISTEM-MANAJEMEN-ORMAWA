'use client';

import React from 'react';
import { Menu, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { NotificationBell } from '@/features/system/NotificationsPage';

export function PortalTopbar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const { user, activeTenant, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm sm:px-6 lg:px-8">
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="text-gray-500 hover:text-gray-700 lg:hidden"
          onClick={onOpenSidebar}
        >
          <span className="sr-only">Open sidebar</span>
          <Menu className="h-6 w-6" />
        </button>

        <div className="hidden sm:block">
          {activeTenant ? (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-900">{activeTenant.name}</span>
              <span className="text-xs text-gray-500 uppercase tracking-wider">{activeTenant.type}</span>
            </div>
          ) : (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-900">Sistem Administrator</span>
              <span className="text-xs text-gray-500 uppercase tracking-wider">Super Admin</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <NotificationBell />

        <div className="h-8 w-px bg-gray-200" aria-hidden="true" />

        <div className="flex items-center gap-3">
          <div className="hidden md:flex md:flex-col md:items-end">
            <span className="text-sm font-medium text-gray-700">{user?.fullName}</span>
            <span className="text-xs text-gray-500">{user?.email}</span>
          </div>
          <div className="h-8 w-8 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold">
            {user?.fullName?.charAt(0).toUpperCase() || 'U'}
          </div>
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => logout()}
          className="ml-2"
        >
          <LogOut className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Keluar</span>
        </Button>
      </div>
    </header>
  );
}
