'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/store/authStore';
import { addExpertise } from '@/lib/api/berater';
import { toast } from 'sonner';
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
      const results = await Promise.allSettled(
        data.entries.map((entry) => addExpertise(entry)),
      );
      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length > 0) {
        const firstReason = failed[0] && (failed[0] as PromiseRejectedResult).reason;
        const reasonMsg =
          firstReason instanceof Error ? firstReason.message : 'unbekannter Fehler';
        toast.error(
          `${failed.length} von ${data.entries.length} Einträgen konnten nicht gespeichert werden (${reasonMsg}). Bitte erneut versuchen.`,
        );
        setFehler(`${failed.length} Einträge fehlgeschlagen`);
        return;
      }
      toast.success('Alle Einträge gespeichert.');
      router.push('/onboarding/dienstleistungen');
    } catch (error) {
      setFehler(error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten');
    } finally {
      setLadet(false);
    }
  };

  return (
    <div className="min-h-screen bg-architect-surface font-body text-white p-6">
      <div className="max-w-4xl mx-auto">
        <SchrittAnzeige schritte={['Profil', 'Expertise', 'Dienstleistungen']} aktuell={1} />

        <div className="mt-8 bg-architect-surface/60 rounded-lg p-8">
          <h1 className="font-display text-3xl font-bold text-white mb-2">Expertise hinzufügen</h1>
          <p className="text-white/60 mb-8">
            Geben Sie an, in welchen Förderbereichen Sie spezialisiert sind und wie viele erfolgreiche Anträge Sie bereits bearbeitet haben.
          </p>

          {fehler && <FehlerBox fehler={fehler} />}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {fields.map((field, index) => (
              <Card key={field.id} className="p-6 bg-architect-surface-low/40 border-0 text-white">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-display text-lg font-semibold text-white">Expertise #{index + 1}</h3>
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
                  <div>
                    <Label htmlFor={`foerderbereich-${index}`} className="font-semibold">
                      Förderbereich
                    </Label>
                    <Controller
                      name={`entries.${index}.foerderbereich`}
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="mt-2 bg-architect-surface-low/40 border-0 text-white placeholder:text-white/40">
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
                      <p className="text-architect-error-container text-sm mt-1">
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
                      className="mt-2 bg-architect-surface-low/40 border-0 text-white placeholder:text-white/40"
                      placeholder="0"
                    />
                    {errors.entries?.[index]?.erfolgreicheAntraege && (
                      <p className="text-architect-error-container text-sm mt-1">
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
                      className="mt-2 bg-architect-surface-low/40 border-0 text-white placeholder:text-white/40"
                      placeholder="0"
                    />
                    {errors.entries?.[index]?.gesamtvolumenEur && (
                      <p className="text-architect-error-container text-sm mt-1">
                        {errors.entries[index]?.gesamtvolumenEur?.message}
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
              <Button type="submit" disabled={ladet} size="lg" className="flex-1 bg-architect-primary hover:bg-architect-primary-container text-white">
                {ladet ? <LadeSpinner /> : 'Weiter zu Dienstleistungen'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
