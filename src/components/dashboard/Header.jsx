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
      background: 'var(--bg-primary)',
      border: '1px solid var(--bg-secondary)',
      borderRadius: 12,
      gap: 12,
      flexWrap: 'nowrap',        // ← prevent wrapping
    },
    divider: {
      width: 1,
      height: 32,
      background: 'var(--border-color)',    // ← slightly lighter divider
      flexShrink: 0,
    },
    statLabel: {
      fontSize: '0.58rem',
      color: 'var(--text-secondary)',         // ← was var(--border-color), now more visible
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
      border: '1px solid var(--border-color)',
      borderRadius: 8,
      padding: '6px 11px',
      cursor: 'pointer',
      color: 'var(--text-secondary)',          // ← was var(--text-secondary)
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
          background: 'linear-gradient(135deg,var(--accent-color),var(--accent-color))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-primary)', flexShrink: 0,
        }}>AO</div>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-primary)', lineHeight: 1 }}>
            Algo Order
          </div>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', letterSpacing: '0.06em', marginTop: 4, fontWeight: 600 }}>
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
              background: autoMode ? 'rgba(16,185,129,0.12)' : 'var(--bg-secondary)',
              border: `1px solid ${autoMode ? 'rgba(16,185,129,0.35)' : 'var(--border-color)'}`,
              borderRadius: 999, padding: '4px 11px 4px 4px',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              background: autoMode ? 'var(--success-color)' : 'var(--border-color)',
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
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: autoMode ? 'var(--success-color)' : 'var(--text-secondary)' }}>
              {autoMode ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>

        <div style={s.divider} />

        {/* API Status */}
        <div>
          <div style={s.statLabel}>API Status</div>
          <div style={s.pill('var(--success-color)')}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--success-color)', animation: 'pulse 2s infinite', flexShrink: 0 }} />
            Connected
          </div>
        </div>

        {/* Response */}
        <div>
          <div style={s.statLabel}>Response</div>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--success-color)', whiteSpace: 'nowrap' }}>
            320 <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ms</span>
          </div>
        </div>

        {/* Last Order */}
        <div>
          <div style={s.statLabel}>Last Order</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={s.pill('var(--success-color)')}>BUY CALL 22250</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>09:45:02</span>
          </div>
        </div>

        <div style={s.divider} />

        {/* Icon Buttons */}
        {[
          { label: 'Settings', d: 'M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.892 3.433-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.892-1.64-.901-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319z' },
          { label: 'Logs', d: 'M5 4a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1H5zm-.5 2.5A.5.5 0 0 1 5 6h6a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5zM5 8a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1H5zm0 2a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1H5z M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2zm10-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1z' },
        ].map(({ label, d }) => (
          <button key={label} style={s.iconBtn}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <svg width="13" height="13" fill="currentColor" viewBox="0 0 16 16"><path d={d} /></svg>
            {label}
          </button>
        ))}

        {/* Avatar */}
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'linear-gradient(135deg,var(--accent-color),var(--accent-color))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-primary)',
          cursor: 'pointer', border: '2px solid var(--border-color)',
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