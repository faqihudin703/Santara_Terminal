import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="home-container" style={{ border: 'none', padding: 0, textAlign: 'left' }}>
      
      {/* HERO HEADER */}
      <div className="terminal-card theme-lisk" style={{ marginBottom: '20px', textAlign: 'center', background: '#051005' }}>
        <h2 style={{ fontSize: '1.8rem', margin: '10px 0', textTransform: 'uppercase' }}>
          ⚡ Selamat Datang di Santara Terminal
        </h2>
        <p style={{ color: 'var(--lisk-color)', letterSpacing: '1px', fontSize: '0.9rem' }}>
          Multi-Chain Liquidity Layer: Lisk • Base • Sepolia
        </p>
      </div>
      
      {/* CONTENT BODY */}
      <div className="terminal-card">
        <p>
          Platform ini dirancang untuk menyelesaikan masalah fragmentasi likuiditas antara <b>Lisk Sepolia (L2)</b>, <b>Base Sepolia (L2)</b>, dan <b>Ethereum Sepolia (L1)</b>.
        </p>
        <p>
          Menggunakan <b>Custom Relayer Node</b> yang terisolasi (Dockerized), transaksi bridge dieksekusi secara real-time dengan keamanan <i>idempotency state</i>.
        </p>

        <br />
        <p style={{ borderBottom: '1px solid #333', paddingBottom: '10px' }}>MODUL TERSEDIA:</p>
        
        <ul style={{ listStyle: 'none', paddingLeft: '0', color: 'var(--text-muted)' }}>
            <li style={{ marginBottom: '15px' }}>
                <strong style={{ color: 'var(--lisk-color)' }}>[1] CROSS-CHAIN BRIDGE</strong><br/>
                Pindahkan aset (SAN ↔ wSAN) secara instan antara:
                <ul style={{ marginTop:'5px', fontSize:'0.9rem' }}>
                    <li>✅ Lisk Sepolia (Native)</li>
                    <li>✅ Base Sepolia (L2)</li>
                    <li>✅ Ethereum Sepolia (L1)</li>
                </ul>
            </li>
            <li style={{ marginBottom: '15px' }}>
                <strong style={{ color: 'var(--base-color)' }}>[2] DEX ARBITRAGE</strong><br/>
                Simulasi pertukaran aset (Swap) dan penyediaan likuiditas (LP) untuk memanfaatkan selisih harga antar-chain.
            </li>
        </ul>

        {/* WARNING BOX */}
        <div style={{ 
            marginTop: '30px', 
            padding: '15px', 
            background: 'rgba(255, 51, 51, 0.1)', 
            border: '1px dashed var(--danger)', 
            color: 'var(--text-main)', 
            fontSize: '0.85rem' 
        }}>
            <strong style={{ color: 'var(--danger)' }}>⚠️ SYSTEM CHECK:</strong> Pastikan MetaMask Anda terhubung ke jaringan <b>Lisk</b>, <b>Base</b>, atau <b>Sepolia</b> sebelum melakukan interaksi.
        </div>
        
        {/* ACTION BUTTON */}
        <div style={{ marginTop: '30px', textAlign: 'center' }}>
            <Link to="/bridge">
                <button className="btn-action btn-lisk" style={{ maxWidth: '300px' }}>
                    >> INITIALIZE BRIDGE _
                </button>
            </Link>
        </div>

      </div>
    </div>
  );
}