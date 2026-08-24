import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { getSocket } from './services/socket.js';
import api from './services/api.js';
import { 
  Ticket, 
  Film, 
  Music, 
  Calendar, 
  MapPin, 
  User, 
  LogOut, 
  ShieldCheck, 
  Layers, 
  Activity,
  CheckCircle2,
  AlertCircle,
  TrendingUp
} from 'lucide-react';

// Navigation Component
const Navbar = ({ socketConnected, apiHealthy }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="nav-brand">
          <Ticket className="w-6 h-6 text-indigo-400" />
          <span>Ticket <span className="nav-brand-gradient">Booking System</span></span>
          <span className="badge badge-live" style={{ marginLeft: '0.5rem', fontSize: '0.65rem' }}>
            <span className="pulse-dot" style={{ color: socketConnected ? '#10b981' : '#f59e0b' }}></span>
            {socketConnected ? 'Live Real-time' : 'Reconnecting...'}
          </span>
        </Link>

        <ul className="nav-links">
          <li>
            <Link to="/events" className="nav-link">
              <Film className="w-4 h-4" /> Browse Shows
            </Link>
          </li>
          {isAuthenticated && (
            <li>
              <Link to="/my-bookings" className="nav-link">
                <Ticket className="w-4 h-4" /> My Bookings
              </Link>
            </li>
          )}
          {isAuthenticated && (user?.role === 'organiser' || user?.role === 'admin') && (
            <>
              <li>
                <Link to="/organiser" className="nav-link">
                  <Layers className="w-4 h-4" /> Organiser Hub
                </Link>
              </li>
              <li>
                <Link to="/organiser/analytics" className="nav-link">
                  <TrendingUp className="w-4 h-4" /> Analytics
                </Link>
              </li>
            </>
          )}
          {isAuthenticated && user?.role === 'admin' && (
            <li>
              <Link to="/admin" className="nav-link">
                <ShieldCheck className="w-4 h-4" /> Admin Venues
              </Link>
            </li>
          )}

          {isAuthenticated ? (
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {user.name} <span className="badge badge-held" style={{ textTransform: 'capitalize' }}>{user.role}</span>
              </span>
              <button 
                onClick={() => { logout(); navigate('/'); }} 
                className="btn btn-secondary btn-sm"
                title="Log out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </li>
          ) : (
            <li style={{ display: 'flex', gap: '0.5rem', marginLeft: '0.5rem' }}>
              <Link to="/login" className="btn btn-secondary btn-sm">Sign In</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
};

// Home Landing Page for Task 1
const HomePage = ({ apiStatus }) => {
  return (
    <div className="main-content">
      {/* Hero Section */}
      <section style={{ textAlign: 'center', padding: '4rem 1rem 3rem', maxWidth: '850px', margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <span className="badge badge-live">
            <span className="pulse-dot"></span> Next-Gen Real-Time Booking Platform
          </span>
        </div>

        <h1 style={{ fontSize: '3.25rem', fontWeight: 800, marginBottom: '1.25rem', letterSpacing: '-0.03em' }}>
          Book Movies & Concerts with <br />
          <span className="nav-brand-gradient">Live Visual Seating & Zero Overbooking</span>
        </h1>

        <p style={{ fontSize: '1.15rem', color: 'var(--text-muted)', marginBottom: '2.5rem', lineHeight: 1.7 }}>
          Featuring real-time atomic seat locks, auto-expiring holds, automated cascading waitlists for sold-out events, and verified QR code email tickets.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <Link to="/events" className="btn btn-primary btn-lg">
            <Ticket className="w-5 h-5" /> Explore Events & Shows
          </Link>
          <a href="#system-status" className="btn btn-secondary btn-lg">
            <Activity className="w-5 h-5" /> View System Architecture
          </a>
        </div>
      </section>

      {/* Core Features Grid */}
      <section style={{ margin: '4rem 0' }}>
        <div className="grid-auto-fit">
          <div className="glass-card">
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: '#818cf8' }}>
              <Film className="w-5 h-5" />
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Live Visual Seat Map</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Interactive coordinate-based grid synced over WebSockets. See instantly when seats are held or booked by other users in real time.
            </p>
          </div>

          <div className="glass-card">
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: '#34d399' }}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Atomic Concurrency Protection</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Hard database-level atomic conditional updates guarantee that simultaneous seat selection attempts never result in double bookings.
            </p>
          </div>

          <div className="glass-card">
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(236, 72, 153, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: '#f472b6' }}>
              <Activity className="w-5 h-5" />
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Automated Waitlist Cascades</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Sold-out category waitlists automatically claim cancelled seats, generating time-limited private booking links for next-in-line customers.
            </p>
          </div>
        </div>
      </section>

      {/* System Health / Task 1 Verification Panel */}
      <section id="system-status" className="glass-panel" style={{ padding: '2rem', marginTop: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity className="w-5 h-5 text-indigo-400" /> System Status & Foundation (Task 1)
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              MERN Stack, Express 4, Socket.io, Node-cron Schedulers, and MongoDB Connection Monitor
            </p>
          </div>
          <span className="badge badge-live">
            <CheckCircle2 className="w-3.5 h-3.5" /> All Services Configured
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Backend API</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: apiStatus ? '#34d399' : '#f87171', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              {apiStatus ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {apiStatus ? 'Online (Port 5000)' : 'Connecting...'}
            </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Database (MongoDB)</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: apiStatus?.database?.isConnected ? '#34d399' : '#fbbf24', marginTop: '0.25rem' }}>
              {apiStatus?.database?.stateName || 'Checking...'}
            </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hold TTL Timer</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#60a5fa', marginTop: '0.25rem' }}>
              {apiStatus?.config?.holdTtlMinutes || 10} Minutes
            </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Waitlist Offer TTL</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f472b6', marginTop: '0.25rem' }}>
              {apiStatus?.config?.waitlistOfferTtlMinutes || 15} Minutes
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import AdminVenues from './pages/admin/AdminVenues.jsx';
import VenueEditor from './pages/admin/VenueEditor.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import OrganiserHub from './pages/organiser/OrganiserHub.jsx';
import EventCatalog from './pages/customer/EventCatalog.jsx';
import EventDetail from './pages/customer/EventDetail.jsx';
import VisualSeatMap from './pages/customer/VisualSeatMap.jsx';
import CheckoutPage from './pages/customer/CheckoutPage.jsx';
import BookingConfirmation from './pages/customer/BookingConfirmation.jsx';
import TicketVerify from './pages/customer/TicketVerify.jsx';
import ClaimOfferPage from './pages/customer/ClaimOfferPage.jsx';
import MyBookings from './pages/customer/MyBookings.jsx';
import AnalyticsDashboard from './pages/organiser/AnalyticsDashboard.jsx';

// Main Application Component
export default function App() {
  const [socketConnected, setSocketConnected] = useState(false);
  const [apiStatus, setApiStatus] = useState(null);
  const [waitlistAlert, setWaitlistAlert] = useState(null);

  useEffect(() => {
    // Check API Health
    const checkApi = async () => {
      try {
        const data = await api.get('/api/health');
        setApiStatus(data);
      } catch (e) {
        console.warn('API health check pending:', e.message);
      }
    };
    checkApi();
    const interval = setInterval(checkApi, 10000);

    // Socket Connection Monitor
    const socket = getSocket();
    if (socket.connected) setSocketConnected(true);

    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);

    // Global Waitlist Offer Notification
    const onWaitlistOffer = (payload) => {
      setWaitlistAlert(payload);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('waitlist:offered', onWaitlistOffer);

    return () => {
      clearInterval(interval);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('waitlist:offered', onWaitlistOffer);
    };
  }, []);

  return (
    <AuthProvider>
      <Router>
        <div className="app-container">
          <Navbar socketConnected={socketConnected} apiHealthy={!!apiStatus} />
          
          {/* Real-time Waitlist Offer Banner Toast */}
          {waitlistAlert && (
            <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999, background: 'linear-gradient(135deg, #1e1b4b, #311042)', border: '2px solid #ec4899', borderRadius: 'var(--radius-md)', padding: '1.25rem', boxShadow: '0 10px 30px rgba(236, 72, 153, 0.4)', maxWidth: '420px', animation: 'slide-in-up 0.3s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <span className="badge badge-waitlist">✨ Seat Allocated For You!</span>
                <button onClick={() => setWaitlistAlert(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
              </div>
              <strong style={{ display: 'block', fontSize: '1.05rem', color: '#fff', marginBottom: '0.25rem' }}>
                {waitlistAlert.eventTitle || 'Event'}
              </strong>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                A seat ({waitlistAlert.category}) opened up. You have 15 minutes to claim it!
              </p>
              <Link
                to={`/claim-offer/${waitlistAlert.waitlistId}`}
                onClick={() => setWaitlistAlert(null)}
                className="btn btn-primary btn-sm"
                style={{ width: '100%', textAlign: 'center' }}
              >
                Claim Seat Now
              </Link>
            </div>
          )}

          <Routes>
            <Route path="/" element={<HomePage apiStatus={apiStatus} />} />
            
            {/* Customer Browse & Discovery */}
            <Route path="/events" element={<EventCatalog />} />
            <Route path="/events/:id" element={<EventDetail />} />
            <Route path="/shows/:id" element={<VisualSeatMap />} />
            
            {/* Ticket Verification Scanner */}
            <Route path="/verify" element={<TicketVerify />} />
            <Route path="/verify/:ref" element={<TicketVerify />} />
            
            {/* Waitlist Private Claim Offer */}
            <Route
              path="/claim-offer/:id"
              element={
                <ProtectedRoute allowedRoles={['customer', 'organiser', 'admin']}>
                  <ClaimOfferPage />
                </ProtectedRoute>
              }
            />
            
            {/* Hold, Checkout & Booking Confirmation */}
            <Route
              path="/checkout/:showId"
              element={
                <ProtectedRoute allowedRoles={['customer', 'organiser', 'admin']}>
                  <CheckoutPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/booking-confirmation/:id"
              element={
                <ProtectedRoute allowedRoles={['customer', 'organiser', 'admin']}>
                  <BookingConfirmation />
                </ProtectedRoute>
              }
            />
            
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Customer Booking History & Cancellation */}
            <Route
              path="/my-bookings"
              element={
                <ProtectedRoute allowedRoles={['customer', 'organiser', 'admin']}>
                  <MyBookings />
                </ProtectedRoute>
              }
            />

            {/* Organiser Management Routes */}
            <Route
              path="/organiser"
              element={
                <ProtectedRoute allowedRoles={['organiser', 'admin']}>
                  <OrganiserHub />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organiser/shows"
              element={
                <ProtectedRoute allowedRoles={['organiser', 'admin']}>
                  <OrganiserHub />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organiser/analytics"
              element={
                <ProtectedRoute allowedRoles={['organiser', 'admin']}>
                  <AnalyticsDashboard />
                </ProtectedRoute>
              }
            />
            
            {/* Admin Venue Management Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminVenues />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/venues"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminVenues />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/venues/new"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <VenueEditor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/venues/edit/:id"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <VenueEditor />
                </ProtectedRoute>
              }
            />
          </Routes>

          <footer className="footer">
            <div className="footer-inner">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Ticket className="w-5 h-5 text-indigo-400" />
                <span style={{ fontWeight: 700, color: '#fff' }}>Ticket Booking System</span>
                <span>— Live MERN Platform</span>
              </div>
              <div>
                <span>Concurrency-Protected &bull; Socket.io Synced &bull; Node-cron Automated</span>
              </div>
            </div>
          </footer>
        </div>
      </Router>
    </AuthProvider>
  );
}
