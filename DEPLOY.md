# Akort — Deploy

Akort iki parçadan oluşur: **statik frontend** (Netlify) ve **API backend** (herhangi bir Node host). İkisi birbirinden bağımsız çalışır.

## 1. Frontend (Netlify) — otomatik

`main` dalına her push, Netlify'da yeniden yayını tetikler. `VITE_API_URL` tanımlı **olmadığı** için canlı site yerleşik demo veri sağlayıcısıyla çalışır (giriş gerektirmez). Yapılacak bir şey yok.

## 2. Backend (API) — Render ile tek tık

1. [render.com](https://render.com) → **New → Blueprint** → bu repoyu seçin (`render.yaml` otomatik okunur).
2. `SEED_PASSWORD` değerini panelde girin; `JWT_SECRET` otomatik üretilir.
3. Deploy bitince API adresiniz olur, örn. `https://akort-api.onrender.com`. `…/health` ile doğrulayın.

> Docker tercih ederseniz `Dockerfile` da hazır (Railway, Fly.io, kendi sunucunuz).
> SQLite verisinin dağıtımlar arası kalıcı olması için `render.yaml`'daki `disk` bloğu (ücretli plan) gerekir; kalıcı üretimde Postgres'e geçmek önerilir.

## 3. Frontend'i canlı backend'e bağlamak (opsiyonel)

Canlı sitenin demo yerine **gerçek backend'i** kullanmasını isterseniz:

1. Netlify → Site settings → Environment variables → **`VITE_API_URL`** = backend adresiniz (örn. `https://akort-api.onrender.com/api`).
2. Backend'de CORS zaten açık; farklı origin'e izin verir.
3. Netlify'da yeniden deploy edin. Artık site giriş ekranıyla açılır ve tüm veri API'den gelir.

## Ortam değişkenleri

| Değişken | Parça | Açıklama |
| --- | --- | --- |
| `JWT_SECRET` | backend | Güçlü, gizli değer (Render otomatik üretir) |
| `SEED_PASSWORD` | backend | İlk kullanıcıların şifresi |
| `DATABASE_PATH` | backend | SQLite yolu (kalıcı disk için `/data/akort.db`) |
| `VITE_API_URL` | frontend | Ayarlıysa gerçek backend, değilse demo modu |
