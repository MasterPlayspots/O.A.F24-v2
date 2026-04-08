'use client';

import { useState, useEffect } from 'react';
import { getBeraterListe } from '@/lib/api/check';
import { BeraterKarte } from '@/components/berater/BeraterKarte';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { BeraterProfil } from '@/lib/types';

const BUNDESLAENDER = [
  { value: '', label: 'Alle Bundesländer' },
  { value: 'BW', label: 'Baden-Württemberg' },
  { value: 'BY', label: 'Bayern' },
  { value: 'BE', label: 'Berlin' },
  { value: 'BB', label: 'Brandenburg' },
  { value: 'HB', label: 'Bremen' },
  { value: 'HH', label: 'Hamburg' },
  { value: 'HE', label: 'Hessen' },
  { value: 'MV', label: 'Mecklenburg-Vorpommern' },
  { value: 'NI', label: 'Niedersachsen' },
  { value: 'NW', label: 'Nordrhein-Westfalen' },
  { value: 'RP', label: 'Rheinland-Pfalz' },
  { value: 'SL', label: 'Saarland' },
  { value: 'SN', label: 'Sachsen' },
  { value: 'ST', label: 'Sachsen-Anhalt' },
  { value: 'SH', label: 'Schleswig-Holstein' },
  { value: 'TH', label: 'Thüringen' },
];

const SPEZIALISIERUNGEN = [
  { value: '', label: 'Alle Spezialisierungen' },
  { value: 'Digital', label: 'Digitalisierung' },
  { value: 'Innovation', label: 'Innovation' },
  { value: 'Nachhaltigkeit', label: 'Nachhaltigkeit' },
  { value: 'Export', label: 'Export' },
  { value: 'Mittelstand', label: 'Mittelstand' },
  { value: 'Handwerk', label: 'Handwerk' },
];

export default function BeraterPage() {
  const [beraterListe, setBeraterListe] = useState<BeraterProfil[]>([]);
  const [filteredBerater, setFilteredBerater] = useState<BeraterProfil[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBundesland, setSelectedBundesland] = useState<string>('');
  const [selectedSpezialisierung, setSelectedSpezialisierung] = useState<string>('');

  useEffect(() => {
    const fetchBerater = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getBeraterListe();
        setBeraterListe(data.berater);
        setFilteredBerater(data.berater);
      } catch (err) {
        console.error('Fehler beim Laden der Berater:', err);
        setError(
          'Entschuldigung, wir konnten die Beraterliste nicht laden. Bitte versuchen Sie es später erneut.'
        );
        setBeraterListe([]);
        setFilteredBerater([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBerater();
  }, []);

  useEffect(() => {
    let filtered = [...beraterListe];

    if (selectedBundesland) {
      filtered = filtered.filter((b) => b.region?.includes(selectedBundesland));
    }

    if (selectedSpezialisierung) {
      filtered = filtered.filter((b) =>
        b.branchen?.some((branch) => branch.includes(selectedSpezialisierung))
      );
    }

    setFilteredBerater(filtered);
  }, [selectedBundesland, selectedSpezialisierung, beraterListe]);

  const handleBundeslandChange = (value: string | null) => {
    setSelectedBundesland(value ?? '');
  };

  const handleSpezialisierungChange = (value: string | null) => {
    setSelectedSpezialisierung(value ?? '');
  };

  return (
    <div className="min-h-screen bg-architect-surface font-body text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display mb-2 text-4xl font-bold text-white">
            Fachberatungen
          </h1>
          <p className="text-lg text-white/70">
            Finden Sie die richtige Beratung für Ihr Unternehmen
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 rounded-lg bg-architect-surface/60 p-6">
          <h2 className="font-display mb-4 text-sm font-semibold text-white">Filter</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                Bundesland
              </label>
              <Select value={selectedBundesland} onValueChange={handleBundeslandChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Bundesland wählen" />
                </SelectTrigger>
                <SelectContent>
                  {BUNDESLAENDER.map((land) => (
                    <SelectItem key={land.value} value={land.value}>
                      {land.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                Spezialisierung
              </label>
              <Select value={selectedSpezialisierung} onValueChange={handleSpezialisierungChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Spezialisierung wählen" />
                </SelectTrigger>
                <SelectContent>
                  {SPEZIALISIERUNGEN.map((spec) => (
                    <SelectItem key={spec.value} value={spec.value}>
                      {spec.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-8 rounded-lg bg-architect-error/20 p-4">
            <p className="text-sm text-architect-error-container">{error}</p>
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-lg" />
            ))}
          </div>
        ) : filteredBerater.length === 0 ? (
          <div className="rounded-lg bg-architect-surface/60 p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-white/40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <h3 className="font-display mt-4 text-lg font-medium text-white">
              Keine Beratungen gefunden
            </h3>
            <p className="mt-2 text-sm text-white/60">
              Versuchen Sie, die Filter anzupassen und erneut zu suchen.
            </p>
          </div>
        ) : (
          <div>
            <p className="mb-6 text-sm font-medium text-white/60">
              {filteredBerater.length}{' '}
              {filteredBerater.length === 1 ? 'Beratung' : 'Beratungen'} gefunden
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredBerater.map((berater) => (
                <BeraterKarte key={berater.id} berater={berater} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
