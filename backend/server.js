require('dotenv').config()
const express = require('express')
const cors = require('cors')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { createClient } = require('@supabase/supabase-js')
const Razorpay = require('razorpay')
const crypto = require('crypto')
const nodemailer = require('nodemailer')
const multer = require('multer')

const app = express()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })
const PORT = process.env.PORT || 8000

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

app.use(cors({
  origin: ['http://localhost:5001', 'http://localhost:5173', 'http://localhost:3001'],
  credentials: true
}))
app.use(express.json())

supabase.from('products').select('count').then(({ error }) => {
  if (error) console.error('Supabase FAILED:', error.message)
  else console.log('Supabase connected to https://nqsejbhmuehpaalkhbsh.supabase.co')
})

// Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'placeholder'
})

// Email
const emailTransporter = process.env.EMAIL_ENABLED === 'true'
  ? nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    })
  : null

const sendEmail = async (to, subject, html) => {
  if (!emailTransporter) { console.log(`[Email skipped] ${subject} → ${to}`); return }
  try {
    await emailTransporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, html })
    console.log(`[Email sent] ${subject} → ${to}`)
  } catch (e) { console.error('[Email failed]', e.message) }
}

const emailTemplates = {
  welcome: (name) => `<div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#fff">
  <div style="background:linear-gradient(135deg,#7c5cfc,#00d4ff);padding:36px;text-align:center">
    <div style="font-size:26px;font-weight:800;color:#fff;letter-spacing:-0.03em">Shield<span style="color:#c4b5fd">Mart</span></div>
  </div>
  <div style="padding:36px">
    <h2 style="font-size:22px;font-weight:700;color:#0a0a0f;margin-bottom:8px">Welcome, ${name}! 👋</h2>
    <p style="font-size:14px;color:#6b6b80;line-height:1.7;margin-bottom:24px">Your ShieldMart account is ready. Browse thousands of products all protected by our intelligent API gateway.</p>
    <a href="http://localhost:5173" style="display:inline-block;background:#7c5cfc;color:#fff;padding:13px 30px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Start Shopping →</a>
  </div>
  <div style="background:#111118;padding:20px;text-align:center;color:#9090a8;font-size:12px">© 2026 ShieldMart. All rights reserved.</div>
</div>`,

  orderConfirm: (name, order, items) => `<div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#fff">
  <div style="background:#7c5cfc;padding:32px;text-align:center">
    <div style="font-size:22px;font-weight:800;color:#fff">ShieldMart</div>
    <div style="font-size:14px;color:rgba(255,255,255,0.8);margin-top:8px">Order Confirmed ✓</div>
  </div>
  <div style="padding:32px">
    <h2 style="font-size:20px;font-weight:700;color:#0a0a0f;margin-bottom:6px">Hi ${name}, your order is confirmed!</h2>
    <div style="background:#f7f7f7;border-radius:8px;padding:14px 16px;margin:16px 0;font-family:monospace;font-size:13px;color:#6b6b80">
      Order ID: <strong style="color:#0a0a0f">#${order.id?.slice(0,8).toUpperCase()}</strong>
    </div>
    ${(items||[]).map(i=>`
    <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #f0f0f0">
      <img src="${i.products?.image_url||'https://picsum.photos/60'}" style="width:56px;height:56px;border-radius:6px;object-fit:cover" />
      <div style="flex:1">
        <div style="font-size:13px;font-weight:500;color:#0a0a0f">${i.products?.name||'Product'}</div>
        <div style="font-size:12px;color:#9090a8">Qty: ${i.quantity}</div>
      </div>
      <div style="font-size:14px;font-weight:600;color:#7c5cfc">₹${((i.price||0)*(i.quantity||1)).toLocaleString()}</div>
    </div>`).join('')}
    <div style="display:flex;justify-content:space-between;padding:16px 0;font-size:18px;font-weight:700">
      <span>Total Paid</span><span style="color:#7c5cfc">₹${Number(order.total_amount).toLocaleString()}</span>
    </div>
    <a href="http://localhost:5173/orders/${order.id}/track" style="display:inline-block;background:#7c5cfc;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin-top:8px">Track Order →</a>
  </div>
  <div style="background:#111118;padding:20px;text-align:center;color:#9090a8;font-size:12px">© 2026 ShieldMart</div>
</div>`,

  passwordReset: (name, token) => `<div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#fff">
  <div style="background:#0a0a0f;padding:32px;text-align:center">
    <div style="font-size:22px;font-weight:800;color:#fff">Shield<span style="color:#7c5cfc">Mart</span></div>
  </div>
  <div style="padding:36px;text-align:center">
    <div style="font-size:48px;margin-bottom:16px">🔐</div>
    <h2 style="font-size:20px;font-weight:700;color:#0a0a0f;margin-bottom:8px">Password Reset Request</h2>
    <p style="font-size:14px;color:#6b6b80;margin-bottom:28px">Hi ${name}, click the button below to reset your password. This link expires in 1 hour.</p>
    <a href="http://localhost:5173/reset-password?token=${token}" style="display:inline-block;background:#7c5cfc;color:#fff;padding:13px 30px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Reset Password →</a>
    <p style="font-size:12px;color:#9090a8;margin-top:24px">If you didn't request this, please ignore this email.</p>
  </div>
  <div style="background:#111118;padding:20px;text-align:center;color:#9090a8;font-size:12px">© 2026 ShieldMart</div>
</div>`
}

const resetTokens = new Map()

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'No token' })
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

app.get('/health', (req, res) => {
  res.json({
    status: 'Backend running in Modular Mode',
    database: 'Supabase PostgreSQL',
    supabase_url: process.env.SUPABASE_URL
  })
})

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, phone } = req.body
    if (!email || !password || !name)
      return res.status(400).json({ error: 'Email, password and name are required' })
    const { data: existing } = await supabase
      .from('users').select('id').eq('email', email).single()
    if (existing)
      return res.status(409).json({ error: 'Email already registered' })
    const password_hash = await bcrypt.hash(password, 10)
    const { data: user, error } = await supabase
      .from('users')
      .insert({ email, password_hash, name, phone })
      .select('id,email,name,phone,created_at')
      .single()
    if (error) throw error
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )
    sendEmail(email, 'Welcome to ShieldMart! 🎉', emailTemplates.welcome(name))
    res.status(201).json({ user, token, message: 'Registration successful' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required' })
    const { data: user } = await supabase
      .from('users').select('*').eq('email', email).single()
    if (!user)
      return res.status(401).json({ error: 'Invalid email or password' })
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid)
      return res.status(401).json({ error: 'Invalid email or password' })
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )
    res.json({
      user: { id: user.id, email: user.email, name: user.name },
      token,
      message: 'Login successful'
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id,email,name,phone,created_at')
      .eq('id', req.user.id)
      .single()
    if (error) throw error
    res.json(user)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/products', async (req, res) => {
  try {
    const { category, brand, search, min_price, max_price, sort, limit = 20, offset = 0 } = req.query
    let query = supabase.from('products').select('*', { count: 'exact' })
    if (category) query = query.eq('category', category)
    if (brand) query = query.eq('brand', brand)
    if (search) query = query.ilike('name', `%${search}%`)
    if (min_price) query = query.gte('price', Number(min_price))
    if (max_price) query = query.lte('price', Number(max_price))
    if (sort === 'price_asc') query = query.order('price', { ascending: true })
    else if (sort === 'price_desc') query = query.order('price', { ascending: false })
    else if (sort === 'rating') query = query.order('rating', { ascending: false })
    else query = query.order('created_at', { ascending: false })
    query = query.range(Number(offset), Number(offset) + Number(limit) - 1)
    const { data, error, count } = await query
    if (error) throw error
    res.json({ products: data, total: count })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/products/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products').select('*').eq('id', req.params.id).single()
    if (error || !data) return res.status(404).json({ error: 'Product not found' })
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/categories', async (req, res) => {
  try {
    const { data } = await supabase.from('products').select('category')
    const categories = [...new Set(data.map(p => p.category))].sort()
    res.json({ categories })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/cart', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cart')
      .select('*, products(*)')
      .eq('user_id', req.user.id)
    if (error) throw error
    res.json({ cart: data })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/cart', authMiddleware, async (req, res) => {
  try {
    const { product_id, quantity = 1 } = req.body
    if (!product_id) return res.status(400).json({ error: 'product_id required' })
    const { data, error } = await supabase
      .from('cart')
      .upsert(
        { user_id: req.user.id, product_id, quantity },
        { onConflict: 'user_id,product_id' }
      )
      .select('*, products(*)')
      .single()
    if (error) throw error
    res.json({ item: data, message: 'Added to cart' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.put('/api/cart/:product_id', authMiddleware, async (req, res) => {
  try {
    const { quantity } = req.body
    if (quantity < 1) {
      await supabase.from('cart')
        .delete()
        .eq('user_id', req.user.id)
        .eq('product_id', req.params.product_id)
      return res.json({ message: 'Item removed' })
    }
    const { data, error } = await supabase
      .from('cart')
      .update({ quantity })
      .eq('user_id', req.user.id)
      .eq('product_id', req.params.product_id)
      .select('*, products(*)')
      .single()
    if (error) throw error
    res.json({ item: data })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.delete('/api/cart/:product_id', authMiddleware, async (req, res) => {
  try {
    await supabase.from('cart')
      .delete()
      .eq('user_id', req.user.id)
      .eq('product_id', req.params.product_id)
    res.json({ message: 'Item removed from cart' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/orders', authMiddleware, async (req, res) => {
  try {
    const { shipping_address, payment_method } = req.body
    const { data: cartItems } = await supabase
      .from('cart').select('*, products(*)').eq('user_id', req.user.id)
    if (!cartItems || cartItems.length === 0)
      return res.status(400).json({ error: 'Cart is empty' })
    const total_amount = cartItems.reduce(
      (sum, item) => sum + (item.products.price * item.quantity), 0
    )
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({ user_id: req.user.id, total_amount, shipping_address, payment_method, status: 'confirmed' })
      .select().single()
    if (orderError) throw orderError
    const orderItems = cartItems.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.products.price
    }))
    await supabase.from('order_items').insert(orderItems)
    await supabase.from('cart').delete().eq('user_id', req.user.id)
    res.status(201).json({ order, message: 'Order placed successfully' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/orders', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, products(name, image_url, brand, price))')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
    if (error) throw error
    res.json({ orders: data })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Admin — add product
app.post('/api/products', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('products').insert(req.body).select().single()
    if (error) throw error
    res.status(201).json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Admin — update product
app.put('/api/products/:id', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('products').update(req.body).eq('id', req.params.id).select().single()
    if (error) throw error
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Admin — delete product
app.delete('/api/products/:id', authMiddleware, async (req, res) => {
  try {
    await supabase.from('products').delete().eq('id', req.params.id)
    res.json({ message: 'Product deleted' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// FEATURE 1: Wishlist
app.get('/api/wishlist', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('wishlist').select('*, products(*)').eq('user_id', req.user.id)
    if (error) throw error
    res.json({ wishlist: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/wishlist', authMiddleware, async (req, res) => {
  try {
    const { product_id } = req.body
    const { data: existing } = await supabase
      .from('wishlist').select('id').eq('user_id', req.user.id).eq('product_id', product_id).single()
    if (existing) {
      await supabase.from('wishlist').delete().eq('id', existing.id)
      return res.json({ message: 'Removed from wishlist', action: 'removed' })
    }
    const { data, error } = await supabase
      .from('wishlist').insert({ user_id: req.user.id, product_id }).select('*, products(*)').single()
    if (error) throw error
    res.json({ item: data, message: 'Added to wishlist', action: 'added' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.delete('/api/wishlist/:product_id', authMiddleware, async (req, res) => {
  try {
    await supabase.from('wishlist').delete().eq('user_id', req.user.id).eq('product_id', req.params.product_id)
    res.json({ message: 'Removed from wishlist' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// FEATURE 2: Reviews
app.get('/api/products/:id/reviews', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*, users(name)')
      .eq('product_id', req.params.id)
      .order('created_at', { ascending: false })
    if (error) throw error
    const avg = data.length > 0 ? data.reduce((s, r) => s + r.rating, 0) / data.length : 0
    res.json({ reviews: data, count: data.length, avg_rating: Math.round(avg * 10) / 10 })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/products/:id/reviews', authMiddleware, async (req, res) => {
  try {
    const { rating, title, body } = req.body
    if (!rating || !body) return res.status(400).json({ error: 'Rating and review text required' })
    const { data, error } = await supabase
      .from('reviews')
      .upsert({ user_id: req.user.id, product_id: req.params.id, rating, title, body }, { onConflict: 'user_id,product_id' })
      .select('*, users(name)').single()
    if (error) throw error
    res.status(201).json({ review: data, message: 'Review submitted' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// FEATURE 3: Order Tracking
app.get('/api/orders/:id/track', authMiddleware, async (req, res) => {
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select('*, order_items(*, products(name, image_url, brand))')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single()
    if (error || !order) return res.status(404).json({ error: 'Order not found' })

    const statusFlow = ['pending', 'confirmed', 'shipped', 'delivered']
    const currentIdx = statusFlow.indexOf(order.status)

    const timeline = [
      { status: 'pending', label: 'Order Placed', desc: 'Your order has been received', icon: '📋' },
      { status: 'confirmed', label: 'Order Confirmed', desc: 'Payment verified, preparing your order', icon: '✅' },
      { status: 'shipped', label: 'Shipped', desc: 'Your order is on its way', icon: '🚚' },
      { status: 'delivered', label: 'Delivered', desc: 'Order delivered successfully', icon: '📦' },
    ].map((step, i) => ({
      ...step,
      completed: i <= currentIdx,
      current: i === currentIdx,
      time: i <= currentIdx ? new Date(Date.now() - (currentIdx - i) * 24 * 3600 * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null
    }))

    res.json({ order, timeline, current_status: order.status })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/orders/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body
    const valid = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' })
    const { data, error } = await supabase
      .from('orders').update({ status }).eq('id', req.params.id).select().single()
    if (error) throw error
    res.json({ order: data, message: 'Status updated' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// FEATURE 5: Coupons
app.post('/api/coupons/validate', authMiddleware, async (req, res) => {
  try {
    const { code, order_total } = req.body
    if (!code) return res.status(400).json({ error: 'Coupon code required' })
    const { data: coupon } = await supabase
      .from('coupons').select('*').eq('code', code.toUpperCase()).eq('active', true).single()
    if (!coupon) return res.status(404).json({ error: 'Invalid coupon code' })
    if (coupon.valid_until && new Date(coupon.valid_until) < new Date())
      return res.status(400).json({ error: 'Coupon has expired' })
    if (coupon.used_count >= coupon.max_uses)
      return res.status(400).json({ error: 'Coupon usage limit reached' })
    if (order_total < coupon.min_order_value)
      return res.status(400).json({ error: `Minimum order value ₹${coupon.min_order_value} required` })
    const discount = coupon.discount_type === 'percent'
      ? Math.round((order_total * coupon.discount_value) / 100)
      : Math.min(coupon.discount_value, order_total)
    res.json({ valid: true, coupon, discount, final_total: order_total - discount, message: `Coupon applied! You save ₹${discount}` })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// FEATURE 7: Notifications
const createNotification = async (userId, title, message, type = 'info', link = null) => {
  try {
    await supabase.from('notifications').insert({ user_id: userId, title, message, type, link })
  } catch (e) { console.error('Notification create failed:', e.message) }
}

app.get('/api/notifications', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notifications').select('*').eq('user_id', req.user.id)
      .order('created_at', { ascending: false }).limit(20)
    if (error) throw error
    const unread = data.filter(n => !n.read).length
    res.json({ notifications: data, unread })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/notifications/:id/read', authMiddleware, async (req, res) => {
  try {
    await supabase.from('notifications').update({ read: true }).eq('id', req.params.id).eq('user_id', req.user.id)
    res.json({ message: 'Marked as read' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/notifications/read-all', authMiddleware, async (req, res) => {
  try {
    await supabase.from('notifications').update({ read: true }).eq('user_id', req.user.id)
    res.json({ message: 'All marked as read' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// FEATURE 8: Enhanced Products Search
app.get('/api/products', async (req, res) => {
  try {
    const { category, brand, search, min_price, max_price, sort, limit = 20, offset = 0, is_assured, min_rating, in_stock } = req.query
    let query = supabase.from('products').select('*', { count: 'exact' })
    if (category) query = query.eq('category', category)
    if (brand) query = query.eq('brand', brand)
    if (search) query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,brand.ilike.%${search}%`)
    if (min_price) query = query.gte('price', Number(min_price))
    if (max_price) query = query.lte('price', Number(max_price))
    if (is_assured === 'true') query = query.eq('is_assured', true)
    if (min_rating) query = query.gte('rating', Number(min_rating))
    if (in_stock === 'true') query = query.gt('stock', 0)
    if (sort === 'price_asc') query = query.order('price', { ascending: true })
    else if (sort === 'price_desc') query = query.order('price', { ascending: false })
    else if (sort === 'rating') query = query.order('rating', { ascending: false })
    else if (sort === 'discount') query = query.order('discount_percent', { ascending: false })
    else query = query.order('created_at', { ascending: false })
    query = query.range(Number(offset), Number(offset) + Number(limit) - 1)
    const { data, error, count } = await query
    if (error) throw error
    res.json({ products: data, total: count, limit: Number(limit), offset: Number(offset) })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// FEATURE 9: Profile Update
app.put('/api/auth/profile', authMiddleware, async (req, res) => {
  try {
    const { name, phone } = req.body
    if (!name) return res.status(400).json({ error: 'Name is required' })
    const { data, error } = await supabase
      .from('users').update({ name, phone, updated_at: new Date().toISOString() })
      .eq('id', req.user.id).select('id,email,name,phone,created_at').single()
    if (error) throw error
    res.json({ user: data, message: 'Profile updated successfully' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/api/auth/password', authMiddleware, async (req, res) => {
  try {
    const { current_password, new_password } = req.body
    if (!current_password || !new_password) return res.status(400).json({ error: 'Both passwords required' })
    if (new_password.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' })
    const { data: user } = await supabase.from('users').select('password_hash').eq('id', req.user.id).single()
    const valid = await bcrypt.compare(current_password, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' })
    const new_hash = await bcrypt.hash(new_password, 10)
    await supabase.from('users').update({ password_hash: new_hash }).eq('id', req.user.id)
    res.json({ message: 'Password updated successfully' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Modified order creation with notification
app.post('/api/orders', authMiddleware, async (req, res) => {
  try {
    const { items, total_amount, shipping_address, coupon_code } = req.body
    if (!items?.length || !shipping_address) return res.status(400).json({ error: 'Items and shipping address required' })
    const { data: order, error } = await supabase.from('orders').insert({
      user_id: req.user.id, total_amount, shipping_address, coupon_code,
      status: 'pending', created_at: new Date().toISOString()
    }).select().single()
    if (error) throw error
    const orderItems = items.map(i => ({ order_id: order.id, product_id: i.product_id, quantity: i.quantity, price: i.price }))
    await supabase.from('order_items').insert(orderItems)
    await supabase.from('cart').delete().eq('user_id', req.user.id)
    await createNotification(req.user.id, 'Order Confirmed', `Your order #${order.id.slice(0,8).toUpperCase()} has been placed. Total: ₹${total_amount}`, 'success', `/orders/${order.id}/track`)
    res.status(201).json({ order: { ...order, items: orderItems }, message: 'Order placed successfully' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// FEATURE 10: Razorpay Payments
app.post('/api/payments/create-order', authMiddleware, async (req, res) => {
  try {
    const { amount } = req.body
    if (!amount || amount < 1) return res.status(400).json({ error: 'Invalid amount' })
    if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === 'rzp_test_placeholder') {
      return res.json({ mock: true, order_id: `mock_${Date.now()}`, amount: Math.round(amount*100), currency: 'INR', key_id: 'mock' })
    }
    const order = await razorpay.orders.create({ amount: Math.round(amount*100), currency: 'INR', receipt: `sm_${Date.now()}`, notes: { user_id: req.user.id } })
    res.json({ order_id: order.id, amount: order.amount, currency: order.currency, key_id: process.env.RAZORPAY_KEY_ID })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/payments/verify', authMiddleware, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, shipping_address, payment_method, mock } = req.body

    if (!mock && process.env.RAZORPAY_KEY_SECRET && process.env.RAZORPAY_KEY_SECRET !== 'placeholder') {
      const sign = razorpay_order_id + '|' + razorpay_payment_id
      const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(sign).digest('hex')
      if (expected !== razorpay_signature) return res.status(400).json({ error: 'Payment verification failed' })
    }

    const { data: cartItems } = await supabase.from('cart').select('*, products(*)').eq('user_id', req.user.id)
    if (!cartItems?.length) return res.status(400).json({ error: 'Cart is empty' })
    const total = cartItems.reduce((s,i) => s + (i.products?.price || 0) * i.quantity, 0)

    const { data: order, error } = await supabase.from('orders').insert({
      user_id: req.user.id, total_amount: total, shipping_address,
      payment_method: mock ? 'cod_mock' : 'razorpay',
      status: 'confirmed',
      ...(razorpay_order_id && { razorpay_order_id }),
      ...(razorpay_payment_id && { razorpay_payment_id })
    }).select().single()
    if (error) throw error

    const items = cartItems.map(i => ({ order_id: order.id, product_id: i.product_id, quantity: i.quantity, price: i.products?.price || 0 }))
    await supabase.from('order_items').insert(items)
    await supabase.from('cart').delete().eq('user_id', req.user.id)

    // Send confirmation email
    const { data: userInfo } = await supabase.from('users').select('name,email').eq('id', req.user.id).single()
    if (userInfo) sendEmail(userInfo.email, `Order Confirmed — #${order.id.slice(0,8).toUpperCase()}`, emailTemplates.orderConfirm(userInfo.name, order, items.map((oi,i)=>({...oi, products: cartItems[i]?.products}))))

    res.json({ order, items, message: 'Order placed successfully' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Password Reset
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body
    const { data: user } = await supabase.from('users').select('id,name,email').eq('email', email).single()
    if (!user) return res.json({ message: 'If that email exists, a reset link has been sent' })
    const token = crypto.randomBytes(32).toString('hex')
    resetTokens.set(token, { userId: user.id, expires: Date.now() + 3600000 })
    sendEmail(user.email, 'Reset your ShieldMart password', emailTemplates.passwordReset(user.name, token))
    res.json({ message: 'Password reset email sent' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, new_password } = req.body
    const data = resetTokens.get(token)
    if (!data || Date.now() > data.expires) return res.status(400).json({ error: 'Token invalid or expired' })
    const hash = await bcrypt.hash(new_password, 10)
    await supabase.from('users').update({ password_hash: hash }).eq('id', data.userId)
    resetTokens.delete(token)
    res.json({ message: 'Password reset successfully' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// PHASE 6 — Product Image Upload
app.post('/api/upload/product-image', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image provided' })
    const ext = req.file.mimetype.split('/')[1] || 'jpg'
    const fileName = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}` 
    const { error } = await supabase.storage.from('product-images')
      .upload(fileName, req.file.buffer, { contentType: req.file.mimetype, upsert: false })
    if (error) throw error
    const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(fileName)
    res.json({ url: urlData.publicUrl, path: fileName, message: 'Image uploaded' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// PHASE 7 — Advanced Product Features
// Product search with all filters
app.get('/api/products/search/advanced', async (req, res) => {
  try {
    const { q, category, brand, min_price, max_price, min_rating, is_assured, in_stock, sort, limit=20, offset=0 } = req.query
    let query = supabase.from('products').select('*', { count: 'exact' })
    if (q) query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%,brand.ilike.%${q}%,category.ilike.%${q}%`)
    if (category) query = query.eq('category', category)
    if (brand) query = query.eq('brand', brand)
    if (min_price) query = query.gte('price', Number(min_price))
    if (max_price) query = query.lte('price', Number(max_price))
    if (min_rating) query = query.gte('rating', Number(min_rating))
    if (is_assured === 'true') query = query.eq('is_assured', true)
    if (in_stock === 'true') query = query.gt('stock', 0)
    const sortMap = { price_asc: ['price',true], price_desc: ['price',false], rating: ['rating',false], discount: ['discount_percent',false], newest: ['created_at',false] }
    const [col, asc] = sortMap[sort] || ['created_at', false]
    query = query.order(col, { ascending: asc }).range(Number(offset), Number(offset)+Number(limit)-1)
    const { data, error, count } = await query
    if (error) throw error
    res.json({ products: data, total: count, limit: Number(limit), offset: Number(offset) })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Get all unique brands
app.get('/api/brands', async (req, res) => {
  try {
    const { data } = await supabase.from('products').select('brand').order('brand')
    const brands = [...new Set(data.map(p => p.brand).filter(Boolean))].sort()
    res.json({ brands })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Related products
app.get('/api/products/:id/related', async (req, res) => {
  try {
    const { data: product } = await supabase.from('products').select('category,brand').eq('id', req.params.id).single()
    if (!product) return res.status(404).json({ error: 'Product not found' })
    const { data } = await supabase.from('products').select('*')
      .eq('category', product.category).neq('id', req.params.id).order('rating', { ascending: false }).limit(8)
    res.json({ products: data || [] })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Product stock update (admin)
app.patch('/api/products/:id/stock', authMiddleware, async (req, res) => {
  try {
    const { stock } = req.body
    const { data, error } = await supabase.from('products').update({ stock: Number(stock) }).eq('id', req.params.id).select().single()
    if (error) throw error
    res.json({ product: data, message: 'Stock updated' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Order status update (admin)
app.patch('/api/orders/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body
    const valid = ['pending','confirmed','shipped','delivered','cancelled']
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' })
    const { data, error } = await supabase.from('orders').update({ status }).eq('id', req.params.id).select().single()
    if (error) throw error
    const { data: userOrder } = await supabase.from('orders').select('user_id, users(email,name)').eq('id', req.params.id).single()
    if (userOrder?.users) {
      sendEmail(userOrder.users.email, `Order ${status.charAt(0).toUpperCase()+status.slice(1)} — ShieldMart`,
        `<div style="font-family:Inter,sans-serif;padding:32px;max-width:560px;margin:0 auto"><h2>Order Update</h2><p>Hi ${userOrder.users.name}, your order #${req.params.id.slice(0,8).toUpperCase()} is now <strong>${status}</strong>.</p></div>`)
    }
    res.json({ order: data, message: 'Status updated' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Admin: Get all orders
app.get('/api/orders/all', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.from('orders')
      .select('*, users(name,email), order_items(quantity,price,products(name))')
      .order('created_at', { ascending: false }).limit(50)
    if (error) throw error
    res.json({ orders: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.listen(PORT, () => {
  console.log(`ShieldMart Backend running on http://localhost:${PORT}`)
})
