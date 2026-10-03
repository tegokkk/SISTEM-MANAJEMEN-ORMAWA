'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Briefcase, 
  MessageSquare,
  ShieldCheck,
  Building,
  Network,
  Landmark,
  Package,
  Bell,
  ClipboardList,
  HandCoins,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
  tenantTypes?: string[];
};

const NAV_ITEMS: NavItem[] = [
  // Super Admin Menus
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN'] },
  { label: 'Master Tenant', href: '/admin/tenant', icon: Building, roles: ['SUPER_ADMIN'] },
  { label: 'Pengajuan Akun', href: '/admin/pengajuan-akun', icon: FileText, roles: ['SUPER_ADMIN'] },
  { label: 'Audit Logs', href: '/admin/audit', icon: ShieldCheck, roles: ['SUPER_ADMIN'] },

  // ORMAWA Menus
  { label: 'Dashboard', href: '/ormawa/dashboard', icon: LayoutDashboard, roles: ['ORMAWA_ADMIN'], tenantTypes: ['ORMAWA'] },
  
  // HMJ Menus
  { label: 'Dashboard', href: '/hmj/dashboard', icon: LayoutDashboard, roles: ['HMJ_ADMIN'], tenantTypes: ['HMJ'] },
  { label: 'Review HIMA', href: '/hmj/review', icon: FileText, roles: ['HMJ_ADMIN'], tenantTypes: ['HMJ'] },

  // HIMA Menus
  { label: 'Dashboard', href: '/hima/dashboard', icon: LayoutDashboard, roles: ['HIMA_ADMIN'], tenantTypes: ['HIMA'] },

  // Modul operasional tenant
  { label: 'Anggota', href: '/portal/anggota', icon: Users, tenantTypes: ['ORMAWA', 'HMJ', 'HIMA'] },
  { label: 'Struktur Organisasi', href: '/portal/organisasi', icon: Network, tenantTypes: ['ORMAWA', 'HMJ', 'HIMA'] },
  { label: 'Program Kerja', href: '/portal/program-kerja', icon: Briefcase, tenantTypes: ['ORMAWA', 'HMJ', 'HIMA'] },
  { label: 'Kebutuhan', href: '/portal/kebutuhan', icon: ClipboardList, tenantTypes: ['ORMAWA', 'HMJ', 'HIMA'] },
  { label: 'Pengajuan Dana', href: '/portal/pengajuan-dana', icon: HandCoins, tenantTypes: ['ORMAWA', 'HMJ', 'HIMA'] },
  { label: 'Keuangan', href: '/portal/keuangan', icon: Landmark, tenantTypes: ['ORMAWA', 'HMJ', 'HIMA'] },
  { label: 'Inventaris', href: '/portal/inventaris', icon: Package, tenantTypes: ['ORMAWA', 'HMJ', 'HIMA'] },
  { label: 'Pesan', href: '/portal/pesan', icon: MessageSquare, tenantTypes: ['HMJ', 'HIMA'] },
  { label: 'Notifikasi', href: '/portal/notifikasi', icon: Bell },
];

export function PortalSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { user, activeTenant } = useAuth();

  // Filter nav items based on user context
  const filteredNav = NAV_ITEMS.filter(item => {
    // If no restrictions, everyone can see
    if (!item.roles && !item.tenantTypes) return true;

    // Check roles if specified
    const effectiveRoles = [...(user?.roles ?? []), ...(activeTenant?.roles ?? [])];
    const hasRole = item.roles ? item.roles.some(r => effectiveRoles.includes(r)) : true;
    
    // Check tenant types if specified
    const hasTenantType = item.tenantTypes ? item.tenantTypes.includes(activeTenant?.type as string) : true;

    return hasRole && hasTenantType;
  });

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Content */}
      <motion.aside
        initial={{ x: -280 }}
        animate={{ x: isOpen ? 0 : -280 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          "fixed top-0 left-0 z-50 h-screen w-[280px] bg-white border-r border-gray-200 flex flex-col transition-transform lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <span className="text-xl font-heading font-bold text-brand-primary">
            SIM ORMAWA
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {filteredNav.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-brand-primary/10 text-brand-primary" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive ? "text-brand-primary" : "text-gray-400")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="text-xs text-gray-400 text-center">
            &copy; 2026 Politeknik Negeri Lampung
          </div>
        </div>
      </motion.aside>
    </>
  );
}
