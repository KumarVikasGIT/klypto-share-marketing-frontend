import React from 'react';

const STEPS = [
  { id: 1, title: 'Select Stock',  desc: 'Search & select index'   },
  { id: 2, title: 'Auto Strike',   desc: 'Best strike suggested'   },
  { id: 3, title: 'Order Details', desc: 'Qty, type & product'     },
  { id: 4, title: 'Select Action', desc: 'Buy / Sell / Square off' },
];

const Stepper = ({ currentStep = 1, filledSteps = {} }) => {
  const stepFilled = {
    1: filledSteps.step1,
    2: filledSteps.step2,
    3: filledSteps.step3,
    4: filledSteps.step4,
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 20,  padding: "14px 24px"   }}>
      {STEPS.map((step, i) => {
        const done   = stepFilled[step.id] && step.id !== currentStep;
        const active = step.id === currentStep;
        const color  = done ? 'var(--success-color)' : active ? 'var(--accent-color)' : 'var(--border-color)';
        const bg     = done ? 'rgba(16,185,129,0.1)' : active ? 'rgba(139,92,246,0.12)' : 'var(--bg-secondary)';
        const borderC= done ? 'rgba(16,185,129,0.3)' : active ? 'rgba(139,92,246,0.4)'  : 'var(--bg-secondary)';

        return (
          <React.Fragment key={step.id}>
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', background: bg,
              border: `1px solid ${borderC}`, borderRadius: 8,
              position: 'relative', minWidth: 0,
              transition: 'all 0.25s ease',
            }}>
              {/* Circle */}
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: done ? 'var(--success-color)' : active ? 'linear-gradient(135deg,var(--accent-color),var(--accent-color))' : 'var(--bg-secondary)',
                border: `1.5px solid ${color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.25s ease',
              }}>
                {done
                  ? <svg width="11" height="11" fill="white" viewBox="0 0 16 16">
                      <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
                    </svg>
                  : <span style={{ fontSize: '0.65rem', fontWeight: 800, color: active ? 'var(--bg-primary)' : 'var(--text-secondary)' }}>
                      {step.id}
                    </span>
                }
              </div>

              {/* Text */}
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: '0.75rem', fontWeight: 700,
                  color: active ? 'var(--text-primary)' : done ? 'var(--success-color)' : 'var(--text-secondary)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  transition: 'color 0.25s',
                }}>{step.title}</div>
                <div style={{
                  fontSize: '0.6rem', marginTop: 1, fontWeight: 500,
                  color: active ? 'var(--text-secondary)' : done ? 'rgba(16,185,129,0.6)' : 'var(--text-secondary)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{step.desc}</div>
              </div>

              {/* Active pulse dot */}
              {active && (
                <div style={{
                  position: 'absolute', top: 8, right: 8,
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--accent-color)',
                  animation: 'stepPulse 1.8s ease-in-out infinite',
                }} />
              )}
            </div>

            {/* Connector */}
            {i < STEPS?.length - 1 && (
              <div style={{ flexShrink: 0, width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <div style={{
                  height: 1.5, width: '100%',
                  background: stepFilled[step.id] ? 'rgba(16,185,129,0.5)' : 'var(--bg-secondary)',
                  transition: 'background 0.3s',
                }} />
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ position: 'absolute', right: -1 }}>
                  <path
                    d="M1 1l6 3-6 3"
                    stroke={stepFilled[step.id] ? 'var(--success-color)' : 'var(--border-color)'}
                    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                  />
                </svg>
              </div>
            )}
          </React.Fragment>
        );
      })}

      <style>{`
        @keyframes stepPulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.4; transform: scale(0.7); }
        }
      `}</style>
    </div>
  );
};

export default Stepper;
