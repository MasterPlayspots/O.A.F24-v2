'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/store/authStore'
import { useVerifiedGuard } from '@/lib/hooks/useVerifiedGuard'
import { getCheck, chatNachricht } from '@/lib/api/check'
import type { CheckSession, ChatNachricht, CheckErgebnis } from '@/lib/types'
import { SchrittAnzeige } from '@/components/shared/SchrittAnzeige'
import { LadeSpinner } from '@/components/shared/LadeSpinner'
import { FehlerBox } from '@/components/shared/FehlerBox'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { ArrowRight } from 'lucide-react'

const SCHRITTE = ['Angaben', 'Chat', 'Dokumente', 'Analyse', 'Ergebnisse']

interface CombinedCheck extends CheckSession {
  nachrichten: ChatNachricht[]
  ergebnisse: CheckErgebnis[]
}

export default function ChatPage() {
  const { loading } = useVerifiedGuard()
  const { token } = useAuth()
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string

  const [check, setCheck] = useState<CombinedCheck | null>(null)
  const [messages, setMessages] = useState<ChatNachricht[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load initial check data
  useEffect(() => {
    if (!token || !sessionId) return

    const loadCheck = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const data = await getCheck(sessionId, token)
        setCheck(data)
        setMessages(data.nachrichten || [])

        // Redirect if status changed to dokumente
        if (data.status === 'dokumente') {
          router.push(`/foerdercheck/${sessionId}/dokumente`)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Fehler beim Laden'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    loadCheck()
  }, [token, sessionId, router])

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!inputValue.trim() || !token || !sessionId) return

    const userMessage = inputValue
    setInputValue('')

    // Add user message to local state immediately
    const newUserMessage: ChatNachricht = {
      id: `local-${Date.now()}`,
      rolle: 'user',
      nachricht: userMessage,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, newUserMessage])

    try {
      setIsSubmitting(true)
      setError(null)

      const response = await chatNachricht(sessionId, userMessage, token)

      // Add agent response
      if (response.nachricht) {
        setMessages((prev) => [...prev, response.nachricht])
      }

      // Check if status changed
      if (response.status === 'dokumente') {
        setTimeout(() => {
          router.push(`/foerdercheck/${sessionId}/dokumente`)
        }, 1000)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fehler beim Senden'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkipChat = () => {
    if (sessionId) {
      router.push(`/foerdercheck/${sessionId}/dokumente`)
    }
  }

  if (loading || isLoading) {
    return <LadeSpinner text="Chat wird geladen..." />
  }

  if (!check) {
    return <FehlerBox fehler="Check-Session konnte nicht geladen werden" />
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4">
      <div className="mx-auto max-w-2xl">
        <SchrittAnzeige schritte={SCHRITTE} aktuell={1} />

        <Card className="mb-6 p-6">
          <h1 className="text-2xl font-bold">Chat mit dem Fördercheck-Assistenten</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Beantworten Sie ein paar Fragen, um die passenden Programme zu finden
          </p>
        </Card>

        {error && (
          <div className="mb-6">
            <FehlerBox fehler={error} onNeuLaden={() => setError(null)} />
          </div>
        )}

        {/* Chat Messages */}
        <Card className="mb-6 flex h-96 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <p>Keine Nachrichten. Starten Sie ein Gespräch!</p>
              </div>
            )}

            {messages.map((msg: ChatNachricht) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.rolle === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-xs rounded-lg px-4 py-2 text-sm ${
                    msg.rolle === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  {msg.nachricht}
                </div>
              </div>
            ))}

            {isSubmitting && (
              <div className="flex justify-start gap-3">
                <div className="max-w-xs rounded-lg bg-muted px-4 py-2 text-sm text-foreground">
                  <div className="flex gap-1">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
                    <div
                      className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"
                      style={{ animationDelay: '0.1s' }}
                    />
                    <div
                      className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"
                      style={{ animationDelay: '0.2s' }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t bg-muted/30 p-4">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Textarea
                value={inputValue}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                  setInputValue(e.target.value)
                }}
                onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage(e as unknown as React.FormEvent<HTMLFormElement>)
                  }
                }}
                placeholder="Schreiben Sie Ihre Antwort... (Enter zum Senden, Shift+Enter für Zeilenumbruch)"
                className="resize-none"
                rows={3}
                disabled={isSubmitting}
              />
              <Button
                type="submit"
                disabled={isSubmitting || !inputValue.trim()}
                size="icon"
                className="h-12 w-12 self-end"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={handleSkipChat}
            disabled={isSubmitting}
            className="flex-1"
          >
            Chat überspringen →
          </Button>
        </div>
      </div>
    </div>
  )
}
