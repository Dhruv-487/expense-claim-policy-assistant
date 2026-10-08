import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Calendar,
  Tag,
  DollarSign,
  Receipt,
  User,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  ShieldCheck,
  BookOpen,
  Info,
  AlertCircle,
  Gavel,
  ShieldAlert,
  Loader2,
  MessageSquare,
  Send,
} from 'lucide-react';
import Card, { CardBody } from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import { getClaimById, submitClarificationResponse } from '../api/claimApi';

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

// ─── Sub-components ──────────────────────────────────────────
const SectionCard = ({ icon: Icon, title, subtitle, badge, children }) => (
  <Card className="border-slate-800 bg-slate-900/60">
    <div className="p-5 border-b border-slate-800/60 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {badge && <div>{badge}</div>}
    </div>
    <CardBody className="p-5">{children}</CardBody>
  </Card>
);

const InfoRow = ({ label, value, icon: Icon, mono = false }) => (
  <div className="flex items-start gap-3 py-2.5 border-b border-slate-800/40 last:border-0">
    {Icon && (
      <div className="mt-0.5 h-4 w-4 shrink-0 text-slate-500">
        <Icon className="h-4 w-4" />
      </div>
    )}
    <div className="flex-1 min-w-0">
      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 block">{label}</span>
      <span className={`text-sm text-slate-200 mt-0.5 block ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</span>
    </div>
  </div>
);

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

export const MyClaimDetailsPage = () => {
  const { id } = useParams();
  const [claim, setClaim] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isForbidden, setIsForbidden] = useState(false);

  // Clarification workflow state
  const [clarificationResponseText, setClarificationResponseText] = useState('');
  const [isSubmittingClarification, setIsSubmittingClarification] = useState(false);
  const [clarificationError, setClarificationError] = useState(null);
  const [clarificationSuccess, setClarificationSuccess] = useState(null);

  const fetchClaim = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setIsForbidden(false);
    try {
      const response = await getClaimById(id);
      setClaim(response.data);
    } catch (err) {
      if (err.statusCode === 403 || err.response?.status === 403) {
        setIsForbidden(true);
      }
      setError(err.message || 'Failed to load claim');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const handleSubmitClarification = async (e) => {
    e?.preventDefault();
    if (!clarificationResponseText.trim() || clarificationResponseText.trim().length < 3) {
      setClarificationError('Clarification response is required and must be at least 3 characters.');
      return;
    }

    setIsSubmittingClarification(true);
    setClarificationError(null);
    setClarificationSuccess(null);
    try {
      const response = await submitClarificationResponse(id, {
        response: clarificationResponseText.trim(),
      });
      setClaim(response.data);
      setClarificationSuccess(
        'Your clarification response was submitted successfully and automated policy re-evaluation is complete.'
      );
      setClarificationResponseText('');
    } catch (err) {
      setClarificationError(
        err.response?.data?.message || err.message || 'Failed to submit clarification response.'
      );
    } finally {
      setIsSubmittingClarification(false);
    }
  };

  useEffect(() => {
    fetchClaim();
  }, [fetchClaim]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="h-10 w-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Loading your claim details…</p>
      </div>
    );
  }

  // Security / Forbidden check (Employee cannot access another employee's claim)
  if (isForbidden) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="h-14 w-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-semibold text-slate-100">Access Denied</h2>
        <p className="text-sm text-slate-400">
          You do not have permission to access this claim. Employees can only view claims that they personally submitted.
        </p>
        <Link to="/my-claims">
          <Button variant="secondary" icon={ArrowLeft}>
            Back to My Claims
          </Button>
        </Link>
      </div>
    );
  }

  // Error / Not Found state
  if (error || !claim) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="h-14 w-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-semibold text-slate-100">Claim Not Found</h2>
        <p className="text-sm text-slate-400">
          {error || `Unable to locate an expense claim with ID "${id}".`}
        </p>
        <Link to="/my-claims">
          <Button variant="secondary" icon={ArrowLeft}>
            Back to My Claims
          </Button>
        </Link>
      </div>
    );
  }

  const vr = claim.validationResults;
  const ai = claim.aiReview;
  const hasValidation = vr && vr.validatedAt;
  const hasAiReview = ai && ai.reviewStatus;
  const confidence = ai?.classification?.confidence;
  const policyEvidence = ai?.policyEvidence || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* ─── Top Header ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/my-claims">
            <Button variant="ghost" icon={ArrowLeft} size="sm">
              Back to My Claims
            </Button>
          </Link>
          <div className="h-6 w-px bg-slate-800 hidden sm:block" />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-100">
              Claim Review Status
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ClaimStatusBadge status={claim.status} clarification={claim.clarification} />
          {hasAiReview && <AiStatusBadge status={ai.reviewStatus} />}
        </div>
      </div>

      {/* ─── Summary Strip ─────────────────────────────────── */}
      <Card className="border-slate-800 bg-slate-900/70">
        <CardBody className="p-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center gap-2 text-slate-300">
              <User className="h-4 w-4 text-indigo-400" />
              <span className="font-semibold">{claim.claimant}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Calendar className="h-4 w-4" />
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

      {/* ─── Clarification Request Card (Pending Action) ──── */}
      {claim.clarification?.requested && !claim.clarification?.resolved && (
        <Card className="border-amber-500/40 bg-amber-950/20 shadow-lg shadow-amber-950/20">
          <div className="p-5 border-b border-amber-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <MessageSquare className="h-4.5 w-4.5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-amber-200">Clarification Requested</h2>
                <p className="text-xs text-amber-400/80 mt-0.5">
                  The reviewer has requested additional information regarding this expense claim
                </p>
              </div>
            </div>
            <Badge variant="warning">ACTION REQUIRED</Badge>
          </div>
          <CardBody className="p-5 space-y-4">
            {/* Reviewer details & message */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-amber-500/20 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-slate-300">
                  Reviewer: {claim.clarification?.requestedBy?.reviewerName || 'Policy Reviewer'}
                </span>
                <span className="font-mono text-slate-400">
                  {formatDateTime(claim.clarification?.requestedAt)}
                </span>
              </div>
              <p className="text-sm text-amber-200 font-medium whitespace-pre-wrap leading-relaxed">
                "{claim.clarification?.message}"
              </p>
            </div>

            {/* Error / Success state */}
            {clarificationError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                <span>{clarificationError}</span>
              </div>
            )}
            {clarificationSuccess && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>{clarificationSuccess}</span>
              </div>
            )}

            {/* Response form */}
            <form onSubmit={handleSubmitClarification} className="space-y-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1.5">
                  Your Response <span className="text-rose-400">*</span>
                </label>
                <textarea
                  value={clarificationResponseText}
                  onChange={(e) => setClarificationResponseText(e.target.value)}
                  placeholder="Provide the missing context, business purpose, or clarification requested by the reviewer…"
                  rows={4}
                  disabled={isSubmittingClarification}
                  className="w-full rounded-xl bg-slate-950/70 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 p-3.5 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 resize-none transition-all disabled:opacity-50"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Minimum 3 characters • Re-triggers policy review upon submission
                </span>
                <Button
                  type="submit"
                  disabled={
                    isSubmittingClarification ||
                    !clarificationResponseText.trim() ||
                    clarificationResponseText.trim().length < 3
                  }
                  className="bg-amber-600 hover:bg-amber-500 text-white font-medium"
                  icon={isSubmittingClarification ? Loader2 : Send}
                >
                  {isSubmittingClarification ? 'Submitting & Re-evaluating…' : 'Submit Clarification'}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {/* ─── Clarification History Card (Resolved/Responded) ── */}
      {claim.clarification?.resolved && claim.clarification?.response && (
        <Card className="border-slate-800 bg-slate-900/60">
          <div className="p-5 border-b border-slate-800/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 className="h-4.5 w-4.5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-100">Clarification Provided</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Response submitted and claim policy review re-evaluated
                </p>
              </div>
            </div>
            <Badge variant="success">RESOLVED</Badge>
          </div>
          <CardBody className="p-5 space-y-4">
            {/* Reviewer request */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-slate-300">
                  Reviewer Request ({claim.clarification?.requestedBy?.reviewerName || 'Policy Reviewer'}):
                </span>
                <span className="font-mono">{formatDateTime(claim.clarification?.requestedAt)}</span>
              </div>
              <p className="text-xs text-slate-300 p-3 rounded-lg bg-slate-950/40 border border-slate-800/60 whitespace-pre-wrap">
                "{claim.clarification?.message}"
              </p>
            </div>

            {/* Employee response */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-emerald-400">
                <span className="font-semibold text-emerald-300">Your Submitted Response:</span>
                <span className="font-mono text-slate-400">{formatDateTime(claim.clarification?.respondedAt)}</span>
              </div>
              <p className="text-xs text-emerald-200/90 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 whitespace-pre-wrap">
                "{claim.clarification?.response}"
              </p>
            </div>

            {clarificationSuccess && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>{clarificationSuccess}</span>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* ─── 2-Column Details Grid ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Claim Information & Validation */}
        <div className="space-y-6">
          {/* Claim Information */}
          <SectionCard
            icon={FileText}
            title="Claim Information"
            subtitle="Your submitted expense details"
          >
            <div>
              <InfoRow icon={User} label="Claimant" value={claim.claimant} />
              <InfoRow icon={Calendar} label="Expense Date" value={formatDate(claim.date)} />
              <InfoRow icon={Tag} label="Category" value={claim.category} />
              <InfoRow icon={DollarSign} label="Amount" value={formatAmount(claim.amount, claim.currency)} mono />
              <InfoRow icon={DollarSign} label="Currency" value={claim.currency} />
              <InfoRow
                icon={Receipt}
                label="Receipt Status"
                value={
                  claim.receiptAvailable ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Itemized receipt attached
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-rose-400">
                      <XCircle className="h-3.5 w-3.5" /> No receipt attached
                    </span>
                  )
                }
              />
              <div className="pt-3">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 block mb-1">
                  Business Purpose / Description
                </span>
                <p className="text-xs text-slate-200 bg-slate-950/40 rounded-xl p-3 border border-slate-800/60 leading-relaxed whitespace-pre-wrap">
                  {claim.description}
                </p>
              </div>
            </div>
          </SectionCard>

          {/* Deterministic Validation Results */}
          <SectionCard
            icon={ShieldCheck}
            title="Policy Validation Checks"
            subtitle="Automated deterministic rule evaluation"
            badge={
              hasValidation ? (
                vr.valid ? (
                  <Badge variant="success">PASSED</Badge>
                ) : (
                  <Badge variant="error">{vr.issues?.length || 1} ISSUE(S)</Badge>
                )
              ) : (
                <Badge variant="neutral">PENDING</Badge>
              )
            }
          >
            {hasValidation ? (
              <div className="space-y-4">
                {/* Rule checks pills */}
                {vr.checks && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(vr.checks).map(([checkKey, checkVal]) => (
                      <div
                        key={checkKey}
                        className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                          checkVal
                            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/5 border-rose-500/20 text-rose-300'
                        }`}
                      >
                        <span className="capitalize text-[11px]">
                          {checkKey.replace(/([A-Z])/g, ' $1')}
                        </span>
                        {checkVal ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Issues if any */}
                {vr.issues && vr.issues.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-400 block">
                      Issues Requiring Attention
                    </span>
                    {vr.issues.map((issue, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-start gap-2 text-xs text-rose-300"
                      >
                        <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                        <span>{issue.message}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Warnings if any */}
                {vr.warnings && vr.warnings.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 block">
                      Policy Warnings
                    </span>
                    {vr.warnings.map((warning, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-xs text-amber-300"
                      >
                        <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                        <span>{warning.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Validation has not yet been executed on this claim.</p>
            )}
          </SectionCard>
        </div>

        {/* Right Column: AI Review & Human Decision */}
        <div className="space-y-6">
          {/* Grounded AI Policy Review */}
          <SectionCard
            icon={Sparkles}
            title="AI Policy Compliance Review"
            subtitle="Advisory evaluation grounded in company policy"
            badge={hasAiReview && <AiStatusBadge status={ai.reviewStatus} />}
          >
            {hasAiReview ? (
              <div className="space-y-4">
                {/* Confidence Bar */}
                {confidence !== undefined && confidence !== null && (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-400 font-medium">Confidence Score</span>
                      <span className="font-mono font-bold text-slate-200">
                        {Math.round(confidence * 100)}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          confidence >= 0.85
                            ? 'bg-emerald-500'
                            : confidence >= 0.7
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.round(confidence * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* AI Reason */}
                {ai.reason && (
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                      Policy Analysis
                    </span>
                    <p className="text-xs text-slate-300 bg-slate-950/40 rounded-xl p-3 border border-slate-800/60 leading-relaxed">
                      {ai.reason}
                    </p>
                  </div>
                )}

                {/* Policy Evidence */}
                {policyEvidence.length > 0 && (
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                      Cited Corporate Policy Sections
                    </span>
                    <div className="space-y-2">
                      {policyEvidence.map((ev, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/70 text-xs space-y-1"
                        >
                          <div className="flex items-center gap-2 text-indigo-400 font-semibold">
                            <BookOpen className="h-3.5 w-3.5 shrink-0" />
                            <span>Section {ev.sectionId}: {ev.sectionTitle}</span>
                          </div>
                          <p className="text-slate-400 leading-relaxed text-[11px]">
                            {ev.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">AI policy review has not been completed yet.</p>
            )}
          </SectionCard>

          {/* Reviewer Decision (Read-only) */}
          <SectionCard
            icon={Gavel}
            title="Final Reviewer Decision"
            subtitle="Human reviewer determination"
            badge={
              claim.reviewerDecision?.decision ? (
                <ReviewerDecisionBadge decision={claim.reviewerDecision.decision} />
              ) : (
                <Badge variant="neutral">IN PROGRESS</Badge>
              )
            }
          >
            {claim.reviewerDecision?.decision ? (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Decision Outcome</span>
                  <ReviewerDecisionBadge decision={claim.reviewerDecision.decision} />
                </div>

                {claim.reviewerDecision.override && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300">
                    <ShieldAlert className="h-4 w-4 text-purple-400 shrink-0" />
                    <span>The human reviewer decided to override the advisory AI recommendation.</span>
                  </div>
                )}

                {claim.reviewerDecision.notes && (
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                      Reviewer Notes & Feedback
                    </span>
                    <p className="text-xs text-slate-200 bg-slate-950/40 rounded-xl p-3 border border-slate-800/60 leading-relaxed whitespace-pre-wrap">
                      {claim.reviewerDecision.notes}
                    </p>
                  </div>
                )}

                <span className="text-[11px] text-slate-500 block">
                  Decided at: {formatDateTime(claim.reviewerDecision.decidedAt)}
                </span>
              </div>
            ) : (
              <div className="text-center py-4 space-y-1.5">
                <Clock className="h-6 w-6 text-amber-400 mx-auto" />
                <p className="text-xs text-slate-300 font-medium">Awaiting Human Review</p>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  Your claim is currently queued. An authorized policy reviewer will make the final decision.
                </p>
              </div>
            )}
          </SectionCard>

          {/* Status Timeline */}
          <SectionCard
            icon={Clock}
            title="Processing Timeline"
            subtitle="Milestones for this expense claim"
          >
            <div className="relative pl-6 space-y-4">
              <div className="absolute left-[9px] top-2 bottom-2 w-px bg-slate-800" />

              {/* Submitted */}
              <div className="relative flex items-start gap-3">
                <div className="absolute left-[-15px] top-1 h-3 w-3 rounded-full bg-indigo-500 border-2 border-slate-900" />
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">Claim Submitted</span>
                  <span className="text-xs text-slate-400">{formatDateTime(claim.createdAt)}</span>
                </div>
              </div>

              {/* Validation */}
              <div className="relative flex items-start gap-3">
                <div className={`absolute left-[-15px] top-1 h-3 w-3 rounded-full border-2 border-slate-900 ${
                  hasValidation ? 'bg-emerald-500' : 'bg-slate-700'
                }`} />
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">Deterministic Policy Validation</span>
                  <span className="text-xs text-slate-400">
                    {hasValidation ? formatDateTime(vr.validatedAt) : 'Pending'}
                  </span>
                </div>
              </div>

              {/* AI Review */}
              <div className="relative flex items-start gap-3">
                <div className={`absolute left-[-15px] top-1 h-3 w-3 rounded-full border-2 border-slate-900 ${
                  hasAiReview ? 'bg-purple-500' : 'bg-slate-700'
                }`} />
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">AI Policy Review</span>
                  <span className="text-xs text-slate-400">
                    {hasAiReview ? formatDateTime(ai.reviewedAt) : 'Pending'}
                  </span>
                </div>
              </div>

              {/* Reviewer Decision */}
              <div className="relative flex items-start gap-3">
                <div className={`absolute left-[-15px] top-1 h-3 w-3 rounded-full border-2 border-slate-900 ${
                  claim.reviewerDecision?.decidedAt ? 'bg-amber-500' : 'bg-slate-700'
                }`} />
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">Reviewer Decision</span>
                  <span className="text-xs text-slate-400">
                    {claim.reviewerDecision?.decidedAt
                      ? formatDateTime(claim.reviewerDecision.decidedAt)
                      : 'Pending reviewer action'}
                  </span>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
};

export default MyClaimDetailsPage;
