import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KostKita - Keuangan Kost Bersama",
    short_name: "KostKita",
    description:
      "Sistem manajemen finansial, pencatatan belanja bersama, dan pelunasan tempat tinggal bersama.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#FAF9F5",
    theme_color: "#2D6A4F",
    orientation: "portrait",
    scope: "/",
    lang: "id",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
    shortcuts: [
      {
        name: "Catat Pengeluaran",
        short_name: "Catat",
        description: "Catat transaksi belanja kost baru",
        url: "/transactions/new",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Matriks Saldo",
        short_name: "Saldo",
        description: "Lihat matriks saldo dan utang-piutang",
        url: "/balances",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Daftar Transaksi",
        short_name: "Transaksi",
        description: "Lihat riwayat transaksi buku kas",
        url: "/transactions",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
    ],
  };
}

