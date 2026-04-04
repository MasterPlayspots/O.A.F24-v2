import Link from 'next/link'
import { Foerderprogramm } from '@/lib/types'
import { ArrowRight } from 'lucide-react'

interface ProgrammKarteProps {
  programm: Foerderprogramm
}

function truncateText(text: string, lines: number = 2): string {
  const lineArray = text.split('\n').slice(0, lines)
  return lineArray.join(' ').substring(0, 150) + (text.length > 150 ? '…' : '')
}

export function ProgrammKarte({ programm }: ProgrammKarteProps) {
  const foerderhoehe = programm.foerderhoehe_max
    ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(
        programm.foerderhoehe_max
      )
    : 'Individuell'

  return (
    <Link href={`/programme/${programm.id}`}>
      <div className="group h-full rounded-lg border border-gray-200 bg-white p-6 transition-all duration-200 hover:border-primary hover:shadow-lg dark:border-gray-800 dark:bg-gray-950">
        {/* Header with Badges */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {/* Foerderart Badge */}
            {programm.foerderart && (
              <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                {programm.foerderart}
              </span>
            )}

            {/* Foerdergebiet Badge */}
            {programm.foerdergebiet && (
              <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
                {programm.foerdergebiet}
              </span>
            )}
          </div>

          {/* Titel */}
          <h3 className="text-lg font-semibold text-gray-900 transition-colors duration-200 group-hover:text-primary dark:text-white">
            {programm.titel}
          </h3>
        </div>

        {/* Kurztext */}
        <p className="mt-3 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
          {truncateText(programm.kurztext)}
        </p>

        {/* Footer with Foerderhoehe and Arrow */}
        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-500">Max. Förderung</div>
            <div className="text-lg font-bold text-primary">{foerderhoehe}</div>
          </div>
          <ArrowRight className="h-5 w-5 text-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        </div>
      </div>
    </Link>
  )
}
