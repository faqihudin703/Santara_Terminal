require("dotenv").config();
const { ethers, upgrades } = require("hardhat");

// !!! GANTI INI DENGAN ALAMAT TOKEN wSAN YANG SUDAH DIDEPLOY !!!
const WRAPPED_SANTARA_TOKEN_ADDRESS_BASE = "0x1024B926a7d89E4C346f1bF4b091FC62617924D9";
const WRAPPED_SANTARA_TOKEN_ADDRESS_SEPOLIA = "0xFf8558e1be4EC0DD6b1DA2E22C382630609FD68c";

async function main() {
  const networkName = hre.network.name;
  console.log(`🔵 DEPLOYING WRAPPED SANTARA DEX (AMM) ON ${networkName.toUpperCase()}...`);
  const [deployer] = await ethers.getSigners();
  console.log("Admin:", deployer.address);
  
  let WRAPPED_SANTARA_TOKEN_ADDRESS;
  if (networkName === 'base') {
      WRAPPED_SANTARA_TOKEN_ADDRESS = WRAPPED_SANTARA_TOKEN_ADDRESS_BASE;
  } else if (networkName === 'sepolia') {
      WRAPPED_SANTARA_TOKEN_ADDRESS = WRAPPED_SANTARA_TOKEN_ADDRESS_SEPOLIA;
  } else {
      console.error("❌ Network tidak dikenali, harap set address manual di script.");
      return;
  }

  const WrappedSantaraDEX = await ethers.getContractFactory("WrappedSantaraDEX");

  // Config Fee: 0.3% (Standard Uniswap V2)
  // Numerator: 3, Denominator: 1000
  const feeNum = 3;
  const feeDen = 1000;

  const dex = await upgrades.deployProxy(
    WrappedSantaraDEX,
    [
      WRAPPED_SANTARA_TOKEN_ADDRESS, // Token wSAN
      deployer.address,      // Admin
      feeNum,                // Fee Numerator
      feeDen                 // Fee Denominator
    ],
    { initializer: 'initialize' }
  );

  await dex.waitForDeployment();
  const dexAddress = await dex.getAddress();

  console.log(`✅ WrappedSantaraDEX Deployed at: ${dexAddress}`);
  console.log(`ℹ️  Fee set to: ${feeNum}/${feeDen} (0.3%)`);
  
  // Optional: Verify Code
  console.log("⚠️  Jangan lupa Add Liquidity pertama kali agar DEX bisa jalan!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});