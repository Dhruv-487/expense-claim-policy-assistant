import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Route guard component: redirects to /login if unauthenticated,
 * or to / if the user doesn't meet role requirements.
 */
export const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { isAuthenticated, isReviewer, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="h-10 w-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Verifying authentication…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole === 'REVIEWER' && !isReviewer) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="h-14 w-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
          <span className="text-xl font-bold font-mono">403</span>
        </div>
        <h2 className="text-lg font-semibold text-slate-100">Reviewer Privileges Required</h2>
        <p className="text-sm text-slate-400">
          Your account ({user?.email}) has the <strong>{user?.role}</strong> role. Only users with the <strong>REVIEWER</strong> role can access this page.
        </p>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
