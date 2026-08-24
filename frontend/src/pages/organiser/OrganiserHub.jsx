import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';
import { 
  Layers, 
  Film, 
  Music, 
  Calendar, 
  Clock, 
  MapPin, 
  Plus, 
  DollarSign, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ChevronRight,
  TrendingUp,
  SlidersHorizontal,
  Trash2
} from 'lucide-react';

export default function OrganiserHub() {
  const [activeTab, setActiveTab] = useState('shows'); // 'shows' or 'events'
  const [events, setEvents] = useState([]);
  const [shows, setShows] = useState([]);
  const [venues, setVenues] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals
  const [showEventModal, setShowEventModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // New Event Form State
  const [newEvent, setNewEvent] = useState({
    title: '',
    type: 'movie',
    description: '',
    posterUrl: '',
  });

  // New Show Form State
  const [newShow, setNewShow] = useState({
    eventListing: '',
    venue: '',
    date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    startTime: '19:30',
    categoryPricing: {},
  });

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [eventsRes, showsRes, venuesRes] = await Promise.all([
        api.get('/api/events/organiser/my-events'),
        api.get('/api/shows/organiser/my-shows'),
        api.get('/api/venues'),
      ]);

      setEvents(eventsRes.data || []);
      setShows(showsRes.data || []);
      setVenues(venuesRes.data || []);

      if (eventsRes.data?.length > 0 && !newShow.eventListing) {
        setNewShow(prev => ({ ...prev, eventListing: eventsRes.data[0]._id }));
      }
      if (venuesRes.data?.length > 0 && !newShow.venue) {
        handleVenueSelect(venuesRes.data[0]._id, venuesRes.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load organiser records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleVenueSelect = (venueId, availableVenues = venues) => {
    const selectedV = availableVenues.find(v => v._id === venueId);
    const initialPricing = {};
    if (selectedV?.categories) {
      selectedV.categories.forEach((cat, idx) => {
        initialPricing[cat.name] = (idx + 1) * 15; // default suggested price
      });
    }
    setNewShow(prev => ({
      ...prev,
      venue: venueId,
      categoryPricing: initialPricing,
    }));
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/api/events', newEvent);
      setSuccess(`Event listing "${newEvent.title}" published successfully!`);
      setShowEventModal(false);
      setNewEvent({ title: '', type: 'movie', description: '', posterUrl: '' });
      loadData();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to create event listing');
    }
  };

  const handleCreateShow = async (e) => {
    e.preventDefault();
    setError('');

    const formattedPricing = Object.entries(newShow.categoryPricing).map(([cat, price]) => ({
      category: cat,
      price: Number(price) || 15,
    }));

    if (formattedPricing.length === 0) {
      return setError('Please configure pricing for the venue seat categories');
    }

    try {
      const res = await api.post('/api/shows', {
        eventListing: newShow.eventListing,
        venue: newShow.venue,
        date: newShow.date,
        startTime: newShow.startTime,
        categoryPricing: formattedPricing,
      });

      setSuccess(`Show scheduled successfully! ${res.totalSeatsInitialized} seats mapped to visual grid.`);
      setShowScheduleModal(false);
      loadData();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to schedule show');
    }
  };

  const handleCancelShow = async (showId) => {
    if (!window.confirm('Are you sure you want to cancel this scheduled show?')) return;

    try {
      await api.patch(`/api/shows/${showId}/cancel`);
      setSuccess('Show marked as cancelled and holds released.');
      loadData();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      alert(err.message || 'Failed to cancel show');
    }
  };

  return (
    <div className="main-content">
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Layers className="w-8 h-8 text-indigo-400" /> Organiser Management Hub
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Publish movie & concert listings, attach shows to physical venues, and set category pricing
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link
            to="/organiser/analytics"
            className="btn btn-secondary btn-lg"
            style={{ color: '#818cf8', borderColor: 'rgba(99, 102, 241, 0.4)' }}
          >
            <TrendingUp className="w-4 h-4" /> Live Analytics
          </Link>
          <button
            onClick={() => setShowEventModal(true)}
            className="btn btn-secondary btn-lg"
          >
            <Plus className="w-4 h-4" /> New Event Listing
          </button>
          <button
            onClick={() => setShowScheduleModal(true)}
            className="btn btn-primary btn-lg"
          >
            <Calendar className="w-4 h-4" /> Schedule New Show
          </button>
        </div>
      </div>

      {success && (
        <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#34d399' }}>
          <CheckCircle2 className="w-5 h-5" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#fca5a5' }}>
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '2rem' }}>
        <button
          onClick={() => setActiveTab('shows')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'shows' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'shows' ? '#fff' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Calendar className="w-4 h-4" /> Scheduled Shows ({shows.length})
        </button>

        <button
          onClick={() => setActiveTab('events')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'events' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'events' ? '#fff' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Film className="w-4 h-4" /> My Event Catalog ({events.length})
        </button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="pulse-dot" style={{ margin: '0 auto 1rem' }}></div>
          <p style={{ color: 'var(--text-muted)' }}>Loading organiser workspace...</p>
        </div>
      ) : activeTab === 'shows' ? (
        /* Tab 1: Scheduled Shows */
        <div>
          {shows.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <Calendar className="w-12 h-12 text-slate-500" style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Shows Scheduled Yet</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Pick an event listing, assign it to a venue, and set tier pricing to launch ticket sales.
              </p>
              <button onClick={() => setShowScheduleModal(true)} className="btn btn-primary">
                <Calendar className="w-4 h-4" /> Schedule First Show
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {shows.map((show) => {
                const totalSeats = show.occupancy?.total || show.venue?.totalCapacity || 0;
                const bookedSeats = show.occupancy?.booked || 0;
                const heldSeats = show.occupancy?.held || 0;
                const availableSeats = show.occupancy?.available || (totalSeats - bookedSeats - heldSeats);
                const bookedPercent = totalSeats > 0 ? Math.round((bookedSeats / totalSeats) * 100) : 0;

                return (
                  <div key={show._id} className="glass-card" style={{ display: 'grid', gridTemplateColumns: '100px 1.5fr 1fr 1fr auto', gap: '1.5rem', alignItems: 'center' }}>
                    
                    {/* Event Poster Thumbnail */}
                    <img
                      src={show.eventListing?.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=300&q=80'}
                      alt={show.eventListing?.title}
                      style={{ width: '90px', height: '110px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
                    />

                    {/* Show & Venue Details */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <span className={`badge ${show.eventListing?.type === 'concert' ? 'badge-waitlist' : 'badge-held'}`} style={{ fontSize: '0.65rem' }}>
                          {show.eventListing?.type === 'concert' ? <Music className="w-3 h-3" /> : <Film className="w-3 h-3" />}
                          {show.eventListing?.type}
                        </span>
                        <span className={`badge ${show.status === 'scheduled' ? 'badge-live' : show.status === 'cancelled' ? 'badge-soldout' : 'badge-held'}`} style={{ fontSize: '0.65rem' }}>
                          {show.status}
                        </span>
                      </div>

                      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                        {show.eventListing?.title}
                      </h3>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <MapPin className="w-3.5 h-3.5 text-rose-400" /> {show.venue?.name} ({show.venue?.city})
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Calendar className="w-3.5 h-3.5 text-indigo-400" /> {new Date(show.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Clock className="w-3.5 h-3.5 text-amber-400" /> {show.startTime}
                        </span>
                      </div>
                    </div>

                    {/* Category Pricing Tiers */}
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tier Pricing</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.35rem' }}>
                        {show.categoryPricing?.map((cp, idx) => (
                          <span key={idx} style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.06)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                            <strong>{cp.category}:</strong> ${cp.price}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Real-time Occupancy Bar */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                        <span>Occupancy</span>
                        <strong>{bookedSeats} / {totalSeats} ({bookedPercent}%)</strong>
                      </div>
                      <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                        <div style={{ width: `${bookedPercent}%`, background: 'var(--status-booked)', transition: 'width 0.3s' }} title={`Booked: ${bookedSeats}`}></div>
                        <div style={{ width: `${(heldSeats / totalSeats) * 100}%`, background: 'var(--status-held-other)', transition: 'width 0.3s' }} title={`Held: ${heldSeats}`}></div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                        <span><span style={{ color: '#10b981' }}>●</span> {availableSeats} Available</span>
                        <span><span style={{ color: '#f59e0b' }}>●</span> {heldSeats} Held</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <Link to={`/shows/${show._id}`} className="btn btn-secondary btn-sm">
                        View Live Map
                      </Link>
                      {show.status === 'scheduled' && (
                        <button
                          onClick={() => handleCancelShow(show._id)}
                          className="btn btn-danger btn-sm"
                        >
                          Cancel Show
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Tab 2: My Event Catalog */
        <div className="grid-auto-fit">
          {events.map((event) => (
            <div key={event._id} className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <img
                src={event.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80'}
                alt={event.title}
                style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span className={`badge ${event.type === 'concert' ? 'badge-waitlist' : 'badge-held'}`}>
                  {event.type === 'concert' ? <Music className="w-3 h-3" /> : <Film className="w-3 h-3" />}
                  {event.type}
                </span>
                <span className="badge badge-live">
                  <Calendar className="w-3 h-3" /> {event.totalShows || 0} Shows
                </span>
              </div>

              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>{event.title}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {event.description || 'No description provided.'}
              </p>

              <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between' }}>
                <Link to={`/events/${event._id}`} className="btn btn-secondary btn-sm">
                  Public Listing Page
                </Link>
                <button
                  onClick={() => {
                    setNewShow(prev => ({ ...prev, eventListing: event._id }));
                    setShowScheduleModal(true);
                  }}
                  className="btn btn-primary btn-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Show
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: New Event Listing */}
      {showEventModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Create New Event Listing</h2>
              <button onClick={() => setShowEventModal(false)} className="btn btn-secondary btn-sm"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleCreateEvent}>
              <div className="form-group">
                <label className="form-label">Event Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Interstellar Live in Concert"
                  className="form-input"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Event Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setNewEvent({ ...newEvent, type: 'movie' })}
                    className={`btn ${newEvent.type === 'movie' ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    <Film className="w-4 h-4" /> Movie
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewEvent({ ...newEvent, type: 'concert' })}
                    className={`btn ${newEvent.type === 'concert' ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    <Music className="w-4 h-4" /> Concert
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  rows={3}
                  placeholder="Tell customers what makes this experience unforgettable..."
                  className="form-textarea"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                ></textarea>
              </div>

              <div className="form-group">
                <label className="form-label">Poster Image URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  className="form-input"
                  value={newEvent.posterUrl}
                  onChange={(e) => setNewEvent({ ...newEvent, posterUrl: e.target.value })}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.85rem' }}>
                Publish Event Listing
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Schedule New Show */}
      {showScheduleModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Schedule New Show</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Attach an event to a physical venue and set tier pricing</p>
              </div>
              <button onClick={() => setShowScheduleModal(false)} className="btn btn-secondary btn-sm"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleCreateShow}>
              {/* Event Selection */}
              <div className="form-group">
                <label className="form-label">1. Select Event Listing</label>
                <select
                  required
                  className="form-select"
                  value={newShow.eventListing}
                  onChange={(e) => setNewShow({ ...newShow, eventListing: e.target.value })}
                >
                  {events.map((ev) => (
                    <option key={ev._id} value={ev._id}>
                      {ev.title} ({ev.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Venue Selection */}
              <div className="form-group">
                <label className="form-label">2. Select Physical Venue</label>
                <select
                  required
                  className="form-select"
                  value={newShow.venue}
                  onChange={(e) => handleVenueSelect(e.target.value)}
                >
                  {venues.map((v) => (
                    <option key={v._id} value={v._id}>
                      {v.name} — {v.city} ({v.totalCapacity} Seats)
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">3. Show Date</label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={newShow.date}
                    onChange={(e) => setNewShow({ ...newShow, date: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">4. Start Time</label>
                  <input
                    type="time"
                    required
                    className="form-input"
                    value={newShow.startTime}
                    onChange={(e) => setNewShow({ ...newShow, startTime: e.target.value })}
                  />
                </div>
              </div>

              {/* Category-Tier Pricing */}
              <div className="form-group">
                <label className="form-label">5. Category Pricing ($ USD per Seat)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                  {Object.keys(newShow.categoryPricing).map((catName) => {
                    const venueObj = venues.find(v => v._id === newShow.venue);
                    const catObj = venueObj?.categories?.find(c => c.name === catName);
                    return (
                      <div key={catName} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: catObj?.colorTag || '#6366f1' }}></span>
                          <span>{catName}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>$</span>
                          <input
                            type="number"
                            min={1}
                            required
                            className="form-input"
                            style={{ width: '100px', padding: '0.35rem 0.5rem' }}
                            value={newShow.categoryPricing[catName]}
                            onChange={(e) => setNewShow({
                              ...newShow,
                              categoryPricing: { ...newShow.categoryPricing, [catName]: e.target.value },
                            })}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', marginBottom: '1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                ℹ️ All seats in the venue will be automatically mapped to this show with <strong>available</strong> status for real-time visual booking.
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.85rem' }}>
                Launch Show & Initialize Seat Map
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
