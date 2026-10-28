const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const Product = require("./models/Product");
const User = require("./models/User");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Home
app.get("/", (req, res) => {
  res.json({
    message: "Multi-Tenant E-Commerce API is running!",
    status: "success"
  });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    server: "running",
    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected"
  });
});

// Product formatter
function formatProduct(product) {
  return {
    id: product._id.toString(),
    name: product.name,
    price: product.price,
    vendor: product.vendor,
    category: product.category
  };
}

// Get products
app.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products.map(formatProduct));
  } catch (error) {
    console.error("Get products error:", error.message);
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

// Add product
app.post("/api/products", async (req, res) => {
  try {
    const { name, price, vendor, category } = req.body;

    if (
      typeof name !== "string" || !name.trim() ||
      price === undefined || price === null || price === "" ||
      typeof vendor !== "string" || !vendor.trim() ||
      typeof category !== "string" || !category.trim()
    ) {
      return res.status(400).json({
        message: "Name, price, vendor and category are required"
      });
    }

    const numericPrice = Number(price);

    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      return res.status(400).json({
        message: "Price must be a positive number"
      });
    }

    const product = await Product.create({
      name: name.trim(),
      price: numericPrice,
      vendor: vendor.trim(),
      category: category.trim()
    });

    res.status(201).json({
      message: "Product added successfully",
      product: formatProduct(product)
    });
  } catch (error) {
    console.error("Add product error:", error.message);
    res.status(500).json({ message: "Failed to add product" });
  }
});

// Signup
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (
      typeof name !== "string" || !name.trim() ||
      typeof email !== "string" || !email.trim() ||
      typeof password !== "string" || password.length < 8
    ) {
      return res.status(400).json({
        message: "Name, email and password (minimum 8 characters) are required"
      });
    }

    const selectedRole = role || "customer";

    if (!["customer", "vendor"].includes(selectedRole)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email already registered. Please login."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: selectedRole
    });

    res.status(201).json({
      message: "Signup successful",
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Signup error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Email already registered. Please login."
      });
    }

    res.status(500).json({ message: "Signup failed" });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase()
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing in backend/.env");
      return res.status(500).json({
        message: "Server authentication configuration missing"
      });
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ message: "Login failed" });
  }
});

// Start server after database connects
async function startServer() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI missing in backend/.env");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected Successfully!");

    const count = await Product.countDocuments();

    if (count === 0) {
      await Product.insertMany([
        {
          name: "Classic T-Shirt",
          price: 499,
          vendor: "Urban Store",
          category: "Fashion"
        },
        {
          name: "Coffee Beans",
          price: 399,
          vendor: "Coffee House",
          category: "Food"
        },
        {
          name: "Wireless Headphones",
          price: 1999,
          vendor: "Tech World",
          category: "Electronics"
        }
      ]);

      console.log("Sample products added to MongoDB!");
    }

    app.listen(PORT, () => {
      console.log(`Backend running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Backend startup error:", error.message);
  }
}

startServer();