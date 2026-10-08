import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ShieldCheck, LogIn, UserPlus, AlertCircle, Loader2, User, Lock, Mail, CheckCircle2 } from 'lucide-react';
import Card, { CardBody } from '../components/common/Card';
import Button from '../components/common/Button';
import { useAuth } from '../context/AuthContext';

export const LoginPage = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('EMPLOYEE');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || (role === 'REVIEWER' ? '/reviewer' : '/');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isRegister) {
        if (!name.trim()) throw new Error('Please enter your full name');
        if (password.length < 6) throw new Error('Password must be at least 6 characters');
        const user = await register({ name: name.trim(), email: email.trim(), password, role });
        navigate(user.role === 'REVIEWER' ? '/reviewer' : '/');
      } else {
        const user = await login({ email: email.trim(), password });
        navigate(from || (user.role === 'REVIEWER' ? '/reviewer' : '/'));
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4 sm:px-0">
      {/* Brand header */}
      <div className="text-center mb-8 space-y-2">
        <div className="h-12 w-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto shadow-lg shadow-indigo-600/20">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">
          {isRegister ? 'Create an Account' : 'Sign in to ClaimReview'}
        </h1>
        <p className="text-sm text-slate-400">
          {isRegister
            ? 'Register as an Employee or Policy Reviewer'
            : 'Enter your credentials to access your dashboard'}
        </p>
      </div>

      <Card className="border-slate-800 bg-slate-900/80 shadow-xl">
        <CardBody className="p-6">
          {/* Toggle Tab */}
          <div className="flex p-1 bg-slate-950/60 rounded-xl border border-slate-800/80 mb-6">
            <button
              type="button"
              onClick={() => { setIsRegister(false); setError(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                !isRegister
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsRegister(true); setError(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                isRegister
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Register
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name field (Register only) */}
            {isRegister && (
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50"
                  />
                </div>
              </div>
            )}

            {/* Email field */}
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50"
                />
              </div>
            </div>

            {/* Role selection (Register only) */}
            {isRegister && (
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">
                  Select Role
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                    role === 'EMPLOYEE'
                      ? 'bg-indigo-600/15 border-indigo-500/50 text-indigo-300'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="role"
                      value="EMPLOYEE"
                      checked={role === 'EMPLOYEE'}
                      onChange={(e) => setRole(e.target.value)}
                      className="hidden"
                    />
                    <div className="flex-1">
                      <span className="text-xs font-semibold block text-slate-200">Employee</span>
                      <span className="text-[10px] text-slate-400 block">Submit claims</span>
                    </div>
                  </label>

                  <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                    role === 'REVIEWER'
                      ? 'bg-indigo-600/15 border-indigo-500/50 text-indigo-300'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="role"
                      value="REVIEWER"
                      checked={role === 'REVIEWER'}
                      onChange={(e) => setRole(e.target.value)}
                      className="hidden"
                    />
                    <div className="flex-1">
                      <span className="text-xs font-semibold block text-slate-200">Reviewer</span>
                      <span className="text-[10px] text-slate-400 block">Review & decide</span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={isLoading}
                icon={isLoading ? Loader2 : isRegister ? UserPlus : LogIn}
              >
                {isLoading
                  ? 'Processing…'
                  : isRegister
                  ? 'Create Account'
                  : 'Sign In'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
};

export default LoginPage;
