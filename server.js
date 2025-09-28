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

  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("user_id, email, password_hash, username")
      .eq("email", email)
      .single();

    if (error || !user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // ✅ Only one response
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

app.get("/", (req, res) => {
  res.send("🚀 Server is up and running!");
});

// Start server
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
