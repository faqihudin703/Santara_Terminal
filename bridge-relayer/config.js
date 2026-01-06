import 'dotenv/config'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

// --- SYSTEM & KEYSTORE ---
export const pollInterval  = parseInt(process.env.POLL_INTERVAL || "5000")
export const blockStep     = parseInt(process.env.BLOCK_STEP || "1000")
export const confirmations = parseInt(process.env.CONFIRMATIONS || "5")
export const statePath     = process.env.DB_PATH || "relayer.db"

export const keystore = {
    path: process.env.KEYSTORE_PATH,
    pass: process.env.KEYSTORE_PASSWORD
}

// --- 1. CONFIG UTAMA (Disatukan agar hemat baris) ---

export const lisk = {
    key: 'lisk',
    name: 'Lisk Sepolia',
    id: Number(process.env.LISK_CHAIN_ID),
    read:  process.env.LISK_READ_RPC,
    write: process.env.LISK_WRITE_RPC,
    // Addresses langsung di sini (Hemat tempat)
    vaultSAN:  process.env.ADDR_LISK_VAULT_SAN,
    vaultSIDR: process.env.ADDR_LISK_VAULT_SIDR,
    tokenSAN:  process.env.ADDR_LISK_TOKEN_SAN,
    tokenSIDR: process.env.ADDR_LISK_TOKEN_SIDR
}

export const chains = {
    base: {
        key: 'base',
        name: 'Base Sepolia',
        id: Number(process.env.BASE_CHAIN_ID),
        read:  process.env.BASE_READ_RPC,
        write: process.env.BASE_WRITE_RPC,
        wSAN:  process.env.ADDR_BASE_WSAN,
        wSIDR: process.env.ADDR_BASE_WSIDR
    },
    sepolia: {
        key: 'sepolia',
        name: 'Ethereum Sepolia',
        id: Number(process.env.SEPOLIA_CHAIN_ID),
        read:  process.env.SEPOLIA_READ_RPC,
        write: process.env.SEPOLIA_WRITE_RPC,
        wSAN:  process.env.ADDR_SEPOLIA_WSAN,
        wSIDR: process.env.ADDR_SEPOLIA_WSIDR
    }
}

// --- 2. ALIAS HELPER (Agar kode lain tidak error) ---
// Ini teknik "Pointer Reference", tidak memakan memori tambahan.
export const addresses = {
    lisk: lisk,
    base: chains.base,
    sepolia: chains.sepolia
}

// --- 3. MAPPING (Untuk Kecepatan Pencarian / O(1)) ---
// Mapping ini membuat Relayer tidak perlu "mikur" (looping) saat runtime.

export const tokenMap = {
    [lisk.tokenSAN.toLowerCase()]: {
        [chains.base.id]: chains.base.wSAN,
        [chains.sepolia.id]: chains.sepolia.wSAN
    },
    [lisk.tokenSIDR.toLowerCase()]: {
        [chains.base.id]: chains.base.wSIDR,
        [chains.sepolia.id]: chains.sepolia.wSIDR
    }
}

export const reverseMap = {
    [chains.base.wSAN.toLowerCase()]: lisk.vaultSAN,
    [chains.base.wSIDR.toLowerCase()]: lisk.vaultSIDR,
    [chains.sepolia.wSAN.toLowerCase()]: lisk.vaultSAN,
    [chains.sepolia.wSIDR.toLowerCase()]: lisk.vaultSIDR,
}