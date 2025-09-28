document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  // Basic validation
  if (!email || !password) {
    alert("Please enter both email and password");
    return;
  }

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      // Store user data if needed
      if (data.userId) {
        localStorage.setItem('userId', data.userId);
        localStorage.setItem('username', data.username);
      }
      
      window.location.href = data.redirect; // go to dashboard
    } else {
      alert(data.error || "Invalid email or password");
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Something went wrong. Try again.");
  }
});