import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/api.js';
import confetti from 'canvas-confetti';
import { 
  ShieldCheck, 
  Clock, 
  Ticket, 
  CreditCard, 
  Lock, 
  AlertTriangle, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  MapPin, 
  ArrowRight,
  RefreshCw,
  Wallet
} from 'lucide-react';

export default function CheckoutPage() {
  const { showId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const state = location.state || {};
  const show = state.show;
  const selectedSeats = state.selectedSeats || [];
  const totalAmount = state.totalAmount || 0;

  const [isHolding, setIsHolding] = useState(true);
  const [holdError, setHoldError] = useState('');
  const [holdExpiresAt, setHoldExpiresAt] = useState(null);
  const [secondsRemaining, setSecondsRemaining] = useState(null);
  const [isExpired, setIsExpired] = useState(false);

  // Payment Form State
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cardData, setCardData] = useState({
    cardNumber: '4242 •••• •••• 4242',
    cardHolder: user?.name || 'Alice Customer',
    expiry: '12/28',
    cvv: '888',
  });
  const [upiId, setUpiId] = useState('alice@upi');
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  // 1. Place Atomic Seat Hold on Mount
  useEffect(() => {
    if (!selectedSeats || selectedSeats.length === 0) {
      navigate(`/shows/${showId}`);
      return;
    }

    const acquireHold = async () => {
      setIsHolding(true);
      setHoldError('');
      try {
        const seatIds = selectedSeats.map((s) => s.seatId);
        const res = await api.post('/api/bookings/hold', {
          showId,
          seatIds,
        });

        const expiresAt = new Date(res.data.holdExpiresAt);
        setHoldExpiresAt(expiresAt);

        const diffSeconds = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
        setSecondsRemaining(diffSeconds);
      } catch (err) {
        setHoldError(err.message || 'Seat hold failed. Another customer may have selected these seats.');
      } finally {
        setIsHolding(false);
      }
    };

    acquireHold();

    // Auto-release holds on page unload / navigation away if not checked out
    const handleBeforeUnload = () => {
      const seatIds = selectedSeats.map((s) => s.seatId);
      navigator.sendBeacon(
        `${import.meta.env.VITE_API_URL || ''}/api/bookings/release-hold`,
        JSON.stringify({ showId, seatIds })
      );
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [showId]);

  // 2. Countdown Timer Effect
  useEffect(() => {
    if (!holdExpiresAt || isExpired) return;

    const timer = setInterval(() => {
      const diffSeconds = Math.max(0, Math.floor((holdExpiresAt.getTime() - Date.now()) / 1000));
      setSecondsRemaining(diffSeconds);

      if (diffSeconds <= 0) {
        setIsExpired(true);
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [holdExpiresAt, isExpired]);

  // Manual Release and Navigate Back
  const handleCancelAndRelease = async () => {
    try {
      const seatIds = selectedSeats.map((s) => s.seatId);
      await api.post('/api/bookings/release-hold', { showId, seatIds });
    } catch (e) {
      // Ignore release error
    }
    navigate(`/shows/${showId}`);
  };

  // Submit Final Checkout
  const handleCompleteCheckout = async (e) => {
    e.preventDefault();
    if (isExpired) return;

    setIsProcessing(true);
    setCheckoutError('');

    try {
      const seatIds = selectedSeats.map((s) => s.seatId);
      const res = await api.post('/api/bookings/checkout', {
        showId,
        seatIds,
        source: 'direct',
        paymentMethod,
      });

      // Confetti Celebration
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch (ce) {
        // ignore
      }

      // Navigate to confirmation page
      navigate(`/booking-confirmation/${res.data._id}`, {
        state: { booking: res.data },
      });
    } catch (err) {
      setCheckoutError(err.message || 'Checkout failed. Please try again.');
      setIsProcessing(false);
    }
  };

  const formatTimer = (seconds) => {
    if (seconds == null) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Timer Progress Percentage (out of 600 seconds)
  const timerPercentage = Math.min(100, Math.max(0, ((secondsRemaining || 0) / 600) * 100));

  if (isHolding) {
    return (
      <div className="main-content" style={{ textAlign: 'center', padding: '5rem 1rem' }}>
        <div className="pulse-dot" style={{ margin: '0 auto 1.5rem', width: '14px', height: '14px' }}></div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Securing Your Seats...</h2>
        <p style={{ color: 'var(--text-muted)' }}>Placing atomic concurrency lock with 10-minute hold TTL</p>
      </div>
    );
  }

  if (holdError) {
    return (
      <div className="main-content" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div className="glass-panel" style={{ maxWidth: '550px', margin: '0 auto', padding: '2.5rem' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.75rem' }}>Seat Lock Conflict</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.75rem', lineHeight: 1.6 }}>
            {holdError}
          </p>
          <Link to={`/shows/${showId}`} className="btn btn-primary btn-lg">
            <ArrowLeft className="w-4 h-4" /> Return to Seat Map
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      {/* Top Breadcrumb */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={handleCancelAndRelease} className="btn btn-secondary btn-sm">
          <ArrowLeft className="w-4 h-4" /> Cancel & Release Seats
        </button>

        <span className="badge badge-live">
          <ShieldCheck className="w-3.5 h-3.5" /> 256-Bit SSL Encrypted Checkout
        </span>
      </div>

      {/* Expiry Warning Banner if timer expired */}
      {isExpired && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', color: '#fca5a5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertTriangle className="w-6 h-6 flex-shrink-0 text-rose-400" />
            <div>
              <strong style={{ display: 'block', fontSize: '1rem', color: '#fff' }}>Hold Window Expired (10 Minutes)</strong>
              <span>Your reserved seats have been automatically released for other customers.</span>
            </div>
          </div>
          <Link to={`/shows/${showId}`} className="btn btn-danger btn-sm">
            <RefreshCw className="w-4 h-4" /> Select Seats Again
          </Link>
        </div>
      )}

      {/* Main Checkout Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '2.5rem', alignItems: 'start' }}>
        
        {/* Left Column: Payment Form */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CreditCard className="w-5 h-5 text-indigo-400" /> Payment Details
            </h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Simulated Test Mode</span>
          </div>

          {checkoutError && (
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#fca5a5', fontSize: '0.9rem' }}>
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{checkoutError}</span>
            </div>
          )}

          {/* Payment Method Selector */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.75rem' }}>
            <button
              type="button"
              onClick={() => setPaymentMethod('card')}
              className={`btn ${paymentMethod === 'card' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flexDirection: 'column', padding: '0.85rem 0.5rem', gap: '0.35rem' }}
            >
              <CreditCard className="w-5 h-5" />
              <span style={{ fontSize: '0.8rem' }}>Credit Card</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('upi')}
              className={`btn ${paymentMethod === 'upi' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flexDirection: 'column', padding: '0.85rem 0.5rem', gap: '0.35rem' }}
            >
              <Wallet className="w-5 h-5" />
              <span style={{ fontSize: '0.8rem' }}>UPI / Netbanking</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('venue')}
              className={`btn ${paymentMethod === 'venue' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flexDirection: 'column', padding: '0.85rem 0.5rem', gap: '0.35rem' }}
            >
              <Ticket className="w-5 h-5" />
              <span style={{ fontSize: '0.8rem' }}>Pay at Venue</span>
            </button>
          </div>

          <form onSubmit={handleCompleteCheckout}>
            {paymentMethod === 'card' && (
              <div>
                <div className="form-group">
                  <label className="form-label">Card Number</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={cardData.cardNumber}
                    onChange={(e) => setCardData({ ...cardData, cardNumber: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Cardholder Name</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={cardData.cardHolder}
                    onChange={(e) => setCardData({ ...cardData, cardHolder: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Expiry (MM/YY)</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      value={cardData.expiry}
                      onChange={(e) => setCardData({ ...cardData, expiry: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">CVV / CVC</label>
                    <input
                      type="password"
                      required
                      maxLength={4}
                      className="form-input"
                      value={cardData.cvv}
                      onChange={(e) => setCardData({ ...cardData, cvv: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === 'upi' && (
              <div className="form-group">
                <label className="form-label">Virtual Payment Address (VPA / UPI ID)</label>
                <input
                  type="text"
                  required
                  placeholder="name@okaxis / username@upi"
                  className="form-input"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                />
              </div>
            )}

            {paymentMethod === 'venue' && (
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                ℹ️ Your seats are locked now with a verified QR ticket. You can present the booking reference at the venue box office before entry.
              </div>
            )}

            <button
              type="submit"
              disabled={isProcessing || isExpired}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', padding: '1rem', marginTop: '1rem', fontSize: '1.1rem' }}
            >
              {isProcessing ? (
                <span>Confirming Seats & Generating Ticket...</span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <Lock className="w-4 h-4" /> Pay ${totalAmount} & Confirm Booking
                </span>
              )}
            </button>
          </form>

        </div>

        {/* Right Column: Timer & Order Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Live Hold Expiry Countdown Timer Widget */}
          <div className="glass-panel" style={{ padding: '1.5rem', border: isExpired ? '1px solid #ef4444' : secondsRemaining < 120 ? '1px solid #f59e0b' : '1px solid var(--primary-glow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Clock className="w-4 h-4 text-indigo-400" /> Hold TTL Timer
              </span>
              <span className={`badge ${isExpired ? 'badge-soldout' : secondsRemaining < 120 ? 'badge-waitlist' : 'badge-held'}`}>
                {isExpired ? 'EXPIRED' : 'SEATS HELD'}
              </span>
            </div>

            {/* Big Countdown Digits */}
            <div style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: isExpired ? '#ef4444' : secondsRemaining < 120 ? '#f59e0b' : '#38bdf8', textAlign: 'center', margin: '0.5rem 0' }}>
              {formatTimer(secondsRemaining)}
            </div>

            {/* Countdown Progress Bar */}
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden', margin: '0.75rem 0' }}>
              <div
                style={{
                  width: `${timerPercentage}%`,
                  height: '100%',
                  background: isExpired ? '#ef4444' : secondsRemaining < 120 ? '#f59e0b' : 'linear-gradient(90deg, #6366f1, #38bdf8)',
                  transition: 'width 1s linear',
                }}
              ></div>
            </div>

            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              {isExpired
                ? 'Time is up! Your hold was auto-released.'
                : 'Seats are exclusively reserved for your session until the timer hits 0:00.'}
            </p>
          </div>

          {/* Show & Snapshot Order Summary */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              Order Snapshot
            </h3>

            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{show?.eventListing?.title}</h4>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.2rem' }}>
                  <MapPin className="w-3.5 h-3.5 text-rose-400" /> {show?.venue?.name} &bull; {show?.venue?.city}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" /> {show?.date ? new Date(show.date).toLocaleDateString() : ''} at {show?.startTime}
                </div>
              </div>
            </div>

            {/* Reserved Seats List with Snapshot Pricing */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {selectedSeats.map((seat) => (
                <div key={seat.seatId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem 0.75rem', borderRadius: '4px' }}>
                  <div>
                    <strong>Seat {seat.seatId}</strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '0.4rem' }}>({seat.category})</span>
                  </div>
                  <strong>${seat.price}</strong>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 800 }}>
              <span>Total Price</span>
              <span style={{ color: '#34d399' }}>${totalAmount}</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
