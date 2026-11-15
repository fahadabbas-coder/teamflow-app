const nodemailer = require("nodemailer");
const { google } = require("googleapis");

// OAuth2 configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  "https://google.com" // Optional but recommended
);

oauth2Client.setCredentials({
  refresh_token: process.env.REFRESH_TOKEN,
});

// Gmail API client
const gmail = google.gmail({
  version: "v1",
  auth: oauth2Client,
});

// Nodemailer MIME generator
const transporter = nodemailer.createTransport({
  streamTransport: true,
  buffer: true,
  newline: "windows", // Standard CRLF for emails
});

// Send email using Gmail API
const sendEmail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"Real-Time Collaboration" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });

    // Convert MIME message to Base64URL 
    const raw = info.message.toString("base64url");

    // Send through Gmail API over HTTPS
    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });

    console.log("Email sent successfully:", response.data.id);
    return {
      messageId: response.data.id,
      threadId: response.data.threadId,
    };
  } catch (error) {
    console.error("Gmail API email sending failed:", {
      message: error.message,
      code: error.code,
      status: error.response?.status,
    });

    // Propagate error to BullMQ for retries
    throw error;
  }
};

module.exports = sendEmail;