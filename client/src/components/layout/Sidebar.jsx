import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FilePlus2, 
  FileText, 
  ShieldCheck, 
  Sparkles, 
  Server,
  ExternalLink,
  UserCheck
} from 'lucide-react';
import Badge from '../common/Badge';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = ({ isOpen, onClose, serverHealth }) => {
  const { user } = useAuth();

  const navItems = [
    {
      name: 'Dashboard',
      path: '/',
      icon: LayoutDashboard,
    },
    ...(user?.role === 'EMPLOYEE'
      ? [
          {
            name: 'My Claims',
            path: '/my-claims',
            icon: FileText,
          },
        ]
      : [
          {
            name: 'Reviewer Dashboard',
            path: '/reviewer',
            icon: UserCheck,
          },
        ]),
    {
      name: 'New Claim',
      path: '/claims/new',
      icon: FilePlus2,
    },
  ];

  const comingSoonItems = [
    {
      name: 'Policy Engine',
      icon: ShieldCheck,
      badge: 'RAG Phase',
    },
    {
      name: 'Audit Reports',
      icon: FileText,
      badge: 'Upcoming',
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900/95 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800/80">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-100 tracking-tight leading-none">
              ClaimReview
            </h1>
            <span className="text-[10px] font-medium text-indigo-400 uppercase tracking-wider">
              Policy Assistant
            </span>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 px-3 py-6 space-y-6 overflow-y-auto">
          <div>
            <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Core Workspace
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`
                  }
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          <div>
            <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Next Iterations</span>
              <Sparkles className="h-3 w-3 text-purple-400" />
            </div>
            <div className="space-y-1">
              {comingSoonItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-sm text-slate-400 opacity-70"
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-4 w-4 text-slate-400" />
                    <span>{item.name}</span>
                  </div>
                  <Badge variant="purple">{item.badge}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* System Health Card */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                <Server className="h-3.5 w-3.5" /> API Backend
              </span>
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                  serverHealth?.status === 'healthy' ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    serverHealth?.status === 'healthy' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                {serverHealth?.status === 'healthy' ? 'Online' : 'Checking...'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Port: 5000 | v1.0.0
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
