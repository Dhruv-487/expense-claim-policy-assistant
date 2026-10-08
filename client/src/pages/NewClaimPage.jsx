import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Receipt, 
  User, 
  Calendar, 
  DollarSign,
  FileCheck,
  Check,
  X,
  FileText
} from 'lucide-react';
import Card, { CardHeader, CardBody } from '../components/common/Card';
import Button from '../components/common/Button';
import Input, { Select } from '../components/common/Input';
import Badge from '../components/common/Badge';
import { createClaim } from '../api/claimApi';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = [
  { value: 'Travel', label: '✈️ Travel & Lodging' },
  { value: 'Meals & Entertainment', label: '🍽️ Meals & Entertainment' },
  { value: 'Equipment', label: '💻 Hardware & Equipment' },
  { value: 'Office Supplies', label: '📎 Office Supplies' },
  { value: 'Training', label: '🎓 Professional Training / Courses' },
  { value: 'Medical', label: '🏥 Medical & Health' },
  { value: 'Other', label: '📦 Other Expenses' },
];

const CURRENCIES = [
  { value: 'INR', label: 'INR (₹)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
];

export const NewClaimPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    claimant: user?.name || '',
    date: new Date().toISOString().split('T')[0],
    category: 'Travel',
    amount: '',
    currency: 'INR',
    description: '',
    receiptAvailable: null, // null means unselected
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const validate = () => {
    const newErrors = {};

    if (!formData.claimant.trim()) {
      newErrors.claimant = 'Claimant name is required';
    } else if (formData.claimant.trim().length < 2) {
      newErrors.claimant = 'Claimant name must be at least 2 characters';
    }

    if (!formData.date) {
      newErrors.date = 'Expense date is required';
    } else if (isNaN(new Date(formData.date).getTime())) {
      newErrors.date = 'Please select a valid date';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (formData.amount === '' || formData.amount === null || formData.amount === undefined) {
      newErrors.amount = 'Amount is required';
    } else {
      const parsedAmount = Number(formData.amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        newErrors.amount = 'Amount must be greater than 0';
      }
    }

    if (!formData.currency) {
      newErrors.currency = 'Currency is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Business description is required';
    } else if (formData.description.trim().length < 5) {
      newErrors.description = 'Description must be at least 5 characters long';
    }

    if (formData.receiptAvailable === null) {
      newErrors.receiptAvailable = 'Please specify whether an itemized receipt is available';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    if (errors[id]) {
      setErrors((prev) => ({ ...prev, [id]: null }));
    }
    if (apiError) setApiError(null);
  };

  const handleReceiptToggle = (val) => {
    setFormData((prev) => ({ ...prev, receiptAvailable: val }));
    if (errors.receiptAvailable) {
      setErrors((prev) => ({ ...prev, receiptAvailable: null }));
    }
    if (apiError) setApiError(null);
  };

  const resetForm = () => {
    setFormData({
      claimant: '',
      date: new Date().toISOString().split('T')[0],
      category: 'Travel',
      amount: '',
      currency: 'INR',
      description: '',
      receiptAvailable: null,
    });
    setErrors({});
    setApiError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError(null);

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const payload = {
        claimant: formData.claimant.trim(),
        date: formData.date,
        category: formData.category,
        amount: Number(formData.amount),
        currency: formData.currency,
        description: formData.description.trim(),
        receiptAvailable: formData.receiptAvailable,
      };

      const response = await createClaim(payload);

      setSuccessMessage('Claim created and saved successfully! Redirecting to your claims list…');
      resetForm();

      // Redirect to My Claims page
      setTimeout(() => {
        navigate('/my-claims', { state: { newClaimCreated: true, createdId: response?.data?._id } });
      }, 800);
    } catch (err) {
      const errorMsg =
        err.message ||
        (err.errors && err.errors.length > 0 ? err.errors.join(', ') : 'Failed to submit claim. Please try again.');
      setApiError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top back navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <Badge variant="info">Expense Claim Submission</Badge>
      </div>

      {/* Success banner */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-300 animate-in fade-in duration-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <div className="text-sm font-medium">
            {successMessage} Redirecting to dashboard...
          </div>
        </div>
      )}

      {/* API error alert */}
      {apiError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 animate-in fade-in duration-200">
          <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-sm flex-1">
            <span className="font-semibold block">Submission Error:</span>
            <span>{apiError}</span>
          </div>
          <button
            type="button"
            onClick={() => setApiError(null)}
            className="text-rose-400 hover:text-rose-200 p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form (2 cols) */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="New Expense Claim"
              subtitle="Enter verified corporate expense details for policy compliance"
            />
            <CardBody>
              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                {/* Claimant */}
                <Input
                  label="Claimant Name"
                  id="claimant"
                  placeholder="e.g. Dhruv Rana"
                  value={formData.claimant}
                  onChange={handleChange}
                  error={errors.claimant}
                  icon={User}
                  required
                  disabled={isSubmitting}
                />

                {/* Expense Date & Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Expense Date"
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={handleChange}
                    error={errors.date}
                    icon={Calendar}
                    required
                    disabled={isSubmitting}
                  />

                  <Select
                    label="Category"
                    id="category"
                    options={CATEGORIES}
                    value={formData.category}
                    onChange={handleChange}
                    error={errors.category}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                {/* Amount & Currency */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Amount"
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 2500"
                    value={formData.amount}
                    onChange={handleChange}
                    error={errors.amount}
                    icon={DollarSign}
                    required
                    disabled={isSubmitting}
                  />

                  <Select
                    label="Currency"
                    id="currency"
                    options={CURRENCIES}
                    value={formData.currency}
                    onChange={handleChange}
                    error={errors.currency}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="description" className="text-sm font-medium text-slate-300 flex items-center justify-between">
                    <span>
                      Business Justification / Description <span className="text-rose-400">*</span>
                    </span>
                    <span className="text-xs text-slate-400">
                      {formData.description.length}/1000
                    </span>
                  </label>
                  <textarea
                    id="description"
                    rows={4}
                    value={formData.description}
                    onChange={handleChange}
                    maxLength={1000}
                    disabled={isSubmitting}
                    placeholder="Provide purpose of expense, business reason, client names if applicable..."
                    className={`w-full rounded-xl bg-slate-900 border ${
                      errors.description
                        ? 'border-rose-500 focus:ring-rose-500/20'
                        : 'border-slate-700/80 focus:border-indigo-500 focus:ring-indigo-500/20'
                    } px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all duration-150 focus:ring-4`}
                  />
                  {errors.description && (
                    <p className="text-xs text-rose-400">{errors.description}</p>
                  )}
                </div>

                {/* Receipt Available Toggle */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-slate-300">
                    Is an Itemized Receipt Available? <span className="text-rose-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleReceiptToggle(true)}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                        formData.receiptAvailable === true
                          ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 shadow-md shadow-emerald-500/10'
                          : 'bg-slate-900 border-slate-700/80 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                      }`}
                    >
                      <Check className="h-4 w-4 text-emerald-400" />
                      <span>Yes, Receipt Attached</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleReceiptToggle(false)}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                        formData.receiptAvailable === false
                          ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-md shadow-amber-500/10'
                          : 'bg-slate-900 border-slate-700/80 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                      }`}
                    >
                      <X className="h-4 w-4 text-amber-400" />
                      <span>No Receipt Available</span>
                    </button>
                  </div>
                  {errors.receiptAvailable && (
                    <p className="text-xs text-rose-400">{errors.receiptAvailable}</p>
                  )}
                </div>

                {/* Submit Controls */}
                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-end gap-3">
                  <Button
                    variant="outline"
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => navigate('/')}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    isLoading={isSubmitting}
                    disabled={isSubmitting}
                    icon={Send}
                  >
                    Submit Expense Claim
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>

        {/* Right Rail: Policy Guidelines & Compliance Notice */}
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Submission Guidelines"
              subtitle="Corporate compliance reminders"
            />
            <CardBody className="space-y-3.5 text-xs text-slate-300">
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/60">
                <Receipt className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-200">Receipt Verification</span>
                  <p className="text-slate-400 mt-0.5">
                    Original tax invoice or digital receipt copy is required for all business expenses.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/60">
                <FileText className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-200">Business Justification</span>
                  <p className="text-slate-400 mt-0.5">
                    Be specific about project codes, client engagements, or team purposes.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/60">
                <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-200">Filing Window</span>
                  <p className="text-slate-400 mt-0.5">
                    Claims should be filed within 30 days of the transaction date.
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-200 space-y-2">
            <div className="font-semibold flex items-center gap-1.5 text-indigo-300">
              <FileCheck className="h-4 w-4" /> Policy Audit Pipeline
            </div>
            <p className="leading-relaxed text-indigo-200/80">
              Every submitted claim is securely stored in MongoDB Atlas and immediately queued for compliance auditing and policy validation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewClaimPage;
