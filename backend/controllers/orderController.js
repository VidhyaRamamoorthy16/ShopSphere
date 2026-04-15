const supabase = require('../config/supabase');

// 1. POST /orders (Checkout)
exports.placeOrder = async (req, res) => {
  try {
    const userId = req.user.id;

    // A. Fetch current cart items
    const { data: cartItems, error: cartError } = await supabase
      .from('cart')
      .select(`
        id,
        quantity,
        product:products (id, name, price, stock)
      `)
      .eq('user_id', userId);

    if (cartError || !cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    // B. Calculate total amount and verify stock
    let totalAmount = 0;
    for (const item of cartItems) {
      if (item.product.stock < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${item.product.name}` });
      }
      totalAmount += item.product.price * item.quantity;
    }

    // C. Create the Order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([{ user_id: userId, total_amount: totalAmount, status: 'pending' }])
      .select()
      .single();

    if (orderError) throw orderError;

    // D. Create Order Items & Update Stock
    const orderItemsToInsert = cartItems.map(item => ({
      order_id: order.id,
      product_id: item.product.id,
      quantity: item.quantity,
      price: item.product.price
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(orderItemsToInsert);
    if (itemsError) throw itemsError;

    // E. Update Stock for each product (Professional approach: decrement)
    for (const item of cartItems) {
        await supabase
            .from('products')
            .update({ stock: item.product.stock - item.quantity })
            .eq('id', item.product.id);
    }

    // F. Clear the Cart
    await supabase.from('cart').delete().eq('user_id', userId);

    res.status(201).json({ 
        message: "Order placed successfully", 
        orderId: order.id,
        totalAmount 
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. GET /orders (Order History)
exports.getOrders = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 3. GET /orders/:id (Details)
exports.getOrderDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items (
          id,
          quantity,
          price,
          product:products (name, image_url)
        )
      `)
      .eq('id', id)
      .eq('user_id', req.user.id) // Security
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 4. GET /orders/admin/all (Admin only)
exports.getAllOrders = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        user:users (name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 5. PUT /orders/admin/:id/status (Admin only)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 6. GET /orders/admin/stats (Admin only)
exports.getAdminStats = async (req, res) => {
  try {
    const { data: orders, error } = await supabase.from('orders').select('total_amount, status');
    if (error) throw error;

    const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total_amount), 0);
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;

    res.json({ totalRevenue, totalOrders, pendingOrders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
