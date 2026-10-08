import React from 'react';
import { Menu, Plus, LogOut, LogIn, User } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from '../common/Button';
import Badge from '../common/Badge';
import { useAuth } from '../../context/AuthContext';

export const Header = ({ onMenuClick, serverHealth }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Overview Dashboard';
      case '/claims/new':
        return 'Submit New Expense Claim';
      case '/reviewer':
        return 'Reviewer Dashboard';
      case '/login':
        return 'User Authentication';
      case '/my-claims':
        return 'My Expense Claims';
      default:
        if (location.pathname.startsWith('/my-claims/')) {
          return 'Claim Review Details';
        }
        return 'Expense Review Assistant';
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 focus:outline-none"
          aria-label="Toggle Navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-base font-semibold text-slate-100 tracking-tight">
            {getPageTitle()}
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Portfolio Edition</span>
            <span>•</span>
            <span className="text-indigo-400">MERN Stack</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Backend health pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
          <div
            className={`h-2 w-2 rounded-full ${
              serverHealth?.status === 'healthy' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <span className="font-medium">
            API: {serverHealth?.status === 'healthy' ? 'Connected' : 'Connecting...'}
          </span>
          {serverHealth?.database && (
            <Badge variant={serverHealth.database.connected ? 'success' : 'warning'}>
              DB: {serverHealth.database.status}
            </Badge>
          )}
        </div>

        {location.pathname !== '/claims/new' && (
          <Link to="/claims/new">
            <Button size="sm" icon={Plus}>
              New Claim
            </Button>
          </Link>
        )}

        {/* User Profile / Auth Action */}
        {isAuthenticated ? (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-slate-700 to-indigo-600 flex items-center justify-center text-xs font-bold text-white border border-slate-600">
                {getInitials(user?.name)}
              </div>
              <div className="hidden md:block text-left">
                <span className="text-xs font-semibold text-slate-200 block leading-tight">
                  {user?.name}
                </span>
                <span className="text-[10px] text-indigo-400 font-mono block">
                  {user?.role}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Log out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors ml-1"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <Link to="/login">
            <Button variant="secondary" size="sm" icon={LogIn}>
              Sign In
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
};

export default Header;
