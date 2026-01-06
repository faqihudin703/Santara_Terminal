// utils.js

// List error yang berarti transaksi SEBENARNYA sudah masuk/sukses/pending
// sehingga kita aman untuk menandainya sebagai "Processed" di DB.
const IDEMPOTENT_ERRORS = [
    "nonce too low",
    "replacement transaction underpriced", 
    "already known", 
    "already processed",
    "transaction already imported",
    "ALREADY_EXISTS", 
    "UNIQUE constraint failed" // SQLite error protection
];

// Error dari Smart Contract (custom errors)
const CONTRACT_LOGIC_ERRORS = [
    "processed",        // Modifier: already processed
    "processedRelease", // Modifier: already released
    "InvalidID"         // ID conflict
];

export function isIdempotentError(error) {
    const msg = error?.message || error?.toString() || "";
    
    // 1. Cek RPC/Network Errors umum
    if (IDEMPOTENT_ERRORS.some(chk => msg.includes(chk))) {
        return true;
    }

    // 2. Cek Contract Revert Reason
    // Ethers v6 biasanya membungkus revert di error.data atau error.shortMessage
    if (CONTRACT_LOGIC_ERRORS.some(chk => msg.includes(chk))) {
        return true;
    }

    // 3. Cek Ethers specific codes
    if (error.code === 'NONCE_EXPIRED' || error.code === 'REPLACEMENT_UNDERPRICED') {
        return true;
    }

    return false;
}