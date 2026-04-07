import React, { useState, useEffect, useRef } from 'react';

const API = import.meta.env.PROD ? '' : 'http://127.0.0.1:5000';

export default function EventStream() {
  const [events, setEvents] = useState([]);
  const feedRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/api/events/recent?count=30`)
      .then(r => r.json())
      .then(data => setEvents(Array.isArray(data) ? data : []))
      .catch(() => {});

    const es = new EventSource(`${API}/api/events/stream`);
    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data);
        setEvents(prev => [...prev.slice(-49), ev]);
      } catch {}
    };
    return () => es.close();
  }, []);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [events.length]);

  const getClass = (type) => {
    if (type.includes('APPROVED') || type.includes('PASSED') || type === 'SYSTEM_RESUMED' || type === 'SYSTEM_ONLINE') return 'ev-green';
    if (type.includes('FAILED') || type.includes('REJECTED')) return 'ev-red';
    if (type.includes('FROZEN') || type.includes('TAMPER') || type.includes('ATTACK')) return 'ev-red';
    if (type.includes('PAUSE') || type.includes('RESET')) return 'ev-gold';
    return 'ev-cyan';
  };

  const getMessage = (ev) => {
    if (ev.data?.message) return ev.data.message;
    if (ev.data?.reason) return ev.data.reason;
    return JSON.stringify(ev.data || {});
  };

  return (
    <div className="glass" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '400px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '0.8rem', color: 'var(--cyan)', letterSpacing: '2px' }}>📡 LIVE TELEMETRY</h3>
        <span className="badge badge-green">● LIVE</span>
      </div>

      <div className="event-feed" ref={feedRef} style={{ flex: 1 }}>
        {[...events].reverse().map((ev, i) => (
          <div key={i} className={`event-item ${getClass(ev.type)}`}>
            <span className="ev-time">{new Date(ev.timestamp).toLocaleTimeString()}</span>
            <span className="ev-type" style={{
              color: getClass(ev.type) === 'ev-green' ? 'var(--green)' :
                getClass(ev.type) === 'ev-red' ? 'var(--red)' :
                getClass(ev.type) === 'ev-gold' ? 'var(--gold)' : 'var(--cyan)'
            }}>
              [{ev.type}]
            </span>
            <span style={{ color: 'var(--text-2)', fontSize: '0.8rem' }}>{getMessage(ev)}</span>
          </div>
        ))}
        {events.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '2rem', fontSize: '0.8rem' }}>
            Waiting for system events...
          </div>
        )}
      </div>
    </div>
  );
}
