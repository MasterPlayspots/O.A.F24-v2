'use client'

import { create } from 'zustand'
import type { PrecheckPhase, PrecheckProfil, PrecheckFrage, PrecheckScoring } from '../types'

interface PrecheckAntwort {
  frageId: string
  antwort: string
}

interface PreCheckState {
  phase: PrecheckPhase
  sessionId: string | null
  websiteUrl: string
  profil: PrecheckProfil | null
  fragen: PrecheckFrage[]
  aktiveFrage: PrecheckFrage | null
  aktiveFrageIndex: number
  antworten: PrecheckAntwort[]
  scoring: PrecheckScoring | null
  fehlerMeldung: string | null

  setPhase: (phase: PrecheckPhase) => void
  setWebsiteUrl: (url: string) => void
  setSession: (id: string, profil: PrecheckProfil) => void
  setFragen: (fragen: PrecheckFrage[]) => void
  beantworteAktiveFrage: (antwort: string) => void
  naechsteFrage: () => void
  setScoring: (scoring: PrecheckScoring) => void
  setFehler: (msg: string) => void
  reset: () => void
}

const initialState = {
  phase: 'url_eingabe' as PrecheckPhase,
  sessionId: null,
  websiteUrl: '',
  profil: null,
  fragen: [],
  aktiveFrage: null,
  aktiveFrageIndex: 0,
  antworten: [],
  scoring: null,
  fehlerMeldung: null,
}

export const usePreCheck = create<PreCheckState>()((set, get) => ({
  ...initialState,

  setPhase: (phase) => set({ phase }),

  setWebsiteUrl: (url) => set({ websiteUrl: url }),

  setSession: (id, profil) =>
    set({ sessionId: id, profil, phase: 'profil_ready' }),

  setFragen: (fragen) =>
    set({
      fragen,
      aktiveFrage: fragen[0] ?? null,
      aktiveFrageIndex: 0,
      phase: 'chat',
    }),

  beantworteAktiveFrage: (antwort) => {
    const { aktiveFrage, antworten } = get()
    if (!aktiveFrage) return
    const neueAntworten = [...antworten, { frageId: aktiveFrage.id, antwort }]
    set({ antworten: neueAntworten })
    get().naechsteFrage()
  },

  naechsteFrage: () => {
    const { fragen, aktiveFrageIndex } = get()
    const nextIndex = aktiveFrageIndex + 1
    if (nextIndex < fragen.length) {
      set({
        aktiveFrageIndex: nextIndex,
        aktiveFrage: fragen[nextIndex],
      })
    } else {
      set({ phase: 'scoring_laeuft', aktiveFrage: null })
    }
  },

  setScoring: (scoring) => set({ scoring, phase: 'ergebnis' }),

  setFehler: (msg) => set({ fehlerMeldung: msg, phase: 'fehler' }),

  reset: () => set(initialState),
}))
