// Store user session data in memory with sessionStorage fallback
let currentUser = {
  userId: null,
  username: null,
  email: null
};

// Chart instances
let pieChart = null;
let lineChart = null;

// All transactions data
let allTransactions = [];

// Get user data from memory or sessionStorage
function getUserData() {
  if (!currentUser.userId) {
    const urlParams = new URLSearchParams(window.location.search);
    const urlUserId = urlParams.get('userId');
    
    if (urlUserId) {
      currentUser.userId = urlUserId;
      currentUser.username = urlParams.get('username');
      currentUser.email = urlParams.get('email');
      
      sessionStorage.setItem('userId', urlUserId);
      sessionStorage.setItem('username', urlParams.get('username'));
      sessionStorage.setItem('email', urlParams.get('email'));
    } else {
      currentUser.userId = sessionStorage.getItem('userId');
      currentUser.username = sessionStorage.getItem('username');
      currentUser.email = sessionStorage.getItem('email');
    }
  }
  
  return currentUser;
}

// Initialize dashboard
async function initDashboard() {
  const user = getUserData();
  
  if (!user.userId) {
    alert('Please login first');
    window.location.href = 'login.html';
    return;
  }
  
  // Display username
  if (user.username) {
    document.getElementById('username-display').textContent = user.username;
  }
  
  // Load all transactions
  await loadAllTransactions();
  
  // Initialize charts
  initPieChart();
  initLineChart();
  
  // Update summary cards
  updateSummaryCards();
}

// Load all transactions from database
async function loadAllTransactions() {
  const user = getUserData();
  
  try {
    const response = await fetch(`/api/transactions/${user.userId}?filter=all`);
    const data = await response.json();
    
    if (data.success) {
      allTransactions = data.data;
      console.log(`Loaded ${allTransactions.length} transactions`);
    } else {
      console.error('Failed to load transactions:', data.error);
      allTransactions = [];
    }
  } catch (error) {
    console.error('Error loading transactions:', error);
    allTransactions = [];
  }
}

// Filter transactions by date range
function filterTransactionsByPeriod(period) {
  const now = new Date();
  let startDate;
  
  switch(period) {
    case '1day':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 1);
      break;
    case '1week':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      break;
    case '1month':
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
      break;
    case '3months':
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 3);
      break;
    case '6months':
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 6);
      break;
    case 'all':
      return allTransactions;
    default:
      return allTransactions;
  }
  
  return allTransactions.filter(t => {
    const transactionDate = new Date(t.transaction_date);
    return transactionDate >= startDate && transactionDate <= now;
  });
}

// Initialize Pie Chart
function initPieChart() {
  const ctx = document.getElementById('pie-chart').getContext('2d');
  const filter = document.getElementById('pie-chart-filter').value;
  
  const chartData = getPieChartData(filter);
  
  if (pieChart) {
    pieChart.destroy();
  }
  
  pieChart = new Chart(ctx, {
    type: 'pie',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: ₹${value.toFixed(2)} (${percentage}%)`;
            }
          },
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleFont: {
            size: 14,
            weight: 'bold'
          },
          bodyFont: {
            size: 13
          }
        }
      }
    }
  });
  
  // Update custom legend
  updatePieLegend(chartData);
}

// Get Pie Chart Data
function getPieChartData(type) {
  const transactions = allTransactions.filter(t => 
    t.transaction_type.toLowerCase() === type.toLowerCase()
  );
  
  if (transactions.length === 0) {
    return {
      labels: ['No Data'],
      datasets: [{
        data: [1],
        backgroundColor: ['#e0e0e0'],
        borderWidth: 0
      }]
    };
  }
  
  // Group by category
  const categoryTotals = {};
  transactions.forEach(t => {
    const category = t.category || 'Uncategorized';
    categoryTotals[category] = (categoryTotals[category] || 0) + parseFloat(t.amount);
  });
  
  // Sort by amount (descending)
  const sortedCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1]);
  
  const labels = sortedCategories.map(([category]) => category);
  const data = sortedCategories.map(([, amount]) => amount);
  
  // Generate colors
  const colors = generateColors(labels.length);
  
  return {
    labels: labels,
    datasets: [{
      data: data,
      backgroundColor: colors,
      borderColor: '#fff',
      borderWidth: 2,
      hoverOffset: 10
    }]
  };
}

// Update Pie Chart Legend
function updatePieLegend(chartData) {
  const legendContainer = document.getElementById('pie-chart-legend');
  legendContainer.innerHTML = '';
  
  if (chartData.labels[0] === 'No Data') {
    legendContainer.innerHTML = '<div class="no-data">No transactions found for selected filter</div>';
    return;
  }
  
  const total = chartData.datasets[0].data.reduce((a, b) => a + b, 0);
  
  chartData.labels.forEach((label, index) => {
    const value = chartData.datasets[0].data[index];
    const percentage = ((value / total) * 100).toFixed(1);
    const color = chartData.datasets[0].backgroundColor[index];
    
    const legendItem = document.createElement('div');
    legendItem.className = 'legend-item';
    legendItem.innerHTML = `
      <div class="legend-color" style="background-color: ${color}"></div>
      <span class="legend-label">${label}</span>
      <span class="legend-value">₹${value.toFixed(2)} (${percentage}%)</span>
    `;
    
    legendContainer.appendChild(legendItem);
  });
}

// Initialize Line Chart
function initLineChart() {
  const ctx = document.getElementById('line-chart').getContext('2d');
  const type = document.getElementById('line-chart-type').value;
  const period = document.getElementById('line-chart-period').value;
  
  const chartData = getLineChartData(type, period);
  
  if (lineChart) {
    lineChart.destroy();
  }
  
  lineChart = new Chart(ctx, {
    type: 'line',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 15,
            font: {
              size: 13,
              weight: '500'
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleFont: {
            size: 14,
            weight: 'bold'
          },
          bodyFont: {
            size: 13
          },
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              label += '₹' + context.parsed.y.toFixed(2);
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          display: true,
          grid: {
            display: false
          },
          ticks: {
            font: {
              size: 11
            }
          }
        },
        y: {
          display: true,
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            callback: function(value) {
              return '₹' + value.toFixed(0);
            },
            font: {
              size: 11
            }
          }
        }
      }
    }
  });
}

// Get Line Chart Data
function getLineChartData(type, period) {
  const filteredTransactions = filterTransactionsByPeriod(period);
  
  if (filteredTransactions.length === 0) {
    return {
      labels: ['No Data'],
      datasets: []
    };
  }
  
  // Determine grouping (daily, weekly, monthly based on period)
  let grouping = 'daily';
  if (period === '3months' || period === '6months') {
    grouping = 'weekly';
  } else if (period === 'all') {
    grouping = 'monthly';
  }
  
  const grouped = groupTransactionsByDate(filteredTransactions, grouping);
  const labels = Object.keys(grouped).sort();
  
  const datasets = [];
  
  // Income dataset
  if (type === 'income' || type === 'both') {
    const incomeData = labels.map(date => {
      const transactions = grouped[date].filter(t => t.transaction_type === 'Income');
      return transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    });
    
    datasets.push({
      label: 'Income',
      data: incomeData,
      borderColor: '#38ef7d',
      backgroundColor: createGradient('income'),
      borderWidth: 3,
      tension: 0.4,
      fill: true,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: '#38ef7d',
      pointBorderColor: '#fff',
      pointBorderWidth: 2
    });
  }
  
  // Expense dataset
  if (type === 'expense' || type === 'both') {
    const expenseData = labels.map(date => {
      const transactions = grouped[date].filter(t => t.transaction_type === 'Expense');
      return transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    });
    
    datasets.push({
      label: 'Expenses',
      data: expenseData,
      borderColor: '#ff6a00',
      backgroundColor: createGradient('expense'),
      borderWidth: 3,
      tension: 0.4,
      fill: true,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: '#ff6a00',
      pointBorderColor: '#fff',
      pointBorderWidth: 2
    });
  }
  
  // Format labels based on grouping
  const formattedLabels = labels.map(label => formatDateLabel(label, grouping));
  
  return {
    labels: formattedLabels,
    datasets: datasets
  };
}

// Group transactions by date
function groupTransactionsByDate(transactions, grouping) {
  const grouped = {};
  
  transactions.forEach(t => {
    const date = new Date(t.transaction_date);
    let key;
    
    if (grouping === 'daily') {
      key = date.toISOString().split('T')[0]; // YYYY-MM-DD
    } else if (grouping === 'weekly') {
      // Get week start (Monday)
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(date.setDate(diff));
      key = weekStart.toISOString().split('T')[0];
    } else if (grouping === 'monthly') {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
    
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(t);
  });
  
  return grouped;
}

// Format date label
function formatDateLabel(dateStr, grouping) {
  if (grouping === 'daily') {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } else if (grouping === 'weekly') {
    const date = new Date(dateStr);
    return `Week ${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
  } else if (grouping === 'monthly') {
    const [year, month] = dateStr.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  }
  return dateStr;
}

// Create gradient for line chart
function createGradient(type) {
  const canvas = document.getElementById('line-chart');
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  
  if (type === 'income') {
    gradient.addColorStop(0, 'rgba(56, 239, 125, 0.3)');
    gradient.addColorStop(1, 'rgba(56, 239, 125, 0.01)');
  } else {
    gradient.addColorStop(0, 'rgba(255, 106, 0, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 106, 0, 0.01)');
  }
  
  return gradient;
}

// Generate colors for pie chart
function generateColors(count) {
  const colors = [
    '#667eea', '#38ef7d', '#ff6a00', '#ee0979', '#11998e',
    '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a',
    '#fee140', '#30cfd0', '#a8edea', '#fed6e3', '#c471ed',
    '#12c2e9', '#f64f59', '#f5af19', '#fbc2eb', '#a6c1ee'
  ];
  
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push(colors[i % colors.length]);
  }
  return result;
}

// Update summary cards
function updateSummaryCards() {
  const incomeTransactions = allTransactions.filter(t => t.transaction_type === 'Income');
  const expenseTransactions = allTransactions.filter(t => t.transaction_type === 'Expense');
  
  const totalIncome = incomeTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const totalExpenses = expenseTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const netSavings = totalIncome - totalExpenses;
  
  document.getElementById('total-income-summary').textContent = `₹${totalIncome.toFixed(2)}`;
  document.getElementById('total-expense-summary').textContent = `₹${totalExpenses.toFixed(2)}`;
  document.getElementById('net-savings-summary').textContent = `₹${netSavings.toFixed(2)}`;
}

// Event listeners for chart filters
document.getElementById('pie-chart-filter').addEventListener('change', () => {
  initPieChart();
});

document.getElementById('line-chart-type').addEventListener('change', () => {
  initLineChart();
});

document.getElementById('line-chart-period').addEventListener('change', () => {
  initLineChart();
});

// Initialize dashboard on page load
initDashboard();