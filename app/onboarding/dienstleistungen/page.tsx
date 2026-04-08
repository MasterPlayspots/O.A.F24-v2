'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/store/authStore';
import { addDienstleistung } from '@/lib/api/berater';
import { SchrittAnzeige } from '@/components/shared/SchrittAnzeige';
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
import { Card } from '@/components/ui/card';
import { Trash2 } from 'lucide-react';

const kategorienOptionen = [
  'Potenzialanalyse',
  'Strategieentwicklung',
  'Fördermittelberatung',
  'Antragsvorbereitung',
  'Nachhaltigkeitsberatung',
  'Digitalisierungsberatung',
  'Gründungsberatung',
];

const schema = z.object({
  entries: z
    .array(
      z.object({
        name: z.string().min(2, 'Mindestens 2 Zeichen erforderlich'),
        kategorie: z.string().optional(),
        preisTyp: z.enum(['pauschal', 'stundenbasiert', 'erfolgsbasiert']),
        preisVon: z.number().min(0, 'Muss 0 oder höher sein'),
        preisBis: z.number().min(0, 'Muss 0 oder höher sein'),
        dauertage: z.number().min(1, 'Mindestens 1 Tag erforderlich'),
      })
    )
    .min(1, 'Mindestens 1 Dienstleistung erforderlich'),
});

type FormData = z.infer<typeof schema>;

export default function DienstleistungenPage() {
  const router = useRouter();
  const { token, nutzer, istBerater } = useAuth();
  const [fehler, setFehler] = useState('');
  const [ladet, setLadet] = useState(false);

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    if (nutzer && !istBerater()) { router.replace('/dashboard/unternehmen'); }
  }, [token, nutzer, istBerater, router]);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      entries: [
        {
          name: '',
          kategorie: '',
          preisTyp: 'pauschal',
          preisVon: 0,
          preisBis: 0,
          dauertage: 1,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'entries',
  });

  const onSubmit = async (data: FormData) => {
    try {
      setFehler('');
      setLadet(true);
      for (const entry of data.entries) {
        await addDienstleistung(entry);
      }
      router.push('/dashboard/berater');
    } catch (error) {
      setFehler(error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten');
    } finally {
      setLadet(false);
    }
  };

  return (
    <div className="min-h-screen bg-architect-surface font-body text-white p-6">
      <div className="max-w-4xl mx-auto">
        <SchrittAnzeige schritte={['Profil', 'Expertise', 'Dienstleistungen']} aktuell={2} />

        <div className="mt-8 bg-architect-surface/60 rounded-lg p-8">
          <h1 className="font-display text-3xl font-bold text-white mb-2">Dienstleistungen anbieten</h1>
          <p className="text-white/60 mb-8">
            Definieren Sie die Dienstleistungen, die Sie anbieten möchten, und legen Sie Ihre Preise fest.
          </p>

          {fehler && <FehlerBox fehler={fehler} />}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {fields.map((field, index) => (
              <Card key={field.id} className="p-6 bg-architect-surface-low/40 border-0 text-white">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-display text-lg font-semibold text-white">
                    Dienstleistung #{index + 1}
                  </h3>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      onClick={() => remove(index)}
                      variant="ghost"
                      size="sm"
                      className="text-architect-error-container hover:text-white hover:bg-architect-error/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <Label htmlFor={`name-${index}`} className="font-semibold">
                      Dienstleistungsname
                    </Label>
                    <Input
                      id={`name-${index}`}
                      {...register(`entries.${index}.name`)}
                      placeholder="z.B. Fördermittelberatung Grundlagen"
                      className="mt-2 bg-architect-surface-low/40 border-0 text-white placeholder:text-white/40"
                    />
                    {errors.entries?.[index]?.name && (
                      <p className="text-architect-error-container text-sm mt-1">
                        {errors.entries[index]?.name?.message}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor={`kategorie-${index}`} className="font-semibold">
                      Kategorie (optional)
                    </Label>
                    <Controller
                      name={`entries.${index}.kategorie`}
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value || ''} onValueChange={field.onChange}>
                          <SelectTrigger className="mt-2 bg-architect-surface-low/40 border-0 text-white placeholder:text-white/40">
                            <SelectValue placeholder="Wählen Sie eine Kategorie (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            {kategorienOptionen.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div>
                    <Label htmlFor={`preisTyp-${index}`} className="font-semibold block mb-3">
                      Preismodell
                    </Label>
                    <div className="space-y-2">
                      {(['pauschal', 'stundenbasiert', 'erfolgsbasiert'] as const).map((typ) => (
                        <label key={typ} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            value={typ}
                            {...register(`entries.${index}.preisTyp`)}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">
                            {typ === 'pauschal'
                              ? 'Pauschal'
                              : typ === 'stundenbasiert'
                                ? 'Stundenbasiert'
                                : 'Erfolgsbasiert'}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor={`dauertage-${index}`} className="font-semibold">
                      Bearbeitungsdauer (Tage)
                    </Label>
                    <Input
                      id={`dauertage-${index}`}
                      type="number"
                      min="1"
                      {...register(`entries.${index}.dauertage`, { valueAsNumber: true })}
                      className="mt-2 bg-architect-surface-low/40 border-0 text-white placeholder:text-white/40"
                      placeholder="1"
                    />
                    {errors.entries?.[index]?.dauertage && (
                      <p className="text-architect-error-container text-sm mt-1">
                        {errors.entries[index]?.dauertage?.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor={`preisVon-${index}`} className="font-semibold">
                      Preis von (EUR)
                    </Label>
                    <Input
                      id={`preisVon-${index}`}
                      type="number"
                      min="0"
                      {...register(`entries.${index}.preisVon`, { valueAsNumber: true })}
                      className="mt-2 bg-architect-surface-low/40 border-0 text-white placeholder:text-white/40"
                      placeholder="0"
                    />
                    {errors.entries?.[index]?.preisVon && (
                      <p className="text-architect-error-container text-sm mt-1">
                        {errors.entries[index]?.preisVon?.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor={`preisBis-${index}`} className="font-semibold">
                      Preis bis (EUR)
                    </Label>
                    <Input
                      id={`preisBis-${index}`}
                      type="number"
                      min="0"
                      {...register(`entries.${index}.preisBis`, { valueAsNumber: true })}
                      className="mt-2 bg-architect-surface-low/40 border-0 text-white placeholder:text-white/40"
                      placeholder="0"
                    />
                    {errors.entries?.[index]?.preisBis && (
                      <p className="text-architect-error-container text-sm mt-1">
                        {errors.entries[index]?.preisBis?.message}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}

            {errors.entries && (
              <p className="text-architect-error-container text-sm">{errors.entries.message}</p>
            )}

            <Button
              type="button"
              onClick={() =>
                append({
                  name: '',
                  kategorie: '',
                  preisTyp: 'pauschal',
                  preisVon: 0,
                  preisBis: 0,
                  dauertage: 1,
                })
              }
              variant="outline"
              className="w-full"
            >
              + Dienstleistung hinzufügen
            </Button>

            <div className="flex gap-4 pt-6">
              <Button type="submit" disabled={ladet} size="lg" className="flex-1 bg-architect-primary hover:bg-architect-primary-container text-white">
                {ladet ? <LadeSpinner /> : 'Zum Dashboard'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
