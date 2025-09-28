let user = null;

async function init() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    alert("Please login first");
    window.location.href = '/login.html';
    return;
  }
  user = data.user;
  fetchTransactions();
}

const today = new Date().toISOString().split('T')[0];

// Helper: show loading state in a table
function setLoadingState(tableId) {
  const tableBody = document.querySelector(`#${tableId} tbody`);
  tableBody.innerHTML = `
    <tr>
      <td colspan="4">Loading...</td>
    </tr>
  `;
}

async function fetchTransactions() {
  if (!user) return;

  // Show loading while fetching
  setLoadingState("income-table");
  setLoadingState("expense-table");

  try {
    const res = await fetch(`/api/transactions/${user.id}`);
    const result = await res.json();

    if (!result.success) {
      console.error("Error fetching transactions:", result.error);
      return;
    }

    const allTransactions = result.data || [];

    // Split into income and expenses
    const incomeData = allTransactions.filter(tx => tx.transaction_type === "Income");
    const expenseData = allTransactions.filter(tx => tx.transaction_type === "Expense");

    renderTable("income-table", incomeData, "No income records found for today.");
    renderTable("expense-table", expenseData, "No expense records found for today.");
  } catch (err) {
    console.error("Fetch transactions failed:", err);
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
    cell.textContent = emptyMessage;
    row.appendChild(cell);
    tableBody.appendChild(row);
  } else {
    // Render transactions
    transactions.forEach(tx => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${tx.category}</td>
        <td>${tx.amount}</td>
        <td>${tx.description || "-"}</td>
        <td>${new Date(tx.transaction_date).toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"})}</td>
      `;
      tableBody.appendChild(row);
    });
  }
}

// Modal logic
const modal = document.getElementById("transaction-modal");
const btn = document.getElementById("add-transaction-btn");
const span = document.getElementById("close-modal");

btn.onclick = () => modal.style.display = "block";
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

// Reset form function
function resetForm() {
  const form = document.getElementById("transaction-form");
  form.reset();
  
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
  const category = document.getElementById("transaction-category").value;
  const title = document.getElementById("transaction-title").value;
  const description = document.getElementById("transaction-description").value;
  const amount = parseFloat(document.getElementById("transaction-amount").value);

  try {
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user.id,
        transaction_type: type,
        category,
        title,
        description,
        amount
      })
    });

    const result = await res.json();

    if (!result.success) {
      alert(result.error || "Error adding transaction");
      console.error(result.error);
      return;
    }

    // Success - close modal and refresh
    modal.style.display = "none";
    resetForm();
    fetchTransactions(); // refresh after adding
    
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

// Initialize
init();