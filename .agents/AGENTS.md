# Workspace Rules for Mem0 Memory Integration

You MUST use Mem0 as your primary long-term memory layer to persist and recall user preferences, project configurations, and context across sessions.

## 1. Startup Memory Retrieval (Proactive Search)
- **Trigger:** At the start of every task or session initialization.
- **Action:** Perform a search query to retrieve relevant historical preferences or context related to the current workspace and task scope.
- **Tooling:** Use `mem0/search_memories` (MCP) if available. Fall back to running the command `mem0 search "<query>"` if MCP tools are not yet active in the current session.

## 2. Dynamic Memory Updating (During/End of Task)
- **Trigger:** Whenever the user shares a new preference, configures a new tool, updates a package, or changes their workflow.
- **Action:** Save or update the preference immediately. Do not wait for the end of the session.
- **Format:** Store memories as concise, actionable facts (e.g., "User prefers pnpm over npm", "Project uses Astro v5 with Tailwind", "User email is user@example.com").
- **Tooling:** Use `mem0/add_memory` (MCP) or fall back to running the command `mem0 add "<fact>"` in the terminal.

## 3. Memory Cleanup & Deduplication
- **Trigger:** When conflicting or outdated information is discovered.
- **Action:** Update or delete the obsolete memories to prevent pollution or contradictions.
- **Tooling:** Use `mem0/update_memory` / `mem0/delete_memory` (MCP) or fall back to `mem0 delete --id <id>`.

# Astro 5 + Keystatic + Cloudflare Pages Build Rules

## 1. Pembersihan Cache Konten (Content Layer Cache)
- **Masalah:** Astro 5 menyimpan basis data cache Content Layer di `node_modules/.astro/data-store.json`. Jika build caching aktif di server (seperti Cloudflare Pages), file cache lama ini dipulihkan dari dependensi. Menghapus data markdown fisik tidak akan membersihkan cache ini secara otomatis, sehingga konten lama yang terhapus masih akan ter-render secara statis saat build.
- **Aturan:** Selalu hapus cache `.astro` dan `node_modules/.astro` sebelum me-run build di platform CI/CD. Script build di `package.json` wajib diubah atau diawali dengan pembersihan cache:
  `"build": "rm -rf .astro node_modules/.astro && astro build ..."`

## 2. Validasi Gambar Relatif Keystatic
- **Masalah:** Schema `image()` Astro 5 mewajibkan path relatif yang valid ke file gambar dari file Markdown/JSON. Tanpa spesifikasi, Keystatic menulis path mentah tanpa folder relatif, yang memicu error validasi gambar Astro saat build.
- **Aturan:** Pada `keystatic.config.ts`, properti `publicPath` pada field `fields.image` wajib diset dengan path relatif yang valid menuju folder publik (misalnya: `../../../public/images/<koleksi>/`).

## 3. Rendering Gambar Defensif di Astro
- **Masalah:** Jika resolusi gambar lokal Astro gagal (akibat path tidak cocok atau cache rusak), Astro akan mengembalikan path sebagai string mentah. Memberikan string path lokal secara langsung ke komponen `<Image>` Astro akan memicu error fatal `LocalImageUsedWrongly`.
- **Aturan:** Di semua halaman Astro, selalu lakukan pengecekan tipe data pada properti gambar koleksi sebelum merendernya dengan komponen `<Image>` Astro:
  `{image && typeof image === "object" ? <Image src={image} ... /> : <FallbackSVG />}`

