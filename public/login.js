document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    alert("Please fill in all fields");
    return;
  }

  try {
    console.log("Attempting login for:", email);
    
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    console.log("Login response:", data);

    if (response.ok) {
      // Store user data in session storage for the transaction lab
      const userData = {
        userId: data.userId,
        username: data.username,
        email: data.email
      };
      
      sessionStorage.setItem('currentUser', JSON.stringify(userData));
      console.log("User data stored:", userData);
      
      alert("Login successful! Redirecting to dashboard...");
      window.location.href = data.redirect;
    } else {
      alert(data.error || "Invalid email or password");
    }
  } catch (error) {
    console.error("Login error:", error);
    alert("Something went wrong. Please try again.");
  }
});