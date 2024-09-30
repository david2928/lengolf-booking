// public/js/main.js

'use strict';

// Initialize Luxon for date handling
const DateTime = luxon.DateTime;

// Global variables to store booking data
let selectedDate = '';
let selectedTimeSlot = '';
let maxDuration = 1;
let currentStepNumber = 1;

// Inactivity timeout (e.g., 15 minutes)
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds
let inactivityTimer;

// Function to reset the inactivity timer
function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(logoutUser, INACTIVITY_TIMEOUT);
}

// Function to log out the user
function logoutUser() {
    alert('You have been logged out due to inactivity.');
    // Clear user data
    localStorage.clear();
    // Redirect to login section
    document.getElementById('booking-section').classList.add('hidden');
    document.getElementById('confirmation-section').classList.add('hidden');
    document.getElementById('login-section').classList.remove('hidden');
    // Hide logout button
    document.getElementById('logout-button').style.display = 'none';
}

// Reset the timer on various user interactions
['click', 'mousemove', 'keydown', 'scroll', 'touchstart'].forEach(event => {
    document.addEventListener(event, resetInactivityTimer);
});

// Start the inactivity timer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    resetInactivityTimer();
});

// Initialize booking flow after successful login
function initializeBooking() {
    // Hide login section, show booking section
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('booking-section').classList.remove('hidden');

    // Start with Step 1
    showStep(1);

    // Initialize date options
    initializeDateOptions();

    // Update step headers
    updateStepHeaders(1);
}

// Function to show a specific step
function showStep(stepNumber) {
    currentStepNumber = stepNumber;
    // Hide all steps
    const steps = document.querySelectorAll('.booking-step');
    steps.forEach(step => step.classList.add('hidden'));

    // Show the requested step
    const step = document.getElementById(`step-${stepNumber}`);
    if (step) {
        step.classList.remove('hidden');
    }

    // Update step headers
    updateStepHeaders(stepNumber);

    // Show or hide the back button
    const backButton = document.getElementById('back-button');
    if (stepNumber > 1) {
        backButton.style.display = 'block';
        backButton.onclick = () => {
            showStep(stepNumber - 1);
        };
    } else {
        backButton.style.display = 'none';
    }

    // Show or hide the "Available slots for" text
    const availableSlotsHeader = document.getElementById('available-slots-header');
    if (availableSlotsHeader) {
        if (stepNumber === 2) {
            availableSlotsHeader.style.display = 'block';
            // Update the date in the header
            document.getElementById('selected-date-display-header').textContent = DateTime.fromISO(selectedDate, { zone: 'Asia/Bangkok' }).toFormat('dd/MM/yyyy');
        } else {
            availableSlotsHeader.style.display = 'none';
        }
    }
}

// Function to update progress bar based on current step
function updateStepHeaders(currentStep) {
    const progressBar = document.getElementById('progress-bar');
    let progressPercentage = 0;
    let stepText = '';

    switch (currentStep) {
        case 1:
            progressPercentage = 33;
            stepText = 'Step 1: Select Date';
            break;
        case 2:
            progressPercentage = 66;
            stepText = 'Step 2: Select Time Slot';
            break;
        case 3:
            progressPercentage = 100;
            stepText = 'Step 3: Provide Details';
            break;
        default:
            progressPercentage = 0;
            stepText = '';
    }

    progressBar.style.width = `${progressPercentage}%`;
    progressBar.setAttribute('aria-valuenow', progressPercentage);
    progressBar.textContent = stepText;
}

// Initialize date options in Step 1
function initializeDateOptions() {
    const today = DateTime.now().setZone('Asia/Bangkok');
    const dateOptions = document.querySelectorAll('.date-option');

    // Exclude the custom date picker from the predefined date options
    const predefinedDateOptions = Array.from(dateOptions).filter(
        card => !card.classList.contains('custom-date-picker')
    );

    predefinedDateOptions.forEach(card => {
        const offset = parseInt(card.getAttribute('data-offset'));
        if (isNaN(offset)) {
            console.error('Invalid offset:', card.getAttribute('data-offset'));
            return;
        }
        const date = today.plus({ days: offset });
        card.querySelector('.date-text').textContent = date.toFormat('dd/MM/yyyy');

        if (offset === 2) {
            card.querySelector('.day-after-text').textContent = date.toFormat('cccc');
        }

        // Add event listener
        card.addEventListener('click', () => {
            // Remove 'selected' class from all cards
            dateOptions.forEach(c => c.classList.remove('selected'));

            // Add 'selected' class to clicked card
            card.classList.add('selected');

            selectedDate = date.toISODate();
            proceedToTimeSelection();
        });
    });

    // Handle custom date picker
    const customDateInput = document.getElementById('custom-date');
    const customDateDisplay = document.getElementById('custom-date-display');
    const customDatePickerCard = document.getElementById('custom-date-picker');

    // Initialize Flatpickr
    let customFlatpickrInstance = flatpickr(customDateInput, {
        dateFormat: "yyyy-MM-dd",
        minDate: "today",
        onChange: function(selectedDates, dateStr) {
            if (dateStr) {
                // Remove 'selected' class from all cards
                dateOptions.forEach(c => c.classList.remove('selected'));
                customDatePickerCard.classList.add('selected');

                // Ensure the date is in ISO format
                selectedDate = DateTime.fromJSDate(selectedDates[0]).toISODate();

                // Update the display with the selected date
                customDateDisplay.textContent = DateTime.fromISO(selectedDate).toFormat('dd/MM/yyyy');

                proceedToTimeSelection();
            }
        }
    });

    // Open Flatpickr when card is clicked
    customDatePickerCard.addEventListener('click', function(event) {
        customFlatpickrInstance.open();
    });
}

function proceedToTimeSelection() {
    // Update selected date display
    const selectedDateDisplay = DateTime.fromISO(selectedDate, { zone: 'Asia/Bangkok' });
    if (!selectedDateDisplay.isValid) {
        console.error('Invalid selectedDate:', selectedDate);
        alert('Invalid date selected. Please try again.');
        showStep(1);
        return;
    }

    // Show Step 2
    showStep(2);

    // Fetch available slots
    fetchAvailableSlots(selectedDate);
}

// Fetch available slots from backend
function fetchAvailableSlots(date) {
    const availableSlotsDiv = document.getElementById('available-slots');
    const loadingSpinner = document.getElementById('loading-spinner');

    // Show loading spinner
    loadingSpinner.style.display = 'block';
    availableSlotsDiv.innerHTML = '';

    const token = localStorage.getItem('token'); // Retrieve JWT

    fetch(`/api/bookings/available-slots?date=${date}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(async res => {
        const contentType = res.headers.get('content-type');
        if (!res.ok) {
            if (contentType && contentType.includes('application/json')) {
                const errorData = await res.json();
                throw new Error(errorData.message || `Server responded with status ${res.status}`);
            } else {
                throw new Error(`Server responded with status ${res.status}`);
            }
        }
        if (contentType && contentType.includes('application/json')) {
            return res.json();
        } else {
            throw new Error('Received non-JSON response from server.');
        }
    })
    .then(data => {
        loadingSpinner.style.display = 'none';
        if (data.success) {
            renderAvailableSlots(data.availableSlots);
        } else {
            availableSlotsDiv.innerHTML = `<p class="text-danger">${data.message}</p>`;
        }
    })
    .catch(err => {
        loadingSpinner.style.display = 'none';
        availableSlotsDiv.innerHTML = `<p class="text-danger">Failed to load available slots: ${err.message}</p>`;
        console.error('Error fetching available slots:', err);
    });
}

// Render available slots on the page
function renderAvailableSlots(slots) {
    const availableSlotsDiv = document.getElementById('available-slots');
    availableSlotsDiv.innerHTML = '';

    if (slots.length === 0) {
        availableSlotsDiv.innerHTML = `<p class="text-warning">No available slots for the selected date.</p>`;
        return;
    }

    slots.forEach(slot => {
        const slotCol = document.createElement('div');
        slotCol.className = 'col-md-4 col-sm-6 mb-4';

        const slotCard = document.createElement('div');
        slotCard.className = 'card slot-card h-100';

        slotCard.innerHTML = `
            <div class="card-body d-flex flex-column">
                <h5 class="card-title fw-bold">
                    <i class="fas fa-clock me-2"></i>${slot.startTime}
                </h5>
                <p class="card-text">
                    Available for up to ${slot.maxDuration} hour(s)
                </p>
                <div class="mt-auto">
                    <button class="btn btn-primary book-now-button">Select</button>
                </div>
            </div>
        `;

        const bookNowButton = slotCard.querySelector('.book-now-button');
        bookNowButton.addEventListener('click', () => {
            selectedTimeSlot = slot.startTime;
            maxDuration = slot.maxDuration;
            proceedToDetailsForm();
        });

        slotCol.appendChild(slotCard);
        availableSlotsDiv.appendChild(slotCol);
    });
}

// Proceed to Step 3: Provide Details
function proceedToDetailsForm() {
    // Show Step 3
    showStep(3);

    // Reset confirm button
    const confirmButton = document.getElementById('confirm-booking-button');
    confirmButton.disabled = true;
    confirmButton.innerHTML = '<i class="fas fa-check-circle me-2"></i>Confirm Booking';
    confirmButton.classList.remove('enabled');

    // Update final date and time display
    document.getElementById('final-date').textContent = DateTime.fromISO(selectedDate).toFormat('dd/MM/yyyy');
    document.getElementById('final-time').textContent = selectedTimeSlot;

    // Initialize duration options
    initializeDurationOptions();

    // Prefill phone number if available
    prefillPhoneNumber();

    // Attach event listener to confirm booking button
    confirmButton.addEventListener('click', submitBooking);

    // Validate form on input changes
    document.getElementById('phone-number').addEventListener('input', validateForm);
    document.getElementById('duration-select').addEventListener('change', () => {
        calculateEndTime();
        validateForm();
    });
    document.querySelectorAll('.num-people-button').forEach(button => {
        button.addEventListener('click', validateForm);
    });

    // Reset form fields
    resetNumberOfPeopleSelection();
    validateForm();

    // Calculate initial end time
    calculateEndTime();
}

// Initialize duration options based on maxDuration
function initializeDurationOptions() {
    const durationSelect = document.getElementById('duration-select');
    durationSelect.innerHTML = '';
    for (let i = 1; i <= maxDuration; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `${i} hour(s)`;
        durationSelect.appendChild(option);
    }
}

// Calculate and display the end time
function calculateEndTime() {
    const duration = parseInt(document.getElementById('duration-select').value) || 0;
    if (duration > 0) {
        const startTime = DateTime.fromFormat(selectedTimeSlot, 'HH:mm', { zone: 'Asia/Bangkok' });
        if (!startTime.isValid) {
            console.error('Invalid start time:', selectedTimeSlot);
            document.getElementById('end-time-display').innerHTML = '<strong>--:--</strong>';
            return;
        }
        const endTime = startTime.plus({ hours: duration });
        document.getElementById('end-time-display').innerHTML = `<strong>${endTime.toFormat('HH:mm')}</strong>`;
    } else {
        document.getElementById('end-time-display').innerHTML = '<strong>--:--</strong>';
    }
}

// Prefill phone number from localStorage
function prefillPhoneNumber() {
    const phoneNumberInput = document.getElementById('phone-number');
    const prefilledIndicator = document.getElementById('phone-prefilled-indicator');
    const userPhone = localStorage.getItem('phoneNumber');

    if (userPhone) {
        phoneNumberInput.value = userPhone;
        prefilledIndicator.style.display = 'block';
        phoneNumberInput.classList.add('prefilled');
    } else {
        prefilledIndicator.style.display = 'none';
        phoneNumberInput.classList.remove('prefilled');
    }
    validateForm();
}

// Validate form fields to enable/disable Confirm Booking button
function validateForm() {
    const phoneNumber = document.getElementById('phone-number').value.trim();
    const numberOfPeople = document.getElementById('number-of-people').value;
    const duration = document.getElementById('duration-select').value;

    let isValid = true;

    // Validate Duration
    if (duration === '') {
        document.getElementById('duration-error').style.display = 'block';
        isValid = false;
    } else {
        document.getElementById('duration-error').style.display = 'none';
    }

    // Validate Phone Number
    const phoneRegex = /^\+?[0-9\s\-()]{7,15}$/; // Allows +, numbers, spaces, dashes, parentheses
    if (phoneNumber === '') {
        document.getElementById('phone-error').textContent = 'Please enter your phone number.';
        document.getElementById('phone-error').style.display = 'block';
        isValid = false;
    } else if (!phoneRegex.test(phoneNumber)) {
        document.getElementById('phone-error').textContent = 'Please enter a valid phone number.';
        document.getElementById('phone-error').style.display = 'block';
        isValid = false;
    } else {
        document.getElementById('phone-error').style.display = 'none';
    }

    // Validate Number of People
    if (numberOfPeople === '') {
        document.getElementById('people-error').style.display = 'block';
        isValid = false;
    } else {
        document.getElementById('people-error').style.display = 'none';
    }

    const confirmButton = document.getElementById('confirm-booking-button');
    if (isValid) {
        confirmButton.disabled = false;
        confirmButton.classList.add('enabled');
    } else {
        confirmButton.disabled = true;
        confirmButton.classList.remove('enabled');
    }
}

// Handle Number of People Button Clicks
document.querySelectorAll('.num-people-button').forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all buttons
        document.querySelectorAll('.num-people-button').forEach(btn => btn.classList.remove('active'));
        // Add active class to the clicked button
        button.classList.add('active');
        // Set the hidden input value
        document.getElementById('number-of-people').value = button.getAttribute('data-value');

        // Update border colors based on selection
        updateNumberOfPeopleBorders();

        validateForm();
    });
});

// Update border colors for Number of People buttons
function updateNumberOfPeopleBorders() {
    const selectedValue = document.getElementById('number-of-people').value;
    const buttons = document.querySelectorAll('.num-people-button');

    if (selectedValue) {
        // If a number is selected, add green border and remove red
        buttons.forEach(btn => {
            btn.classList.remove('red-border');
            btn.classList.add('green-border');
        });
        // Hide error message
        document.getElementById('people-error').style.display = 'none';
    } else {
        // If no selection, add red border and remove green
        buttons.forEach(btn => {
            btn.classList.remove('green-border');
            btn.classList.add('red-border');
        });
        // Show error message
        document.getElementById('people-error').style.display = 'block';
    }
}

// Reset number of people selection
function resetNumberOfPeopleSelection() {
    const buttons = document.querySelectorAll('.num-people-button');
    buttons.forEach(button => button.classList.remove('active'));
    document.getElementById('number-of-people').value = '';
    // Remove any border classes
    buttons.forEach(button => {
        button.classList.remove('red-border', 'green-border');
    });
}

// Submit Booking
function submitBooking() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('You are not authenticated. Please log in again.');
        return;
    }

    const userId = localStorage.getItem('userId');
    if (!userId) {
        alert('User ID is missing. Please try logging in again.');
        return;
    }

    const userName = localStorage.getItem('name'); // Fetching the user's name
    const email = localStorage.getItem('email'); // Fetching the user's email
    const loginMethod = localStorage.getItem('loginMethod'); // Fetching login method
    const phoneNumber = document.getElementById('phone-number').value.trim();
    const numberOfPeople = parseInt(document.getElementById('number-of-people').value);
    const date = selectedDate;
    const startTime = selectedTimeSlot;
    const duration = parseInt(document.getElementById('duration-select').value);
    const confirmButton = document.getElementById('confirm-booking-button');
    const originalButtonText = confirmButton.innerHTML;

    if (!phoneNumber || isNaN(numberOfPeople) || numberOfPeople < 1) {
        alert('Please provide valid booking details.');
        return;
    }

    // Disable the confirm button and show a spinner
    confirmButton.disabled = true;
    confirmButton.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Confirming...`;

    fetch('/api/bookings/book-slot', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            userId,
            userName, // Include the user's name in the booking data
            email, // Include the user's email
            phoneNumber,
            numberOfPeople,
            date,
            startTime,
            duration,
            loginMethod // Include login method in booking data if needed
        }),
    })
    .then(async res => {
        const contentType = res.headers.get('content-type');
        if (!res.ok) {
            if (contentType && contentType.includes('application/json')) {
                const errorData = await res.json();
                throw new Error(errorData.message || `Server responded with status ${res.status}`);
            } else {
                throw new Error(`Server responded with status ${res.status}`);
            }
        }
        if (contentType && contentType.includes('application/json')) {
            return res.json();
        } else {
            throw new Error('Received non-JSON response from server.');
        }
    })
    .then(data => {
        if (data.success) {
            // Update localStorage with the latest phone number
            localStorage.setItem('phoneNumber', phoneNumber);

            // Show confirmation
            showConfirmation(data.bookingDetails);
        } else {
            // Re-enable confirm button
            confirmButton.disabled = false;
            confirmButton.innerHTML = originalButtonText;

            alert(data.message || 'Failed to book the slot.');
        }
    })
    .catch(err => {
        // Re-enable confirm button
        confirmButton.disabled = false;
        confirmButton.innerHTML = originalButtonText;

        console.error('Error booking slot:', err);
        alert(`An error occurred while booking: ${err.message}`);
    });
}

// Show Confirmation Step
function showConfirmation(bookingData) {
    // Hide all steps
    const steps = document.querySelectorAll('.booking-step');
    steps.forEach(step => step.classList.add('hidden'));

    // Hide progress bar
    const progressBarContainer = document.querySelector('.progress');
    if (progressBarContainer) {
        progressBarContainer.style.display = 'none';
    }

    // Hide back button
    const backButton = document.getElementById('back-button');
    backButton.style.display = 'none';

    // Show confirmation section
    const confirmationSection = document.getElementById('confirmation-section');
    confirmationSection.classList.remove('hidden');

    const userName = localStorage.getItem('name');
    const date = DateTime.fromISO(selectedDate).toFormat('dd/MM/yyyy');
    const startTime = selectedTimeSlot;
    const duration = parseInt(document.getElementById('duration-select').value);
    const numberOfPeople = parseInt(document.getElementById('number-of-people').value);
    const endTime = DateTime.fromFormat(startTime, 'HH:mm', { zone: 'Asia/Bangkok' }).plus({ hours: duration }).toFormat('HH:mm');

    // Display booking details
    confirmationSection.innerHTML = `
        <h3 class="mb-4">Booking Confirmed!</h3>
        <p>Thank you, <strong>${userName}</strong>, for your booking.</p>
        <p>Booking Details:</p>
        <ul class="list-unstyled">
            <li>Date: ${date}</li>
            <li>Start Time: ${startTime}</li>
            <li>End Time: ${endTime}</li>
            <li>Duration: ${duration} hour(s)</li>
            <li>Number of People: ${numberOfPeople}</li>
        </ul>
        <button class="btn btn-primary mt-3" onclick="promptAnotherBooking()">
            <i class="fas fa-calendar-check me-2"></i>Book Another Slot
        </button>
    `;
}

// Prompt user to make another booking
function promptAnotherBooking() {
    // Reset booking data
    selectedDate = '';
    selectedTimeSlot = '';
    maxDuration = 1;

    // Reset confirm button
    const confirmButton = document.getElementById('confirm-booking-button');
    confirmButton.disabled = true;
    confirmButton.innerHTML = '<i class="fas fa-check-circle me-2"></i>Confirm Booking';
    confirmButton.classList.remove('enabled');

    // Show progress bar
    const progressBarContainer = document.querySelector('.progress');
    if (progressBarContainer) {
        progressBarContainer.style.display = 'block';
    }

    // Hide confirmation section
    document.getElementById('confirmation-section').classList.add('hidden');

    // Start over from Step 1
    initializeBooking();
}

// Initialize the app after successful login
function onLoginSuccess() {
    // Show logout button
    document.getElementById('logout-button').style.display = 'block';

    // Fetch customer data and then initialize booking
    fetchCustomerData().then(() => {
        initializeBooking();
    }).catch(() => {
        // Proceed with booking initialization even if customer data fetch fails
        initializeBooking();
    });
}

// Attach logout functionality
document.getElementById('logout-button').addEventListener('click', () => {
    localStorage.clear();
    // Redirect to login section
    document.getElementById('booking-section').classList.add('hidden');
    document.getElementById('confirmation-section').classList.add('hidden');
    document.getElementById('login-section').classList.remove('hidden');
    // Hide logout button
    document.getElementById('logout-button').style.display = 'none';
});

// Handle login with Google
function handleCredentialResponse(response) {
    const token = response.credential;
    // Send the token to your backend to verify and get user info
    fetch('/api/auth/login/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token }),
    })
    .then(async res => {
        const contentType = res.headers.get('content-type');
        if (!res.ok) {
            if (contentType && contentType.includes('application/json')) {
                const errorData = await res.json();
                throw new Error(errorData.message || `Server responded with status ${res.status}`);
            } else {
                throw new Error(`Server responded with status ${res.status}`);
            }
        }
        if (contentType && contentType.includes('application/json')) {
            return res.json();
        } else {
            throw new Error('Received non-JSON response from server.');
        }
    })
    .then(data => {
        if (data.success) {
            // Save user data and token in localStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data.userId);
            localStorage.setItem('name', data.name);
            localStorage.setItem('email', data.email);
            localStorage.setItem('loginMethod', 'google');

            onLoginSuccess();
        } else {
            alert(data.message || 'Login failed.');
        }
    })
    .catch(err => {
        console.error('Error during Google login:', err);
        alert(`An error occurred during login: ${err.message}`);
    });
}

// Make handleCredentialResponse globally accessible for Google Sign-In
window.handleCredentialResponse = handleCredentialResponse;

// Handle login with Facebook
function handleFacebookLogin() {
    FB.login(response => {
        if (response.authResponse) {
            const accessToken = response.authResponse.accessToken;

            // Send the access token to your backend to verify and get user info
            fetch('/api/auth/login/facebook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken: accessToken }), // Ensure the key is 'accessToken' as expected by the server
            })
            .then(async res => {
                const contentType = res.headers.get('content-type');
                if (!res.ok) {
                    if (contentType && contentType.includes('application/json')) {
                        const errorData = await res.json();
                        throw new Error(errorData.message || `Server responded with status ${res.status}`);
                    } else {
                        throw new Error(`Server responded with status ${res.status}`);
                    }
                }
                if (contentType && contentType.includes('application/json')) {
                    return res.json();
                } else {
                    throw new Error('Received non-JSON response from server.');
                }
            })
            .then(data => {
                if (data.success) {
                    // Save user data and token in localStorage
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('userId', data.userId);
                    localStorage.setItem('name', data.name);
                    localStorage.setItem('email', data.email);
                    localStorage.setItem('loginMethod', 'facebook');

                    onLoginSuccess();
                } else {
                    alert(data.message || 'Login failed.');
                }
            })            
            .catch(err => {
                console.error('Error during Facebook login:', err);
                alert(`An error occurred during login: ${err.message}`);
            });
        } else {
            alert('Facebook login was not successful.');
        }
    }, { scope: 'public_profile,email' });
}

// Event listener for Facebook login button
document.getElementById('facebook-login-button').addEventListener('click', handleFacebookLogin);

// Handle guest login
document.getElementById('guest-login-button').addEventListener('click', () => {
    // Show additional info form
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('additional-info-section').classList.remove('hidden');
});

// Handle submission of additional info
document.getElementById('submit-additional-info').addEventListener('click', handleGuestLogin);

function handleGuestLogin() {
    const name = document.getElementById('additional-name').value.trim();
    const email = document.getElementById('additional-email').value.trim();
    const phone = document.getElementById('additional-phone').value.trim();

    if (!name || !email || !phone) {
        alert('Please fill out all fields.');
        return;
    }

    // Simulate token and user ID generation
    const fakeToken = 'guest-token-' + Date.now();
    const fakeUserId = 'guest-' + Date.now();

    // Save user data and token in localStorage
    localStorage.setItem('token', fakeToken);
    localStorage.setItem('userId', fakeUserId);
    localStorage.setItem('name', name);
    localStorage.setItem('email', email);
    localStorage.setItem('phoneNumber', phone);
    localStorage.setItem('loginMethod', 'guest');

    // Proceed to booking
    document.getElementById('additional-info-section').classList.add('hidden');
    onLoginSuccess();
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
        // Assume the user is logged in
        onLoginSuccess();
    }
});

function fetchCustomerData() {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');

    return fetch(`/api/customers?userId=${userId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(async res => {
        const contentType = res.headers.get('content-type');
        if (!res.ok) {
            if (contentType && contentType.includes('application/json')) {
                const errorData = await res.json();
                throw new Error(errorData.message || `Server responded with status ${res.status}`);
            } else {
                throw new Error(`Server responded with status ${res.status}`);
            }
        }
        if (contentType && contentType.includes('application/json')) {
            return res.json();
        } else {
            throw new Error('Received non-JSON response from server.');
        }
    })
    .then(data => {
        if (data.success && data.customerData) {
            // Save phone number in localStorage
            localStorage.setItem('phoneNumber', data.customerData.phoneNumber);
        }
    })
    .catch(err => {
        console.error('Error fetching customer data:', err);
    });
}
