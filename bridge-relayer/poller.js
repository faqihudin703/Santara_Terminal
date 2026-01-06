import { blockStep, pollInterval, confirmations, addresses } from './config.js';

// --- GENERIC POLLER ---
async function pollGeneric(
    chainKey, provider, targets, currentState, filterMethod, processCallback, stateManager
) {
    // 1. Cek Blok Terbaru di Blockchain
    let currentBlockInfo;
    try {
        currentBlockInfo = await provider.getBlock("latest");
    } catch (e) {
        // Log error tapi jangan terlalu panik, biar retry nanti
        console.log(`⚠ [${chainKey}] Connection Check: Retrying... (${e.message})`);
        return pollInterval;
    }

    const currentBlock = currentBlockInfo.number;
    const safeBlock = currentBlock - confirmations; // Blok aman (matang)

    // 2. Tentukan Start Block (FROM)
    const lastBlockNum = currentState.blocks[chainKey];
    let fromBlock;

    // --- LOGIKA "FRESH START" ---
    // Jika DB kosong (0), JANGAN ambil history. Mulai dari detik ini juga.
    if (!lastBlockNum || lastBlockNum === 0) {
        console.log(`✨ [${chainKey}] INITIALIZED: Starting fresh from block ${safeBlock}`);
        
        // Kita set supaya loop ini langsung memproses blok ini
        fromBlock = safeBlock; 
        
        // (Opsional) Langsung simpan ke DB biar kalau restart dia ingat
        // stateManager.atomicUpdate(chainKey, safeBlock, null, []);
    } else {
        // Lanjut tepat 1 blok setelah terakhir
        fromBlock = lastBlockNum + 1;
    }

    // 3. Cek Status Sync
    // Jika posisi kita sudah melewati blok aman, berarti kita Up-to-Date.
    if (fromBlock > safeBlock) {
        // Tampilkan log "Detak Jantung" biar user tahu proses jalan
        console.log(`💤 [${chainKey}] Synced at #${lastBlockNum}. Waiting for #${currentBlock}...`);
        return pollInterval; 
    }

    // 4. Tentukan End Block (TO)
    // Menggunakan blockStep dari .env. 
    // Jika Anda set BLOCK_STEP=1 di .env, ini akan maju 1 per 1.
    const toBlock = Math.min(fromBlock + blockStep, safeBlock);

    // --- VISUAL LOG (REQ USER) ---
    // Log ini hanya muncul di terminal, tidak disimpan ke file.
    console.log(`👀 [${chainKey}] Scanning #${fromBlock} -> #${toBlock} (Target: ${safeBlock})`);

    // 5. Query & Process
    const successfulEvents = [];

    for (const target of targets) {
        try {
            const events = await target.contract.queryFilter(filterMethod(target.contract), fromBlock, toBlock);

            if (events.length > 0) {
                console.log(`   Found ${events.length} events on ${target.type}!`);
            }

            for (const ev of events) {
                // Cek DB (Idempotency)
                if (stateManager.hasProcessed(chainKey, ev.transactionHash, ev.index)) continue;

                // Process Event
                const success = await processCallback(ev, target.addr, chainKey);
                
                if (success) {
                    successfulEvents.push({
                        txHash: ev.transactionHash,
                        logIndex: ev.index,
                        transferId: ev.args.transferID || ev.args.transferId
                    });
                }
            }
        } catch (e) {
            console.error(`❌ [${chainKey}] Error scanning: ${e.message}`);
            return 5000; // Retry delay
        }
    }

    // 6. Simpan State (Checkpoint)
    // Ambil hash blok terbaru (untuk reorg protection sederhana di masa depan)
    let toBlockHash = null;
    try { toBlockHash = (await provider.getBlock(toBlock)).hash; } catch(e) {}

    stateManager.atomicUpdate(chainKey, toBlock, toBlockHash, successfulEvents);
    
    // Update Memory
    currentState.blocks[chainKey] = toBlock;

    // Logic Fast-Forward:
    // Jika masih tertinggal banyak (> 5 blok), jangan istirahat (return 0/kecil).
    // Jika sudah dekat, istirahat sesuai pollInterval.
    const remaining = safeBlock - toBlock;
    if (remaining > 5) {
        return 500; // Gas pol 0.5 detik
    }
    
    return pollInterval;
}

// --- WRAPPERS (Sama seperti sebelumnya) ---

export async function pollOrigin(state, liskVaults, destContracts, processLock, stateManager) {
    const targets = [
        { contract: liskVaults.read.SAN, type: 'SAN', addr: addresses.lisk.tokenSAN },
        { contract: liskVaults.read.SIDR, type: 'SIDR', addr: addresses.lisk.tokenSIDR }
    ];
    // Helper filter
    const getFilter = (contract) => contract.filters.TokensLocked();
    const processor = (ev, tokenAddr) => processLock(ev, tokenAddr, destContracts);

    return pollGeneric('lisk', liskVaults.read.SAN.runner.provider, targets, state.value, getFilter, processor, stateManager);
}

export async function pollDest(chainKey, state, destContracts, liskVaults, processBurn, stateManager) {
    if (!destContracts[chainKey]) return pollInterval * 10;
    
    const contracts = destContracts[chainKey];
    const targets = [
        { contract: contracts.read.wSAN, type: 'wSAN', addr: addresses[chainKey].wSAN },
        { contract: contracts.read.wSIDR, type: 'wSIDR', addr: addresses[chainKey].wSIDR }
    ];

    const getFilter = (contract) => contract.filters.BridgeBurned();
    const processor = (ev, tokenAddr) => processBurn(ev, tokenAddr, liskVaults, chainKey);

    return pollGeneric(chainKey, contracts.read.wSAN.runner.provider, targets, state.value, getFilter, processor, stateManager);
}