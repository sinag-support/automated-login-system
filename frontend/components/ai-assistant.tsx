'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bot, Send, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { CreateMLCEngine, MLCEngineInterface, ChatCompletionMessageParam } from '@mlc-ai/web-llm'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

// System prompt that teaches the AI about your Login Automation System
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
      content: 'Hello! I\'m your Login Automation Assistant. Ask me anything about how the system works, managing accounts, scheduling, or troubleshooting!'
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [engine, setEngine] = useState<MLCEngineInterface | null>(null)
  const [isLoadingModel, setIsLoadingModel] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Initialize the AI model
  useEffect(() => {
    if (isOpen && !engine && !isLoadingModel) {
      initModel()
    }
  }, [isOpen])

  const initModel = async () => {
    setIsLoadingModel(true)
    try {
      // Use a small, efficient model (Phi-3 Mini)
      const initProgressCallback = (report: any) => {
        console.log(`Loading model: ${Math.round(report.progress * 100)}%`)
      }
      
      const newEngine = await CreateMLCEngine(
        'Phi-3-mini-4k-instruct-q4f16_1-MLC',
        { initProgressCallback: initProgressCallback }
      )
      
      setEngine(newEngine)
      toast.success('AI assistant ready!')
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
      // Build conversation context with proper typing
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
      {/* Floating button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 rounded-full shadow-lg h-14 w-14 z-50"
        size="icon"
      >
        <Bot className="h-6 w-6" />
      </Button>

      {/* Chat window */}
      {isOpen && (
        <Card className="fixed bottom-24 right-6 w-[90vw] sm:w-96 h-[500px] flex flex-col shadow-xl z-50">
          <CardHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">AI Assistant</CardTitle>
              {isLoadingModel && (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-2" />
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>

          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-3">
              {messages.map((message, idx) => (
                <div
                  key={idx}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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
              {isLoadingModel && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs">Loading AI model... (first time only)</p>
                    <p className="text-xs text-muted-foreground">This may take a few seconds.</p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <CardFooter className="p-4 pt-0 border-t mt-auto">
            <div className="flex w-full gap-2">
              <Input
                placeholder="Ask about the system..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading || isLoadingModel || !engine}
                className="flex-1"
              />
              <Button
                size="icon"
                onClick={sendMessage}
                disabled={!input.trim() || isLoading || isLoadingModel || !engine}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}
    </>
  )
}