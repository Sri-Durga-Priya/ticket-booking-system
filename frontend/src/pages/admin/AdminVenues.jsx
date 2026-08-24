import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import { 
  Building2, 
  Plus, 
  MapPin, 
  Users, 
  Trash2, 
  Edit3, 
  Search, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  Eye
} from 'lucide-react';

export default function AdminVenues() {
  const [venues, setVenues] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [previewVenue, setPreviewVenue] = useState(null);

  const navigate = useNavigate();

  const loadVenues = async () => {
    setIsLoading(true);
    setError('');
    try {
      let query = '';
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (cityFilter) params.append('city', cityFilter);
      if (params.toString()) query = `?${params.toString()}`;

      const res = await api.get(`/api/venues${query}`);
      setVenues(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load venues');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVenues();
  }, [searchTerm, cityFilter]);

  const handleDelete = async (venueId, venueName) => {
    if (!window.confirm(`Are you sure you want to delete venue "${venueName}"?`)) return;

    try {
      await api.delete(`/api/venues/${venueId}`);
      setSuccessMessage(`Venue "${venueName}" deleted successfully`);
      loadVenues();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      alert(err.message || 'Failed to delete venue');
    }
  };

  const cities = [...new Set(venues.map((v) => v.city).filter(Boolean))];

  return (
    <div className="main-content">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Building2 className="w-8 h-8 text-indigo-400" /> Venue & Seat Map Management
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Configure physical venues, coordinate-based visual seat grids, and category pricing tiers
          </p>
        </div>

        <Link to="/admin/venues/new" className="btn btn-primary btn-lg">
          <Plus className="w-5 h-5" /> Build New Venue & Seat Grid
        </Link>
      </div>

      {successMessage && (
        <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#34d399' }}>
          <CheckCircle2 className="w-5 h-5" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#fca5a5' }}>
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 280px' }}>
          <input
            type="text"
            placeholder="Search venue name, address, or city..."
            className="form-input"
            style={{ paddingLeft: '2.5rem' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="w-4 h-4 text-slate-400" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
        </div>

        <div style={{ width: '200px' }}>
          <select
            className="form-select"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
          >
            <option value="">All Cities</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Venues Grid */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="pulse-dot" style={{ margin: '0 auto 1rem' }}></div>
          <p style={{ color: 'var(--text-muted)' }}>Loading configured venues...</p>
        </div>
      ) : venues.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Building2 className="w-12 h-12 text-slate-500" style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Venues Configured</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Get started by building your first cinema hall or concert arena.</p>
          <Link to="/admin/venues/new" className="btn btn-primary">
            <Plus className="w-4 h-4" /> Create Venue
          </Link>
        </div>
      ) : (
        <div className="grid-auto-fit">
          {venues.map((venue) => (
            <div key={venue._id} className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{venue.name}</h3>
                <span className="badge badge-live">
                  <Users className="w-3 h-3" /> {venue.totalCapacity} Seats
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                <MapPin className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{venue.address ? `${venue.address}, ` : ''}<strong>{venue.city}</strong></span>
              </div>

              {/* Categories Pills */}
              <div style={{ margin: '0.75rem 0', display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {venue.categories?.map((cat, idx) => (
                  <span
                    key={idx}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      fontSize: '0.75rem',
                      padding: '0.2rem 0.5rem',
                      borderRadius: 'var(--radius-full)',
                      background: 'rgba(255,255,255,0.06)',
                      border: `1px solid ${cat.colorTag || '#6366f1'}`,
                    }}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cat.colorTag || '#6366f1' }}></span>
                    {cat.name}
                  </span>
                ))}
              </div>

              {/* Action Buttons */}
              <div style={{ marginTop: 'auto', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setPreviewVenue(venue)}
                  className="btn btn-secondary btn-sm"
                  title="Quick View Layout"
                >
                  <Eye className="w-4 h-4" /> Layout Preview
                </button>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Link
                    to={`/admin/venues/edit/${venue._id}`}
                    className="btn btn-secondary btn-sm"
                    title="Edit Venue & Layout"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleDelete(venue._id, venue.name)}
                    className="btn btn-danger btn-sm"
                    title="Delete Venue"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Visual Seat Map Preview Modal */}
      {previewVenue && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{previewVenue.name} — Seat Layout</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {previewVenue.city} &bull; {previewVenue.totalCapacity} Total Seats Configured
                </p>
              </div>
              <button onClick={() => setPreviewVenue(null)} className="btn btn-secondary btn-sm">Close</button>
            </div>

            {/* Screen / Stage indicator */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ width: '70%', height: '8px', background: 'linear-gradient(90deg, transparent, #6366f1, transparent)', margin: '0 auto 0.5rem', borderRadius: '4px', boxShadow: '0 0 15px #6366f1' }}></div>
              <span style={{ fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>STAGE / CINEMA SCREEN</span>
            </div>

            {/* Render Visual Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', padding: '1rem 0' }}>
              {(() => {
                // Group seats by row
                const rows = {};
                previewVenue.seatLayout.forEach((s) => {
                  if (!rows[s.row]) rows[s.row] = [];
                  rows[s.row].push(s);
                });

                return Object.entries(rows).map(([rowLabel, rowSeats]) => (
                  <div key={rowLabel} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: '24px', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{rowLabel}</span>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      {rowSeats.sort((a, b) => a.number - b.number).map((seat) => {
                        const catColor = previewVenue.categories.find(c => c.name === seat.category)?.colorTag || '#6366f1';
                        return (
                          <div
                            key={seat.seatId}
                            title={`${seat.seatId} (${seat.category})`}
                            style={{
                              width: '32px',
                              height: '30px',
                              borderRadius: '6px 6px 3px 3px',
                              background: 'rgba(255,255,255,0.06)',
                              border: `1.5px solid ${catColor}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              color: '#fff',
                            }}
                          >
                            {seat.number}
                          </div>
                        );
                      })}
                    </div>
                    <span style={{ width: '24px', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'right' }}>{rowLabel}</span>
                  </div>
                ));
              })()}
            </div>

            {/* Category Legend */}
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '1.25rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
              {previewVenue.categories.map((cat, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: cat.colorTag }}></span>
                  <span>{cat.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
