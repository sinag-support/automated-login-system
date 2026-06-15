'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { Bot, Send, X, Loader2, MessageCircle, Sparkles, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import { CreateMLCEngine, MLCEngineInterface, ChatCompletionMessageParam } from '@mlc-ai/web-llm'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Position {
  x: number
  y: number
}

const SYSTEM_PROMPT = `You are an AI assistant specialized in the Login Automation System. 
Your role is to help users understand and use this system effectively.

About the system:
- This is a login automation system for store accounts on https://ph.pmiandu.com
- It automates daily logins for multiple store accounts scheduled on Monday-Saturday
- The system uses GitHub Actions (not Railway) for automation, triggered either by schedule (Mon-Sat 8am UTC) or manually from the Schedule page
- Accounts can be in 3 statuses: 'pending' (needs processing), 'success' (login successful), 'needs_password_update' (login failed - needs new password)
- Every Sunday, all accounts are automatically reset to 'pending' status
- The Dashboard shows overview stats (total accounts, successful, needs password, pending)
- The Accounts page allows CRUD operations on store accounts (mobile number, store name, login day)
- The Schedule page shows accounts grouped by day and allows manual triggering of automation
- The Reports page shows weekly activity and status breakdown by day
- The Settings page configures automation behavior (delay between logins, max retries, auto-retry)

Your capabilities:
- Answer questions about how the system works
- Explain features and navigation
- Provide troubleshooting help
- Suggest best practices
- Never give advice outside of this system
- Keep responses concise and helpful

You are a helpful, knowledgeable assistant for this specific system. Always be polite and professional.`

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! 👋 I\'m your Login Automation Assistant. Ask me anything about how the system works, managing accounts, scheduling, or troubleshooting!'
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [engine, setEngine] = useState<MLCEngineInterface | null>(null)
  const [isLoadingModel, setIsLoadingModel] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [position, setPosition] = useState<Position>({ x: 24, y: 24 }) // bottom-6 right-6 in pixels
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 })
  const [buttonPosition, setButtonPosition] = useState<Position>({ x: 0, y: 0 })
  const scrollRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Initialize the AI model
  useEffect(() => {
    if (isOpen && !engine && !isLoadingModel) {
      initModel()
    }
  }, [isOpen])

  const initModel = async () => {
    setIsLoadingModel(true)
    setDownloadProgress(0)
    try {
      const initProgressCallback = (report: any) => {
        if (report.progress) {
          setDownloadProgress(Math.round(report.progress * 100))
        }
        console.log(`Loading model: ${Math.round(report.progress * 100)}%`)
      }
      
      const newEngine = await CreateMLCEngine(
        'Phi-3-mini-4k-instruct-q4f16_1-MLC',
        { initProgressCallback: initProgressCallback }
      )
      
      setEngine(newEngine)
      toast.success('AI assistant ready!')
      setTimeout(() => setDownloadProgress(0), 1000)
    } catch (error) {
      console.error('Failed to load AI model:', error)
      toast.error('Failed to load AI model. Please refresh.')
    } finally {
      setIsLoadingModel(false)
    }
  }

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Handle dragging
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true)
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    setDragStart({ x: clientX, y: clientY })
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setButtonPosition({ x: rect.left, y: rect.top })
    }
  }

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return
    e.preventDefault()
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    const deltaX = clientX - dragStart.x
    const deltaY = clientY - dragStart.y
    
    const newX = Math.min(Math.max(0, buttonPosition.x + deltaX), window.innerWidth - 64)
    const newY = Math.min(Math.max(0, buttonPosition.y + deltaY), window.innerHeight - 64)
    
    setPosition({ x: newX, y: newY })
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove as any)
      window.addEventListener('mouseup', handleDragEnd)
      window.addEventListener('touchmove', handleDragMove as any)
      window.addEventListener('touchend', handleDragEnd)
      return () => {
        window.removeEventListener('mousemove', handleDragMove as any)
        window.removeEventListener('mouseup', handleDragEnd)
        window.removeEventListener('touchmove', handleDragMove as any)
        window.removeEventListener('touchend', handleDragEnd)
      }
    }
  }, [isDragging, dragStart, buttonPosition])

  const sendMessage = async () => {
    if (!input.trim()) return
    if (!engine) {
      toast.error('AI model is still loading. Please wait...')
      return
    }

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const conversation: ChatCompletionMessageParam[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.slice(-5).map((m): ChatCompletionMessageParam => ({
          role: m.role,
          content: m.content
        })),
        { role: 'user', content: userMessage }
      ]

      const response = await engine.chat.completions.create({
        messages: conversation,
        temperature: 0.7,
        max_tokens: 500,
        stream: false,
      })

      const assistantMessage = response.choices[0]?.message?.content || 'Sorry, I couldn\'t process that.'
      setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }])
    } catch (error) {
      console.error('AI response error:', error)
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* Floating button - Draggable */}
      <div
        style={{
          position: 'fixed',
          bottom: position.y,
          right: position.x,
          zIndex: 50,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
      >
        <Button
          ref={buttonRef}
          onClick={() => !isDragging && setIsOpen(true)}
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          className="rounded-full shadow-lg h-14 w-14 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
          size="icon"
        >
          <MessageCircle className="h-6 w-6 text-white" />
        </Button>
      </div>

      {/* Chat window - Draggable */}
      {isOpen && (
        <div
          className="fixed z-50"
          style={{
            bottom: `calc(${position.y}px + 80px)`,
            right: position.x,
          }}
        >
          <Card className="w-[90vw] sm:w-96 h-[560px] flex flex-col shadow-2xl border-0">
            {/* Header with drag handle */}
            <CardHeader 
              className="p-4 border-b bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-t-lg cursor-move"
              onMouseDown={handleDragStart}
              onTouchStart={handleDragStart}
            >
              <div className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  <CardTitle className="text-base font-semibold">AI Assistant</CardTitle>
                  {isLoadingModel && (
                    <Loader2 className="h-3 w-3 animate-spin ml-2 text-white/80" />
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <GripVertical className="h-4 w-4 text-white/70 cursor-move" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:bg-white/20"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {/* Download Progress Bar */}
            {isLoadingModel && downloadProgress > 0 && (
              <div className="px-4 pt-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Loading AI model...</span>
                  <span>{downloadProgress}%</span>
                </div>
                <Progress value={downloadProgress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  First time setup - this will only happen once
                </p>
              </div>
            )}

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((message, idx) => (
                  <div
                    key={idx}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg p-3 ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                {isLoadingModel && downloadProgress === 0 && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Preparing AI model...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input Area */}
            <CardFooter className="p-4 pt-0 border-t mt-auto">
              <div className="flex w-full gap-2">
                <Input
                  placeholder="Ask me anything about the system..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading || isLoadingModel || !engine}
                  className="flex-1 text-sm"
                />
                <Button
                  size="icon"
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading || isLoadingModel || !engine}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      )}
    </>
  )
}