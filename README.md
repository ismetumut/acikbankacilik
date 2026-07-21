# Akort — Açık Bankacılık paneli

Türkiye'deki KOBİ'ler ve muhasebe ofisleri için çoklu banka Açık Bankacılık paneli: hesap/işlem görünümü, ödeme tetikleme, tahsilat linkleri, AI destekli mutabakat, nakit akışı tahmini, rıza/izin yönetimi ve muhasebeci çok-müşteri paneli.

Uygulama artık **gerçek bir backend + kalıcı veritabanı + JWT kimlik doğrulama** ile çalışır. Backend yapılandırılmadığında (örn. statik demo yayını) uygulama otomatik olarak yerleşik demo veri sağlayıcısına düşer — yani ürün sıfır backend ile de çalışmaya devam eder.

## Teknoloji

**Frontend**

- React 19 + TypeScript + Vite
- Tailwind CSS v4 · React Router v7 · Recharts

**Backend** (`server/`)

- Node + Express (TypeScript, `tsx` ile çalışır)
- SQLite kalıcılık (`better-sqlite3`) — `DATABASE_PATH` ile Postgres'e taşınabilir
- JWT + bcrypt kimlik doğrulama

## Geliştirme

```bash
npm install

# 1) API'yi başlat  → http://localhost:8787  (ilk açılışta veritabanını seed eder)
npm run server

# 2) Ayrı bir terminalde frontend  → http://localhost:5173
npm run dev

# ya da ikisini birden:
npm run dev:all

npm run build     # tip kontrolü + production build -> dist/
```

**Demo giriş:** `demo@akort.app` · şifre `akort2026` (seed sırasında oluşturulur; `SEED_PASSWORD` ile değiştirilebilir).

Frontend, dev modunda `.env.development` içindeki `VITE_API_URL=/api` sayesinde API'ye bağlanır; Vite `/api`'yi `localhost:8787`'e proxy'ler. Production build'i (`vite build`) bu dosyayı yüklemez, dolayısıyla `VITE_API_URL` tanımsız kalır ve uygulama demo sağlayıcısına düşer.

## Mimari

- `src/pages/*` — her biri bir sidebar sekmesine karşılık gelen sayfalar + `Login`.
- `src/components/layout/*` — sidebar, header, sayfa iskeleti.
- `src/components/ui/*` — paylaşılan tasarım sistemi bileşenleri.
- `src/lib/types.ts` — domain tipleri.
- `src/lib/mockData.ts` — gerçekçi, deterministik veri seti (683 işlem, 4 banka, 6 hesap…). Hem demo sağlayıcısını besler hem de backend'in ilk seed'ini oluşturur. `DEMO_NOW` sabit bir "bugün" tarihi tanımlar; tüm göreli zaman etiketleri buna göre hesaplanır.
- `src/banking/provider.ts` — **`BankingProvider` arayüzü**: uygulamanın ihtiyaç duyduğu tüm veri operasyonları.
- `src/banking/mockProvider.ts` — bellekte çalışan demo implementasyonu (backend yokken kullanılır).
- `src/banking/httpProvider.ts` — **gerçek backend implementasyonu**: her metot `server/`'daki bir REST uç noktasına gider, Bearer token ekler.
- `src/banking/context.tsx` — `VITE_API_URL` varsa `httpProvider`, yoksa `mockProvider` seçer.
- `src/lib/api.ts` — token yönetimi + `fetch` sarmalayıcısı (401'de otomatik çıkış).
- `src/auth/context.tsx` + `src/pages/Login.tsx` — kimlik doğrulama durumu ve giriş ekranı. `main.tsx`'teki `AuthGate` backend aktifken uygulamayı giriş arkasına alır.

### Backend (`server/`)

- `server/src/index.ts` — Express uygulaması; boot'ta seed çalıştırır.
- `server/src/db.ts` — SQLite bağlantısı; `users` tablosu + koleksiyonların JSON belge deposu (`kv`).
- `server/src/seed.ts` — `mockData`'yı veritabanına aktarır (idempotent — mevcut veriyi bozmaz, mutasyonlar yeniden başlatmalar arasında kalıcıdır).
- `server/src/auth.ts` — JWT imzalama/doğrulama, bcrypt, `requireAuth` ara katmanı.
- `server/src/routes.ts` — `BankingProvider`'ın her metodunu karşılayan REST uç noktaları.

Veritabanı `server/akort.db` dosyasında tutulur (git'te yok). Sıfırdan seed için bu dosyayı silin.

## Gerçek banka entegrasyonu — nasıl bağlanır

Mimari **sağlayıcıdan bağımsızdır**; frontend hiçbir zaman doğrudan bir bankaya bağlanmaz, yalnızca `BankingProvider` arayüzünü (canlıda `httpProvider` üzerinden backend'i) çağırır. Lisanslı bir Açık Bankacılık sağlayıcısına (AIS/PIS) geçmek için:

1. `server/src/routes.ts` içindeki ilgili uç noktaların gövdesini, koleksiyon deposu yerine sağlayıcının gerçek API'sine (hesap bilgisi / ödeme başlatma) yapılan çağrılarla değiştirin.
2. **Güvenlik:** Gerçek erişim token'ları, client secret'lar ve TCMB rıza/onay akışının hassas adımları yalnızca backend'de çalışır; hiçbir sır tarayıcıya gitmez. Bu ayrım zaten mevcut — frontend sadece kendi backend'inizi çağırır.
3. Frontend'de, sayfalarda veya `httpProvider`'da **hiçbir değişiklik gerekmez.**

Bu depo şu anda canlı bir bankaya bağlı değildir; veriler `mockData.ts` kaynaklı seed verisidir.

## Deploy

- **Frontend (Netlify):** `npm run build` → `dist/`. `netlify.toml` build komutunu, çıktı klasörünü ve SPA yönlendirmesini tanımlar. Production build'i API'siz demo modunda çalışır.
- **Full-stack:** Backend'i bir Node ortamında (`npm run server:start`) çalıştırın, kalıcı bir disk ya da Postgres bağlayın (`DATABASE_PATH`), `JWT_SECRET` ve `SEED_PASSWORD`'ü ayarlayın, ve frontend'i `VITE_API_URL` backend adresinizi gösterecek şekilde build edin.

### Ortam değişkenleri

| Değişken | Nerede | Varsayılan | Açıklama |
| --- | --- | --- | --- |
| `PORT` | backend | `8787` | API portu |
| `JWT_SECRET` | backend | dev sabiti | **Production'da mutlaka ayarlayın** |
| `SEED_PASSWORD` | backend | `akort2026` | İlk kullanıcıların şifresi |
| `DATABASE_PATH` | backend | `server/akort.db` | SQLite dosya yolu |
| `VITE_API_URL` | frontend | (yok) | Ayarlıysa gerçek backend, değilse demo modu |
