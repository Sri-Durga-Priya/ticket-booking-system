import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';
import { 
  TrendingUp, 
  DollarSign, 
  Ticket, 
  Users, 
  PieChart, 
  BarChart3, 
  Sparkles, 
  Calendar, 
  Clock, 
  MapPin, 
  ArrowUpRight, 
  RefreshCw, 
  Layers, 
  Film, 
  Music,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [selectedType, setSelectedType] = useState('all'); // 'all', 'movie', 'concert'
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAnalytics = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await api.get('/api/analytics');
      setAnalytics(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load organiser analytics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (isLoading) {
    return (
      <div className="main-content" style={{ textAlign: 'center', padding: '5rem 1rem' }}>
        <div className="pulse-dot" style={{ margin: '0 auto 1rem' }}></div>
        <p style={{ color: 'var(--text-muted)' }}>Aggregating real-time show revenue, occupancy, and waitlist metrics...</p>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="main-content" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div className="glass-panel" style={{ maxWidth: '500px', margin: '0 auto', padding: '2.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Analytics Unavailable</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{error || 'Unable to retrieve dashboard metrics.'}</p>
          <button onClick={loadAnalytics} className="btn btn-primary">Retry</button>
        </div>
      </div>
    );
  }

  const { kpis, categoryDistribution, waitlistFunnel, shows } = analytics;

  // Filter shows
  const filteredShows = (shows || []).filter((s) => {
    if (selectedType === 'all') return true;
    return s.eventType === selectedType;
  });

  return (
    <div className="main-content">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span className="badge badge-live">
              <span className="pulse-dot"></span> Live Executive Analytics
            </span>
          </div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <TrendingUp className="w-7 h-7 text-indigo-400" /> Performance & Revenue Intelligence
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Real-time occupancy tracking, category revenue yields, and automated waitlist conversion statistics
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={loadAnalytics} className="btn btn-secondary btn-sm" title="Refresh metrics">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <Link to="/organiser" className="btn btn-primary btn-sm">
            <Layers className="w-3.5 h-3.5" /> Organiser Hub
          </Link>
        </div>
      </div>

      {/* Top Level Metric KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
        
        {/* Total Gross Revenue */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gross Revenue</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#34d399', marginBottom: '0.25rem' }}>
            ${kpis.totalRevenue.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Direct: ${kpis.directRevenue}</span>
            <span>Waitlist: ${kpis.waitlistRevenue}</span>
          </div>
        </div>

        {/* Total Tickets Sold */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tickets Sold</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Ticket className="w-5 h-5" />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginBottom: '0.25rem' }}>
            {kpis.totalTicketsSold.toLocaleString()} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 400 }}>seats</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Across {kpis.totalShowsCount} scheduled shows
          </div>
        </div>

        {/* Overall Occupancy Meter */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Average Occupancy</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#38bdf8', marginBottom: '0.25rem' }}>
            {kpis.overallOccupancyRate}%
          </div>
          <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${kpis.overallOccupancyRate}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #38bdf8)' }}></div>
          </div>
        </div>

        {/* Waitlist Conversion & Backlog */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Waitlist Yield</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(236, 72, 153, 0.2)', color: '#f472b6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f472b6', marginBottom: '0.25rem' }}>
            {kpis.waitlistConversionRate}% <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 400 }}>Claim Rate</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {kpis.waitlistBacklog} customers currently in queue
          </div>
        </div>

      </div>

      {/* Middle Section: Category Revenue Distribution & Booking Source */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
        
        {/* Category Revenue Distribution Card */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PieChart className="w-5 h-5 text-indigo-400" /> Revenue by Seating Category Tier
          </h3>

          {categoryDistribution.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No confirmed ticket sales recorded yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {categoryDistribution.map((cat, i) => {
                const percentage = kpis.totalRevenue > 0 ? Math.round((cat.revenue / kpis.totalRevenue) * 100) : 0;
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                      <strong style={{ color: '#fff' }}>{cat.category} Tier</strong>
                      <div>
                        <span style={{ color: 'var(--text-muted)', marginRight: '0.75rem' }}>{cat.ticketsSold} tickets</span>
                        <strong style={{ color: '#34d399' }}>${cat.revenue.toLocaleString()} ({percentage}%)</strong>
                      </div>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${percentage}%`, height: '100%', background: i === 0 ? '#ec4899' : i === 1 ? '#6366f1' : '#10b981', transition: 'width 0.8s ease' }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Waitlist Cascade Funnel Card */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles className="w-5 h-5 text-pink-400" /> Automated Waitlist Funnel
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: '0.9rem' }}>Active Waiting Backlog</span>
              <strong style={{ color: '#818cf8', fontSize: '1.1rem' }}>{waitlistFunnel.waiting}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: '0.9rem' }}>Offers Dispatched</span>
              <strong style={{ color: '#fbbf24', fontSize: '1.1rem' }}>{waitlistFunnel.offered}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: '0.9rem' }}>Successfully Claimed Passes</span>
              <strong style={{ color: '#34d399', fontSize: '1.1rem' }}>{waitlistFunnel.claimed}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: '0.9rem' }}>Unclaimed Expired / Cascaded</span>
              <strong style={{ color: '#f87171', fontSize: '1.1rem' }}>{waitlistFunnel.expired}</strong>
            </div>
          </div>
        </div>

      </div>

      {/* Per-Show Performance Matrix Table & Cards */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Per-Show Performance Matrix</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Real-time seat occupancy meters, revenue generated, and waitlist backlog per show
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setSelectedType('all')}
              className={`btn btn-sm ${selectedType === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            >
              All Shows
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
        </div>

        {filteredShows.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
            <Calendar className="w-10 h-10 text-slate-500" style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
            <p style={{ color: 'var(--text-muted)' }}>No scheduled shows found in this category.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredShows.map((show) => {
              const showDate = new Date(show.date);
              return (
                <div key={show._id} className="glass-card" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr auto', gap: '1.5rem', alignItems: 'center' }}>
                  
                  {/* Event & Venue */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                      <span className={`badge ${show.eventType === 'concert' ? 'badge-waitlist' : 'badge-held'}`} style={{ fontSize: '0.65rem' }}>
                        {show.eventType}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {showDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at {show.startTime}
                      </span>
                    </div>
                    <strong style={{ fontSize: '1.1rem', display: 'block' }}>{show.eventTitle}</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <MapPin className="w-3 h-3 inline text-rose-400" /> {show.venueName} &bull; {show.venueCity}
                    </span>
                  </div>

                  {/* Occupancy Meter */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Occupancy</span>
                      <strong>{show.occupancyRate}% ({show.bookedSeats}/{show.totalCapacity})</strong>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${show.occupancyRate}%`,
                          height: '100%',
                          background: show.occupancyRate > 70 ? '#34d399' : show.occupancyRate > 30 ? '#fbbf24' : '#6366f1',
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Revenue Generated */}
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Show Revenue</span>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#34d399', marginTop: '0.1rem' }}>
                      ${show.revenue.toLocaleString()}
                    </div>
                  </div>

                  {/* Waitlist Demand */}
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Waitlist Queue</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: show.waitlistBacklog > 0 ? '#f472b6' : 'var(--text-muted)', marginTop: '0.1rem' }}>
                      {show.waitlistBacklog} waiting
                    </div>
                  </div>

                  {/* Action */}
                  <div>
                    <Link to={`/shows/${show._id}`} className="btn btn-secondary btn-sm" title="View live seat map">
                      Live Map &rarr;
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
