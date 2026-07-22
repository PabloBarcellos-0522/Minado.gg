import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface ChatMessage {
  id: string
  from: string
  text: string
  ts: string
  isSystem?: boolean
}

interface ChatPanelProps {
  messages: ChatMessage[]
  onSend?: (_text: string) => void
  currentUsername?: string
}

export function ChatPanel({ messages, onSend, currentUsername }: ChatPanelProps) {
  const [input, setInput] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = () => {
    if (!input.trim() || !onSend) return
    onSend(input.trim())
    setInput('')
  }

  return (
    <div className="flex flex-col gap-3 bg-surface border border-border rounded-[22px] p-4 max-w-[440px]">
      <div ref={containerRef} className="flex flex-col gap-3 max-h-[240px] overflow-auto pr-1">
        {messages.map((msg) => (
          <div key={msg.id} className="flex gap-2 items-start">
            {msg.isSystem ? (
              <div className="bg-transparent py-1 text-ink-muted italic text-small">
                {msg.text}
              </div>
            ) : (
              <div className="bg-surface-muted rounded-[14px] px-3 py-2">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="font-heading font-bold text-small text-ink">
                    {msg.from}
                    {msg.from === currentUsername && (
                      <span className="text-ink-muted ml-1">(você)</span>
                    )}
                  </span>
                  <span className="text-[0.7rem] text-ink-muted">{msg.ts}</span>
                </div>
                <div className="text-small text-ink">{msg.text}</div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Digite sua mensagem..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1"
        />
        <Button variant="primary" size="sm" onClick={handleSend}>
          Enviar
        </Button>
      </div>
    </div>
  )
}
