import { chains, tokenMap, reverseMap, lisk } from './config.js'; // Ensure 'lisk' is imported
import { initProviders } from './providers.js';
import { loadState, createStateManager } from './state.js';
import { pollOrigin, pollDest } from './poller.js';
import { isIdempotentError } from './utils.js';

export class Relayer {
    async start() {
        console.log("🚀 Starting Production Relayer...");
        
        const { liskVaults, destContracts } = await initProviders();
        
        // Init State
        const defaults = { lisk: 0, base: 0, sepolia: 0 };
        const state = { value: loadState(defaults) };
        const stateManager = createStateManager(state);

        // ===========================================
        // PROCESSOR: LOCK (ORIGIN -> DEST)
        // ===========================================
        const processLock = async (ev, tokenAddr, destContracts) => {
            // [LOG] Start processing a Lock event
            console.log(`\n--- [LOCK DETECTED] ---`);
            console.log(`Source Token Addr (from Poller): ${tokenAddr}`);

            const { toChainRecipient, amount, destinationChainId, transferID } = ev.args;
            console.log(`Event Args: Amount=${amount}, DestChain=${destinationChainId}, TransferID=${transferID}`);
            
            // 1. Routing Validation
            let destKey = null;
            if (destinationChainId == chains.base.id) destKey = 'base';
            if (destinationChainId == chains.sepolia.id) destKey = 'sepolia';
            
            if (!destKey) {
                console.log(`❌ Skipped: Unknown Destination Chain ID ${destinationChainId}`);
                return false;
            }
            if (!destContracts[destKey]) {
                console.log(`❌ Skipped: No contract configured for ${destKey}`);
                return false;
            }

            // [LOG] Checking Token Map
            console.log(`Checking tokenMap for key: ${tokenAddr.toLowerCase()} on chain: ${destinationChainId}`);
            const wrappedAddr = tokenMap[tokenAddr.toLowerCase()]?.[destinationChainId];
            
            if (!wrappedAddr) {
                console.log(`❌ Skipped: No mapping found in tokenMap for ${tokenAddr}`);
                return false;
            }
            console.log(`✅ Mapping Found: Wrapped Address is ${wrappedAddr}`);

            // Determine contract to write to
            let contractWrite;
            const wSAN_Target = destContracts[destKey].write.wSAN.target;
            const wSIDR_Target = destContracts[destKey].write.wSIDR.target;

            if (wrappedAddr.toLowerCase() === wSAN_Target.toLowerCase()) {
                contractWrite = destContracts[destKey].write.wSAN;
                console.log(`Targeting Contract: wSAN (${destKey})`);
            } else if (wrappedAddr.toLowerCase() === wSIDR_Target.toLowerCase()) {
                contractWrite = destContracts[destKey].write.wSIDR;
                console.log(`Targeting Contract: wSIDR (${destKey})`);
            } else {
                console.log(`❌ Critical: Mapped address ${wrappedAddr} does not match any known contract targets.`);
                console.log(`Known wSAN: ${wSAN_Target}`);
                console.log(`Known wSIDR: ${wSIDR_Target}`);
                return false;
            }

            // 2. ON-CHAIN CHECK
            try {
                const isProcessed = await contractWrite.processed(transferID);
                if (isProcessed) {
                    console.log(`🔹 [IDEMPOTENT] ID ${transferID} already processed on-chain.`);
                    return true;
                }
            } catch (e) {
                console.warn(`⚠ Failed on-chain check (RPC error?): ${e.message}`);
                return false; 
            }

            // 3. EXECUTE MINT
            try {
                console.log(`🚀 Attempting Mint on ${destKey}...`);
                const tx = await contractWrite.mintWrapped(toChainRecipient, amount, transferID);
                console.log(`⏳ Tx Sent: ${tx.hash}`);
                
                await tx.wait(1);
                console.log("✅ Mint Success!");
                return true;

            } catch (e) {
                if (isIdempotentError(e)) {
                    console.log(`🔹 [IDEMPOTENT] Tx failed but assumed success: ${e.message}`);
                    return true;
                }
                console.error(`❌ Mint Error (Will Retry): ${e.message}`);
                return false;
            }
        };

        // ===========================================
        // PROCESSOR: BURN (DEST -> ORIGIN)
        // ===========================================
        const processBurn = async (ev, tokenAddr, liskVaults, chainKey) => {
            console.log(`\n--- [BURN DETECTED] ---`);
            const { from, amount, destinationChainId, transferId } = ev.args;
            console.log(`Event Args: Amount=${amount}, DestChain=${destinationChainId}, TransferID=${transferId}`);
            
            // Check Lisk Chain ID from config
            if (Number(destinationChainId) !== lisk.id) {
                console.log(`ℹ Skipped: Destination chain ${destinationChainId} is not Lisk (${lisk.id})`);
                return true; 
            }

            // [LOG] Checking Reverse Map
            // Note: For burn, the event comes from the token contract itself.
            // Ensure tokenAddr passed here is the address of the wToken contract.
            console.log(`Checking reverseMap for key: ${tokenAddr.toLowerCase()}`);
            const vaultAddr = reverseMap[tokenAddr.toLowerCase()];
            
            if (!vaultAddr) {
                console.log(`❌ Skipped: No mapping found in reverseMap for ${tokenAddr}`);
                return false;
            }
            console.log(`✅ Mapping Found: Vault Address is ${vaultAddr}`);

            let vaultWrite;
            const sanVaultTarget = liskVaults.write.SAN.target;
            const sidrVaultTarget = liskVaults.write.SIDR.target;

            if (vaultAddr.toLowerCase() === sanVaultTarget.toLowerCase()) {
                vaultWrite = liskVaults.write.SAN;
                console.log(`Targeting Vault: SAN Vault`);
            } else if (vaultAddr.toLowerCase() === sidrVaultTarget.toLowerCase()) {
                vaultWrite = liskVaults.write.SIDR;
                console.log(`Targeting Vault: SIDR Vault`);
            } else {
                console.log(`❌ Critical: Mapped address ${vaultAddr} does not match any known Vault targets.`);
                return false;
            }

            // 2. ON-CHAIN CHECK
            try {
                const isProcessed = await vaultWrite.processedRelease(transferId);
                if (isProcessed) {
                    console.log(`🔹 [IDEMPOTENT] Release ${transferId} already processed.`);
                    return true;
                }
            } catch (e) {
                console.warn(`⚠ Failed on-chain check: ${e.message}`);
                return false;
            }

            // 3. EXECUTE RELEASE
            try {
                console.log(`🚀 Releasing on Lisk...`);
                const tx = await vaultWrite.releaseTokens(from, amount, transferId);
                console.log(`⏳ Tx Sent: ${tx.hash}`);
                await tx.wait(1);
                console.log("✅ Release Success!");
                return true;

            } catch (e) {
                if (isIdempotentError(e)) {
                    console.log(`🔹 [IDEMPOTENT] Release assumed success: ${e.message}`);
                    return true;
                }
                console.error(`❌ Release Error: ${e.message}`);
                return false;
            }
        };

        // ... Loops ...
        const loopLisk = async () => {
            const delay = await pollOrigin(state, liskVaults, destContracts, processLock, stateManager);
            setTimeout(loopLisk, delay);
        };
        const loopDest = async (key) => {
            const delay = await pollDest(key, state, destContracts, liskVaults, processBurn, stateManager);
            setTimeout(() => loopDest(key), delay);
        };

        loopLisk();
        if (destContracts.base) loopDest('base');
        if (destContracts.sepolia) loopDest('sepolia');
    }
}