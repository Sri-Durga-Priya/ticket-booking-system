import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api.js';
import confetti from 'canvas-confetti';
import { 
  Sparkles, 
  Clock, 
  Ticket, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  MapPin, 
  ArrowRight,
  RefreshCw,
  Lock
} from 'lucide-react';

export default function ClaimOfferPage() {
  const { id: waitlistId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [offer, setOffer] = useState(null);
  const [secondsRemaining, setSecondsRemaining] = useState(null);
  const [isExpired, setIsExpired] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState('');

  const loadOffer = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await api.get(`/api/waitlist/offer/${waitlistId}`);
      setOffer(res.data);

      if (res.data.offerExpiresAt) {
        const expiresAt = new Date(res.data.offerExpiresAt);
        const diffSeconds = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
        setSecondsRemaining(diffSeconds);
        if (diffSeconds <= 0 || res.data.isExpired) {
          setIsExpired(true);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load waitlist offer');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOffer();
  }, [waitlistId]);

  // Countdown Timer Effect
  useEffect(() => {
    if (!offer?.offerExpiresAt || isExpired) return;

    const timer = setInterval(() => {
      const expiresAt = new Date(offer.offerExpiresAt);
      const diffSeconds = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setSecondsRemaining(diffSeconds);

      if (diffSeconds <= 0) {
        setIsExpired(true);
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [offer, isExpired]);

  const handleClaim = async () => {
    if (isExpired) return;

    setIsClaiming(true);
    setError('');
    try {
      const res = await api.post(`/api/waitlist/claim/${waitlistId}`);

      try {
        confetti({
          particleCount: 150,
          spread: 90,
          origin: { y: 0.6 },
        });
      } catch (ce) {
        // ignore
      }

      navigate(`/booking-confirmation/${res.data._id}`, {
        state: { booking: res.data },
      });
    } catch (err) {
      setError(err.message || 'Failed to claim waitlist ticket');
      setIsClaiming(false);
    }
  };

  const formatTimer = (seconds) => {
    if (seconds == null) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="main-content" style={{ textAlign: 'center', padding: '5rem 1rem' }}>
        <div className="pulse-dot" style={{ margin: '0 auto 1rem' }}></div>
        <p style={{ color: 'var(--text-muted)' }}>Validating your exclusive waitlist claim pass...</p>
      </div>
    );
  }

  if (error || !offer) {
    return (
      <div className="main-content" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div className="glass-panel" style={{ maxWidth: '500px', margin: '0 auto', padding: '2.5rem' }}>
          <AlertTriangle className="w-12 h-12 text-rose-400" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Offer Unavailable</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{error || 'This offer may have expired or was already claimed.'}</p>
          <Link to="/events" className="btn btn-primary">Browse Events</Link>
        </div>
      </div>
    );
  }

  const show = offer.show || {};
  const event = show.eventListing || {};
  const venue = show.venue || {};

  return (
    <div className="main-content" style={{ maxWidth: '720px', margin: '0 auto' }}>
      
      {/* Hero Banner */}
      <div className="glass-panel" style={{ padding: '2.5rem 2rem', textAlign: 'center', marginBottom: '2rem', border: isExpired ? '1px solid #ef4444' : '1px solid rgba(236, 72, 153, 0.4)', background: isExpired ? 'linear-gradient(180deg, rgba(239, 68, 68, 0.08) 0%, rgba(18, 24, 38, 0.8) 100%)' : 'linear-gradient(180deg, rgba(236, 72, 153, 0.1) 0%, rgba(18, 24, 38, 0.8) 100%)' }}>
        
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: isExpired ? 'rgba(239, 68, 68, 0.2)' : 'rgba(236, 72, 153, 0.2)', color: isExpired ? '#f87171' : '#f472b6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
          {isExpired ? <AlertTriangle className="w-8 h-8" /> : <Sparkles className="w-8 h-8" />}
        </div>

        <span className={`badge ${isExpired ? 'badge-soldout' : 'badge-waitlist'}`} style={{ marginBottom: '0.75rem' }}>
          {isExpired ? 'OFFER EXPIRED & CASCADED' : '✨ EXCLUSIVE WAITLIST PASS'}
        </span>

        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          {isExpired ? 'Claim Window Passed' : 'A Seat is Reserved For You!'}
        </h1>

        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: '520px', margin: '0 auto 1.5rem' }}>
          {isExpired
            ? 'Because the 15-minute claim window expired, this seat was automatically passed to the next person in line.'
            : `You reached the top of the queue for ${event.title || 'this show'}. Claim your ticket before the timer expires.`}
        </p>

        {/* Live 15-Minute Countdown */}
        {!isExpired && (
          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(0,0,0,0.4)', padding: '1rem 2rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-medium)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Clock className="w-4 h-4 text-pink-400" /> Time Remaining to Claim
            </span>
            <span style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#f472b6', margin: '0.2rem 0' }}>
              {formatTimer(secondsRemaining)}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Auto-cascades to next customer if unclaimed
            </span>
          </div>
        )}
      </div>

      {/* Reserved Seat Breakdown */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
          Reserved Ticket Details
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Show</span>
            <strong style={{ display: 'block', fontSize: '1.1rem', color: '#fff' }}>{event.title}</strong>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{venue.name} &bull; {venue.city}</span>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Date & Time</span>
            <strong style={{ display: 'block', fontSize: '1rem', color: '#fff' }}>
              {show.date ? new Date(show.date).toLocaleDateString() : ''}
            </strong>
            <span style={{ color: '#fbbf24', fontSize: '0.85rem' }}>{show.startTime}</span>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Assigned Seat</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
              <span className="badge badge-live" style={{ fontSize: '0.9rem', padding: '0.35rem 0.75rem' }}>
                Seat {offer.offeredSeat}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>({offer.category})</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', fontSize: '1.25rem', fontWeight: 800 }}>
          <span>Ticket Price</span>
          <span style={{ color: '#34d399' }}>${offer.price}</span>
        </div>

        {/* Claim CTA */}
        <div style={{ marginTop: '2rem' }}>
          {!isExpired ? (
            <button
              onClick={handleClaim}
              disabled={isClaiming}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}
            >
              {isClaiming ? (
                <span>Confirming & Issuing Pass...</span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <Lock className="w-5 h-5" /> Claim Ticket (${offer.price}) & Confirm
                </span>
              )}
            </button>
          ) : (
            <Link to="/events" className="btn btn-secondary btn-lg" style={{ width: '100%', textAlign: 'center' }}>
              Browse Available Shows
            </Link>
          )}
        </div>
      </div>

    </div>
  );
}
