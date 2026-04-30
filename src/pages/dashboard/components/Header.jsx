import React, { useState } from 'react';

const Header = () => {
  const [autoMode, setAutoMode] = useState(true);

  const s = {
    wrapper: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
      padding: '12px 20px',
      background: '#111827',
      border: '1px solid #1f2937',
      borderRadius: 12,
      gap: 12,
      flexWrap: 'nowrap',        // ← prevent wrapping
    },
    divider: {
      width: 1,
      height: 32,
      background: '#374151',    // ← slightly lighter divider
      flexShrink: 0,
    },
    statLabel: {
      fontSize: '0.58rem',
      color: '#6b7280',         // ← was #4b5563, now more visible
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      fontWeight: 600,
      marginBottom: 4,
      whiteSpace: 'nowrap',
    },
    pill: (color) => ({
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      fontSize: '0.65rem',
      fontWeight: 700,
      letterSpacing: '0.04em',
      padding: '4px 10px',
      borderRadius: 999,
      background: color + '18',
      border: `1px solid ${color}44`,
      color: color,
      whiteSpace: 'nowrap',
    }),
    iconBtn: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 3,
      background: 'transparent',
      border: '1px solid #374151',
      borderRadius: 8,
      padding: '6px 11px',
      cursor: 'pointer',
      color: '#9ca3af',          // ← was #6b7280
      fontSize: '0.58rem',
      fontWeight: 600,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
      transition: 'all 0.15s',
      whiteSpace: 'nowrap',
    },
  };

  return (
    <div style={s.wrapper}>

      {/* ── Brand ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.72rem', fontWeight: 800, color: '#fff', flexShrink: 0,
        }}>AO</div>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#f9fafb', lineHeight: 1 }}>
            Algo Order
          </div>
          <div style={{ fontSize: '0.6rem', color: '#6b7280', letterSpacing: '0.06em', marginTop: 4, fontWeight: 600 }}>
            Ultra Fast · Smart Strike · One Click
          </div>
        </div>
      </div>

      {/* ── Right section ── */}
      <div style={{ display: 'flex', alignItems: 'start', gap: 14, flexShrink: 0 }}>

        {/* Auto Mode */}
        <div>
          <div style={s.statLabel}>Auto Mode</div>
          <button
            onClick={() => setAutoMode(m => !m)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: autoMode ? 'rgba(16,185,129,0.12)' : '#1f2937',
              border: `1px solid ${autoMode ? 'rgba(16,185,129,0.35)' : '#374151'}`,
              borderRadius: 999, padding: '4px 11px 4px 4px',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              background: autoMode ? '#10b981' : '#374151',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s', flexShrink: 0,
            }}>
              <svg width="9" height="9" fill="white" viewBox="0 0 16 16">
                {autoMode
                  ? <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
                  : <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                }
              </svg>
            </div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: autoMode ? '#10b981' : '#9ca3af' }}>
              {autoMode ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>

        <div style={s.divider} />

        {/* API Status */}
        <div>
          <div style={s.statLabel}>API Status</div>
          <div style={s.pill('#10b981')}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite', flexShrink: 0 }} />
            Connected
          </div>
        </div>

        {/* Response */}
        <div>
          <div style={s.statLabel}>Response</div>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#10b981', whiteSpace: 'nowrap' }}>
            320 <span style={{ fontSize: '0.6rem', color: '#6b7280', fontWeight: 600 }}>ms</span>
          </div>
        </div>

        {/* Last Order */}
        <div>
          <div style={s.statLabel}>Last Order</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={s.pill('#10b981')}>BUY CALL 22250</span>
            <span style={{ fontSize: '0.65rem', color: '#9ca3af', fontWeight: 600, whiteSpace: 'nowrap' }}>09:45:02</span>
          </div>
        </div>

        <div style={s.divider} />

        {/* Icon Buttons */}
        {[
          { label: 'Settings', d: 'M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.892 3.433-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.892-1.64-.901-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319z' },
          { label: 'Logs', d: 'M5 4a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1H5zm-.5 2.5A.5.5 0 0 1 5 6h6a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5zM5 8a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1H5zm0 2a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1H5z M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2zm10-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1z' },
        ].map(({ label, d }) => (
          <button key={label} style={s.iconBtn}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#4b5563'; e.currentTarget.style.color = '#f3f4f6'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#374151'; e.currentTarget.style.color = '#9ca3af'; }}
          >
            <svg width="13" height="13" fill="currentColor" viewBox="0 0 16 16"><path d={d} /></svg>
            {label}
          </button>
        ))}

        {/* Avatar */}
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.68rem', fontWeight: 800, color: '#fff',
          cursor: 'pointer', border: '2px solid #4b5563',
          flexShrink: 0,
        }}>KA</div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  );
};

export default Header;