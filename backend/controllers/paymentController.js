const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { supabase } = require('../config/supabase');

// Create payment intent
const createPaymentIntent = async (req, res) => {
  try {
    const { items, currency = 'usd' } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Invalid items array' });
    }
    
    // Calculate total amount
    let totalAmount = 0;
    const lineItems = [];
    
    for (const item of items) {
      // Verify product exists and get current price
      const { data: product, error } = await supabase
        .from('products')
        .select('id, name, price, stock')
        .eq('id', item.productId)
        .single();
      
      if (error || !product) {
        return res.status(400).json({ error: `Product ${item.productId} not found` });
      }
      
      // Check stock
      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          error: `Insufficient stock for ${product.name}. Available: ${product.stock}` 
        });
      }
      
      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;
      
      lineItems.push({
        price_data: {
          currency,
          product_data: {
            name: product.name,
            description: `Quantity: ${item.quantity}`,
            images: [product.image_url]
          },
          unit_amount: Math.round(product.price * 100), // Convert to cents
        },
        quantity: item.quantity
      });
    }
    
    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // Convert to cents
      currency,
      line_items: lineItems,
      metadata: {
        userId: req.user.userId,
        items: JSON.stringify(items)
      },
      automatic_payment_methods: {
        enabled: true
      }
    });
    
    // Store payment intent in database for tracking
    await supabase
      .from('payment_intents')
      .insert({
        stripe_payment_intent_id: paymentIntent.id,
        user_id: req.user.userId,
        amount: totalAmount,
        currency,
        status: paymentIntent.status,
        items: items,
        created_at: new Date().toISOString()
      });
    
    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: totalAmount,
      currency
    });
    
  } catch (error) {
    console.error('Payment intent creation error:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
};

// Confirm payment and create order
const confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId, shippingAddress } = req.body;
    
    if (!paymentIntentId) {
      return res.status(400).json({ error: 'Payment intent ID required' });
    }
    
    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Payment not successful' });
    }
    
    // Check if order already exists for this payment intent
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single();
    
    if (existingOrder) {
      return res.status(400).json({ error: 'Order already exists for this payment' });
    }
    
    // Parse items from metadata
    const items = JSON.parse(paymentIntent.metadata.items);
    
    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: req.user.userId,
        total_amount: paymentIntent.amount / 100, // Convert from cents
        currency: paymentIntent.currency,
        status: 'processing',
        stripe_payment_intent_id: paymentIntentId,
        shipping_address: shippingAddress,
        items: items,
        payment_method: 'stripe',
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (orderError) throw orderError;
    
    // Update product stock
    for (const item of items) {
      await supabase
        .from('products')
        .update({ 
          stock: supabase.rpc('decrement_stock', { 
            product_id: item.productId, 
            quantity: item.quantity 
          })
        })
        .eq('id', item.productId);
    }
    
    // Clear user cart
    await supabase
      .from('cart')
      .delete()
      .eq('user_id', req.user.userId);
    
    // Update payment intent status
    await supabase
      .from('payment_intents')
      .update({ status: 'succeeded' })
      .eq('stripe_payment_intent_id', paymentIntentId);
    
    res.json({
      order,
      message: 'Payment confirmed and order created successfully'
    });
    
  } catch (error) {
    console.error('Payment confirmation error:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
};

// Handle Stripe webhooks
const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.log(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`);
      
      // Update payment intent status in database
      await supabase
        .from('payment_intents')
        .update({ status: 'succeeded' })
        .eq('stripe_payment_intent_id', paymentIntent.id);
      
      break;
      
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      console.log(`Payment failed: ${failedPayment.last_payment_error?.message}`);
      
      // Update payment intent status in database
      await supabase
        .from('payment_intents')
        .update({ 
          status: 'failed',
          error_message: failedPayment.last_payment_error?.message
        })
        .eq('stripe_payment_intent_id', failedPayment.id);
      
      break;
      
    case 'payment_intent.canceled':
      const canceledPayment = event.data.object;
      console.log(`Payment canceled: ${canceledPayment.id}`);
      
      // Update payment intent status in database
      await supabase
        .from('payment_intents')
        .update({ status: 'canceled' })
        .eq('stripe_payment_intent_id', canceledPayment.id);
      
      break;
      
    default:
      console.log(`Unhandled event type ${event.type}`);
  }
  
  // Return a 200 response to acknowledge receipt of the event
  res.json({ received: true });
};

// Get payment methods for a user
const getPaymentMethods = async (req, res) => {
  try {
    const customerId = await getOrCreateStripeCustomer(req.user.userId);
    
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card'
    });
    
    res.json({
      paymentMethods: paymentMethods.data
    });
    
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ error: 'Failed to get payment methods' });
  }
};

// Helper function to get or create Stripe customer
const getOrCreateStripeCustomer = async (userId) => {
  try {
    // Check if user already has a Stripe customer ID
    const { data: user, error } = await supabase
      .from('users')
      .select('stripe_customer_id, email, full_name')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    
    if (user.stripe_customer_id) {
      return user.stripe_customer_id;
    }
    
    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.full_name,
      metadata: {
        userId: userId
      }
    });
    
    // Save customer ID to database
    await supabase
      .from('users')
      .update({ stripe_customer_id: customer.id })
      .eq('id', userId);
    
    return customer.id;
    
  } catch (error) {
    console.error('Get/create customer error:', error);
    throw error;
  }
};

module.exports = {
  createPaymentIntent,
  confirmPayment,
  handleWebhook,
  getPaymentMethods
};
