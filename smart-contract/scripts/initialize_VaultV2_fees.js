const { ethers } = require("hardhat");

async function main() {
  const PROXY_ADDRESS = "0x....";

  const TokenVault = await ethers.getContractFactory("LiskSantaraVault");
  const vault = TokenVault.attach(PROXY_ADDRESS);

  await vault.setBridgeFee(ethers.parseEther("0.0005"));

  const currentFee = await vault.bridgeFee();
  console.log("   Current Fee:", ethers.formatEther(currentFee), "ETH");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
