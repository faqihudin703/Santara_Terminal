// src/config.js

// Helper untuk validasi
const getEnv = (key) => {
    // Vite menggunakan import.meta.env
    const value = import.meta.env[key];
    if (!value) console.warn(`⚠️ Config Missing: ${key}`);
    return value || "";
};

export const CONFIG = {
    NETWORKS: {
        // --- ORIGIN CHAIN ---
        LISK: {
            NAME: "Lisk Sepolia",
            KEY: "lisk",
            CHAIN_ID: getEnv("VITE_LISK_CHAIN_ID"),
            RPC_URL: getEnv("VITE_LISK_RPC_URL"),
            EXPLORER: "https://sepolia-blockscout.lisk.com"
        },
        // --- DESTINATION CHAINS ---
        BASE: {
            NAME: "Base Sepolia",
            KEY: "base",
            CHAIN_ID: getEnv("VITE_BASE_CHAIN_ID"),
            RPC_URL: getEnv("VITE_BASE_RPC_URL"),
            EXPLORER: "https://sepolia.basescan.org"
        },
        SEPOLIA: {
            NAME: "Ethereum Sepolia",
            KEY: "sepolia",
            CHAIN_ID: getEnv("VITE_SEPOLIA_CHAIN_ID"),
            RPC_URL: getEnv("VITE_SEPOLIA_RPC_URL"),
            EXPLORER: "https://sepolia.etherscan.io"
        }
    },

    CONTRACTS: {
        // --- ORIGIN CHAIN ---
        LISK: {
            TOKEN_SAN: getEnv("VITE_ADDR_LISK_TOKEN_SAN"),
            VAULT_SAN: getEnv("VITE_ADDR_LISK_VAULT_SAN"),
            TOKEN_SIDR: getEnv("VITE_ADDR_LISK_TOKEN_SIDR"),
            VAULT_SIDR: getEnv("VITE_ADDR_LISK_VAULT_SIDR"),
            ROUTER: getEnv("VITE_ADDR_LISK_DEX_ROUTER") 
        },
        // --- DESTINATION CHAINS ---
        BASE: {
            WSAN: getEnv("VITE_ADDR_BASE_WSAN"),
            WSIDR: getEnv("VITE_ADDR_BASE_WSIDR"),
            ROUTER: getEnv("VITE_ADDR_BASE_DEX_ROUTER")
        },
        SEPOLIA: {
            WSAN: getEnv("VITE_ADDR_SEPOLIA_WSAN"),
            WSIDR: getEnv("VITE_ADDR_SEPOLIA_WSIDR"),
            ROUTER: getEnv("VITE_ADDR_SEPOLIA_DEX_ROUTER")
        }
    },
};