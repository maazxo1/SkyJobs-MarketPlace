import { useState } from 'react';
import { submitBid } from '../../api/bids.api';
import { useToast } from '../../context/ToastContext';

const BidForm = ({ jobId, onSuccess }) => {
  const toast = useToast();
  const [form, setForm] = useState({ amount: '', delivery_days: '', cover_letter: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.cover_letter.length < 50) {
      toast.error('Cover letter must be at least 50 characters.');
      return;
    }
    setLoading(true);
    try {
      await submitBid({
        job_id: jobId,
        amount: Number(form.amount),
        delivery_days: Number(form.delivery_days),
        cover_letter: form.cover_letter,
      });
      toast.success('Proposal submitted successfully');
      setForm({ amount: '', delivery_days: '', cover_letter: '' });
      onSuccess?.();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit proposal');
    } finally {
      setLoading(false);
    }
  };

  const charCount = form.cover_letter.length;

  return (
    <form onSubmit={handleSubmit} className="col gap-3">
      <div className="row gap-3">
        <div style={{ flex: 1 }}>
          <div className="label" style={{ marginBottom: 6 }}>Amount ($)</div>
          <input type="number" name="amount" value={form.amount} onChange={handleChange}
            placeholder="e.g. 2500" required min="1" className="field" />
        </div>
        <div style={{ flex: 1 }}>
          <div className="label" style={{ marginBottom: 6 }}>Delivery (days)</div>
          <input type="number" name="delivery_days" value={form.delivery_days} onChange={handleChange}
            placeholder="e.g. 14" required min="1" className="field" />
        </div>
      </div>

      <div>
        <div className="label row between" style={{ marginBottom: 6 }}>
          <span>Cover letter</span>
          <span className={`num ${charCount < 50 ? 'muted' : 'amber-text'}`} style={{ fontSize: 11, fontWeight: 500 }}>
            {charCount}/2000
          </span>
        </div>
        <textarea
          name="cover_letter"
          value={form.cover_letter}
          onChange={handleChange}
          rows={6}
          maxLength={2000}
          minLength={50}
          placeholder="Describe your approach, relevant experience, and why you're the right fit…"
          required
          className="field"
          style={{ resize: 'none' }}
        />
        {charCount > 0 && charCount < 50 && (
          <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>
            {50 - charCount} more characters needed
          </div>
        )}
      </div>

      <button type="submit" className="btn amber" style={{ width: '100%' }} disabled={loading}>
        {loading ? 'Submitting…' : 'Submit proposal'}
      </button>
    </form>
  );
};

export default BidForm;
