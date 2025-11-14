// Store user session data in memory with sessionStorage fallback
let currentUser = {
  userId: null,
  username: null,
  email: null
};

// Chat state
let chatHistory = [];
let isAIResponding = false;

// User's transaction data cache
let userTransactions = [];

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

// Initialize AI Mode
async function initAIMode() {
  const user = getUserData();
  
  if (!user.userId) {
    alert('Please login first');
    window.location.href = 'login.html';
    return;
  }
  
  // Display username in greeting
  if (user.username) {
    document.getElementById('username-display').textContent = user.username;
  }
  
  // Load user's transaction data
  await loadUserTransactions();
  
  // Set up event listeners
  setupEventListeners();
}

// Load user's transactions for AI context
async function loadUserTransactions() {
  const user = getUserData();
  
  try {
    const response = await fetch(`/api/transactions/${user.userId}?filter=all`);
    const data = await response.json();
    
    if (data.success) {
      userTransactions = data.data;
      console.log(`Loaded ${userTransactions.length} transactions for AI context`);
    } else {
      console.error('Failed to load transactions:', data.error);
      userTransactions = [];
    }
  } catch (error) {
    console.error('Error loading transactions:', error);
    userTransactions = [];
  }
}

// Set up event listeners
function setupEventListeners() {
  const userInput = document.getElementById('user-input');
  const sendButton = document.getElementById('send-button');
  const suggestionCards = document.querySelectorAll('.suggestion-card');
  
  // Auto-resize textarea
  userInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
    
    // Enable/disable send button based on input
    sendButton.disabled = this.value.trim().length === 0;
  });
  
  // Send message on button click
  sendButton.addEventListener('click', handleSendMessage);
  
  // Send message on Enter (Shift+Enter for new line)
  userInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!sendButton.disabled) {
        handleSendMessage();
      }
    }
  });
  
  // Suggestion cards click handlers
  suggestionCards.forEach(card => {
    card.addEventListener('click', function() {
      const prompt = this.getAttribute('data-prompt');
      userInput.value = prompt;
      userInput.style.height = 'auto';
      userInput.style.height = (userInput.scrollHeight) + 'px';
      sendButton.disabled = false;
      userInput.focus();
    });
  });
}

// Handle send message
async function handleSendMessage() {
  if (isAIResponding) return;
  
  const userInput = document.getElementById('user-input');
  const message = userInput.value.trim();
  
  if (!message) return;
  
  // Hide greeting section and show chat section on first message
  const greetingSection = document.getElementById('greeting-section');
  const chatSection = document.getElementById('chat-section');
  
  if (greetingSection && !greetingSection.classList.contains('hidden')) {
    greetingSection.classList.add('hidden');
    chatSection.classList.add('active');
  }
  
  // Add user message to chat
  addMessage(message, 'user');
  
  // Clear input
  userInput.value = '';
  userInput.style.height = 'auto';
  document.getElementById('send-button').disabled = true;
  
  // Add to chat history
  chatHistory.push({
    role: 'user',
    content: message
  });
  
  // Show typing indicator
  showTypingIndicator();
  
  // Get AI response
  isAIResponding = true;
  await getAIResponse(message);
  isAIResponding = false;
}

// Add message to chat
function addMessage(content, sender) {
  const chatMessages = document.getElementById('chat-messages');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${sender}`;
  
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.textContent = sender === 'user' ? '👤' : '🤖';
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  
  // Format the content (handle markdown-like formatting)
  contentDiv.innerHTML = formatMessageContent(content);
  
  messageDiv.appendChild(avatar);
  messageDiv.appendChild(contentDiv);
  
  chatMessages.appendChild(messageDiv);
  
  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Format message content
function formatMessageContent(content) {
  // Basic markdown-like formatting
  let formatted = content;
  
  // Convert **bold** to <strong>
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Convert *italic* to <em>
  formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Convert line breaks
  formatted = formatted.replace(/\n/g, '<br>');
  
  // Convert lists (basic support)
  formatted = formatted.replace(/^\- (.*?)$/gm, '<li>$1</li>');
  if (formatted.includes('<li>')) {
    formatted = '<ul>' + formatted + '</ul>';
  }
  
  return formatted;
}

// Show typing indicator
function showTypingIndicator() {
  const chatMessages = document.getElementById('chat-messages');
  const typingDiv = document.createElement('div');
  typingDiv.className = 'message ai';
  typingDiv.id = 'typing-indicator';
  
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.textContent = '🤖';
  
  const typingContent = document.createElement('div');
  typingContent.className = 'message-content';
  
  const typingIndicator = document.createElement('div');
  typingIndicator.className = 'typing-indicator';
  typingIndicator.innerHTML = `
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
  `;
  
  typingContent.appendChild(typingIndicator);
  typingDiv.appendChild(avatar);
  typingDiv.appendChild(typingContent);
  
  chatMessages.appendChild(typingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Remove typing indicator
function removeTypingIndicator() {
  const typingIndicator = document.getElementById('typing-indicator');
  if (typingIndicator) {
    typingIndicator.remove();
  }
}

// Prepare financial data context for AI
function prepareFinancialContext() {
  if (userTransactions.length === 0) {
    return "User has no transaction history available.";
  }
  
  // Calculate summary statistics
  const incomeTransactions = userTransactions.filter(t => t.transaction_type === 'Income');
  const expenseTransactions = userTransactions.filter(t => t.transaction_type === 'Expense');
  
  const totalIncome = incomeTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const totalExpenses = expenseTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const netSavings = totalIncome - totalExpenses;
  
  // Group expenses by category
  const expensesByCategory = {};
  expenseTransactions.forEach(t => {
    const category = t.category || 'Uncategorized';
    expensesByCategory[category] = (expensesByCategory[category] || 0) + parseFloat(t.amount);
  });
  
  // Sort categories by amount
  const topExpenseCategories = Object.entries(expensesByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, amount]) => `${category}: ₹${amount.toFixed(2)}`)
    .join(', ');
  
  // Get recent transactions (last 10)
  const recentTransactions = userTransactions
    .slice(0, 10)
    .map(t => `${t.transaction_type} - ${t.category}: ₹${t.amount} on ${new Date(t.transaction_date).toLocaleDateString()}`)
    .join('; ');
  
  // Calculate monthly average (assuming data spans multiple months)
  const oldestDate = new Date(Math.min(...userTransactions.map(t => new Date(t.transaction_date))));
  const newestDate = new Date(Math.max(...userTransactions.map(t => new Date(t.transaction_date))));
  const monthsDiff = Math.max(1, (newestDate - oldestDate) / (1000 * 60 * 60 * 24 * 30));
  const avgMonthlyIncome = (totalIncome / monthsDiff).toFixed(2);
  const avgMonthlyExpense = (totalExpenses / monthsDiff).toFixed(2);
  
  return `
FINANCIAL SUMMARY:
- Total Income: ₹${totalIncome.toFixed(2)}
- Total Expenses: ₹${totalExpenses.toFixed(2)}
- Net Savings: ₹${netSavings.toFixed(2)}
- Number of Transactions: ${userTransactions.length} (${incomeTransactions.length} income, ${expenseTransactions.length} expenses)
- Average Monthly Income: ₹${avgMonthlyIncome}
- Average Monthly Expenses: ₹${avgMonthlyExpense}
- Top Expense Categories: ${topExpenseCategories || 'None'}
- Recent Transactions: ${recentTransactions || 'None'}
- Date Range: ${oldestDate.toLocaleDateString()} to ${newestDate.toLocaleDateString()}
`;
}

// Get AI response from Gemini API
async function getAIResponse(userMessage) {
  const user = getUserData();
  
  try {
    // Prepare the context with user's financial data
    const financialContext = prepareFinancialContext();
    
    // Build the prompt with context
    const systemPrompt = `You are a helpful financial assistant for a personal finance tracking application. 
You have access to the user's transaction data and their personal goals and should provide personalized financial advice based on their actual spending and income patterns.

Here is the user's financial data:
${financialContext}

Guidelines:
- Provide specific, actionable advice based on their actual financial data
- Be encouraging and supportive
- When discussing amounts, use the Indian Rupee symbol (₹)
- Keep responses concise but informative
- If asked about specific transactions or categories, refer to the data provided
- Suggest ways to save money or optimize spending based on their patterns
- If they ask about something not in their data, let them know and provide general advice
- Format your responses with clear paragraphs and bullet points when appropriate
- Consider the user's stated financial goals and timeframe when giving advice

Remember: The user's name is ${user.username}.`;

    // Send request to backend API with userId for MongoDB context
    const response = await fetch('/api/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        systemPrompt: systemPrompt,
        chatHistory: chatHistory.slice(-10), // Send last 10 messages for context
        userId: user.userId // Include userId to fetch onboarding data
      })
    });

    const data = await response.json();
    
    // Remove typing indicator
    removeTypingIndicator();
    
    if (data.success) {
      // Add AI response to chat
      addMessage(data.response, 'ai');
      
      // Add to chat history
      chatHistory.push({
        role: 'assistant',
        content: data.response
      });
    } else {
      // Error handling
      const errorMessage = "I'm sorry, I encountered an error while processing your request. Please try again.";
      addMessage(errorMessage, 'ai');
      console.error('AI API error:', data.error);
    }
  } catch (error) {
    console.error('Error getting AI response:', error);
    removeTypingIndicator();
    
    const errorMessage = "I'm sorry, I'm having trouble connecting right now. Please check your internet connection and try again.";
    addMessage(errorMessage, 'ai');
  }
}

// Load chat history from storage (optional - for persistence)
function loadChatHistory() {
  const stored = sessionStorage.getItem(`chat_history_${currentUser.userId}`);
  if (stored) {
    try {
      chatHistory = JSON.parse(stored);
      // Render previous messages
      chatHistory.forEach(msg => {
        if (msg.role === 'user') {
          addMessage(msg.content, 'user');
        } else {
          addMessage(msg.content, 'ai');
        }
      });
      
      // Hide greeting if there are messages
      if (chatHistory.length > 0) {
        const greetingSection = document.getElementById('greeting-section');
        const chatSection = document.getElementById('chat-section');
        if (greetingSection) {
          greetingSection.classList.add('hidden');
          chatSection.classList.add('active');
        }
      }
    } catch (e) {
      console.error('Failed to load chat history:', e);
    }
  }
}

// Save chat history to storage
function saveChatHistory() {
  try {
    sessionStorage.setItem(`chat_history_${currentUser.userId}`, JSON.stringify(chatHistory));
  } catch (e) {
    console.error('Failed to save chat history:', e);
  }
}

// Save chat history before page unload
window.addEventListener('beforeunload', saveChatHistory);

// Initialize on page load
initAIMode();

// Optional: Load previous chat history
// loadChatHistory();