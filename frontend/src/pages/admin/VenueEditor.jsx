import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../services/api.js';
import { 
  Building2, 
  Save, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Layers, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Paintbrush
} from 'lucide-react';

export default function VenueEditor() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [categories, setCategories] = useState([
    { name: 'Standard', colorTag: '#10b981' },
    { name: 'Premium', colorTag: '#6366f1' },
    { name: 'VIP', colorTag: '#ec4899' },
  ]);
  const [rowConfigs, setRowConfigs] = useState([
    { row: 'A', seats: 8, category: 'VIP' },
    { row: 'B', seats: 8, category: 'VIP' },
    { row: 'C', seats: 10, category: 'Premium' },
    { row: 'D', seats: 10, category: 'Premium' },
    { row: 'E', seats: 10, category: 'Standard' },
    { row: 'F', seats: 10, category: 'Standard' },
  ]);
  const [seatLayout, setSeatLayout] = useState([]);
  const [activeCategoryBrush, setActiveCategoryBrush] = useState('Standard');

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load existing venue if edit mode
  useEffect(() => {
    if (isEditMode) {
      const fetchVenue = async () => {
        setIsLoading(true);
        try {
          const res = await api.get(`/api/venues/${id}`);
          const venue = res.data;
          setName(venue.name || '');
          setAddress(venue.address || '');
          setCity(venue.city || '');
          if (venue.categories && venue.categories.length > 0) {
            setCategories(venue.categories);
            setActiveCategoryBrush(venue.categories[0].name);
          }
          if (venue.seatLayout && venue.seatLayout.length > 0) {
            setSeatLayout(venue.seatLayout);
          }
        } catch (err) {
          setError(err.message || 'Failed to load venue data');
        } finally {
          setIsLoading(false);
        }
      };
      fetchVenue();
    } else {
      generateLayoutFromConfigs();
    }
  }, [id, isEditMode]);

  // Generate seat layout coordinates from rowConfigs
  const generateLayoutFromConfigs = () => {
    const layout = [];
    let yCoord = 0;

    for (const r of rowConfigs) {
      const rowLabel = r.row.toUpperCase();
      const count = parseInt(r.seats, 10) || 8;
      const cat = r.category || categories[0]?.name || 'Standard';

      for (let i = 1; i <= count; i++) {
        layout.push({
          seatId: `${rowLabel}${i}`,
          row: rowLabel,
          number: i,
          category: cat,
          x: i - 1,
          y: yCoord,
        });
      }
      yCoord++;
    }

    setSeatLayout(layout);
  };

  // Add / remove category
  const handleAddCategory = () => {
    const defaultColors = ['#10b981', '#6366f1', '#ec4899', '#f59e0b', '#3b82f6', '#14b8a6'];
    const newCatName = `Tier ${categories.length + 1}`;
    const newColor = defaultColors[categories.length % defaultColors.length];
    setCategories([...categories, { name: newCatName, colorTag: newColor }]);
  };

  const handleUpdateCategory = (index, field, value) => {
    const updated = [...categories];
    updated[index][field] = value;
    setCategories(updated);
  };

  const handleRemoveCategory = (index) => {
    if (categories.length <= 1) return alert('Venue must have at least one seat category');
    const catToRemove = categories[index].name;
    const updated = categories.filter((_, i) => i !== index);
    setCategories(updated);

    // Reassign seats that had this category
    const fallbackCat = updated[0].name;
    setSeatLayout(seatLayout.map(s => s.category === catToRemove ? { ...s, category: fallbackCat } : s));
  };

  // Row config handlers
  const handleAddRow = () => {
    const nextRowLetter = String.fromCharCode(65 + rowConfigs.length); // A, B, C...
    const updated = [...rowConfigs, { row: nextRowLetter, seats: 10, category: categories[0]?.name || 'Standard' }];
    setRowConfigs(updated);
  };

  const handleUpdateRowConfig = (index, field, value) => {
    const updated = [...rowConfigs];
    updated[index][field] = value;
    setRowConfigs(updated);
  };

  const handleRemoveRow = (index) => {
    if (rowConfigs.length <= 1) return alert('Venue must have at least one row');
    const updated = rowConfigs.filter((_, i) => i !== index);
    setRowConfigs(updated);
  };

  // Paint / click individual seat in canvas
  const handleSeatClick = (seatId) => {
    setSeatLayout(prev =>
      prev.map(seat =>
        seat.seatId === seatId ? { ...seat, category: activeCategoryBrush } : seat
      )
    );
  };

  // Save venue to backend
  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim() || !city.trim()) {
      return setError('Please enter a venue name and city');
    }

    if (seatLayout.length === 0) {
      return setError('Please generate or configure at least one seat');
    }

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        categories,
        seatLayout,
      };

      if (isEditMode) {
        await api.put(`/api/venues/${id}`, payload);
        setSuccess('Venue and seat layout updated successfully!');
      } else {
        await api.post('/api/venues', payload);
        setSuccess('Venue created successfully!');
      }

      setTimeout(() => {
        navigate('/admin');
      }, 1200);
    } catch (err) {
      setError(err.message || 'Failed to save venue');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="main-content" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div className="pulse-dot" style={{ margin: '0 auto 1rem' }}></div>
        <p style={{ color: 'var(--text-muted)' }}>Loading venue editor...</p>
      </div>
    );
  }

  return (
    <div className="main-content">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/admin" className="btn btn-secondary btn-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Venues
          </Link>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>
              {isEditMode ? `Edit Venue: ${name || 'Untitled'}` : 'Visual Seat Layout Designer'}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Define venue details, seat coordinate grids, and category color codes
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="btn btn-primary btn-lg"
        >
          <Save className="w-5 h-5" /> {isSaving ? 'Saving...' : 'Save Venue & Layout'}
        </button>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Left Column: Form Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* 1. Basic Details */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 className="w-4 h-4 text-indigo-400" /> 1. Venue Details
            </h3>

            <div className="form-group">
              <label className="form-label">Venue Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Royal Symphony Grand Hall"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">City</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. San Francisco"
                  className="form-input"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Street Address</label>
                <input
                  type="text"
                  placeholder="e.g. 500 Market St"
                  className="form-input"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 2. Seat Categories */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers className="w-4 h-4 text-indigo-400" /> 2. Seat Categories & Color Codes
              </h3>
              <button
                type="button"
                onClick={handleAddCategory}
                className="btn btn-secondary btn-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Add Tier
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {categories.map((cat, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)' }}>
                  <input
                    type="color"
                    value={cat.colorTag || '#6366f1'}
                    onChange={(e) => handleUpdateCategory(idx, 'colorTag', e.target.value)}
                    style={{ width: '32px', height: '32px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'none' }}
                  />
                  <input
                    type="text"
                    value={cat.name}
                    placeholder="Category Name"
                    className="form-input"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.9rem' }}
                    onChange={(e) => handleUpdateCategory(idx, 'name', e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveCategory(idx)}
                    className="btn btn-danger btn-sm"
                    style={{ padding: '0.4rem 0.6rem' }}
                    title="Delete Category"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Row Grid Generator Tool */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles className="w-4 h-4 text-indigo-400" /> 3. Row Grid Matrix Generator
              </h3>
              <button
                type="button"
                onClick={handleAddRow}
                className="btn btn-secondary btn-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Add Row
              </button>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>
              Configure row letters, seat count, and initial category tier, then generate coordinates:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '240px', overflowY: 'auto', marginBottom: '1rem', paddingRight: '0.25rem' }}>
              {rowConfigs.map((r, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '50px 70px 1fr 36px', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={r.row}
                    maxLength={2}
                    className="form-input"
                    style={{ padding: '0.35rem', textAlign: 'center', fontWeight: 700 }}
                    onChange={(e) => handleUpdateRowConfig(i, 'row', e.target.value.toUpperCase())}
                  />
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={r.seats}
                    className="form-input"
                    style={{ padding: '0.35rem', textAlign: 'center' }}
                    onChange={(e) => handleUpdateRowConfig(i, 'seats', e.target.value)}
                  />
                  <select
                    className="form-select"
                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
                    value={r.category}
                    onChange={(e) => handleUpdateRowConfig(i, 'category', e.target.value)}
                  >
                    {categories.map((c, ci) => (
                      <option key={ci} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(i)}
                    className="btn btn-danger btn-sm"
                    style={{ padding: '0.4rem' }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={generateLayoutFromConfigs}
              className="btn btn-secondary"
              style={{ width: '100%' }}
            >
              <Sparkles className="w-4 h-4 text-indigo-400" /> Apply Grid & Re-map Coordinates
            </button>
          </div>
        </div>

        {/* Right Column: Visual Layout Canvas & Category Brush */}
        <div className="glass-panel" style={{ padding: '1.75rem', position: 'sticky', top: '5rem' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Interactive Visual Seat Canvas</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Total: <strong style={{ color: '#fff' }}>{seatLayout.length} seats</strong> mapped to (x, y) coordinates
              </p>
            </div>

            {/* Category Paint Brush Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-subtle)' }}>
              <Paintbrush className="w-3.5 h-3.5 text-indigo-400" />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Brush Tool:</span>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                {categories.map((cat, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveCategoryBrush(cat.name)}
                    style={{
                      padding: '0.2rem 0.5rem',
                      fontSize: '0.7rem',
                      borderRadius: 'var(--radius-full)',
                      border: activeCategoryBrush === cat.name ? `2px solid #fff` : `1px solid ${cat.colorTag}`,
                      background: cat.colorTag,
                      color: '#fff',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: 'var(--radius-md)', padding: '2rem 1.5rem', border: '1px solid var(--border-subtle)' }}>
            
            {/* Screen / Stage Bar */}
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <div style={{ width: '75%', height: '8px', background: 'linear-gradient(90deg, transparent, #6366f1, transparent)', margin: '0 auto 0.5rem', borderRadius: '4px', boxShadow: '0 0 15px #6366f1' }}></div>
              <span style={{ fontSize: '0.75rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>STAGE / SCREEN ORIENTATION</span>
            </div>

            {/* Render Visual Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', alignItems: 'center', overflowX: 'auto', padding: '0.5rem 0' }}>
              {(() => {
                const rows = {};
                seatLayout.forEach((s) => {
                  if (!rows[s.row]) rows[s.row] = [];
                  rows[s.row].push(s);
                });

                return Object.entries(rows).map(([rowLabel, rowSeats]) => (
                  <div key={rowLabel} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ width: '20px', fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{rowLabel}</span>
                    <div style={{ display: 'flex', gap: '0.45rem' }}>
                      {rowSeats.sort((a, b) => a.number - b.number).map((seat) => {
                        const catColor = categories.find(c => c.name === seat.category)?.colorTag || '#6366f1';
                        return (
                          <button
                            type="button"
                            key={seat.seatId}
                            onClick={() => handleSeatClick(seat.seatId)}
                            title={`Click to paint as ${activeCategoryBrush} (Currently: ${seat.seatId} - ${seat.category})`}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px 6px 3px 3px',
                              background: 'rgba(255,255,255,0.06)',
                              border: `2px solid ${catColor}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: '#fff',
                              cursor: 'pointer',
                              transition: 'transform 0.15s ease, border-color 0.15s ease',
                            }}
                          >
                            {seat.number}
                          </button>
                        );
                      })}
                    </div>
                    <span style={{ width: '20px', fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'right' }}>{rowLabel}</span>
                  </div>
                ));
              })()}
            </div>

            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '1.5rem' }}>
              💡 Tip: Select a brush category above and click any individual seat in the grid to re-assign its tier.
            </p>
          </div>

          {/* Seat Category Stats Breakdown */}
          <div style={{ marginTop: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
            {categories.map((cat, i) => {
              const count = seatLayout.filter(s => s.category === cat.name).length;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: cat.colorTag }}></span>
                  <span style={{ color: 'var(--text-muted)' }}>{cat.name}:</span>
                  <strong>{count} seats</strong>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
