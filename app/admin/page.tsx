'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import * as XLSX from 'xlsx'

interface Transaksi {
  id: number
  nis: string
  nama_petugas: string
  status: string
  created_at: string
  ttd_peminjam?: string
  foto_bukti?: string
  pengembali_nis?: string
  ttd_pengembali?: string
  foto_pengembalian?: string
  waktu_kembali?: string
  siswa?: { nama_siswa: string; kelas: string }
  kelasTransaksi?: string
  namaPengembali?: string
  kelasPengembali?: string
}

interface Siswa {
  nis: string
  nama_siswa: string
  kelas: string
}

async function fetchSemuaSiswa(): Promise<Siswa[]> {
  const batchSize = 1000
  let from = 0
  let semuaData: Siswa[] = []

  while (true) {
    const { data, error } = await supabase
      .from('siswa')
      .select('*')
      .order('nama_siswa', { ascending: true })
      .range(from, from + batchSize - 1)

    if (error) {
      console.error('Gagal mengambil data siswa:', error.message)
      break
    }

    if (!data || data.length === 0) break

    semuaData = [...semuaData, ...data]

    if (data.length < batchSize) break
    from += batchSize
  }

  return semuaData
}

function toLocalDateInputValue(isoString: string): string {
  const d = new Date(isoString)
  if (Number.isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getTodayLocalDateInput(): string {
  return toLocalDateInputValue(new Date().toISOString())
}

export default function AdminPage() {
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false)
  const [inputPin, setInputPin] = useState('')
  const [errorPin, setErrorPin] = useState('')
  const [subTab, setSubTab] = useState<'transaksi' | 'siswa' | 'tambah' | 'import'>('transaksi')

  const [daftarTransaksi, setDaftarTransaksi] = useState<Transaksi[]>([])
  const [daftarSiswa, setDaftarSiswa] = useState<Siswa[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Filter & Search Riwayat Transaksi (Default: Hari Ini)
  const [searchTransaksi, setSearchTransaksi] = useState('')
  const [filterKelasTransaksi, setFilterKelasTransaksi] = useState('SEMUA')
  const [filterStatus, setFilterStatus] = useState('SEMUA')
  const [tanggalDari, setTanggalDari] = useState(() => getTodayLocalDateInput())
  const [tanggalSampai, setTanggalSampai] = useState(() => getTodayLocalDateInput())

  // Modal Detail & Edit Transaksi
  const [selectedTransaksi, setSelectedTransaksi] = useState<Transaksi | null>(null)
  const [isModalDetailOpen, setIsModalDetailOpen] = useState(false)
  const [isModalEditOpen, setIsModalEditOpen] = useState(false)
  const [editStatus, setEditStatus] = useState('DIPINJAM')
  const [editPetugas, setEditPetugas] = useState('')

  // Filter & Search Siswa
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedKelas, setSelectedKelas] = useState('SEMUA')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState<number | 'ALL'>(15)

  // Modal Edit Siswa
  const [selectedSiswa, setSelectedSiswa] = useState<Siswa | null>(null)
  const [isModalEditSiswaOpen, setIsModalEditSiswaOpen] = useState(false)
  const [editNisSiswa, setEditNisSiswa] = useState('')
  const [editNamaSiswa, setEditNamaSiswa] = useState('')
  const [editKelasSiswa, setEditKelasSiswa] = useState('')
  const [savingSiswa, setSavingSiswa] = useState(false)

  // Form Satuan Siswa
  const [nisBaru, setNisBaru] = useState('')
  const [namaBaru, setNamaBaru] = useState('')
  const [kelasBaru, setKelasBaru] = useState('')
  const [pesanSatuan, setPesanSatuan] = useState('')

  // Form Import Excel
  const [excelData, setExcelData] = useState<any[]>([])
  const [statusImport, setStatusImport] = useState('')

  async function ambilData(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    const { data: tData } = await supabase
      .from('transaksi_agenda')
      .select(`*, siswa:nis (nama_siswa, kelas)`)
      .order('created_at', { ascending: false })

    const sData = await fetchSemuaSiswa()

    if (tData) {
      const formattedTData = tData.map((item) => {
        const siswaObj = Array.isArray(item.siswa) ? item.siswa[0] : item.siswa
        const peminjamMatch = sData.find(s => s.nis === item.nis)

        const namaPeminjam = siswaObj?.nama_siswa || peminjamMatch?.nama_siswa || '-'
        const kelasTransaksi = siswaObj?.kelas || peminjamMatch?.kelas || '-'

        let namaPengembali = '-'
        let kelasPengembali = '-'
        if (item.pengembali_nis) {
          const matched = sData.find(s => s.nis === item.pengembali_nis)
          if (matched) {
            namaPengembali = matched.nama_siswa
            kelasPengembali = matched.kelas
          }
        }

        return {
          ...item,
          siswa: {
            nama_siswa: namaPeminjam,
            kelas: kelasTransaksi,
          },
          kelasTransaksi,
          namaPengembali,
          kelasPengembali,
        }
      })
      setDaftarTransaksi(formattedTData)
    }

    setDaftarSiswa(sData)

    setLoading(false)
    if (isRefresh) setRefreshing(false)
  }

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputPin === '09876') {
      setIsAdminUnlocked(true)
      ambilData(false)
    } else {
      setErrorPin('PIN Admin Salah!')
    }
  }

  const handleSimpanEdit = async () => {
    if (!selectedTransaksi) return
    const { error } = await supabase
      .from('transaksi_agenda')
      .update({ status: editStatus, nama_petugas: editPetugas })
      .eq('id', selectedTransaksi.id)

    if (error) {
      alert('Gagal mengupdate: ' + error.message)
    } else {
      alert('✅ Transaksi berhasil diperbarui!')
      setIsModalEditOpen(false)
      ambilData(true)
    }
  }

  const handleHapusTransaksi = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus catatan transaksi ini?')) return
    const { error } = await supabase.from('transaksi_agenda').delete().eq('id', id)
    if (error) {
      alert('Gagal menghapus: ' + error.message)
    } else {
      alert('🗑️ Catatan transaksi berhasil dihapus.')
      setIsModalDetailOpen(false)
      ambilData(true)
    }
  }

  const handleBukaEditSiswa = (s: Siswa) => {
    setSelectedSiswa(s)
    setEditNisSiswa(s.nis)
    setEditNamaSiswa(s.nama_siswa)
    setEditKelasSiswa(s.kelas)
    setIsModalEditSiswaOpen(true)
  }

  const handleSimpanEditSiswa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSiswa) return
    setSavingSiswa(true)

    const { error } = await supabase
      .from('siswa')
      .update({
        nis: editNisSiswa.trim(),
        nama_siswa: editNamaSiswa.trim(),
        kelas: editKelasSiswa.trim(),
      })
      .eq('nis', selectedSiswa.nis)

    setSavingSiswa(false)

    if (error) {
      alert('Gagal mengupdate data siswa: ' + error.message)
    } else {
      alert('✅ Data siswa berhasil diperbarui!')
      setIsModalEditSiswaOpen(false)
      setSelectedSiswa(null)
      ambilData(true)
    }
  }

  const handleHapusSiswa = async (s: Siswa) => {
    if (!confirm(`Hapus siswa "${s.nama_siswa}" (${s.nis} - ${s.kelas})?`)) return

    const { error } = await supabase
      .from('siswa')
      .delete()
      .eq('nis', s.nis)

    if (error) {
      alert('Gagal menghapus siswa: ' + error.message)
    } else {
      alert('🗑️ Data siswa berhasil dihapus.')
      ambilData(true)
    }
  }

  const handleTambahSatuan = async (e: React.FormEvent) => {
    e.preventDefault()
    setPesanSatuan('')
    const { error } = await supabase.from('siswa').insert([{ nis: nisBaru, nama_siswa: namaBaru, kelas: kelasBaru }])
    if (error) {
      setPesanSatuan('Gagal: ' + error.message)
    } else {
      setPesanSatuan('✅ Siswa berhasil ditambahkan!')
      setNisBaru(''); setNamaBaru(''); setKelasBaru('')
      ambilData(false)
    }
  }

  const handleDownloadTemplate = () => {
    const template = [{ nis: '24251017', nama_siswa: 'Contoh Nama Siswa', kelas: 'XI DPIB 2' }]
    const worksheet = XLSX.utils.json_to_sheet(template)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Siswa')
    XLSX.writeFile(workbook, 'template_import_siswa.xlsx')
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const json: any[] = XLSX.utils.sheet_to_json(worksheet)

      const formattedData = json.map((row: any) => ({
        nis: String(row.nis || row.NIS || '').trim(),
        nama_siswa: String(row.nama_siswa || row.NAMA || row.nama || '').trim(),
        kelas: String(row.kelas || row.KELAS || '').trim(),
      })).filter(row => row.nis && row.nama_siswa)

      setExcelData(formattedData)
      setStatusImport(`Berhasil membaca ${formattedData.length} data dari Excel.`)
    }
    reader.readAsArrayBuffer(file)
  }

  const handleProsesImport = async () => {
    if (excelData.length === 0) return
    setStatusImport('Sedang mengimport data...')
    const validData = excelData.filter(item => item.nis && item.nama_siswa)

    const { error } = await supabase.from('siswa').upsert(validData, { onConflict: 'nis' })
    if (error) {
      setStatusImport('Gagal import: ' + error.message)
    } else {
      setStatusImport('🎉 Berhasil import massal data siswa!')
      setExcelData([])
      ambilData(false)
    }
  }

  const daftarKelasTransaksiUnik = Array.from(
    new Set(
      daftarTransaksi
        .map(t => t.kelasTransaksi || t.siswa?.kelas)
        .filter((k): k is string => Boolean(k && k !== '-'))
    )
  ).sort()

  const filteredTransaksi = daftarTransaksi.filter(t => {
    const query = searchTransaksi.toLowerCase()
    const kelasItem = t.kelasTransaksi || t.siswa?.kelas || '-'
    const matchSearch =
      t.nis.toLowerCase().includes(query) ||
      (t.siswa?.nama_siswa || '').toLowerCase().includes(query) ||
      kelasItem.toLowerCase().includes(query) ||
      t.nama_petugas.toLowerCase().includes(query) ||
      (t.pengembali_nis && t.pengembali_nis.toLowerCase().includes(query)) ||
      (t.namaPengembali && t.namaPengembali.toLowerCase().includes(query))

    const matchKelas = filterKelasTransaksi === 'SEMUA' || kelasItem === filterKelasTransaksi
    const matchStatus = filterStatus === 'SEMUA' || t.status === filterStatus

    const tglPinjamLocal = toLocalDateInputValue(t.created_at)
    const matchDari = !tanggalDari || (tglPinjamLocal !== '' && tglPinjamLocal >= tanggalDari)
    const matchSampai = !tanggalSampai || (tglPinjamLocal !== '' && tglPinjamLocal <= tanggalSampai)

    return matchSearch && matchKelas && matchStatus && matchDari && matchSampai
  })

  const daftarKelasUnik = Array.from(new Set(daftarSiswa.map(s => s.kelas))).sort()
  const filteredSiswa = daftarSiswa
    .filter(s => {
      const matchSearch = s.nama_siswa.toLowerCase().includes(searchQuery.toLowerCase()) || s.nis.includes(searchQuery)
      const matchKelas = selectedKelas === 'SEMUA' || s.kelas === selectedKelas
      return matchSearch && matchKelas
    })
    .sort((a, b) => {
      const cmpNama = a.nama_siswa.localeCompare(b.nama_siswa)
      if (cmpNama !== 0) return cmpNama
      return a.kelas.localeCompare(b.kelas)
    })

  const totalItems = filteredSiswa.length
  const totalPages = itemsPerPage === 'ALL' ? 1 : Math.ceil(totalItems / itemsPerPage) || 1
  const startIndex = itemsPerPage === 'ALL' ? 0 : (currentPage - 1) * (itemsPerPage as number)
  const currentSiswaPage = itemsPerPage === 'ALL'
    ? filteredSiswa
    : filteredSiswa.slice(startIndex, startIndex + (itemsPerPage as number))

  const todayStr = getTodayLocalDateInput()

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
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">Panel Kontrol Admin TU</h1>
          <p className="text-xs text-slate-400">SMKN 1 Karawang</p>
        </div>
      </div>

      <div className="w-full flex-1 flex flex-col bg-slate-800/40 border border-slate-700/60 rounded-3xl shadow-2xl p-4 sm:p-6 backdrop-blur-xl">
        {!isAdminUnlocked ? (
          <div className="max-w-md mx-auto my-auto space-y-4 py-12 text-center">
            <div className="w-14 h-14 bg-slate-900 border border-slate-700 rounded-full flex items-center justify-center mx-auto text-2xl shadow-inner">🔒</div>
            <h2 className="text-xl font-bold text-white">Autorisasi Admin TU</h2>
            <p className="text-xs sm:text-sm text-slate-400">Masukkan 6 digit PIN</p>

            <form onSubmit={handleUnlock} className="space-y-3 pt-2">
              <input
                type="password"
                maxLength={6}
                value={inputPin}
                onChange={(e) => setInputPin(e.target.value)}
                placeholder="PIN Admin"
                className="w-full p-4 bg-slate-900 border border-slate-700 rounded-2xl text-center text-lg tracking-widest outline-none font-mono text-white shadow-inner"
                required
              />
              {errorPin && <p className="text-xs text-rose-400 font-medium">{errorPin}</p>}
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold p-4 rounded-2xl text-sm transition shadow-lg">
                Masuk Panel Admin
              </button>
            </form>
          </div>
        ) : (
          <div className="w-full flex-1 flex flex-col space-y-4">

            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 border-b border-slate-700/80 pb-3">
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full md:w-auto">
                <button onClick={() => setSubTab('transaksi')} className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition text-center ${subTab === 'transaksi' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-900/60 text-slate-400 hover:bg-slate-900'}`}>📊 Riwayat</button>
                <button onClick={() => setSubTab('siswa')} className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition text-center ${subTab === 'siswa' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-900/60 text-slate-400 hover:bg-slate-900'}`}>🎓 Siswa ({daftarSiswa.length})</button>
                <button onClick={() => setSubTab('tambah')} className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition text-center ${subTab === 'tambah' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-900/60 text-slate-400 hover:bg-slate-900'}`}>+ Tambah</button>
                <button onClick={() => setSubTab('import')} className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition text-center ${subTab === 'import' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-900/60 text-slate-400 hover:bg-slate-900'}`}>📁 Import</button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => ambilData(true)}
                  disabled={refreshing}
                  className="flex-1 md:flex-none px-3.5 py-2.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 text-xs font-bold rounded-xl transition text-center flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {refreshing ? '🔄 Memuat...' : '🔄 Refresh Data'}
                </button>
                <button onClick={() => setIsAdminUnlocked(false)} className="flex-1 md:flex-none px-3.5 py-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 text-xs font-bold rounded-xl transition text-center">
                  Kunci Kembali 🔒
                </button>
              </div>
            </div>

            {/* TAB 1: RIWAYAT */}
            {subTab === 'transaksi' && (
              <div className="flex-1 flex flex-col space-y-3 overflow-hidden">
                <div className="flex flex-col gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-700/80">
                  <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
                    <input
                      type="text"
                      placeholder="Cari NIS, Nama Peminjam, Pengembali, Kelas, Petugas..."
                      value={searchTransaksi}
                      onChange={(e) => setSearchTransaksi(e.target.value)}
                      className="w-full lg:w-80 p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-400 font-semibold">Kelas:</span>
                        <select
                          value={filterKelasTransaksi}
                          onChange={(e) => setFilterKelasTransaksi(e.target.value)}
                          className="p-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none font-semibold"
                        >
                          <option value="SEMUA">Semua Kelas</option>
                          {daftarKelasTransaksiUnik.map((kls) => <option key={kls} value={kls}>{kls}</option>)}
                        </select>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-400 font-semibold">Status:</span>
                        <select
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                          className="p-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none font-semibold"
                        >
                          <option value="SEMUA">Semua Status</option>
                          <option value="DIPINJAM">DIPINJAM</option>
                          <option value="DIKEMBALIKAN">DIKEMBALIKAN</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <label htmlFor="tgl-dari" className="text-xs text-slate-400 font-semibold">Dari Tanggal:</label>
                        <input
                          id="tgl-dari"
                          type="date"
                          value={tanggalDari}
                          onChange={(e) => setTanggalDari(e.target.value)}
                          className="p-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <label htmlFor="tgl-sampai" className="text-xs text-slate-400 font-semibold">Sampai Tanggal:</label>
                        <input
                          id="tgl-sampai"
                          type="date"
                          value={tanggalSampai}
                          onChange={(e) => setTanggalSampai(e.target.value)}
                          className="p-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setTanggalDari(todayStr)
                          setTanggalSampai(todayStr)
                        }}
                        className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 rounded-xl text-xs font-semibold transition"
                      >
                        Hari Ini
                      </button>
                      {(tanggalDari !== todayStr || tanggalSampai !== todayStr || filterKelasTransaksi !== 'SEMUA' || filterStatus !== 'SEMUA' || searchTransaksi) && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchTransaksi('')
                            setFilterKelasTransaksi('SEMUA')
                            setFilterStatus('SEMUA')
                            setTanggalDari('')
                            setTanggalSampai('')
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-semibold transition"
                        >
                          Semua Tanggal
                        </button>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">
                      Menampilkan <strong className="text-white">{filteredTransaksi.length}</strong> transaksi
                    </span>
                  </div>
                </div>

                <div className="flex-1 flex flex-col overflow-hidden border border-slate-700/80 rounded-2xl bg-slate-900/40">
                  <div className="overflow-y-auto max-h-[calc(100vh-360px)]">
                    <table className="w-full text-left border-collapse min-w-[1100px]">
                      <thead>
                        <tr className="bg-slate-900 text-xs text-slate-400 uppercase tracking-wider border-b border-slate-700 sticky top-0 z-20">
                          <th className="p-3.5">Waktu Pinjam</th>
                          <th className="p-3.5">Peminjam Awal</th>
                          <th className="p-3.5">Pengembali</th>
                          <th className="p-3.5">Kelas</th>
                          <th className="p-3.5">Petugas</th>
                          <th className="p-3.5">Status</th>
                          <th className="p-3.5 text-center">Aksi / Detail</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm divide-y divide-slate-800">
                        {filteredTransaksi.length > 0 ? (
                          filteredTransaksi.map((item: any) => (
                            <tr key={item.id} className="hover:bg-slate-900/50">
                              <td className="p-3.5 text-slate-400 text-xs">{new Date(item.created_at).toLocaleString('id-ID')}</td>
                              <td className="p-3.5 font-medium text-white">{item.nis} - {item.siswa?.nama_siswa || '-'}</td>
                              <td className="p-3.5 font-medium text-indigo-300">{item.pengembali_nis ? `${item.pengembali_nis} - ${item.namaPengembali}` : '-'}</td>
                              <td className="p-3.5 font-semibold text-blue-400">{item.kelasTransaksi || item.siswa?.kelas || '-'}</td>
                              <td className="p-3.5 text-slate-300">{item.nama_petugas}</td>
                              <td className="p-3.5">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${item.status === 'DIPINJAM' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'}`}>{item.status}</span>
                              </td>
                              <td className="p-3.5 text-center">
                                <button
                                  onClick={() => { setSelectedTransaksi(item); setIsModalDetailOpen(true); }}
                                  className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/40 rounded-xl text-xs font-bold transition"
                                >
                                  🔍 Detail & Aksi
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan={7} className="p-8 text-center text-slate-500 text-sm">Tidak ada riwayat transaksi yang cocok.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SISWA */}
            {subTab === 'siswa' && (
              <div className="flex-1 flex flex-col space-y-3">
                <div className="flex flex-col lg:flex-row gap-3 items-center justify-between bg-slate-900/60 p-3 rounded-2xl border border-slate-700/80">
                  <input
                    type="text"
                    placeholder="Cari Nama Siswa / NIS..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="w-full lg:w-72 p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400 font-semibold">Baris:</span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => { setItemsPerPage(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value)); setCurrentPage(1); }}
                        className="p-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none font-semibold"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={'ALL'}>All</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400 font-semibold">Kelas:</span>
                      <select
                        value={selectedKelas}
                        onChange={(e) => { setSelectedKelas(e.target.value); setCurrentPage(1); }}
                        className="p-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none font-semibold max-w-[150px]"
                      >
                        <option value="SEMUA">Semua Kelas</option>
                        {daftarKelasUnik.map((kls) => <option key={kls} value={kls}>{kls}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-x-auto overflow-y-auto border border-slate-700/80 rounded-2xl max-h-[calc(100vh-310px)] bg-slate-900/40">
                  <table className="w-full text-left border-collapse min-w-[680px]">
                    <thead>
                      <tr className="bg-slate-900 text-xs text-slate-400 uppercase tracking-wider border-b border-slate-700 sticky top-0 z-20 shadow-sm">
                        <th className="p-3.5">NIS</th>
                        <th className="p-3.5">Nama Siswa</th>
                        <th className="p-3.5">Kelas</th>
                        <th className="p-3.5 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-slate-800">
                      {currentSiswaPage.length > 0 ? (
                        currentSiswaPage.map((s) => (
                          <tr key={s.nis} className="hover:bg-slate-900/50">
                            <td className="p-3 font-mono text-slate-300 text-xs sm:text-sm">{s.nis}</td>
                            <td className="p-3 text-white font-medium text-xs sm:text-sm">{s.nama_siswa}</td>
                            <td className="p-3 font-semibold text-blue-400 text-xs sm:text-sm">{s.kelas}</td>
                            <td className="p-3 text-center">
                              <div className="inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleBukaEditSiswa(s)}
                                  className="px-2.5 py-1 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/40 rounded-lg text-xs font-bold transition"
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleHapusSiswa(s)}
                                  className="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/40 rounded-lg text-xs font-bold transition"
                                >
                                  🗑️ Hapus
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={4} className="p-8 text-center text-slate-500 text-sm">Tidak ada data siswa.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 text-xs text-slate-400">
                  <span>Menampilkan <strong className="text-white">{currentSiswaPage.length}</strong> dari total <strong className="text-white">{totalItems}</strong> siswa</span>
                  {itemsPerPage !== 'ALL' && totalPages > 1 && (
                    <div className="flex gap-2">
                      <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="px-3.5 py-1.5 bg-slate-900 border border-slate-700 text-white rounded-xl font-bold disabled:opacity-40">← Sebelumnya</button>
                      <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="px-3.5 py-1.5 bg-slate-900 border border-slate-700 text-white rounded-xl font-bold disabled:opacity-40">Berikutnya →</button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: TAMBAH */}
            {subTab === 'tambah' && (
              <div className="max-w-md bg-slate-900/60 p-6 rounded-3xl border border-slate-700/80 space-y-4 shadow-xl">
                <h3 className="font-bold text-white text-base">Tambah Siswa Satuan</h3>
                {pesanSatuan && <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold rounded-xl text-center">{pesanSatuan}</div>}

                <form onSubmit={handleTambahSatuan} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">NIS (8 Digit)</label>
                    <input type="text" maxLength={8} value={nisBaru} onChange={(e) => setNisBaru(e.target.value)} placeholder="Contoh: 24251017" className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm outline-none focus:ring-2 focus:ring-blue-500" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Nama Lengkap</label>
                    <input type="text" value={namaBaru} onChange={(e) => setNamaBaru(e.target.value)} placeholder="Nama lengkap siswa" className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-blue-500" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Kelas</label>
                    <input type="text" value={kelasBaru} onChange={(e) => setKelasBaru(e.target.value)} placeholder="Contoh: XII DPIB 1" className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-blue-500" required />
                  </div>
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold p-3 rounded-xl shadow-lg transition text-sm">Simpan Siswa</button>
                </form>
              </div>
            )}

            {/* TAB 4: IMPORT */}
            {subTab === 'import' && (
              <div className="max-w-md bg-slate-900/60 p-6 rounded-3xl border border-slate-700/80 space-y-4 shadow-xl">
                <h3 className="font-bold text-white text-base">Import Data dari Excel (.xlsx)</h3>
                <p className="text-xs text-slate-400">Pastikan format kolom Excel Anda memiliki header: <code className="text-blue-400">nis</code>, <code className="text-blue-400">nama_siswa</code>, dan <code className="text-blue-400">kelas</code>.</p>

                <button onClick={handleDownloadTemplate} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-lg inline-flex items-center gap-2">
                  📥 Download Template Excel
                </button>

                <div>
                  <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white" />
                </div>

                {statusImport && <div className="p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-white">{statusImport}</div>}

                {excelData.length > 0 && (
                  <button onClick={handleProsesImport} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold p-3 rounded-xl text-xs shadow-lg">
                    🚀 Proses Import {excelData.length} Data
                  </button>
                )}
              </div>
            )}

          </div>
        )}
      </div>

      {/* MODAL DETAIL TRANSAKSI */}
      {isModalDetailOpen && selectedTransaksi && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Detail Lengkap Transaksi</h3>
              <button onClick={() => setIsModalDetailOpen(false)} className="text-slate-400 hover:text-white font-bold text-base">✕</button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3 bg-slate-800/50 p-3.5 rounded-2xl border border-slate-700/60">
                <div>
                  <p className="text-slate-400 text-xs">Peminjam Awal:</p>
                  <p className="font-semibold text-white">{selectedTransaksi.nis} - {selectedTransaksi.siswa?.nama_siswa}</p>
                  <p className="text-blue-400 font-semibold">Kelas: {selectedTransaksi.kelasTransaksi || selectedTransaksi.siswa?.kelas || '-'}</p>
                  <p className="text-slate-400 text-xs mt-1">Waktu: {new Date(selectedTransaksi.created_at).toLocaleString('id-ID')}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Pengembali / Penyerah:</p>
                  <p className="font-semibold text-indigo-300">{selectedTransaksi.pengembali_nis ? `${selectedTransaksi.pengembali_nis} - ${selectedTransaksi.namaPengembali}` : '-'}</p>
                  <p className="text-slate-400 text-xs mt-1">Waktu Kembali: {selectedTransaksi.waktu_kembali ? new Date(selectedTransaksi.waktu_kembali).toLocaleString('id-ID') : '-'}</p>
                </div>
              </div>

              <div className="flex justify-between items-center bg-slate-800/40 p-3 rounded-xl border border-slate-700/60">
                <div>
                  <span className="text-slate-400 text-xs block">Petugas Piket:</span>
                  <span className="font-semibold text-white">{selectedTransaksi.nama_petugas}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs block">Status:</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${selectedTransaksi.status === 'DIPINJAM' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'}`}>{selectedTransaksi.status}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase">Bukti Peminjaman</p>
                  <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 text-center space-y-1">
                    {selectedTransaksi.foto_bukti ? <img src={selectedTransaksi.foto_bukti} alt="Foto Pinjam" className="w-full h-24 object-cover rounded-lg" /> : <p className="text-slate-500 text-xs py-8">Tidak ada foto</p>}
                    {selectedTransaksi.ttd_peminjam ? <img src={selectedTransaksi.ttd_peminjam} alt="TTD Pinjam" className="w-full h-12 object-contain bg-slate-900 rounded" /> : <p className="text-slate-500 text-xs">Tidak ada TTD</p>}
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase">Bukti Pengembalian</p>
                  <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 text-center space-y-1">
                    {selectedTransaksi.foto_pengembalian ? <img src={selectedTransaksi.foto_pengembalian} alt="Foto Kembali" className="w-full h-24 object-cover rounded-lg" /> : <p className="text-slate-500 text-xs py-8">Belum dikembalikan</p>}
                    {selectedTransaksi.ttd_pengembali ? <img src={selectedTransaksi.ttd_pengembali} alt="TTD Kembali" className="w-full h-12 object-contain bg-slate-900 rounded" /> : <p className="text-slate-500 text-xs">Belum ada TTD</p>}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => { setEditStatus(selectedTransaksi.status); setEditPetugas(selectedTransaksi.nama_petugas); setIsModalDetailOpen(false); setIsModalEditOpen(true); }}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs transition"
              >
                ✏️ Edit Status / Petugas
              </button>
              <button
                onClick={() => handleHapusTransaksi(selectedTransaksi.id)}
                className="px-4 py-2.5 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/40 rounded-xl font-bold text-xs transition"
              >
                🗑️ Hapus
              </button>
              <button
                onClick={() => setIsModalDetailOpen(false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT TRANSAKSI */}
      {isModalEditOpen && selectedTransaksi && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-3">Edit Transaksi</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Status Transaksi</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm outline-none font-semibold"
                >
                  <option value="DIPINJAM">DIPINJAM</option>
                  <option value="DIKEMBALIKAN">DIKEMBALIKAN</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Nama Petugas Piket</label>
                <input
                  type="text"
                  value={editPetugas}
                  onChange={(e) => setEditPetugas(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSimpanEdit}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition shadow-lg"
              >
                💾 Simpan Perubahan
              </button>
              <button
                onClick={() => setIsModalEditOpen(false)}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs transition"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT SISWA */}
      {isModalEditSiswaOpen && selectedSiswa && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-3">Edit Data Siswa</h3>

            <form onSubmit={handleSimpanEditSiswa} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">NIS</label>
                <input
                  type="text"
                  value={editNisSiswa}
                  onChange={(e) => setEditNisSiswa(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Nama Lengkap Siswa</label>
                <input
                  type="text"
                  value={editNamaSiswa}
                  onChange={(e) => setEditNamaSiswa(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Kelas</label>
                <input
                  type="text"
                  value={editKelasSiswa}
                  onChange={(e) => setEditKelasSiswa(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={savingSiswa}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition shadow-lg disabled:opacity-50"
                >
                  {savingSiswa ? 'Menyimpan...' : '💾 Simpan Perubahan'}
                </button>
                <button
                  type="button"
                  onClick={() => { setIsModalEditSiswaOpen(false); setSelectedSiswa(null); }}
                  className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs transition"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="text-center text-xs text-slate-500 py-1">
        © 2026 Tata Usaha • SMKN 1 Karawang
      </div>

    </main>
  )
}