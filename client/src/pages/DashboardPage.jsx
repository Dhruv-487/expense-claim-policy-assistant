import React, { useState, useEffect } from 'react';
import { useOutletContext, Link, useLocation } from 'react-router-dom';
import { 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  Plus, 
  Cpu, 
  Database,
  Layers,
  Sparkles,
  Receipt,
  FileText,
  AlertCircle,
  RefreshCw,
  X,
  ArrowUpRight
} from 'lucide-react';
import Card, { CardHeader, CardBody } from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import { getClaims } from '../api/claimApi';

export const DashboardPage = () => {
  const { serverHealth } = useOutletContext();
  const location = useLocation();

  const [claims, setClaims] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(
    location.state?.newClaimCreated ? 'New expense claim was successfully created and persisted to MongoDB Atlas!' : null
  );

  const fetchClaims = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getClaims();
      // response is { statusCode: 200, data: [...], ... }
      setClaims(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(err.message || 'Failed to fetch expense claims from server');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  // Format currency display
  const formatAmount = (amount, currency = 'INR') => {
    const symbolMap = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };
    const symbol = symbolMap[currency] || `${currency} `;
    return `${symbol}${Number(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Format date display
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  // Status badge variant mapper
  const getStatusVariant = (status) => {
    switch (status?.toUpperCase()) {
      case 'APPROVED':
        return 'success';
      case 'REJECTED':
        return 'error';
      case 'UNDER_REVIEW':
        return 'purple';
      case 'PENDING':
      default:
        return 'warning';
    }
  };

  // Compute live statistics from actual MongoDB data
  const totalClaims = claims.length;
  const pendingClaims = claims.filter((c) => c.status?.toUpperCase() === 'PENDING').length;
  const receiptsAvailable = claims.filter((c) => c.receiptAvailable).length;
  const receiptRate = totalClaims > 0 ? Math.round((receiptsAvailable / totalClaims) * 100) : 0;

  // Calculate total amount in INR (or base sum)
  const totalAmountSum = claims.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const stats = [
    {
      label: 'Total Expenses Processed',
      value: `₹${totalAmountSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: `${totalClaims} claim${totalClaims === 1 ? '' : 's'} recorded`,
      icon: DollarSign,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
    },
    {
      label: 'Pending Policy Review',
      value: pendingClaims.toString(),
      subtitle: 'Awaiting compliance evaluation',
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Receipt Documentation',
      value: `${receiptRate}%`,
      subtitle: `${receiptsAvailable} of ${totalClaims} backed by receipt`,
      icon: Receipt,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Active Records in Atlas',
      value: totalClaims.toString(),
      subtitle: 'Real-time MongoDB documents',
      icon: Database,
      color: 'text-sky-400',
      bg: 'bg-sky-500/10',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Toast Notice */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-emerald-300 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-emerald-400 hover:text-emerald-200 p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900/60 via-slate-900 to-slate-900 border border-indigo-500/20 p-6 sm:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-xs font-semibold text-indigo-300 mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              Automated Policy Review Foundation
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Expense Claim Policy Review Assistant
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-300 leading-relaxed">
              MERN stack foundation with live MongoDB Atlas integration. Claims are recorded and ready for upcoming RAG vector policy compliance evaluations.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/claims/new">
              <Button icon={Plus} size="lg">
                Create Claim
              </Button>
            </Link>
          </div>
        </div>

        {/* Subtle decorative glow */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <Card key={idx} hoverEffect>
            <CardBody className="p-5 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">{stat.label}</span>
                <div className={`p-2 rounded-xl ${stat.bg} ${stat.color}`}>
                  <stat.icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-bold text-white tracking-tight">{stat.value}</div>
                <div className="text-xs text-slate-400 mt-1">{stat.subtitle}</div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Main Content Grid: Real Claims Table & System Diagnostics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Claims (2 cols) */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Expense Claims"
              subtitle="Live claims loaded from MongoDB Atlas"
              action={
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchClaims}
                    isLoading={isLoading}
                    title="Refresh Claims"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                  <Link to="/claims/new">
                    <Button variant="outline" size="sm" icon={Plus}>
                      New Claim
                    </Button>
                  </Link>
                </div>
              }
            />

            {/* Loading State */}
            {isLoading ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
                <p className="text-sm">Fetching claims from MongoDB Atlas...</p>
              </div>
            ) : error ? (
              /* Error State */
              <div className="p-8 text-center space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Error Loading Claims</h4>
                  <p className="text-xs text-slate-400 mt-1">{error}</p>
                </div>
                <Button variant="secondary" size="sm" onClick={fetchClaims}>
                  Retry Fetch
                </Button>
              </div>
            ) : claims.length === 0 ? (
              /* Empty State */
              <div className="p-12 text-center space-y-4">
                <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto">
                  <FileText className="h-7 w-7" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-white">No Expense Claims Yet</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                    Your MongoDB Atlas collection is currently empty. Submit your first corporate expense claim to start review.
                  </p>
                </div>
                <Link to="/claims/new">
                  <Button icon={Plus} size="sm">
                    Submit First Claim
                  </Button>
                </Link>
              </div>
            ) : (
              /* Claims Table */
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-5 py-3.5">Claimant & Description</th>
                      <th className="px-5 py-3.5">Category</th>
                      <th className="px-5 py-3.5">Date</th>
                      <th className="px-5 py-3.5">Amount</th>
                      <th className="px-5 py-3.5">Receipt</th>
                      <th className="px-5 py-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {claims.map((claim) => (
                      <tr key={claim._id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-100 flex items-center gap-2">
                            <span>{claim.claimant}</span>
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5 max-w-xs truncate" title={claim.description}>
                            {claim.description}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-xs font-medium px-2 py-1 rounded-md bg-slate-800 text-slate-300 whitespace-nowrap">
                            {claim.category}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-400 whitespace-nowrap">
                          {formatDate(claim.date)}
                        </td>
                        <td className="px-5 py-4 font-mono font-semibold text-slate-100 whitespace-nowrap">
                          {formatAmount(claim.amount, claim.currency)}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          {claim.receiptAvailable ? (
                            <Badge variant="success">Available</Badge>
                          ) : (
                            <Badge variant="neutral">Missing</Badge>
                          )}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <Badge variant={getStatusVariant(claim.status)}>
                            {claim.status || 'PENDING'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Stack Architecture & Health (1 col) */}
        <div className="space-y-6">
          {/* Architecture Status */}
          <Card>
            <CardHeader
              title="System Diagnostics"
              subtitle="Live backend & database bridge"
            />
            <CardBody className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-indigo-400" /> Express API Server
                  </span>
                  <Badge variant={serverHealth?.status === 'healthy' ? 'success' : 'warning'}>
                    {serverHealth?.status || 'Connecting...'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-2">
                    <Database className="h-4 w-4 text-indigo-400" /> MongoDB Atlas
                  </span>
                  <Badge variant={serverHealth?.database?.connected ? 'success' : 'neutral'}>
                    {serverHealth?.database?.status || 'Configured'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-indigo-400" /> Server Uptime
                  </span>
                  <span className="font-mono text-slate-200">
                    {serverHealth?.uptime || 'N/A'}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <a
                  href="http://localhost:5000/api/health"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full block"
                >
                  <Button variant="secondary" size="sm" className="w-full text-xs">
                    Inspect /api/health Endpoint
                    <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </a>
              </div>
            </CardBody>
          </Card>

          {/* AI Roadmap Preview */}
          <Card>
            <CardHeader
              title="AI & Policy Engine Pipeline"
              subtitle="Upcoming milestones for RAG expansion"
            />
            <CardBody className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">Policy Document Embeddings</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Vector indexing company travel & expense manuals into vector database.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">LLM Compliance Reasoner</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Automated contextual analysis flagging itemized expense violations with policy citations.
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
