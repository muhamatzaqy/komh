'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'

export default function LaporanPage() {
  const [exportType, setExportType] = useState<'presensi' | 'keuangan'>('presensi')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const exportExcel = async () => {
    setLoading(true)
    try {
      const XLSX = await import('xlsx')
      let rows: any[] = []
      if (exportType === 'presensi') {
        const { data } = await supabase.from('presensi').select('*, profiles(nama, nim, unit), jadwal_kegiatan(nama_kegiatan, tanggal)').order('created_at', { ascending: false })
        rows = (data ?? []).map((p: any) => ({ Nama: p.profiles?.nama, NIM: p.profiles?.nim, Kegiatan: p.jadwal_kegiatan?.nama_kegiatan, Tanggal: p.jadwal_kegiatan?.tanggal ? formatDate(p.jadwal_kegiatan.tanggal) : '', Status: p.status }))
      } else {
        const { data } = await supabase.from('pembayaran_spp').select('*, profiles(nama, nim, unit)').order('created_at', { ascending: false })
        rows = (data ?? []).map((s: any) => ({ Nama: s.profiles?.nama, NIM: s.profiles?.nim, Semester: s.semester, Nominal: s.nominal, Status: s.status }))
      }
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, exportType === 'presensi' ? 'Presensi' : 'Keuangan')
      XLSX.writeFile(wb, `laporan-${exportType}-${new Date().toISOString().split('T')[0]}.xlsx`)
      toast({ title: 'Berhasil', description: 'File Excel diunduh', variant: 'success' })
    } catch { toast({ title: 'Error', description: 'Gagal export', variant: 'destructive' }) }
    finally { setLoading(false) }
  }

  const exportPDF = async () => {
    setLoading(true)
    try {
      const jsPDF = (await import('jspdf')).default
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF()
      doc.setFontSize(16)
      doc.text(exportType === 'presensi' ? 'Laporan Presensi' : 'Laporan Keuangan SPP', 14, 20)
      doc.setFontSize(10)
      doc.text(`Dicetak: ${formatDate(new Date())}`, 14, 30)
      if (exportType === 'presensi') {
        const { data } = await supabase.from('presensi').select('*, profiles(nama, nim), jadwal_kegiatan(nama_kegiatan, tanggal)').order('created_at', { ascending: false }).limit(200)
        autoTable(doc, { startY: 40, head: [['Nama', 'NIM', 'Kegiatan', 'Tanggal', 'Status']], body: (data ?? []).map((p: any) => [p.profiles?.nama, p.profiles?.nim, p.jadwal_kegiatan?.nama_kegiatan, p.jadwal_kegiatan?.tanggal ? formatDate(p.jadwal_kegiatan.tanggal) : '', p.status]) })
      } else {
        const { data } = await supabase.from('pembayaran_spp').select('*, profiles(nama, nim)').order('created_at', { ascending: false }).limit(200)
        autoTable(doc, { startY: 40, head: [['Nama', 'NIM', 'Semester', 'Nominal', 'Status']], body: (data ?? []).map((s: any) => [s.profiles?.nama, s.profiles?.nim, s.semester, formatCurrency(s.nominal), s.status]) })
      }
      doc.save(`laporan-${exportType}-${new Date().toISOString().split('T')[0]}.pdf`)
      toast({ title: 'Berhasil', description: 'File PDF diunduh', variant: 'success' })
    } catch { toast({ title: 'Error', description: 'Gagal export', variant: 'destructive' }) }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Export Laporan" description="Unduh laporan dalam format Excel atau PDF" />
      <Card>
        <CardHeader><CardTitle>Pengaturan Laporan</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Jenis Laporan</Label>
            <Select value={exportType} onValueChange={v => setExportType(v as 'presensi' | 'keuangan')}>
              <SelectTrigger className="w-full sm:w-64"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="presensi">Laporan Presensi</SelectItem><SelectItem value="keuangan">Laporan Keuangan SPP</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="flex gap-4">
            <Button onClick={exportExcel} disabled={loading} className="gap-2">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}Export Excel</Button>
            <Button onClick={exportPDF} disabled={loading} variant="outline" className="gap-2">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}Export PDF</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
export const dynamic = 'force-dynamic'
