'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/store/authStore';
import { updateBeraterProfil } from '@/lib/api/check';
import { SchrittAnzeige } from '@/components/shared/SchrittAnzeige';
import { LadeSpinner } from '@/components/shared/LadeSpinner';
import { FehlerBox } from '@/components/shared/FehlerBox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const branchenOptionen = [
  'IT',
  'Handwerk',
  'Handel',
  'Gastronomie',
  'Produktion',
  'Logistik',
  'Energie',
  'Beratung',
  'Gesundheit',
  'Bildung',
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
  displayName: z.string().min(2, 'Mindestens 2 Zeichen erforderlich'),
  region: z.string().min(1, 'Region erforderlich'),
  branchen: z.array(z.string()).min(1, 'Mindestens 1 Branche erforderlich'),
  bio: z.string().max(500, 'Maximal 500 Zeichen').optional().or(z.literal('')),
  verfuegbar: z.boolean().default(true),
});

type FormData = z.infer<typeof schema>;

export default function ProfilPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [fehler, setFehler] = useState('');
  const [ladet, setLadet] = useState(false);
  const [bioCount, setBioCount] = useState(0);

  const {
    register,
    control,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      displayName: '',
      region: '',
      branchen: [],
      bio: '',
      verfuegbar: true,
    },
  });

  const selectedBranchen = watch('branchen');
  const bioValue = watch('bio');

  const onSubmit = async (data: FormData) => {
    if (!token) {
      setFehler('Token nicht verfügbar');
      return;
    }
    try {
      setFehler('');
      setLadet(true);
      await updateBeraterProfil(data, token);
      router.push('/onboarding/expertise');
    } catch (error: any) {
      setFehler(error?.message || 'Ein Fehler ist aufgetreten');
    } finally {
      setLadet(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-6">
      <div className="max-w-2xl mx-auto">
        <SchrittAnzeige schritte={['Profil', 'Expertise', 'Dienstleistungen']} aktuell={0} />

        <div className="mt-8 bg-white rounded-lg shadow-sm p-8 border border-slate-200">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Profil erstellen</h1>
          <p className="text-slate-600 mb-8">
            Richten Sie Ihr Berater-Profil ein und geben Sie uns einen Überblick über Ihre Kompetenzen.
          </p>

          {fehler && <FehlerBox fehler={fehler} />}

          <form onSubmit={handleSubmit((data: FormData) => onSubmit(data))} className="space-y-8">
            <div>
              <Label htmlFor="displayName" className="text-base font-semibold">
                Anzeigename
              </Label>
              <Input
                id="displayName"
                {...register('displayName')}
                placeholder="z.B. Dr. Max Müller"
                className="mt-2"
              />
              {errors.displayName && (
                <p className="text-red-600 text-sm mt-1">{errors.displayName.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="region" className="text-base font-semibold">
                Region / Bundesland
              </Label>
              <Controller
                name="region"
                control={control}
                render={({ field }) => (
                  <Select value={field.value || ''} onValueChange={(value: string | null) => value && field.onChange(value)}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Wählen Sie Ihr Bundesland" />
                    </SelectTrigger>
                    <SelectContent>
                      {bundeslaender.map((bl: string) => (
                        <SelectItem key={bl} value={bl}>
                          {bl}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.region && (
                <p className="text-red-600 text-sm mt-1">{errors.region.message}</p>
              )}
            </div>

            <div>
              <Label className="text-base font-semibold block mb-3">Branchen</Label>
              <div className="grid grid-cols-2 gap-4">
                {branchenOptionen.map((branche: string) => (
                  <div key={branche} className="flex items-center">
                    <input
                      type="checkbox"
                      id={branche}
                      value={branche}
                      {...register('branchen')}
                      className="w-4 h-4 rounded border-slate-300"
                    />
                    <label htmlFor={branche} className="ml-2 text-sm cursor-pointer">
                      {branche}
                    </label>
                  </div>
                ))}
              </div>
              {errors.branchen && (
                <p className="text-red-600 text-sm mt-2">{errors.branchen.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="bio" className="text-base font-semibold">
                Über Sie (optional)
              </Label>
              <Textarea
                id="bio"
                {...register('bio')}
                placeholder="Erzählen Sie etwas über Ihre Erfahrung und Spezialisierung..."
                className="mt-2 resize-none"
                rows={4}
              />
              <p className="text-xs text-slate-500 mt-1">
                {bioCount} / 500 Zeichen
              </p>
              {errors.bio && <p className="text-red-600 text-sm mt-1">{errors.bio.message}</p>}
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
              <Label htmlFor="verfuegbar" className="font-semibold cursor-pointer">
                Ich bin verfügbar für neue Projekte
              </Label>
              <Controller
                name="verfuegbar"
                control={control}
                render={({ field }) => (
                  <input
                    id="verfuegbar"
                    type="checkbox"
                    checked={field.value}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300"
                  />
                )}
              />
            </div>

            <div className="flex gap-4 pt-6">
              <Button type="submit" disabled={ladet} size="lg" className="flex-1">
                {ladet ? <LadeSpinner /> : 'Weiter zur Expertise'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
