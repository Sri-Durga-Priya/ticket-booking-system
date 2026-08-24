import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api.js';
import { 
  CheckCircle2, 
  XCircle, 
  Search, 
  ShieldCheck, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Ticket, 
  Film, 
  Music,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';

export default function TicketVerify() {
  const { ref } = useParams();
  const [searchRef, setSearchRef] = useState(ref || '');
  const [ticketData, setTicketData] = useState(null);
  const [isValid, setIsValid] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const verifyTicket = async (referenceToVerify) => {
    if (!referenceToVerify) return;
    setIsLoading(true);
    setErrorMsg('');
    setTicketData(null);
    setIsValid(null);

    try {
      const res = await api.get(`/api/bookings/verify/${referenceToVerify.trim().toUpperCase()}`);
      setTicketData(res.data);
      setIsValid(res.isValid);
    } catch (err) {
      setIsValid(false);
      setErrorMsg(err.message || 'Ticket verification failed. Please check the reference code.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (ref) {
      verifyTicket(ref);
    }
  }, [ref]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchRef) {
      verifyTicket(searchRef);
    }
  };

  return (
    <div className="main-content" style={{ maxWidth: '750px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <span className="badge badge-live">
            <ShieldCheck className="w-3.5 h-3.5" /> Official Admission Validator
          </span>
        </div>
        <h1 style={{ fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
          TicketNow <span className="nav-brand-gradient">Verification Portal</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Scan QR code or enter booking reference to authenticate entry passes
        </p>
      </div>

      {/* Search / Lookup Bar */}
      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '2rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.75rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              placeholder="Enter Booking Reference (e.g. TN-7X9K2L1)..."
              className="form-input"
              style={{ paddingLeft: '2.5rem', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', fontWeight: 700 }}
              value={searchRef}
              onChange={(e) => setSearchRef(e.target.value)}
            />
            <Search className="w-4 h-4 text-slate-400" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }} />
          </div>
          <button type="submit" disabled={isLoading} className="btn btn-primary">
            {isLoading ? 'Verifying...' : 'Authenticate'}
          </button>
        </form>
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <div className="pulse-dot" style={{ margin: '0 auto 1rem' }}></div>
          <p style={{ color: 'var(--text-muted)' }}>Cryptographically validating ticket with ledger...</p>
        </div>
      )}

      {/* Valid Ticket Result */}
      {!isLoading && isValid === true && ticketData && (
        <div className="glass-panel" style={{ padding: '2.5rem 2rem', border: '1px solid rgba(16, 185, 129, 0.4)', background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.1) 0%, rgba(17, 23, 38, 0.9) 100%)', animation: 'scale-up 0.25s ease' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <span className="badge badge-live" style={{ marginBottom: '0.2rem' }}>VALID PASS &bull; ENTRY APPROVED</span>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>
                  {ticketData.eventTitle}
                </h2>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Reference</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                {ticketData.bookingReference}
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
            
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Attendee</span>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fff', marginTop: '0.2rem' }}>{ticketData.customerName}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{ticketData.customerEmail}</div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Venue & Showtime</span>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff', marginTop: '0.2rem' }}>{ticketData.venueName}, {ticketData.venueCity}</div>
              <div style={{ fontSize: '0.8rem', color: '#fbbf24' }}>{ticketData.showDate ? new Date(ticketData.showDate).toLocaleDateString() : ''} at {ticketData.startTime}</div>
            </div>

          </div>

          {/* Admitted Seats */}
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
              Admitted Reserved Seats ({ticketData.seats?.length || 0})
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {ticketData.seats?.map((seat, i) => (
                <span key={i} style={{ background: 'rgba(255,255,255,0.08)', padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-medium)', fontSize: '0.9rem', fontWeight: 700 }}>
                  Seat {seat.seatId} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({seat.category})</span>
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <span>Booking Source: <strong style={{ color: '#fff', textTransform: 'capitalize' }}>{ticketData.source}</strong></span>
            <span>Total Paid: <strong style={{ color: '#34d399', fontSize: '1rem' }}>${ticketData.totalAmount}</strong></span>
          </div>

        </div>
      )}

      {/* Invalid / Rejected Ticket Result */}
      {!isLoading && isValid === false && (
        <div className="glass-panel" style={{ padding: '2.5rem 2rem', border: '1px solid rgba(239, 68, 68, 0.4)', background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.1) 0%, rgba(17, 23, 38, 0.9) 100%)', textAlign: 'center', animation: 'scale-up 0.25s ease' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
            <XCircle className="w-9 h-9" />
          </div>

          <span className="badge badge-soldout" style={{ marginBottom: '0.75rem' }}>
            ENTRY DENIED &bull; INVALID TICKET
          </span>

          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.5rem', color: '#fff' }}>
            Authentication Failed
          </h2>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '480px', margin: '0 auto 1.5rem' }}>
            {errorMsg || 'This ticket reference is either invalid, expired, or has been cancelled.'}
          </p>

          <Link to="/events" className="btn btn-secondary">
            Browse Valid Events
          </Link>
        </div>
      )}

    </div>
  );
}
