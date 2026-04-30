import React from 'react';

const Footer = () => {
  const features = [
    { 
      icon: 'bi-rocket-takeoff', 
      title: 'AUTO STRIKE SELECTION', 
      desc: 'Automatically selects the best strike based on ATM, OI, Volume, IV and Liquidity.',
      color: 'accent-green'
    },
    { 
      icon: 'bi-lightning-charge', 
      title: 'FAST ORDER EXECUTION', 
      desc: 'Ultra-fast API execution ~300ms average response time.',
      color: 'accent-red'
    },
    { 
      icon: 'bi-code-slash', 
      title: 'SMART FORMATTING', 
      desc: 'No need to write full format. Format generated automatically e.g. NIFTY 30 MAY 22200 CE.',
      color: 'accent-purple'
    },
    { 
      icon: 'bi-rulers', 
      title: 'STRIKE GAP HANDLING', 
      desc: 'Different stocks have different strike gaps. Auto-detected & applied.',
      color: 'text-white'
    },
    { 
      icon: 'bi-cursor-fill', 
      title: 'ONE CLICK TRADING', 
      desc: 'Buy / Sell / Square Off with one click. Save time, trade fast.',
      color: 'accent-purple'
    }
  ];

  return (
    <div className="row mt-4">
      {features.map((f, i) => (
        <div key={i} className="col">
          <div className="card-custom h-100 d-flex gap-3 align-items-start border-0 bg-transparent">
            <div className={`h3 mb-0 text-${f.color}`}>
               <i className={`bi ${f.icon}`}></i>
            </div>
            <div>
               <div className="fw-bold small mb-1">{f.title}</div>
               <div className="text-muted x-small lh-sm">{f.desc}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Footer;
