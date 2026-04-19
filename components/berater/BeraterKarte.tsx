import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import type { BeraterProfil } from '@/lib/types';

interface BeraterKarteProps {
  berater: BeraterProfil;
}

export function BeraterKarte({ berater }: BeraterKarteProps) {
  const renderStars = (rating: number | undefined) => {
    if (rating === undefined || rating === null) return null;

    const roundedRating = Math.round(rating * 2) / 2;
    const fullStars = Math.floor(roundedRating);
    const hasHalfStar = roundedRating % 1 !== 0;

    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => {
          const isFull = i < fullStars;
          const isHalf = i === fullStars && hasHalfStar;

          return (
            <div key={i} className="relative h-4 w-4">
              <Star
                className="h-4 w-4 text-muted-foreground/60"
                fill="currentColor"
              />
              {(isFull || isHalf) && (
                <div
                  className="absolute top-0 left-0 overflow-hidden"
                  style={{ width: isFull ? '100%' : '50%' }}
                >
                  <Star
                    className="h-4 w-4 text-yellow-400"
                    fill="currentColor"
                  />
                </div>
              )}
            </div>
          );
        })}
        <span className="ml-2 text-sm font-medium text-foreground/80">
          {roundedRating.toFixed(1)}
        </span>
      </div>
    );
  };

  return (
    <Link href={`/berater/${berater.id}`}>
      <div className="group h-full cursor-pointer rounded-lg bg-white p-6 shadow-sm transition-all hover:shadow-md hover:ring-1 hover:ring-blue-200 ring-1 ring-gray-200">
        {/* Header with badges */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground group-hover:text-primary">
              {berater.displayName}
            </h3>
            {berater.region && (
              <p className="mt-1 text-sm text-muted-foreground">{berater.region}</p>
            )}
          </div>
          {berater.verfuegbar && (
            <Badge variant="outline" className="ml-2 bg-chart-5/10 text-chart-5 border-green-200">
              Verfügbar
            </Badge>
          )}
        </div>

        {/* Rating */}
        {berater.ratingAvg !== undefined && (
          <div className="mb-4">
            {renderStars(berater.ratingAvg)}
          </div>
        )}

        {/* Specializations */}
        {berater.branchen && berater.branchen.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">
              Spezialisierungen
            </p>
            <div className="flex flex-wrap gap-1">
              {berater.branchen.slice(0, 3).map((branche) => (
                <Badge key={branche} variant="secondary" className="text-xs">
                  {branche}
                </Badge>
              ))}
              {berater.branchen.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{berater.branchen.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Footer - learn more hint */}
        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-sm font-medium text-primary group-hover:text-primary">
            Profil ansehen →
          </p>
        </div>
      </div>
    </Link>
  );
}
