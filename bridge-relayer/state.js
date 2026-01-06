// state.js
import Database from 'better-sqlite3';
import { statePath } from './config.js';

let db;

function initDB() {
    if (db) return;
    db = new Database(statePath);
    db.pragma('journal_mode = WAL');

    // UPGRADE: Simpan blockHash untuk validasi Reorg
    db.exec(`
        CREATE TABLE IF NOT EXISTS pointers (
            chain TEXT PRIMARY KEY, 
            block INTEGER, 
            blockHash TEXT
        )
    `);
    
    // Events table (tetap sama)
    db.exec(`
        CREATE TABLE IF NOT EXISTS events (
            chain TEXT,
            txHash TEXT,
            logIndex INTEGER,
            transferId TEXT,
            timestamp INTEGER,
            PRIMARY KEY (chain, txHash, logIndex)
        )
    `);
}

export function loadState(defaults) {
    initDB();
    const rows = db.prepare('SELECT chain, block, blockHash FROM pointers').all();
    const blocks = { ...defaults };
    const hashes = {}; // Memory cache untuk hash

    rows.forEach(row => { 
        blocks[row.chain] = row.block;
        hashes[row.chain] = row.blockHash;
    });

    console.log("📁 State loaded.", blocks);
    return { blocks, hashes };
}

export function createStateManager(stateRef) {
    initDB();

    const stmtCheckEvent = db.prepare('SELECT 1 FROM events WHERE chain = ? AND txHash = ? AND logIndex = ?');
    const stmtInsertEvent = db.prepare('INSERT OR IGNORE INTO events (chain, txHash, logIndex, transferId, timestamp) VALUES (?, ?, ?, ?, ?)');
    const stmtUpdateBlock = db.prepare('INSERT OR REPLACE INTO pointers (chain, block, blockHash) VALUES (?, ?, ?)');

    const hasProcessed = (chain, txHash, logIndex) => !!stmtCheckEvent.get(chain, txHash, logIndex);

    // ATOMIC UPDATE (Block + Events)
    const atomicUpdate = db.transaction((chainKey, newBlock, newBlockHash, newEvents) => {
        stmtUpdateBlock.run(chainKey, newBlock, newBlockHash);
        for (const ev of newEvents) {
            stmtInsertEvent.run(chainKey, ev.txHash, ev.logIndex, ev.transferId, Date.now());
        }
    });

    // REORG HANDLING: Mundur N blok
    // Jika terdeteksi reorg, kita mundur pointer di DB agar poller scan ulang.
    // Kita TIDAK menghapus event di tabel 'events' karena event tersebut mungkin valid di chain fork baru,
    // atau kalaupun tidak valid, check on-chain processed() akan melindunginya.
    const rollback = (chainKey, safeHeight) => {
        console.warn(`⚠ REORG DETECTED on ${chainKey}! Rolling back to ${safeHeight}`);
        
        // Hapus pointer hash agar poller force-fetch ulang
        stmtUpdateBlock.run(chainKey, safeHeight, null);
        
        // Update memory state
        stateRef.value.blocks[chainKey] = safeHeight;
        stateRef.value.hashes[chainKey] = null;
    };

    return { hasProcessed, atomicUpdate, rollback };
}