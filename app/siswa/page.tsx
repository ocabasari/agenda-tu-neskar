'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Siswa {
  nis: string
  nama_siswa: string
  kelas: string
}

export default function DataSiswaPage() {
  const [daftarSiswa, setDaftarSiswa] = useState<Siswa[]>([])
  const [loading, setLoading] = useState(true)

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedKelas, setSelectedKelas] = useState('SEMUA')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 15

  useEffect(() => {
    ambilDataSiswa()
  }, [])

  async function ambilDataSiswa() {
    setLoading(true)
    const { data, error } = await supabase
      .from('siswa')
      .select('*')
      .order('nama_siswa', { ascending: true })

    if (data) {
      setDaftarSiswa(data)
    }
    setLoading(false)
  }

  const daftarKelasUnik = Array.from(new Set(daftarSiswa.map(s => s.kelas))).sort()
  
  const filteredSiswa = daftarSiswa.filter(s => {
    const matchSearch = s.nama_siswa.toLowerCase().includes(searchQuery.toLowerCase()) || s.nis.includes(searchQuery)
    const matchKelas = selectedKelas === 'SEMUA' || s.kelas === selectedKelas
    return matchSearch && matchKelas
  })

  const totalItems = filteredSiswa.length
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const currentSiswaPage = filteredSiswa.slice(startIndex, startIndex + itemsPerPage)

  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-slate-100 p-4 sm:p-6 flex flex-col justify-between antialiased">
      
      {/* Header Navigasi */}
      <div className="w-full flex items-center justify-between mb-4">
        <Link 
          href="/" 
          className="group w-11 h-11 bg-slate-800/80 hover:bg-blue-600 border border-slate-700 hover:border-blue-500 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg"
          title="Kembali ke Menu Utama"
        >
          <svg className="w-5 h-5 text-slate-300 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div className="text-right">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">Direktori Data Siswa</h1>
          <p className="text-xs text-slate-400">SMKN 1 Karawang</p>
        </div>
      </div>

      {/* Konten Utama */}
      <div className="w-full flex-1 flex flex-col bg-slate-800/40 border border-slate-700/60 rounded-3xl shadow-2xl p-4 sm:p-6 backdrop-blur-xl space-y-4">
        
        {/* Bar Pencarian & Filter */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-900/60 p-3.5 rounded-2xl border border-slate-700/80">
          <input 
            type="text" 
            placeholder="Cari Nama Siswa atau NIS..." 
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full sm:w-80 p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-xs text-slate-400 font-semibold">Kelas:</span>
            <select 
              value={selectedKelas}
              onChange={(e) => { setSelectedKelas(e.target.value); setCurrentPage(1); }}
              className="p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-white outline-none font-semibold"
            >
              <option value="SEMUA">Semua Kelas ({daftarSiswa.length})</option>
              {daftarKelasUnik.map((kls) => <option key={kls} value={kls}>{kls}</option>)}
            </select>
          </div>
        </div>

        {/* Tabel Data Siswa */}
        <div className="flex-1 overflow-x-auto overflow-y-auto border border-slate-700/80 rounded-2xl max-h-[calc(100vh-280px)] bg-slate-900/40">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-slate-900 text-xs text-slate-400 uppercase tracking-wider border-b border-slate-700 sticky top-0 z-20 shadow-sm">
                <th className="p-3.5">No</th>
                <th className="p-3.5">NIS</th>
                <th className="p-3.5">Nama Lengkap Siswa</th>
                <th className="p-3.5">Kelas</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-800">
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-400">Memuat data siswa...</td></tr>
              ) : currentSiswaPage.length > 0 ? (
                currentSiswaPage.map((s, idx) => (
                  <tr key={s.nis} className="hover:bg-slate-900/50">
                    <td className="p-3.5 text-slate-500 text-xs">{startIndex + idx + 1}</td>
                    <td className="p-3.5 font-mono text-slate-300 text-xs sm:text-sm">{s.nis}</td>
                    <td className="p-3.5 text-white font-medium text-xs sm:text-sm">{s.nama_siswa}</td>
                    <td className="p-3.5 font-semibold text-blue-400 text-xs sm:text-sm">{s.kelas}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={4} className="p-8 text-center text-slate-500 text-sm">Tidak ditemukan data siswa yang sesuai.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginasi Bawah */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 text-xs text-slate-400">
          <span>Menampilkan <strong className="text-white">{currentSiswaPage.length}</strong> dari total <strong className="text-white">{totalItems}</strong> siswa</span>
          {totalPages > 1 && (
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} 
                disabled={currentPage === 1} 
                className="px-3.5 py-1.5 bg-slate-900 border border-slate-700 text-white rounded-xl font-bold disabled:opacity-40 transition"
              >
                ← Sebelumnya
              </button>
              <span className="px-3 py-1.5 text-slate-300 font-semibold">{currentPage} / {totalPages}</span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} 
                disabled={currentPage === totalPages} 
                className="px-3.5 py-1.5 bg-slate-900 border border-slate-700 text-white rounded-xl font-bold disabled:opacity-40 transition"
              >
                Berikutnya →
              </button>
            </div>
          )}
        </div>

      </div>

      <div className="text-center text-xs text-slate-500 py-1">
        © 2026 Tata Usaha • SMKN 1 Karawang
      </div>

    </main>
  )
}