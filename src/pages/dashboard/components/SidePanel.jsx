import React from 'react';

const SidePanel = () => {
  return (
    <div className="side-panel">
      <button className="btn-action btn-buy-put mb-3" style={{ background: '#ef4444' }}>SQUARE OFF ALL</button>

      {/* LIVE OPTION CHAIN */}
      <div className="card-custom p-0">
        <div className="p-2 d-flex justify-content-between align-items-center border-bottom border-secondary">
          <span className="small fw-bold">LIVE OPTION CHAIN (NIFTY 30 MAY 2024)</span>
          <div className="d-flex align-items-center gap-2">
            <span className="x-small text-muted">Auto Refresh</span>
            <div className="form-check form-switch m-0">
              <input className="form-check-input bg-accent-green" type="checkbox" defaultChecked />
            </div>
          </div>
        </div>
        
        <div className="row g-0 p-2 text-center border-bottom border-secondary">
           <div className="col-4 border-end border-secondary">
              <div className="text-muted x-small">Spot Price</div>
              <div className="text-accent-green small fw-bold">22,178.40</div>
           </div>
           <div className="col-4 border-end border-secondary">
              <div className="text-muted x-small">Change</div>
              <div className="text-accent-green x-small">+128.75 (0.58%)</div>
           </div>
           <div className="col-4">
              <div className="text-muted x-small">PCR</div>
              <div className="text-white small fw-bold">0.98</div>
           </div>
        </div>

        <table className="table-dark-custom">
          <thead>
            <tr>
              <th className="bg-primary bg-opacity-10">OI (L)</th>
              <th className="bg-primary bg-opacity-10">LTP</th>
              <th className="text-accent-purple">Strike</th>
              <th className="bg-danger bg-opacity-10">LTP</th>
              <th className="bg-danger bg-opacity-10">OI (L)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>32.1</td><td>245.60</td><td className="fw-bold">22,050</td><td>44.35</td><td>28.4</td>
            </tr>
            <tr>
              <td>45.3</td><td>198.75</td><td className="fw-bold">22,100</td><td>63.80</td><td>36.7</td>
            </tr>
            <tr style={{background: 'rgba(139, 92, 246, 0.1)'}}>
              <td className="text-accent-green fw-bold">1.02 Cr</td><td className="text-accent-green fw-bold">118.90</td>
              <td className="bg-accent-purple text-white rounded">22,200 <span className="x-small">ATM</span></td>
              <td className="text-accent-red fw-bold">121.45</td><td className="text-accent-red fw-bold">1.05 Cr</td>
            </tr>
            <tr>
              <td>1.45 Cr</td><td>86.40</td><td className="fw-bold">22,250</td><td>159.30</td><td>1.38 Cr</td>
            </tr>
            <tr>
              <td>2.10 Cr</td><td>58.20</td><td className="fw-bold">22,300</td><td>203.65</td><td>1.92 Cr</td>
            </tr>
          </tbody>
        </table>
        <div className="p-2 text-center border-top border-secondary">
          <button className="btn btn-link text-accent-green x-small text-decoration-none p-0">VIEW FULL CHAIN</button>
        </div>
      </div>

      {/* SMART RECOMMENDATION */}
      <div className="section-title small mt-3"><i className="bi bi-star-fill text-accent-orange me-2"></i>SMART RECOMMENDATION</div>
      <div className="row g-2 mb-3">
        <div className="col-6">
          <div className="card-custom p-2 border-success border-opacity-50">
             <div className="x-small text-muted mb-1">Best Call (CE)</div>
             <div className="small fw-bold text-accent-green">22,200 CE <span className="x-small opacity-50">(ATM)</span></div>
             <div className="d-flex gap-1 mt-1 mb-2">
                <span className="badge-custom bg-success bg-opacity-10 text-success border border-success border-opacity-25">High OI</span>
                <span className="badge-custom bg-success bg-opacity-10 text-success border border-success border-opacity-25">IV Low</span>
             </div>
             <button className="btn btn-sm btn-outline-success w-100 x-small py-0">Select</button>
          </div>
        </div>
        <div className="col-6">
          <div className="card-custom p-2 border-danger border-opacity-50">
             <div className="x-small text-muted mb-1">Best Put (PE)</div>
             <div className="small fw-bold text-accent-red">22,200 PE <span className="x-small opacity-50">(ATM)</span></div>
             <div className="d-flex gap-1 mt-1 mb-2">
                <span className="badge-custom bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25">High Vol</span>
                <span className="badge-custom bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25">Tight</span>
             </div>
             <button className="btn btn-sm btn-outline-danger w-100 x-small py-0">Select</button>
          </div>
        </div>
      </div>

      {/* RECENT ORDERS */}
      {/* <div className="section-title small d-flex justify-content-between align-items-center">
        <span>RECENT ORDERS</span>
        <button className="btn btn-link text-accent-green x-small text-decoration-none p-0">View All</button>
      </div>
      <div className="card-custom p-0">
        <table className="table-dark-custom">
          <thead>
            <tr>
              <th>Time</th><th>Symbol</th><th>Type</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="text-muted">09:45:02</td><td>NIFTY</td><td className="text-accent-green">BUY CALL</td><td><span className="text-success">COMPLETE</span></td>
            </tr>
            <tr>
              <td className="text-muted">09:44:31</td><td>NIFTY</td><td className="text-accent-red">BUY PUT</td><td><span className="text-success">COMPLETE</span></td>
            </tr>
            <tr>
              <td className="text-muted">09:43:15</td><td>NIFTY</td><td className="text-accent-red">SQ OFF</td><td><span className="text-success">COMPLETE</span></td>
            </tr>
          </tbody>
        </table>
      </div> */}
    </div>
  );
};

export default SidePanel;
