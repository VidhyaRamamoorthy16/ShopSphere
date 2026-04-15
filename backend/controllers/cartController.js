const supabase = require('../config/supabase');

// 1. GET /cart
exports.getCart = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cart')
      .select(`
        id,
        quantity,
        product:products (id, name, price, image_url, category)
      `)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. POST /cart/add
exports.addToCart = async (req, res) => {
  try {
    const { product_id, quantity = 1 } = req.body;

    // Simple UUID validation to prevent PostgREST 500 errors
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(product_id)) {
      return res.status(400).json({ error: "Invalid product ID format. Expected a UUID." });
    }
    
    // Check if item already exists in cart for this user
    const { data: existingItem, error: fetchError } = await supabase
      .from('cart')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('product_id', product_id)
      .single();

    if (existingItem) {
      // Update quantity
      const { data, error } = await supabase
        .from('cart')
        .update({ quantity: existingItem.quantity + quantity })
        .eq('id', existingItem.id)
        .select()
        .single();
      
      if (error) throw error;
      return res.json(data);
    }

    // Insert new item
    const { data, error } = await supabase
      .from('cart')
      .insert([{ user_id: req.user.id, product_id, quantity }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 3. PUT /cart/update/:id
exports.updateCartItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    const { data, error } = await supabase
      .from('cart')
      .update({ quantity })
      .eq('id', id)
      .eq('user_id', req.user.id) // Ensure security
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 4. DELETE /cart/remove/:id
exports.removeFromCart = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('cart')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ message: "Item removed from cart" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
