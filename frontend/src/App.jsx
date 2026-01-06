// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import './App.css'; // Pastikan CSS Retro tadi ada di sini

import { useWeb3 } from './context/Web3Context';

// Components (Hanya yang diperlukan)
import Home from './components/Home';
import Bridge from './components/Bridge';
import Dex from './components/Dex';

export default function App() {
  const { account, connectWallet, disconnectWallet } = useWeb3();

  // Komponen Helper untuk User yang belum connect wallet
  const AccessDenied = ({ name }) => (
    <div className="access-denied" style={{ border: '1px dashed red', padding: '20px', color: 'red', textAlign: 'center' }}>
      <p>⚠️ &lt; ACCESS DENIED /&gt;</p>
      <p>Please connect your wallet to access the {name} Protocol.</p>
    </div>
  );

  return (
    <Router>
      <div className="app-container">

        {/* HEADER */}
        <header className="app-header">
          <div className="brand">
            <h1>⚡ SANTARA TERMINAL</h1>
            <span>v3.0.0 [HACKATHON_BUILD]</span>
          </div>

          {!account ? (
            <button className="btn-connect" onClick={connectWallet}>
              [ INITIALIZE_CONNECTION ]
            </button>
          ) : (
            <button className="wallet-info" onClick={disconnectWallet}>
              USER: {account.substring(0,6)}...{account.substring(38)} [DISCONNECT] ❌
            </button>
          )}
        </header>

        {/* NAV */}
        <div className="nav-container">
          <nav>
            <NavLink to="/" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
              > HOME
            </NavLink>
            <NavLink to="/bridge" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
              > BRIDGE
            </NavLink>
            <NavLink to="/dex" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
              > DEX (SWAP)
            </NavLink>
          </nav>
        </div>

        {/* CONTENT */}
        <main>
          <Routes>
            {/* Home biasanya publik */}
            <Route path="/" element={<Home />} />
            
            {/* Fitur Inti (Protected Route) */}
            <Route 
              path="/bridge" 
              element={account ? <Bridge /> : <AccessDenied name="Bridge" />} 
            />
            <Route 
              path="/dex" 
              element={account ? <Dex /> : <AccessDenied name="DEX" />} 
            />
          </Routes>
        </main>

      </div>
    </Router>
  );
}