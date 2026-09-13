import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { CircleAlertIcon, InfoIcon, RotateCcwIcon, SendIcon, SparklesIcon, XIcon } from 'lucide-react'
import { useAssistantChat, type AssistantNotice } from '@/components/assistant/use-assistant-chat'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { AssistantMessage } from '@/lib/assistant'
import { cn } from '@/lib/utils'

export const SUGGESTED_QUESTIONS = [
  "Who's free in Surrey tomorrow afternoon?",
  'Which urgent jobs are still unassigned?',
  'Who has the lightest workload in Metro Vancouver?',
  'Find an EV charger specialist near Langley',
] as const

export interface AssistantPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function EmptyState({ onSelect }: { onSelect: (question: string) => void }) {
  return (
    <div className="flex min-h-full flex-col justify-center gap-5 py-2">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <SparklesIcon aria-hidden="true" className="size-5" />
        </div>
        <p className="text-sm font-medium">How can I help with dispatch?</p>
        <p className="max-w-xs text-sm text-muted-foreground">Ask in plain language, or start with one of these.</p>
      </div>
      <ul aria-label="Suggested questions" className="flex flex-col gap-2">
        {SUGGESTED_QUESTIONS.map((question) => (
          <li key={question}>
            <Button
              variant="outline"
              className="h-auto w-full justify-start px-3 py-2.5 text-left font-normal whitespace-normal"
              onClick={() => onSelect(question)}
            >
              {question}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function MessageBubble({ message }: { message: AssistantMessage }) {
  const fromUser = message.role === 'user'

  return (
    <div className={cn('flex', fromUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed wrap-break-word whitespace-pre-wrap',
          fromUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
        )}
      >
        <span className="sr-only">{fromUser ? 'You: ' : 'Assistant: '}</span>
        {message.content}
      </div>
    </div>
  )
}

const DOT_DELAYS = ['[animation-delay:0ms]', '[animation-delay:200ms]', '[animation-delay:400ms]']

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex h-9 items-center gap-1 rounded-2xl bg-muted px-3.5">
        <span className="sr-only">Assistant is thinking</span>
        {DOT_DELAYS.map((delay) => (
          <span
            key={delay}
            aria-hidden="true"
            className={cn('size-1.5 animate-pulse rounded-full bg-muted-foreground motion-reduce:animate-none', delay)}
          />
        ))}
      </div>
    </div>
  )
}

function NoticeAlert({ notice }: { notice: AssistantNotice }) {
  if (notice.kind === 'unavailable') {
    return (
      <Alert className="bg-muted/50">
        <InfoIcon aria-hidden="true" />
        <AlertTitle>Assistant not connected</AlertTitle>
        <AlertDescription>{notice.message}</AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert variant="destructive">
      <CircleAlertIcon aria-hidden="true" />
      <AlertTitle>Couldn't get an answer</AlertTitle>
      <AlertDescription>{notice.message}</AlertDescription>
    </Alert>
  )
}

interface ConversationLogProps {
  messages: AssistantMessage[]
  pending: boolean
  notice: AssistantNotice | null
  onSelectQuestion: (question: string) => void
}

// Its own component so the scroll effect runs once the sheet content has mounted, not just on later updates.
function ConversationLog({ messages, pending, notice, onSelectQuestion }: ConversationLogProps) {
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const log = logRef.current
    if (log) log.scrollTop = log.scrollHeight
  }, [messages, pending, notice])

  return (
    // Focusable so keyboard users can scroll a long conversation.
    <div
      ref={logRef}
      role="log"
      aria-live="polite"
      aria-label="Conversation"
      tabIndex={0}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset"
    >
      {messages.length === 0 ? (
        <EmptyState onSelect={onSelectQuestion} />
      ) : (
        <div className="flex flex-col gap-3">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {pending && <TypingIndicator />}
          {notice && <NoticeAlert notice={notice} />}
        </div>
      )}
    </div>
  )
}

export function AssistantPanel({ open, onOpenChange }: AssistantPanelProps) {
  const { messages, pending, notice, send, reset } = useAssistantChat()
  const [draft, setDraft] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const hintId = useId()
  const canSend = draft.trim() !== '' && !pending

  function submitDraft() {
    if (!canSend) return
    setDraft('')
    void send(draft)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submitDraft()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter that confirms an IME composition must not send. Safari reports it after compositionend, as keyCode 229.
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing || event.keyCode === 229) return
    event.preventDefault()
    submitDraft()
  }

  function askSuggestedQuestion(question: string) {
    void send(question)
    // The clicked suggestion unmounts, so keep focus in the panel.
    textareaRef.current?.focus()
  }

  function startNewConversation() {
    reset()
    textareaRef.current?.focus()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full gap-0 sm:max-w-md"
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          textareaRef.current?.focus()
        }}
      >
        <SheetHeader className="flex-row items-center gap-3 border-b px-4 py-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <SparklesIcon aria-hidden="true" className="size-4" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <SheetTitle className="text-base leading-6">Assistant</SheetTitle>
            <SheetDescription>Ask about technicians, jobs and availability.</SheetDescription>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="New conversation"
                  disabled={messages.length === 0}
                  onClick={startNewConversation}
                >
                  <RotateCcwIcon aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New conversation</TooltipContent>
            </Tooltip>
            <SheetClose asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Close">
                <XIcon aria-hidden="true" />
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>

        <ConversationLog
          messages={messages}
          pending={pending}
          notice={notice}
          onSelectQuestion={askSuggestedQuestion}
        />

        <SheetFooter className="mt-0 gap-1.5 border-t px-4 py-3">
          <form className="flex items-end gap-2" onSubmit={handleSubmit}>
            <Textarea
              ref={textareaRef}
              rows={1}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question…"
              aria-label="Message the assistant"
              aria-describedby={hintId}
              className="max-h-36 min-h-10 resize-none"
            />
            <Button type="submit" size="icon" aria-label="Send message" disabled={!canSend} className="size-10">
              <SendIcon aria-hidden="true" />
            </Button>
          </form>
          <p id={hintId} className="text-xs text-muted-foreground">
            Enter to send · Shift+Enter for a new line
          </p>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
