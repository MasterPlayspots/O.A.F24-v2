'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePreCheck } from '@/lib/store/preCheckStore'
import { sendeAntwort, fuehreScoring } from '@/lib/api/precheck'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { FehlerBox } from '@/components/shared/FehlerBox'
import { motion } from 'framer-motion'

export default function ChatPage() {
  const router = useRouter()
  const store = usePreCheck()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string>('')
  const [textAnswer, setTextAnswer] = useState<string>('')
  const [numberAnswer, setNumberAnswer] = useState<string>('')

  // Redirect guard — must run as an effect, not during render.
  const shouldRedirect =
    !store.sessionId || store.phase !== 'chat' || !store.aktiveFrage
  useEffect(() => {
    if (shouldRedirect) router.push('/foerder-schnellcheck')
  }, [shouldRedirect, router])
  if (shouldRedirect) return null

  // After the guard, aktiveFrage is guaranteed non-null — but TS can't
  // narrow across the useEffect boundary. Pull into a local const.
  const aktiveFrage = store.aktiveFrage!
  const progress = ((store.aktiveFrageIndex + 1) / store.fragen.length) * 100

  const handleSubmit = async () => {
    try {
      setError(null)
      setIsSubmitting(true)

      // Type safety: ensure aktiveFrage and sessionId are not null
      if (!store.aktiveFrage || !store.sessionId) {
        setError('Sitzung ungültig')
        setIsSubmitting(false)
        return
      }

      let answer = ''
      switch (aktiveFrage.antwortTyp) {
        case 'ja_nein':
          answer = selectedAnswer
          break
        case 'auswahl':
          answer = selectedAnswer
          break
        case 'text':
          answer = textAnswer.trim()
          break
        case 'zahl':
          answer = numberAnswer.trim()
          break
      }

      if (!answer) {
        setError('Bitte beantworten Sie die Frage')
        setIsSubmitting(false)
        return
      }

      // Send answer
      await sendeAntwort(store.sessionId, aktiveFrage.id, answer)

      // Check if last question
      if (store.aktiveFrageIndex === store.fragen.length - 1) {
        // Run scoring
        const scoring = await fuehreScoring(store.sessionId)
        store.setScoring(scoring)
        router.push('/foerder-schnellcheck/ergebnis')
      } else {
        // Next question
        store.beantworteAktiveFrage(answer)
        setSelectedAnswer('')
        setTextAnswer('')
        setNumberAnswer('')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Fehler beim Speichern der Antwort'
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTextAnswer(e.target.value)
  }

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNumberAnswer(e.target.value)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div className="space-y-8">
      <h1 className="sr-only">Fördercheck — Fragebogen</h1>
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white/80">
            Frage {store.aktiveFrageIndex + 1} von {store.fragen.length}
          </span>
          <span className="text-sm text-white/50">
            {Math.round(progress)}%
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Error */}
      {error && <FehlerBox fehler={error} />}

      {/* Question Card */}
      <motion.div
        key={aktiveFrage.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-architect-surface/60 rounded-lg p-6 sm:p-8 space-y-6"
      >
        {/* Question */}
        <div className="space-y-2">
          <h2 className="font-display text-2xl font-bold text-white">
            {aktiveFrage.frage}
          </h2>
          {aktiveFrage.kontext && (
            <p className="text-white/70 text-sm">
              {aktiveFrage.kontext}
            </p>
          )}
        </div>

        {/* Answer Input */}
        <div className="space-y-4">
          {aktiveFrage.antwortTyp === 'ja_nein' && (
            <div className="flex gap-3 sm:flex-row flex-col">
              <Button
                size="lg"
                onClick={() => setSelectedAnswer('ja')}
                className={`flex-1 ${selectedAnswer === 'ja' ? 'bg-architect-primary hover:bg-architect-primary-container text-white' : 'bg-architect-surface-low/40 hover:bg-architect-surface/40 text-white'}`}
                disabled={isSubmitting}
              >
                Ja
              </Button>
              <Button
                size="lg"
                onClick={() => setSelectedAnswer('nein')}
                className={`flex-1 ${selectedAnswer === 'nein' ? 'bg-architect-primary hover:bg-architect-primary-container text-white' : 'bg-architect-surface-low/40 hover:bg-architect-surface/40 text-white'}`}
                disabled={isSubmitting}
              >
                Nein
              </Button>
            </div>
          )}

          {aktiveFrage.antwortTyp === 'auswahl' && (
            <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
              <div className="space-y-3">
                {aktiveFrage.optionen?.map((option) => (
                  <div key={option} className="flex items-center space-x-3 p-3 rounded-lg bg-architect-surface-low/40 hover:bg-architect-surface/40 cursor-pointer">
                    <RadioGroupItem value={option} id={option} />
                    <Label htmlFor={option} className="cursor-pointer flex-1 text-white">
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          )}

          {aktiveFrage.antwortTyp === 'text' && (
            <Input
              placeholder="Ihre Antwort..."
              value={textAnswer}
              onChange={handleInputChange}
              disabled={isSubmitting}
              className="h-12 bg-architect-surface-low/40 border-0 text-white placeholder:text-white/40"
              onKeyDown={handleKeyDown}
            />
          )}

          {aktiveFrage.antwortTyp === 'zahl' && (
            <Input
              type="number"
              placeholder="Zahl eingeben..."
              value={numberAnswer}
              onChange={handleNumberChange}
              disabled={isSubmitting}
              className="h-12 bg-architect-surface-low/40 border-0 text-white placeholder:text-white/40"
              onKeyDown={handleKeyDown}
            />
          )}
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          size="lg"
          className="w-full bg-architect-primary hover:bg-architect-primary-container text-white"
        >
          {isSubmitting ? (
            <>
              <span className="mr-2">Wird gespeichert...</span>
            </>
          ) : store.aktiveFrageIndex === store.fragen.length - 1 ? (
            'Analyse abschließen'
          ) : (
            'Weiter'
          )}
        </Button>
      </motion.div>
    </div>
  )
}
