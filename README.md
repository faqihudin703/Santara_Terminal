# ⚡ Santara Terminal: Multi-Chain Liquididty Layer

**The Unified Liquidity Gateway connecting Lisk Sepolia, Base Sepolia, and Ethereum Sepolia.**

![License](https://img.shields.io/badge/License-MIT-yellow.svg)
![Lisk](https://img.shields.io/badge/Origin-Lisk_Sepolia-blue)
![Base](https://img.shields.io/badge/Destination-Base_Sepolia-0052FF)
![Ethereum](https://img.shields.io/badge/Destination-Eth_Sepolia-3C3C3D)
![Status](https://img.shields.io/badge/Status-Hackathon_Build-green)

> **Santara Terminal** is a cross-chain DeFi infrastructure designed to unify liquidity across Layer 1 and Layer 2. It features a **Multi-Asset Bridge** and a fully deployed **DEX on all three chains**, enabling arbitrage opportunities between Lisk Sepolia (Native SAN) and Base Sepolia/Sepolia (Wrapped SAN).

---

## 📺 System Architecture

The platform operates on a **Single-Origin, Multi-Destination** model.

### 1. Asset Topology
* **Origin Chain (Lisk Sepolia):**
    * Holds the **Native SAN** token supply.
    * Users **LOCK** SAN here to bridge out.
* **Destination Chains (Base Sepolia & Ethereum Sepolia):**
    * Uses **Wrapped SAN (wSAN)** which is Mintable/Burnable.
    * Users **BURN** wSAN here to bridge back to Lisk.

### 2. Supported Assets
* **SAN (Volatile):** Available on Lisk (Native), Base (Wrapped), Sepolia (Wrapped). Tradable on DEX.
* **SIDR (Stablecoin):** Available on all chains for stable value transfer. Bridge Only (No DEX).

---

## 📜 Smart Contract Deployments

Below is the complete list of deployed contracts across the ecosystem.

### 🔵 Lisk Sepolia (Origin / Home Base)
*The liquidity source where Native Assets reside.*

| Contract Name | Type | Address | Description |
| :--- | :--- | :--- | :--- |
| **Santara Token (SAN)** | `ERC-20` | [`0x...`](https://sepolia-blockscout.lisk.com/address/0xD26163Eb9C17E123d686a90309594dDC4f7Cd115) | **Native Asset**. The original utility token. |
| **Santara Rupiah (SIDR)**| `ERC-20` | [`0x...`](https://sepolia-blockscout.lisk.com/address/0x8cc33Ce1693F5df898B65FdABD695D0d159808d1) | **Native Stablecoin**. |
| **Santara Token Vault** | `Vault` | [`0x...`](https://sepolia-blockscout.lisk.com/address/0x6E83b127A4b10651e24bc98F5A8E4B16409Ca5A4) | Custody contract. Locks SAN to mint on L2/L1. |
| **Santara Rupiah Vault** | `Vault` | [`0x...`](https://sepolia-blockscout.lisk.com/address/0x6106106210c1c08859144c5305A9DBc357EC6CCc) | Custody contract. Locks SIDR to mint on L2/L1. |
| **Santara DEX Router** | `AMM` | [`0x...`](https://sepolia-blockscout.lisk.com/address/0xa408AB8584EF3775D0731e4B4729896271f11895) | Liquidity Pool for **SAN / ETH**. |

### 🔵 Base Sepolia (Destination L2)
*Layer 2 environment for low-cost arbitrage.*

| Contract Name | Type | Address | Description |
| :--- | :--- | :--- | :--- |
| **Wrapped SAN (wSAN)** | `ERC-20` | [`0x...`](https://sepolia.basescan.org/address/0x1024b926a7d89e4c346f1bf4b091fc62617924d9) | **Pegged Asset**. Minted when SAN is locked on Lisk. |
| **Wrapped SIDR (wSIDR)**| `ERC-20` | [`0x...`](https://sepolia.basescan.org/address/0x98908a4d2f2fef0ae60fabe42cd67d921af72861) | **Pegged Stable**. Minted when SIDR is locked on Lisk. |
| **Base DEX Router** | `AMM` | [`0x...`](https://sepolia.basescan.org/address/0xa3df6325abecd3e4562f95cff55d898cc44535b4) | Liquidity Pool for **wSAN / ETH**. |

### ⚫ Ethereum Sepolia (Destination L1)
*Layer 1 environment for settlement and liquidity.*

| Contract Name | Type | Address | Description |
| :--- | :--- | :--- | :--- |
| **Wrapped SAN (wSAN)** | `ERC-20` | [`0x...`](https://sepolia.etherscan.io/address/0xff8558e1be4ec0dd6b1da2e22c382630609fd68c) | **Pegged Asset**. Minted when SAN is locked on Lisk. |
| **Wrapped SIDR (wSIDR)**| `ERC-20` | [`0x...`](https://sepolia.etherscan.io/address/0x949c0b04b6affa5042db8d5536c87a1f2af7ef11) | **Pegged Stable**. Minted when SIDR is locked on Lisk. |
| **Sepolia DEX Router** | `AMM` | [`0x...`](https://sepolia.etherscan.io/address/0xfe24283b6b6d8cee4d6b22864530ebf4377cd415) | Liquidity Pool for **wSAN / ETH**. |

---

## ⚙️ The Relayer Engine (Backend)

Santara uses a custom **Node.js Relayer** that acts as the bridge operator. It monitors events across all three chains simultaneously to execute "Lock-and-Mint" or "Burn-and-Release" logic.

### Bridge Flow Logic
1.  **Lisk Sepolia ➡ Base Sepolia/Sepolia (Lock & Mint):**
    * User locks **SAN** on Santara Token Vault.
    * Relayer mints **wSAN** on Base Sepolia or Sepolia.
2.  **Base Sepolia/Sepolia ➡ Lisk Sepolia (Burn & Release):**
    * User burns **wSAN** on Base Sepolia or Sepolia.
    * Relayer releases **SAN** from Santara Token Vault.

*Note: The same logic applies to SIDR/wSIDR.*

### Security Features
* **Idempotency:** Prevents double-minting by tracking unique nonces.

---

## 💱 Integrated Multi-Chain DEX

We have deployed a Decentralized Exchange (AMM) on **ALL** supported networks to facilitate instant trading and arbitrage.

| Network | Trading Pair | Asset Type |
| :--- | :--- | :--- |
| **Lisk Sepolia** | `SAN` / `ETH` | Native vs Native |
| **Base Sepolia** | `wSAN` / `ETH` | Wrapped vs Native |
| **Ethereum Sepolia** | `wSAN` / `ETH` | Wrapped vs Native |

*(Note: SIDR/wSIDR is currently supported for bridging only and does not have active DEX pools).*

---

## ⚡ Installation & Setup

Follow these steps to deploy and run the entire Santara Terminal stack. The installation order is critical: **Smart Contracts** $\to$ **Bridge Relayer** $\to$ **Frontend**.

### Prerequisites
* Node.js v18+
* Docker & Docker Compose (for Production Relayer)
* Git

---

### 🔐 Step 0: Generate & Setup Keystores

For production security, we segregate duties between the **Deployer** (Admin) and the **Relayer** (Worker).
This script will generate encrypted keystores and **automatically place them** into the correct service directories.

1.  **Create Generator Script:**
    In the root folder, create a file named `setup-keys.js`:

    ```javascript
    const { Wallet } = require("ethers");
    const fs = require("fs");
    const path = require("path");

    async function createKey(privateKey, password, relativePath) {
        if (!privateKey || !password) return;
        
        const targetPath = path.resolve(__dirname, relativePath);
        const dirName = path.dirname(targetPath);

        console.log(`🔐 Encrypting key for: ${relativePath}...`);
        
        // Ensure directory exists
        if (!fs.existsSync(dirName)) {
            fs.mkdirSync(dirName, { recursive: true });
        }

        const wallet = new Wallet(privateKey);
        const encryptedJson = await wallet.encrypt(password);
        
        fs.writeFileSync(targetPath, encryptedJson);
        console.log(`✅ Saved to: ${relativePath}`);
        console.log(`   Address: ${wallet.address}`);
        return wallet.address;
    }

    async function main() {
        console.log("--- SANTARA KEYSTORE SETUP ---");

        // 1. DEPLOYER WALLET -> Goes to smart-contracts/keystore
        // Required for deploying contracts
        await createKey(
            "PASTE_DEPLOYER_PRIVATE_KEY_HERE", 
            "PASSWORD_FOR_DEPLOYER", 
            "./smart-contracts/keystore/deployer_keystore.json"
        );

        console.log("------------------------------");

        // 2. RELAYER WALLET -> Goes to bridge-relayer/keystore
        // Required for the backend worker
        await createKey(
            "PASTE_RELAYER_PRIVATE_KEY_HERE", 
            "PASSWORD_FOR_RELAYER", 
            "./bridge-relayer/keystore/relayer_keystore.json"
        );
        
        console.log("------------------------------");
        console.log("🎉 Setup Complete! Don't forget to fund the Relayer Address.");
    }

    main().then(() => process.exit(0)).catch(console.error);
    ```

2.  **Run & Auto-Clean:**
    Execute the script to generate files and immediately remove the script (cleaning up raw keys).

    ```bash
    # Runs the setup AND deletes the script file upon success
    node setup-keys.js && rm setup-keys.js
    ```
    *(Windows PowerShell: `node setup-keys.js; Remove-Item setup-keys.js`)*

3.  **Verify Setup:**
    Check that the files are created in their respective folders:
    * `smart-contracts/keystore/deployer_key.json`
    * `bridge-relayer/keystore/relayer_key.json`

    Now, simply update your `.env` paths:

    * **In `smart-contracts/.env`:**
        ```env
        KEYSTORE_PATH="./keystore/deployer_keystore.json"
        ```

    * **In `bridge-relayer/.env`:**
        ```env
        # Docker maps the local folder, so keep this path:
        KEYSTORE_PATH=/usr/src/app/keystore/relayer_keystore.json
        ```

---

### Step 1: Deploy Smart Contracts

First, we need to deploy the Vaults, Tokens, and DEX contracts to Lisk Sepolia, Base Sepolia, and Ethereum Sepolia.
We use a **Hybrid Architecture**:

* **SAN Ecosystem (Native Token):** Uses **OpenZeppelin Transparent Proxy Pattern** (Upgradeable). The script deploys the Proxy pointing immediately to the V2 Implementation.
* **SIDR Ecosystem (Stablecoin):** Uses **Standard Immutable Contracts** (Non-Upgradeable) for maximum stability and simplicity.

#### 1.1 Setup Environment

Navigate to the contracts folder and configure your credentials.

```bash
cd smart-contracts

# Copy the example environment file
cp .env-example .env

```

Edit the `.env` file and fill in your details (Using Keystore for security):

```env
KEYSTORE_PATH="./keystore/deployer_keystore.json"
KEYSTORE_PASSWORD="your_keystore_password"
SEPOLIA_RPC_URL="[https://sepolia.infura.io/v3/YOUR_KEY](https://sepolia.infura.io/v3/YOUR_KEY)"
BASE_RPC_URL="[https://base-sepolia.infura.io/v3/YOUR_KEY](https://base-sepolia.infura.io/v3/YOUR_KEY)"
LISK_SEPOLIA_RPC_URL="[https://rpc.sepolia-api.lisk.com](https://rpc.sepolia-api.lisk.com)"
ETHERSCAN_API_KEY="your_etherscan_api_key"
RELAYER_ADDRESS="0x_your_relayer_public_address"

```

#### 1.2 Compile Contracts

Ensure the Solidity code compiles correctly.

```bash
npm install
npx hardhat compile

```

#### 1.3 Deploy to Networks

Run the specific deployment scripts for each network.

```bash
# 1. Deploy Origin Contracts to Lisk Sepolia
# SAN uses Proxy/Upgradeable logic
npx hardhat run scripts/deploy-SAN-and-Vault.js --network lisk
# SIDR uses Standard logic
npx hardhat run scripts/deploy-SIDR-and-Vault.js --network lisk
# DEX Deployment
npx hardhat run scripts/deploy-SantaraDEX.js --network lisk

# 2. Deploy Destination Contracts to Base Sepolia
# wSAN uses Proxy/Upgradeable logic
npx hardhat run scripts/deploy-wSAN.js --network base
# wSIDR uses Standard logic
npx hardhat run scripts/deploy-wSIDR.js --network base
# DEX Deployment
npx hardhat run scripts/deploy-wSantaraDEX.js --network base

# 3. Deploy Destination Contracts to Eth Sepolia
# wSAN uses Proxy/Upgradeable logic
npx hardhat run scripts/deploy-wSAN.js --network sepolia
# wSIDR uses Standard logic
npx hardhat run scripts/deploy-wSIDR.js --network sepolia
# DEX Deployment
npx hardhat run scripts/deploy-wSantaraDEX.js --network sepolia

```

#### 1.4 Save Addresses

After deployment, the terminal will output the contract addresses. **Save these addresses**, as you will need them for Step 2 and Step 3.

> **Note:** For SAN/Vault-SAN/wSAN, ensure you save the **Proxy Address**, not the Implementation address.

---

### Step 2: Run Bridge Relayer (Backend)

The Relayer is a Node.js service. For production, we recommend running it via **Docker** utilizing **PM2** for process management. We **COPY** the keystore into the image (instead of mounting) to avoid permission issues and ensure stability.

#### 2.1 Setup Environment

Navigate to the relayer folder.

```bash
cd ../bridge-relayer

# Copy the example environment file
cp .env.example .env

```

Edit `.env` and **update the contract addresses**.

> **⚠️ Important:** Choose the correct KEYSTORE_PATH depending on how you run the app (Docker vs Local).

```env
# ==========================================
# 🔐 SECURITY (KEYSTORE)
# ==========================================
# OPTION A: If running via DOCKER (Recommended for Production)
KEYSTORE_PATH=/usr/src/app/keystore/relayer_key.json

# OPTION B: If running LOCALLY (npm start)
# KEYSTORE_PATH=./keystore/relayer_key.json

KEYSTORE_PASSWORD=your_secure_password

# ==========================================
# ⚙️ SYSTEM SETTINGS
# ==========================================
DB_PATH=relayer.db
POLL_INTERVAL=2000
BLOCK_STEP=1

# ==========================================
# 🌐 RPC CONFIGURATION
# ==========================================
LISK_CHAIN_ID=4202
LISK_READ_RPC=[https://lisk-sepolia.drpc.org](https://lisk-sepolia.drpc.org)
LISK_WRITE_RPC=[https://lisk-sepolia.drpc.org](https://lisk-sepolia.drpc.org)

BASE_CHAIN_ID=84532
BASE_READ_RPC=[https://base-sepolia-rpc.publicnode.com](https://base-sepolia-rpc.publicnode.com)
BASE_WRITE_RPC=[https://base-sepolia.infura.io/v3/YOUR_KEY](https://base-sepolia.infura.io/v3/YOUR_KEY)

SEPOLIA_CHAIN_ID=11155111
SEPOLIA_READ_RPC=[https://ethereum-sepolia-rpc.publicnode.com](https://ethereum-sepolia-rpc.publicnode.com)
SEPOLIA_WRITE_RPC=[https://sepolia.infura.io/v3/YOUR_KEY](https://sepolia.infura.io/v3/YOUR_KEY)

# ==========================================
# 🏠 CONTRACT ADDRESSES (Fill from Step 1)
# ==========================================
ADDR_LISK_TOKEN_SAN=0x...
ADDR_LISK_VAULT_SAN=0x...
ADDR_LISK_TOKEN_SIDR=0x...
ADDR_LISK_VAULT_SIDR=0x...

ADDR_BASE_WSAN=0x...
ADDR_BASE_WSIDR=0x...

ADDR_SEPOLIA_WSAN=0x...
ADDR_SEPOLIA_WSIDR=0x...

```

#### 2.2 Run Relayer (Option A: Docker / Production))

We use Docker to mount the keystore securely.

1. **Build the Image:**
```bash
docker build -t santara-relayer .

```

2. **Run Container:**

```bash
docker run -d \
  --name relayer-v1 \
  --restart always \
  --env-file .env \
  santara-relayer

```

### 2.3 Run Relayer (Option B: Local Dev)

If you want to run without Docker for debugging:

1. **Update .env:** Change the keystore path to look in the local directory:

```env
KEYSTORE_PATH=./keystore/relayer_key.json
```

2. **Start Service:**

```bash
npm install
node index.js
```

#### 2.4 Verify Service

Check the logs (Docker or Terminal) to ensure the relayer is scanning:

```bash
docker logs -f relayer-v1

```

**Expected Output:**

```text
🐳 DOCKER ENV DIAGNOSTICS:
-------------------------------------
✅ LISK_READ: [https://lisk-sepolia.drpc](https://lisk-sepolia.drpc)...
✅ BASE_WRITE: [https://base-sepolia.infu](https://base-sepolia.infu)...
-------------------------------------
🚀 Starting Production Relayer...
🔐 Decrypting Wallet...
✅ Relayer Wallet: 0x....
👀 [lisk] Scanning...
👀 [base] Scanning...

```

---

### Step 3: Run Frontend (Production Build)

#### 3.1 Setup Environment

Navigate to the frontend folder.

```bash
cd ../frontend
cp .env.example .env

```

Edit `.env` with the contract addresses deployed in Step 1.

```env
VITE_LISK_CHAIN_ID=4202
VITE_LISK_RPC_URL=[https://rpc.sepolia-api.lisk.com](https://rpc.sepolia-api.lisk.com)
# ... (Add Base & Sepolia RPCs)

# Contracts
VITE_ADDR_LISK_TOKEN_SAN=0x...
VITE_ADDR_LISK_VAULT_SAN=0x...
# ... (Add all other addresses)

```

#### 3.2 Build & Serve

For production, we build the static files and serve them.

```bash
# 1. Install Dependencies
npm install

# 2. Build for Production (Outputs to /dist folder)
npm run build

# 3. Preview/Serve the build locally
npm run preview

```

The app will be available at `http://localhost:5173` (default Vite preview port) or the configured port on your server.

#### 3.3 Feature Check

* **Bridge Page:** Connect wallet and try bridging SAN from Lisk to Base. Check if the Docker logs (Step 2.3) show "Event Detected".
* **DEX Page:** Try swapping wSAN to ETH on Base Sepolia.

---

## 🛣️ Roadmap

* [x] **Phase 1:** Deploy Tokens (SAN, wSAN, SIDR, wSIDR) & Vaults on Lisk Sepolia/Base Sepolia/Sepolia.
* [x] **Phase 2:** Implement Bidirectional Bridge (Lock-Mint & Burn-Release).
* [x] **Phase 3:** Deploy AMM DEX for Volatile Assets (SAN/wSAN).

---

## 🤝 Submission Details

* **Hackathon:** Lisk Builder Hackathon 2026
* **Category:** Infrastructure & DeFi
* **Developer:** Faqihudin

**License:** MIT