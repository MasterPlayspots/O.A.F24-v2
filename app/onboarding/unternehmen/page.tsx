'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/store/authStore';
import { updateUnternehmen } from '@/lib/api/unternehmen';
import { LadeSpinner } from '@/components/shared/LadeSpinner';
import { FehlerBox } from '@/components/shared/FehlerBox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const rechtsformOptionen = [
  'Einzelunternehmen',
  'GbR',
  'OHG',
  'KG',
  'GmbH',
  'UG (haftungsbeschränkt)',
  'GmbH & Co. KG',
  'AG',
  'eG',
];

const branchenOptionen = [
  'IT & Software',
  'Handwerk',
  'Handel',
  'Gastronomie',
  'Produktion & Fertigung',
  'Logistik',
  'Energie',
  'Beratung & Dienstleistung',
  'Gesundheit & Pflege',
  'Bildung',
  'Bau & Immobilien',
];

const bundeslaender = [
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
];

const schema = z.object({
  firmenname: z.string().min(2, 'Mindestens 2 Zeichen erforderlich'),
  rechtsform: z.string().optional(),
  branche: z.string().min(1, 'Branche erforderlich'),
  bundesland: z.string().min(1, 'Bundesland erforderlich'),
  plz: z.string().optional(),
  ort: z.string().optional(),
  gruendungsjahr: z.number().int().min(1800).max(2100).optional(),
  mitarbeiter_anzahl: z.number().int().min(0).optional(),
  jahresumsatz: z.number().min(0).optional(),
  ist_kmu: z.boolean().default(true),
});

type FormData = z.infer<typeof schema>;

export default function UnternehmenOnboardingPage() {
  const router = useRouter();
  const { token, nutzer, istUnternehmen } = useAuth();
  const [fehler, setFehler] = useState('');
  const [ladet, setLadet] = useState(false);

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    if (nutzer && !istUnternehmen()) { router.replace('/dashboard/berater'); }
  }, [token, nutzer, istUnternehmen, router]);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      firmenname: '',
      rechtsform: '',
      branche: '',
      bundesland: '',
      plz: '',
      ort: '',
      ist_kmu: true,
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      setFehler('');
      setLadet(true);
      await updateUnternehmen(data);
      router.push('/dashboard/unternehmen');
    } catch (error) {
      setFehler(error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten');
    } finally {
      setLadet(false);
    }
  };

  return (
    <div className="min-h-screen bg-architect-surface font-body text-white p-6">
      <div className="max-w-2xl mx-auto pt-8">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-white/50 mb-3">Onboarding</p>
          <h1 className="font-display text-4xl font-bold text-white">Unternehmen einrichten</h1>
          <p className="text-white/60 mt-2">
            Wir brauchen ein paar Eckdaten, damit wir die passenden Förderprogramme für Sie finden können.
          </p>
        </div>

        <div className="bg-architect-surface/60 rounded-lg p-8">
          {fehler && <FehlerBox fehler={fehler} />}

          <form onSubmit={handleSubmit((data) => onSubmit(data))} className="space-y-6">
            <div>
              <Label htmlFor="firmenname" className="text-sm font-semibold text-white">
                Firmenname *
              </Label>
              <Input
                id="firmenname"
                {...register('firmenname')}
                placeholder="z.B. Müller GmbH"
                className="mt-2 bg-architect-surface-low/40 border-0 text-white placeholder:text-white/40"
              />
              {errors.firmenname && (
                <p className="text-architect-error-container text-sm mt-1">{errors.firmenname.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rechtsform" className="text-sm font-semibold text-white">
                  Rechtsform
                </Label>
                <Controller
                  name="rechtsform"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || ''} onValueChange={field.onChange}>
                      <SelectTrigger className="mt-2 bg-architect-surface-low/40 border-0 text-white">
                        <SelectValue placeholder="Wählen…" />
                      </SelectTrigger>
                      <SelectContent>
                        {rechtsformOptionen.map((rf) => (
                          <SelectItem key={rf} value={rf}>{rf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div>
                <Label htmlFor="gruendungsjahr" className="text-sm font-semibold text-white">
                  Gründungsjahr
                </Label>
                <Input
                  id="gruendungsjahr"
                  type="number"
                  min="1800"
                  max="2100"
                  {...register('gruendungsjahr', { valueAsNumber: true, setValueAs: (v) => (v === '' || Number.isNaN(v) ? undefined : v) })}
                  placeholder="2020"
                  className="mt-2 bg-architect-surface-low/40 border-0 text-white placeholder:text-white/40"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="branche" className="text-sm font-semibold text-white">
                Branche *
              </Label>
              <Controller
                name="branche"
                control={control}
                render={({ field }) => (
                  <Select value={field.value || ''} onValueChange={field.onChange}>
                    <SelectTrigger className="mt-2 bg-architect-surface-low/40 border-0 text-white">
                      <SelectValue placeholder="Wählen…" />
                    </SelectTrigger>
                    <SelectContent>
                      {branchenOptionen.map((b) => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.branche && (
                <p className="text-architect-error-container text-sm mt-1">{errors.branche.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="plz" className="text-sm font-semibold text-white">PLZ</Label>
                <Input
                  id="plz"
                  {...register('plz')}
                  placeholder="80331"
                  className="mt-2 bg-architect-surface-low/40 border-0 text-white placeholder:text-white/40"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="ort" className="text-sm font-semibold text-white">Ort</Label>
                <Input
                  id="ort"
                  {...register('ort')}
                  placeholder="München"
                  className="mt-2 bg-architect-surface-low/40 border-0 text-white placeholder:text-white/40"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="bundesland" className="text-sm font-semibold text-white">
                Bundesland *
              </Label>
              <Controller
                name="bundesland"
                control={control}
                render={({ field }) => (
                  <Select value={field.value || ''} onValueChange={field.onChange}>
                    <SelectTrigger className="mt-2 bg-architect-surface-low/40 border-0 text-white">
                      <SelectValue placeholder="Wählen…" />
                    </SelectTrigger>
                    <SelectContent>
                      {bundeslaender.map((bl) => (
                        <SelectItem key={bl} value={bl}>{bl}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.bundesland && (
                <p className="text-architect-error-container text-sm mt-1">{errors.bundesland.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mitarbeiter_anzahl" className="text-sm font-semibold text-white">
                  Mitarbeiter (FTE)
                </Label>
                <Input
                  id="mitarbeiter_anzahl"
                  type="number"
                  min="0"
                  {...register('mitarbeiter_anzahl', { valueAsNumber: true, setValueAs: (v) => (v === '' || Number.isNaN(v) ? undefined : v) })}
                  placeholder="10"
                  className="mt-2 bg-architect-surface-low/40 border-0 text-white placeholder:text-white/40"
                />
              </div>
              <div>
                <Label htmlFor="jahresumsatz" className="text-sm font-semibold text-white">
                  Jahresumsatz (EUR)
                </Label>
                <Input
                  id="jahresumsatz"
                  type="number"
                  min="0"
                  {...register('jahresumsatz', { valueAsNumber: true, setValueAs: (v) => (v === '' || Number.isNaN(v) ? undefined : v) })}
                  placeholder="500000"
                  className="mt-2 bg-architect-surface-low/40 border-0 text-white placeholder:text-white/40"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-architect-surface-low/40 rounded-lg">
              <Label htmlFor="ist_kmu" className="font-semibold cursor-pointer text-white">
                KMU (kleine oder mittlere Unternehmen)
              </Label>
              <Controller
                name="ist_kmu"
                control={control}
                render={({ field }) => (
                  <input
                    id="ist_kmu"
                    type="checkbox"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                )}
              />
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                disabled={ladet}
                size="lg"
                className="w-full bg-architect-primary hover:bg-architect-primary-container text-white"
              >
                {ladet ? <LadeSpinner /> : 'Unternehmen speichern → Dashboard'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
