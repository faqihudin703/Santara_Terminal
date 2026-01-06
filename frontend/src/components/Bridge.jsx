import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONFIG } from '../config';
import { useWeb3 } from '../context/Web3Context';

// --- 1. IMPORT ABI LANGSUNG DARI FILE JSON ---
// SAN Ecosystem
import SANABI from '../abis/SantaraToken.json';           // Token Asli SAN
import wSANABI from '../abis/WrappedSAN.json';            // Wrapped SAN (Base/Sepolia)
import VaultSANABI from '../abis/LiskSantaraVault.json';  // Vault untuk SAN

// SIDR Ecosystem
import SIDRABI from '../abis/SantaraRupiah.json';         // Token Asli SIDR
import wSIDRABI from '../abis/WrappedSIDR.json';          // Wrapped SIDR (Base/Sepolia)
import VaultSIDRABI from '../abis/SantaraVault.json';     // Vault untuk SIDR

// --- 2. KONFIGURASI TOKEN & FEE ---
const TOKEN_OPTS = {
    SAN: {
        label: "Santara Token (SAN)",
        ticker: "SAN",
        wrapped: "wSAN",
        decimals: 18,
        abis: {
            token: SANABI,
            vault: VaultSANABI,
            wToken: wSANABI
        },
        fees: {
            LOCK: "500000000000000", // 0.0005 ETH
            BURN: "100000000000000"  // 0.0001 ETH
        }
    },
    SIDR: {
        label: "Santara Rupiah (SIDR)",
        ticker: "SIDR",
        wrapped: "wSIDR",
        decimals: 18,
        abis: {
            token: SIDRABI,
            vault: VaultSIDRABI,
            wToken: wSIDRABI
        },
        fees: {
            LOCK: "100000000000000", // 0.0001 ETH
            BURN: "50000000000000"   // 0.00005 ETH
        }
    }
};

export default function Bridge() {
  const { account, chainId, provider } = useWeb3();
  
  // State UI
  const [selectedToken, setSelectedToken] = useState('SAN'); 
  const [inputs, setInputs] = useState({ 
      amount: "", recipient: "", 
      p2pAmount: "", p2pDest: "", 
      mintAmount: "", mintDest: "" 
  });
  const [status, setStatus] = useState("");
  const [destChainKey, setDestChainKey] = useState('BASE');
  const [isMinter, setIsMinter] = useState(false);
  
  const [balances, setBalances] = useState({
      origin: { eth: "0", token: "0" }, 
      dest:   { eth: "0", token: "0" }  
  });

  const currentOpts = TOKEN_OPTS[selectedToken];

  // --- HELPERS ---
  const getCurrentChainKey = () => {
      const id = Number(chainId);
      if (id === Number(CONFIG.NETWORKS.LISK.CHAIN_ID)) return 'LISK';
      if (id === Number(CONFIG.NETWORKS.BASE.CHAIN_ID)) return 'BASE';
      if (id === Number(CONFIG.NETWORKS.SEPOLIA.CHAIN_ID)) return 'SEPOLIA';
      return null;
  };
  const currentKey = getCurrentChainKey();
  const isOrigin = currentKey === 'LISK';

  const getContracts = () => {
      const isSan = selectedToken === 'SAN';
      return {
          liskTokenAddr: isSan ? CONFIG.CONTRACTS.LISK.TOKEN_SAN : CONFIG.CONTRACTS.LISK.TOKEN_SIDR,
          liskVaultAddr: isSan ? CONFIG.CONTRACTS.LISK.VAULT_SAN : CONFIG.CONTRACTS.LISK.VAULT_SIDR,
          destTokenAddr: isSan ? CONFIG.CONTRACTS[destChainKey].WSAN : CONFIG.CONTRACTS[destChainKey].WSIDR,
          // ABI Diambil dari object TOKEN_OPTS
          tokenAbi: currentOpts.abis.token,
          vaultAbi: currentOpts.abis.vault,
          wTokenAbi: currentOpts.abis.wToken
      };
  };

  const getFreshSigner = async () => {
    if (!provider) throw new Error("Wallet belum terhubung");
    return await provider.getSigner();
  };

  // --- CHECK MINTER ROLE ---
  const checkOwner = async () => {
    if (!account) return;
    try {
        const liskProvider = new ethers.JsonRpcProvider(CONFIG.NETWORKS.LISK.RPC_URL);
        const { liskTokenAddr, tokenAbi } = getContracts();
        
        const tokenContract = new ethers.Contract(liskTokenAddr, tokenAbi, liskProvider);

        // Pastikan di ABI JSON Anda ada fungsi MINTER_ROLE() dan hasRole()
        // Biasanya ini bawaan OpenZeppelin AccessControl
        const minterRoleHash = await tokenContract.MINTER_ROLE(); 
        const hasRole = await tokenContract.hasRole(minterRoleHash, account);

        setIsMinter(hasRole);
    } catch (e) {
        console.warn(`Gagal cek Role (Mungkin ABI tidak support AccessControl):`, e.message);
        setIsMinter(false);
    }
  };

  // --- FETCH BALANCES ---
  const fetchBalances = async () => {
      if (!account || !provider) return;
      const { liskTokenAddr, tokenAbi, wTokenAbi } = getContracts();

      try {
        // 1. Origin (Lisk)
        const liskProv = new ethers.JsonRpcProvider(CONFIG.NETWORKS.LISK.RPC_URL);
        const liskEth = await liskProv.getBalance(account);
        const liskContract = new ethers.Contract(liskTokenAddr, tokenAbi, liskProv);
        const liskBal = await liskContract.balanceOf(account);

        // 2. Dest (Base/Sepolia)
        let targetKey = isOrigin ? destChainKey : currentKey;
        if (!targetKey || targetKey === 'LISK') targetKey = destChainKey;

        const destConf = CONFIG.NETWORKS[targetKey];
        const targetWTokenAddr = selectedToken === 'SAN' 
            ? CONFIG.CONTRACTS[targetKey].WSAN 
            : CONFIG.CONTRACTS[targetKey].WSIDR;

        const destProv = new ethers.JsonRpcProvider(destConf.RPC_URL);
        const destEth = await destProv.getBalance(account);
        const destContract = new ethers.Contract(targetWTokenAddr, wTokenAbi, destProv);
        const destBal = await destContract.balanceOf(account);

        setBalances({
            origin: { 
                eth: parseFloat(ethers.formatEther(liskEth)).toFixed(4), 
                token: parseFloat(ethers.formatEther(liskBal)).toFixed(2) 
            },
            dest: { 
                eth: parseFloat(ethers.formatEther(destEth)).toFixed(4), 
                token: parseFloat(ethers.formatEther(destBal)).toFixed(2) 
            }
        });
      } catch (e) { console.error("Balance Error:", e); }
  };

  useEffect(() => {
      fetchBalances();
      checkOwner(); 
      const interval = setInterval(fetchBalances, 10000); 
      return () => clearInterval(interval);
  }, [account, destChainKey, currentKey, selectedToken]);

  // --- HANDLER BRIDGE ---
  const handleBridge = async (type) => {
      setStatus("⏳ Processing...");
      const { liskTokenAddr, liskVaultAddr, tokenAbi, vaultAbi, wTokenAbi } = getContracts();

      try {
          const signer = await getFreshSigner();
          const amt = ethers.parseUnits(inputs.amount, currentOpts.decimals);

          if(type === 'LOCK') {
              // --- LOCK (LISK) ---
              const tokenCtx = new ethers.Contract(liskTokenAddr, tokenAbi, signer);
              const vaultCtx = new ethers.Contract(liskVaultAddr, vaultAbi, signer);

              setStatus(`⏳ Approving ${selectedToken}...`);
              await (await tokenCtx.approve(liskVaultAddr, amt)).wait();

              const fee = currentOpts.fees.LOCK;
              const targetChainId = CONFIG.NETWORKS[destChainKey].CHAIN_ID;
              
              setStatus(`⏳ Locking ${selectedToken} (Fee: ${ethers.formatEther(fee)} ETH)...`);
              
              // Parameter: (Recipient, Amount, DestChainId) + Value
              await (await vaultCtx.lockTokens(account, amt, targetChainId, { value: fee })).wait();

          } else if (type === 'BURN') {
              // --- BURN (DESTINATION) ---
              const wTokenAddr = selectedToken === 'SAN' 
                  ? CONFIG.CONTRACTS[currentKey].WSAN 
                  : CONFIG.CONTRACTS[currentKey].WSIDR;

              const wTokenCtx = new ethers.Contract(wTokenAddr, wTokenAbi, signer);
              const fee = currentOpts.fees.BURN;
              
              setStatus(`⏳ Burning ${currentOpts.wrapped} (Fee: ${ethers.formatEther(fee)} ETH)...`);
              
              // Parameter: (Amount, DestChainId) + Value
              await (await wTokenCtx.burnForBridge(amt, CONFIG.NETWORKS.LISK.CHAIN_ID, { value: fee })).wait();
          }

          setStatus("✅ Bridge Success!");
          setInputs(p => ({...p, amount: ""}));
          fetchBalances();
      } catch (err) {
          console.error(err);
          setStatus("❌ " + (err.reason || err.message));
      }
  };

  // --- HANDLER P2P ---
  const handleP2P = async () => {
      if(!inputs.p2pDest || !inputs.p2pAmount) return;
      setStatus("⏳ Sending P2P...");
      try {
        const signer = await getFreshSigner();
        const { liskTokenAddr, tokenAbi, wTokenAbi } = getContracts();
        
        let tokenAddr, abi;

        if (isOrigin) {
            tokenAddr = liskTokenAddr;
            abi = tokenAbi; 
        } else {
            tokenAddr = selectedToken === 'SAN' 
                ? CONFIG.CONTRACTS[currentKey].WSAN 
                : CONFIG.CONTRACTS[currentKey].WSIDR;
            abi = wTokenAbi;
        }

        const token = new ethers.Contract(tokenAddr, abi, signer);
        const amt = ethers.parseUnits(inputs.p2pAmount, currentOpts.decimals);
        
        await (await token.transfer(inputs.p2pDest, amt)).wait();
        
        setStatus("✅ P2P Sent!");
        setInputs(p => ({...p, p2pAmount: "", p2pDest: ""}));
        fetchBalances();
      } catch(e) { setStatus("❌ " + e.message); }
  };

  // --- HANDLER ADMIN MINT ---
  const handleMint = async () => {
      if(!inputs.mintAmount) return alert("Isi jumlah mint!");
      setStatus(`⏳ Minting ${selectedToken}...`);
      try {
          const signer = await getFreshSigner();
          const { liskTokenAddr, tokenAbi } = getContracts();
          
          if (!isOrigin) throw new Error("Switch to Lisk to Mint Native Tokens!");

          const token = new ethers.Contract(liskTokenAddr, tokenAbi, signer);
          const recipient = inputs.mintDest || account; 
          
          await (await token.mint(recipient, ethers.parseUnits(inputs.mintAmount, currentOpts.decimals))).wait();
          
          setStatus("✅ Mint Success!");
          setInputs(p => ({...p, mintAmount: "", mintDest: ""}));
          fetchBalances();
      } catch (e) {
          setStatus("❌ Mint Failed: " + e.message);
      }
  }

  // Styles
  const activeColor = isOrigin ? 'var(--lisk-color)' : (currentKey === 'BASE' ? 'var(--base-color)' : 'var(--sepolia-color)');

  return (
    <div>
        {/* --- TOKEN SELECTOR --- */}
        <div style={{display:'flex', gap:'15px', justifyContent:'center', marginBottom:'30px'}}>
            {Object.keys(TOKEN_OPTS).map(key => (
                <button 
                    key={key}
                    onClick={() => setSelectedToken(key)}
                    style={{
                        padding: '10px 30px',
                        background: selectedToken === key ? 'var(--lisk-color)' : 'transparent',
                        color: selectedToken === key ? 'black' : 'var(--text-muted)',
                        border: '1px solid var(--lisk-color)',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    {TOKEN_OPTS[key].label}
                </button>
            ))}
        </div>

        <div className={`status-log ${status.includes('❌')?'error':''}`}>{status || `Connected: ${currentKey || 'Unknown'}`}</div>

        {/* --- BRIDGE GRID --- */}
        <div className="grid-2-col">
            {/* ORIGIN CARD */}
            <div className={`terminal-card border-lisk ${!isOrigin ? 'dimmed' : ''}`} style={{opacity: isOrigin ? 1 : 0.6}}>
                <div className="card-header"><h3 className="text-lisk">Origin (Lisk)</h3></div>
                
                <div style={{marginBottom:'15px', fontSize:'0.85rem', color:'#888', display:'flex', justifyContent:'space-between'}}>
                    <span>ETH: {balances.origin.eth}</span>
                    <span className="text-lisk">{currentOpts.ticker}: {balances.origin.token}</span>
                </div>

                <div className="input-group">
                    <label>Destination Chain</label>
                    <select className="terminal-select" value={destChainKey} onChange={(e)=>setDestChainKey(e.target.value)}>
                        <option value="BASE">Base Sepolia</option>
                        <option value="SEPOLIA">Ethereum Sepolia</option>
                    </select>
                </div>
                
                <div className="input-group">
                    <label>
                        Jumlah Lock ({currentOpts.ticker})
                        <span className="text-muted" style={{float:'right', fontSize:'0.7rem'}}>
                            Fee: {ethers.formatEther(currentOpts.fees.LOCK)} ETH
                        </span>
                    </label>
                    <input className="terminal-input" placeholder="0.0" value={inputs.amount} onChange={(e)=>setInputs({...inputs, amount: e.target.value})} disabled={!isOrigin} />
                </div>
                
                <button className="btn-action bg-lisk" onClick={()=>handleBridge('LOCK')} disabled={!isOrigin}>
                    LOCK {currentOpts.ticker} 🔒
                </button>
            </div>

            {/* DESTINATION CARD */}
            <div className={`terminal-card ${currentKey==='BASE'?'border-base':'border-sepolia'}`} style={{opacity: !isOrigin ? 1 : 0.6}}>
                <div className="card-header">
                    <h3 style={{color: !isOrigin ? activeColor : '#666'}}>
                        {!isOrigin ? `${currentKey} (Active)` : `${destChainKey} (Destination)`}
                    </h3>
                </div>

                <div style={{marginBottom:'15px', fontSize:'0.85rem', color:'#888', display:'flex', justifyContent:'space-between'}}>
                    <span>ETH: {balances.dest.eth}</span>
                    <span style={{color:activeColor}}>{currentOpts.wrapped}: {balances.dest.token}</span>
                </div>

                <div className="input-group">
                    <label>
                        Return to Lisk
                        <span className="text-muted" style={{float:'right', fontSize:'0.7rem'}}>
                            Fee: {ethers.formatEther(currentOpts.fees.BURN)} ETH
                        </span>
                    </label>
                    <input className="terminal-input" placeholder={`Jumlah Burn (${currentOpts.wrapped})`} value={inputs.amount} onChange={(e)=>setInputs({...inputs, amount: e.target.value})} disabled={isOrigin} />
                </div>

                <button 
                    className="btn-action" 
                    style={{background: !isOrigin ? activeColor : '#333', color: !isOrigin?'#fff':'#666'}} 
                    onClick={()=>handleBridge('BURN')} 
                    disabled={isOrigin}
                >
                    BURN {currentOpts.wrapped} 🔥
                </button>
            </div>
        </div>

        {/* --- P2P TRANSFER --- */}
        <div className="terminal-card mt-20" style={{marginTop:'20px', borderColor: activeColor}}>
            <div className="card-header"><h3 style={{color: activeColor}}>Transfer P2P ({isOrigin ? currentOpts.ticker : currentOpts.wrapped})</h3></div>
            <div className="grid-2-col">
                 <div className="input-group">
                    <label>Penerima (0x...)</label>
                    <input className="terminal-input" value={inputs.p2pDest} onChange={(e)=>setInputs({...inputs, p2pDest:e.target.value})} />
                </div>
                <div className="input-group">
                    <label>Jumlah</label>
                    <input className="terminal-input" value={inputs.p2pAmount} onChange={(e)=>setInputs({...inputs, p2pAmount:e.target.value})} />
                </div>
            </div>
            <button className="btn-action" style={{background: activeColor, color: isOrigin?'black':'white'}} onClick={handleP2P}>
                KIRIM {isOrigin ? currentOpts.ticker : currentOpts.wrapped} 💸
            </button>
        </div>

        {/* --- ADMIN MINT --- */}
        {isOrigin && isMinter && (
            <div className="terminal-card mt-20" style={{borderColor: 'var(--secondary)', borderStyle: 'dashed', background: 'rgba(243, 156, 18, 0.05)'}}>
                <div className="card-header"><h3 style={{color: 'var(--secondary)'}}>👑 ADMIN MINT ({currentOpts.ticker})</h3></div>
                
                <div className="grid-2-col">
                     <div className="input-group">
                        <label>Target Address (Optional)</label>
                        <input className="terminal-input" placeholder={account} value={inputs.mintDest} onChange={(e)=>setInputs({...inputs, mintDest:e.target.value})} />
                    </div>
                    <div className="input-group">
                        <label>Jumlah Mint</label>
                        <input className="terminal-input" placeholder="0.0" value={inputs.mintAmount} onChange={(e)=>setInputs({...inputs, mintAmount:e.target.value})} />
                    </div>
                </div>
                
                <button className="btn-action" style={{background: 'var(--secondary)', color: 'black'}} onClick={handleMint}>
                    MINT {currentOpts.ticker} ⚡
                </button>
            </div>
        )}
    </div>
  );
}