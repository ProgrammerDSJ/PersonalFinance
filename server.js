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
      .maybeSingle();

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

    res.json({ message: "User registered successfully", redirect: "/login.html" });
  } catch (err) {
    console.error("Registration error:", err.message);
    res.status(500).json({ error: "Failed to register user" });
  }
});

// Login API with enhanced debugging
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  console.log("Login attempt for email:", email); // Debug log

  try {
    // Query user from database - use .maybeSingle() instead of .single()
    const { data: user, error } = await supabase
      .from("users")
      .select("user_id, email, password_hash, username")
      .eq("email", email)
      .maybeSingle();

    console.log("Database query result:", { user: user ? "found" : "not found", error }); // Debug log

    // Check if user exists
    if (error) {
      console.log("Database error:", error); // Debug log
      return res.status(500).json({ error: "Database error" });
    }

    if (!user) {
      console.log("User not found in database"); // Debug log
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // Check if password_hash exists
    if (!user.password_hash) {
      console.log("No password hash found for user"); // Debug log
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // Compare passwords
    const validPassword = await bcrypt.compare(password, user.password_hash);
    console.log("Password validation:", validPassword); // Debug log

    if (!validPassword) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    console.log("Login successful for user:", user.username); // Debug log

    res.json({
      message: "Login successful",
      redirect: "/transactionlab.html",
      userId: user.user_id,
      username: user.username,
      email: user.email
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Add transaction with duplicate prevention
app.post('/api/transactions', async (req, res) => {
  const { user_id, transaction_type, category, title, description, amount } = req.body;

  // Input validation
  if (!user_id || !transaction_type || !category || !amount) {
    return res.status(400).json({ 
      success: false, 
      error: "Missing required fields: user_id, transaction_type, category, amount" 
    });
  }

  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ 
      success: false, 
      error: "Amount must be a positive number" 
    });
  }

  try {
    // Check for potential duplicates (same user, type, category, amount within last 30 seconds)
    const thirtySecondsAgo = new Date(Date.now() - 30000);
    
    const { data: recentTransactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user_id)
      .eq('transaction_type', transaction_type)
      .eq('category', category)
      .eq('amount', amount)
      .gte('transaction_date', thirtySecondsAgo.toISOString());

    // If we find identical transactions within 30 seconds, it's likely a duplicate
    if (recentTransactions && recentTransactions.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: "Duplicate transaction detected. Please wait before adding the same transaction again." 
      });
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert([
        {
          user_id,
          transaction_type,
          category,
          title,
          description,
          amount,
          transaction_date: new Date() // can omit since default is CURRENT_TIMESTAMP
        }
      ])
      .select(); // Return the inserted data

    if (error) throw error;
    
    console.log("Transaction added successfully:", data[0]); // Debug log
    res.json({ success: true, data: data[0] });
  } catch (err) {
    console.error("Error adding transaction:", err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

// Fetch today's transactions
app.get('/api/transactions/:user_id', async (req, res) => {
  const user_id = req.params.user_id;

  // Input validation
  if (!user_id) {
    return res.status(400).json({ success: false, error: "User ID is required" });
  }

  // Compute today's range
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user_id)
      .gte('transaction_date', startOfDay.toISOString())
      .lte('transaction_date', endOfDay.toISOString())
      .order('transaction_date', { ascending: true });

    if (error) throw error;
    
    console.log(`Fetched ${data.length} transactions for user ${user_id}`); // Debug log
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