import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Supabase connection
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

app.use(express.static("public"));

// Registration API
app.post("/api/register", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user into correct column
    const { error } = await supabase.from("users").insert([
      { username, email, password_hash: hashedPassword }
    ]);

    if (error) throw error;

    // ✅ Only one response
    res.json({ message: "User registered successfully", redirect: "/login.html" });
  } catch (err) {
    console.error("Registration error:", err.message);
    res.status(500).json({ error: "Failed to register user" });
  }
});

// Login API
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  console.log("Login attempt for email:", email);

  try {
    // Query user from database
    const { data: user, error } = await supabase
      .from("users")
      .select("user_id, email, password_hash, username")
      .eq("email", email)
      .maybeSingle();

    console.log("Database query result:", { user: user ? "found" : "not found", error });

    // Check if user exists
    if (error) {
      console.log("Database error:", error);
      return res.status(500).json({ error: "Database error" });
    }

    if (!user) {
      console.log("User not found in database");
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // Check if password_hash exists
    if (!user.password_hash) {
      console.log("No password hash found for user");
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    console.log("Password validation:", validPassword);

    if (!validPassword) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    console.log("Login successful for user:", user.username);

    res.json({
      message: "Login successful",
      redirect: "/dashboard.html",
      userId: user.user_id,
      username: user.username,
      email: user.email
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Add transaction - Updated to handle custom categories and dates
app.post('/api/transactions', async (req, res) => {
  const { user_id, transaction_type, category, description, amount, transaction_date } = req.body;

  console.log("Adding transaction:", { user_id, transaction_type, category, description, amount, transaction_date });

  // Basic validation
  if (!user_id || !transaction_type || !category || !amount || !transaction_date) {
    return res.status(400).json({ 
      success: false, 
      error: "Missing required fields: user_id, transaction_type, category, amount, transaction_date" 
    });
  }

  try {
    // First, save custom category if it's not a default one
    const defaultCategories = ['Food', 'Travel', 'Entertainment'];
    if (!defaultCategories.includes(category)) {
      // Try to insert the category (ignore if already exists due to UNIQUE constraint)
      await supabase
        .from('user_categories')
        .insert([
          {
            user_id: parseInt(user_id),
            category_name: category
          }
        ])
        .select();
      // Note: This might fail due to UNIQUE constraint, but that's okay - category already exists
    }

    // Add the transaction with the specified date
    const transactionDateTime = new Date(transaction_date);
    
    const { data, error } = await supabase
      .from('transactions')
      .insert([
        {
          user_id: parseInt(user_id),
          transaction_type,
          category,
          description,
          amount: parseFloat(amount),
          transaction_date: transactionDateTime.toISOString()
        }
      ])
      .select();

    if (error) {
      console.error("Supabase error:", error);
      throw error;
    }
    
    console.log("Transaction added successfully:", data);
    res.json({ success: true, data });
  } catch (err) {
    console.error("Error adding transaction:", err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

// Get user's custom categories
app.get('/api/categories/:user_id', async (req, res) => {
  const user_id = req.params.user_id;
  
  console.log("Fetching categories for user_id:", user_id);

  try {
    const { data, error } = await supabase
      .from('user_categories')
      .select('category_name')
      .eq('user_id', user_id)
      .order('category_name');

    if (error) {
      console.error("Supabase categories fetch error:", error);
      throw error;
    }
    
    console.log("Fetched categories:", data ? data.length : 0, "categories");
    res.json({ success: true, data });
  } catch (err) {
    console.error("Error fetching categories:", err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

// Fetch transactions for specific date
app.get('/api/transactions/:user_id/:date', async (req, res) => {
  const user_id = req.params.user_id;
  const requestedDate = req.params.date;
  
  console.log("Fetching transactions for user_id:", user_id, "date:", requestedDate);

  try {
    // Parse the requested date and create start/end of day range
    const selectedDate = new Date(requestedDate);
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    console.log("Date range:", { 
      startOfDay: startOfDay.toISOString(), 
      endOfDay: endOfDay.toISOString() 
    });

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user_id)
      .gte('transaction_date', startOfDay.toISOString())
      .lte('transaction_date', endOfDay.toISOString())
      .order('transaction_date', { ascending: true });

    if (error) {
      console.error("Supabase fetch error:", error);
      throw error;
    }
    
    console.log("Fetched transactions:", data ? data.length : 0, "records");
    res.json({ success: true, data });
  } catch (err) {
    console.error("Error fetching transactions:", err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

// Fetch today's transactions - Enhanced with better logging (DEPRECATED - use date-specific endpoint)
app.get('/api/transactions/:user_id', async (req, res) => {
  const user_id = req.params.user_id;
  
  console.log("Fetching TODAY's transactions for user_id:", user_id);

  // Compute today's range
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  console.log("Date range:", { 
    startOfDay: startOfDay.toISOString(), 
    endOfDay: endOfDay.toISOString() 
  });

  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user_id)
      .gte('transaction_date', startOfDay.toISOString())
      .lte('transaction_date', endOfDay.toISOString())
      .order('transaction_date', { ascending: true });

    if (error) {
      console.error("Supabase fetch error:", error);
      throw error;
    }
    
    console.log("Fetched transactions:", data ? data.length : 0, "records");
    res.json({ success: true, data });
  } catch (err) {
    console.error("Error fetching transactions:", err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("🚀 Server is up and running!");
});

// Start server
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
