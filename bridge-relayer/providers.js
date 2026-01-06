import { ethers } from 'ethers'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { chains, lisk, keystore } from './config.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

// ✅ HELPER: Load ABI (Sesuai request)
function loadAbi(name) {
    // Pastikan file JSON ada di folder 'abi/'
    const raw = fs.readFileSync(path.join(__dirname, "abi", name), "utf8")
    const j = JSON.parse(raw)
    return j.abi || j
}

export async function initProviders() {
    // ------------------------------------------
    // 1) Load wallet (Signer)
    // ------------------------------------------
    if (!fs.existsSync(keystore.path)) throw new Error(`Keystore not found: ${keystore.path}`)
    
    console.log("🔐 Decrypting Wallet...")
    const keystoreJson = fs.readFileSync(keystore.path, "utf8")
    const walletBase = await ethers.Wallet.fromEncryptedJson(keystoreJson, keystore.pass)
    console.log("✅ Relayer Wallet:", walletBase.address)

    // ------------------------------------------
    // 2) Load 4 ABIs (Sesuai Request)
    // ------------------------------------------
    console.log("📂 Loading ABIs...")
    
    // A. ABI untuk Token Utama (SAN) - Upgradeable
    const vaultSanAbi = loadAbi("SantaraVault.json") 
    const wSanAbi     = loadAbi("WrappedSantaraToken.json")

    // B. ABI untuk Santara Rupiah (SIDR) - Non-Upgradeable
    // Pastikan nama file ini sesuai dengan yang ada di folder abi/ Anda
    const vaultSidrAbi = loadAbi("SantaraVaultSIDR.json") 
    const wSidrAbi     = loadAbi("WrappedSantaraRupiah.json")

    // ------------------------------------------
    // 3) SETUP LISK (ORIGIN) - Read/Write Split
    // ------------------------------------------
    
    // READ Provider (Public Node - Gratis)
    const liskReadProvider = new ethers.JsonRpcProvider(lisk.read)
    
    // WRITE Signer (Infura/Private - Bayar Gas)
    const liskWriteProvider = new ethers.JsonRpcProvider(lisk.write)
    const liskSigner = walletBase.connect(liskWriteProvider)

    const liskVaults = {
        // READ Instance (Polling Event)
        read: {
            SAN: new ethers.Contract(lisk.vaultSAN, vaultSanAbi, liskReadProvider),
            SIDR: new ethers.Contract(lisk.vaultSIDR, vaultSidrAbi, liskReadProvider)
        },
        // WRITE Instance (Release Token)
        write: {
            SAN: new ethers.Contract(lisk.vaultSAN, vaultSanAbi, liskSigner),
            SIDR: new ethers.Contract(lisk.vaultSIDR, vaultSidrAbi, liskSigner)
        }
    }

    // ------------------------------------------
    // 4) SETUP DESTINATIONS (BASE & SEPOLIA)
    // ------------------------------------------
    const destContracts = {}

    for (const [key, cfg] of Object.entries(chains)) {
        // Split Provider per Chain
        const readProvider = new ethers.JsonRpcProvider(cfg.read)
        const writeProvider = new ethers.JsonRpcProvider(cfg.write)
        const signer = walletBase.connect(writeProvider)

        destContracts[key] = {
            // READ Instance (Polling Burn)
            read: {
                wSAN: new ethers.Contract(cfg.wSAN, wSanAbi, readProvider),
                wSIDR: new ethers.Contract(cfg.wSIDR, wSidrAbi, readProvider)
            },
            // WRITE Instance (Mint Wrapped)
            write: {
                wSAN: new ethers.Contract(cfg.wSAN, wSanAbi, signer),
                wSIDR: new ethers.Contract(cfg.wSIDR, wSidrAbi, signer)
            }
        }
    }

    console.log("✅ Providers & Contracts Initialized.")

    return {
        liskVaults,
        destContracts
    }
}