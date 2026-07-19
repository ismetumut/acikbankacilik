# Akort — Açık Bankacılık paneli

Türkiye'deki KOBİ'ler ve muhasebe ofisleri için çoklu banka Açık Bankacılık paneli: hesap/işlem görünümü, ödeme tetikleme, tahsilat linkleri, AI destekli mutabakat, nakit akışı tahmini, rıza/izin yönetimi ve muhasebeci çok-müşteri paneli.

## Teknoloji

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- React Router v7
- Recharts

## Geliştirme

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # tip kontrolü + production build -> dist/
```

## Mimari

- `src/pages/*` — her biri bir sidebar sekmesine karşılık gelen 13 sayfa.
- `src/components/layout/*` — sidebar, header, sayfa iskeleti.
- `src/components/ui/*` — paylaşılan tasarım sistemi bileşenleri (Card, Badge, Button, Money, Toggle, ProgressBar, Pagination…).
- `src/lib/types.ts` — domain tipleri (Account, Transaction, ConsentGrant, ReconciliationException…).
- `src/lib/mockData.ts` — gerçekçi, deterministik demo veri seti (683 işlem, 4 banka, 6 hesap, 6 muhasebeci müşterisi…). `DEMO_NOW` sabit bir "bugün" tarihi tanımlar; tüm göreli zaman etiketleri (`2 dk önce`, rıza geri sayımı vb.) gerçek saat yerine buna göre hesaplanır, böylece demo hangi tarihte açılırsa açılsın tutarlı kalır.
- `src/banking/provider.ts` — **`BankingProvider` arayüzü**: gerçek bir Açık Bankacılık entegrasyonunun sağlaması gereken tüm operasyonlar (hesaplar, işlemler, ödeme tetikleme, mutabakat, rıza yönetimi…) burada tanımlı.
- `src/banking/mockProvider.ts` — `BankingProvider`'ın mock/demo implementasyonu; tüm state bellekte tutulur (sayfa yenilenince sıfırlanır).
- `src/banking/context.tsx` — aktif provider'ı React Context ile uygulamaya enjekte eder. **Gerçek entegrasyona geçiş buradan yapılır.**

## Gerçek banka entegrasyonu — nasıl bağlanır

Bu proje **sağlayıcıdan bağımsız** bir adapter mimarisiyle kuruldu; frontend hiçbir zaman doğrudan bir bankaya veya Açık Bankacılık sağlayıcısına bağlanmaz, sadece `BankingProvider` arayüzünü çağırır. Gerçek bir sağlayıcıya geçmek için:

1. `src/banking/provider.ts`'deki `BankingProvider` arayüzünü sağlayıcınızın gerçek API'sine karşı implemente eden bir `LiveBankingProvider` sınıfı yazın (Fibabanka APIX, Param, Salt Edge, doğrudan banka API'si vb.).
2. **Önemli — güvenlik:** Gerçek erişim token'ları, client secret'lar ve TCMB Açık Bankacılık rıza/onay akışının sunucu tarafı adımları **asla tarayıcıda çalışmamalı**. `LiveBankingProvider`, bu sırları tutan bir backend'e (örn. Netlify Functions + bir veritabanı) HTTP çağrıları yapmalı; frontend sadece o backend'i çağırır.
3. `src/banking/context.tsx` içinde `activeProvider` değişkenini `mockBankingProvider` yerine `LiveBankingProvider`'ın bir örneğiyle değiştirin. Sayfalarda **hiçbir değişiklik gerekmez.**

Bu depo şu anda bir sağlayıcıya bağlı değildir; tüm veriler `mockData.ts`'teki gerçekçi demo verisidir.

## Netlify'a deploy

```bash
npm run build
```

`netlify.toml` build komutunu, `dist/` çıktısını ve SPA route'ları için gereken `/* -> /index.html` yönlendirmesini tanımlar. Netlify'da yeni bir site oluşturup bu repoyu bağlamanız veya `netlify deploy` CLI'ını kullanmanız yeterli.
