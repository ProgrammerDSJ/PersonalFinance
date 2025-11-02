document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    
    if (response.ok) {
      alert("Login successful!");
      // Redirect with user data as URL parameters
      window.location.href = `${data.redirect}?userId=${data.userId}&username=${encodeURIComponent(data.username)}&email=${encodeURIComponent(data.email)}`;
    } else {
      alert(data.error || "Login failed");
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Something went wrong. Try again.");
  }
});