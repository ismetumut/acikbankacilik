// Yerel deploy: dist/ klasörünü MonsterASP (IIS) /wwwroot dizinine FTPS ile yükler.
// Kullanım: `npm run deploy` (once `npm run build` çalıştırır, sonra bu script yükler).
//
// FTP kimlik bilgileri .env.deploy dosyasından okunur (git'e girmez). Örnek:
//   FTP_HOST=site80732.siteasp.net
//   FTP_USERNAME=site80732
//   FTP_PASSWORD=********
//
// Ortam değişkeni olarak da verilebilir (CI vb.). .env.deploy önceliklidir.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { Client } from 'basic-ftp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// --- .env.deploy varsa yükle ---
const envPath = resolve(root, '.env.deploy');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const { FTP_HOST, FTP_USERNAME, FTP_PASSWORD } = process.env;
const REMOTE_DIR = process.env.FTP_REMOTE_DIR || '/wwwroot';

if (!FTP_HOST || !FTP_USERNAME || !FTP_PASSWORD) {
  console.error(
    '\n❌ FTP bilgileri eksik.\n' +
      'Proje kökünde .env.deploy dosyası oluştur:\n\n' +
      '  FTP_HOST=site80732.siteasp.net\n' +
      '  FTP_USERNAME=site80732\n' +
      '  FTP_PASSWORD=panelden-aldigin-sifre\n',
  );
  process.exit(1);
}

const distDir = resolve(root, 'dist');
if (!existsSync(resolve(distDir, 'index.html'))) {
  console.error('❌ dist/index.html yok. Önce `npm run build` çalıştır.');
  process.exit(1);
}

const client = new Client(30_000);
client.ftp.verbose = false;

try {
  console.log(`→ Bağlanılıyor: ${FTP_HOST} (FTPS)`);
  await client.access({
    host: FTP_HOST,
    user: FTP_USERNAME,
    password: FTP_PASSWORD,
    secure: true, // açık FTPS
    secureOptions: { rejectUnauthorized: false },
  });
  console.log(`→ Yükleniyor: dist/  →  ${REMOTE_DIR}`);
  await client.ensureDir(REMOTE_DIR);
  // ensureDir hedefe girer; kökten yüklemek için tekrar hedefe konumlan.
  await client.uploadFromDir(distDir, REMOTE_DIR);
  console.log('\n✅ Deploy tamam. https://akort.runasp.net güncellendi.');
} catch (err) {
  console.error('\n❌ Deploy hatası:', err.message);
  process.exitCode = 1;
} finally {
  client.close();
}
