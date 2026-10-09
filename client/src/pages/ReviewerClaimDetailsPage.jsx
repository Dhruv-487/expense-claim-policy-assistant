import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Info,
  Receipt,
  CalendarDays,
  User,
  Tag,
  DollarSign,
  BookOpen,
  Cpu,
  ScrollText,
  CircleDot,
  ChevronRight,
  BadgeCheck,
  Eye,
  Gavel,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  ShieldAlert,
  X,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import Card, { CardBody } from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import { getClaimById, submitReviewerDecision, getClaimAuditHistory, reviewClaim } from '../api/claimApi';

// ─── Helpers ───────────────────────────────────────────────
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
      weekday: 'short',
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

// ─── Sub-components ────────────────────────────────────────

/** Reusable section wrapper with icon + title */
const SectionCard = ({ icon: Icon, title, subtitle, badge, children, className = '' }) => (
  <Card className={`border-slate-800 bg-slate-900/60 ${className}`}>
    <div className="p-5 border-b border-slate-800/60 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-100 tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {badge && <div>{badge}</div>}
    </div>
    <CardBody className="p-5">{children}</CardBody>
  </Card>
);

/** Data row inside info card */
const InfoRow = ({ label, value, icon: Icon, mono = false }) => (
  <div className="flex items-start gap-3 py-2.5 border-b border-slate-800/40 last:border-0">
    {Icon && (
      <div className="mt-0.5 h-5 w-5 flex-shrink-0 text-slate-500">
        <Icon className="h-4 w-4" />
      </div>
    )}
    <div className="flex-1 min-w-0">
      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 block">{label}</span>
      <span className={`text-sm text-slate-200 mt-0.5 block ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</span>
    </div>
  </div>
);

/** Claim status badge */
const ClaimStatusBadge = ({ status }) => {
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

/** AI review status badge */
const AiStatusBadge = ({ status }) => {
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

/** Reviewer decision badge */
const ReviewerDecisionBadge = ({ decision }) => {
  switch (decision?.toUpperCase()) {
    case 'APPROVED':
      return <Badge variant="success">APPROVED</Badge>;
    case 'REJECTED':
      return <Badge variant="error">REJECTED</Badge>;
    case 'CLARIFICATION_REQUESTED':
      return <Badge variant="warning">CLARIFICATION REQUESTED</Badge>;
    case 'OVERRIDDEN':
      return <Badge variant="purple">OVERRIDDEN</Badge>;
    default:
      return <Badge variant="neutral">NO DECISION</Badge>;
  }
};

/** Audit action badge */
const AuditActionBadge = ({ action }) => {
  switch (action) {
    case 'CLAIM_CREATED':
      return <Badge variant="info">CLAIM CREATED</Badge>;
    case 'CLAIM_VALIDATED':
      return <Badge variant="success">CLAIM VALIDATED</Badge>;
    case 'AI_REVIEWED':
      return <Badge variant="purple">AI REVIEWED</Badge>;
    case 'REVIEWER_DECISION':
      return <Badge variant="warning">REVIEWER DECISION</Badge>;
    case 'CLARIFICATION_RESPONDED':
      return <Badge variant="warning">CLARIFICATION RESPONDED</Badge>;
    default:
      return <Badge variant="neutral">{action}</Badge>;
  }
};

/** Audit actor type badge */
const ActorTypeBadge = ({ actorType }) => {
  if (actorType === 'REVIEWER') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/25">
        <User className="h-3 w-3 text-indigo-400" /> REVIEWER
      </span>
    );
  }
  if (actorType === 'EMPLOYEE') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
        <User className="h-3 w-3 text-emerald-400" /> EMPLOYEE
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700/60">
      <Cpu className="h-3 w-3 text-cyan-400" /> SYSTEM
    </span>
  );
};

/** Confidence bar */
const ConfidenceBar = ({ confidence, uncertain }) => {
  if (confidence === null || confidence === undefined) {
    return (
      <div className="text-sm text-slate-400 italic">Confidence data unavailable</div>
    );
  }
  const pct = Math.round(confidence * 100);
  const barColor =
    pct >= 85
      ? 'bg-emerald-500'
      : pct >= 70
      ? 'bg-amber-500'
      : 'bg-rose-500';
  const textColor =
    pct >= 85
      ? 'text-emerald-400'
      : pct >= 70
      ? 'text-amber-400'
      : 'text-rose-400';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400 font-medium">AI Confidence Level</span>
        <span className={`text-lg font-bold font-mono ${textColor}`}>{pct}%</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
      {uncertain && (
        <div className="flex items-center gap-2 mt-1 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
          <span className="text-xs text-amber-300 font-medium">
            The AI flagged this review as uncertain — human judgement is strongly recommended.
          </span>
        </div>
      )}
    </div>
  );
};

/** Validation check row */
const CheckRow = ({ label, passed }) => {
  if (passed === null || passed === undefined) {
    return (
      <div className="flex items-center gap-2.5 py-1.5">
        <CircleDot className="h-4 w-4 text-slate-500" />
        <span className="text-sm text-slate-400">{label}</span>
        <Badge variant="neutral">Pending</Badge>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      {passed ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
      ) : (
        <XCircle className="h-4 w-4 text-rose-400" />
      )}
      <span className={`text-sm ${passed ? 'text-slate-300' : 'text-rose-300 font-medium'}`}>{label}</span>
      {passed ? (
        <Badge variant="success">Pass</Badge>
      ) : (
        <Badge variant="error">Fail</Badge>
      )}
    </div>
  );
};

// ─── CHECK LABEL MAP ───────────────────────────────────────
const CHECK_LABELS = {
  requiredFields: 'Required Fields',
  amount: 'Amount Validity',
  categoryLimit: 'Category Limit',
  receipt: 'Receipt Verification',
  date: 'Date Validation',
  duplicate: 'Duplicate Detection',
};

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export const ReviewerClaimDetailsPage = () => {
  const { id } = useParams();
  const [claim, setClaim] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // ─── Decision workflow state ─────────────────────────────
  const [activeModal, setActiveModal] = useState(null); // 'APPROVED' | 'REJECTED' | 'CLARIFICATION_REQUESTED' | 'OVERRIDDEN' | null
  const [decisionNotes, setDecisionNotes] = useState('');
  const [overrideStatus, setOverrideStatus] = useState('APPROVED');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [decisionError, setDecisionError] = useState(null);
  const [decisionSuccess, setDecisionSuccess] = useState(null);

  // ─── Audit trail state ───────────────────────────────────
  const [auditLogs, setAuditLogs] = useState([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [auditError, setAuditError] = useState(null);

  // ─── AI Policy Review execution state ────────────────────
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewError, setReviewError] = useState(null);
  const reviewInProgressRef = useRef(false);

  const fetchAuditHistory = useCallback(async () => {
    setIsLoadingAudit(true);
    setAuditError(null);
    try {
      const response = await getClaimAuditHistory(id);
      setAuditLogs(response.data || []);
    } catch (err) {
      setAuditError(err.message || 'Failed to load audit history');
    } finally {
      setIsLoadingAudit(false);
    }
  }, [id]);

  const fetchClaim = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setReviewError(null);
    try {
      const response = await getClaimById(id);
      const claimData = response.data;
      setClaim(claimData);

      // If claim has not already been reviewed, trigger the existing backend review workflow
      const hasAiReview = Boolean(claimData?.aiReview?.reviewStatus);
      if (!hasAiReview && !reviewInProgressRef.current) {
        reviewInProgressRef.current = true;
        setIsReviewing(true);
        try {
          await reviewClaim(id);
          // Refetch claim so complete validation, AI review, and timeline are loaded
          const updatedResponse = await getClaimById(id);
          setClaim(updatedResponse.data);
          // Refetch audit trail to display newly recorded audit events
          fetchAuditHistory();
        } catch (revErr) {
          console.error('Failed to run automated policy review:', revErr);
          setReviewError(
            revErr.response?.data?.message ||
            revErr.message ||
            'Automated policy review could not be completed'
          );
        } finally {
          setIsReviewing(false);
          reviewInProgressRef.current = false;
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load claim');
    } finally {
      setIsLoading(false);
    }
  }, [id, fetchAuditHistory]);

  const triggerManualReview = async () => {
    if (reviewInProgressRef.current) return;
    reviewInProgressRef.current = true;
    setIsReviewing(true);
    setReviewError(null);
    try {
      await reviewClaim(id);
      const updatedResponse = await getClaimById(id);
      setClaim(updatedResponse.data);
      fetchAuditHistory();
    } catch (revErr) {
      setReviewError(
        revErr.response?.data?.message ||
        revErr.message ||
        'Automated policy review could not be completed'
      );
    } finally {
      setIsReviewing(false);
      reviewInProgressRef.current = false;
    }
  };

  useEffect(() => {
    fetchClaim();
    fetchAuditHistory();
  }, [fetchClaim, fetchAuditHistory]);

  // ─── Decision handlers ───────────────────────────────────
  const openModal = (type) => {
    setActiveModal(type);
    setDecisionNotes('');
    setOverrideStatus('APPROVED');
    setDecisionError(null);
    setDecisionSuccess(null);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setActiveModal(null);
    setDecisionNotes('');
    setDecisionError(null);
  };

  const handleSubmitDecision = async () => {
    setDecisionError(null);
    setIsSubmitting(true);
    try {
      const payload = { decision: activeModal };
      if (decisionNotes.trim()) payload.notes = decisionNotes.trim();
      if (activeModal === 'OVERRIDDEN') payload.overrideStatus = overrideStatus;

      const response = await submitReviewerDecision(id, payload);
      setClaim(response.data);
      setDecisionSuccess(
        activeModal === 'OVERRIDDEN'
          ? `Decision recorded: OVERRIDDEN → ${overrideStatus}`
          : `Decision recorded: ${activeModal}`
      );
      setActiveModal(null);
      setDecisionNotes('');
      // Refresh audit trail immediately
      await fetchAuditHistory();
    } catch (err) {
      setDecisionError(err.response?.data?.message || err.message || 'Failed to submit decision');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = () => {
    if (isSubmitting) return false;
    if (activeModal === 'REJECTED' && !decisionNotes.trim()) return false;
    if (activeModal === 'CLARIFICATION_REQUESTED' && !decisionNotes.trim()) return false;
    if (activeModal === 'OVERRIDDEN' && !decisionNotes.trim()) return false;
    return true;
  };

  // ─── Loading ─────────────────────────────────────────────
  if (isLoading || isReviewing) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="h-10 w-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-base font-semibold text-slate-100">
          {isReviewing ? 'Running policy review…' : 'Loading claim details…'}
        </p>
        <p className="text-xs text-slate-400 max-w-sm text-center">
          {isReviewing
            ? 'Evaluating deterministic validation rules, retrieving grounded policy evidence, and generating AI analysis…'
            : 'Retrieving claim records from server…'}
        </p>
      </div>
    );
  }

  // ─── Error / Not Found ───────────────────────────────────
  if (error || !claim) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-4">
        <div className="h-14 w-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-semibold text-slate-100">
          {error ? 'Error Loading Claim' : 'Claim Not Found'}
        </h2>
        <p className="text-sm text-slate-400 max-w-sm mx-auto">
          {error || `No claim exists with ID "${id}". It may have been deleted or the URL is incorrect.`}
        </p>
        <Link to="/reviewer">
          <Button variant="secondary" icon={ArrowLeft}>Back to Reviewer Dashboard</Button>
        </Link>
      </div>
    );
  }

  // ─── Derived data ────────────────────────────────────────
  const vr = claim.validationResults;
  const ai = claim.aiReview;
  const hasValidation = vr && vr.validatedAt;
  const hasAiReview = ai && ai.reviewStatus;
  const confidence = ai?.classification?.confidence;
  const uncertain = ai?.classification?.uncertain;
  const policyEvidence = ai?.policyEvidence || [];

  // ─── Render ──────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ─── PAGE HEADER ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/reviewer">
            <Button variant="ghost" icon={ArrowLeft} size="sm">
              Back to Dashboard
            </Button>
          </Link>
          <div className="h-6 w-px bg-slate-800 hidden sm:block" />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-100">
              Review Expense Claim
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {id}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ClaimStatusBadge status={claim.status} />
          {hasAiReview && <AiStatusBadge status={ai.reviewStatus} />}
        </div>
      </div>

      {/* ─── REVIEW ERROR ALERT ──────────────────────────── */}
      {reviewError && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <span>Automated policy review notice: {reviewError}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={triggerManualReview}
            disabled={isReviewing}
            icon={RotateCcw}
          >
            Retry Review
          </Button>
        </div>
      )}

      {/* ─── TOP SUMMARY STRIP ───────────────────────────── */}
      <Card className="border-slate-800 bg-slate-900/70">
        <CardBody className="p-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center gap-2 text-slate-300">
              <User className="h-4 w-4 text-indigo-400" />
              <span className="font-semibold">{claim.claimant}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <CalendarDays className="h-4 w-4" />
              <span>{formatDate(claim.date)}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Tag className="h-4 w-4" />
              <span>{claim.category}</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              <span className="font-mono font-bold text-slate-100">
                {formatAmount(claim.amount, claim.currency)}
              </span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ─── CLAIM INFORMATION ───────────────────────────── */}
      <SectionCard
        icon={FileText}
        title="Claim Information"
        subtitle="Submitted expense details"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <div>
            <InfoRow icon={User} label="Claimant" value={claim.claimant} />
            <InfoRow icon={CalendarDays} label="Expense Date" value={formatDate(claim.date)} />
            <InfoRow icon={Tag} label="Category" value={claim.category} />
            <InfoRow icon={DollarSign} label="Amount" value={formatAmount(claim.amount, claim.currency)} mono />
          </div>
          <div>
            <InfoRow icon={DollarSign} label="Currency" value={claim.currency} />
            <InfoRow
              icon={Receipt}
              label="Receipt Available"
              value={
                claim.receiptAvailable ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Yes — Receipt provided
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-rose-400">
                    <XCircle className="h-3.5 w-3.5" /> No receipt
                  </span>
                )
              }
            />
            <InfoRow icon={CircleDot} label="Claim Status" value={<ClaimStatusBadge status={claim.status} />} />
            <InfoRow icon={Clock} label="Submitted At" value={formatDateTime(claim.createdAt)} />
          </div>
        </div>
        {/* Description full-width */}
        <div className="mt-3 pt-3 border-t border-slate-800/40">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 block mb-1.5">Description</span>
          <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/40 rounded-xl px-4 py-3 border border-slate-800/60">
            {claim.description || '—'}
          </p>
        </div>
      </SectionCard>

      {/* ─── TWO-COLUMN: Validation + AI Review / Policy ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─── LEFT COLUMN ─────────────────────────────── */}
        <div className="space-y-6">

          {/* ─── DETERMINISTIC VALIDATION ─────────────── */}
          <SectionCard
            icon={ShieldCheck}
            title="Deterministic Validation"
            subtitle={hasValidation ? `Validated ${formatDateTime(vr.validatedAt)}` : 'Rule-based policy check'}
            badge={
              !hasValidation ? (
                <Badge variant="neutral">NOT VALIDATED</Badge>
              ) : vr.valid ? (
                <Badge variant="success">ALL CHECKS PASSED</Badge>
              ) : (
                <Badge variant="error">ISSUES FOUND</Badge>
              )
            }
          >
            {!hasValidation ? (
              <div className="text-center py-6 space-y-2">
                <div className="h-10 w-10 mx-auto rounded-xl bg-slate-800/60 flex items-center justify-center text-slate-400">
                  <Clock className="h-5 w-5" />
                </div>
                <p className="text-sm text-slate-400">
                  Deterministic validation has not been run yet for this claim.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Individual checks */}
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                    Rule Checks
                  </span>
                  <div className="space-y-0.5 bg-slate-950/40 rounded-xl px-4 py-2 border border-slate-800/60">
                    {vr.checks &&
                      Object.entries(vr.checks).map(([key, passed]) => (
                        <CheckRow key={key} label={CHECK_LABELS[key] || key} passed={passed} />
                      ))}
                  </div>
                </div>

                {/* Issues */}
                {vr.issues && vr.issues.length > 0 && (
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-400 block mb-2">
                      Issues ({vr.issues.length})
                    </span>
                    <div className="space-y-2">
                      {vr.issues.map((issue, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 px-4 py-3 rounded-xl bg-rose-500/5 border border-rose-500/15"
                        >
                          <XCircle className="h-4 w-4 text-rose-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs font-semibold text-rose-300 font-mono">{issue.rule}</span>
                              <Badge variant="error">{issue.severity}</Badge>
                            </div>
                            <p className="text-sm text-slate-300">{issue.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Warnings */}
                {vr.warnings && vr.warnings.length > 0 && (
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 block mb-2">
                      Warnings ({vr.warnings.length})
                    </span>
                    <div className="space-y-2">
                      {vr.warnings.map((warn, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-500/5 border border-amber-500/15"
                        >
                          <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs font-semibold text-amber-300 font-mono">{warn.rule}</span>
                              <Badge variant="warning">{warn.severity}</Badge>
                            </div>
                            <p className="text-sm text-slate-300">{warn.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Clean validation */}
                {vr.valid && (!vr.issues || vr.issues.length === 0) && (!vr.warnings || vr.warnings.length === 0) && (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    <p className="text-sm text-emerald-300 font-medium">
                      All deterministic policy checks passed with no issues or warnings.
                    </p>
                  </div>
                )}
              </div>
            )}
          </SectionCard>

          {/* ─── AI REVIEW RESULTS ────────────────────── */}
          <SectionCard
            icon={Sparkles}
            title="AI Policy Review"
            subtitle={hasAiReview ? `Reviewed ${formatDateTime(ai.reviewedAt)}` : 'Gemini-powered compliance analysis'}
            badge={hasAiReview ? <AiStatusBadge status={ai.reviewStatus} /> : <Badge variant="neutral">NOT REVIEWED</Badge>}
          >
            {!hasAiReview ? (
              <div className="text-center py-6 space-y-3">
                <div className="h-10 w-10 mx-auto rounded-xl bg-slate-800/60 flex items-center justify-center text-slate-400">
                  <Sparkles className="h-5 w-5" />
                </div>
                <p className="text-sm text-slate-400">
                  AI policy review has not been performed for this claim yet.
                </p>
                <Button
                  size="sm"
                  onClick={triggerManualReview}
                  disabled={isReviewing}
                  icon={Sparkles}
                >
                  Run AI Policy Review
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Confidence */}
                <ConfidenceBar confidence={confidence} uncertain={uncertain} />

                {/* Classification */}
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                    Classification
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="px-4 py-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
                      <span className="text-[11px] text-slate-500 uppercase block">Category</span>
                      <span className="text-sm font-semibold text-slate-200">{ai.classification?.category || '—'}</span>
                    </div>
                    <div className="px-4 py-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
                      <span className="text-[11px] text-slate-500 uppercase block">Review Status</span>
                      <AiStatusBadge status={ai.reviewStatus} />
                    </div>
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                    AI Review Reason
                  </span>
                  <div className="px-4 py-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{ai.reason || '—'}</p>
                  </div>
                </div>

                {/* Missing Information */}
                {ai.missingInformation && ai.missingInformation.length > 0 && (
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 block mb-2">
                      Missing Information
                    </span>
                    <ul className="space-y-1.5">
                      {ai.missingInformation.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 px-4 py-2 rounded-lg bg-amber-500/5 border border-amber-500/15">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-amber-200">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Provider metadata */}
                <div className="flex items-center gap-4 pt-2 border-t border-slate-800/40 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Cpu className="h-3 w-3" /> Provider: {ai.provider || '—'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Cpu className="h-3 w-3" /> Model: {ai.model || '—'}
                  </span>
                </div>
              </div>
            )}
          </SectionCard>
        </div>

        {/* ─── RIGHT COLUMN ────────────────────────────── */}
        <div className="space-y-6">

          {/* ─── POLICY EVIDENCE ──────────────────────── */}
          <SectionCard
            icon={BookOpen}
            title="Retrieved Policy Evidence"
            subtitle="Grounded corporate policy sections used during AI review"
            badge={
              policyEvidence.length > 0 ? (
                <Badge variant="info">{policyEvidence.length} {policyEvidence.length === 1 ? 'section' : 'sections'}</Badge>
              ) : null
            }
          >
            {!hasAiReview ? (
              <div className="text-center py-6 space-y-2">
                <div className="h-10 w-10 mx-auto rounded-xl bg-slate-800/60 flex items-center justify-center text-slate-400">
                  <BookOpen className="h-5 w-5" />
                </div>
                <p className="text-sm text-slate-400">
                  Policy evidence is not available until AI review is performed.
                </p>
              </div>
            ) : policyEvidence.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <div className="h-10 w-10 mx-auto rounded-xl bg-slate-800/60 flex items-center justify-center text-slate-400">
                  <ScrollText className="h-5 w-5" />
                </div>
                <p className="text-sm text-slate-400">
                  No policy sections were referenced during AI review.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-500/5 border border-indigo-500/15">
                  <Info className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
                  <span className="text-xs text-indigo-300">
                    These are verbatim corporate policy sections retrieved from the policy document — not AI-generated content.
                  </span>
                </div>

                {policyEvidence.map((evidence, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-800/60 overflow-hidden"
                  >
                    {/* Header */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-slate-950/60 border-b border-slate-800/40">
                      <div className="h-7 w-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-indigo-400 font-mono">
                          {evidence.sectionId || '#'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold text-slate-200 block truncate">
                          {evidence.sectionTitle || `Section ${evidence.sectionId}`}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Section {evidence.sectionId}
                        </span>
                      </div>
                      <Badge variant="info">Policy</Badge>
                    </div>
                    {/* Body text */}
                    <div className="px-4 py-3 bg-slate-950/30">
                      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {evidence.text || 'Policy text not available.'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* ─── REVIEW TIMELINE / METADATA ───────────── */}
          <SectionCard
            icon={Clock}
            title="Review Timeline"
            subtitle="Processing timestamps for this claim"
          >
            <div className="relative pl-6 space-y-4">
              {/* Vertical line */}
              <div className="absolute left-[9px] top-2 bottom-2 w-px bg-slate-800" />

              {/* Created */}
              <div className="relative flex items-start gap-3">
                <div className="absolute left-[-15px] top-1 h-3 w-3 rounded-full bg-indigo-500 border-2 border-slate-900" />
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">Claim Submitted</span>
                  <span className="text-xs text-slate-400">{formatDateTime(claim.createdAt)}</span>
                </div>
              </div>

              {/* Validated */}
              <div className="relative flex items-start gap-3">
                <div className={`absolute left-[-15px] top-1 h-3 w-3 rounded-full border-2 border-slate-900 ${
                  hasValidation ? 'bg-emerald-500' : 'bg-slate-600'
                }`} />
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">Deterministic Validation</span>
                  <span className="text-xs text-slate-400">
                    {hasValidation ? formatDateTime(vr.validatedAt) : 'Pending'}
                  </span>
                </div>
              </div>

              {/* AI Reviewed */}
              <div className="relative flex items-start gap-3">
                <div className={`absolute left-[-15px] top-1 h-3 w-3 rounded-full border-2 border-slate-900 ${
                  hasAiReview ? 'bg-purple-500' : 'bg-slate-600'
                }`} />
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">AI Policy Review</span>
                  <span className="text-xs text-slate-400">
                    {hasAiReview ? formatDateTime(ai.reviewedAt) : 'Pending'}
                  </span>
                </div>
              </div>

              {/* Human decision */}
              <div className="relative flex items-start gap-3">
                <div className={`absolute left-[-15px] top-1 h-3 w-3 rounded-full border-2 border-slate-900 ${
                  claim.reviewerDecision?.decidedAt ? 'bg-amber-500' : 'bg-slate-600'
                }`} />
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">Human Reviewer Decision</span>
                  <span className="text-xs text-slate-400">
                    {claim.reviewerDecision?.decidedAt
                      ? formatDateTime(claim.reviewerDecision.decidedAt)
                      : 'Awaiting reviewer action'}
                  </span>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* ─── PREVIOUS REVIEWER DECISION ────────────────────── */}
      {claim.reviewerDecision?.decision && (
        <SectionCard
          icon={Gavel}
          title="Previous Reviewer Decision"
          subtitle={`Decided ${formatDateTime(claim.reviewerDecision.decidedAt)}`}
          badge={
            <ReviewerDecisionBadge decision={claim.reviewerDecision.decision} />
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="px-4 py-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
                <span className="text-[11px] text-slate-500 uppercase block">Decision</span>
                <ReviewerDecisionBadge decision={claim.reviewerDecision.decision} />
              </div>
              <div className="px-4 py-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
                <span className="text-[11px] text-slate-500 uppercase block">Final Status</span>
                <ClaimStatusBadge status={claim.status} />
              </div>
              <div className="px-4 py-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
                <span className="text-[11px] text-slate-500 uppercase block">Previous Status</span>
                <span className="text-sm text-slate-300 font-mono">{claim.reviewerDecision.previousStatus || '—'}</span>
              </div>
              <div className="px-4 py-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
                <span className="text-[11px] text-slate-500 uppercase block">AI Recommendation</span>
                <span className="text-sm text-slate-300 font-mono">{claim.reviewerDecision.previousAIReviewStatus || '—'}</span>
              </div>
            </div>

            {claim.reviewerDecision.override && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                <span className="text-xs text-amber-300 font-medium">
                  This decision overrode the AI recommendation. Override final status: {claim.reviewerDecision.overrideStatus}
                </span>
              </div>
            )}

            {claim.reviewerDecision.notes && (
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">Reviewer Notes</span>
                <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/40 rounded-xl px-4 py-3 border border-slate-800/60 whitespace-pre-wrap">
                  {claim.reviewerDecision.notes}
                </p>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* ─── CLARIFICATION INFORMATION ─────────────────────── */}
      {claim.clarification?.requested && (
        <SectionCard
          icon={MessageSquare}
          title="Clarification Information"
          subtitle={
            claim.clarification.resolved
              ? `Employee responded ${formatDateTime(claim.clarification.respondedAt)}`
              : `Requested ${formatDateTime(claim.clarification.requestedAt)}`
          }
          badge={
            claim.clarification.resolved ? (
              <Badge variant="success">RESPONSE RECEIVED</Badge>
            ) : (
              <Badge variant="warning">AWAITING EMPLOYEE RESPONSE</Badge>
            )
          }
        >
          <div className="space-y-4">
            {/* Metadata columns */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="px-4 py-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
                <span className="text-[11px] text-slate-500 uppercase block">Clarification Status</span>
                <span className={`text-sm font-semibold ${claim.clarification.resolved ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {claim.clarification.resolved ? 'Resolved / Responded' : 'Pending Response'}
                </span>
              </div>
              <div className="px-4 py-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
                <span className="text-[11px] text-slate-500 uppercase block">Requested By</span>
                <span className="text-sm font-semibold text-slate-200">
                  {claim.clarification.requestedBy?.reviewerName || 'Policy Reviewer'}
                </span>
              </div>
              <div className="px-4 py-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
                <span className="text-[11px] text-slate-500 uppercase block">Requested At</span>
                <span className="text-xs text-slate-300 font-mono">
                  {formatDateTime(claim.clarification.requestedAt)}
                </span>
              </div>
            </div>

            {/* Request Message */}
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                Reviewer Clarification Request
              </span>
              <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/40 rounded-xl px-4 py-3 border border-slate-800/60 whitespace-pre-wrap">
                "{claim.clarification.message}"
              </p>
            </div>

            {/* Employee Response */}
            {claim.clarification.response ? (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                    Employee Clarification Response
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Responded: {formatDateTime(claim.clarification.respondedAt)}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-sm text-emerald-200 whitespace-pre-wrap leading-relaxed">
                  "{claim.clarification.response}"
                </div>
                <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300">
                  <Sparkles className="h-4 w-4 text-indigo-400 shrink-0" />
                  <span>
                    Deterministic validation and AI policy review above were automatically refreshed using this clarification response as additional context.
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                <Clock className="h-4 w-4 text-amber-400 shrink-0" />
                <span>
                  The employee has not yet responded to this clarification request.
                </span>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* ─── HUMAN REVIEW DECISION ─────────────────────────── */}
      <SectionCard
        icon={Gavel}
        title="Human Review Decision"
        subtitle="You are the final authority — AI is advisory only"
      >
        {/* Success message */}
        {decisionSuccess && (
          <div className="flex items-center gap-2 px-4 py-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
            <span className="text-sm text-emerald-300 font-medium">{decisionSuccess}</span>
          </div>
        )}

        {/* Context strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <div className="px-4 py-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
            <span className="text-[11px] text-slate-500 uppercase block">Current Status</span>
            <ClaimStatusBadge status={claim.status} />
          </div>
          <div className="px-4 py-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
            <span className="text-[11px] text-slate-500 uppercase block">AI Recommendation</span>
            {hasAiReview ? <AiStatusBadge status={ai.reviewStatus} /> : <Badge variant="neutral">NOT REVIEWED</Badge>}
          </div>
          <div className="px-4 py-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
            <span className="text-[11px] text-slate-500 uppercase block">AI Confidence</span>
            {confidence !== null && confidence !== undefined
              ? <span className={`text-sm font-bold font-mono ${Math.round(confidence * 100) >= 85 ? 'text-emerald-400' : Math.round(confidence * 100) >= 70 ? 'text-amber-400' : 'text-rose-400'}`}>{Math.round(confidence * 100)}%</span>
              : <span className="text-sm text-slate-400 italic">N/A</span>}
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => openModal('APPROVED')}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
          >
            <ThumbsUp className="h-4 w-4" /> Approve
          </button>
          <button
            onClick={() => openModal('REJECTED')}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 hover:border-rose-500/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
          >
            <ThumbsDown className="h-4 w-4" /> Reject
          </button>
          <button
            onClick={() => openModal('CLARIFICATION_REQUESTED')}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 hover:border-amber-500/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
          >
            <MessageSquare className="h-4 w-4" /> Request Clarification
          </button>
          <button
            onClick={() => openModal('OVERRIDDEN')}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 hover:bg-purple-500/20 hover:border-purple-500/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
          >
            <ShieldAlert className="h-4 w-4" /> Override AI
          </button>
        </div>
      </SectionCard>

      {/* ─── AUDIT HISTORY ─────────────────────────────────── */}
      <SectionCard
        icon={ScrollText}
        title="Audit History"
        subtitle="Chronological, immutable audit trail of all claim actions and reviewer decisions"
        badge={
          <div className="flex items-center gap-2">
            <Badge variant="neutral">
              {auditLogs.length} {auditLogs.length === 1 ? 'event' : 'events'}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchAuditHistory}
              disabled={isLoadingAudit}
              icon={RotateCcw}
            >
              Refresh
            </Button>
          </div>
        }
      >
        {isLoadingAudit && auditLogs.length === 0 ? (
          <div className="flex items-center justify-center py-8 gap-2 text-slate-400 text-sm">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
            Loading audit trail…
          </div>
        ) : auditError ? (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
            {auditError}
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            <ScrollText className="h-8 w-8 mx-auto text-slate-600 mb-2" />
            <p>No audit events recorded for this claim yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {auditLogs.map((log, idx) => (
              <div
                key={log._id || idx}
                className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/70 hover:border-slate-700/60 transition-colors space-y-3"
              >
                {/* Event Header: Action, Actor, Timestamp, Override */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <AuditActionBadge action={log.action} />
                    <ActorTypeBadge actorType={log.actorType} />
                    {log.override && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30">
                        <ShieldAlert className="h-3 w-3 text-purple-400" /> AI OVERRIDDEN
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                    <Clock className="h-3.5 w-3.5 text-slate-500" />
                    <span>{formatDateTime(log.timestamp)}</span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-slate-200 leading-relaxed font-normal">
                  {log.description}
                </p>

                {/* Status Transition & Reviewer Decision (when available) */}
                {(log.previousStatus || log.newStatus || log.decision) && (
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 border-t border-slate-800/50 text-xs">
                    {(log.previousStatus || log.newStatus) && (
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">Status Transition:</span>
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-slate-300">
                          {log.previousStatus || 'INITIAL'}
                        </span>
                        <span className="text-slate-600">→</span>
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-slate-200 font-semibold">
                          {log.newStatus || '—'}
                        </span>
                      </div>
                    )}

                    {log.decision && (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">Reviewer Decision:</span>
                        <ReviewerDecisionBadge decision={log.decision} />
                      </div>
                    )}
                  </div>
                )}

                {/* Notes (when available) */}
                {log.notes && (
                  <div className="pt-2 border-t border-slate-800/50">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block mb-1">
                      Notes
                    </span>
                    <p className="text-xs text-slate-300 bg-slate-900/60 rounded-lg p-2.5 border border-slate-800/60 whitespace-pre-wrap leading-relaxed">
                      {log.notes}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ─── DECISION MODAL ────────────────────────────────── */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  activeModal === 'APPROVED' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' :
                  activeModal === 'REJECTED' ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' :
                  activeModal === 'CLARIFICATION_REQUESTED' ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' :
                  'bg-purple-500/10 border border-purple-500/20 text-purple-400'
                }`}>
                  {activeModal === 'APPROVED' && <ThumbsUp className="h-4.5 w-4.5" />}
                  {activeModal === 'REJECTED' && <ThumbsDown className="h-4.5 w-4.5" />}
                  {activeModal === 'CLARIFICATION_REQUESTED' && <MessageSquare className="h-4.5 w-4.5" />}
                  {activeModal === 'OVERRIDDEN' && <ShieldAlert className="h-4.5 w-4.5" />}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">
                    {activeModal === 'APPROVED' && 'Approve Claim'}
                    {activeModal === 'REJECTED' && 'Reject Claim'}
                    {activeModal === 'CLARIFICATION_REQUESTED' && 'Request Clarification'}
                    {activeModal === 'OVERRIDDEN' && 'Override AI Recommendation'}
                  </h3>
                  <p className="text-xs text-slate-400">Claim ID: {id}</p>
                </div>
              </div>
              <button onClick={closeModal} className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-4">
              {/* Override-specific: show AI recommendation & let reviewer pick final status */}
              {activeModal === 'OVERRIDDEN' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/5 border border-purple-500/15">
                    <Info className="h-3.5 w-3.5 text-purple-400 flex-shrink-0" />
                    <span className="text-xs text-purple-300">
                      You are overriding the AI recommendation: <strong>{ai?.reviewStatus || 'N/A'}</strong>
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">Select Final Status</span>
                    <div className="flex gap-3">
                      <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                        overrideStatus === 'APPROVED'
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-950/40 border-slate-800/60 text-slate-400 hover:border-slate-700'
                      }`}>
                        <input type="radio" name="overrideStatus" value="APPROVED" checked={overrideStatus === 'APPROVED'} onChange={(e) => setOverrideStatus(e.target.value)} className="hidden" />
                        <ThumbsUp className="h-4 w-4" />
                        <span className="text-sm font-medium">Approve</span>
                      </label>
                      <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                        overrideStatus === 'REJECTED'
                          ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                          : 'bg-slate-950/40 border-slate-800/60 text-slate-400 hover:border-slate-700'
                      }`}>
                        <input type="radio" name="overrideStatus" value="REJECTED" checked={overrideStatus === 'REJECTED'} onChange={(e) => setOverrideStatus(e.target.value)} className="hidden" />
                        <ThumbsDown className="h-4 w-4" />
                        <span className="text-sm font-medium">Reject</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes textarea */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Reviewer Notes
                    {(activeModal === 'REJECTED' || activeModal === 'CLARIFICATION_REQUESTED' || activeModal === 'OVERRIDDEN')
                      ? <span className="text-rose-400 ml-1">*required</span>
                      : <span className="text-slate-500 ml-1">(optional)</span>}
                  </span>
                  <span className={`text-[10px] font-mono ${
                    decisionNotes.length > 2000 ? 'text-rose-400' : 'text-slate-500'
                  }`}>{decisionNotes.length}/2000</span>
                </div>
                <textarea
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  placeholder={
                    activeModal === 'APPROVED' ? 'Optional notes for approval…' :
                    activeModal === 'REJECTED' ? 'Reason for rejection (required)…' :
                    activeModal === 'CLARIFICATION_REQUESTED' ? 'What clarification is needed? (required)…' :
                    'Reason for overriding AI recommendation (required)…'
                  }
                  rows={4}
                  maxLength={2000}
                  className="w-full rounded-xl bg-slate-950/60 border border-slate-800/60 text-sm text-slate-200 placeholder-slate-500 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 resize-none transition-all"
                />
              </div>

              {/* Error */}
              {decisionError && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                  <AlertCircle className="h-3.5 w-3.5 text-rose-400 flex-shrink-0" />
                  <span className="text-xs text-rose-300">{decisionError}</span>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800">
              <button
                onClick={closeModal}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitDecision}
                disabled={!canSubmit() || decisionNotes.length > 2000}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                  activeModal === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' :
                  activeModal === 'REJECTED' ? 'bg-rose-600 hover:bg-rose-500 text-white' :
                  activeModal === 'CLARIFICATION_REQUESTED' ? 'bg-amber-600 hover:bg-amber-500 text-white' :
                  'bg-purple-600 hover:bg-purple-500 text-white'
                }`}
              >
                {isSubmitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
                ) : (
                  <>
                    {activeModal === 'APPROVED' && <><ThumbsUp className="h-4 w-4" /> Confirm Approval</>}
                    {activeModal === 'REJECTED' && <><ThumbsDown className="h-4 w-4" /> Confirm Rejection</>}
                    {activeModal === 'CLARIFICATION_REQUESTED' && <><MessageSquare className="h-4 w-4" /> Send Request</>}
                    {activeModal === 'OVERRIDDEN' && <><ShieldAlert className="h-4 w-4" /> Confirm Override</>}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── FOOTER NOTE ─────────────────────────────────── */}
      <Card className="border-slate-800 bg-slate-900/40">
        <CardBody className="p-4">
          <div className="flex items-center gap-3">
            <Gavel className="h-4 w-4 text-slate-500 flex-shrink-0" />
            <p className="text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Human reviewer authority.</span>{' '}
              The AI review is advisory only — the human reviewer remains the final decision maker.
              All decisions are persisted and can be updated.
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default ReviewerClaimDetailsPage;
