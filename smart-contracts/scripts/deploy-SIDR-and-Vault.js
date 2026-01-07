require("dotenv").config(); // <--- Penting agar bisa baca .env
const hre = require("hardhat");

async function main() {
  // 0. Cek Address Relayer
  const RELAYER_ADDRESS = process.env.RELAYER_ADDRESS;
  if (!RELAYER_ADDRESS) {
    throw new Error("❌ Error: RELAYER_ADDRESS belum di-set di file .env");
  }

  const [deployer] = await hre.ethers.getSigners();
  console.log("🔵 DEPLOYING SANTARA RUPIAH SYSTEM (Non-Upgradeable)...");
  console.log("Deployer:", deployer.address);
  console.log("Target Relayer:", RELAYER_ADDRESS);

  // ----------------------------------------------------
  // 1. Deploy Token SIDR
  // ----------------------------------------------------
  console.log("\n[1/3] Deploying SantaraRupiah (SIDR)...");
  const SIDR = await hre.ethers.getContractFactory("SantaraRupiah");
  const sidr = await SIDR.deploy(); 
  await sidr.waitForDeployment();
  const sidrAddress = await sidr.getAddress();
  console.log("✅ Santara Rupiah (SIDR) Deployed at:", sidrAddress);

  // ----------------------------------------------------
  // 2. Deploy Vault (Perlu alamat SIDR + Fee Awal)
  // ----------------------------------------------------
  console.log("\n[2/3] Deploying SantaraVault...");
  const initialFee = hre.ethers.parseEther("0.0001"); // Fee misal 0.0001 ETH
  
  const Vault = await hre.ethers.getContractFactory("SantaraVault");
  const vault = await Vault.deploy(sidrAddress, initialFee);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("✅ Santara Vault Deployed at:", vaultAddress);

  // ----------------------------------------------------
  // 3. Grant RELAYER_ROLE ke Server Backend (PENTING!)
  // ----------------------------------------------------
  console.log("\n[3/3] Granting RELAYER_ROLE...");
  
  const RELAYER_ROLE = await vault.RELAYER_ROLE();
  
  // Cek apakah deployer sama dengan relayer? Kalau beda, baru grant.
  if (deployer.address.toLowerCase() !== RELAYER_ADDRESS.toLowerCase()) {
      const tx = await vault.grantRole(RELAYER_ROLE, RELAYER_ADDRESS);
      await tx.wait();
      console.log(`✅ Role RELAYER_ROLE berhasil diberikan ke: ${RELAYER_ADDRESS}`);
  } else {
      console.log("⚠️  Deployer adalah Relayer, role sudah otomatis diberikan.");
  }

  // ----------------------------------------------------
  // Summary
  // ----------------------------------------------------
  console.log("\n=============================================");
  console.log("🎉 DEPLOYMENT COMPLETE (LISK SEPOLIA)");
  console.log("---------------------------------------------");
  console.log("Token (SIDR):", sidrAddress);
  console.log("Vault       :", vaultAddress);
  console.log("Relayer     :", RELAYER_ADDRESS);
  console.log("=============================================");
  console.log("👉 NEXT STEP: Masukkan address ini ke config Backend Relayer!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});