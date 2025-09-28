// Get user data from localStorage (set during login)
let user = null;
let selectedDate = new Date().toISOString().split('T')[0]; // Today's date

function init() {
  // Get user data from localStorage instead of Supabase auth
  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('username');
  
  if (!userId) {
    alert("Please login first");
    window.location.href = '/login.html';
    return;
  }
  
  user = { id: userId, username: username };
  
  // Set today's date as default
  document.getElementById('transaction-date').value = selectedDate;
  
  // Load user categories and transactions
  loadUserCategories();
  fetchTransactions();
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

async function loadUserCategories() {
  if (!user) return;

  try {
    const res = await fetch(`/api/categories/${user.id}`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    
    const result = await res.json();
    if (result.success) {
      const categorySelect = document.getElementById('transaction-category');
      const userCategories = result.data || [];
      
      // Remove existing user categories (keep default ones)
      const options = categorySelect.querySelectorAll('option');
      options.forEach(option => {
        if (!['', 'Food', 'Travel', 'Entertainment', 'Other'].includes(option.value)) {
          option.remove();
        }
      });
      
      // Add user's custom categories
      userCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.category_name;
        option.textContent = category.category_name;
        // Insert before "Other" option
        categorySelect.insertBefore(option, categorySelect.querySelector('option[value="Other"]'));
      });
    }
  } catch (err) {
    console.error("Failed to load user categories:", err);
  }
}

async function fetchTransactions() {
  if (!user) return;

  // Show loading while fetching
  setLoadingState("income-table");
  setLoadingState("expense-table");

  try {
    const res = await fetch(`/api/transactions/${user.id}/${selectedDate}`);
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const result = await res.json();

    if (!result.success) {
      console.error("Error fetching transactions:", result.error);
      renderTable("income-table", [], "Error loading income records");
      renderTable("expense-table", [], "Error loading expense records");
      return;
    }

    const allTransactions = result.data || [];

    // Split into income and expenses
    const incomeData = allTransactions.filter(tx => tx.transaction_type === "Income");
    const expenseData = allTransactions.filter(tx => tx.transaction_type === "Expense");

    const formattedDate = new Date(selectedDate).toLocaleDateString();
    renderTable("income-table", incomeData, `No income records found for ${formattedDate}`);
    renderTable("expense-table", expenseData, `No expense records found for ${formattedDate}`);
    
  } catch (err) {
    console.error("Fetch transactions failed:", err);
    renderTable("income-table", [], "Error loading income records");
    renderTable("expense-table", [], "Error loading expense records");
  }
}

function renderTable(tableId, transactions, emptyMessage) {
  const tableBody = document.querySelector(`#${tableId} tbody`);
  
  // Clear out old rows
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
    // Render transactions with new column order
    transactions.forEach(tx => {
      const row = document.createElement("tr");
      const transactionDate = new Date(tx.transaction_date);
      row.innerHTML = `
        <td>${transactionDate.toLocaleDateString()}</td>
        <td>${tx.category || "-"}</td>
        <td>${tx.description || "-"}</td>
        <td>₹${tx.amount}</td>
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
span.onclick = () => modal.style.display = "none";
window.onclick = (e) => { if(e.target === modal) modal.style.display = "none"; }

// Category selection logic
document.getElementById('transaction-category').addEventListener('change', function() {
  const customInput = document.getElementById('custom-category-input');
  if (this.value === 'Other') {
    customInput.style.display = 'block';
    document.getElementById('custom-category').required = true;
  } else {
    customInput.style.display = 'none';
    document.getElementById('custom-category').required = false;
    document.getElementById('custom-category').value = '';
  }
});

// Date change listener
document.getElementById('transaction-date').addEventListener('change', function() {
  selectedDate = this.value;
  fetchTransactions(); // Reload transactions for selected date
});

// Form Submission
document.getElementById("transaction-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const type = document.getElementById("transaction-type").value;
  const categorySelect = document.getElementById("transaction-category");
  let category = categorySelect.value;
  const customCategory = document.getElementById("custom-category").value.trim();
  const description = document.getElementById("transaction-description").value;
  const amount = parseFloat(document.getElementById("transaction-amount").value);
  const transactionDate = document.getElementById("transaction-date").value;

  // Handle custom category
  if (category === 'Other' && customCategory) {
    category = customCategory;
  }

  if (!category || category === 'Other') {
    alert("Please select a category or enter a custom category");
    return;
  }

  try {
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user.id,
        transaction_type: type,
        category,
        description,
        amount,
        transaction_date: transactionDate
      })
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const result = await res.json();

    if (!result.success) {
      alert("Error adding transaction");
      console.error(result.error);
      return;
    }

    // If it was a custom category, reload categories for future use
    if (categorySelect.value === 'Other' && customCategory) {
      await loadUserCategories();
    }

    // Clear the form
    document.getElementById("transaction-form").reset();
    document.getElementById('transaction-date').value = selectedDate; // Keep selected date
    document.getElementById('custom-category-input').style.display = 'none';
    modal.style.display = "none";
    fetchTransactions(); // refresh after adding
    
  } catch (err) {
    console.error("Add transaction failed:", err);
    alert("Something went wrong while adding the transaction");
  }
});

// Initialize when page loads
document.addEventListener('DOMContentLoaded', init);