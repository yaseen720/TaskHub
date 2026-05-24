import React from 'react';
import { useWorkspace } from '@/hooks/useWorkspace';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import EmployeeDashboard from '@/components/dashboard/EmployeeDashboard';

export default function Dashboard() {
  const { isAdmin } = useWorkspace();
  return isAdmin ? <AdminDashboard /> : <EmployeeDashboard />;
}