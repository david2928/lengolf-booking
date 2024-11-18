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
const INACTIVITY_TIMEOUT = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds
let inactivityTimer;

// Function to reset the inactivity timer
function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(logoutUser, INACTIVITY_TIMEOUT);
}

// Reset the timer on various user interactions
['click', 'mousemove', 'keydown', 'scroll', 'touchstart'].forEach(event => {
    document.addEventListener(event, resetInactivityTimer);
});

// Start the inactivity timer when the page loads
document.addEventListener('DOMContentLoaded', resetInactivityTimer);

// Initialize booking flow after successful login
function initializeBooking() {
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('booking-section').classList.remove('hidden');

    selectedDate = localStorage.getItem('selectedDate') || '';
    selectedTimeSlot = localStorage.getItem('selectedTimeSlot') || '';
    maxDuration = parseInt(localStorage.getItem('maxDuration')) || 1;

    let stepToShow = 1;
    if (selectedDate && selectedTimeSlot) {
        stepToShow = 3;
    } else if (selectedDate) {
        stepToShow = 2;
    }

    updateStepHeaders(stepToShow);
    showStep(stepToShow);
    initializeDateOptions();

    if (stepToShow >= 2 && selectedDate) {
        fetchAvailableSlots(selectedDate);
    }

    if (stepToShow === 3) {
        proceedToDetailsForm();
    }
}

// Function to show a specific step
function showStep(stepNumber) {
    currentStepNumber = stepNumber;
    localStorage.setItem('currentStepNumber', stepNumber);

    document.querySelectorAll('.booking-step').forEach(step => step.classList.add('hidden'));
    const step = document.getElementById(`step-${stepNumber}`);
    if (step) step.classList.remove('hidden');

    updateStepHeaders(stepNumber);

    const backButton = document.getElementById('back-button');
    if (stepNumber > 1) {
        backButton.style.display = 'block';
        backButton.onclick = () => showStep(stepNumber - 1);
    } else {
        backButton.style.display = 'none';
    }

    const availableSlotsHeader = document.getElementById('available-slots-header');
    if (availableSlotsHeader) {
        if (stepNumber === 2) {
            availableSlotsHeader.style.display = 'block';
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
    }

    progressBar.style.width = `${progressPercentage}%`;
    progressBar.setAttribute('aria-valuenow', progressPercentage);
    progressBar.textContent = stepText;
}

// Initialize date options in Step 1
function initializeDateOptions() {
    const today = DateTime.now().setZone('Asia/Bangkok');
    const dateOptions = document.querySelectorAll('.date-option');

    const predefinedDateOptions = Array.from(dateOptions).filter(card => !card.classList.contains('custom-date-picker'));

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

        card.addEventListener('click', () => {
            dateOptions.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedDate = date.toISODate();
            proceedToTimeSelection();
        });
    });

    const customDateInput = document.getElementById('custom-date');
    const customDateDisplay = document.getElementById('custom-date-display');
    const customDatePickerCard = document.getElementById('custom-date-picker');

    const customFlatpickrInstance = flatpickr(customDateInput, {
        dateFormat: "yyyy-MM-dd",
        minDate: "today",
        onChange: function (selectedDates, dateStr) {
            if (dateStr) {
                dateOptions.forEach(c => c.classList.remove('selected'));
                customDatePickerCard.classList.add('selected');
                selectedDate = DateTime.fromJSDate(selectedDates[0]).toISODate();
                customDateDisplay.textContent = DateTime.fromISO(selectedDate).toFormat('dd/MM/yyyy');
                proceedToTimeSelection();
            }
        }
    });

    customDatePickerCard.addEventListener('click', () => customFlatpickrInstance.open());
}

function proceedToTimeSelection() {
    const selectedDateDisplay = DateTime.fromISO(selectedDate, { zone: 'Asia/Bangkok' });
    if (!selectedDateDisplay.isValid) {
        console.error('Invalid selectedDate:', selectedDate);
        alert('Invalid date selected. Please try again.');
        showStep(1);
        return;
    }
    showStep(2);
    fetchAvailableSlots(selectedDate);
}

// Helper function for fetch responses
async function handleFetchResponse(res) {
    const contentType = res.headers.get('content-type');
    if (!res.ok) {
        const errorMessage = contentType && contentType.includes('application/json') ? (await res.json()).message : `Server responded with status ${res.status}`;
        throw new Error(errorMessage);
    }
    if (contentType && contentType.includes('application/json')) {
        return res.json();
    } else {
        throw new Error('Received non-JSON response from server.');
    }
}

// Fetch available slots from backend
async function fetchAvailableSlots(date) {
    const availableSlotsDiv = document.getElementById('available-slots');
    const loadingSpinner = document.getElementById('loading-spinner');
    loadingSpinner.style.display = 'block';
    availableSlotsDiv.innerHTML = '';

    const token = localStorage.getItem('token');

    try {
        const res = await fetch(`/api/bookings/available-slots?date=${date}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await handleFetchResponse(res);
        loadingSpinner.style.display = 'none';
        if (data.success) {
            renderAvailableSlots(data.availableSlots);
        } else {
            availableSlotsDiv.innerHTML = `<p class="text-danger">${data.message}</p>`;
        }
    } catch (err) {
        loadingSpinner.style.display = 'none';
        availableSlotsDiv.innerHTML = `<p class="text-danger">Failed to load available slots: ${err.message}</p>`;
        console.error('Error fetching available slots:', err);
    }
}

// Render available slots on the page
function renderAvailableSlots(slots) {
    const availableSlotsDiv = document.getElementById('available-slots');
    availableSlotsDiv.innerHTML = '';

    if (slots.length === 0) {
        availableSlotsDiv.innerHTML = `
            <div class="alert alert-warning d-flex align-items-center" role="alert">
                <i class="fas fa-calendar-times fa-2x me-3"></i>
                <div>
                    <p class="mb-2">Oops! Looks like we're fully booked on this date.</p>
                    <button class="btn btn-primary btn-sm" onclick="showStep(1)">
                        <i class="fas fa-arrow-left me-2"></i>Pick Another Date
                    </button>
                </div>
            </div>
        `;
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

        slotCard.querySelector('.book-now-button').addEventListener('click', () => {
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
    showStep(3);

    const confirmButton = document.getElementById('confirm-booking-button');
    confirmButton.disabled = true;
    confirmButton.innerHTML = '<i class="fas fa-check-circle me-2"></i>Confirm Booking';
    confirmButton.classList.remove('enabled');

    document.getElementById('final-date').textContent = DateTime.fromISO(selectedDate).toFormat('dd/MM/yyyy');
    document.getElementById('final-time').textContent = selectedTimeSlot;

    initializeDurationOptions();
    prefillPhoneNumber();
    prefillEmail();
    loadFormData();
    resetNumberOfPeopleSelection();
    validateForm();
    calculateEndTime();

    confirmButton.addEventListener('click', submitBooking);

    document.getElementById('phone-number').addEventListener('input', () => {
        saveFormData();
        validateForm();
    });
    document.getElementById('duration-select').addEventListener('change', () => {
        saveFormData();
        calculateEndTime();
        validateForm();
    });
    document.querySelectorAll('.num-people-button').forEach(button => {
        button.addEventListener('click', () => {
            saveFormData();
            validateForm();
        });
    });
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

// Prefill email from localStorage
function prefillEmail() {
    const emailInput = document.getElementById('email-address');
    const prefilledIndicator = document.getElementById('email-prefilled-indicator');
    const userEmail = localStorage.getItem('email');

    if (userEmail) {
        emailInput.value = userEmail;
        prefilledIndicator.style.display = 'block';
        emailInput.classList.add('prefilled');
    } else {
        prefilledIndicator.style.display = 'none';
        emailInput.classList.remove('prefilled');
    }
    validateForm();
}

// Validate form fields to enable/disable Confirm Booking button
function validateForm() {
    const phoneNumber = document.getElementById('phone-number').value.trim();
    const emailAddress = document.getElementById('email-address').value.trim();
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
    const phoneRegex = /^\+?[0-9\s\-()]{7,15}$/;
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

    // Validate Email Address
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailAddress === '') {
        document.getElementById('email-error').textContent = 'Please enter your email address.';
        document.getElementById('email-error').style.display = 'block';
        isValid = false;
    } else if (!emailRegex.test(emailAddress)) {
        document.getElementById('email-error').textContent = 'Please enter a valid email address.';
        document.getElementById('email-error').style.display = 'block';
        isValid = false;
    } else {
        document.getElementById('email-error').style.display = 'none';
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
        document.querySelectorAll('.num-people-button').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        document.getElementById('number-of-people').value = button.getAttribute('data-value');
        updateNumberOfPeopleBorders();
        validateForm();
    });
});

// Update border colors for Number of People buttons
function updateNumberOfPeopleBorders() {
    const selectedValue = document.getElementById('number-of-people').value;
    const buttons = document.querySelectorAll('.num-people-button');

    buttons.forEach(btn => {
        btn.classList.remove('red-border', 'green-border');
        btn.classList.add(selectedValue ? 'green-border' : 'red-border');
    });
    document.getElementById('people-error').style.display = selectedValue ? 'none' : 'block';
}

// Reset number of people selection
function resetNumberOfPeopleSelection() {
    document.querySelectorAll('.num-people-button').forEach(button => button.classList.remove('active', 'red-border', 'green-border'));
    document.getElementById('number-of-people').value = '';
}

// Submit Booking
async function submitBooking() {
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

    const userName = localStorage.getItem('name');
    const loginMethod = localStorage.getItem('loginMethod');
    const phoneNumber = document.getElementById('phone-number').value.trim();
    const emailAddress = document.getElementById('email-address').value.trim(); // Get email from form
    const numberOfPeople = parseInt(document.getElementById('number-of-people').value);
    const date = selectedDate;
    const startTime = selectedTimeSlot;
    const duration = parseInt(document.getElementById('duration-select').value);
    const confirmButton = document.getElementById('confirm-booking-button');
    const originalButtonText = confirmButton.innerHTML;

    if (!phoneNumber || !emailAddress || isNaN(numberOfPeople) || numberOfPeople < 1) {
        alert('Please provide valid booking details.');
        return;
    }

    confirmButton.disabled = true;
    confirmButton.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Confirming...`;

    try {
        const res = await fetch('/api/bookings/book-slot', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                userId,
                userName,
                email: emailAddress, // Use updated email
                phoneNumber,
                numberOfPeople,
                date,
                startTime,
                duration,
                loginMethod
            }),
        });
        const data = await handleFetchResponse(res);

        if (data.success) {
            localStorage.setItem('phoneNumber', phoneNumber);
            localStorage.setItem('email', emailAddress); // Save updated email
            showConfirmation(data.bookingDetails);
        } else {
            confirmButton.disabled = false;
            confirmButton.innerHTML = originalButtonText;
            alert(data.message || 'Failed to book the slot.');
        }
    } catch (err) {
        confirmButton.disabled = false;
        confirmButton.innerHTML = originalButtonText;
        console.error('Error booking slot:', err);
        alert(`An error occurred while booking: ${err.message}`);
    }
}

// Show Confirmation Step
function showConfirmation(bookingData) {
    document.querySelectorAll('.booking-step').forEach(step => step.classList.add('hidden'));
    const progressBarContainer = document.querySelector('.progress');
    if (progressBarContainer) progressBarContainer.style.display = 'none';
    document.getElementById('back-button').style.display = 'none';
    const confirmationSection = document.getElementById('confirmation-section');
    confirmationSection.classList.remove('hidden');

    const userName = localStorage.getItem('name');
    const email = localStorage.getItem('email');
    const date = DateTime.fromISO(selectedDate).toFormat('dd/MM/yyyy');
    const startTime = selectedTimeSlot;
    const duration = parseInt(document.getElementById('duration-select').value);
    const numberOfPeople = parseInt(document.getElementById('number-of-people').value);
    const endTime = DateTime.fromFormat(startTime, 'HH:mm', { zone: 'Asia/Bangkok' }).plus({ hours: duration }).toFormat('HH:mm');

    confirmationSection.innerHTML = `
        <div class="card shadow-sm">
            <div class="card-body">
                <h3 class="card-title text-center mb-4">
                    <i class="fas fa-check-circle text-success me-2"></i>Booking Confirmed!
                </h3>
                <p class="text-center">Thank you, <strong>${userName}</strong>, for your booking.</p>
                <p class="text-center">An email confirmation has been sent to <strong>${email}</strong>.</p>
                <div class="table-responsive">
                    <table class="table table-bordered">
                        <tbody>
                            <tr>
                                <th scope="row" class="bg-light">Date</th>
                                <td>${date}</td>
                            </tr>
                            <tr>
                                <th scope="row" class="bg-light">Start Time</th>
                                <td>${startTime}</td>
                            </tr>
                            <tr>
                                <th scope="row" class="bg-light">End Time</th>
                                <td>${endTime}</td>
                            </tr>
                            <tr>
                                <th scope="row" class="bg-light">Duration</th>
                                <td>${duration} hour(s)</td>
                            </tr>
                            <tr>
                                <th scope="row" class="bg-light">Number of People</th>
                                <td>${numberOfPeople}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div class="text-center mt-4">
                    <button class="btn btn-primary" onclick="promptAnotherBooking()">
                        <i class="fas fa-calendar-check me-2"></i>Book Another Slot
                    </button>
                    <button id="save-image-button" class="btn btn-secondary ms-2">
                        <i class="fas fa-save me-2"></i>Save Confirmation as Image
                    </button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('save-image-button').addEventListener('click', saveConfirmationAsImage);

    localStorage.setItem('bookingConfirmation', JSON.stringify(bookingData));
    localStorage.removeItem('selectedDate');
    localStorage.removeItem('selectedTimeSlot');
    localStorage.removeItem('maxDuration');
    localStorage.removeItem('currentStepNumber');
}

// Prompt user to make another booking
function promptAnotherBooking() {
    selectedDate = '';
    selectedTimeSlot = '';
    maxDuration = 1;

    const confirmButton = document.getElementById('confirm-booking-button');
    confirmButton.disabled = true;
    confirmButton.innerHTML = '<i class="fas fa-check-circle me-2"></i>Confirm Booking';
    confirmButton.classList.remove('enabled');

    const progressBarContainer = document.querySelector('.progress');
    if (progressBarContainer) progressBarContainer.style.display = 'block';

    document.getElementById('confirmation-section').classList.add('hidden');

    initializeBooking();
    localStorage.removeItem('selectedDate');
    localStorage.removeItem('selectedTimeSlot');
    localStorage.removeItem('maxDuration');
    localStorage.removeItem('currentStepNumber');
}

// Attach logout functionality
document.getElementById('logout-button').addEventListener('click', (event) => {
    event.preventDefault();
    localStorage.clear();
    document.getElementById('booking-section').classList.add('hidden');
    document.getElementById('confirmation-section').classList.add('hidden');
    document.getElementById('login-section').classList.remove('hidden');
    document.getElementById('logout-button').style.display = 'none';
});

function saveConfirmationAsImage() {
    const confirmationCard = document.querySelector('#confirmation-section .card');
    html2canvas(confirmationCard, { scale: 2 }).then(canvas => {
        const imageData = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = imageData;
        link.download = 'booking_confirmation.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }).catch(err => {
        console.error('Error capturing confirmation as image:', err);
        alert('An error occurred while saving the image. Please try again.');
    });
}

// Handle login with Google
function handleCredentialResponse(response) {
    const idToken = response.credential;
    if (!idToken) {
        console.error('No credential received.');
        return;
    }

    fetch('/api/auth/login/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: idToken }),
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data.userId);
            localStorage.setItem('name', data.name);
            localStorage.setItem('email', data.email);
            localStorage.setItem('loginMethod', 'google');
            localStorage.setItem('phoneNumber', data.phoneNumber);
            onLoginSuccess();
        } else {
            alert(data.message || 'Login failed.');
        }
    })
    .catch(err => {
        console.error('Error during login:', err);
        alert('An error occurred during login.');
    });
}

window.onload = function () {
    const token = localStorage.getItem('token');
    const loginMethod = localStorage.getItem('loginMethod');

    if (token && loginMethod && loginMethod !== 'google') {
        console.log('User is already logged in via', loginMethod);
        return;
    }

    const gIdOnload = document.getElementById('g_id_onload');
    const clientId = gIdOnload.getAttribute('data-client_id');

    google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: true,
        cancel_on_tap_outside: false,
        prompt_parent_id: 'g_id_onload',
    });

    google.accounts.id.prompt(notification => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            console.log('Silent sign-in not possible. User needs to sign in manually.');
        } else if (notification.isDisplayed()) {
            console.log('Prompt displayed.');
        } else if (notification.isDismissedMoment()) {
            console.log('Prompt dismissed.');
        }
    });
};

window.handleCredentialResponse = handleCredentialResponse;

// Handle login with Facebook
function handleFacebookLogin() {
    FB.login(response => {
        if (response.authResponse) {
            const accessToken = response.authResponse.accessToken;

            fetch('/api/auth/login/facebook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken }),
            })
            .then(handleFetchResponse)
            .then(data => {
                if (data.success) {
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

document.getElementById('facebook-login-button').addEventListener('click', handleFacebookLogin);

// Handle guest login
document.getElementById('guest-login-button').addEventListener('click', () => {
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('additional-info-section').classList.remove('hidden');
});

document.getElementById('submit-additional-info').addEventListener('click', handleGuestLogin);

async function handleGuestLogin() {
    const name = document.getElementById('additional-name').value.trim();
    const email = document.getElementById('additional-email').value.trim();
    const phone = document.getElementById('additional-phone').value.trim();

    if (!name || !email || !phone) {
        alert('Please fill out all fields.');
        return;
    }

    const submitButton = document.getElementById('submit-additional-info');
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Submitting...';

    try {
        const res = await fetch('/api/auth/login/guest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phoneNumber: phone }),
        });
        const data = await handleFetchResponse(res);
        if (data.success) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data.userId);
            localStorage.setItem('name', data.name);
            localStorage.setItem('email', data.email);
            localStorage.setItem('phoneNumber', data.phoneNumber);
            localStorage.setItem('loginMethod', data.loginSource);

            document.getElementById('additional-info-section').classList.add('hidden');
            onLoginSuccess();
        } else {
            alert(data.message || 'Guest login failed.');
        }
    } catch (err) {
        console.error('Error during guest login:', err);
        alert(`An error occurred during guest login: ${err.message}`);
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = 'Submit';
    }
}

function fetchCustomerData() {
    const loginMethod = localStorage.getItem('loginMethod');
    if (loginMethod === 'guest') {
        console.log('Guest user detected. Skipping fetchCustomerData.');
        return Promise.resolve();
    }

    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');

    return fetch(`/api/customers?userId=${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(handleFetchResponse)
    .then(data => {
        if (data.success && data.customerData) {
            localStorage.setItem('phoneNumber', data.customerData.phoneNumber);
            localStorage.setItem('loginSource', data.customerData.loginSource);
        }
    })
    .catch(err => {
        console.error('Error fetching customer data:', err);
    });
}

function isLineBrowser() {
    return /Line/i.test(navigator.userAgent);
}

function toggleLoginOptions() {
    const googleSignIn = document.querySelector('.g_id_signin');
    const facebookLoginButton = document.getElementById('facebook-login-button');
    const lineLoginButton = document.getElementById('line-login-button');
    const guestLoginButton = document.getElementById('guest-login-button');
    const lineBrowserNotification = document.getElementById('line-browser-notification');

    if (isLineBrowser()) {
        if (googleSignIn) googleSignIn.style.display = 'none';
        if (facebookLoginButton) facebookLoginButton.style.display = 'none';
        if (lineLoginButton) lineLoginButton.style.display = 'inline-block';
        if (guestLoginButton) guestLoginButton.style.display = 'inline-block';
        if (lineBrowserNotification) lineBrowserNotification.classList.remove('hidden');
    } else {
        if (googleSignIn) googleSignIn.style.display = 'inline-block';
        if (facebookLoginButton) facebookLoginButton.style.display = 'inline-block';
        if (lineLoginButton) lineLoginButton.style.display = 'inline-block';
        if (guestLoginButton) guestLoginButton.style.display = 'inline-block';
        if (lineBrowserNotification) lineBrowserNotification.classList.add('hidden');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    getVisitorId(); // Ensure visitorId is set
    logPageVisit();
    resetInactivityTimer();
    toggleLoginOptions();
    initializeAppOnLoad();

    const toggleButton = document.querySelector('[data-bs-toggle="collapse"][data-bs-target="#bay-rates-mobile"]');
    const bayRatesMobile = document.getElementById('bay-rates-mobile');

    if (toggleButton && bayRatesMobile) {
        bayRatesMobile.addEventListener('show.bs.collapse', () => {
            toggleButton.textContent = 'Hide Rates';
        });
        bayRatesMobile.addEventListener('hide.bs.collapse', () => {
            toggleButton.textContent = 'Show Rates';
        });
    } else {
        console.error('Toggle button or collapse target not found.');
    }
});

function onLoginSuccess() {
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('additional-info-section').classList.add('hidden');
    document.getElementById('booking-section').classList.remove('hidden');
    document.getElementById('logout-button').style.display = 'block';
    logLoginEvent();
    initializeBooking();
}

function logoutUser() {
    alert('You have been logged out.');
    localStorage.clear();
    document.getElementById('booking-section').classList.add('hidden');
    document.getElementById('confirmation-section').classList.add('hidden');
    document.getElementById('login-section').classList.remove('hidden');
    document.getElementById('logout-button').style.display = 'none';
}

// Function to initialize the app on page load
async function initializeAppOnLoad() {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');

    if (tokenFromUrl) {
        localStorage.setItem('token', tokenFromUrl);
        window.history.replaceState({}, document.title, window.location.pathname);
        const decodedToken = jwt_decode(tokenFromUrl);
        const { userId, email, name, loginSource } = decodedToken;
        localStorage.setItem('userId', userId);
        localStorage.setItem('email', email);
        localStorage.setItem('name', name);
        localStorage.setItem('loginMethod', loginSource);
        await fetchCustomerData();
        onLoginSuccess();
    } else {
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('userId');

        if (token && userId) {
            const isValid = await verifyToken(token);
            if (isValid) {
                console.log('Token is valid. Restoring session...');
                onLoginSuccess();
            } else {
                console.log('Token is invalid or expired. Logging out...');
                logoutUser();
            }
        } else {
            console.log('No token found. Showing login screen.');
            document.getElementById('login-section').classList.remove('hidden');
            document.getElementById('booking-section').classList.add('hidden');
            document.getElementById('confirmation-section').classList.add('hidden');
        }
    }
}

// Function to verify JWT token with the backend
async function verifyToken(token) {
    try {
        const response = await fetch('/api/auth/verify-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            console.error('Token verification failed:', response.status, response.statusText);
            return false;
        }

        const data = await response.json();
        return data.valid;
    } catch (error) {
        console.error('Error verifying token:', error);
        return false;
    }
}

function saveFormData() {
    const phoneNumber = document.getElementById('phone-number').value.trim();
    const emailAddress = document.getElementById('email-address').value.trim();
    const duration = document.getElementById('duration-select').value;
    const numberOfPeople = document.getElementById('number-of-people').value;

    localStorage.setItem('phoneNumber', phoneNumber);
    localStorage.setItem('email', emailAddress); // Save updated email
    localStorage.setItem('duration', duration);
    localStorage.setItem('numberOfPeople', numberOfPeople);
}

function loadFormData() {
    const phoneNumber = localStorage.getItem('phoneNumber') || '';
    const emailAddress = localStorage.getItem('email') || '';
    const duration = localStorage.getItem('duration') || '';
    const numberOfPeople = localStorage.getItem('numberOfPeople') || '';

    document.getElementById('phone-number').value = phoneNumber;
    document.getElementById('email-address').value = emailAddress;
    document.getElementById('duration-select').value = duration;
    document.getElementById('number-of-people').value = numberOfPeople;

    if (numberOfPeople) {
        document.querySelectorAll('.num-people-button').forEach(button => {
            button.classList.toggle('active', button.getAttribute('data-value') === numberOfPeople);
        });
    }
}

// Function to set a cookie
function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date(Date.now() + days * 864e5); // 864e5 = 86400000 ms in a day
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + encodeURIComponent(value) + expires + "; path=/";
}

// Function to get a cookie
function getCookie(name) {
    const cookies = document.cookie.split(';').map(c => c.trim());
    for (let cookie of cookies) {
        if (cookie.startsWith(name + '=')) {
            return decodeURIComponent(cookie.substring(name.length + 1));
        }
    }
    return null;
}

// Function to get or create a unique visitor ID
function getVisitorId() {
    let visitorId = getCookie('visitorId');
    if (!visitorId) {
        visitorId = uuidv4(); // Generate a new UUID
        setCookie('visitorId', visitorId, 365); // Expires in 1 year
    }
    return visitorId;
}

function logPageVisit() {
    const visitorId = getVisitorId();
    fetch('/api/events/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId }),
    })
    .catch(err => {
        console.error('Error logging page visit:', err);
    });
}

function logLoginEvent() {
    const userId = localStorage.getItem('userId');
    const visitorId = getVisitorId();
    fetch('/api/events/login', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ userId, visitorId }),
    })
    .catch(err => {
        console.error('Error logging login event:', err);
    });
}
