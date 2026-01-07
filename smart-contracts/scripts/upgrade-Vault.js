require("dotenv").config();
const { ethers, upgrades } = require("hardhat");

const PROXY_ADDRESS = "0x....";

async function main() {
  console.log("🔵 UPGRADING VAULT TO V2 (ADDING FEES)...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Admin:", deployer.address);

  // 1. Ambil Contract Factory kode baru
  // Pastikan nama file/contract sama, atau kalau beda sesuaikan string-nya
  const LiskSantaraVaultV2 = await ethers.getContractFactory("LiskSantaraVault");

  // 2 Lakukan Upgrade 
  console.log("Upgrading implementation");
  
  const vaultV2 = await upgrades.upgradeProxy(PROXY_ADDRESS, LiskSantaraVaultV2);

  await vaultV2.waitForDeployment();

  console.log("✅ Vault Upgraded Successfully!");
  console.log("   Address (Tetap):", await vaultV2.getAddress());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});