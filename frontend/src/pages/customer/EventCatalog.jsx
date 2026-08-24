import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import { 
  Film, 
  Music, 
  Search, 
  MapPin, 
  Calendar, 
  Ticket, 
  Sparkles, 
  ArrowRight, 
  Layers, 
  Clock, 
  Filter,
  DollarSign,
  X,
  ChevronRight,
  Sun,
  Sunset,
  Moon
} from 'lucide-react';

export default function EventCatalog() {
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [venues, setVenues] = useState([]);
  const [selectedType, setSelectedType] = useState('all'); // 'all', 'movie', 'concert'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCatalog = async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (selectedType !== 'all') params.append('type', selectedType);
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCity) params.append('city', selectedCity);
      if (selectedDate) params.append('date', selectedDate);
      if (selectedTimeSlot) params.append('timeSlot', selectedTimeSlot);

      const [eventsRes, venuesRes] = await Promise.all([
        api.get(`/api/events?${params.toString()}`),
        api.get('/api/venues'),
      ]);

      setEvents(eventsRes.data || []);
      setVenues(venuesRes.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load event catalog');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, [selectedType, searchTerm, selectedCity, selectedDate, selectedTimeSlot]);

  // Extract list of all unique cities from venues
  const cities = [...new Set(venues.map((v) => v.city).filter(Boolean))];

  // Quick Date Helpers
  const setDateToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
  };

  const setDateTomorrow = () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    setSelectedDate(tomorrow);
  };

  const setDateWeekend = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const distanceToSaturday = (6 - dayOfWeek + 7) % 7 || 7;
    const saturday = new Date(now.getTime() + distanceToSaturday * 86400000);
    setSelectedDate(saturday.toISOString().split('T')[0]);
  };

  const clearAllFilters = () => {
    setSelectedType('all');
    setSearchTerm('');
    setSelectedCity('');
    setSelectedDate('');
    setSelectedTimeSlot('');
  };

  const hasActiveFilters = selectedType !== 'all' || searchTerm || selectedCity || selectedDate || selectedTimeSlot;

  return (
    <div className="main-content">
      {/* Hero Header */}
      <div style={{ textAlign: 'center', padding: '2rem 1rem 2.5rem', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <span className="badge badge-live">
            <Sparkles className="w-3.5 h-3.5" /> Premier Screenings & Live Tours
          </span>
        </div>

        <h1 style={{ fontSize: '2.75rem', fontWeight: 800, marginBottom: '1rem', letterSpacing: '-0.03em' }}>
          Explore Movies & <span className="nav-brand-gradient">Live Concerts</span>
        </h1>

        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.6 }}>
          Filter by your preferred date, time slot, and city to reserve seats with live atomic hold protection.
        </p>
      </div>

      {/* Main Filter Control Panel */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* Top Row: Type Tabs & Search */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          
          {/* Type Filter Tabs */}
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              onClick={() => setSelectedType('all')}
              className={`btn btn-sm ${selectedType === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            >
              All Events
            </button>
            <button
              onClick={() => setSelectedType('movie')}
              className={`btn btn-sm ${selectedType === 'movie' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Film className="w-3.5 h-3.5" /> Movies
            </button>
            <button
              onClick={() => setSelectedType('concert')}
              className={`btn btn-sm ${selectedType === 'concert' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Music className="w-3.5 h-3.5" /> Concerts
            </button>
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 280px' }}>
            <input
              type="text"
              placeholder="Search by title or artist..."
              className="form-input"
              style={{ paddingLeft: '2.5rem', paddingRight: '1rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="w-4 h-4 text-slate-400" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
          </div>

        </div>

        {/* Second Row: Calendar Date, Time Slot, and City Dropdowns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
          
          {/* Calendar Date Picker */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem', fontWeight: 600 }}>
              <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Select Date
            </label>
            <input
              type="date"
              className="form-input"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
            />
          </div>

          {/* Time Slot Selector */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem', fontWeight: 600 }}>
              <Clock className="w-3.5 h-3.5 text-amber-400" /> Time of Day
            </label>
            <select
              className="form-select"
              value={selectedTimeSlot}
              onChange={(e) => setSelectedTimeSlot(e.target.value)}
              style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
            >
              <option value="">Any Time (All Day)</option>
              <option value="morning">🌅 Morning (Before 12:00 PM)</option>
              <option value="afternoon">☀️ Afternoon (12:00 PM - 5:00 PM)</option>
              <option value="evening">🌆 Evening (5:00 PM - 9:00 PM)</option>
              <option value="night">🌙 Late Night (After 9:00 PM)</option>
            </select>
          </div>

          {/* City Selector */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem', fontWeight: 600 }}>
              <MapPin className="w-3.5 h-3.5 text-rose-400" /> City / Location
            </label>
            <select
              className="form-select"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
            >
              <option value="">All Cities</option>
              {cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Quick Date Pills & Active Filter Tags Bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem', fontSize: '0.8rem' }}>
          
          {/* Quick Date Pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginRight: '0.25rem' }}>Quick Dates:</span>
            <button
              type="button"
              onClick={setDateToday}
              className={`badge ${selectedDate === new Date().toISOString().split('T')[0] ? 'badge-live' : 'badge-held'}`}
              style={{ cursor: 'pointer', border: 'none', padding: '0.25rem 0.6rem' }}
            >
              Today
            </button>
            <button
              type="button"
              onClick={setDateTomorrow}
              className={`badge ${selectedDate === new Date(Date.now() + 86400000).toISOString().split('T')[0] ? 'badge-live' : 'badge-held'}`}
              style={{ cursor: 'pointer', border: 'none', padding: '0.25rem 0.6rem' }}
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={setDateWeekend}
              className="badge badge-held"
              style={{ cursor: 'pointer', border: 'none', padding: '0.25rem 0.6rem' }}
            >
              This Weekend
            </button>
          </div>

          {/* Reset Filters Link */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="btn btn-secondary btn-sm"
              style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}
            >
              <X className="w-3 h-3" /> Clear All Filters
            </button>
          )}

        </div>

      </div>

      {/* Catalog Grid */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div className="pulse-dot" style={{ margin: '0 auto 1rem' }}></div>
          <p style={{ color: 'var(--text-muted)' }}>Searching available events and showtimes...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Ticket className="w-12 h-12 text-slate-500" style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Events Match Your Schedule</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            No shows found for the selected date, time slot, or city. Try choosing different dates or clearing filters.
          </p>
          <button onClick={clearAllFilters} className="btn btn-secondary">
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="grid-auto-fit" style={{ gap: '2rem' }}>
          {events.map((event) => (
            <div key={event._id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden' }}>
              
              {/* Poster Container */}
              <div style={{ position: 'relative', width: '100%', height: '240px', overflow: 'hidden' }}>
                <img
                  src={event.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80'}
                  alt={event.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }}
                  className="poster-hover-zoom"
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(17, 23, 38, 0.95) 100%)' }}></div>
                
                {/* Type Badge */}
                <div style={{ position: 'absolute', top: '1rem', left: '1rem' }}>
                  <span className={`badge ${event.type === 'concert' ? 'badge-waitlist' : 'badge-held'}`} style={{ backdropFilter: 'blur(8px)' }}>
                    {event.type === 'concert' ? <Music className="w-3 h-3" /> : <Film className="w-3 h-3" />}
                    {event.type}
                  </span>
                </div>

                {/* Starting Price Badge */}
                {event.startingPrice != null && (
                  <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
                    <span className="badge badge-live" style={{ backdropFilter: 'blur(8px)', background: 'rgba(16, 185, 129, 0.3)' }}>
                      From ${event.startingPrice}
                    </span>
                  </div>
                )}
              </div>

              {/* Event Body */}
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.4rem', lineHeight: 1.3 }}>
                  {event.title}
                </h3>

                {/* Cities & Venues Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.825rem', marginBottom: '0.75rem' }}>
                  <MapPin className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                  <span>{event.cities?.length > 0 ? event.cities.join(', ') : 'Various Venues'}</span>
                </div>

                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {event.description || 'Experience this world-class entertainment live with verified visual seat selection.'}
                </p>

                {/* Upcoming Showtimes Pills */}
                {event.showtimes?.length > 0 && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                      Upcoming Showtime Passes:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {event.showtimes.slice(0, 3).map((st) => {
                        const stDate = new Date(st.date);
                        return (
                          <Link
                            key={st._id}
                            to={`/shows/${st._id}`}
                            className="badge badge-held"
                            style={{ textDecoration: 'none', padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', transition: 'all 0.15s ease' }}
                            title={`Book ${st.venueName} on ${stDate.toLocaleDateString()} at ${st.startTime}`}
                          >
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>{stDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} &bull; {st.startTime}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Card Footer CTA */}
                <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    By {event.organiser?.name || 'Event Organiser'}
                  </span>

                  <Link to={`/events/${event._id}`} className="btn btn-primary btn-sm">
                    <span>View Shows & Book</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
