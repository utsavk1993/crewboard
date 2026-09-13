import { useRef, useState } from 'react'
import { api, ApiError, errorMessage } from '@/lib/api'
import type { AssistantMessage, AssistantRole } from '@/lib/assistant'

export interface AssistantNotice {
  kind: 'unavailable' | 'error'
  message: string
}

export interface AssistantChat {
  messages: AssistantMessage[]
  pending: boolean
  notice: AssistantNotice | null
  send: (text: string) => Promise<void>
  reset: () => void
}

// crypto.randomUUID only exists in secure contexts, so the app opened over a plain-HTTP LAN address needs a fallback.
function createMessageId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function createMessage(role: AssistantRole, content: string): AssistantMessage {
  return { id: createMessageId(), role, content }
}

/** An in-memory assistant conversation: the whole thread is sent with each question. */
export function useAssistantChat(): AssistantChat {
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState<AssistantNotice | null>(null)

  // Refs are read synchronously, so a quick double Enter can't send twice, and a reply that arrives after
  // "New conversation" is dropped instead of landing in the fresh thread.
  const messagesRef = useRef<AssistantMessage[]>([])
  const pendingRef = useRef(false)
  const conversationRef = useRef(0)

  async function send(text: string) {
    const content = text.trim()
    if (!content || pendingRef.current) return

    const conversation = conversationRef.current
    const history = [...messagesRef.current, createMessage('user', content)]
    messagesRef.current = history
    pendingRef.current = true
    setMessages(history)
    setNotice(null)
    setPending(true)

    try {
      const { message } = await api.sendAssistantMessage(history.map((m) => ({ role: m.role, content: m.content })))
      if (conversation !== conversationRef.current) return

      const next = [...messagesRef.current, createMessage('assistant', message.content)]
      messagesRef.current = next
      setMessages(next)
    } catch (error) {
      if (conversation !== conversationRef.current) return

      setNotice(
        error instanceof ApiError && error.code === 'ASSISTANT_UNAVAILABLE'
          ? { kind: 'unavailable', message: error.message }
          : { kind: 'error', message: errorMessage(error) },
      )
    } finally {
      if (conversation === conversationRef.current) {
        pendingRef.current = false
        setPending(false)
      }
    }
  }

  function reset() {
    conversationRef.current += 1
    messagesRef.current = []
    pendingRef.current = false
    setMessages([])
    setPending(false)
    setNotice(null)
  }

  return { messages, pending, notice, send, reset }
}
