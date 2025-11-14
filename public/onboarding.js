// Store user data from registration
let userData = {
  userId: null,
  username: null,
  email: null
};

// Current step tracker
let currentStep = 1;
const totalSteps = 5;

// Get user data from URL or sessionStorage
function getUserData() {
  const urlParams = new URLSearchParams(window.location.search);
  const urlUserId = urlParams.get('userId');
  
  if (urlUserId) {
    userData.userId = urlUserId;
    userData.username = urlParams.get('username');
    userData.email = urlParams.get('email');
    
    // Store in sessionStorage
    sessionStorage.setItem('onboarding_userId', urlUserId);
    sessionStorage.setItem('onboarding_username', urlParams.get('username'));
    sessionStorage.setItem('onboarding_email', urlParams.get('email'));
  } else {
    // Try to get from sessionStorage
    userData.userId = sessionStorage.getItem('onboarding_userId');
    userData.username = sessionStorage.getItem('onboarding_username');
    userData.email = sessionStorage.getItem('onboarding_email');
  }
  
  return userData;
}

// Initialize onboarding
function initOnboarding() {
  const user = getUserData();
  
  if (!user.userId) {
    alert('Session expired. Please register again.');
    window.location.href = 'registration.html';
    return;
  }
  
  console.log('Onboarding initialized for user:', user.username);
  
  // Set up event listeners
  setupEventListeners();
  updateProgress();
}

// Set up all event listeners
function setupEventListeners() {
  // Interest checkboxes
  const interestCheckboxes = document.querySelectorAll('input[name="interests"]');
  interestCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', validateStep1);
  });
  
  // App usage radio buttons
  const appUsageRadios = document.querySelectorAll('input[name="appUsage"]');
  appUsageRadios.forEach(radio => {
    radio.addEventListener('change', validateStep2);
  });
  
  // Financial goals textarea
  const goalsTextarea = document.getElementById('financial-goals');
  goalsTextarea.addEventListener('input', function() {
    const count = this.value.length;
    document.getElementById('goals-count').textContent = count;
    
    // Limit to 500 characters
    if (count > 500) {
      this.value = this.value.substring(0, 500);
      document.getElementById('goals-count').textContent = '500';
    }
    
    validateStep3();
  });
  
  // Achievement plan textarea
  const planTextarea = document.getElementById('achievement-plan');
  planTextarea.addEventListener('input', function() {
    const count = this.value.length;
    document.getElementById('plan-count').textContent = count;
    
    // Limit to 500 characters
    if (count > 500) {
      this.value = this.value.substring(0, 500);
      document.getElementById('plan-count').textContent = '500';
    }
    
    validateStep4();
  });
  
  // Timeframe inputs
  document.getElementById('timeframe-value').addEventListener('input', validateStep5);
  document.getElementById('timeframe-unit').addEventListener('change', validateStep5);
  
  // Form submission
  document.getElementById('onboarding-form').addEventListener('submit', handleSubmit);
}

// Validate Step 1 (Interests)
function validateStep1() {
  const checkedBoxes = document.querySelectorAll('input[name="interests"]:checked');
  const nextBtn = document.querySelector('.form-step[data-step="1"] .btn-next');
  
  if (checkedBoxes.length > 0) {
    nextBtn.disabled = false;
  } else {
    nextBtn.disabled = true;
  }
}

// Validate Step 2 (App Usage)
function validateStep2() {
  const selectedRadio = document.querySelector('input[name="appUsage"]:checked');
  const nextBtn = document.querySelector('.form-step[data-step="2"] .btn-next');
  
  if (selectedRadio) {
    nextBtn.disabled = false;
  } else {
    nextBtn.disabled = true;
  }
}

// Validate Step 3 (Financial Goals)
function validateStep3() {
  const goals = document.getElementById('financial-goals').value.trim();
  const nextBtn = document.querySelector('.form-step[data-step="3"] .btn-next');
  
  if (goals.length >= 10) {
    nextBtn.disabled = false;
  } else {
    nextBtn.disabled = true;
  }
}

// Validate Step 4 (Achievement Plan)
function validateStep4() {
  const plan = document.getElementById('achievement-plan').value.trim();
  const nextBtn = document.querySelector('.form-step[data-step="4"] .btn-next');
  
  if (plan.length >= 10) {
    nextBtn.disabled = false;
  } else {
    nextBtn.disabled = true;
  }
}

// Validate Step 5 (Timeframe)
function validateStep5() {
  const timeframeValue = document.getElementById('timeframe-value').value;
  const timeframeUnit = document.getElementById('timeframe-unit').value;
  const submitBtn = document.querySelector('.form-step[data-step="5"] .btn-submit');
  
  if (timeframeValue && timeframeUnit && timeframeValue > 0) {
    submitBtn.disabled = false;
  } else {
    submitBtn.disabled = true;
  }
}

// Navigate to next step
function nextStep() {
  if (currentStep < totalSteps) {
    // Hide current step
    document.querySelector(`.form-step[data-step="${currentStep}"]`).classList.remove('active');
    
    // Show next step
    currentStep++;
    document.querySelector(`.form-step[data-step="${currentStep}"]`).classList.add('active');
    
    // Update progress and indicators
    updateProgress();
    updateStepIndicator();
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// Navigate to previous step
function prevStep() {
  if (currentStep > 1) {
    // Hide current step
    document.querySelector(`.form-step[data-step="${currentStep}"]`).classList.remove('active');
    
    // Show previous step
    currentStep--;
    document.querySelector(`.form-step[data-step="${currentStep}"]`).classList.add('active');
    
    // Update progress and indicators
    updateProgress();
    updateStepIndicator();
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// Update progress bar
function updateProgress() {
  const progressFill = document.getElementById('progress-fill');
  const progressPercentage = (currentStep / totalSteps) * 100;
  progressFill.style.width = progressPercentage + '%';
}

// Update step indicator dots
function updateStepIndicator() {
  const dots = document.querySelectorAll('.step-dot');
  dots.forEach((dot, index) => {
    if (index + 1 <= currentStep) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });
}

// Handle form submission
async function handleSubmit(e) {
  e.preventDefault();
  
  const user = getUserData();
  
  if (!user.userId) {
    alert('Session expired. Please register again.');
    window.location.href = 'registration.html';
    return;
  }
  
  // Collect all form data
  const interests = Array.from(document.querySelectorAll('input[name="interests"]:checked'))
    .map(cb => cb.value)
    .join(', ');
  
  const appUsage = document.querySelector('input[name="appUsage"]:checked').value;
  const financialGoals = document.getElementById('financial-goals').value.trim();
  const achievementPlan = document.getElementById('achievement-plan').value.trim();
  const timeframe = document.getElementById('timeframe-value').value;
  const timeframeUnit = document.getElementById('timeframe-unit').value;
  
  // Validate all fields
  if (!interests || !appUsage || !financialGoals || !achievementPlan || !timeframe || !timeframeUnit) {
    alert('Please complete all steps before submitting.');
    return;
  }
  
  // Show loading state
  const submitBtn = document.querySelector('.btn-submit');
  const originalText = submitBtn.textContent;
  submitBtn.classList.add('loading');
  submitBtn.disabled = true;
  
  try {
    // Send data to backend
    const response = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.userId,
        interests: interests,
        appUsage: appUsage,
        financialGoals: financialGoals,
        achievementPlan: achievementPlan,
        timeframe: timeframe,
        timeframeUnit: timeframeUnit
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Clear onboarding session data
      sessionStorage.removeItem('onboarding_userId');
      sessionStorage.removeItem('onboarding_username');
      sessionStorage.removeItem('onboarding_email');
      
      // Show success message
      alert('Onboarding completed successfully! Please login to continue.');
      
      // Redirect to login page
      window.location.href = data.redirect || 'login.html';
    } else {
      throw new Error(data.error || 'Failed to save onboarding data');
    }
  } catch (error) {
    console.error('Error submitting onboarding:', error);
    alert('Something went wrong. Please try again.');
    
    // Remove loading state
    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

// Make functions global so they can be called from HTML
window.nextStep = nextStep;
window.prevStep = prevStep;

// Initialize on page load
initOnboarding();