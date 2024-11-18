// utils/emailTemplates.js

function bookingConfirmationTemplate(bookingDetails) {
    const {
        userName,
        date,
        startTime,
        endTime,
        duration,
        numberOfPeople,
    } = bookingDetails;

    return `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; padding: 20px; background-color: #ffffff;">
        <!-- Logo Section -->
        <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://www.len.golf/wp-content/uploads/2024/06/Logo.png" alt="LENGOLF Logo" style="max-width: 200px;">
        </div>

        <!-- Header -->
        <h2 style="color: #1a3308; text-align: center; margin-bottom: 20px;">Booking Confirmed!</h2>

        <!-- Greeting -->
        <p style="font-size: 16px; line-height: 1.5; color: #1a3308; margin-bottom: 20px;">
            Dear <strong>${userName}</strong>,
        </p>
        <p style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
            Thank you for your booking. Here are your booking details:
        </p>

        <!-- Booking Details Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 15px;">
            <tr>
                <th style="text-align: left; padding: 10px; background-color: #f9f9f9; border-bottom: 1px solid #ddd;">Date</th>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${date}</td>
            </tr>
            <tr>
                <th style="text-align: left; padding: 10px; background-color: #f9f9f9; border-bottom: 1px solid #ddd;">Start Time</th>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${startTime}</td>
            </tr>
            <tr>
                <th style="text-align: left; padding: 10px; background-color: #f9f9f9; border-bottom: 1px solid #ddd;">End Time</th>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${endTime}</td>
            </tr>
            <tr>
                <th style="text-align: left; padding: 10px; background-color: #f9f9f9; border-bottom: 1px solid #ddd;">Duration</th>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${duration} hour(s)</td>
            </tr>
            <tr>
                <th style="text-align: left; padding: 10px; background-color: #f9f9f9; border-bottom: 1px solid #ddd;">Number of People</th>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${numberOfPeople}</td>
            </tr>
        </table>

        <!-- Closing Message -->
        <p style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
            We look forward to seeing you! If you have any questions, feel free to reach out to us.
        </p>

        <!-- Booking Modification Disclaimer -->
        <p style="font-size: 14px; line-height: 1.5; color: #777; margin-bottom: 20px;">
            <em>If you need to modify your booking, please email us at <a href="mailto:info@len.golf" style="color: #8dc743; text-decoration: none;">info@len.golf</a> or contact us via Phone / LINE.</em>
        </p>

        <!-- Footer -->
        <div style="font-size: 14px; color: #777; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="margin: 5px 0; text-align: center;">
                <strong>Phone Number:</strong> <a href="tel:+66966682335" style="color: #8dc743; text-decoration: none;">+66 96 668 2335</a>
            </p>
            <p style="margin: 5px 0; text-align: center;">
                <strong>LINE:</strong> <a href="https://lin.ee/UwwOr84" style="color: #8dc743; text-decoration: none;">@lengolf</a>
            </p>
            <p style="margin: 5px 0; text-align: center;">
                <strong>Maps Link:</strong> <a href="https://maps.app.goo.gl/U6rgZyjCwC46dABy6" style="color: #8dc743; text-decoration: none;">How to find us</a>
            </p>
            <p style="margin: 5px 0; text-align: center;">
                <strong>Address:</strong> 4th Floor, Mercury Ville at BTS Chidlom
            </p>
            <div style="text-align: center; margin-top: 20px;">
                <a href="https://len.golf" style="text-decoration: none; color: white; background-color: #1a3308; padding: 8px 15px; border-radius: 5px; font-size: 14px;">
                    Visit Our Website
                </a>
            </div>
            <p style="font-size: 12px; margin-top: 15px; color: #777; text-align: center;">
                &copy; 2024 LENGOLF. All rights reserved.
            </p>
        </div>
    </div>
    `;
}

module.exports = {
    bookingConfirmationTemplate,
};
