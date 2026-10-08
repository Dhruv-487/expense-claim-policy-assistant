import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Search,
  Filter,
  Plus,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Receipt,
  Sparkles,
  Gavel,
  ShieldCheck,
  Tag,
  Calendar,
  DollarSign,
  Eye,
} from 'lucide-react';
import Card, { CardHeader, CardBody } from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import { getClaims } from '../api/claimApi';

// ─── Status Badge Helpers ─────────────────────────────────────
const ClaimStatusBadge = ({ status, clarification }) => {
  if (clarification?.requested && !clarification?.resolved) {
    return <Badge variant="warning">CLARIFICATION REQUESTED</Badge>;
  }
  switch (status?.toUpperCase()) {
    case 'APPROVED':
      return <Badge variant="success">APPROVED</Badge>;
    case 'REJECTED':
      return <Badge variant="error">REJECTED</Badge>;
    case 'UNDER_REVIEW':
      return <Badge variant="purple">UNDER REVIEW</Badge>;
    case 'PENDING':
    default:
      return <Badge variant="warning">PENDING</Badge>;
  }
};

const AiReviewBadge = ({ status }) => {
  switch (status?.toUpperCase()) {
    case 'COMPLIANT':
      return <Badge variant="success">COMPLIANT</Badge>;
    case 'NON_COMPLIANT':
      return <Badge variant="error">NON-COMPLIANT</Badge>;
    case 'NEEDS_CLARIFICATION':
      return <Badge variant="warning">NEEDS CLARIFICATION</Badge>;
    case 'UNCERTAIN':
      return <Badge variant="purple">UNCERTAIN</Badge>;
    default:
      return <Badge variant="neutral">NOT REVIEWED</Badge>;
  }
};

const ReviewerDecisionBadge = ({ decision }) => {
  switch (decision?.toUpperCase()) {
    case 'APPROVED':
      return <Badge variant="success">APPROVED</Badge>;
    case 'REJECTED':
      return <Badge variant="error">REJECTED</Badge>;
    case 'CLARIFICATION_REQUESTED':
      return <Badge variant="warning">CLARIFICATION</Badge>;
    case 'OVERRIDDEN':
      return <Badge variant="purple">OVERRIDDEN</Badge>;
    default:
      return <span className="text-xs text-slate-500 italic">Awaiting decision</span>;
  }
};

const ValidationBadge = ({ validationResults }) => {
  if (!validationResults || validationResults.valid === null || validationResults.valid === undefined) {
    return <Badge variant="neutral">PENDING</Badge>;
  }
  if (validationResults.valid) {
    return <Badge variant="success">VALID</Badge>;
  }
  const count = validationResults.issues?.length || 1;
  return <Badge variant="error">{count} ISSUE{count > 1 ? 'S' : ''}</Badge>;
};

// ─── Formatting Helpers ───────────────────────────────────────
const formatAmount = (amount, currency = 'INR') => {
  const symbols = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };
  const sym = symbols[currency?.toUpperCase()] || `${currency} `;
  return `${sym}${Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (dateString) => {
  if (!dateString) return '—';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

const formatDateTime = (dateString) => {
  if (!dateString) return '—';
  try {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
};

export const MyClaimsPage = () => {
  const [claims, setClaims] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchMyClaims = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getClaims();
      setClaims(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(err.message || 'Failed to fetch your expense claims');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyClaims();
  }, []);

  // Filtered claims
  const filteredClaims = useMemo(() => {
    return claims.filter((claim) => {
      // Status filter
      if (statusFilter !== 'ALL' && claim.status !== statusFilter) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const categoryMatch = claim.category?.toLowerCase().includes(query);
        const descMatch = claim.description?.toLowerCase().includes(query);
        const amountMatch = String(claim.amount).includes(query);
        return categoryMatch || descMatch || amountMatch;
      }
      return true;
    });
  }, [claims, statusFilter, searchQuery]);

  // Counts
  const stats = useMemo(() => {
    return {
      total: claims.length,
      approved: claims.filter((c) => c.status === 'APPROVED').length,
      underReview: claims.filter((c) => c.status === 'UNDER_REVIEW').length,
      pending: claims.filter((c) => c.status === 'PENDING').length,
      rejected: claims.filter((c) => c.status === 'REJECTED').length,
    };
  }, [claims]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ─── Page Header ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-400" />
            My Submitted Claims
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track your expense submissions, automated policy validation, AI recommendations, and reviewer decisions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMyClaims}
            disabled={isLoading}
            icon={RefreshCw}
          >
            Refresh
          </Button>
          <Link to="/claims/new">
            <Button size="sm" icon={Plus}>
              Submit New Claim
            </Button>
          </Link>
        </div>
      </div>

      {/* ─── Summary KPI Chips ─────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 block">Total Claims</span>
            <span className="text-xl font-bold font-mono text-slate-100 mt-0.5 block">{stats.total}</span>
          </div>
          <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <FileText className="h-4 w-4" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 block">Approved</span>
            <span className="text-xl font-bold font-mono text-emerald-400 mt-0.5 block">{stats.approved}</span>
          </div>
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 block">In Review / Pending</span>
            <span className="text-xl font-bold font-mono text-amber-400 mt-0.5 block">{stats.underReview + stats.pending}</span>
          </div>
          <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="h-4 w-4" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 block">Rejected</span>
            <span className="text-xl font-bold font-mono text-rose-400 mt-0.5 block">{stats.rejected}</span>
          </div>
          <div className="h-8 w-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <XCircle className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* ─── Search and Filter Bar ─────────────────────────── */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardBody className="p-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by category, description, or amount…"
                className="w-full pl-9 pr-4 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="h-4 w-4 text-slate-500 shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ─── Main Content ──────────────────────────────────── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <div className="h-9 w-9 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Loading your submitted claims…</p>
        </div>
      ) : error ? (
        <Card className="border-rose-900/40 bg-rose-950/20">
          <CardBody className="p-6 text-center space-y-3">
            <AlertCircle className="h-8 w-8 text-rose-400 mx-auto" />
            <h3 className="text-sm font-semibold text-rose-200">Failed to Load Claims</h3>
            <p className="text-xs text-rose-300/80 max-w-sm mx-auto">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchMyClaims}>
              Try Again
            </Button>
          </CardBody>
        </Card>
      ) : filteredClaims.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900/40">
          <CardBody className="py-16 text-center space-y-4">
            <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto">
              <FileText className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-200">
                {claims.length === 0 ? 'No Expense Claims Yet' : 'No Matching Claims Found'}
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                {claims.length === 0
                  ? 'You have not submitted any expense claims yet. When you submit a claim, it will appear here for end-to-end status tracking.'
                  : 'Try clearing your filters or search terms to see your claims.'}
              </p>
            </div>
            {claims.length === 0 ? (
              <Link to="/claims/new">
                <Button size="sm" icon={Plus}>
                  Submit Your First Claim
                </Button>
              </Link>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                }}
              >
                Clear Filters
              </Button>
            )}
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredClaims.map((claim) => (
            <div
              key={claim._id}
              className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all space-y-4"
            >
              {/* Row 1: Header info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
                    <Tag className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-100">{claim.category}</span>
                      <span className="text-xs text-slate-500">•</span>
                      <span className="text-xs text-slate-400 font-medium">{formatDate(claim.date)}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1 max-w-xl">
                      {claim.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-center">
                  <div className="text-right">
                    <span className="text-base font-bold font-mono text-slate-100 block">
                      {formatAmount(claim.amount, claim.currency)}
                    </span>
                    <span className="text-[10px] text-slate-500 block font-mono">
                      Receipt: {claim.receiptAvailable ? 'Attached' : 'Missing'}
                    </span>
                  </div>
                  <Link to={`/my-claims/${claim._id}`}>
                    <Button variant="outline" size="sm" icon={ChevronRight}>
                      Details
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Clarification Request Alert Banner (if pending) */}
              {claim.clarification?.requested && !claim.clarification?.resolved && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>
                      <strong>Action Required:</strong> Policy reviewer requested clarification —{' '}
                      <span className="italic text-amber-200">"{claim.clarification.message}"</span>
                    </span>
                  </div>
                  <Link to={`/my-claims/${claim._id}`} className="ml-2 shrink-0">
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-400 hover:text-amber-300 underline underline-offset-2">
                      Respond Now →
                    </span>
                  </Link>
                </div>
              )}

              {/* Row 2: Status chips & Review badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-800/60 text-xs">
                {/* Overall Claim Status */}
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">Overall Status</span>
                  <ClaimStatusBadge status={claim.status} clarification={claim.clarification} />
                </div>

                {/* Validation Status */}
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">Validation</span>
                  <ValidationBadge validationResults={claim.validationResults} />
                </div>

                {/* AI Review Status */}
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">AI Policy Review</span>
                  <div className="flex items-center gap-1.5">
                    <AiReviewBadge status={claim.aiReview?.reviewStatus} />
                    {claim.aiReview?.classification?.confidence !== undefined && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({Math.round(claim.aiReview.classification.confidence * 100)}%)
                      </span>
                    )}
                  </div>
                </div>

                {/* Reviewer Decision */}
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">Reviewer Decision</span>
                  <ReviewerDecisionBadge decision={claim.reviewerDecision?.decision} />
                </div>
              </div>

              {/* Row 3: Timestamps */}
              <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1">
                <span className="font-mono">ID: {claim._id}</span>
                <span>Submitted: {formatDateTime(claim.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyClaimsPage;
