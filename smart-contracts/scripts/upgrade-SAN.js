const { ethers, upgrades } = require("hardhat");

async function main() {
  const proxyAddress = "0x....";

  const SAN = await ethers.getContractFactory("SantaraToken");
  console.log("Upgrading SAN proxy...");

  const upgraded = await upgrades.upgradeProxy(proxyAddress, SAN);
  
  await upgraded.waitForDeployment();
  
  console.log("✅ SAN upgraded");
  console.log("Proxy address:", proxyAddress);
  console.log("New implementation address:", await upgrades.erc1967.getImplementationAddress(proxyAddress));
}

main().catch(console.error);
