import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWorkspace } from '@/hooks/useWorkspace';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard,
  KanbanSquare,
  MessageSquare,
  Users,
  CalendarOff,
  Settings,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  BarChart3,
  LogOut,
  Building2,
  Menu,
  ClipboardList,
  FolderOpen,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

const adminNav = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Kanban Board', icon: KanbanSquare, path: '/kanban' },
  { label: 'Task Review', icon: ClipboardList, path: '/task-review' },
  { label: 'My Content', icon: FolderOpen, path: '/my-content' },
  { label: 'Team', icon: Users, path: '/team' },
  { label: 'Analytics', icon: BarChart3, path: '/analytics' },
  { label: 'Chat', icon: MessageSquare, path: '/chat' },
  { label: 'Leave Requests', icon: CalendarOff, path: '/leaves' },
  { label: 'Join Requests', icon: UserPlus, path: '/join-requests' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

const employeeNav = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'My Tasks', icon: KanbanSquare, path: '/kanban' },
  { label: 'My Videos', icon: FolderOpen, path: '/my-content' },
  { label: 'Chat', icon: MessageSquare, path: '/chat' },
  { label: 'Leave Requests', icon: CalendarOff, path: '/leaves' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { currentUser, activeWorkspace, workspaces, isAdmin, switchWorkspace } = useWorkspace();
  const { logout } = useAuth();

  const navItems = isAdmin ? adminNav : employeeNav;

  const sidebarContent = (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="p-4 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
          <span className="text-sidebar-primary-foreground font-bold text-sm">TH</span>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="font-bold text-base truncate">TaskHub</h1>
            <p className="text-xs text-sidebar-foreground/60 truncate">
              {activeWorkspace?.name || 'No workspace'}
            </p>
          </div>
        )}
      </div>

      {/* Workspace Switcher */}
      {!collapsed && (
        <div className="px-3 mb-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent h-8 text-xs">
                <Building2 className="h-3.5 w-3.5 mr-2" />
                {workspaces.length > 1 ? 'Switch Workspace' : 'Workspace Options'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {workspaces.map(ws => (
                <DropdownMenuItem key={ws.id} onClick={() => switchWorkspace(ws)}>
                  <Building2 className="h-4 w-4 mr-2" />
                  <span className="truncate flex-1">{ws.name}</span>
                  {ws.id === activeWorkspace?.id && (
                    <Badge variant="secondary" className="ml-2 text-[10px] px-1 h-4">Active</Badge>
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/setup" className="cursor-pointer w-full flex items-center">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create/Join Workspace
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <Separator className="bg-sidebar-border" />

      {/* Navigation */}
      <ScrollArea className="flex-1 py-3">
        <nav className="space-y-1 px-3">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                } ${collapsed ? 'justify-center' : ''}`}
              >
                <item.icon className="h-4.5 w-4.5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* User section */}
      <div className="p-3 border-t border-sidebar-border">
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <div className="h-8 w-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center shrink-0">
            <span className="text-sidebar-primary text-xs font-semibold">
              {currentUser?.full_name?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{currentUser?.full_name || 'User'}</p>
              <p className="text-xs text-sidebar-foreground/50 truncate">{isAdmin ? 'Admin' : 'Employee'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Logout button - replaces the collapse toggle */}
      <div className="p-2 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className={`w-full h-9 text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10 transition-colors ${collapsed ? 'px-0 justify-center' : 'justify-start px-3'}`}
          onClick={() => logout()}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="ml-3 text-sm font-medium">Logout</span>}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden fixed top-3 left-3 z-50 bg-card shadow-md"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        ${collapsed ? 'w-[68px]' : 'w-64'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        transition-all duration-300
      `}>
        {sidebarContent}
      </aside>
    </>
  );
}