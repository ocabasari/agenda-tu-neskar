'use client'
import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function FormPinjam() {
  const [nisPinjam, setNisPinjam] = useState('')
  const [namaPetugas, setNamaPetugas] = useState('')
  const [infoSiswa, setInfoSiswa] = useState<{ nama_siswa: string; kelas: string } | null>(null)
  const [infoPeminjamAktif, setInfoPeminjamAktif] = useState<{ nama_peminjam: string; nis: string; waktu_pinjam: string } | null>(null)
  const [pesanError, setPesanError] = useState('')
  const [sukses, setSukses] = useState(false)

  // Tanda Tangan Canvas State
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSigned, setHasSigned] = useState(false)

  // Kamera Foto Bukti State
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null)
  const [cameraActive, setCameraActive] = useState(false)

  const handleCariSiswa = async (nis: string) => {
    setNisPinjam(nis)
    setPesanError('')
    setInfoSiswa(null)
    setInfoPeminjamAktif(null)
    setPhotoDataUrl(null)
    clearCanvas()

    if (nis.length === 8) {
      // 1. Cek apakah siswa ada di database master
      const { data: siswaData, error: siswaErr } = await supabase
        .from('siswa')
        .select('nama_siswa, kelas')
        .eq('nis', nis)
        .single()

      if (siswaErr || !siswaData) {
        setPesanError('❌ NIS tidak ditemukan di database!')
        return
      }

      const kelasSiswa = siswaData.kelas

      // 2. Cek apakah kelas ini sedang aktif meminjam
      const { data: transaksiData, error: transErr } = await supabase
        .from('transaksi_agenda')
        .select(`
          id,
          nis,
          created_at,
          status,
          siswa:nis (
            nama_siswa,
            kelas
          )
        `)
        .ilike('status', 'DIPINJAM')

      if (!transErr && transaksiData) {
        const ditemukan = transaksiData.find((t: any) => {
          const sData = Array.isArray(t.siswa) ? t.siswa[0] : t.siswa
          return sData && sData.kelas.toLowerCase() === kelasSiswa.toLowerCase()
        })

        if (ditemukan) {
          const sData = Array.isArray(ditemukan.siswa) ? ditemukan.siswa[0] : ditemukan.siswa
          setPesanError(`⚠️ KELAS TERKUNCI: Buku agenda Kelas ${kelasSiswa} sedang dipinjam!`)
          setInfoPeminjamAktif({
            nama_peminjam: sData?.nama_siswa || 'Siswa',
            nis: ditemukan.nis,
            waktu_pinjam: new Date(ditemukan.created_at).toLocaleString('id-ID')
          })
          return // Menghentikan eksekusi sehingga form isian tidak akan muncul
        }
      }

      setInfoSiswa(siswaData)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!infoSiswa || !nisPinjam || !namaPetugas || !hasSigned || !photoDataUrl) {
      alert('Mohon lengkapi data, tanda tangan, dan foto bukti pengambilan!')
      return
    }

    const ttdDataUrl = canvasRef.current?.toDataURL('image/png')

    const { error } = await supabase.from('transaksi_agenda').insert([
      { 
        nis: nisPinjam, 
        nama_petugas: namaPetugas, 
        status: 'DIPINJAM',
        ttd_peminjam: ttdDataUrl,
        foto_bukti: photoDataUrl
      }
    ])

    if (error) {
      alert('Gagal menyimpan: ' + error.message)
    } else {
      setSukses(true)
      setNisPinjam('')
      setNamaPetugas('')
      setInfoSiswa(null)
      setPhotoDataUrl(null)
      clearCanvas()
      setTimeout(() => setSukses(false), 4000)
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
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">Form Pengambilan Buku</h1>
          <p className="text-xs text-slate-400">SMKN 1 Karawang</p>
        </div>
      </div>

      <div className="w-full max-w-xl mx-auto my-auto bg-slate-800/40 border border-slate-700/60 rounded-3xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl space-y-4">
        <h2 className="text-xl font-bold text-white mb-1">Masukkan NIS</h2>
        <p className="text-xs sm:text-sm text-slate-400 mb-2">Peminjaman terkunci jika kelas masih memegang buku agenda.</p>

        {sukses && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl text-xs sm:text-sm font-semibold text-center">
            🎉 Peminjaman berhasil dicatat! Silakan ambil buku fisik di meja TU.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">8 Digit NIS Siswa</label>
            <input 
              type="text" 
              maxLength={8}
              value={nisPinjam}
              onChange={(e) => handleCariSiswa(e.target.value)}
              placeholder="Contoh: 24251017" 
              className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-base font-mono text-white focus:ring-2 focus:ring-blue-500 outline-none shadow-inner"
              required
            />
            {pesanError && <p className="text-xs text-rose-400 mt-1 font-semibold">{pesanError}</p>}
            
            {/* Jika sedang dipinjam, TAMPILKAN INFO INI SAJA dan sembunyikan form isian di bawahnya */}
            {infoPeminjamAktif && (
              <div className="mt-3 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl space-y-1.5 shadow-lg">
                <span className="px-2.5 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/40 rounded-full text-xs font-bold uppercase">Status: Sedang Dipinjam</span>
                <p className="text-sm font-semibold text-white pt-1">👤 Peminjam: {infoPeminjamAktif.nama_peminjam} ({infoPeminjamAktif.nis})</p>
                <p className="text-xs text-slate-300">⏱️ Waktu Pinjam: {infoPeminjamAktif.waktu_pinjam}</p>
                <p className="text-xs text-rose-300 italic pt-1">Harap selesaikan pengembalian terlebih dahulu melalui menu Pengembalian Buku sebelum kelas ini dapat meminjam kembali.</p>
              </div>
            )}
          </div>

          {/* FORM ISIAN HANYA MUNCUL JIKA KELAS TIDAK SEDANG DIPINJAM */}
          {infoSiswa && !infoPeminjamAktif && (
            <>
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl space-y-0.5">
                <p className="text-xs font-bold text-blue-400 uppercase tracking-wider">Verifikasi Siswa:</p>
                <p className="text-sm font-semibold text-white">Nama: {infoSiswa.nama_siswa}</p>
                <p className="text-sm font-semibold text-white">Kelas: {infoSiswa.kelas}</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Nama Petugas TU / Piket</label>
                <input 
                  type="text" 
                  value={namaPetugas}
                  onChange={(e) => setNamaPetugas(e.target.value)}
                  placeholder="Contoh: Bpk. Hariz" 
                  className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none shadow-inner"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Paraf / Tanda Tangan Peminjam</label>
                  <button type="button" onClick={clearCanvas} className="text-xs text-rose-400 hover:underline">Hapus TTD</button>
                </div>
                <div className="border border-slate-700 rounded-xl bg-slate-900 overflow-hidden touch-none">
                  <canvas 
                    ref={canvasRef}
                    width={480}
                    height={130}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-[120px] cursor-crosshair bg-slate-950"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Bukti Foto Pengambilan</label>
                {cameraActive ? (
                  <div className="space-y-2 text-center">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-40 object-cover rounded-xl border border-slate-700 bg-black" />
                    <button type="button" onClick={capturePhoto} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow">
                      📸 Ambil Foto Sekarang
                    </button>
                  </div>
                ) : photoDataUrl ? (
                  <div className="flex items-center gap-3 bg-slate-900 p-2 rounded-xl border border-slate-700">
                    <img src={photoDataUrl} alt="Bukti Foto" className="w-16 h-16 object-cover rounded-lg border border-slate-600" />
                    <div className="flex-1 text-xs text-emerald-400 font-semibold">✅ Foto bukti berhasil diambil</div>
                    <button type="button" onClick={startCamera} className="text-xs text-blue-400 hover:underline px-2">Ulangi</button>
                  </div>
                ) : (
                  <button type="button" onClick={startCamera} className="w-full py-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition">
                    📷 Buka Kamera untuk Bukti Foto
                  </button>
                )}
              </div>

              <button 
                type="submit"
                disabled={!infoSiswa || !namaPetugas || !hasSigned || !photoDataUrl}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold p-3.5 rounded-xl transition shadow-lg disabled:bg-slate-900 disabled:text-slate-600 disabled:cursor-not-allowed text-sm"
              >
                Simpan & Ambil Buku
              </button>
            </>
          )}
        </form>
      </div>

      <div className="text-center text-xs text-slate-500 py-1">
        © 2026 Tata Usaha • SMKN 1 Karawang
      </div>

    </main>
  )
}