document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  // Basic validation
  if (!username || !email || !password) {
    alert("All fields are required");
    return;
  }

  if (password.length < 6) {
    alert("Password must be at least 6 characters long");
    return;
  }

  // Disable submit button to prevent double submission
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = "Registering...";

  try {
    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await response.json();
    
    if (response.ok) {
      alert("Registration successful! Let's set up your profile.");
      // Redirect to onboarding with user data
      window.location.href = `${data.redirect}?userId=${data.userId}&username=${encodeURIComponent(data.username)}&email=${encodeURIComponent(data.email)}`;
    } else {
      alert(data.error || "Registration failed");
      submitBtn.disabled = false;
      submitBtn.textContent = "Register";
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Something went wrong. Try again.");
    submitBtn.disabled = false;
    submitBtn.textContent = "Register";
  }
});