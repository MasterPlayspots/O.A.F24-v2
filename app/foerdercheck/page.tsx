'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/lib/store/authStore'
import { useVerifiedGuard } from '@/lib/hooks/useVerifiedGuard'
import { checkStarten } from '@/lib/api/check'
import { SchrittAnzeige } from '@/components/shared/SchrittAnzeige'
import { LadeSpinner } from '@/components/shared/LadeSpinner'
import { FehlerBox } from '@/components/shared/FehlerBox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card } from '@/components/ui/card'

const SCHRITTE = ['Angaben', 'Chat', 'Dokumente', 'Analyse', 'Ergebnisse']

const BRANCHEN = [
  'IT/Software',
  'Handwerk',
  'Einzelhandel',
  'Gastronomie/Hotel',
  'Produktion',
  'Logistik',
  'Energie/Umwelt',
  'Beratung',
  'Gesundheit',
  'Bildung',
  'Andere',
]

const BUNDESLAENDER = [
  'Baden-Württemberg',
  'Bayern',
  'Berlin',
  'Brandenburg',
  'Bremen',
  'Hamburg',
  'Hessen',
  'Mecklenburg-Vorpommern',
  'Niedersachsen',
  'Nordrhein-Westfalen',
  'Rheinland-Pfalz',
  'Saarland',
  'Sachsen',
  'Sachsen-Anhalt',
  'Schleswig-Holstein',
  'Thüringen',
]

const VORHABEN = [
  'Digitalisierung',
  'Energie & Effizienz',
  'Gründung',
  'Innovation & Forschung',
  'Personal',
  'Export',
  'Investition',
  'Beratung einholen',
]

const formSchema = z.object({
  firmenname: z.string().min(2, 'Firmenname muss mindestens 2 Zeichen lang sein'),
  branche: z.string().min(1, 'Branche ist erforderlich'),
  bundesland: z.string().min(1, 'Bundesland ist erforderlich'),
  vorhaben: z.string().min(1, 'Vorhaben ist erforderlich'),
  mitarbeiterzahl: z.coerce.number().positive().optional(),
  jahresumsatz: z.coerce.number().positive().optional(),
  gruendungsjahr: z.coerce.number().int().optional(),
  investitionsvolumen: z.coerce.number().positive().optional(),
})

type FormData = z.infer<typeof formSchema>

export default function FoerdercheckPage() {
  const { loading } = useVerifiedGuard()
  const { token } = useAuth()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema) as any,
  })

  const branche = watch('branche')
  const bundesland = watch('bundesland')
  const vorhaben = watch('vorhaben')

  if (loading) {
    return <LadeSpinner text="Authentifizierung läuft..." />
  }

  const onSubmit = async (data: FormData) => {
    if (!token) {
      setError('Token nicht verfügbar')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      const result = await checkStarten(data, token)
      router.push(`/foerdercheck/${result.id}/chat`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4">
      <div className="mx-auto max-w-2xl">
        <SchrittAnzeige schritte={SCHRITTE} aktuell={0} />

        <Card className="p-8">
          <h1 className="mb-2 text-3xl font-bold">Fördercheck Wizard</h1>
          <p className="mb-6 text-muted-foreground">
            Finden Sie die passenden Förderprogramme für Ihr Unternehmen
          </p>

          {error && <FehlerBox fehler={error} onNeuLaden={() => setError(null)} />}

          <form onSubmit={handleSubmit((data: FormData) => onSubmit(data))} className="space-y-6">
            {/* Firmenname */}
            <div className="space-y-2">
              <Label htmlFor="firmenname">Firmenname *</Label>
              <Input
                id="firmenname"
                placeholder="z.B. TechFlow GmbH"
                {...register('firmenname')}
              />
              {errors.firmenname && (
                <p className="text-sm text-destructive">{errors.firmenname.message}</p>
              )}
            </div>

            {/* Branche */}
            <div className="space-y-2">
              <Label htmlFor="branche">Branche *</Label>
              <Select value={branche || ''} onValueChange={(value: string | null) => value && setValue('branche', value)}>
                <SelectTrigger id="branche">
                  <SelectValue placeholder="Wählen Sie eine Branche..." />
                </SelectTrigger>
                <SelectContent>
                  {BRANCHEN.map((b: string) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.branche && (
                <p className="text-sm text-destructive">{errors.branche.message}</p>
              )}
            </div>

            {/* Bundesland */}
            <div className="space-y-2">
              <Label htmlFor="bundesland">Bundesland *</Label>
              <Select
                value={bundesland || ''}
                onValueChange={(value: string | null) => value && setValue('bundesland', value)}
              >
                <SelectTrigger id="bundesland">
                  <SelectValue placeholder="Wählen Sie ein Bundesland..." />
                </SelectTrigger>
                <SelectContent>
                  {BUNDESLAENDER.map((bl: string) => (
                    <SelectItem key={bl} value={bl}>
                      {bl}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.bundesland && (
                <p className="text-sm text-destructive">{errors.bundesland.message}</p>
              )}
            </div>

            {/* Vorhaben */}
            <div className="space-y-2">
              <Label htmlFor="vorhaben">Vorhaben *</Label>
              <Select value={vorhaben || ''} onValueChange={(value: string | null) => value && setValue('vorhaben', value)}>
                <SelectTrigger id="vorhaben">
                  <SelectValue placeholder="Wählen Sie ein Vorhaben..." />
                </SelectTrigger>
                <SelectContent>
                  {VORHABEN.map((v: string) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.vorhaben && (
                <p className="text-sm text-destructive">{errors.vorhaben.message}</p>
              )}
            </div>

            {/* Optional Fields */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mitarbeiterzahl">Mitarbeiterzahl (optional)</Label>
                <Input
                  id="mitarbeiterzahl"
                  type="number"
                  placeholder="z.B. 15"
                  {...register('mitarbeiterzahl')}
                />
                {errors.mitarbeiterzahl && (
                  <p className="text-sm text-destructive">{errors.mitarbeiterzahl.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="jahresumsatz">Jahresumsatz in EUR (optional)</Label>
                <Input
                  id="jahresumsatz"
                  type="number"
                  placeholder="z.B. 500000"
                  {...register('jahresumsatz')}
                />
                {errors.jahresumsatz && (
                  <p className="text-sm text-destructive">{errors.jahresumsatz.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="gruendungsjahr">Gründungsjahr (optional)</Label>
                <Input
                  id="gruendungsjahr"
                  type="number"
                  placeholder="z.B. 2020"
                  {...register('gruendungsjahr')}
                />
                {errors.gruendungsjahr && (
                  <p className="text-sm text-destructive">{errors.gruendungsjahr.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="investitionsvolumen">Investitionsvolumen in EUR (optional)</Label>
                <Input
                  id="investitionsvolumen"
                  type="number"
                  placeholder="z.B. 100000"
                  {...register('investitionsvolumen')}
                />
                {errors.investitionsvolumen && (
                  <p className="text-sm text-destructive">{errors.investitionsvolumen.message}</p>
                )}
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting} size="lg" className="w-full">
              {isSubmitting ? 'Wird gesendet...' : 'Weiter zum Chat →'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
