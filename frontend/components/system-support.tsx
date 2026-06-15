'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, X, Loader2, Sparkles, ChevronUp, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

// Different suggestion sets that rotate
const suggestionSets = [
  ["📊 Show me total accounts", "⏳ What's pending?", "🔑 Which accounts need password?"],
  ["🤖 How does automation work?", "📅 When does it run?", "⚙️ Check system status"],
  ["➕ How to add account?", "✏️ How to edit account?", "🗑️ How to delete account?"],
  ["📈 Weekly report", "✅ Success rate", "🔄 Reset all accounts"],
  ["🔐 Update password", "⏰ Change login delay", "📝 View recent activity"],
]

export default function SystemSupport() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! 👋 I\'m System Support. Ask me anything about accounts, schedules, or automation!'
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)
  
  // Draggable state - using transform for instant movement
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  
  // Random suggestions that change every time
  const [currentSuggestions, setCurrentSuggestions] = useState(suggestionSets[0])

  // Randomize suggestions on each open
  useEffect(() => {
    if (isOpen) {
      const randomSet = suggestionSets[Math.floor(Math.random() * suggestionSets.length)]
      setCurrentSuggestions(randomSet)
    }
  }, [isOpen])

  // Check if mobile and set initial position
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    // Set initial position to top-right
    const buttonSize = 56
    const padding = 16
    const initialX = window.innerWidth - buttonSize - padding
    const initialY = padding
    setPosition({ x: initialX, y: initialY })
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Typing animation effect
  useEffect(() => {
    if (isLoading) {
      setIsTyping(true)
    }
  }, [isLoading])

  // Touch/mouse drag handlers with INSTANT movement
  const handleDragStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (isOpen) return
    
    e.preventDefault()
    setIsDragging(true)
    
    // Get the current button position
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    
    let clientX, clientY
    if ('touches' in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }
    
    // Calculate offset between finger/mouse and button corner
    const offsetX = clientX - rect.left
    const offsetY = clientY - rect.top
    
    // Store offset for move calculation
    ;(window as any).dragOffset = { x: offsetX, y: offsetY }
  }, [isOpen])

  const handleDragMove = useCallback((e: TouchEvent | MouseEvent) => {
    if (!isDragging) return
    
    e.preventDefault()
    
    let clientX, clientY
    if ('touches' in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }
    
    const offset = (window as any).dragOffset || { x: 28, y: 28 }
    
    let newX = clientX - offset.x
    let newY = clientY - offset.y
    
    // Constrain to window edges
    const buttonSize = 56
    const padding = 8
    
    newX = Math.max(padding, Math.min(window.innerWidth - buttonSize - padding, newX))
    newY = Math.max(padding, Math.min(window.innerHeight - buttonSize - padding, newY))
    
    // Update position instantly
    setPosition({ x: newX, y: newY })
  }, [isDragging])

  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
    delete (window as any).dragOffset
  }, [])

  // Add/remove event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove)
      window.addEventListener('mouseup', handleDragEnd)
      window.addEventListener('touchmove', handleDragMove, { passive: false })
      window.addEventListener('touchend', handleDragEnd)
    }
    
    return () => {
      window.removeEventListener('mousemove', handleDragMove)
      window.removeEventListener('mouseup', handleDragEnd)
      window.removeEventListener('touchmove', handleDragMove)
      window.removeEventListener('touchend', handleDragEnd)
    }
  }, [isDragging, handleDragMove, handleDragEnd])

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim()) return

    const userMessage = messageText.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)
    setIsTyping(true)

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
        // Simulate typing delay for better UX
        setTimeout(() => {
          setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
          setIsTyping(false)
          setIsLoading(false)
        }, 500)
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
      setIsTyping(false)
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

  const handleOpenChat = () => {
    if (!isDragging) {
      setIsOpen(true)
    }
  }

  return (
    <>
      {/* Draggable Floating button - top right, theme color */}
      <button
        ref={buttonRef}
        onClick={handleOpenChat}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        className={`fixed rounded-full shadow-lg h-14 w-14 z-50 bg-background border-2 border-primary hover:shadow-xl transition-all flex items-center justify-center ${
          isDragging ? 'opacity-80 scale-105 cursor-grabbing' : 'cursor-grab'
        }`}
        style={{
          transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
          right: 'auto',
          bottom: 'auto',
          top: 0,
          left: 0,
          touchAction: 'none',
        }}
      >
        <MessageSquare className="h-6 w-6 text-primary" />
      </button>

      {/* Chat window - 60dvh height */}
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
              : 'bottom-24 right-6 w-96 rounded-xl'
          }`}
          style={!isMobile ? { height: '60dvh', maxHeight: '600px', minHeight: '400px' } : {}}>
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
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                </div>
              )}
              {/* Invisible element to scroll to */}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggested Questions - ALWAYS visible with random suggestions */}
            <div className="px-4 pb-3 pt-1 border-t">
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Suggestions
              </p>
              <div className="flex flex-wrap gap-2">
                {currentSuggestions.map((question, idx) => (
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
                  <Send className="h-4 w-4 mr-2" />
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