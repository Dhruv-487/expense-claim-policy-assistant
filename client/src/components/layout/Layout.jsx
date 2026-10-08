import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { getSystemHealth } from '../../api/healthApi';

export const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [serverHealth, setServerHealth] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchHealth = async () => {
      try {
        const response = await getSystemHealth();
        if (isMounted) {
          setServerHealth(response.data);
        }
      } catch (error) {
        if (isMounted) {
          setServerHealth({ status: 'error', database: { status: 'unreachable', connected: false } });
        }
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        serverHealth={serverHealth}
      />

      <div className="lg:pl-64 flex flex-col flex-1 min-h-screen">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          serverHealth={serverHealth}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet context={{ serverHealth }} />
        </main>
      </div>
    </div>
  );
};

export default Layout;
