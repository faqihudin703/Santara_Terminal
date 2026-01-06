require("dotenv").config();
const { ethers, upgrades } = require("hardhat");

// Masukkan alamat Proxy yang SUDAH LIVE di sini
// Ganti sesuai network saat menjalankan command
const PROXY_ADDRESS_BASE = "0x...."; 
const PROXY_ADDRESS_SEPOLIA = "0x....";

async function main() {
  const networkName = hre.network.name;
  console.log(`🔵 UPGRADING WrappedSantaraToken ON ${networkName.toUpperCase()}...`);
  
  const [deployer] = await ethers.getSigners();
  console.log("Admin:", deployer.address);

  // Tentukan Proxy Address berdasarkan network
  let proxyAddress;
  if (networkName === 'base') {
      proxyAddress = PROXY_ADDRESS_BASE;
  } else if (networkName === 'sepolia') {
      proxyAddress = PROXY_ADDRESS_SEPOLIA;
  } else {
      console.error("❌ Network tidak dikenali, harap set address manual di script.");
      return;
  }
  
  console.log("Target Proxy:", proxyAddress);

  // 1. Ambil Factory V2
  const WrappedSantaraTokenV3 = await ethers.getContractFactory("WrappedSantaraToken");

  // 2. Upgrade + Call InitializeV3
  console.log("Upgrading implementation");
  
  const upgraded = await upgrades.upgradeProxy(proxyAddress, WrappedSantaraTokenV3, {
    call: {
      fn: "initializeV3",
      args: []
    },
  });

  await upgraded.waitForDeployment();

  console.log("✅ Upgrade Successful!");
  console.log("   New Implementation Active.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});