# Order Email Web

Website sederhana untuk order email lewat REST API `https://api.mtc.biz.id`.

**Multi-user:** setiap user memasukkan **API Key-nya sendiri** di halaman web. Key
disimpan hanya di browser user itu (localStorage) dan dikirim per-request lewat
header `X-Api-Key`. Server **tidak menyimpan** key siapa pun — hanya meneruskan ke API.

## Cara menjalankan

1. Pastikan sudah install **Node.js** (versi 14 atau lebih baru).
2. Buka terminal di folder ini, lalu jalankan (tidak perlu `npm install` — tanpa dependensi):

   ```bash
   node server.js
   ```

3. Buka browser ke **http://localhost:3000**, tempel API Key, lalu order.

## Fitur

- Kolom **API Key** (ada tombol lihat/sembunyikan, tersimpan otomatis di browser).
- Pilihan **Website** (default `digitalocean.com`) + opsi "Lainnya…".
- Pilihan **Domain** (default `gmail.com`) + opsi "Lainnya…".
- **Quantity** dengan tombol `−` / `+` (minimal 1).
- Menampilkan **saldo** akun & hasil order (respons JSON dari API).

## Konfigurasi (`.env`, opsional)

```
API_BASE=https://api.mtc.biz.id
PORT=3000
```

> API Key tidak diletakkan di `.env` — dimasukkan tiap user di web.

## Deploy ke Render

1. Push folder ini ke GitHub (file `.env` otomatis di-skip lewat `.gitignore`).
2. Render → **New + → Web Service** (atau **Blueprint** kalau pakai `render.yaml`).
3. Start Command: `node server.js`. Build Command: kosong.
4. Selesai — tiap user tinggal buka URL-nya dan masukkan API Key masing-masing.

## Endpoint API yang dipakai (via backend proxy)

| Frontend                  | Diteruskan ke API           | Keterangan          |
|---------------------------|-----------------------------|---------------------|
| `POST /api/order`         | `POST /order_email`         | Order email         |
| `GET  /api/profile`       | `GET  /my_profile`          | Info akun & saldo   |
| `GET  /api/price`         | `GET  /price`               | Daftar harga        |
| `GET  /api/messages/:id?` | `GET  /email_messages/:id?` | Isi email           |
| `GET  /api/health`        | `GET  /health`              | Cek status (no key) |

> Order butuh koneksi ke `api.mtc.biz.id` dan saldo yang cukup di akun user.
