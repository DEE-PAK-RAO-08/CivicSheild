import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';

const API = import.meta.env.PROD ? '' : 'http://127.0.0.1:5000';

export default function LedgerViewer() {
  const [ledger, setLedger] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('3D'); // '3D' or 'LIST'
  const graphRef = useRef();

  const fetchLedger = () => {
    fetch(`${API}/api/ledger`)
      .then(r => r.json())
      .then(data => { setLedger(data); setLoading(false); })
      .catch(() => {});
  };

  const handleVerify = async () => {
    const res = await fetch(`${API}/api/ledger/verify`);
    setReport(await res.json());
    fetchLedger();
  };

  useEffect(() => {
    fetchLedger();
    const intv = setInterval(fetchLedger, 5000);
    return () => clearInterval(intv);
  }, []);

  // Build Graph Data
  const graphData = { nodes: [], links: [] };
  if (viewMode === '3D' && ledger.length > 0) {
    ledger.forEach((block, idx) => {
      // Check if block is compromised based on the report
      let isTampered = false;
      if (report && !report.verified) {
        isTampered = report.tamperedBlocks.some(tb => tb.blockIndex === idx);
      }

      graphData.nodes.push({
        id: block.TransactionID,
        label: `Block ${idx} | Amount: ₹${block.Amount}`,
        isGenesis: idx === 0,
        isTampered,
        amount: block.Amount,
        scheme: block.Scheme,
        hashPreview: block.CurrentHash?.substring(0, 8)
      });

      if (idx > 0) {
        graphData.links.push({
          source: ledger[idx - 1].TransactionID,
          target: block.TransactionID,
          isTampered
        });
      }
    });
  }

  // Handle Graph Zoom framing
  useEffect(() => {
    if (viewMode === '3D' && graphRef.current && graphData.nodes.length > 0) {
      setTimeout(() => {
        graphRef.current.d3Force('charge').strength(-400);
        graphRef.current.zoomToFit(400, 50);
      }, 500);
    }
  }, [viewMode, ledger.length]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      {/* Header + Verify */}
      <div className="glass" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem' }}>⛓️ IMMUTABLE HASH-LINKED LEDGER</h2>
          <p style={{ color: 'var(--text-3)', fontSize: '0.8rem', marginTop: '0.3rem' }}>
            {ledger.length} blocks • SHA-256 chain • View Mode: {viewMode}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.5)', borderRadius: '4px', overflow: 'hidden' }}>
            <button 
              className="btn" 
              style={{ padding: '0.5rem 1rem', fontSize: '0.7rem', background: viewMode === '3D' ? 'var(--cyan)' : 'transparent', color: viewMode === '3D' ? '#000' : 'var(--text-2)' }}
              onClick={() => setViewMode('3D')}
            >
              3D GRAPH
            </button>
            <button 
              className="btn" 
              style={{ padding: '0.5rem 1rem', fontSize: '0.7rem', background: viewMode === 'LIST' ? 'var(--cyan)' : 'transparent', color: viewMode === 'LIST' ? '#000' : 'var(--text-2)' }}
              onClick={() => setViewMode('LIST')}
            >
              LIST VIEW
            </button>
          </div>
          <button className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.7rem 1.5rem' }} onClick={handleVerify}>
            🔍 VERIFY CHAIN
          </button>
        </div>
      </div>

      {/* Verification Report */}
      {report && (
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="glass"
          style={{
            padding: '1.5rem',
            borderColor: report.verified ? 'rgba(0,255,157,0.4)' : 'rgba(255,23,68,0.4)',
            boxShadow: report.verified ? '0 0 20px rgba(0,255,157,0.1)' : '0 0 20px rgba(255,23,68,0.15)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '2rem' }}>{report.verified ? '✅' : '🚨'}</span>
            <div>
              <h3 style={{ color: report.verified ? 'var(--green)' : 'var(--red)', fontSize: '1rem' }}>
                {report.verified ? 'CHAIN VERIFIED — ALL HASHES AUTHENTIC' : 'CHAIN COMPROMISED — TAMPERING DETECTED'}
              </h3>
              <p className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                {report.totalBlocks} blocks checked at {new Date(report.verifiedAt).toLocaleString()}
                {!report.verified && ` • ${report.tamperedBlocks.length} tampered blocks found`}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Blocks Visualizer */}
      {loading ? (
        <div className="glass" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-3)' }}>
          Loading chain...
        </div>
      ) : ledger.length === 0 ? (
        <div className="glass" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-3)' }}>
          Ledger empty — no approved disbursements yet.
        </div>
      ) : viewMode === '3D' ? (
        <motion.div 
          className="glass" 
          style={{ flex: 1, minHeight: '500px', padding: 0, overflow: 'hidden', position: 'relative' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <ForceGraph3D
            ref={graphRef}
            graphData={graphData}
            nodeLabel="label"
            backgroundColor="rgba(0,0,0,0)"
            showNavInfo={false}
            nodeThreeObject={node => {
              const size = node.isGenesis ? 12 : 8 + (node.amount / 1000);
              const color = node.isTampered ? '#ff1744' : node.isGenesis ? '#ffd740' : '#00e5ff';
              
              const material = new THREE.MeshLambertMaterial({ 
                color,
                transparent: true,
                opacity: 0.9,
                emissive: color,
                emissiveIntensity: node.isTampered ? 1.0 : 0.5
              });
              
              const geometry = new THREE.SphereGeometry(size);
              const sphere = new THREE.Mesh(geometry, material);

              // Sub-node containing the hash text (optional, could be complex so we skip text Mesh to save FPS)
              return sphere;
            }}
            linkColor={link => link.isTampered ? '#ff1744' : 'rgba(0, 229, 255, 0.5)'}
            linkWidth={link => link.isTampered ? 3 : 1}
            linkDirectionalParticles={2}
            linkDirectionalParticleWidth={1.5}
            linkDirectionalParticleColor={link => link.isTampered ? '#ff1744' : '#00ff9d'}
          />
          <div style={{ position: 'absolute', bottom: 10, right: 10, color: 'var(--text-3)', fontSize: '0.7rem', pointerEvents: 'none' }}>
            Left Click: Rotate | Right Click: Pan | Scroll: Zoom
          </div>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {[...ledger].reverse().map((block, i) => (
            <motion.div
              key={block.TransactionID}
              className="ledger-block"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              {i > 0 && <div className="chain-link" />}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ color: 'var(--cyan)', fontFamily: 'Orbitron', fontWeight: 700, fontSize: '0.8rem' }}>
                  BLOCK #{ledger.length - i - 1}
                </span>
                <span className="badge badge-cyan">TXN {block.TransactionID}</span>
                <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>
                  {new Date(block.Timestamp).toLocaleString()}
                </span>
              </div>

              <div className="txn-details-grid" style={{ marginTop: '0.8rem' }}>
                <div><span style={{ color: 'var(--text-3)' }}>Citizen:</span> <span className="mono">{block.CitizenHash_Display}</span></div>
                <div><span style={{ color: 'var(--text-3)' }}>Region:</span> {block.Region_Code}</div>
                <div style={{ color: 'var(--green)' }}>
                  <span style={{ color: 'var(--text-3)' }}>Amount:</span> ₹{block.Amount?.toLocaleString('en-IN')}
                </div>
                <div><span style={{ color: 'var(--text-3)' }}>Scheme:</span> {block.Scheme}</div>
              </div>

              <div className="hash-row">
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '1rem', flexWrap: 'wrap' }}>
                  <span><span style={{ color: 'var(--text-3)' }}>PREV:</span> {block.PreviousHash?.substring(0, 24)}...</span>
                  <span style={{ color: '#fff' }}><span style={{ color: 'var(--text-3)' }}>HASH:</span> {block.CurrentHash?.substring(0, 24)}...</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
