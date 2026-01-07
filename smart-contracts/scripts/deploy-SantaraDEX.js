require("dotenv").config();
const { ethers, upgrades } = require("hardhat");

// !!! GANTI INI DENGAN ALAMAT TOKEN SAN YANG SUDAH DIDEPLOY !!!
const SANTARA_TOKEN_ADDRESS = "0x....";

async function main() {
  console.log("🔵 DEPLOYING SANTARA DEX (AMM)...");
  const [deployer] = await ethers.getSigners();
  console.log("Admin:", deployer.address);

  const SantaraDEX = await ethers.getContractFactory("SantaraDEX");

  // Config Fee: 0.3% (Standard Uniswap V2)
  // Numerator: 3, Denominator: 1000
  const feeNum = 3;
  const feeDen = 1000;

  const dex = await upgrades.deployProxy(
    SantaraDEX,
    [
      SANTARA_TOKEN_ADDRESS, // Token SAN
      deployer.address,      // Admin
      feeNum,                // Fee Numerator
      feeDen                 // Fee Denominator
    ],
    { initializer: 'initialize' }
  );

  await dex.waitForDeployment();
  const dexAddress = await dex.getAddress();

  console.log(`✅ SantaraDEX Deployed at: ${dexAddress}`);
  console.log(`ℹ️  Fee set to: ${feeNum}/${feeDen} (0.3%)`);
  
  // Optional: Verify Code
  console.log("⚠️  Jangan lupa Add Liquidity pertama kali agar DEX bisa jalan!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});