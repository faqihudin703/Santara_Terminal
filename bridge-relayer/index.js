import fs from 'fs';
import { Relayer } from './relayer.js';
import { lisk, chains } from './config.js';

// ==========================================
// 🔍 DOCKER ENV CHECK (DEBUGGING)
// ==========================================
console.log("\n🐳 DOCKER ENV DIAGNOSTICS:");
console.log("-------------------------------------");

function checkEnv(label, value) {
  if (!value) {
    console.error(`❌ ${label}: UNDEFINED / KOSONG! (Cek suntikan Docker)`);
  } else {
    const masked = value.startsWith('http') ? value.substring(0, 25) + "..." : "Invalid Format";
    console.log(`✅ ${label}: ${masked}`);
  }
}

checkEnv("LISK_READ", lisk.read);
checkEnv("LISK_WRITE", lisk.write);
checkEnv("BASE_READ", chains.base.read);
checkEnv("BASE_WRITE", chains.base.write);
checkEnv("SEPOLIA_READ", chains.sepolia.read);
checkEnv("SEPOLIA_WRITE", chains.sepolia.write);
console.log("-------------------------------------\n");

if (!lisk.read || !chains.base.read || !chains.sepolia.read) {
  console.error("🔥 FATAL ERROR: Salah satu RPC URL hilang. Stop process.");
  process.exit(1);
}

const LOCK_FILE = './relayer.lock';

// ==========================================
// 🔐 SINGLE INSTANCE RECOVERY LOGIC
// ==========================================
if (fs.existsSync(LOCK_FILE)) {
  console.error(`⚠️ Lock file ditemukan → memeriksa proses lama...`);
  try {
    const oldPid = parseInt(fs.readFileSync(LOCK_FILE, "utf8"));

    if (!isNaN(oldPid)) {
      try {
        process.kill(oldPid, 0);
        console.log(`🧠 Proses lama (PID ${oldPid}) masih hidup → menghentikannya...`);
        process.kill(oldPid, "SIGTERM");
        await new Promise(res => setTimeout(res, 1500));
        process.kill(oldPid, "SIGKILL");
        console.log(`✅ Proses lama berhasil dimatikan.`);
      } catch {
        console.log(`⚠️ PID ${oldPid} sudah tidak aktif → hanya hapus lock.`);
      }
    }
  } catch (e) {
    console.error("⚠️ Gagal membaca PID lama, menghapus lock file paksa...");
  }

  fs.unlinkSync(LOCK_FILE);
  console.log("🔓 Lock file lama dihapus, melanjutkan start relayer.\n");
}

// Buat lock baru
fs.writeFileSync(LOCK_FILE, process.pid.toString());
console.log(`🔒 Lock file baru dibuat (PID: ${process.pid})`);

const r = new Relayer();

// ==========================================
// 🧹 CLEANUP HANDLER
// ==========================================
const cleanup = () => {
  console.log("\n🧹 Cleanup dipanggil...");
  try {
    if (fs.existsSync(LOCK_FILE)) {
      fs.unlinkSync(LOCK_FILE);
      console.log("🔓 Lock file dihapus saat exit.");
    }
  } catch {}
  process.exit(0);
};

// ==========================================
// 🚀 START RELAYER
// ==========================================
r.start().catch(err => {
  console.error("🔥 Fatal Error:", err);
  cleanup();
});

// Handle exit signals
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("uncaughtException", err => {
  console.error("💥 Uncaught:", err);
  cleanup();
});
