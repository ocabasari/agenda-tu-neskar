'use client'
import Link from 'next/link'

export default function DashboardUtama() {
  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-slate-100 flex flex-col justify-between p-6 sm:p-12 antialiased">
      
      {/* Header Bagian Atas dengan Logo Lokal */}
      <div className="w-full max-w-6xl mx-auto pt-6 sm:pt-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2.5 bg-slate-800/60 border border-slate-700/80 px-3.5 py-2 rounded-2xl backdrop-blur-md shadow-lg">
            <img 
              src="/logo-smkn1.png" 
              alt="Logo SMKN 1 Karawang" 
              className="w-7 h-7 object-contain"
            />
            <span className="text-xs font-bold tracking-wider uppercase text-blue-400">
              SMKN 1 Karawang
            </span>
          </div>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-3">
          Monitoring Buku Agenda
        </h1>
        <p className="text-sm sm:text-base text-slate-400 max-w-xl">
          Sistem monitoring dan pencatatan peminjaman buku agenda kelas
        </p>
      </div>

      {/* Menu Tombol Utama */}
      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 my-auto py-8">
        
        {/* Tombol Pengambilan / Peminjaman Buku */}
        <Link 
          href="/pinjam"
          className="group relative bg-slate-800/60 hover:bg-blue-600/20 border border-slate-700/60 hover:border-blue-500/50 p-8 rounded-3xl transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1 flex flex-col items-start justify-between gap-10 backdrop-blur-md"
        >
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center text-xl font-bold group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300">
            📥
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">
              Pengambilan Buku
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Form khusus siswa untuk meminjam buku agenda kelas.
            </p>
          </div>
        </Link>

        {/* Tombol Pengembalian Buku */}
        <Link 
          href="/kembali"
          className="group relative bg-slate-800/60 hover:bg-emerald-600/20 border border-slate-700/60 hover:border-emerald-500/50 p-8 rounded-3xl transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1 flex flex-col items-start justify-between gap-10 backdrop-blur-md"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xl font-bold group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
            📤
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors">
              Pengembalian Buku
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Form pengembalian buku agenda ke meja piket TU.
            </p>
          </div>
        </Link>

        {/* Tombol Panel Admin TU */}
        <Link 
          href="/admin"
          className="group relative bg-slate-800/60 hover:bg-purple-600/20 border border-slate-700/60 hover:border-purple-500/50 p-8 rounded-3xl transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1 flex flex-col items-start justify-between gap-10 backdrop-blur-md"
        >
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center text-xl font-bold group-hover:scale-110 group-hover:bg-purple-500 group-hover:text-white transition-all duration-300">
            🔒
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-1 group-hover:text-purple-400 transition-colors">
              Panel Admin TU
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Monitoring transaksi, database siswa, dan import Excel.
            </p>
          </div>
        </Link>

      </div>

      {/* Footer Bawah */}
      <div className="w-full max-w-6xl mx-auto text-center border-t border-slate-800 pt-6 pb-2 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>© 2026 Tata Usaha • SMKN 1 Karawang</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> 
          Supabase Connected
        </span>
      </div>

    </main>
  )
}