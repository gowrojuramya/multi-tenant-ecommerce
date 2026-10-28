import { useState, useEffect } from "react";
import "./App.css";

const initialProducts = [
  { id: 1, name: "Classic T-Shirt", category: "Fashion", price: 499, emoji: "👕", vendor: "Urban Store" },
  { id: 2, name: "Coffee Beans", category: "Food", price: 399, emoji: "☕", vendor: "Coffee House" },
  { id: 3, name: "Running Shoes", category: "Fashion", price: 1299, emoji: "👟", vendor: "Sport Zone" },
  { id: 4, name: "Wireless Headphones", category: "Electronics", price: 1999, emoji: "🎧", vendor: "Tech World" },
  { id: 5, name: "Travel Backpack", category: "Accessories", price: 899, emoji: "🎒", vendor: "Urban Store" },
  { id: 6, name: "Smart Watch", category: "Electronics", price: 2499, emoji: "⌚", vendor: "Tech World" }
];

const emptyProduct = {
  name: "",
  price: "",
  vendor: "",
  category: "Fashion"
};

const emptyAuthForm = {
  name: "",
  email: "",
  password: ""
};

function getEmoji(category) {
  if (category === "Fashion") return "👕";
  if (category === "Food") return "☕";
  if (category === "Electronics") return "🎧";
  if (category === "Accessories") return "🎒";
  return "🛍️";
}

export default function App() {
  const [products, setProducts] = useState(initialProducts);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProduct, setNewProduct] = useState(emptyProduct);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState([]);
  const [page, setPage] = useState("Shop");
  const [apiStatus, setApiStatus] = useState("Checking backend...");

  const [authMode, setAuthMode] = useState("");
  const [authForm, setAuthForm] = useState(emptyAuthForm);
  const [authMessage, setAuthMessage] = useState("");
  const [loggedInUser, setLoggedInUser] = useState(() => {
    try {
      const token = localStorage.getItem("token");
      const savedUser = localStorage.getItem("user");
      return token && savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  // Load products from backend
  useEffect(() => {
    fetch("http://localhost:5000/api/products")
      .then((response) => {
        if (!response.ok) throw new Error("Products could not load");
        return response.json();
      })
      .then((data) => {
        setProducts(
          data.map((product) => ({
            ...product,
            emoji: getEmoji(product.category)
          }))
        );
      })
      .catch((error) => {
        console.error("Product loading error:", error.message);
      });
  }, []);

  // Check backend status
  useEffect(() => {
    fetch("http://localhost:5000/api/health")
      .then((response) => {
        if (!response.ok) throw new Error("Backend error");
        return response.json();
      })
      .then((data) => {
        setApiStatus(
          data.status === "OK"
            ? data.database === "connected"
              ? "Backend and Database Connected"
              : "Backend Connected · Check Database"
            : "Backend Error"
        );
      })
      .catch(() => setApiStatus("Backend Not Connected"));
  }, []);

  const categories = [
    "All",
    ...new Set(products.map((product) => product.category))
  ];

  const filteredProducts = products.filter((product) => {
    const matchesName = product.name
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesCategory =
      category === "All" || product.category === category;

    return matchesName && matchesCategory;
  });

  // Login and Signup
 async function handleAuthSubmit(event) {
  event.preventDefault();
  setAuthMessage("Please wait...");

  try {
    const payload =
      authMode === "signup"
        ? authForm
        : {
            email: authForm.email,
            password: authForm.password
          };

    const response = await fetch(
      `http://localhost:5000/api/auth/${authMode}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      const text = await response.text();
      console.error("Backend returned non-JSON:", text);

      throw new Error(
        `Backend returned HTML instead of JSON. Check API route and backend server. Status: ${response.status}`
      );
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }

    if (authMode === "login") {
      if (!data.token || !data.user) {
        throw new Error("Login response is missing token or user details");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setLoggedInUser(data.user);
    }

    setAuthMessage(
      authMode === "signup"
        ? "Account created! You can now login using your email and password."
        : data.message || "Login successful!"
    );

    setAuthForm(emptyAuthForm);
  } catch (error) {
    console.error("Authentication error:", error);
    setAuthMessage(
      error.message || "Cannot connect to backend. Check server."
    );
  }
}
  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setLoggedInUser(null);
    setAuthMode("");
    setAuthMessage("Logged out successfully.");
  }

  // Add product
  async function handleAddProduct(event) {
    event.preventDefault();
    setMessage("");

    try {
      const response = await fetch(
        "http://localhost:5000/api/products",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            ...newProduct,
            price: Number(newProduct.price)
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not add product");
      }

      const addedProduct = {
        ...data.product,
        emoji: getEmoji(data.product.category)
      };

      setProducts((previous) => [...previous, addedProduct]);
      setNewProduct(emptyProduct);
      setShowAddForm(false);
      setMessage("Product added successfully!");
    } catch (error) {
      setMessage(error.message || "Could not connect to backend");
    }
  }

  function openAuth(mode) {
    setAuthMode(mode);
    setAuthMessage("");
    setAuthForm(emptyAuthForm);
  }

  return (
    <div className="app">
      <div style={{ textAlign: "center", padding: "20px" }}>
        <p style={{ color: "green" }}>{apiStatus}</p>

        <button
          type="button"
          onClick={() => {
            setShowAddForm((previous) => !previous);
            setMessage("");
          }}
        >
          {showAddForm ? "Cancel" : "+ Add Product"}
        </button>

        {showAddForm && (
          <form
            onSubmit={handleAddProduct}
            style={{
              maxWidth: "400px",
              margin: "20px auto",
              display: "grid",
              gap: "12px"
            }}
          >
            <input
              placeholder="Product name"
              value={newProduct.name}
              onChange={(event) =>
                setNewProduct({
                  ...newProduct,
                  name: event.target.value
                })
              }
              required
            />

            <input
              type="number"
              placeholder="Price (₹)"
              min="1"
              value={newProduct.price}
              onChange={(event) =>
                setNewProduct({
                  ...newProduct,
                  price: event.target.value
                })
              }
              required
            />

            <input
              placeholder="Vendor / Store name"
              value={newProduct.vendor}
              onChange={(event) =>
                setNewProduct({
                  ...newProduct,
                  vendor: event.target.value
                })
              }
              required
            />

            <select
              value={newProduct.category}
              onChange={(event) =>
                setNewProduct({
                  ...newProduct,
                  category: event.target.value
                })
              }
            >
              <option value="Fashion">Fashion</option>
              <option value="Food">Food</option>
              <option value="Electronics">Electronics</option>
              <option value="Accessories">Accessories</option>
            </select>

            <button type="submit">Save Product</button>
          </form>
        )}

        {message && <p>{message}</p>}
      </div>

      <header className="navbar">
        <button
          className="brand"
          onClick={() => {
            setPage("Shop");
            setAuthMode("");
          }}
        >
          MultiStore<span>.</span>
        </button>

        <nav>
          <button onClick={() => { setPage("Shop"); setAuthMode(""); }}>
            Shop
          </button>
          <button onClick={() => { setPage("Vendors"); setAuthMode(""); }}>
            Vendors
          </button>
          <button onClick={() => { setPage("Dashboard"); setAuthMode(""); }}>
            Dashboard
          </button>
        </nav>

        <button
          className="cart-btn"
          onClick={() => {
            setPage("Cart");
            setAuthMode("");
          }}
        >
          🛒 Cart ({cart.length})
        </button>

        {loggedInUser ? (
          <>
            <span>Hi, {loggedInUser.name}</span>
            <button onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <button onClick={() => openAuth("login")}>Login</button>
            <button onClick={() => openAuth("signup")}>Signup</button>
          </>
        )}
      </header>

      {authMode && (
        <section className="content">
          <h2>
            {authMode === "signup" ? "Create Account" : "Welcome Back"}
          </h2>

          <form
            onSubmit={handleAuthSubmit}
            style={{
              maxWidth: "400px",
              margin: "20px auto",
              display: "grid",
              gap: "12px"
            }}
          >
            {authMode === "signup" && (
              <input
                placeholder="Your name"
                value={authForm.name}
                onChange={(event) =>
                  setAuthForm({
                    ...authForm,
                    name: event.target.value
                  })
                }
                required
              />
            )}

            <input
              type="email"
              placeholder="Email address"
              value={authForm.email}
              onChange={(event) =>
                setAuthForm({
                  ...authForm,
                  email: event.target.value
                })
              }
              required
            />

            <input
              type="password"
              placeholder="Password (minimum 8 characters)"
              value={authForm.password}
              onChange={(event) =>
                setAuthForm({
                  ...authForm,
                  password: event.target.value
                })
              }
              minLength={8}
              required
            />

            <button type="submit">
              {authMode === "signup" ? "Create Account" : "Login"}
            </button>
          </form>

          <p style={{ textAlign: "center" }}>{authMessage}</p>

          <p style={{ textAlign: "center" }}>
            {authMode === "signup"
              ? "Already registered?"
              : "Don't have an account?"}
            {" "}
            <button
              onClick={() =>
                openAuth(authMode === "signup" ? "login" : "signup")
              }
            >
              {authMode === "signup" ? "Login" : "Signup"}
            </button>
          </p>

          <div style={{ textAlign: "center" }}>
            <button onClick={() => setAuthMode("")}>Close</button>
          </div>
        </section>
      )}

      {!authMode && page === "Shop" && (
        <>
          <section className="hero">
            <p className="eyebrow">ONE PLATFORM · MANY STORES</p>
            <h1>
              Everything you love,
              <br />
              <span>all in one place.</span>
            </h1>
            <p>Discover products from independent stores.</p>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products..."
            />
          </section>

          <main className="content">
            <h2>Explore products</h2>

            <div className="filters">
              {categories.map((item) => (
                <button
                  key={item}
                  className={category === item ? "active" : ""}
                  onClick={() => setCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="grid">
              {filteredProducts.map((product) => (
                <article className="product" key={product.id || product._id}>
                  <div className="product-art">{product.emoji}</div>
                  <p className="muted">{product.category}</p>
                  <h3>{product.name}</h3>
                  <p className="vendor">Sold by {product.vendor}</p>

                  <div className="product-bottom">
                    <strong>
                      ₹{Number(product.price).toLocaleString("en-IN")}
                    </strong>
                    <button onClick={() => setCart((previous) => [...previous, product])}>
                      Add +
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {filteredProducts.length === 0 && <p>No products found.</p>}
          </main>
        </>
      )}

      {!authMode && page === "Vendors" && (
        <main className="content">
          <h1>Our vendors</h1>
          <p>Independent businesses in one marketplace.</p>

          <div className="grid">
            {[...new Set(products.map((product) => product.vendor))].map((vendor) => (
              <article className="product" key={vendor}>
                <div className="product-art">🏪</div>
                <h3>{vendor}</h3>
                <p>
                  {products.filter((product) => product.vendor === vendor).length}
                  {" "}listed products
                </p>
                <button className="primary" onClick={() => setPage("Shop")}>
                  Browse products
                </button>
              </article>
            ))}
          </div>
        </main>
      )}

      {!authMode && page === "Dashboard" && (
        <main className="content">
          <h1>Marketplace Dashboard</h1>
          <p className="muted">Demo statistics · Sample data</p>

          <div className="stats">
            <article>
              <p>Total products</p>
              <h2>{products.length}</h2>
            </article>
            <article>
              <p>Vendors</p>
              <h2>{new Set(products.map((product) => product.vendor)).size}</h2>
            </article>
            <article>
              <p>Cart items</p>
              <h2>{cart.length}</h2>
            </article>
          </div>

          <h2>Inventory</h2>
          {products.map((product) => (
            <p className="inventory" key={product.id || product._id}>
              {product.name}
              <span>{product.vendor} · ₹{product.price}</span>
            </p>
          ))}
        </main>
      )}

      {!authMode && page === "Cart" && (
        <main className="content">
          <h1>Your cart</h1>

          {cart.length === 0 ? (
            <p>Your cart is empty.</p>
          ) : (
            cart.map((product, index) => (
              <article className="cart-row" key={`${product.id || product._id}-${index}`}>
                <span>{product.emoji} {product.name}</span>
                <strong>
                  ₹{Number(product.price).toLocaleString("en-IN")}
                </strong>
                <button
                  onClick={() =>
                    setCart((previous) =>
                      previous.filter((_, itemIndex) => itemIndex !== index)
                    )
                  }
                >
                  Remove
                </button>
              </article>
            ))
          )}

          <h2>
            Total: ₹
            {cart.reduce((sum, product) => sum + Number(product.price), 0)
              .toLocaleString("en-IN")}
          </h2>

          <p className="muted">Demo only. No real payment is processed.</p>
        </main>
      )}

      <footer>MultiStore © 2026 · Multi-vendor marketplace demo</footer>
    </div>
  );
}