// Store user session data in memory with sessionStorage fallback
let currentUser = {
  userId: null,
  username: null,
  email: null
};

// Get user data from memory or sessionStorage
function getUserData() {
  // First check memory
  if (!currentUser.userId) {
    // Try to get from URL parameters (if passed from login)
    const urlParams = new URLSearchParams(window.location.search);
    const urlUserId = urlParams.get('userId');
    
    if (urlUserId) {
      // Store in memory
      currentUser.userId = urlUserId;
      currentUser.username = urlParams.get('username');
      currentUser.email = urlParams.get('email');
      
      // Store in sessionStorage for persistence across navigation
      sessionStorage.setItem('userId', urlUserId);
      sessionStorage.setItem('username', urlParams.get('username'));
      sessionStorage.setItem('email', urlParams.get('email'));
    } else {
      // Try to get from sessionStorage
      currentUser.userId = sessionStorage.getItem('userId');
      currentUser.username = sessionStorage.getItem('username');
      currentUser.email = sessionStorage.getItem('email');
    }
  }
  
  return currentUser;
}

// Set user data in memory and sessionStorage
function setUserData(userId, username, email) {
  currentUser.userId = userId;
  currentUser.username = username;
  currentUser.email = email;
  
  // Also store in sessionStorage
  sessionStorage.setItem('userId', userId);
  sessionStorage.setItem('username', username);
  sessionStorage.setItem('email', email);
}

// Modal elements
const modal = document.getElementById('transaction-modal');
const addTransactionBtn = document.getElementById('add-transaction-btn');
const closeModal = document.getElementById('close-modal');
const transactionForm = document.getElementById('transaction-form');
const dateFilter = document.getElementById('date-filter');

// Category handling
const categorySelect = document.getElementById('transaction-category');
const customCategoryInput = document.getElementById('custom-category-input');

categorySelect.addEventListener('change', () => {
  if (categorySelect.value === 'Others') {
    customCategoryInput.style.display = 'block';
    document.getElementById('custom-category').required = true;
  } else {
    customCategoryInput.style.display = 'none';
    document.getElementById('custom-category').required = false;
  }
});

// Open modal
addTransactionBtn.addEventListener('click', () => {
  modal.style.display = 'block';
  // Set default date to today
  document.getElementById('transaction-date').valueAsDate = new Date();
});

// Close modal
closeModal.addEventListener('click', () => {
  modal.style.display = 'none';
  transactionForm.reset();
  customCategoryInput.style.display = 'none';
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.style.display = 'none';
    transactionForm.reset();
    customCategoryInput.style.display = 'none';
  }
});

// Handle form submission
transactionForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const user = getUserData();
  if (!user.userId) {
    alert('Please login first');
    window.location.href = 'login.html';
    return;
  }

  const type = document.getElementById('transaction-type').value;
  let category = document.getElementById('transaction-category').value;
  
  // Use custom category if "Others" is selected
  if (category === 'Others') {
    const customCategory = document.getElementById('custom-category').value.trim();
    if (customCategory) {
      category = customCategory;
    }
  }
  
  const description = document.getElementById('transaction-description').value.trim() || '-';
  const amount = parseFloat(document.getElementById('transaction-amount').value);
  const date = document.getElementById('transaction-date').value;

  try {
    const response = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.userId,
        transaction_type: type,
        category: category,
        description: description,
        amount: amount,
        transaction_date: date
      })
    });

    const data = await response.json();
    
    if (data.success) {
      alert('Transaction added successfully!');
      modal.style.display = 'none';
      transactionForm.reset();
      customCategoryInput.style.display = 'none';
      loadTransactions(); // Reload transactions
    } else {
      alert(data.error || 'Failed to add transaction');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Something went wrong. Please try again.');
  }
});

// Load transactions based on filter
async function loadTransactions() {
  const user = getUserData();
  
  console.log('Loading transactions for user:', user);
  
  if (!user.userId) {
    console.log('No user logged in, redirecting to login...');
    alert('Please login first');
    window.location.href = 'login.html';
    return;
  }

  const filter = dateFilter.value;
  
  try {
    const response = await fetch(`/api/transactions/${user.userId}?filter=${filter}`);
    const data = await response.json();
    
    if (data.success) {
      displayTransactions(data.data);
    } else {
      console.error('Failed to load transactions:', data.error);
      alert('Failed to load transactions. Please try again.');
    }
  } catch (error) {
    console.error('Error loading transactions:', error);
    alert('Error loading transactions. Please check your connection.');
  }
}

// Display transactions in tables
function displayTransactions(transactions) {
  const incomeTableBody = document.querySelector('#income-table tbody');
  const expenseTableBody = document.querySelector('#expense-table tbody');
  
  // Clear existing rows
  incomeTableBody.innerHTML = '';
  expenseTableBody.innerHTML = '';
  
  // Separate income and expenses
  const incomeTransactions = transactions.filter(t => t.transaction_type === 'Income');
  const expenseTransactions = transactions.filter(t => t.transaction_type === 'Expense');
  
  // Calculate totals
  let totalIncome = 0;
  let totalExpenses = 0;
  
  // Populate income table
  if (incomeTransactions.length === 0) {
    incomeTableBody.innerHTML = '<tr><td colspan="4" class="no-transactions">No income records found</td></tr>';
  } else {
    incomeTransactions.forEach(transaction => {
      const row = document.createElement('tr');
      const date = new Date(transaction.transaction_date).toLocaleDateString('en-GB');
      
      row.innerHTML = `
        <td>${date}</td>
        <td>${transaction.category}</td>
        <td>${transaction.description || '-'}</td>
        <td>₹${parseFloat(transaction.amount).toFixed(2)}</td>
      `;
      
      incomeTableBody.appendChild(row);
      totalIncome += parseFloat(transaction.amount);
    });
  }
  
  // Populate expense table
  if (expenseTransactions.length === 0) {
    expenseTableBody.innerHTML = '<tr><td colspan="4" class="no-transactions">No expense records found</td></tr>';
  } else {
    expenseTransactions.forEach(transaction => {
      const row = document.createElement('tr');
      const date = new Date(transaction.transaction_date).toLocaleDateString('en-GB');
      
      row.innerHTML = `
        <td>${date}</td>
        <td>${transaction.category}</td>
        <td>${transaction.description || '-'}</td>
        <td>₹${parseFloat(transaction.amount).toFixed(2)}</td>
      `;
      
      expenseTableBody.appendChild(row);
      totalExpenses += parseFloat(transaction.amount);
    });
  }
  
  
  // Update total displays in table footer
  document.getElementById('total-income').innerHTML = `<strong>₹${totalIncome.toFixed(2)}</strong>`;
  document.getElementById('total-expenses').innerHTML = `<strong>₹${totalExpenses.toFixed(2)}</strong>`;
  
  // Balance table heights after rendering
  setTimeout(() => {
    balanceTableHeights();
  }, 0);
  
  // Calculate and display amount saved
  const amountSaved = totalIncome - totalExpenses;
  const amountSavedElement = document.getElementById('amount-saved');
  amountSavedElement.textContent = `₹${amountSaved.toFixed(2)}`;
  
  // Remove all color classes first
  amountSavedElement.classList.remove('positive', 'zero', 'negative');
  
  // Apply appropriate color class
  if (amountSaved > 0) {
    amountSavedElement.classList.add('positive');
  } else if (amountSaved === 0) {
    amountSavedElement.classList.add('zero');
  } else {
    amountSavedElement.classList.add('negative');
  }
}

// Filter change handler
dateFilter.addEventListener('change', loadTransactions);

// Function to balance table heights
function balanceTableHeights() {
  const incomeTable = document.getElementById('income-table');
  const expenseTable = document.getElementById('expense-table');
  
  // Reset any previous height adjustments
  incomeTable.style.height = '';
  expenseTable.style.height = '';
  
  // Get the natural heights after reset
  const incomeHeight = incomeTable.offsetHeight;
  const expenseHeight = expenseTable.offsetHeight;
  
  // Set both tables to the maximum height
  const maxHeight = Math.max(incomeHeight, expenseHeight);
  incomeTable.style.height = maxHeight + 'px';
  expenseTable.style.height = maxHeight + 'px';
}

// Check if user data is passed via URL (from login) or exists in sessionStorage
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('userId')) {
  setUserData(
    urlParams.get('userId'),
    urlParams.get('username'),
    urlParams.get('email')
  );
} else {
  // Try to load from sessionStorage
  const storedUserId = sessionStorage.getItem('userId');
  if (storedUserId) {
    currentUser.userId = storedUserId;
    currentUser.username = sessionStorage.getItem('username');
    currentUser.email = sessionStorage.getItem('email');
  }
}

// Load transactions on page load
loadTransactions();