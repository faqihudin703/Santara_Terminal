# ⚡ Santara Terminal

**The Liquidity Layer & Cross-Chain Gateway for Lisk Sepolia, Base Sepolia, and Sepolia.**

![License](https://img.shields.io/badge/License-MIT-yellow.svg)
![Lisk](https://img.shields.io/badge/Network-Lisk_Sepolia-blue)
![Base](https://img.shields.io/badge/Network-Base_Sepolia-0052FF)
![Ethereum](https://img.shields.io/badge/Network-Sepolia-3C3C3D)
![Status](https://img.shields.io/badge/Status-Hackathon_Build-green)

> **Santara Terminal** is a unified DeFi infrastructure designed to solve liquidity fragmentation in the Superchain era. It combines a secure **Lock-and-Mint Bridge** or **Burn-and-Release Bridge** with an integrated **DEX**, enabling seamless arbitrage and asset flow between Lisk Sepolia, Base Sepolia, and Sepolia.

---

## 📺 Demo Preview

[![Watch the Demo](https://img.youtube.com/vi/VIDEO_ID/0.jpg)](https://www.youtube.com/watch?v=VIDEO_ID)

*(Video demo showcasing the full arbitrage cycle: Buy on Lisk -> Bridge -> Sell on Base)*

---

## 📜 Smart Contract Deployments

The system is live on Testnets. Click the addresses to verify the source code on Block Explorers.

| Network | Contract Name | Address (Verified) | Function |
| :--- | :--- | :--- | :--- |
| **Lisk Sepolia** | 📦 Santara Token (SAN) | [`0x...`](https://sepolia-blockscout.lisk.com/address/0xD26163Eb9C17E123d686a90309594dDC4f7Cd115) | Native Asset |
| **Lisk Sepolia** | 🏦 Lisk Vault Bridge | [`0x...`](https://sepolia-blockscout.lisk.com/address/0x6E83b127A4b10651e24bc98F5A8E4B16409Ca5A4) | Locking & Fee Collection |
| **Lisk Sepolia** | 💱 Santara DEX Router | [`0x...`](https://sepolia.basescan.org/address/0xa408AB8584EF3775D0731e4B4729896271f11895) | AMM Liquidity Pool for Native Asset |
| **Base Sepolia** | 📦 Wrapped SAN (wSAN) | [`0x...`](https://sepolia.basescan.org/address/0x1024B926a7d89E4C346f1bF4b091FC62617924D9) | Wrapped Asset on L2 |
| **Base Sepolia** | 💱 Wrapped Santara DEX Router | [`0x...`](https://sepolia.basescan.org/address/0xa3Df6325AbECd3e4562f95CfF55D898CC44535b4) | AMM Liquidity Pool for Wrapped Asset |
| **Sepolia** | 📦 Wrapped SAN (wSAN) | [`0x...`](https://sepolia.etherscan.io/address/0xFf8558e1be4EC0DD6b1DA2E22C382630609FD68c) | Wrapped Asset on L1 |
| **Sepolia** | 💱 Wrapped Santara DEX Router | [`0x...`](https://sepolia.etherscan.io/address/0xFe24283b6b6d8CeE4D6B22864530eBf4377cD415) | AMM Liquidity Pool for Wrapped Asset |

> **Security Note:** All contracts utilize the **Transparent Proxy Pattern**, allowing logic upgrades without changing the contract address.

---

## 💡 The Problem vs. Solution

### The Problem: Fragmented Liquidity
Assets on Lisk are often isolated from the wider ecosystem (Base/Optimism). Moving assets usually takes 10-20 minutes, causing traders to miss arbitrage opportunities due to price slippage.

### The Solution: Santara Terminal
We built a vertically integrated platform:
1.  **Fast Bridging (60s s/d 120s):** Powered by an event-driven Node.js Relayer.
2.  **Native DEX:** Swap assets immediately upon arrival without leaving the UI.
3.  **Real Yield:** A dynamic Protocol Fee mechanism that generates revenue in ETH.

---

## 🏗️ Architecture & Technology

### 1. Hybrid Relayer Engine (Node.js)
Instead of a centralized backend, we run a lightweight, Dockerized relayer that:
* **Listens** to `TokenLocked` or ``TokenReleased events on Lisk/Ethereum.
* **Verifies** transaction finality.
* **Protects** against Replay Attacks using **Idempotency Checks** (Nonce & Hash tracking).
* **Executes** `mintWrapped` on the destination chain or `releaseTokens` on origin chain securely.

### 2. Smart Contracts (Solidity)
* **Vault:** Manages asset custody and enforces Payable Fees.
* **DEX:** Implements standard $x * y = k$ AMM logic for volatile assets.
* **AccessControl:** Strictly manages `MINTER_ROLE` for the deployer.

### 3. Frontend (React + Vite)
* **Real-time Updates:** Listens to contract events to update UI balances instantly.
* **Multi-Chain Support:** Auto-detects and switches networks via MetaMask.

---

## 🛠️ How to Run Locally

### Prerequisites
* Node.js v18+
* Docker (Optional for Relayer)
* MetaMask

### 1. Clone the Repo
```bash
git clone [https://github.com/faqihudin703/Santara_Terminal.git](https://github.com/faqihudin703/Santara_Terminal.git)
cd santara-terminal

```

### 2. Setup Relayer (Backend)

Navigate to the relayer folder and configure `.env`:

```bash
cd bridge-relayer
# Create .env with your Private Key & RPC URLs
node index.js

```

### 3. Start DApp (Frontend)

```bash
cd frontend
npm install
npm run dev

```

Access the terminal at `http://localhost:3072`

---

## 🤝 Team & License

Built by **Faqihudin** for the **Lisk Hackathon**.
Focused on Infrastructure & Cross-Chain Interoperability.

License: **MIT**
