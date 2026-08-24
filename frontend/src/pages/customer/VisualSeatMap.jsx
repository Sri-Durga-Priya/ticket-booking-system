import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/api.js';
import { getSocket, joinShowRoom, leaveShowRoom } from '../../services/socket.js';
import { 
  Ticket, 
  Film, 
  Music, 
  Calendar, 
  Clock, 
  MapPin, 
  ArrowLeft, 
  Sparkles, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Users, 
  Lock,
  ArrowRight,
  Info,
  Layers
} from 'lucide-react';
import JoinWaitlistModal from '../../components/JoinWaitlistModal.jsx';

export default function VisualSeatMap() {
  const { id: showId } = useParams();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [showData, setShowData] = useState(null);
  const [seats, setSeats] = useState([]);
  const [categoryStats, setCategoryStats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]); // Array of seat objects { seatId, category, price }
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [socketStatus, setSocketStatus] = useState('connecting');
  const [recentUpdateNotice, setRecentUpdateNotice] = useState('');
  const [waitlistModalCategory, setWaitlistModalCategory] = useState(null);

  // Fetch initial seat map data
  const loadSeatMap = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await api.get(`/api/shows/${showId}/seats`);
      setShowData(res.data.show);
      setSeats(res.data.seats || []);
      setCategoryStats(res.data.categoryStats || []);
    } catch (err) {
      setError(err.message || 'Failed to load visual seat map');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSeatMap();

    // Socket.io Real-Time Room Subscription
    const socket = getSocket();
    joinShowRoom(showId);
    setSocketStatus('connected');

    // Handle single seat updates
    const handleSeatUpdate = (payload) => {
      if (payload.showId && payload.showId.toString() !== showId) return;

      setSeats((prevSeats) =>
        prevSeats.map((seat) => {
          if (seat.seatId === payload.seatId) {
            const isHeldByMe = user && payload.heldBy && payload.heldBy.toString() === (user._id || user.id);
            return {
              ...seat,
              status: payload.status,
              heldBy: payload.heldBy,
              isHeldByMe: Boolean(isHeldByMe),
              holdExpiresAt: payload.holdExpiresAt,
            };
          }
          return seat;
        })
      );

      // If seat held/booked by someone else was in my staged selection, remove it
      if (payload.status !== 'available' && (!user || payload.heldBy !== (user._id || user.id))) {
        setSelectedSeats((prev) => prev.filter((s) => s.seatId !== payload.seatId));
      }

      setRecentUpdateNotice(`Seat ${payload.seatId} is now ${payload.status}`);
      setTimeout(() => setRecentUpdateNotice(''), 3000);
    };

    // Handle batch seat updates (e.g. from sweep releases or show cancellation)
    const handleBatchSeatUpdate = (payload) => {
      if (payload.showId && payload.showId.toString() !== showId) return;
      if (!payload.seats || !Array.isArray(payload.seats)) return;

      const updateMap = {};
      payload.seats.forEach((s) => {
        updateMap[s.seatId] = s;
      });

      setSeats((prevSeats) =>
        prevSeats.map((seat) => {
          if (updateMap[seat.seatId]) {
            const updated = updateMap[seat.seatId];
            const isHeldByMe = user && updated.heldBy && updated.heldBy.toString() === (user._id || user.id);
            return {
              ...seat,
              status: updated.status,
              heldBy: updated.heldBy,
              isHeldByMe: Boolean(isHeldByMe),
              holdExpiresAt: updated.holdExpiresAt,
            };
          }
          return seat;
        })
      );

      setRecentUpdateNotice('Live seat availability refreshed');
      setTimeout(() => setRecentUpdateNotice(''), 3000);
    };

    socket.on('seat:updated', handleSeatUpdate);
    socket.on('seat:batch_updated', handleBatchSeatUpdate);

    return () => {
      leaveShowRoom(showId);
      socket.off('seat:updated', handleSeatUpdate);
      socket.off('seat:batch_updated', handleBatchSeatUpdate);
    };
  }, [showId, user]);

  // Handle seat click/selection
  const handleSeatSelect = (seat) => {
    // If seat is booked or held by others, ignore
    if (seat.status === 'booked') return;
    if (seat.status === 'held' && !seat.isHeldByMe) return;

    const isAlreadySelected = selectedSeats.some((s) => s.seatId === seat.seatId);

    if (isAlreadySelected) {
      // Deselect
      setSelectedSeats(selectedSeats.filter((s) => s.seatId !== seat.seatId));
    } else {
      // Max 6 seats limit per booking
      if (selectedSeats.length >= 6) {
        alert('You can select a maximum of 6 seats per booking order.');
        return;
      }
      setSelectedSeats([
        ...selectedSeats,
        {
          seatId: seat.seatId,
          category: seat.category,
          price: seat.price,
          row: seat.row,
          number: seat.number,
        },
      ]);
    }
  };

  // Running Total Calculation
  const totalAmount = selectedSeats.reduce((sum, s) => sum + (s.price || 0), 0);

  // Group seats into rows for grid rendering
  const seatRows = {};
  seats.forEach((seat) => {
    if (!seatRows[seat.row]) seatRows[seat.row] = [];
    seatRows[seat.row].push(seat);
  });

  if (isLoading) {
    return (
      <div className="main-content" style={{ textAlign: 'center', padding: '5rem 1rem' }}>
        <div className="pulse-dot" style={{ margin: '0 auto 1rem' }}></div>
        <p style={{ color: 'var(--text-muted)' }}>Loading live visual seat coordinates & availability...</p>
      </div>
    );
  }

  if (error || !showData) {
    return (
      <div className="main-content" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div className="glass-panel" style={{ maxWidth: '500px', margin: '0 auto', padding: '2.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Show Unavailable</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{error || 'The requested show could not be found.'}</p>
          <Link to="/events" className="btn btn-primary">Back to Catalog</Link>
        </div>
      </div>
    );
  }

  const showDate = new Date(showData.date);

  return (
    <div className="main-content">
      {/* Navigation & Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <Link to={`/events/${showData.eventListing?._id || ''}`} className="btn btn-secondary btn-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Event Details
        </Link>

        {/* Live Real-time Status Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {recentUpdateNotice && (
            <span className="badge badge-held" style={{ animation: 'slide-in-up 0.2s ease' }}>
              {recentUpdateNotice}
            </span>
          )}
          <span className="badge badge-live">
            <span className="pulse-dot"></span> Live Sync Active
          </span>
        </div>
      </div>

      {/* Show Information Banner */}
      <div className="glass-panel" style={{ padding: '1.5rem 2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span className={`badge ${showData.eventListing?.type === 'concert' ? 'badge-waitlist' : 'badge-held'}`}>
                {showData.eventListing?.type === 'concert' ? <Music className="w-3 h-3" /> : <Film className="w-3 h-3" />}
                {showData.eventListing?.type}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Visual Seat Reservation</span>
            </div>

            <h1 style={{ fontSize: '1.85rem', fontWeight: 800 }}>
              {showData.eventListing?.title}
            </h1>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.35rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <MapPin className="w-4 h-4 text-rose-400" /> {showData.venue?.name} &bull; <strong>{showData.venue?.city}</strong>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Calendar className="w-4 h-4 text-indigo-400" /> {showDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Clock className="w-4 h-4 text-amber-400" /> {showData.startTime}
              </span>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lock Guarantee</span>
            <div style={{ color: '#34d399', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'flex-end' }}>
              <ShieldCheck className="w-4 h-4" /> Atomic Concurrency Lock
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Visual Seat Canvas on Left, Checkout Cart on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', alignItems: 'start' }}>
        
        {/* Left Column: Visual Seat Map Canvas */}
        <div className="glass-panel" style={{ padding: '2rem 1.5rem' }}>
          
          {/* Status Color Codes Legend */}
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1.25rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <div style={{ width: '18px', height: '18px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', border: '2px solid var(--status-available)' }}></div>
              <span>Available</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <div style={{ width: '18px', height: '18px', borderRadius: '4px', background: 'var(--secondary)', border: '2px solid #fff', boxShadow: '0 0 8px var(--secondary-glow)' }}></div>
              <span>Selected by You</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <div style={{ width: '18px', height: '18px', borderRadius: '4px', background: 'var(--status-held-me)', border: '2px solid #60a5fa' }}></div>
              <span>Held by You</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <div style={{ width: '18px', height: '18px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.25)', border: '2px solid var(--status-held-other)', opacity: 0.8 }}></div>
              <span>Held (Other user)</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <div style={{ width: '18px', height: '18px', borderRadius: '4px', background: '#261019', border: '1px solid rgba(225, 29, 72, 0.4)', opacity: 0.5 }}></div>
              <span style={{ color: 'var(--text-muted)' }}>Booked</span>
            </div>
          </div>

          {/* Screen / Stage Glowing Bar */}
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div style={{
              width: '75%',
              height: '10px',
              background: 'linear-gradient(90deg, transparent, #6366f1 20%, #a855f7 50%, #6366f1 80%, transparent)',
              margin: '0 auto 0.75rem',
              borderRadius: '5px',
              boxShadow: '0 0 25px rgba(99, 102, 241, 0.6), 0 0 10px rgba(168, 85, 247, 0.4)',
            }}></div>
            <span style={{ fontSize: '0.75rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
              STAGE / CINEMA SCREEN
            </span>
          </div>

          {/* The Visual Grid of Seats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center', overflowX: 'auto', padding: '1rem 0' }}>
            {Object.entries(seatRows).map(([rowLabel, rowSeats]) => (
              <div key={rowLabel} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                
                {/* Left Row Label */}
                <span style={{ width: '24px', fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                  {rowLabel}
                </span>

                {/* Seats in this Row */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {rowSeats.sort((a, b) => a.number - b.number).map((seat) => {
                    const isSelected = selectedSeats.some((s) => s.seatId === seat.seatId);
                    const isHeldByMe = seat.isHeldByMe;
                    const isHeldByOther = seat.status === 'held' && !isHeldByMe;
                    const isBooked = seat.status === 'booked';
                    const isAvailable = seat.status === 'available';

                    // Get category color
                    const catObj = showData.venue?.categories?.find(c => c.name === seat.category);
                    const catColor = catObj?.colorTag || '#10b981';

                    // Dynamic Styling per Seat State
                    let seatBg = 'rgba(255,255,255,0.06)';
                    let seatBorder = `2px solid ${catColor}`;
                    let seatColor = '#fff';
                    let seatCursor = 'pointer';
                    let seatOpacity = 1;
                    let seatShadow = 'none';

                    if (isSelected) {
                      seatBg = 'var(--secondary)';
                      seatBorder = '2px solid #fff';
                      seatShadow = '0 0 14px var(--secondary-glow)';
                    } else if (isHeldByMe) {
                      seatBg = 'var(--status-held-me)';
                      seatBorder = '2px solid #60a5fa';
                      seatShadow = '0 0 12px var(--status-held-me-glow)';
                    } else if (isHeldByOther) {
                      seatBg = 'rgba(245, 158, 11, 0.2)';
                      seatBorder = '1.5px dashed var(--status-held-other)';
                      seatColor = '#fbbf24';
                      seatCursor = 'not-allowed';
                      seatOpacity = 0.75;
                    } else if (isBooked) {
                      seatBg = 'rgba(225, 29, 72, 0.15)';
                      seatBorder = '1px solid rgba(225, 29, 72, 0.3)';
                      seatColor = '#64748b';
                      seatCursor = 'not-allowed';
                      seatOpacity = 0.4;
                    }

                    return (
                      <button
                        type="button"
                        key={seat.seatId}
                        onClick={() => handleSeatSelect(seat)}
                        disabled={isBooked || isHeldByOther}
                        title={`Seat ${seat.seatId} | Category: ${seat.category} | Price: $${seat.price} | Status: ${isHeldByOther ? 'Held by another customer' : seat.status}`}
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px 8px 4px 4px',
                          background: seatBg,
                          border: seatBorder,
                          color: seatColor,
                          boxShadow: seatShadow,
                          opacity: seatOpacity,
                          cursor: seatCursor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          transition: 'all 0.15s ease',
                          position: 'relative',
                        }}
                      >
                        {isHeldByOther ? <Lock className="w-3 h-3" /> : seat.number}
                      </button>
                    );
                  })}
                </div>

                {/* Right Row Label */}
                <span style={{ width: '24px', fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                  {rowLabel}
                </span>

              </div>
            ))}
          </div>

          {/* Category Availability & Pricing Legend Bar */}
          <div style={{ marginTop: '3rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
            <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem', letterSpacing: '0.05em' }}>
              Category Availability & Tiers
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              {categoryStats.map((cat, i) => (
                <div key={i} style={{ background: 'rgba(0,0,0,0.3)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', border: `1px solid ${cat.available === 0 ? 'rgba(239,68,68,0.3)' : 'var(--border-subtle)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: cat.colorTag }}></span>
                      {cat.name}
                    </span>
                    <strong style={{ color: '#34d399' }}>${cat.price}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span>{cat.available} / {cat.total} left</span>
                    {cat.available === 0 ? (
                      <button
                        type="button"
                        onClick={() => setWaitlistModalCategory(cat.name)}
                        className="badge badge-waitlist"
                        style={{ border: 'none', cursor: 'pointer', fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
                      >
                        Join Waitlist &rarr;
                      </button>
                    ) : (
                      <span style={{ color: '#10b981', fontWeight: 600 }}>Available</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Join Waitlist Modal */}
        <JoinWaitlistModal
          show={showData}
          initialCategory={waitlistModalCategory}
          isOpen={Boolean(waitlistModalCategory)}
          onClose={() => setWaitlistModalCategory(null)}
        />

        {/* Right Column: Running Cart & Checkout / Hold Trigger (Task 7 & 8) */}
        <div className="glass-panel" style={{ padding: '1.75rem', position: 'sticky', top: '5rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Ticket className="w-5 h-5 text-indigo-400" /> Booking Summary
          </h3>

          {selectedSeats.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
              <Users className="w-10 h-10 text-slate-500" style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
              <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>No seats selected yet.</p>
              <p style={{ fontSize: '0.8rem' }}>Click available seats in the map to stage your reservation.</p>
            </div>
          ) : (
            <div>
              {/* Selected Seats List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem', maxHeight: '220px', overflowY: 'auto' }}>
                {selectedSeats.map((seat) => (
                  <div key={seat.seatId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div>
                      <strong style={{ fontSize: '0.95rem' }}>Seat {seat.seatId}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>{seat.category} Tier</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontWeight: 700, color: '#fff' }}>${seat.price}</span>
                      <button
                        onClick={() => handleSeatSelect(seat)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}
                        title="Remove seat"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  <span>Seats Selected ({selectedSeats.length})</span>
                  <span>${totalAmount}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  <span>Booking Fees</span>
                  <span style={{ color: '#34d399' }}>$0.00 (Free)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 800, color: '#fff', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                  <span>Total Due</span>
                  <span style={{ color: '#34d399' }}>${totalAmount}</span>
                </div>
              </div>

              {/* Action Button */}
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => {
                    navigate(`/checkout/${showId}`, {
                      state: {
                        show: showData,
                        selectedSeats,
                        totalAmount,
                      },
                    });
                  }}
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%', padding: '0.9rem' }}
                >
                  <span>Hold Seats & Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <div>
                  <Link
                    to="/login"
                    state={{ from: { pathname: `/shows/${showId}` } }}
                    className="btn btn-primary btn-lg"
                    style={{ width: '100%', padding: '0.9rem', marginBottom: '0.5rem' }}
                  >
                    <span>Sign In to Hold Seats</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    An active account is required to place time-boxed holds.
                  </p>
                </div>
              )}

              <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', justifyContent: 'center' }}>
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>10-Minute Hold TTL Starts on Checkout</span>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
