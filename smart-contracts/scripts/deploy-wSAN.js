require("dotenv").config();
const hre = require("hardhat");
const { ethers, upgrades } = hre;

const RELAYER_ADDRESS = process.env.RELAYER_ADDRESS;

async function main() {
  if (!RELAYER_ADDRESS) throw new Error("❌ RELAYER_ADDRESS belum di-set di .env");

  const [deployer] = await ethers.getSigners();
  console.log("DEPLOYING WRAPPED SANTARA (wSAN)...");
  console.log("Deployer:", deployer.address);
  console.log("Relayer Target:", RELAYER_ADDRESS);

  // --------------------------------------------------------
  // 1. Deploy WrappedSantaraToken (Upgradeable)
  // --------------------------------------------------------
  console.log("\n[1/4] Deploying WrappedSantaraToken (Transparent Proxy)...");

  const initialfee = ethers.parseEther("0.0001");
  
  const WrappedSantaraToken = await ethers.getContractFactory("WrappedSantaraToken");
  
  const wSan = await upgrades.deployProxy(
    WrappedSantaraToken,
    [
        "Wrapped Lisk Santara Token", // Nama Token
        "wSAN",                       // Simbol
        deployer.address,              // Admin awal
        initialfee
    ],
    { initializer: "initialize" }
  );

  await wSan.waitForDeployment();

  const wSanAddress = await wSan.getAddress();
  console.log("✅ wSAN Proxy deployed at:", wSanAddress);
  
  // Optional: Cek alamat implementasi (buat debug)
  const implementation = await upgrades.erc1967.getImplementationAddress(wSanAddress);
  console.log("   Implementation:", implementation);

  // --------------------------------------------------------
  // 2. Grant RELAYER_ROLE (Penting buat Bridge)
  // --------------------------------------------------------
  console.log("\n[2/4] Assign RELAYER_ROLE → Relayer...");

  // Ambil hash role dari kontrak
  const RELAYER_ROLE = await wSan.RELAYER_ROLE();
  
  const tx1 = await wSan.grantRole(RELAYER_ROLE, RELAYER_ADDRESS);
  await tx1.wait();

  console.log("✅ RELAYER_ROLE granted to:", RELAYER_ADDRESS);

  // --------------------------------------------------------
  // 3. Grant PAUSER_ROLE (Admin & Relayer)
  // --------------------------------------------------------
  console.log("\n[3/4] Assign PAUSER_ROLE...");

  const PAUSER_ROLE = await wSan.PAUSER_ROLE();

  // Admin (Deployer) biasanya otomatis dapet di initialize, tapi kita pastikan relayer juga dapat
  const tx2 = await wSan.grantRole(PAUSER_ROLE, RELAYER_ADDRESS);
  await tx2.wait();

  console.log("✅ PAUSER_ROLE granted to Relayer");

  // --------------------------------------------------------
  // 4. Verifikasi Akhir
  // --------------------------------------------------------
  console.log("\n[4/4] Deployment Summary");
  console.log("-----------------------------------------");
  console.log("Network:", hre.network.name);
  console.log("Token Name:", "Wrapped Lisk Santara Token");
  console.log("Token Symbol:", "wSAN");
  console.log("Contract Address:", wSanAddress);
  console.log("-----------------------------------------");
  console.log("⚠️  NEXT STEP: Masukkan address ini ke config Relayer & Frontend!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});