'use client'

import React, { useState, useEffect } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'

const LOADING_MESSAGES_POOL = [
  'Audio cassettes have more fidelity than YouTube streaming',
  'The first computer mouse was made of wood',
  'CAPTCHA stands for "Completely Automated Public Turing test"',
  'The first 1GB hard drive weighed over 500 pounds',
  'The first domain ever registered was symbolics.com in 1985',
  'Email existed before the World Wide Web',
  'The first computer bug was an actual moth trapped in a relay',
  'QWERTY keyboards were designed to slow typists down',
  'The average person blinks 15-20 times per minute, except when reading a screen',
  'The "@" symbol was chosen for email because it wasn\'t used in names',
  'The first webcam was created to monitor a coffee pot at Cambridge',
  'Nintendo was founded in 1889 as a playing card company',
  'The first computer programmer was Ada Lovelace in the 1840s',
  'GPS is free for everyone because it\'s funded by US taxpayers',
  'The first YouTube video was uploaded on April 23, 2005',
  'Computer passwords were invented at MIT in the early 1960s',
  'The Firefox logo isn\'t a fox — it\'s a red panda',
  'The first Apple computer sold for $666.66',
  'Bluetooth is named after a 10th-century Viking king',
  'The Space Invaders arcade game caused a coin shortage in Japan',
  'The first SMS text message said "Merry Christmas"',
  'USB was designed to replace 20+ types of connectors',
  'The first hard disk drive could only store 5MB',
  'Ethernet was named after the "luminiferous ether" from physics',
  'CD-ROMs were originally designed to hold 74 minutes of music',
  'The inventor of the web, Tim Berners-Lee, gave it away for free',
  'Computer mice were nicknamed after their tail-like cable',
  'The first video game console was the Magnavox Odyssey in 1972',
  'Wi-Fi doesn\'t stand for anything — it\'s just a made-up name',
  'The Sony Walkman was originally called the "Soundabout"',
  'The first computer virus was created in 1983 as an experiment',
  'LED lights were invented in 1962 but only made red light at first',
  'The Ctrl+Alt+Delete combination was meant to be hard to press accidentally',
  'The first computer could only do 5,000 calculations per second',
  'Nintendo means "leave luck to heaven" in Japanese',
  'The floppy disk icon for "save" is becoming a relic most Gen Z has never seen',
  'JPEG compression can make a 10MB image into 1MB by throwing away data you won\'t miss',
  'Moore\'s Law predicted transistor density doubling every 2 years — it held for 50 years',
  'The first website is still online at info.cern.ch',
  'HTML was invented in 1991 and hasn\'t fundamentally changed since',
  'The PNG format was created to replace GIF after patent issues',
  'Localhost 127.0.0.1 always points to your own computer',
  'The term "bug" predates computers — Thomas Edison used it in the 1870s',
  'Amazon was originally going to be called "Cadabra" as in "abracadabra"',
  'The first banner ad on the web had a 44% click-through rate',
  'RSS stands for "Really Simple Syndication" and almost nobody uses it anymore',
  'JavaScript was created in just 10 days in 1995',
  'The first iPhone didn\'t have copy and paste',
  'Google\'s original name was "BackRub"',
  'The GIF format is pronounced "jif" according to its creator (but everyone says "gif")',
  'TCP/IP was designed to survive a nuclear war',
  'The "404 Not Found" error was named after a room number at CERN',
  'MP3 technology is over 30 years old',
  'Windows 95 had a secret flight simulator in Excel',
  'The first spam email was sent in 1978 to 400 people',
  'Linux was created by a 21-year-old Finnish student',
  'The first computer programmer was a woman in the 1840s',
  'Bitcoin\'s creator, Satoshi Nakamoto, is still unknown',
  'QR codes were invented in 1994 for tracking car parts',
  'The first emoticon was :-) created in 1982',
  'FORTRAN is the oldest programming language still in use today',
  'The first dot-com domain was registered in 1985',
  'The ALT key was originally for "alternate" character input',
  'IBM\'s Deep Blue beat Kasparov at chess in 1997',
  'The first computer game was created in 1958 — a tennis simulation',
]

// Helper to shuffle array
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

type Message = {
  role: 'user' | 'assistant'
  content: string
}

export function DocsSearch() {
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)
  const [loadingMessages, setLoadingMessages] = useState<string[]>(['While you wait...', ...shuffleArray(LOADING_MESSAGES_POOL)])

  // Rotate loading messages every 3.5 seconds
  useEffect(() => {
    if (!loading) {
      setLoadingMessageIndex(0)
      // Reshuffle for next time
      setLoadingMessages(['While you wait...', ...shuffleArray(LOADING_MESSAGES_POOL)])
      return
    }

    const interval = setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length)
    }, 3500)

    return () => clearInterval(interval)
  }, [loading])

  const handleSearch = async (e: React.FormEvent, presetQuery?: string) => {
    e.preventDefault()

    const searchQuery = presetQuery || query

    if (!searchQuery.trim() || searchQuery.trim().length < 3) {
      setError('Please enter at least 3 characters')
      return
    }

    if (searchQuery.length > 500) {
      setError('Query is too long (max 500 characters)')
      return
    }

    const userMessage: Message = { role: 'user', content: searchQuery.trim() }
    const newMessages = [...messages, userMessage]

    setMessages(newMessages)
    setLoading(true)
    setError('')
    setQuery('')

    try {
      const response = await fetch('/api/docs-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: newMessages }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to search')
      }

      const assistantMessage: Message = { role: 'assistant', content: data.answer }
      setMessages([...newMessages, assistantMessage])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      // Remove the user message if request failed
      setMessages(messages)
    } finally {
      setLoading(false)
    }
  }

  const clearConversation = () => {
    setMessages([])
    setQuery('')
    setError('')
  }

  const handlePresetQuestion = (question: string) => {
    const syntheticEvent = { preventDefault: () => {} } as React.FormEvent
    handleSearch(syntheticEvent, question)
  }

  return (
    <div className="space-y-4">
      {/* Conversation Thread */}
      {messages.length > 0 && (
        <div className="space-y-4">
          {messages.map((message, idx) => (
            <div
              key={idx}
              className={cn(
                'rounded-lg border p-4',
                message.role === 'user'
                  ? 'bg-blue-50/50'
                  : ''
              )}
              style={{
                borderColor: message.role === 'user' ? 'var(--accent-blue)33' : 'var(--border-default)',
                background: message.role === 'user' ? 'var(--bg-blue-subtle)' : 'var(--bg-default)',
              }}
            >
              {message.role === 'user' ? (
                <div>
                  <div className="text-xs font-medium mb-2" style={{ color: 'var(--accent-blue)' }}>
                    You asked:
                  </div>
                  <div className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                    {message.content}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--accent-blue)' }}>
                    <span className="text-base">🐵</span>
                    <span>GreaseMonkey</span>
                  </div>
                  <div className="prose prose-neutral dark:prose-invert prose-sm max-w-none">
                    <ReactMarkdown
                      components={{
                        h1: ({ ...props }) => <h3 className="text-lg font-semibold mt-4 mb-2" style={{ color: 'var(--text-primary)' }} {...props} />,
                        h2: ({ ...props }) => <h4 className="text-base font-semibold mt-3 mb-2" style={{ color: 'var(--text-primary)' }} {...props} />,
                        h3: ({ ...props }) => <h5 className="text-sm font-semibold mt-2 mb-1" style={{ color: 'var(--text-primary)' }} {...props} />,
                        p: ({ children, ...props }) => {
                          // Convert .md file mentions and API references to clickable links
                          const processedChildren = React.Children.map(children, (child) => {
                            if (typeof child === 'string') {
                              // Split by both .md files and API endpoint references
                              const parts = child.split(/(\S+\.md|API endpoints? (?:reference|page|section|catalog))/gi)
                              return parts.map((part, idx) => {
                                if (part.endsWith('.md')) {
                                  const slug = part.replace('.md', '')
                                  return (
                                    <a
                                      key={idx}
                                      href={`/documents?doc=${slug}`}
                                      className="text-blue-600 hover:underline font-medium"
                                      onClick={(e) => {
                                        e.preventDefault()
                                        window.location.href = `/documents?doc=${slug}`
                                      }}
                                    >
                                      {part}
                                    </a>
                                  )
                                }
                                if (/API endpoints? (?:reference|page|section|catalog)/i.test(part)) {
                                  return (
                                    <a
                                      key={idx}
                                      href="/api-spec"
                                      className="text-blue-600 hover:underline font-medium"
                                      onClick={(e) => {
                                        e.preventDefault()
                                        window.location.href = '/api-spec'
                                      }}
                                    >
                                      {part}
                                    </a>
                                  )
                                }
                                return part
                              })
                            }
                            return child
                          })
                          return <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-primary)' }} {...props}>{processedChildren}</p>
                        },
                        ul: ({ ...props }) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
                        ol: ({ ...props }) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
                        li: ({ children, ...props }) => {
                          // Convert .md file mentions and API references to clickable links in list items too
                          const processedChildren = React.Children.map(children, (child) => {
                            if (typeof child === 'string') {
                              const parts = child.split(/(\S+\.md|API endpoints? (?:reference|page|section|catalog))/gi)
                              return parts.map((part, idx) => {
                                if (part.endsWith('.md')) {
                                  const slug = part.replace('.md', '')
                                  return (
                                    <a
                                      key={idx}
                                      href={`/documents?doc=${slug}`}
                                      className="text-blue-600 hover:underline font-medium"
                                      onClick={(e) => {
                                        e.preventDefault()
                                        window.location.href = `/documents?doc=${slug}`
                                      }}
                                    >
                                      {part}
                                    </a>
                                  )
                                }
                                if (/API endpoints? (?:reference|page|section|catalog)/i.test(part)) {
                                  return (
                                    <a
                                      key={idx}
                                      href="/api-spec"
                                      className="text-blue-600 hover:underline font-medium"
                                      onClick={(e) => {
                                        e.preventDefault()
                                        window.location.href = '/api-spec'
                                      }}
                                    >
                                      {part}
                                    </a>
                                  )
                                }
                                return part
                              })
                            }
                            return child
                          })
                          return <li className="text-sm" style={{ color: 'var(--text-primary)' }} {...props}>{processedChildren}</li>
                        },
                        code: ({ ...props }) => <code className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ background: 'var(--bg-muted)', color: 'var(--text-primary)' }} {...props} />,
                        strong: ({ ...props }) => <strong className="font-semibold" style={{ color: 'var(--text-primary)' }} {...props} />,
                        em: ({ ...props }) => <em className="italic" {...props} />,
                        blockquote: ({ ...props }) => <blockquote className="border-l-4 pl-4 italic my-3" style={{ borderColor: 'var(--accent-blue)33', color: 'var(--text-muted)' }} {...props} />,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Search Input */}
      <form onSubmit={handleSearch} className="relative">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={messages.length > 0 ? 'Ask GreaseMonkey a follow-up...' : 'Ask GreaseMonkey about the docs...'}
            className={cn(
              'w-full rounded-lg border pl-12 pr-32 py-3.5',
              'text-sm outline-none transition-all',
              'focus:ring-2 focus:ring-blue-500/20',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            style={{
              borderColor: 'var(--border-default)',
              background: 'var(--bg-default)',
              color: 'var(--text-primary)',
            }}
            disabled={loading}
            maxLength={500}
          />
          <button
            type="submit"
            disabled={loading || !query.trim() || query.trim().length < 3}
            className={cn(
              'absolute right-2 top-1/2 -translate-y-1/2',
              'flex items-center gap-2 rounded-md px-4 py-2',
              'text-sm font-medium transition-all',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            style={{
              background: loading || !query.trim() || query.trim().length < 3 ? 'var(--bg-muted)' : 'var(--accent-blue)',
              color: 'white',
            }}
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Searching...</span>
              </>
            ) : (
              <>
                <span className="text-sm">🐵</span>
                <span>Ask</span>
              </>
            )}
          </button>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>{query.length}/500 characters</span>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearConversation}
              className="text-xs hover:underline"
              style={{ color: 'var(--accent-blue)' }}
            >
              Clear conversation
            </button>
          )}
        </div>
      </form>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border p-4" style={{ borderColor: '#ef444480', background: '#ef44441a' }}>
          <span className="text-lg mt-0.5 shrink-0">
            {['🙈', '🙉', '🙊'][Math.floor(Math.random() * 3)]}
          </span>
          <div>
            <div className="font-medium" style={{ color: '#ef4444' }}>Error</div>
            <div className="mt-1 text-sm" style={{ color: '#ef4444e6' }}>{error}</div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="rounded-lg border p-6" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-default)' }}>
          <div className="flex items-center gap-3">
            <span className="text-xl shrink-0">🙉</span>
            <div>
              <div className="text-sm font-medium mb-1" style={{ color: 'var(--accent-blue)' }}>
                Thinking...
              </div>
              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {loadingMessages[loadingMessageIndex]}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      {messages.length === 0 && !loading && !error && (
        <div className="rounded-lg border p-4" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-subtle)' }}>
          <div className="flex items-center gap-2 text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
            <span className="text-lg">🐵</span>
            <span>Try asking about:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              'What is the intent model?',
              'Show me all HBL endpoints',
              'Which API endpoints use UUIDs?',
              'Explain the actor model',
              'What are the main entities?',
              'How does the BRD compare to the intent model?'
            ].map((question, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handlePresetQuestion(question)}
                disabled={loading}
                className="px-3 py-1.5 text-sm rounded-lg transition-all duration-200 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'var(--bg-white)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-secondary)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-blue)'
                  e.currentTarget.style.color = 'var(--accent-blue)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-default)'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }}
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Conversation footer */}
      {messages.length > 0 && !loading && (
        <div className="text-xs text-center pt-2" style={{ color: 'var(--text-muted)' }}>
          🐵 Generated by GreaseMonkey • Always verify critical information
        </div>
      )}
    </div>
  )
}
