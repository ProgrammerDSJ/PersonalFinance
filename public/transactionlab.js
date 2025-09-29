let user = null;

async function init() {
  // Since we're using custom authentication, we need to check if user is logged in
  // For now, we'll simulate getting user from session storage or implement proper session management
  const storedUser = sessionStorage.getItem('currentUser');
  if (!storedUser) {
    alert("Please login first");
    window.location.href = '/login.html';
    return;
  }
  
  try {
    user = JSON.parse(storedUser);
    console.log("User loaded:", user);
    fetchTransactions();
  } catch (error) {
    console.error("Error parsing user data:", error);
    alert("Please login again");
    window.location.href = '/login.html';
  }
}

// Helper: show loading state in a table
function setLoadingState(tableId) {
  const tableBody = document.querySelector(`#${tableId} tbody`);
  tableBody.innerHTML = `
    <tr>
      <td colspan="4" class="no-transactions">Loading...</td>
    </tr>
  `;
}

async function fetchTransactions() {
  if (!user || !user.userId) {
    console.error("No user ID available");
    return;
  }

  // Show loading while fetching
  setLoadingState("income-table");
  setLoadingState("expense-table");

  try {
    console.log("Fetching transactions for user:", user.userId);
    const res = await fetch(`/api/transactions/${user.userId}`);
    const result = await res.json();

    console.log("Fetch result:", result);

    if (!result.success) {
      console.error("Error fetching transactions:", result.error);
      renderTable("income-table", [], "Error loading income records.");
      renderTable("expense-table", [], "Error loading expense records.");
      return;
    }

    const allTransactions = result.data || [];
    console.log("All transactions:", allTransactions);

    // Split into income and expenses
    const incomeData = allTransactions.filter(tx => tx.transaction_type === "Income");
    const expenseData = allTransactions.filter(tx => tx.transaction_type === "Expense");

    console.log("Income transactions:", incomeData);
    console.log("Expense transactions:", expenseData);

    renderTable("income-table", incomeData, "No income records found for today.");
    renderTable("expense-table", expenseData, "No expense records found for today.");
  } catch (err) {
    console.error("Fetch transactions failed:", err);
    renderTable("income-table", [], "Error loading income records.");
    renderTable("expense-table", [], "Error loading expense records.");
  }
}

function renderTable(tableId, transactions, emptyMessage) {
  const tableBody = document.querySelector(`#${tableId} tbody`);
  
  // Clear out old rows (including "Loading...")
  tableBody.innerHTML = "";

  if (transactions.length === 0) {
    // Show empty state message
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.className = "no-transactions";
    cell.textContent = emptyMessage;
    row.appendChild(cell);
    tableBody.appendChild(row);
  } else {
    // Render transactions with correct column order: Date, Category, Description, Amount
    transactions.forEach(tx => {
      const row = document.createElement("tr");
      const date = new Date(tx.transaction_date);
      const formattedDate = date.toLocaleDateString('en-IN');
      
      row.innerHTML = `
        <td>${formattedDate}</td>
        <td>${tx.category || '-'}</td>
        <td>${tx.description || tx.title || '-'}</td>
        <td>₹${tx.amount.toFixed(2)}</td>
      `;
      tableBody.appendChild(row);
    });
  }
}

// Modal logic
const modal = document.getElementById("transaction-modal");
const btn = document.getElementById("add-transaction-btn");
const span = document.getElementById("close-modal");

btn.onclick = () => {
  modal.style.display = "block";
  // Set default date to today
  const today = new Date().toISOString().split('T')[0];
  document.getElementById("transaction-date").value = today;
};

span.onclick = () => {
  modal.style.display = "none";
  resetForm();
};

window.onclick = (e) => { 
  if(e.target === modal) {
    modal.style.display = "none";
    resetForm();
  }
}

// Handle category selection and custom category input
document.getElementById("transaction-category").addEventListener("change", function() {
  const customInput = document.getElementById("custom-category-input");
  if (this.value === "Others") {
    customInput.style.display = "block";
    document.getElementById("custom-category").required = true;
  } else {
    customInput.style.display = "none";
    document.getElementById("custom-category").required = false;
    document.getElementById("custom-category").value = "";
  }
});

// Reset form function
function resetForm() {
  const form = document.getElementById("transaction-form");
  form.reset();
  
  // Hide custom category input
  document.getElementById("custom-category-input").style.display = "none";
  document.getElementById("custom-category").required = false;
  
  // Re-enable submit button if it was disabled
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = false;
  submitBtn.textContent = "Add Transaction";
}

// Form Submission with duplicate prevention
document.getElementById("transaction-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const submitBtn = e.target.querySelector('button[type="submit"]');
  
  // Prevent multiple submissions by disabling the button
  if (submitBtn.disabled) {
    return;
  }
  
  // Disable button and show loading state
  submitBtn.disabled = true;
  submitBtn.textContent = "Adding...";

  const type = document.getElementById("transaction-type").value;
  const date = document.getElementById("transaction-date").value;
  let category = document.getElementById("transaction-category").value;
  const description = document.getElementById("transaction-description").value;
  const amount = parseFloat(document.getElementById("transaction-amount").value);

  // Handle custom category
  if (category === "Others") {
    const customCategory = document.getElementById("custom-category").value.trim();
    if (!customCategory) {
      alert("Please enter a custom category");
      submitBtn.disabled = false;
      submitBtn.textContent = "Add Transaction";
      return;
    }
    category = customCategory;
  }

  // Validate inputs
  if (!type || !date || !category || !amount || amount <= 0) {
    alert("Please fill in all required fields with valid values");
    submitBtn.disabled = false;
    submitBtn.textContent = "Add Transaction";
    return;
  }

  try {
    console.log("Submitting transaction:", {
      user_id: user.userId,
      transaction_type: type,
      transaction_date: date,
      category,
      description,
      amount
    });

    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user.userId,
        transaction_type: type,
        transaction_date: date,
        category,
        description,
        amount
      })
    });

    const result = await res.json();
    console.log("Add transaction result:", result);

    if (!result.success) {
      alert(result.error || "Error adding transaction");
      console.error(result.error);
      return;
    }

    // Success - close modal and refresh
    modal.style.display = "none";
    resetForm();
    fetchTransactions(); // refresh after adding
    alert("Transaction added successfully!");
    
  } catch (err) {
    console.error("Add transaction failed:", err);
    alert("Something went wrong while adding the transaction");
  } finally {
    // Re-enable button in case of error (success case is handled by resetForm)
    if (submitBtn.disabled) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Add Transaction";
    }
  }
});

// Initialize when page loads
document.addEventListener('DOMContentLoaded', init);