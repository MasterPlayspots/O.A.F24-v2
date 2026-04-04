'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/store/authStore';
import { addDienstleistung } from '@/lib/api/check';
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
  const { token } = useAuth();
  const [fehler, setFehler] = useState('');
  const [ladet, setLadet] = useState(false);

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
        await addDienstleistung(entry, token!);
      }
      router.push('/dashboard/berater');
    } catch (error: any) {
      setFehler(error?.message || 'Ein Fehler ist aufgetreten');
    } finally {
      setLadet(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <SchrittAnzeige schritte={['Profil', 'Expertise', 'Dienstleistungen']} aktuell={2} />

        <div className="mt-8 bg-white rounded-lg shadow-sm p-8 border border-slate-200">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Dienstleistungen anbieten</h1>
          <p className="text-slate-600 mb-8">
            Definieren Sie die Dienstleistungen, die Sie anbieten möchten, und legen Sie Ihre Preise fest.
          </p>

          {fehler && <FehlerBox fehler={fehler} />}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {fields.map((field, index) => (
              <Card key={field.id} className="p-6 border-slate-200">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Dienstleistung #{index + 1}
                  </h3>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      onClick={() => remove(index)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
                      className="mt-2"
                    />
                    {errors.entries?.[index]?.name && (
                      <p className="text-red-600 text-sm mt-1">
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
                          <SelectTrigger className="mt-2">
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
                      className="mt-2"
                      placeholder="1"
                    />
                    {errors.entries?.[index]?.dauertage && (
                      <p className="text-red-600 text-sm mt-1">
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
                      className="mt-2"
                      placeholder="0"
                    />
                    {errors.entries?.[index]?.preisVon && (
                      <p className="text-red-600 text-sm mt-1">
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
                      className="mt-2"
                      placeholder="0"
                    />
                    {errors.entries?.[index]?.preisBis && (
                      <p className="text-red-600 text-sm mt-1">
                        {errors.entries[index]?.preisBis?.message}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}

            {errors.entries && (
              <p className="text-red-600 text-sm">{errors.entries.message}</p>
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
              <Button type="submit" disabled={ladet} size="lg" className="flex-1">
                {ladet ? <LadeSpinner /> : 'Zum Dashboard'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
