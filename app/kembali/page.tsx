'use client'
import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface TransaksiAktif {
  id: number
  nis: string
  created_at: string
  nama_petugas: string
  status: string
  pengembali_nis?: string
  siswa?: {
    nis: string
    nama_siswa: string
    kelas: string
  }
}

export default function FormKembali() {
  const [nisInput, setNisInput] = useState('')
  const [peminjamanAktif, setPeminjamanAktif] = useState<TransaksiAktif | null>(null)
  const [infoPengembali, setInfoPengembali] = useState<{ nis: string; nama_siswa: string; kelas: string } | null>(null)
  const [infoPeminjamAwal, setInfoPeminjamAwal] = useState<{ nama_siswa: string; nis: string } | null>(null)
  const [infoPengembaliTerakhir, setInfoPengembaliTerakhir] = useState<{ nama_siswa: string; nis: string } | null>(null)
  const [pesanError, setPesanError] = useState('')
  const [pesanSukses, setPesanSukses] = useState('')
  const [loading, setLoading] = useState(false)

  // Tanda Tangan Canvas State
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSigned, setHasSigned] = useState(false)

  // Kamera Foto Bukti Pengembalian State
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null)
  const [cameraActive, setCameraActive] = useState(false)

  const handleCariPeminjaman = async (nis: string) => {
    setNisInput(nis)
    setPesanError('')
    setPesanSukses('')
    setPeminjamanAktif(null)
    setInfoPengembali(null)
    setInfoPeminjamAwal(null)
    setInfoPengembaliTerakhir(null)

    if (nis.length === 8) {
      setLoading(true)
      // 1. Cari data siswa pengembali berdasarkan NIS
      const { data: siswaData, error: siswaErr } = await supabase
        .from('siswa')
        .select('nis, nama_siswa, kelas')
        .eq('nis', nis)
        .single()

      if (siswaErr || !siswaData) {
        setPesanError('❌ NIS siswa pengembali tidak ditemukan di database!')
        setLoading(false)
        return
      }

      setInfoPengembali(siswaData)

      // 2. Cari transaksi aktif dengan status 'DIPINJAM' di database
      const { data: transaksiData, error: transErr } = await supabase
        .from('transaksi_agenda')
        .select(`
          id,
          nis,
          created_at,
          nama_petugas,
          status,
          pengembali_nis,
          siswa:nis (
            nis,
            nama_siswa,
            kelas
          )
        `)
        .ilike('status', 'DIPINJAM')

      setLoading(false)

      if (transErr || !transaksiData) {
        setPesanError('Gagal memeriksa data transaksi.')
        return
      }

      const ditemukan = transaksiData.find((t: any) => {
        const sData = Array.isArray(t.siswa) ? t.siswa[0] : t.siswa
        return sData && sData.kelas.toLowerCase() === siswaData.kelas.toLowerCase()
      })

      if (!ditemukan) {
        setPesanError(`⚠️ Kelas ${siswaData.kelas} tidak memiliki catatan buku agenda yang sedang DIPINJAM.`)
        return
      }

      const formattedTransaksi: TransaksiAktif = {
        ...ditemukan,
        siswa: Array.isArray(ditemukan.siswa) ? ditemukan.siswa[0] : ditemukan.siswa
      }

      if (formattedTransaksi.siswa) {
        setInfoPeminjamAwal({
          nama_siswa: formattedTransaksi.siswa.nama_siswa,
          nis: formattedTransaksi.nis
        })
      }

      if (formattedTransaksi.pengembali_nis) {
        const { data: dataLastPengembali } = await supabase
          .from('siswa')
          .select('nama_siswa, nis')
          .eq('nis', formattedTransaksi.pengembali_nis)
          .single()
        
        if (dataLastPengembali) {
          setInfoPengembaliTerakhir(dataLastPengembali)
        }
      }

      setPeminjamanAktif(formattedTransaksi)
    }
  }

  // Fungsi Tanda Tangan Canvas
  const startDrawing = (e: any) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX || e.touches?.[0].clientX) - rect.left
    const y = (e.clientY || e.touches?.[0].clientY) - rect.top

    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
  }

  const draw = (e: any) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX || e.touches?.[0].clientX) - rect.left
    const y = (e.clientY || e.touches?.[0].clientY) - rect.top

    ctx.lineTo(x, y)
    ctx.strokeStyle = '#38bdf8'
    ctx.lineWidth = 2
    ctx.stroke()
    setHasSigned(true)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSigned(false)
  }

  // Fungsi Kamera
  const startCamera = async () => {
    setCameraActive(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      alert('Tidak dapat mengakses kamera perangkat.')
      setCameraActive(false)
    }
  }

  const capturePhoto = () => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 320
    canvas.height = video.videoHeight || 240
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      setPhotoDataUrl(canvas.toDataURL('image/jpeg'))
      
      const stream = video.srcObject as MediaStream
      stream?.getTracks().forEach(track => track.stop())
      setCameraActive(false)
    }
  }

  const handleProsesPengembalian = async () => {
    if (!peminjamanAktif || !infoPengembali || !hasSigned || !photoDataUrl) {
      alert('Mohon lengkapi NIS pengembali, tanda tangan, dan foto bukti pengembalian!')
      return
    }

    setLoading(true)
    const ttdDataUrl = canvasRef.current?.toDataURL('image/png')

    const { error } = await supabase
      .from('transaksi_agenda')
      .update({ 
        status: 'DIKEMBALIKAN',
        pengembali_nis: infoPengembali.nis,
        ttd_pengembali: ttdDataUrl,
        foto_pengembalian: photoDataUrl,
        waktu_kembali: new Date().toISOString()
      })
      .eq('id', peminjamanAktif.id)

    setLoading(false)

    if (error) {
      alert('Gagal memproses pengembalian: ' + error.message)
    } else {
      setPesanSukses(`🎉 Buku agenda Kelas ${peminjamanAktif.siswa?.kelas} berhasil dikembalikan oleh ${infoPengembali.nama_siswa}!`)
      setPeminjamanAktif(null)
      setInfoPengembali(null)
      setInfoPeminjamAwal(null)
      setInfoPengembaliTerakhir(null)
      setNisInput('')
      setPhotoDataUrl(null)
      clearCanvas()
    }
  }

  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-slate-100 p-4 sm:p-6 flex flex-col justify-between antialiased">
      
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
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">Form Pengembalian Buku</h1>
          <p className="text-xs text-slate-400">SMKN 1 Karawang</p>
        </div>
      </div>

      <div className="w-full max-w-xl mx-auto my-auto bg-slate-800/40 border border-slate-700/60 rounded-3xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl space-y-4">
        <h2 className="text-xl font-bold text-white mb-1">Masukkan NIS Pengembali</h2>
        <p className="text-xs sm:text-sm text-slate-400 mb-2">Sistem mencocokkan kelas peminjam aktif dengan siswa yang mengembalikan.</p>

        {pesanSukses && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl text-xs sm:text-sm font-semibold text-center">
            {pesanSukses}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">8 Digit NIS Siswa Pengembali</label>
            <input 
              type="text" 
              maxLength={8}
              value={nisInput}
              onChange={(e) => handleCariPeminjaman(e.target.value)}
              placeholder="Contoh: 24251017" 
              className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-base font-mono text-white focus:ring-2 focus:ring-blue-500 outline-none shadow-inner"
            />
            {loading && <p className="text-xs text-blue-400 mt-1 font-semibold">Mencari data...</p>}
            {pesanError && <p className="text-xs text-rose-400 mt-1 font-semibold">{pesanError}</p>}
          </div>

          {infoPengembali && (
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl space-y-0.5">
              <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Identitas Pengembali Saat Ini:</p>
              <p className="text-sm font-semibold text-white">Nama: {infoPengembali.nama_siswa}</p>
              <p className="text-sm font-semibold text-white">Kelas: {infoPengembali.kelas}</p>
            </div>
          )}

          {peminjamanAktif && (
            <div className="space-y-4 pt-2 border-t border-slate-700/80">
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl space-y-1">
                <span className="px-2.5 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/40 rounded-full text-xs font-bold uppercase">Status Aktif: DIPINJAM</span>
                
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-bold text-blue-400 uppercase tracking-wider">Rekam Jejak Peminjaman Kelas:</p>
                  {infoPeminjamAwal && (
                    <p className="text-sm font-semibold text-white">
                      📌 Peminjam Awal: {infoPeminjamAwal.nama_siswa} ({infoPeminjamAwal.nis})
                    </p>
                  )}
                  
                  {infoPengembaliTerakhir && (
                    <p className="text-xs text-amber-300 font-medium">
                      🔄 Penyerah Terakhir: {infoPengembaliTerakhir.nama_siswa} ({infoPengembaliTerakhir.nis})
                    </p>
                  )}

                  <p className="text-xs text-slate-300 pt-1">⏱️ Waktu Pinjam: {new Date(peminjamanAktif.created_at).toLocaleString('id-ID')}</p>
                </div>
              </div>

              {/* Tanda Tangan Pengembali */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Paraf / Tanda Tangan Pengembali</label>
                  <button type="button" onClick={clearCanvas} className="text-xs text-rose-400 hover:underline">Hapus TTD</button>
                </div>
                <div className="border border-slate-700 rounded-xl bg-slate-900 overflow-hidden touch-none">
                  <canvas 
                    ref={canvasRef}
                    width={480}
                    height={120}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-[110px] cursor-crosshair bg-slate-950"
                  />
                </div>
              </div>

              {/* Bukti Foto Pengembalian */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Bukti Foto Pengembalian</label>
                {cameraActive ? (
                  <div className="space-y-2 text-center">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-36 object-cover rounded-xl border border-slate-700 bg-black" />
                    <button type="button" onClick={capturePhoto} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow">
                      📸 Ambil Foto Pengembalian
                    </button>
                  </div>
                ) : photoDataUrl ? (
                  <div className="flex items-center gap-3 bg-slate-900 p-2 rounded-xl border border-slate-700">
                    <img src={photoDataUrl} alt="Bukti Foto" className="w-16 h-16 object-cover rounded-lg border border-slate-600" />
                    <div className="flex-1 text-xs text-emerald-400 font-semibold">✅ Foto pengembalian berhasil diambil</div>
                    <button type="button" onClick={startCamera} className="text-xs text-blue-400 hover:underline px-2">Ulangi</button>
                  </div>
                ) : (
                  <button type="button" onClick={startCamera} className="w-full py-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition">
                    📷 Buka Kamera untuk Bukti Pengembalian
                  </button>
                )}
              </div>

              <button 
                onClick={handleProsesPengembalian}
                disabled={loading || !hasSigned || !photoDataUrl}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold p-3.5 rounded-xl transition shadow-lg text-sm disabled:bg-slate-900 disabled:text-slate-600 disabled:cursor-not-allowed"
              >
                ✅ Konfirmasi & Selesaikan Pengembalian
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