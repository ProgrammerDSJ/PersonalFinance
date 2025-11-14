import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { MongoClient, ServerApiVersion } from "mongodb";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Supabase connection
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// MongoDB Connection
const mongoClient = new MongoClient(process.env.MONGO_URL, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let db;
let onboardingCollection;

// Connect to MongoDB
async function connectMongoDB() {
  try {
    await mongoClient.connect();
    await mongoClient.db("admin").command({ ping: 1 });
    console.log("✅ Successfully connected to MongoDB!");
    
    db = mongoClient.db("financeapp");
    onboardingCollection = db.collection("user_onboarding");
    
    return true;
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    return false;
  }
}

// Initialize MongoDB connection
connectMongoDB();

app.use(express.static("public"));

// Registration API - Only creates user account
app.post("/api/register", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

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

    // Insert user into Supabase
    const { data: newUser, error } = await supabase
      .from("users")
      .insert([{ username, email, password_hash: hashedPassword }])
      .select()
      .single();

    if (error) throw error;

    console.log("User registered successfully:", newUser.user_id);

    res.json({ 
      message: "User registered successfully", 
      redirect: "/onboarding.html",
      userId: newUser.user_id,
      username: newUser.username,
      email: newUser.email
    });
  } catch (err) {
    console.error("Registration error:", err.message);
    res.status(500).json({ error: "Failed to register user" });
  }
});

// Onboarding API - Stores additional user data in MongoDB
app.post("/api/onboarding", async (req, res) => {
  const { 
    userId, 
    interests, 
    appUsage, 
    financialGoals, 
    achievementPlan, 
    timeframe,
    timeframeUnit 
  } = req.body;

  console.log("Received onboarding data for user:", userId);

  if (!userId || !interests || !appUsage || !financialGoals || !achievementPlan || !timeframe || !timeframeUnit) {
    return res.status(400).json({ 
      success: false, 
      error: "All onboarding fields are required" 
    });
  }

  try {
    // Check MongoDB connection
    if (!onboardingCollection) {
      throw new Error("MongoDB not connected");
    }

    // Check if onboarding data already exists for this user
    const existingOnboarding = await onboardingCollection.findOne({ userId: userId });

    if (existingOnboarding) {
      // Update existing onboarding data
      await onboardingCollection.updateOne(
        { userId: userId },
        {
          $set: {
            interests,
            appUsage,
            financialGoals,
            achievementPlan,
            timeframe: {
              value: parseInt(timeframe),
              unit: timeframeUnit
            },
            updatedAt: new Date()
          }
        }
      );
      console.log("Onboarding data updated for user:", userId);
    } else {
      // Insert new onboarding data
      await onboardingCollection.insertOne({
        userId: userId,
        interests,
        appUsage,
        financialGoals,
        achievementPlan,
        timeframe: {
          value: parseInt(timeframe),
          unit: timeframeUnit
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log("Onboarding data created for user:", userId);
    }

    res.json({ 
      success: true, 
      message: "Onboarding completed successfully",
      redirect: "/login.html"
    });

  } catch (err) {
    console.error("Error saving onboarding data:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to save onboarding data" 
    });
  }
});

// Get onboarding data for a user
app.get("/api/onboarding/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    if (!onboardingCollection) {
      throw new Error("MongoDB not connected");
    }

    const onboardingData = await onboardingCollection.findOne({ userId: userId });

    if (!onboardingData) {
      return res.json({ success: true, data: null });
    }

    res.json({ success: true, data: onboardingData });
  } catch (err) {
    console.error("Error fetching onboarding data:", err);
    res.status(500).json({ success: false, error: "Failed to fetch onboarding data" });
  }
});

// Login API with enhanced debugging
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

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

    // Compare passwords
    const validPassword = await bcrypt.compare(password, user.password_hash);
    console.log("Password validation:", validPassword);

    if (!validPassword) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    console.log("Login successful for user:", user.username);

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
  const { user_id, transaction_type, category, description, amount, transaction_date } = req.body;

  console.log("Received transaction data:", req.body);

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
    // Use provided date or default to current timestamp
    const transactionDate = transaction_date ? new Date(transaction_date) : new Date();
    
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
          description,
          amount,
          transaction_date: transactionDate.toISOString()
        }
      ])
      .select();

    if (error) {
      console.error("Supabase insert error:", error);
      throw error;
    }
    
    console.log("Transaction added successfully:", data[0]);
    res.json({ success: true, data: data[0] });
  } catch (err) {
    console.error("Error adding transaction:", err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

// Fetch transactions with filter support
app.get('/api/transactions/:user_id', async (req, res) => {
  const user_id = req.params.user_id;
  const filter = req.query.filter || 'today';

  console.log("Fetching transactions for user_id:", user_id, "with filter:", filter);

  // Input validation
  if (!user_id) {
    return res.status(400).json({ success: false, error: "User ID is required" });
  }

  // Calculate date range based on filter
  const now = new Date();
  let startDate, endDate;

  switch(filter) {
    case 'today':
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      break;
    
    case '7days':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      break;
    
    case '2weeks':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 14);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      break;
    
    case '1month':
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      break;
    
    case 'all':
      // For all time, we don't set date filters
      startDate = null;
      endDate = null;
      break;
    
    default:
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
  }

  console.log("Date range:", {
    start: startDate ? startDate.toISOString() : 'beginning of time',
    end: endDate ? endDate.toISOString() : 'now',
    filter: filter
  });

  try {
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user_id);

    // Only apply date filters if not 'all'
    if (startDate && endDate) {
      query = query
        .gte('transaction_date', startDate.toISOString())
        .lte('transaction_date', endDate.toISOString());
    }

    const { data, error } = await query.order('transaction_date', { ascending: false });

    if (error) {
      console.error("Supabase fetch error:", error);
      throw error;
    }
    
    console.log(`Fetched ${data.length} transactions for user ${user_id} with filter ${filter}`);
    res.json({ success: true, data });
  } catch (err) {
    console.error("Error fetching transactions:", err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

// AI Chat endpoint using Gemini with MongoDB and Supabase context
app.post('/api/ai-chat', async (req, res) => {
  const { message, systemPrompt, chatHistory, userId } = req.body;

  console.log("AI Chat request received for user:", userId);

  if (!message) {
    return res.status(400).json({ 
      success: false, 
      error: "Message is required" 
    });
  }

  try {
    // Fetch onboarding data from MongoDB if userId is provided
    let onboardingContext = "";
    if (userId && onboardingCollection) {
      const onboardingData = await onboardingCollection.findOne({ userId: userId });
      
      if (onboardingData) {
        onboardingContext = `

USER PROFILE AND GOALS:
- Interests: ${onboardingData.interests}
- App Usage Intent: ${onboardingData.appUsage}
- Financial Goals: ${onboardingData.financialGoals}
- Achievement Plan: ${onboardingData.achievementPlan}
- Target Timeframe: ${onboardingData.timeframe.value} ${onboardingData.timeframe.unit}

When providing advice, consider the user's stated goals and timeframe. Tailor your recommendations to help them achieve their specific financial objectives.
`;
        console.log("Added onboarding context to AI prompt");
      }
    }

    // Initialize the model
    const model = genAI.getGenerativeModel({ model: "gemini-pro-latest" });

    // Build the conversation history for context
    let fullPrompt = systemPrompt + onboardingContext + "\n\n";
    
    // Add chat history if available
    if (chatHistory && chatHistory.length > 0) {
      fullPrompt += "Previous conversation:\n";
      chatHistory.forEach(msg => {
        fullPrompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
      });
      fullPrompt += "\n";
    }
    
    // Add current user message
    fullPrompt += `User: ${message}\n\nAssistant:`;

    console.log("Sending prompt to Gemini (length:", fullPrompt.length, "chars)");

    // Generate response
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    console.log("Received response from Gemini (length:", text.length, "chars)");

    res.json({ 
      success: true, 
      response: text 
    });

  } catch (err) {
    console.error("Error calling Gemini API:", err);
    
    // Provide more specific error messages
    let errorMessage = "Failed to get AI response";
    
    if (err.message && err.message.includes("API key")) {
      errorMessage = "AI service configuration error. Please check API key.";
    } else if (err.message && err.message.includes("quota")) {
      errorMessage = "AI service quota exceeded. Please try again later.";
    }
    
    res.status(500).json({ 
      success: false, 
      error: errorMessage 
    });
  }
});

app.get("/", (req, res) => {
  res.send("🚀 Server is up and running!");
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log("\nShutting down gracefully...");
  await mongoClient.close();
  console.log("MongoDB connection closed");
  process.exit(0);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("Gemini AI integration enabled");
  console.log("MongoDB integration enabled");
});