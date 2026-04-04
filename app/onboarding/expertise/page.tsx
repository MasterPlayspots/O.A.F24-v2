'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/store/authStore';
import { addExpertise } from '@/lib/api/check';
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

const foerderbereicheOptionen = [
  'KfW Gründungsfinanzierung',
  'KfW Wachstumsfinanzierung',
  'EU-Förderung',
  'Bund-Länder-Programme',
  'Digitalisierungsförderung',
  'Nachhaltigkeitsförderung',
  'Technologieförderung',
];

const schema = z.object({
  entries: z
    .array(
      z.object({
        foerderbereich: z.string().min(1, 'Förderbereich erforderlich'),
        kompetenzLevel: z.enum(['einsteiger', 'fortgeschritten', 'experte']),
        erfolgreicheAntraege: z.number().min(0, 'Muss 0 oder höher sein'),
        gesamtvolumenEur: z.number().min(0, 'Muss 0 oder höher sein'),
      })
    )
    .min(1, 'Mindestens 1 Expertise erforderlich'),
});

type FormData = z.infer<typeof schema>;

export default function ExpertisePage() {
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
          foerderbereich: '',
          kompetenzLevel: 'fortgeschritten',
          erfolgreicheAntraege: 0,
          gesamtvolumenEur: 0,
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
        await addExpertise(entry, token!);
      }
      router.push('/onboarding/dienstleistungen');
    } catch (error: any) {
      setFehler(error?.message || 'Ein Fehler ist aufgetreten');
    } finally {
      setLadet(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <SchrittAnzeige schritte={['Profil', 'Expertise', 'Dienstleistungen']} aktuell={1} />

        <div className="mt-8 bg-white rounded-lg shadow-sm p-8 border border-slate-200">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Expertise hinzufügen</h1>
          <p className="text-slate-600 mb-8">
            Geben Sie an, in welchen Förderbereichen Sie spezialisiert sind und wie viele erfolgreiche Anträge Sie bereits bearbeitet haben.
          </p>

          {fehler && <FehlerBox fehler={fehler} />}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {fields.map((field, index) => (
              <Card key={field.id} className="p-6 border-slate-200">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-slate-900">Expertise #{index + 1}</h3>
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
                  <div>
                    <Label htmlFor={`foerderbereich-${index}`} className="font-semibold">
                      Förderbereich
                    </Label>
                    <Controller
                      name={`entries.${index}.foerderbereich`}
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Wählen Sie einen Förderbereich" />
                          </SelectTrigger>
                          <SelectContent>
                            {foerderbereicheOptionen.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.entries?.[index]?.foerderbereich && (
                      <p className="text-red-600 text-sm mt-1">
                        {errors.entries[index]?.foerderbereich?.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor={`kompetenzLevel-${index}`} className="font-semibold block mb-3">
                      Kompetenzstufe
                    </Label>
                    <div className="flex gap-4">
                      {(['einsteiger', 'fortgeschritten', 'experte'] as const).map((level) => (
                        <label key={level} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            value={level}
                            {...register(`entries.${index}.kompetenzLevel`)}
                            className="w-4 h-4"
                          />
                          <span className="text-sm capitalize">
                            {level === 'einsteiger'
                              ? 'Einsteiger'
                              : level === 'fortgeschritten'
                                ? 'Fortgeschritten'
                                : 'Experte'}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor={`erfolgreicheAntraege-${index}`} className="font-semibold">
                      Erfolgreiche Anträge
                    </Label>
                    <Input
                      id={`erfolgreicheAntraege-${index}`}
                      type="number"
                      min="0"
                      {...register(`entries.${index}.erfolgreicheAntraege`, {
                        valueAsNumber: true,
                      })}
                      className="mt-2"
                      placeholder="0"
                    />
                    {errors.entries?.[index]?.erfolgreicheAntraege && (
                      <p className="text-red-600 text-sm mt-1">
                        {errors.entries[index]?.erfolgreicheAntraege?.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor={`gesamtvolumen-${index}`} className="font-semibold">
                      Gesamtvolumen (EUR)
                    </Label>
                    <Input
                      id={`gesamtvolumen-${index}`}
                      type="number"
                      min="0"
                      {...register(`entries.${index}.gesamtvolumenEur`, {
                        valueAsNumber: true,
                      })}
                      className="mt-2"
                      placeholder="0"
                    />
                    {errors.entries?.[index]?.gesamtvolumenEur && (
                      <p className="text-red-600 text-sm mt-1">
                        {errors.entries[index]?.gesamtvolumenEur?.message}
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
                  foerderbereich: '',
                  kompetenzLevel: 'fortgeschritten',
                  erfolgreicheAntraege: 0,
                  gesamtvolumenEur: 0,
                })
              }
              variant="outline"
              className="w-full"
            >
              + Eintrag hinzufügen
            </Button>

            <div className="flex gap-4 pt-6">
              <Button type="submit" disabled={ladet} size="lg" className="flex-1">
                {ladet ? <LadeSpinner /> : 'Weiter zu Dienstleistungen'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
