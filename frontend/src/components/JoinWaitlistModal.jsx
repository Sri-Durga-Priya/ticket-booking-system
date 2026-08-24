import React, { useState } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Clock, 
  ShieldCheck, 
  ArrowRight 
} from 'lucide-react';

export default function JoinWaitlistModal({ show, initialCategory, isOpen, onClose }) {
  const { isAuthenticated } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || show?.venue?.categories?.[0]?.name || 'Standard');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleJoin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setResult(null);

    try {
      const res = await api.post('/api/waitlist/join', {
        showId: show._id,
        category: selectedCategory,
      });

      setResult(res.data);
    } catch (err) {
      setError(err.message || 'Failed to join waitlist. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '2rem', position: 'relative', animation: 'scale-up 0.2s ease', border: '1px solid var(--border-medium)' }}>
        
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{ position: 'absolute', right: '1.25rem', top: '1.25rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(236, 72, 153, 0.2)', color: '#f472b6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="badge badge-waitlist" style={{ marginBottom: '0.2rem' }}>Automated Waitlist Cascade</span>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Join Ticket Waitlist</h2>
          </div>
        </div>

        {!isAuthenticated ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Please sign in to join the queue. When a seat opens up, you'll receive a real-time notification and private booking link.
            </p>
            <Link to="/login" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
              Sign In to Join Waitlist
            </Link>
          </div>
        ) : result ? (
          /* Success Result */
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>You're in Line!</h3>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(99, 102, 241, 0.2)', padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-subtle)', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>FIFO Queue Position:</span>
              <strong style={{ fontSize: '1.2rem', color: '#818cf8' }}>#{result.queuePosition}</strong>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              If a customer cancels or an unpaid hold expires for <strong>{result.category}</strong>, you will automatically receive an exclusive 15-minute claim offer.
            </p>

            <button onClick={onClose} className="btn btn-primary" style={{ width: '100%' }}>
              Done
            </button>
          </div>
        ) : (
          /* Join Form */
          <form onSubmit={handleJoin}>
            {error && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', marginBottom: '1rem', color: '#fca5a5', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem' }}>
              <strong style={{ display: 'block', fontSize: '1rem' }}>{show?.eventListing?.title}</strong>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {show?.venue?.name} &bull; {show?.date ? new Date(show.date).toLocaleDateString() : ''} at {show?.startTime}
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Select Seating Category</label>
              <select
                className="form-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {show?.venue?.categories?.map((cat) => (
                  <option key={cat.name} value={cat.name}>
                    {cat.name} Tier
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(255,255,255,0.04)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>15-Minute private claim window when a seat opens</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Sparkles className="w-4 h-4 text-pink-400" />
                <span>Strict FIFO queue ordering based on joined timestamp</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
            >
              {isSubmitting ? 'Joining Queue...' : 'Confirm & Join Waitlist'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
