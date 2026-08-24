import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import api from '../../services/api.js';
import { 
  CheckCircle2, 
  Ticket, 
  Calendar, 
  Clock, 
  MapPin, 
  Download, 
  Share2, 
  QrCode, 
  ArrowRight,
  ShieldCheck,
  Film,
  Music
} from 'lucide-react';

export default function BookingConfirmation() {
  const { id } = useParams();
  const location = useLocation();
  const [booking, setBooking] = useState(location.state?.booking || null);
  const [isLoading, setIsLoading] = useState(!booking);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!booking) {
      const fetchBooking = async () => {
        setIsLoading(true);
        try {
          const res = await api.get(`/api/bookings/${id}`);
          setBooking(res.data);
        } catch (err) {
          setError(err.message || 'Failed to load booking confirmation');
        } finally {
          setIsLoading(false);
        }
      };
      fetchBooking();
    }
  }, [id, booking]);

  if (isLoading) {
    return (
      <div className="main-content" style={{ textAlign: 'center', padding: '5rem 1rem' }}>
        <div className="pulse-dot" style={{ margin: '0 auto 1rem' }}></div>
        <p style={{ color: 'var(--text-muted)' }}>Loading booking details...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="main-content" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div className="glass-panel" style={{ maxWidth: '500px', margin: '0 auto', padding: '2.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Booking Not Found</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{error || 'Could not retrieve ticket details.'}</p>
          <Link to="/events" className="btn btn-primary">Browse Events</Link>
        </div>
      </div>
    );
  }

  const show = booking.show || {};
  const event = show.eventListing || {};
  const venue = show.venue || {};
  const showDate = show.date ? new Date(show.date) : new Date();

  // QR Code Image Data URL (using Google Charts API or fallback QR for immediate crisp display)
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(booking.bookingReference || id)}&bgcolor=111726&color=ffffff&qzone=1`;

  return (
    <div className="main-content" style={{ maxWidth: '850px', margin: '0 auto' }}>
      
      {/* Success Hero Card */}
      <div className="glass-panel" style={{ padding: '2.5rem 2rem', textAlign: 'center', marginBottom: '2.5rem', border: '1px solid rgba(16, 185, 129, 0.4)', background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, rgba(18, 24, 38, 0.8) 100%)' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', boxShadow: '0 0 25px rgba(16, 185, 129, 0.3)' }}>
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <span className="badge badge-live" style={{ marginBottom: '0.75rem' }}>
          Booking Confirmed & Verified
        </span>

        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          You're Going to {event.title || 'the Show'}!
        </h1>

        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: '540px', margin: '0 auto 1.5rem' }}>
          Your seats are locked. An official e-ticket with entry QR code has been generated.
        </p>

        {/* Human-Readable Booking Reference Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(0,0,0,0.4)', padding: '0.65rem 1.5rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-medium)' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Booking Ref:</span>
          <strong style={{ fontSize: '1.25rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', color: '#38bdf8' }}>
            {booking.bookingReference}
          </strong>
        </div>
      </div>

      {/* Ticket Details Board */}
      <div className="glass-panel" style={{ padding: '2rem', display: 'grid', gridTemplateColumns: '1fr 220px', gap: '2.5rem', alignItems: 'center', marginBottom: '2.5rem' }}>
        
        {/* Left: Show & Seat Breakdown */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span className={`badge ${event.type === 'concert' ? 'badge-waitlist' : 'badge-held'}`}>
              {event.type === 'concert' ? <Music className="w-3 h-3" /> : <Film className="w-3 h-3" />}
              {event.type}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Verified Ticket</span>
          </div>

          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '1rem' }}>
            {event.title}
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin className="w-4 h-4 text-rose-400" />
              <span><strong>{venue.name}</strong> &bull; {venue.address ? `${venue.address}, ` : ''}{venue.city}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>{showDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock className="w-4 h-4 text-amber-400" />
              <span>{show.startTime} (Doors open 30 min before)</span>
            </div>
          </div>

          {/* Reserved Seats List */}
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
              Reserved Seats & Snapshot Pricing
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {booking.seats?.map((seat, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.08)', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-medium)', fontSize: '0.85rem' }}>
                  <strong style={{ color: '#fff' }}>Seat {seat.seatId}</strong>
                  <span style={{ color: 'var(--text-muted)', marginLeft: '0.35rem' }}>({seat.category})</span>
                  <span style={{ color: '#34d399', fontWeight: 700, marginLeft: '0.5rem' }}>${seat.priceAtBooking}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', fontSize: '1.1rem', fontWeight: 800 }}>
              <span>Total Paid</span>
              <span style={{ color: '#34d399' }}>${booking.totalAmount}</span>
            </div>
          </div>
        </div>

        {/* Right: QR Code Pass */}
        <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.3)', padding: '1.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ background: '#111726', padding: '0.75rem', borderRadius: 'var(--radius-sm)', display: 'inline-block', border: '1px solid var(--border-medium)', marginBottom: '0.75rem' }}>
            <img
              src={qrCodeUrl}
              alt={`QR Code for ${booking.bookingReference}`}
              style={{ width: '150px', height: '150px', display: 'block', borderRadius: '4px' }}
            />
          </div>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.05em' }}>SCAN FOR VENUE ENTRY</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Scan at main box office</div>
        </div>

      </div>

      {/* Action CTA Buttons */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <Link to="/my-bookings" className="btn btn-secondary btn-lg">
          <Ticket className="w-5 h-5" /> View My Bookings
        </Link>
        <Link to="/events" className="btn btn-primary btn-lg">
          <span>Explore More Events</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

    </div>
  );
}
