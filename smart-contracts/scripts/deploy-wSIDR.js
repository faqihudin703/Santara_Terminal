require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const networkName = hre.network.name;
  const [deployer] = await hre.ethers.getSigners();
  console.log(`🔵 DEPLOYING wSIDR (Non-Upgradeable) ON ${networkName.toUpperCase()}...`);
  console.log("Deployer:", deployer.address);

  // 1. Tentukan Fee Awal (Misal 0.00005 ETH, sekitar Rp 2.000)
  // Fee bridge balik biasanya diset lebih murah dari fee kirim.
  const INITIAL_FEE = hre.ethers.parseEther("0.00005"); 

  // 2. Deploy Contract
  const wSIDRFactory = await hre.ethers.getContractFactory("WrappedSantaraRupiah");
  
  // Masukkan fee ke constructor
  const wSidr = await wSIDRFactory.deploy(INITIAL_FEE);
  
  await wSidr.waitForDeployment();
  const wSidrAddr = await wSidr.getAddress();

  console.log(`✅ wSIDR Deployed at: ${wSidrAddr}`);
  console.log(`💰 Initial Burn Fee: ${hre.ethers.formatEther(INITIAL_FEE)} ETH`);

  // 3. Setup Relayer Role (PENTING!)
  // Ambil address Relayer dari .env
  const RELAYER_ADDRESS = process.env.RELAYER_ADDRESS;
  if (RELAYER_ADDRESS) {
      console.log(`Assigning RELAYER_ROLE to ${RELAYER_ADDRESS}...`);
      const RELAYER_ROLE = ethers.id("RELAYER_ROLE");
      await (await wSidr.grantRole(RELAYER_ROLE, RELAYER_ADDRESS)).wait();
      console.log("✅ Role Granted!");
  } else {
      console.log("⚠️ RELAYER_ADDRESS not found in .env, please grant role manually!");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});