import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001'

// ── Fetch products for context ──────────────────────────────────────────
let cachedProducts = null
const getProducts = async () => {
  if (cachedProducts) return cachedProducts
  try {
    const res = await fetch(`${API_BASE}/api/products?limit=50`)
    const data = await res.json()
    cachedProducts = data.products || data || []
    return cachedProducts
  } catch { return [] }
}

// ── System prompt builder ───────────────────────────────────────────────
const buildSystemPrompt = (products) => {
  const catalogue = products.slice(0, 30).map(p =>
    `- ${p.name} | ${p.category} | $${p.price} | Brand: ${p.brand} | ID: ${p.id}` 
  ).join('\n')

  return `You are ShopBot, a friendly AI shopping assistant for ShopSphere — a premium e-commerce store.

Your personality: helpful, concise, enthusiastic about great deals. Use emojis occasionally.

PRODUCT CATALOGUE (top 30):
${catalogue}

STORE INFO:
- Free shipping on orders over $99 (code: FREESHIP)
- Coupons: SHIELD10 (10% off), SAVE500 ($50 off orders $200+), LUXURY20 (20% off $500+), WELCOME15 (15% off), FIRST50 (50% off first order $100+)
- 30-day hassle-free returns
- Payment: Razorpay (card, UPI), Cash on Delivery
- Categories: Electronics, Mobiles, Fashion, Books, Sports, Beauty, Toys, Home & Kitchen

RESPONSE RULES:
1. Keep replies SHORT — max 3-4 sentences unless user asks for detail
2. When recommending products, respond with valid JSON in this EXACT format at the end of your message:
   PRODUCTS: [{"id":"product_id","name":"Product Name","price":99.99,"image_url":"url","category":"cat"}]
3. Only suggest products that exist in the catalogue above
4. If asked about orders/cart/wishlist, tell them to login and check their dashboard
5. If you don't know something, say so honestly
6. Never make up prices or product details not in the catalogue`
}

// ── Message bubble component ────────────────────────────────────────────
const Bubble = ({ msg, onProductClick }) => {
  const isBot = msg.role === 'assistant'

  // Parse product suggestions from bot message
  const parseProducts = (text) => {
    const match = text.match(/PRODUCTS:\s*(\[[\s\S]*?\])/i)
    if (!match) return { text, products: [] }
    try {
      const products = JSON.parse(match[1])
      const cleanText = text.replace(/PRODUCTS:\s*\[[\s\S]*?\]/i, '').trim()
      return { text: cleanText, products }
    } catch { return { text, products: [] } }
  }

  const { text, products } = isBot ? parseProducts(msg.content) : { text: msg.content, products: [] }

  return (
    <div style={{
      display: 'flex',
      flexDirection: isBot ? 'row' : 'row-reverse',
      gap: 8, marginBottom: 12, alignItems: 'flex-start',
    }}>
      {/* Avatar */}
      {isBot && (
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, flexShrink: 0, marginTop: 2,
        }}>🤖</div>
      )}

      <div style={{ maxWidth: '82%' }}>
        {/* Text bubble */}
        <div style={{
          background: isBot ? '#f8fafc' : '#2563eb',
          color: isBot ? '#111827' : '#fff',
          border: isBot ? '1px solid #e2e8f0' : 'none',
          borderRadius: isBot ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
          padding: '10px 14px',
          fontSize: 13, lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {text}
        </div>

        {/* Product suggestion cards */}
        {products.length > 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8,
          }}>
            {products.map((p, i) => (
              <div
                key={i}
                onClick={() => onProductClick(p)}
                style={{
                  display: 'flex', gap: 10, alignItems: 'center',
                  background: '#fff', border: '1.5px solid #e2e8f0',
                  borderRadius: 12, padding: '8px 12px',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#2563eb'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,0.12)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#e2e8f0'
                  e.currentTarget.style.boxShadow = 'none'
                }}>
                <img
                  src={p.image_url}
                  alt={p.name}
                  onError={e => { e.target.src = `https://picsum.photos/seed/${p.id}/60/60` }}
                  style={{
                    width: 48, height: 48, borderRadius: 8,
                    objectFit: 'cover', flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 600, color: '#111827',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{p.category}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#2563eb', flexShrink: 0 }}>
                  ${parseFloat(p.price || 0).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Typing indicator ────────────────────────────────────────────────────
const Typing = () => (
  <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'flex-start' }}>
    <div style={{
      width: 28, height: 28, borderRadius: '50%',
      background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
    }}>🤖</div>
    <div style={{
      background: '#f8fafc', border: '1px solid #e2e8f0',
      borderRadius: '4px 16px 16px 16px', padding: '12px 16px',
      display: 'flex', gap: 4, alignItems: 'center',
    }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: '50%', background: '#94a3b8',
          animation: `bounce 1.2s ease infinite`,
          animationDelay: `${i * 0.2}s`,
        }}/>
      ))}
    </div>
  </div>
)

// ── Quick reply chips ───────────────────────────────────────────────────
const QUICK_REPLIES = [
  '🔥 Best deals today',
  '📱 Show me phones',
  '💻 Laptops under $1500',
  '👟 Popular fashion',
  '🎁 Gift ideas under $50',
  '🚚 Shipping info',
  '💳 Available coupons',
  '⭐ Top rated products',
]

// ── Smart fallback when Claude API is unavailable ──────────────────────
function getSmartFallback(userText, products) {
  const q = userText.toLowerCase()

  // Coupon questions
  if (q.includes('coupon') || q.includes('discount') || q.includes('code') || q.includes('offer')) {
    return `Here are all available coupon codes! 🎁\n\n• **SHIELD10** — 10% off any order\n• **SAVE500** — $50 off orders above $200\n• **LUXURY20** — 20% off orders above $500\n• **WELCOME15** — 15% off any order\n• **FIRST50** — 50% off your first order (min $100)\n• **FREESHIP** — Free shipping on orders over $99\n\nApply at checkout! 🛒`
  }

  // Shipping questions
  if (q.includes('ship') || q.includes('deliver') || q.includes('arrival')) {
    return `🚚 **Shipping Info:**\n\nStandard delivery: 3–5 business days\nExpress delivery: 1–2 days (available at checkout)\nFree shipping on orders over $99 (use code FREESHIP)\n\nAll orders are tracked and you'll receive an email confirmation! 📦`
  }

  // Return questions
  if (q.includes('return') || q.includes('refund') || q.includes('exchange')) {
    return `↩️ **Return Policy:**\n\n30-day hassle-free returns on all products.\n\nSteps:\n1. Go to Dashboard → My Orders\n2. Click "Return Item"\n3. We'll arrange pickup within 2 days\n4. Refund processed in 5–7 business days\n\nNo questions asked! 😊`
  }

  // Payment questions
  if (q.includes('pay') || q.includes('payment') || q.includes('upi') || q.includes('card')) {
    return `💳 **Payment Options:**\n\n• Credit/Debit Cards (Visa, Mastercard, Amex)\n• UPI (GPay, PhonePe, Paytm)\n• Net Banking\n• Cash on Delivery (COD)\n\nAll payments are secured by our AI gateway with 256-bit SSL encryption! 🔒`
  }

  // Order questions
  if (q.includes('order') || q.includes('track') || q.includes('status')) {
    return `📦 **Order Tracking:**\n\nGo to **Dashboard → My Orders** to see all your orders and track their status in real-time.\n\nYou'll also get email updates at every stage! Need help with a specific order? Login and check your dashboard. 🛒`
  }

  // Phone/mobile search
  if (q.includes('phone') || q.includes('mobile') || q.includes('smartphone')) {
    const phones = products.filter(p => p.category === 'Mobiles').slice(0, 3)
    if (phones.length > 0) {
      const list = phones.map(p => `• ${p.name} — $${parseFloat(p.price).toFixed(2)}`).join('\n')
      return `📱 **Top Mobile Phones:**\n\n${list}\n\nSee all mobiles →\nPRODUCTS: ${JSON.stringify(phones.map(p => ({ id: p.id, name: p.name, price: p.price, image_url: p.image_url, category: p.category })))}`
    }
  }

  // Laptop/electronics search
  if (q.includes('laptop') || q.includes('computer') || q.includes('macbook') || q.includes('electronics')) {
    const electronics = products.filter(p => p.category === 'Electronics').slice(0, 3)
    if (electronics.length > 0) {
      return `💻 **Top Electronics:**\n\nHere are some great picks!\nPRODUCTS: ${JSON.stringify(electronics.map(p => ({ id: p.id, name: p.name, price: p.price, image_url: p.image_url, category: p.category })))}`
    }
  }

  // Fashion search
  if (q.includes('fashion') || q.includes('cloth') || q.includes('shoe') || q.includes('wear') || q.includes('dress')) {
    const fashion = products.filter(p => p.category === 'Fashion').slice(0, 3)
    if (fashion.length > 0) {
      return `👟 **Popular Fashion:**\n\nPRODUCTS: ${JSON.stringify(fashion.map(p => ({ id: p.id, name: p.name, price: p.price, image_url: p.image_url, category: p.category })))}`
    }
  }

  // Best deals / top rated
  if (q.includes('deal') || q.includes('best') || q.includes('top') || q.includes('popular') || q.includes('recommend')) {
    const top = products
      .sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0))
      .slice(0, 3)
    if (top.length > 0) {
      return `⭐ **Top Rated Products:**\n\nHere are our highest rated picks!\nPRODUCTS: ${JSON.stringify(top.map(p => ({ id: p.id, name: p.name, price: p.price, image_url: p.image_url, category: p.category })))}`
    }
  }

  // Price based search
  const underMatch = q.match(/under\s*\$?(\d+)/)
  if (underMatch) {
    const maxPrice = parseFloat(underMatch[1])
    const affordable = products
      .filter(p => parseFloat(p.price) <= maxPrice)
      .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
      .slice(0, 3)
    if (affordable.length > 0) {
      return `💰 **Products under $${maxPrice}:**\n\nPRODUCTS: ${JSON.stringify(affordable.map(p => ({ id: p.id, name: p.name, price: p.price, image_url: p.image_url, category: p.category })))}`
    }
    return `😔 I couldn't find products under $${maxPrice}. Try a higher budget or browse our Products page!`
  }

  // Gift ideas
  if (q.includes('gift') || q.includes('present')) {
    const gifts = products.filter(p => parseFloat(p.price) < 100).slice(0, 3)
    if (gifts.length > 0) {
      return `🎁 **Gift Ideas under $100:**\n\nPRODUCTS: ${JSON.stringify(gifts.map(p => ({ id: p.id, name: p.name, price: p.price, image_url: p.image_url, category: p.category })))}`
    }
  }

  // Books
  if (q.includes('book') || q.includes('read')) {
    const books = products.filter(p => p.category === 'Books').slice(0, 3)
    if (books.length > 0) {
      return `📚 **Popular Books:**\n\nPRODUCTS: ${JSON.stringify(books.map(p => ({ id: p.id, name: p.name, price: p.price, image_url: p.image_url, category: p.category })))}`
    }
  }

  // Sports
  if (q.includes('sport') || q.includes('fitness') || q.includes('gym') || q.includes('exercise')) {
    const sports = products.filter(p => p.category === 'Sports').slice(0, 3)
    if (sports.length > 0) {
      return `⚽ **Sports & Fitness:**\n\nPRODUCTS: ${JSON.stringify(sports.map(p => ({ id: p.id, name: p.name, price: p.price, image_url: p.image_url, category: p.category })))}`
    }
  }

  // Hello / greetings
  if (q.includes('hi') || q.includes('hello') || q.includes('hey') || q.length < 5) {
    return `Hey there! 👋 I'm ShopBot!\n\nI can help you:\n• 🔍 Find products by name, category, or budget\n• 🎁 Suggest gifts\n• 💳 Explain coupons and payment\n• 🚚 Answer shipping & return questions\n\nWhat are you looking for today?`
  }

  // Default — show top products
  const defaultTop = products
    .sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0))
    .slice(0, 3)

  return `I can help you find great products! 🛍️ Here are some top picks:\n\nPRODUCTS: ${JSON.stringify(defaultTop.map(p => ({ id: p.id, name: p.name, price: p.price, image_url: p.image_url, category: p.category })))}\n\nOr try asking: "Show me phones", "laptops under $1500", "best deals", or any question!`
}

// ── MAIN CHATBOT COMPONENT ──────────────────────────────────────────────
export default function ChatBot() {
  const navigate = useNavigate()
  const [open,      setOpen]      = useState(false)
  const [messages,  setMessages]  = useState([])
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [products,  setProducts]  = useState([])
  const [unread,    setUnread]    = useState(0)
  const [hasOpened, setHasOpened] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef       = useRef(null)

  // Load products on mount
  useEffect(() => {
    getProducts().then(setProducts)
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  // Welcome message on first open
  useEffect(() => {
    if (open && !hasOpened) {
      setHasOpened(true)
      setMessages([{
        role: 'assistant',
        content: `Hi! 👋 I'm ShopBot, your personal shopping assistant!\n\nI can help you find products, compare options, apply coupons, and answer any questions about ShopSphere. What are you looking for today?`,
      }])
    }
  }, [open, hasOpened])

  // Show unread bubble after 3 seconds
  useEffect(() => {
    if (!hasOpened) {
      const t = setTimeout(() => setUnread(1), 3000)
      return () => clearTimeout(t)
    }
  }, [hasOpened])

  const sendMessage = useCallback(async (text) => {
    const userText = (text || input).trim()
    if (!userText || loading) return
    setInput('')

    const userMsg = { role: 'user', content: userText }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setLoading(true)

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_CLAUDE_API_KEY || '',
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 600,
          system: buildSystemPrompt(products),
          messages: newMessages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error?.message || `API error ${response.status}`)
      }

      const data = await response.json()
      const botText = data.content?.[0]?.text || "I'm having trouble responding right now. Please try again!"

      setMessages(prev => [...prev, { role: 'assistant', content: botText }])

      // If chat is closed, show unread count
      if (!open) setUnread(u => u + 1)

    } catch (err) {
      console.error('Claude API error:', err)

      // Try to give a smart fallback response based on user message
      const fallback = getSmartFallback(userText, products)
      setMessages(prev => [...prev, { role: 'assistant', content: fallback }])
    } finally {
      setLoading(false)
    }
  }, [input, messages, loading, products, open])

  const handleProductClick = (product) => {
    navigate(`/products/${product.id}`)
    setOpen(false)
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    setMessages([])
    setHasOpened(false)
    setOpen(false)
    setTimeout(() => setOpen(true), 100)
  }

  return (
    <>
      {/* ── CHAT WINDOW ── */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 90, right: 24,
          width: 380, height: 560,
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column',
          zIndex: 9998,
          animation: 'chatOpen 0.25s ease',
          overflow: 'hidden',
        }}>

          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
            padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, flexShrink: 0,
            }}>🤖</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>ShopBot</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80' }}/>
                AI Shopping Assistant
              </div>
            </div>
            <button onClick={clearChat} style={{
              background: 'rgba(255,255,255,0.1)', border: 'none',
              borderRadius: 8, padding: '4px 10px',
              color: 'rgba(255,255,255,0.7)', fontSize: 11, cursor: 'pointer',
            }}>New chat</button>
            <button onClick={() => setOpen(false)} style={{
              background: 'none', border: 'none',
              color: 'rgba(255,255,255,0.7)', fontSize: 20,
              cursor: 'pointer', padding: '0 4px', lineHeight: 1,
            }}>×</button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto',
            padding: '16px 14px',
            display: 'flex', flexDirection: 'column',
          }}>
            {messages.map((msg, i) => (
              <Bubble key={i} msg={msg} onProductClick={handleProductClick}/>
            ))}
            {loading && <Typing/>}
            <div ref={messagesEndRef}/>
          </div>

          {/* Quick replies — show only at start */}
          {messages.length <= 1 && !loading && (
            <div style={{ padding: '0 14px 8px', overflowX: 'auto' }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {QUICK_REPLIES.map((q, i) => (
                  <button key={i} onClick={() => sendMessage(q)} style={{
                    background: '#eff6ff', border: '1px solid #bfdbfe',
                    borderRadius: 20, padding: '5px 11px',
                    fontSize: 11, fontWeight: 500, color: '#1d4ed8',
                    cursor: 'pointer', whiteSpace: 'nowrap',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.target.style.background = '#dbeafe' }}
                  onMouseLeave={e => { e.target.style.background = '#eff6ff' }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input area */}
          <div style={{
            padding: '10px 14px 14px',
            borderTop: '1px solid #f1f5f9',
          }}>
            <div style={{
              display: 'flex', gap: 8, alignItems: 'flex-end',
              background: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              borderRadius: 14, padding: '8px 12px',
            }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask me anything about products..."
                rows={1}
                style={{
                  flex: 1, border: 'none', background: 'none',
                  resize: 'none', outline: 'none',
                  fontSize: 13, color: '#111827', lineHeight: 1.5,
                  fontFamily: 'inherit', maxHeight: 100,
                  overflowY: 'auto',
                }}
                onInput={e => {
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
                }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                style={{
                  width: 32, height: 32, borderRadius: '50%', border: 'none',
                  background: input.trim() && !loading ? '#2563eb' : '#e2e8f0',
                  cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s', flexShrink: 0,
                }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                  stroke={input.trim() && !loading ? '#fff' : '#9ca3af'} strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center', marginTop: 6 }}>
              Powered by Claude AI · ShopSphere
            </div>
          </div>
        </div>
      )}

      {/* ── FLOATING BUTTON ── */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 24, right: 24,
          width: 56, height: 56, borderRadius: '50%',
          background: open ? '#1e3a5f' : 'linear-gradient(135deg, #2563eb, #7c3aed)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(37,99,235,0.4)',
          zIndex: 9999,
          transition: 'all 0.25s',
          transform: open ? 'scale(0.95)' : 'scale(1)',
        }}
        onMouseEnter={e => !open && (e.currentTarget.style.transform = 'scale(1.08)')}
        onMouseLeave={e => e.currentTarget.style.transform = open ? 'scale(0.95)' : 'scale(1)'}>
        
        {/* Icon */}
        <span style={{ fontSize: 24, transition: 'all 0.2s' }}>
          {open ? '✕' : '💬'}
        </span>

        {/* Unread badge */}
        {!open && unread > 0 && (
          <div style={{
            position: 'absolute', top: -2, right: -2,
            width: 18, height: 18, borderRadius: '50%',
            background: '#ef4444', color: '#fff',
            fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #fff',
            animation: 'pulse 1.5s infinite',
          }}>1</div>
        )}
      </button>

      <style>{`
        @keyframes chatOpen {
          from { opacity:0; transform:scale(0.9) translateY(20px) }
          to   { opacity:1; transform:scale(1) translateY(0) }
        }
        @keyframes bounce {
          0%,60%,100% { transform:translateY(0) }
          30%          { transform:translateY(-6px) }
        }
        @keyframes pulse {
          0%,100% { transform:scale(1) }
          50%      { transform:scale(1.15) }
        }
      `}</style>
    </>
  )
}
