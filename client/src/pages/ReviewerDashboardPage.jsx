import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  ArrowUpRight,
  Receipt,
  User,
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import Card, { CardHeader, CardBody } from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import { getClaims } from '../api/claimApi';

const CATEGORIES = [
  'All',
  'Travel',
  'Meals & Entertainment',
  'Equipment',
  'Office Supplies',
  'Training',
  'Medical',
  'Other',
];

const CLAIM_STATUSES = ['All', 'PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'];

const AI_STATUSES = [
  'All',
  'COMPLIANT',
  'NON_COMPLIANT',
  'NEEDS_CLARIFICATION',
  'UNCERTAIN',
  'NOT_REVIEWED',
];

export const ReviewerDashboardPage = () => {
  const [claims, setClaims] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedAiStatus, setSelectedAiStatus] = useState('All');

  // Fetch real claims from API
  const fetchClaims = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getClaims();
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

  // Format currency
  const formatAmount = (amount, currency = 'INR') => {
    const symbols = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };
    const sym = symbols[currency?.toUpperCase()] || `${currency} `;
    return `${sym}${Number(amount || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Format date
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

  // KPI Calculations
  const kpis = useMemo(() => {
    const total = claims.length;
    const pending = claims.filter((c) => c.status?.toUpperCase() === 'PENDING').length;
    const underReview = claims.filter((c) => c.status?.toUpperCase() === 'UNDER_REVIEW').length;
    const approved = claims.filter((c) => c.status?.toUpperCase() === 'APPROVED').length;
    const rejected = claims.filter((c) => c.status?.toUpperCase() === 'REJECTED').length;
    return { total, pending, underReview, approved, rejected };
  }, [claims]);

  // Client-side Filter Logic
  const filteredClaims = useMemo(() => {
    return claims.filter((claim) => {
      // 1. Text search (claimant, category, description)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const claimantMatch = (claim.claimant || '').toLowerCase().includes(q);
        const categoryMatch = (claim.category || '').toLowerCase().includes(q);
        const descMatch = (claim.description || '').toLowerCase().includes(q);
        if (!claimantMatch && !categoryMatch && !descMatch) {
          return false;
        }
      }

      // 2. Claim status filter
      if (selectedStatus !== 'All' && claim.status?.toUpperCase() !== selectedStatus) {
        return false;
      }

      // 3. Category filter
      if (selectedCategory !== 'All' && claim.category !== selectedCategory) {
        return false;
      }

      // 4. AI review status filter
      if (selectedAiStatus !== 'All') {
        const reviewStatus = claim.aiReview?.reviewStatus?.toUpperCase();
        if (selectedAiStatus === 'NOT_REVIEWED') {
          if (reviewStatus) return false;
        } else if (reviewStatus !== selectedAiStatus) {
          return false;
        }
      }

      return true;
    });
  }, [claims, searchQuery, selectedStatus, selectedCategory, selectedAiStatus]);

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedStatus('All');
    setSelectedCategory('All');
    setSelectedAiStatus('All');
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedStatus !== 'All' ||
    selectedCategory !== 'All' ||
    selectedAiStatus !== 'All';

  // Badge helpers
  const renderClaimStatusBadge = (status) => {
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

  const renderValidationBadge = (validation) => {
    if (!validation || validation.valid === null || validation.valid === undefined) {
      return <Badge variant="neutral">NOT VALIDATED</Badge>;
    }
    if (validation.valid === true) {
      return <Badge variant="success">VALID</Badge>;
    }
    const issueCount = validation.issues?.length || 1;
    return (
      <Badge variant="error">
        {issueCount} {issueCount === 1 ? 'ISSUE' : 'ISSUES'}
      </Badge>
    );
  };

  const renderAiReviewBadge = (aiReview) => {
    if (!aiReview || !aiReview.reviewStatus) {
      return <Badge variant="neutral">NOT REVIEWED</Badge>;
    }
    switch (aiReview.reviewStatus?.toUpperCase()) {
      case 'COMPLIANT':
        return <Badge variant="success">COMPLIANT</Badge>;
      case 'NON_COMPLIANT':
        return <Badge variant="error">NON-COMPLIANT</Badge>;
      case 'NEEDS_CLARIFICATION':
        return <Badge variant="warning">CLARIFICATION</Badge>;
      case 'UNCERTAIN':
        return <Badge variant="purple">UNCERTAIN</Badge>;
      default:
        return <Badge variant="neutral">{aiReview.reviewStatus}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">
              Reviewer Dashboard
            </h1>
            <Badge variant="purple" className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              AI Powered
            </Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Authoritative deterministic policy validation with grounded AI-assisted compliance analysis.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchClaims}
            isLoading={isLoading}
            icon={RefreshCw}
          >
            Refresh Queue
          </Button>
          <Link to="/claims/new">
            <Button variant="primary" size="sm">
              + New Claim
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Total Claims */}
        <Card className="border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-colors">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Total Claims
              </span>
              <FileText className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-100">
              {isLoading ? '—' : kpis.total}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Submitted claims queue</p>
          </CardBody>
        </Card>

        {/* Pending Review */}
        <Card className="border-slate-800 bg-slate-900/60 hover:border-amber-500/30 transition-colors">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-400 uppercase tracking-wider">
                Pending
              </span>
              <Clock className="h-4 w-4 text-amber-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-300">
              {isLoading ? '—' : kpis.pending}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Awaiting reviewer triage</p>
          </CardBody>
        </Card>

        {/* Under Review */}
        <Card className="border-slate-800 bg-slate-900/60 hover:border-purple-500/30 transition-colors">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-purple-400 uppercase tracking-wider">
                Under Review
              </span>
              <AlertTriangle className="h-4 w-4 text-purple-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-purple-300">
              {isLoading ? '—' : kpis.underReview}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Flagged / policy violation</p>
          </CardBody>
        </Card>

        {/* Approved */}
        <Card className="border-slate-800 bg-slate-900/60 hover:border-emerald-500/30 transition-colors">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">
                Approved
              </span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-300">
              {isLoading ? '—' : kpis.approved}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Cleared for payment</p>
          </CardBody>
        </Card>

        {/* Rejected */}
        <Card className="border-slate-800 bg-slate-900/60 hover:border-rose-500/30 transition-colors">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-rose-400 uppercase tracking-wider">
                Rejected
              </span>
              <XCircle className="h-4 w-4 text-rose-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-rose-300">
              {isLoading ? '—' : kpis.rejected}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Disallowed claims</p>
          </CardBody>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-slate-800 bg-slate-900/70">
        <CardBody className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search claimant, category, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="grid grid-cols-3 gap-2">
              {/* Claim Status */}
              <div>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-medium text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
                >
                  <option value="All">Status: All</option>
                  {CLAIM_STATUSES.filter((s) => s !== 'All').map((s) => (
                    <option key={s} value={s}>
                      {s.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-medium text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
                >
                  <option value="All">Category: All</option>
                  {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* AI Review Status */}
              <div>
                <select
                  value={selectedAiStatus}
                  onChange={(e) => setSelectedAiStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-medium text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
                >
                  <option value="All">AI: All</option>
                  {AI_STATUSES.filter((s) => s !== 'All').map((s) => (
                    <option key={s} value={s}>
                      {s.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Reset Filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                icon={RotateCcw}
                className="whitespace-nowrap"
              >
                Reset
              </Button>
            )}
          </div>

          {/* Active Filter Indicators */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/60">
            <div>
              Showing <span className="font-semibold text-slate-200">{filteredClaims.length}</span>{' '}
              of <span className="font-semibold text-slate-200">{claims.length}</span> claims
            </div>
            {hasActiveFilters && (
              <span className="text-indigo-400 font-medium">Filters active</span>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Claims Table / List Card */}
      <Card className="border-slate-800 bg-slate-900/60 shadow-xl overflow-hidden">
        {/* Loading State */}
        {isLoading ? (
          <div className="p-12 text-center space-y-3">
            <div className="h-8 w-8 mx-auto border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Loading claims from database...</p>
          </div>
        ) : error ? (
          /* Error State */
          <div className="p-8 text-center space-y-3">
            <div className="h-10 w-10 mx-auto rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400">
              <AlertCircle className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-rose-400">{error}</p>
            <Button variant="secondary" size="sm" onClick={fetchClaims}>
              Try Again
            </Button>
          </div>
        ) : filteredClaims.length === 0 ? (
          /* Empty State */
          <div className="p-12 text-center space-y-3">
            <div className="h-12 w-12 mx-auto rounded-2xl bg-slate-800/60 flex items-center justify-center text-slate-400">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-200">
              {claims.length === 0 ? 'No expense claims submitted' : 'No matching claims found'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {claims.length === 0
                ? 'Expense claims submitted through the portal will appear here for audit and policy review.'
                : 'No claims match your search keywords or filter criteria. Try clearing active filters.'}
            </p>
            {hasActiveFilters && (
              <Button variant="secondary" size="sm" onClick={resetFilters}>
                Clear All Filters
              </Button>
            )}
          </div>
        ) : (
          /* Data Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Claimant</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-3 text-center">Receipt</th>
                  <th className="py-3 px-3">Claim Status</th>
                  <th className="py-3 px-3">Validation</th>
                  <th className="py-3 px-3">AI Review</th>
                  <th className="py-3 px-3 text-center">Confidence</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredClaims.map((claim) => {
                  const confidence = claim.aiReview?.classification?.confidence;
                  const confidencePct =
                    confidence !== undefined ? Math.round(confidence * 100) : null;

                  return (
                    <tr
                      key={claim._id}
                      className="hover:bg-slate-800/30 transition-colors group"
                    >
                      {/* Claimant */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
                            {claim.claimant?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-200">
                              {claim.claimant}
                            </div>
                            <div className="text-[11px] text-slate-400 line-clamp-1 max-w-[180px]">
                              {claim.description}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-3 text-slate-400 whitespace-nowrap">
                        {formatDate(claim.date)}
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="text-slate-300 font-medium">
                          {claim.category}
                        </span>
                      </td>

                      {/* Amount & Currency */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono font-semibold text-slate-100">
                        {formatAmount(claim.amount, claim.currency)}
                      </td>

                      {/* Receipt */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        {claim.receiptAvailable ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            <Receipt className="h-3 w-3" /> Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                            <XCircle className="h-3 w-3" /> No
                          </span>
                        )}
                      </td>

                      {/* Claim Status */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {renderClaimStatusBadge(claim.status)}
                      </td>

                      {/* Validation Status */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {renderValidationBadge(claim.validationResults)}
                      </td>

                      {/* AI Review Status */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {renderAiReviewBadge(claim.aiReview)}
                      </td>

                      {/* AI Confidence */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap font-mono">
                        {confidencePct !== null ? (
                          <span
                            className={`text-xs font-semibold ${
                              confidencePct >= 85
                                ? 'text-emerald-400'
                                : confidencePct >= 70
                                ? 'text-amber-400'
                                : 'text-purple-400'
                            }`}
                          >
                            {confidencePct}%
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Action Button */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Link to={`/reviewer/claims/${claim._id}`}>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="text-xs group-hover:border-indigo-500/50 group-hover:text-indigo-300"
                            icon={ArrowUpRight}
                          >
                            Review
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ReviewerDashboardPage;
