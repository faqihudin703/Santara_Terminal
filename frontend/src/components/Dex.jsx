import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONFIG } from '../config';
import { useWeb3 } from '../context/Web3Context';

// --- IMPORT ABI ---
// Pastikan file-file ini ada di folder src/abis/
import DexABI from '../abis/DEX.json'; // Contract DEX Anda
import SANABI from '../abis/SantaraToken.json';

const getAmountOut = (
  amountIn,
  reserveIn,
  reserveOut,
  feeNum = 3,
  feeDen = 1000
) => {
  const amountInWithFee =
    amountIn * BigInt(feeDen - feeNum);

  return (
    amountInWithFee * reserveOut
  ) / (
    reserveIn * BigInt(feeDen) + amountInWithFee
  );
};

export default function Dex() {
  const { account, provider, chainId } = useWeb3();
  const [activeTab, setActiveTab] = useState('swap');
  const [status, setStatus] = useState("");
  
  // Data State
  const [poolData, setPoolData] = useState({ price: "0", lpBalance: "0", ethRes: "0", tokRes: "0" });
  
  // Inputs (Terpisah untuk Beli dan Jual)
  const [buyEth, setBuyEth] = useState("");
  const [buyEst, setBuyEst] = useState("");
  
  const [sellToken, setSellToken] = useState("");
  const [sellEst, setSellEst] = useState("");

  const [liqInputs, setLiqInputs] = useState({ eth: "", token: "", removeLp: "" });

  // Config & Helper (Sama)
  const getCurrentNetworkConfig = () => {
      const id = Number(chainId);
      if (id === Number(CONFIG.NETWORKS.LISK.CHAIN_ID)) return { name: 'Lisk Sepolia', symbol: 'SAN', dex: CONFIG.CONTRACTS.LISK.ROUTER, token: CONFIG.CONTRACTS.LISK.TOKEN_SAN, rpc: CONFIG.NETWORKS.LISK.RPC_URL, color: 'var(--lisk-color)' };
      if (id === Number(CONFIG.NETWORKS.BASE.CHAIN_ID)) return { name: 'Base Sepolia', symbol: 'wSAN', dex: CONFIG.CONTRACTS.BASE.ROUTER, token: CONFIG.CONTRACTS.BASE.WSAN, rpc: CONFIG.NETWORKS.BASE.RPC_URL, color: 'var(--base-color)' };
      if (id === Number(CONFIG.NETWORKS.SEPOLIA.CHAIN_ID)) return { name: 'Sepolia', symbol: 'wSAN', dex: CONFIG.CONTRACTS.SEPOLIA.ROUTER, token: CONFIG.CONTRACTS.SEPOLIA.WSAN, rpc: CONFIG.NETWORKS.SEPOLIA.RPC_URL, color: 'var(--sepolia-color)' };
      return null;
  };
  const currentNet = getCurrentNetworkConfig();

  const getFreshSigner = async () => {
    if (!provider) throw new Error("Wallet belum terhubung");
    return await provider.getSigner();
  };

  const updatePoolData = async () => {
    if (!account || !currentNet || !currentNet.dex) return;
    
    try {
      const provider = new ethers.JsonRpcProvider(currentNet.rpc);
      const dexContract = new ethers.Contract(currentNet.dex, DexABI, provider);
      
      const reserves = await dexContract.getReserves();
      const tokenRes = reserves[0]; // BigInt
      const ethRes   = reserves[1]; // BigInt
      
      const lp = await dexContract.balanceOf(account);
      
      const tokenResFmt = parseFloat(ethers.formatEther(tokenRes));
      const ethResFmt   = parseFloat(ethers.formatEther(ethRes));
      
      setPoolData({
        price: ethResFmt > 0 ? tokenResFmt / ethResFmt : 0,
        tokRes: tokenResFmt.toFixed(2),
        ethRes: ethResFmt.toFixed(4),
        lpBalance: parseFloat(ethers.formatEther(lp)).toFixed(4),
      
        rawTokRes: tokenRes,
        rawEthRes: ethRes
      });
    } catch (err) {
      console.error("updatePoolData error:", err);
    }
  };

  useEffect(() => {
    updatePoolData();
  }, [chainId, account]);

  // --- KALKULASI ---
  const handleBuyCalc = (val) => {
      setBuyEth(val);
      if(val && poolData.price > 0) setBuyEst((parseFloat(val) * poolData.price).toFixed(4));
      else setBuyEst("");
  };

  const handleSellCalc = (val) => {
      setSellToken(val);
      if(val && poolData.price > 0) setSellEst((parseFloat(val) / poolData.price).toFixed(6));
      else setSellEst("");
  };

  const handleLiqCalc = (type, val) => {
    let n = { ...liqInputs };

    // ADD LIQUIDITY VIA ETH INPUT
    if (type === "eth") {
      n.eth = val;

      if ( val && poolData.rawTokRes && poolData.rawEthRes && poolData.rawEthRes > 0n ) {
        try {
          const ethWei = ethers.parseEther(val);

          // === SOLIDITY EXACT FORMULA ===
          const tokenRequired = ethWei * poolData.rawTokRes / poolData.rawEthRes;

          // === SLIPPAGE BUFFER (+0.5%) ===
          const tokenMax = tokenRequired * 1005n / 1000n;

          n.token = ethers.formatEther(tokenMax);
        } catch (e) {
          n.token = "";
        }
      }
    }

    // MANUAL TOKEN INPUT (OPTIONAL)
    if (type === "token") {
      n.token = val;
    }

    setLiqInputs(n);
  };


  // --- ACTIONS ---
  const executeSwap = async (type) => {
      setStatus("⏳ Swapping...");
      try {
          const signer = await getFreshSigner();
          const dex = new ethers.Contract(currentNet.dex, DexABI, signer);
          if (type === 'BUY') {
              if (!buyEth || Number(buyEth) <= 0) throw new Error("Invalid ETH amount");
              
              const ethIn = ethers.parseEther(buyEth);
              const expectedOut = getAmountOut(ethIn, poolData.rawEthRes,poolData.rawTokRes);
              const minOut = expectedOut * 99n / 100n;
              await (await dex.swapEthToToken(minOut, { value: ethers.parseEther(buyEth) })).wait();
              setBuyEth(""); setBuyEst("");
          } else {
              if (!sellToken || Number(sellToken) <= 0) throw new Error("Invalid token amount");
              
              const tokenIn = ethers.parseEther(sellToken);
              const expectedOut = getAmountOut(tokenIn,poolData.rawTokRes,poolData.rawEthRes);
              const minOut = expectedOut * 99n / 100n;
              const token = new ethers.Contract(currentNet.token, SANABI, signer);
              await (await token.approve(currentNet.dex, tokenIn)).wait();
              await (await dex.swapTokenToEth(tokenIn, minOut)).wait();
              setSellToken(""); setSellEst("");
          }
          setStatus("✅ Success!");
          updatePoolData();
      } catch (e) { setStatus("❌ " + e.message); }
  };

  const handleLiquidity = async (type) => {
      setStatus("⏳ Processing...");
      try {
          const signer = await getFreshSigner();
          const dex = new ethers.Contract(currentNet.dex, DexABI, signer);
          if(type === 'ADD') {
              const tAmt = ethers.parseEther(liqInputs.token);
              const eAmt = ethers.parseEther(liqInputs.eth);
              const token = new ethers.Contract(currentNet.token, SANABI, signer);
              await (await token.approve(currentNet.dex, tAmt)).wait();
              await (await dex.addLiquidity(tAmt, { value: eAmt })).wait();
              setLiqInputs({eth:"", token:"", removeLp:""});
          } else {
              await (await dex.removeLiquidity(ethers.parseEther(liqInputs.removeLp), 0, 0)).wait();
              setLiqInputs({...liqInputs, removeLp:""});
          }
          setStatus("✅ Success!");
          updatePoolData();
      } catch (e) { setStatus("❌ " + e.message); }
  };

  if(!currentNet) return <div className="status-log error">Unknown Network</div>;

  const colorStyle = { color: currentNet.color, borderColor: currentNet.color };
  const btnStyle = { background: currentNet.color, color: currentNet.color === 'var(--base-color)' ? '#fff' : '#000' };

  return (
    <div>
        {/* INFO POOL DI ATAS */}
        <div className="pool-info-card" style={colorStyle}>
            <h3>POOL: ETH / {currentNet.symbol} ({currentNet.name})</h3>
            <div style={{display:'flex', justifyContent:'space-between', marginTop:'10px', fontSize:'0.8rem'}}>
                <span>Reserves: {poolData.ethRes} ETH</span>
                <span>{poolData.tokRes} {currentNet.symbol}</span>
                <span>Rate: 1 ETH ≈ {parseFloat(poolData.price).toFixed(2)} {currentNet.symbol}</span>
            </div>
        </div>

        {/* TAB NAV */}
        <div className="dex-tabs">
            <button className={`dex-tab-btn ${activeTab==='swap'?'active':''}`} onClick={()=>setActiveTab('swap')}>SWAP</button>
            <button className={`dex-tab-btn ${activeTab==='liq'?'active':''}`} onClick={()=>setActiveTab('liq')}>LIQUIDITY</button>
        </div>

        <div className="status-log">{status || `Ready on ${currentNet.name}`}</div>

        {activeTab === 'swap' ? (
            <div className="grid-2-col">
                {/* --- KARTU KIRI: BELI (ETH -> TOKEN) --- */}
                <div className="terminal-card">
                    <div className="card-header"><h3>Beli {currentNet.symbol}</h3></div>
                    <div className="input-group">
                        <label>Bayar (ETH)</label>
                        <input className="terminal-input" placeholder="0.0" type="number" value={buyEth} onChange={(e)=>handleBuyCalc(e.target.value)} />
                    </div>
                    <div className="input-group">
                        <label>Terima ({currentNet.symbol}) <small className="text-muted">Estimasi</small></label>
                        <input className="terminal-input" placeholder="0.0" value={buyEst} readOnly style={{opacity:0.7}} />
                    </div>
                    <button className="btn-action" style={btnStyle} onClick={()=>executeSwap('BUY')}>
                        SWAP ⬇️
                    </button>
                </div>

                {/* --- KARTU KANAN: JUAL (TOKEN -> ETH) --- */}
                <div className="terminal-card">
                    <div className="card-header"><h3>Jual {currentNet.symbol}</h3></div>
                    <div className="input-group">
                        <label>Bayar ({currentNet.symbol})</label>
                        <input className="terminal-input" placeholder="0.0" type="number" value={sellToken} onChange={(e)=>handleSellCalc(e.target.value)} />
                    </div>
                    <div className="input-group">
                        <label>Terima (ETH) <small className="text-muted">Estimasi</small></label>
                        <input className="terminal-input" placeholder="0.0" value={sellEst} readOnly style={{opacity:0.7}} />
                    </div>
                    <button className="btn-action" style={btnStyle} onClick={()=>executeSwap('SELL')}>
                        APPROVE & SWAP ⬆️
                    </button>
                </div>
            </div>
        ) : (
            <div className="grid-2-col">
                {/* --- KARTU KIRI: TAMBAH LIQUIDITY --- */}
                <div className="terminal-card">
                    <div className="card-header"><h3>Tambah Likuiditas</h3></div>
                    <div className="input-group">
                        <label>ETH</label>
                        <input className="terminal-input" placeholder="0.0" type="number" value={liqInputs.eth} onChange={(e)=>handleLiqCalc('eth', e.target.value)} />
                    </div>
                    <div className="input-group">
                        <label>{currentNet.symbol}</label>
                        <input className="terminal-input" placeholder="0.0" type="number" value={liqInputs.token} onChange={(e)=>handleLiqCalc('token', e.target.value)} />
                    </div>
                    <button className="btn-action" style={btnStyle} onClick={()=>handleLiquidity('ADD')}>
                        ADD +
                    </button>
                </div>

                {/* --- KARTU KANAN: TARIK LIQUIDITY --- */}
                <div className="terminal-card">
                    <div className="card-header"><h3>Tarik Likuiditas</h3></div>
                    <p style={{fontSize:'0.8rem', marginBottom:'10px'}}>Saldo LP: <b>{poolData.lpBalance} LP</b></p>
                    <div className="input-group">
                        <label>Jumlah LP</label>
                        <input className="terminal-input" placeholder="0.0" type="number" value={liqInputs.removeLp} onChange={(e)=>setLiqInputs({...liqInputs, removeLp:e.target.value})} />
                    </div>
                    <button className="btn-action" style={{background:'#333', color:'#fff', border:'1px solid #555'}} onClick={()=>handleLiquidity('REMOVE')}>
                        REMOVE -
                    </button>
                </div>
            </div>
        )}
    </div>
  );
}