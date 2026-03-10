'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { registerSchema, type RegisterFormData } from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BookOpen, Loader2 } from 'lucide-react'
import { UNIT_OPTIONS } from '@/lib/constants'

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) })

  const onSubmit = async (data: RegisterFormData) => {
    setError(null)
    const { data: authData, error: authError } = await supabase.auth.signUp({ email: data.email, password: data.password })
    if (authError) { setError(authError.message); return }
    if (authData.user) {
      const { error: profileError } = await supabase.from('profiles').insert({ id: authData.user.id, nama: data.nama, nim: data.nim, unit: data.unit, angkatan: data.angkatan, role: 'mahasiswa' })
      if (profileError) { setError(profileError.message); return }
      router.push('/mahasiswa')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <BookOpen className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-primary">SI-ASRAMA</h1>
        </div>
        <Card>
          <CardHeader><CardTitle>Daftar</CardTitle><CardDescription>Buat akun baru sebagai mahasiswa asrama</CardDescription></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
              <div className="space-y-2">
                <Label>Nama Lengkap</Label>
                <Input placeholder="Ahmad Fauzi" {...register('nama')} />
                {errors.nama && <p className="text-xs text-destructive">{errors.nama.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>NIM</Label>
                <Input placeholder="2024001" {...register('nim')} />
                {errors.nim && <p className="text-xs text-destructive">{errors.nim.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="nama@email.com" {...register('email')} />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" placeholder="••••••••" {...register('password')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select onValueChange={(v) => setValue('unit', v as 'mahad_aly' | 'lkim')}>
                    <SelectTrigger><SelectValue placeholder="Pilih unit" /></SelectTrigger>
                    <SelectContent>{UNIT_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Angkatan</Label>
                  <Input type="number" placeholder="2024" {...register('angkatan')} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Mendaftar...</> : 'Daftar'}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Sudah punya akun? <Link href="/login" className="font-medium text-primary hover:underline">Masuk</Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
export const dynamic = 'force-dynamic'
