require("dotenv").config();
const hre = require("hardhat");
const { ethers, upgrades } = hre;

const RELAYER_ADDRESS = process.env.RELAYER_ADDRESS;

async function main() {
  console.log("--- STARTING DEPLOYMENT ON LISK SEPOLIA (UPGRADEABLE) ---");

  if (!RELAYER_ADDRESS) {
    throw new Error("❌ Error: Pastikan RELAYER_ADDRESS sudah di-set di .env");
  }

  const [deployer] = await ethers.getSigners();
  console.log("Deployer Wallet:", deployer.address);
  console.log("Relayer Address:", RELAYER_ADDRESS);

  // --------------------------------------------------------
  // 1. Deploy SantaraToken (SAN) - Upgradeable
  // --------------------------------------------------------
  console.log("\n[1/3] Deploying SantaraToken (SAN) Proxy...");

  const SAN = await ethers.getContractFactory("SantaraToken");
  
  // Initialize tanpa argumen (supply awal 0, mint manual nanti)
  const san = await upgrades.deployProxy(SAN, [], { 
    initializer: 'initialize',
    kind: 'transparent' 
  });
  await san.waitForDeployment();

  const sanAddr = await san.getAddress();
  console.log(`✅ Santara Token (Proxy) Deployed at: ${sanAddr}`);

  // --------------------------------------------------------
  // 2. Deploy LiskSantaraVault - Upgradeable
  // --------------------------------------------------------
  console.log("\n[2/3] Deploying LiskSantaraVault Proxy...");

  const TokenVault = await ethers.getContractFactory("LiskSantaraVault");
  
  // Perbaikan: initialize hanya butuh [tokenAddress]. 
  // Admin otomatis diset ke deployer di dalam kontrak.
  const tokenVault = await upgrades.deployProxy(
    TokenVault,
    [sanAddr], 
    { initializer: "initialize" }
  );
  await tokenVault.waitForDeployment();

  const tokenVaultAddr = await tokenVault.getAddress();
  console.log(`✅ LiskSantaraVault (Proxy) Deployed at: ${tokenVaultAddr}`);

  // --------------------------------------------------------
  // 3. Setup Roles (PENTING)
  // --------------------------------------------------------
  console.log("\n[3/3] Granting Roles...");

  // --- A. Setup Roles di Token SAN ---
  // Kita beri akses MINTER ke Deployer agar bisa mint supply awal
  const MINTER_ROLE = await san.MINTER_ROLE();
  const PAUSER_ROLE_SAN = await san.PAUSER_ROLE();
  
  await (await san.grantRole(PAUSER_ROLE_SAN, deployer.address)).wait();
  console.log(`   > SAN: Pauser Role granted to Deployer`);

  // --- B. Setup Roles di Vault ---
  // Relayer butuh RELAYER_ROLE untuk mengeksekusi 'releaseTokens' (saat user bridge balik ke Base)
  const RELAYER_ROLE_VAULT = await tokenVault.RELAYER_ROLE();
  const PAUSER_ROLE_VAULT = await tokenVault.PAUSER_ROLE();

  await (await tokenVault.grantRole(RELAYER_ROLE_VAULT, RELAYER_ADDRESS)).wait();
  await (await tokenVault.grantRole(PAUSER_ROLE_VAULT, RELAYER_ADDRESS)).wait();
  
  console.log(`   > Vault: Relayer & Pauser Role granted to ${RELAYER_ADDRESS}`);

  console.log("\n🎉 --- DEPLOYMENT SUCCESSFUL ---");
  console.log("----------------------------------------------------");
  console.log(`SAN_PROXY:   ${sanAddr}`);
  console.log(`VAULT_PROXY: ${tokenVaultAddr}`);
  console.log("----------------------------------------------------");
  console.log("⚠️  NEXT STEP: Mint Supply Awal SAN Manual!");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});