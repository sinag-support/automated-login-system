'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MessageCircle, Send, X, Loader2, Sparkles, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

// Always show these 3 suggested questions
const suggestedQuestions = [
  "📊 Show me total accounts",
  "⏳ What's pending?",
  "🔑 Which accounts need password?",
]

export default function SystemSupport() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! 👋 I\'m System Support. Ask me anything about accounts, schedules, or automation, or click one of the suggestions below!'
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)
  
  // Draggable state
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  useEffect(() => {
    if (isLoading && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [isLoading])

  // Draggable logic
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isOpen) return
    e.preventDefault()
    setIsDragging(true)
    const rect = buttonRef.current?.getBoundingClientRect()
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      
      let newX = e.clientX - dragOffset.x
      let newY = e.clientY - dragOffset.y
      
      // Constrain to window edges (with padding)
      const buttonSize = 56 // h-14 w-14 = 56px
      const padding = 16
      
      newX = Math.max(padding, Math.min(window.innerWidth - buttonSize - padding, newX))
      newY = Math.max(padding, Math.min(window.innerHeight - buttonSize - padding, newY))
      
      setPosition({ x: newX, y: newY })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragOffset])

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim()) return

    const userMessage = messageText.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }]
        })
      })

      const data = await response.json()

      if (response.ok) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      } else {
        throw new Error(data.error || 'Failed to get response')
      }
    } catch (error) {
      console.error('Chat error:', error)
      toast.error('Failed to get response')
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = () => {
    sendMessage(input)
  }

  const handleSuggestedClick = (question: string) => {
    sendMessage(question)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Draggable Floating button */}
      <Button
        ref={buttonRef}
        onClick={() => !isDragging && setIsOpen(true)}
        onMouseDown={handleMouseDown}
        className={`fixed rounded-full shadow-lg h-14 w-14 z-50 bg-primary hover:bg-primary/90 transition-shadow ${
          isDragging ? 'cursor-grabbing opacity-90' : 'cursor-grab'
        }`}
        size="icon"
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          right: 'auto',
          bottom: 'auto',
          top: 0,
          left: 0,
        }}
      >
        <Sparkles className="h-6 w-6" />
      </Button>

      {/* Chat window */}
      {isOpen && (
        <>
          {/* Backdrop overlay - closes chat when clicked */}
          <div 
            className="fixed inset-0 z-40 bg-black/50 sm:hidden"
            onClick={() => setIsOpen(false)}
          />
          
          <div className={`fixed z-50 flex flex-col bg-background border shadow-xl ${
            isMobile 
              ? 'inset-0 rounded-none' 
              : 'bottom-24 right-6 w-96 h-[500px] rounded-xl'
          }`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-semibold">System Support</h3>
                  <p className="text-xs text-muted-foreground">Here to help</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsOpen(false)}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            </div>

            {/* Messages container - scrollable area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((message, idx) => (
                <div
                  key={idx}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
              {/* Invisible element to scroll to */}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggested Questions - ALWAYS visible */}
            <div className="px-4 pb-3 pt-1 border-t">
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Suggestions
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((question, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    className="text-xs h-auto py-1.5 px-3 rounded-full"
                    onClick={() => handleSuggestedClick(question)}
                    disabled={isLoading}
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </div>

            {/* Footer - input area */}
            <div className="p-4 border-t shrink-0">
              <div className="flex w-full gap-2">
                <Input
                  placeholder="Ask about the system..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="px-4"
                >
                  Send
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}