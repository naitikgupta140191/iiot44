import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNav from './TopNav';

export default function PageShell() {
  return (
    <div className="min-h-screen bg-surface">
      <TopNav />
      <Sidebar />
      <main className="md:ml-[280px] mt-16 p-6 md:p-8 min-h-[calc(100vh-64px)]">
        <Outlet />
      </main>
    </div>
  );
}
