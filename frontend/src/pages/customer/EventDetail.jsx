import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api.js';
import { 
  Film, 
  Music, 
  Calendar, 
  Clock, 
  MapPin, 
  Ticket, 
  ArrowLeft, 
  Sparkles, 
  Users, 
  Tag,
  ChevronRight,
  ShieldCheck,
  Building2
} from 'lucide-react';

export default function EventDetail() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEvent = async () => {
      setIsLoading(true);
      setError('');
      try {
        const res = await api.get(`/api/events/${id}`);
        setEvent(res.data);
      } catch (err) {
        setError(err.message || 'Failed to load event details');
      } finally {
        setIsLoading(false);
      }
    };
    fetchEvent();
  }, [id]);

  if (isLoading) {
    return (
      <div className="main-content" style={{ textAlign: 'center', padding: '5rem 1rem' }}>
        <div className="pulse-dot" style={{ margin: '0 auto 1rem' }}></div>
        <p style={{ color: 'var(--text-muted)' }}>Loading event and available showtimes...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="main-content" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div className="glass-panel" style={{ maxWidth: '500px', margin: '0 auto', padding: '2.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Event Not Found</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{error || 'This listing may have ended or been moved.'}</p>
          <Link to="/events" className="btn btn-primary">
            <ArrowLeft className="w-4 h-4" /> Back to Catalog
          </Link>
        </div>
      </div>
    );
  }

  // Filter shows by selected city or date
  const filteredShows = (event.shows || []).filter((s) => {
    if (selectedCity && s.venue?.city !== selectedCity) return false;
    if (selectedDate) {
      const showDateStr = new Date(s.date).toISOString().split('T')[0];
      if (showDateStr !== selectedDate) return false;
    }
    return true;
  });

  const availableCities = [...new Set((event.shows || []).map((s) => s.venue?.city).filter(Boolean))];
  const availableDates = [...new Set((event.shows || []).map((s) => new Date(s.date).toISOString().split('T')[0]))];

  return (
    <div className="main-content">
      {/* Back Link */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/events" className="btn btn-secondary btn-sm">
          <ArrowLeft className="w-4 h-4" /> Back to All Events
        </Link>
      </div>

      {/* Event Hero Showcase */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '3rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '2.5rem', alignItems: 'center' }}>
          
          {/* Poster */}
          <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-medium)' }}>
            <img
              src={event.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80'}
              alt={event.title}
              style={{ width: '100%', height: '380px', objectFit: 'cover', display: 'block' }}
            />
          </div>

          {/* Details */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span className={`badge ${event.type === 'concert' ? 'badge-waitlist' : 'badge-held'}`}>
                {event.type === 'concert' ? <Music className="w-3.5 h-3.5" /> : <Film className="w-3.5 h-3.5" />}
                {event.type}
              </span>
              <span className="badge badge-live">
                <Sparkles className="w-3.5 h-3.5" /> Live Visual Seating Available
              </span>
            </div>

            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem', lineHeight: 1.2 }}>
              {event.title}
            </h1>

            <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: '1.5rem' }}>
              {event.description || 'Enjoy this immersive entertainment experience with live interactive seat reservation and verified QR email tickets.'}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Organised By</span>
                <strong style={{ color: '#fff' }}>{event.organiser?.name || 'Verified TicketNow Organiser'}</strong>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Upcoming Shows</span>
                <strong style={{ color: '#fff' }}>{event.shows?.length || 0} scheduled dates</strong>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Booking Protection</span>
                <strong style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <ShieldCheck className="w-4 h-4" /> 10-Min Hold TTL
                </strong>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Shows & Screening Schedule Section */}
      <div style={{ marginBottom: '4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar className="w-6 h-6 text-indigo-400" /> Select Showtime & Venue
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Choose a date and location to open the live visual seat selection grid
            </p>
          </div>

          {/* Quick City Filters */}
          {availableCities.length > 1 && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>City:</span>
              <button
                onClick={() => setSelectedCity('')}
                className={`btn btn-sm ${!selectedCity ? 'btn-primary' : 'btn-secondary'}`}
              >
                All Cities
              </button>
              {availableCities.map((city) => (
                <button
                  key={city}
                  onClick={() => setSelectedCity(city)}
                  className={`btn btn-sm ${selectedCity === city ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {city}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date Filter Pills */}
        {availableDates.length > 1 && (
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
            <button
              onClick={() => setSelectedDate('')}
              className={`btn btn-sm ${!selectedDate ? 'btn-primary' : 'btn-secondary'}`}
            >
              All Dates
            </button>
            {availableDates.map((dateStr) => {
              const d = new Date(dateStr);
              const dayName = d.toLocaleDateString(undefined, { weekday: 'short' });
              const dayMonth = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`btn btn-sm ${selectedDate === dateStr ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ display: 'flex', flexDirection: 'column', padding: '0.4rem 0.85rem', gap: '0.1rem' }}
                >
                  <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>{dayName}</span>
                  <span style={{ fontWeight: 700 }}>{dayMonth}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Shows List */}
        {filteredShows.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
            <Calendar className="w-10 h-10 text-slate-500" style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No Scheduled Shows Matching Filters</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Check back soon as organizers schedule additional dates and times.</p>
            <button onClick={() => { setSelectedCity(''); setSelectedDate(''); }} className="btn btn-secondary">
              Clear Filters
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredShows.map((show) => {
              const showDate = new Date(show.date);
              const prices = show.categoryPricing?.map(cp => cp.price) || [];
              const minPrice = prices.length > 0 ? Math.min(...prices) : 15;

              return (
                <div key={show._id} className="glass-card" style={{ display: 'grid', gridTemplateColumns: '140px 1.5fr 1.2fr auto', gap: '1.5rem', alignItems: 'center' }}>
                  
                  {/* Date & Time Block */}
                  <div style={{ background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: 'var(--radius-md)', padding: '0.85rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#818cf8', textTransform: 'uppercase' }}>
                      {showDate.toLocaleDateString(undefined, { weekday: 'short' })}
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: '0.1rem 0' }}>
                      {showDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                      <Clock className="w-3.5 h-3.5" /> {show.startTime}
                    </div>
                  </div>

                  {/* Venue & Location Details */}
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                      {show.venue?.name}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                      <MapPin className="w-4 h-4 text-rose-400 flex-shrink-0" />
                      <span>{show.venue?.address ? `${show.venue.address}, ` : ''}<strong>{show.venue?.city}</strong></span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Total Capacity: {show.venue?.totalCapacity || 0} reserved seats
                    </div>
                  </div>

                  {/* Pricing Tiers Breakdown */}
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                      Tickets Starting from <strong style={{ color: '#34d399', fontSize: '1.1rem' }}>${minPrice}</strong>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {show.categoryPricing?.map((cp, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          <strong>{cp.category}:</strong> ${cp.price}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Book Seats Button */}
                  <div>
                    <Link to={`/shows/${show._id}`} className="btn btn-primary btn-lg" style={{ whiteSpace: 'nowrap' }}>
                      <Ticket className="w-4 h-4" /> Select Seats
                    </Link>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
