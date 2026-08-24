import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';
import { 
  Ticket, 
  Calendar, 
  Clock, 
  MapPin, 
  QrCode, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Film, 
  Music, 
  ArrowRight, 
  Sparkles, 
  Trash2, 
  Users, 
  ExternalLink,
  ShieldCheck,
  X
} from 'lucide-react';

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [waitlists, setWaitlists] = useState([]);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming', 'past', 'cancelled', 'waitlist'
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals state
  const [qrModalBooking, setQrModalBooking] = useState(null);
  const [cancelModalBooking, setCancelModalBooking] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [bookingsRes, waitlistsRes] = await Promise.all([
        api.get('/api/bookings/my-bookings'),
        api.get('/api/waitlist/my-waitlist'),
      ]);

      setBookings(bookingsRes.data || []);
      setWaitlists(waitlistsRes.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load booking history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Cancellation
  const handleConfirmCancel = async () => {
    if (!cancelModalBooking) return;
    setIsCancelling(true);
    try {
      const res = await api.patch(`/api/bookings/${cancelModalBooking._id}/cancel`);
      setCancelSuccessMsg(`Booking ${cancelModalBooking.bookingReference} cancelled successfully. Seats returned to pool / offered to waitlist.`);
      setCancelModalBooking(null);
      loadData();
      setTimeout(() => setCancelSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.message || 'Failed to cancel booking');
    } finally {
      setIsCancelling(false);
    }
  };

  const now = new Date();

  // Filter Bookings
  const upcomingBookings = bookings.filter(
    (b) => b.status === 'confirmed' && new Date(b.show?.date || b.createdAt) >= new Date(now.setHours(0, 0, 0, 0))
  );

  const pastBookings = bookings.filter(
    (b) => b.status === 'confirmed' && new Date(b.show?.date || b.createdAt) < new Date(now.setHours(0, 0, 0, 0))
  );

  const cancelledBookings = bookings.filter((b) => b.status === 'cancelled');

  return (
    <div className="main-content">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Ticket className="w-7 h-7 text-indigo-400" /> My Bookings & Passes
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Manage your tickets, view QR passes, check waitlist status, or request cancellations
          </p>
        </div>

        <Link to="/events" className="btn btn-primary btn-sm">
          <span>Browse More Shows</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {cancelSuccessMsg && (
        <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6ee7b7' }}>
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{cancelSuccessMsg}</span>
        </div>
      )}

      {/* Tabs Bar */}
      <div className="glass-panel" style={{ padding: '0.5rem', display: 'inline-flex', gap: '0.35rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`btn btn-sm ${activeTab === 'upcoming' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Upcoming ({upcomingBookings.length})
        </button>

        <button
          onClick={() => setActiveTab('past')}
          className={`btn btn-sm ${activeTab === 'past' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Past ({pastBookings.length})
        </button>

        <button
          onClick={() => setActiveTab('cancelled')}
          className={`btn btn-sm ${activeTab === 'cancelled' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Cancelled ({cancelledBookings.length})
        </button>

        <button
          onClick={() => setActiveTab('waitlist')}
          className={`btn btn-sm ${activeTab === 'waitlist' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Sparkles className="w-3.5 h-3.5" /> Waitlist Queues ({waitlists.length})
        </button>
      </div>

      {/* Content Rendering */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div className="pulse-dot" style={{ margin: '0 auto 1rem' }}></div>
          <p style={{ color: 'var(--text-muted)' }}>Loading your tickets...</p>
        </div>
      ) : activeTab === 'waitlist' ? (
        /* Waitlist Tab */
        waitlists.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
            <Users className="w-12 h-12 text-slate-500" style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Active Waitlist Entries</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>You are not currently in queue for any sold-out shows.</p>
            <Link to="/events" className="btn btn-secondary">Explore Events</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {waitlists.map((entry) => (
              <div key={entry._id} className="glass-card" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr auto', gap: '1.5rem', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <span className="badge badge-waitlist" style={{ textTransform: 'capitalize' }}>
                      Status: {entry.status}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Joined {new Date(entry.joinedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                    {entry.show?.eventListing?.title}
                  </h3>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {entry.show?.venue?.name} &bull; {entry.show?.date ? new Date(entry.show.date).toLocaleDateString() : ''} at {entry.show?.startTime}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Requested Tier</div>
                  <strong style={{ fontSize: '1rem', color: '#fff' }}>{entry.category} Category</strong>
                  {entry.status === 'offered' && (
                    <div style={{ color: '#f472b6', fontSize: '0.8rem', fontWeight: 700, marginTop: '0.25rem' }}>
                      🔥 Seat {entry.offeredSeat} Offered!
                    </div>
                  )}
                </div>

                <div>
                  {entry.status === 'offered' ? (
                    <Link to={`/claim-offer/${entry._id}`} className="btn btn-primary">
                      <span>Claim Seat Now</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  ) : entry.status === 'claimed' ? (
                    <span className="badge badge-live">Ticket Claimed</span>
                  ) : entry.status === 'waiting' ? (
                    <span className="badge badge-held">Waiting in FIFO Queue</span>
                  ) : (
                    <span className="badge badge-soldout">{entry.status}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Bookings List (Upcoming, Past, Cancelled) */
        (activeTab === 'upcoming' ? upcomingBookings : activeTab === 'past' ? pastBookings : cancelledBookings).length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
            <Ticket className="w-12 h-12 text-slate-500" style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No {activeTab} bookings found</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Browse upcoming movies and concerts to book your next seats.</p>
            <Link to="/events" className="btn btn-primary">Browse Events</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {(activeTab === 'upcoming' ? upcomingBookings : activeTab === 'past' ? pastBookings : cancelledBookings).map((booking) => {
              const show = booking.show || {};
              const event = show.eventListing || {};
              const venue = show.venue || {};
              const showDate = show.date ? new Date(show.date) : new Date(booking.createdAt);

              return (
                <div key={booking._id} className="glass-card" style={{ display: 'grid', gridTemplateColumns: '120px 1.5fr 1.2fr auto', gap: '1.5rem', alignItems: 'center' }}>
                  
                  {/* Poster Thumbnail */}
                  <div style={{ height: '110px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                    <img
                      src={event.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=400&q=80'}
                      alt={event.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>

                  {/* Show Details */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <span className={`badge ${booking.status === 'confirmed' ? 'badge-live' : 'badge-soldout'}`}>
                        {booking.status}
                      </span>
                      <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#38bdf8', fontWeight: 700 }}>
                        {booking.bookingReference}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                      {event.title}
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', color: 'var(--text-muted)', fontSize: '0.825rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <MapPin className="w-3.5 h-3.5 text-rose-400" /> {venue.name} &bull; {venue.city}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" /> {showDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} at {show.startTime}
                      </span>
                    </div>
                  </div>

                  {/* Reserved Seats & Snapshot Pricing */}
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
                      Reserved Seats ({booking.seats?.length || 0})
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.5rem' }}>
                      {booking.seats?.map((seat, i) => (
                        <span key={i} style={{ background: 'rgba(255,255,255,0.06)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-subtle)', fontSize: '0.8rem', fontWeight: 600 }}>
                          Seat {seat.seatId} <span style={{ color: '#34d399', marginLeft: '0.2rem' }}>${seat.priceAtBooking}</span>
                        </span>
                      ))}
                    </div>
                    <div style={{ fontSize: '0.85rem' }}>
                      Total Paid: <strong style={{ color: '#34d399' }}>${booking.totalAmount}</strong>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {booking.status === 'confirmed' && (
                      <>
                        <button
                          onClick={() => setQrModalBooking(booking)}
                          className="btn btn-primary btn-sm"
                          style={{ whiteSpace: 'nowrap' }}
                        >
                          <QrCode className="w-3.5 h-3.5" /> View Ticket
                        </button>

                        <button
                          onClick={() => setCancelModalBooking(booking)}
                          className="btn btn-secondary btn-sm"
                          style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Cancel
                        </button>
                      </>
                    )}

                    <Link
                      to={`/verify/${booking.bookingReference}`}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem' }}
                      title="Verify pass"
                    >
                      <ExternalLink className="w-3 h-3" /> Verify Pass
                    </Link>
                  </div>

                </div>
              );
            })}
          </div>
        )
      )}

      {/* QR Ticket Modal */}
      {qrModalBooking && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '2rem', textAlign: 'center', position: 'relative', border: '1px solid var(--border-medium)' }}>
            <button onClick={() => setQrModalBooking(null)} style={{ position: 'absolute', right: '1rem', top: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X className="w-5 h-5" />
            </button>

            <span className="badge badge-live" style={{ marginBottom: '0.75rem' }}>Official Admission Pass</span>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.35rem' }}>{qrModalBooking.show?.eventListing?.title}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              {qrModalBooking.show?.venue?.name} &bull; {qrModalBooking.show?.startTime}
            </p>

            <div style={{ background: '#111726', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'inline-block', border: '1px solid var(--border-medium)', marginBottom: '1rem' }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrModalBooking.bookingReference)}&bgcolor=111726&color=ffffff&qzone=1`}
                alt="Ticket QR"
                style={{ width: '180px', height: '180px', display: 'block' }}
              />
            </div>

            <div style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#38bdf8', letterSpacing: '0.05em' }}>
              {qrModalBooking.bookingReference}
            </div>

            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span>Seats: {qrModalBooking.seats?.map(s => s.seatId).join(', ')}</span>
              <span style={{ color: '#34d399', fontWeight: 700 }}>Total: ${qrModalBooking.totalAmount}</span>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      {cancelModalBooking && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '2rem', position: 'relative', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, textAlign: 'center', marginBottom: '0.5rem' }}>Cancel Booking?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Are you sure you want to cancel booking <strong>{cancelModalBooking.bookingReference}</strong> for <strong>{cancelModalBooking.show?.eventListing?.title}</strong>?
              <br /><br />
              <span style={{ color: '#fca5a5' }}>
                ⚠️ Released seats will immediately cascade to waiting customers on the waitlist or become available to the public.
              </span>
            </p>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setCancelModalBooking(null)}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Keep Booking
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                className="btn btn-danger"
                style={{ flex: 1 }}
              >
                {isCancelling ? 'Cancelling...' : 'Yes, Cancel Booking'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
