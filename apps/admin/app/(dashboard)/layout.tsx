import { AdminSidebar } from '../../components/AdminSidebar';
import { signOutAction } from '../login/actions';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar signOutAction={signOutAction} />
      <div className="flex-1 min-w-0 overflow-auto">{children}</div>
    </div>
  );
}
