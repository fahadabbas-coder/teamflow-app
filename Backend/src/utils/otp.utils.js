const crypto = require('crypto')

function generateOtp() {
    return crypto.randomInt(100000, 999999).toString()
}

function getOtpHtml(otp) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>OTP Verification</title>

        <style>
            body {
                margin: 0;
                padding: 0;
                background-color: #f4f6f8;
                font-family: Arial, Helvetica, sans-serif;
            }

            .container {
                width: 100%;
                padding: 40px 0;
            }

            .card {
                width: 90%;
                max-width: 500px;
                margin: auto;
                background-color: #ffffff;
                border-radius: 12px;
                padding: 35px;
                box-sizing: border-box;
                text-align: center;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
            }

            .logo {
                font-size: 28px;
                font-weight: bold;
                color: #2563eb;
                margin-bottom: 20px;
            }

            h1 {
                margin: 0 0 15px;
                color: #222222;
                font-size: 26px;
            }

            p {
                color: #666666;
                font-size: 15px;
                line-height: 1.6;
                margin: 10px 0;
            }

            .otp {
                display: inline-block;
                margin: 25px 0;
                padding: 15px 30px;
                background-color: #f1f5f9;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                color: #111827;
                font-size: 32px;
                font-weight: bold;
                letter-spacing: 8px;
            }

            .warning {
                font-size: 13px;
                color: #999999;
                margin-top: 20px;
            }

            .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eeeeee;
                color: #999999;
                font-size: 12px;
            }
        </style>
    </head>

    <body>
        <div class="container">
            <div class="card">

                <div class="logo">
                    TeamFlow
                </div>

                <h1>Verify Your Email</h1>

                <p>
                    Use the following OTP to verify your email address.
                </p>

                <div class="otp">
                    ${otp}
                </div>

                <p>
                    This OTP is valid for <strong>5 minutes</strong>.
                </p>

                <p class="warning">
                    If you did not request this OTP, you can safely ignore this email.
                </p>

                <div class="footer">
                    © ${new Date().getFullYear()} TeamFlow. All rights reserved.
                </div>

            </div>
        </div>
    </body>
    </html>
    `;
}

function getResPasswordOtpHtml(otp) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset OTP</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #f4f6f9;
                margin: 0;
                padding: 0;
                -webkit-font-smoothing: antialiased;
            }
            .email-container {
                max-width: 500px;
                margin: 40px auto;
                background-color: #ffffff;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
                overflow: hidden;
                border: 1px solid #eef2f5;
            }
            .email-header {
                background: linear-gradient(135deg, #4f46e5, #3730a3);
                color: #ffffff;
                text-align: center;
                padding: 30px 20px;
            }
            .email-header h1 {
                margin: 0;
                font-size: 24px;
                font-weight: 600;
                letter-spacing: 0.5px;
            }
            .email-body {
                padding: 40px 30px;
                color: #334155;
                line-height: 1.6;
            }
            .email-body p {
                margin: 0 0 20px 0;
                font-size: 16px;
            }
            .otp-container {
                background-color: #f8fafc;
                border: 2px dashed #cbd5e1;
                border-radius: 8px;
                text-align: center;
                padding: 20px;
                margin: 30px 0;
            }
            .otp-code {
                font-size: 32px;
                font-weight: 700;
                letter-spacing: 6px;
                color: #1e1b4b;
                margin: 0;
            }
            .expiry-text {
                font-size: 14px;
                color: #64748b;
                text-align: center;
                margin-top: 5px;
            }
            .email-footer {
                background-color: #f8fafc;
                padding: 20px;
                text-align: center;
                font-size: 13px;
                color: #94a3b8;
                border-top: 1px solid #e2e8f0;
            }
            .warning-text {
                font-size: 13px;
                color: #94a3b8;
                border-top: 1px solid #f1f5f9;
                padding-top: 20px;
                margin-top: 20px;
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <!-- Header -->
            <div class="email-header">
                <h1>Password Reset Request</h1>
            </div>
            
            <!-- Body -->
            <div class="email-body">
                <p>Hello,</p>
                <p>We received a request to reset the password for your account. Use the 6 digit verification code below to proceed:</p>
                
                <!-- OTP Box -->
                <div class="otp-container">
                    <div class="otp-code">${otp}</div>
                    <div class="expiry-text">This code is valid for 5 minutes</div>
                </div>
                
                <p>If you did not request this, you can safely ignore this email. Your password will remain unchanged.</p>
                
                <div class="warning-text">
                    <strong>Security Tip:</strong> Never share this OTP with anyone, including our support team.
                </div>
            </div>
            
            <!-- Footer -->
            <div class="email-footer">
                &copy; ${new Date().getFullYear()} TeamFlow. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    `;
}

function getPasswordChangedHtml() {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Changed Successfully</title>
        <style>
            body {
                margin: 0;
                padding: 0;
                background-color: #f4f6f8;
                font-family: Arial, Helvetica, sans-serif;
            }
            .container {
                width: 100%;
                padding: 40px 0;
            }
            .card {
                width: 90%;
                max-width: 500px;
                margin: auto;
                background-color: #ffffff;
                border-radius: 12px;
                padding: 35px;
                box-sizing: border-box;
                text-align: center;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
            }
            .logo {
                font-size: 28px;
                font-weight: bold;
                color: #2563eb;
                margin-bottom: 25px;
            }
            .success-icon {
                display: inline-block;
                width: 64px;
                height: 64px;
                line-height: 64px;
                background-color: #f0fdf4;
                border: 2px solid #bbf7d0;
                color: #16a34a;
                font-size: 32px;
                border-radius: 50%;
                margin-bottom: 20px;
            }
            h1 {
                margin: 0 0 15px;
                color: #111827;
                font-size: 24px;
                font-weight: bold;
            }
            p {
                color: #4b5563;
                font-size: 15px;
                line-height: 1.6;
                margin: 10px 0;
            }
            .security-box {
                background-color: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 15px;
                margin: 25px 0;
                text-align: left;
            }
            .security-title {
                font-size: 14px;
                font-weight: bold;
                color: #1e293b;
                margin-bottom: 5px;
            }
            .security-desc {
                font-size: 13px;
                color: #64748b;
                margin: 0;
            }
            .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eeeeee;
                color: #999999;
                font-size: 12px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="card">
                <div class="logo">TeamFlow</div>
                <div class="success-icon">✓</div>
                <h1>Password Changed</h1>
                <p>Your password has been changed successfully. You can now use your new password to log into your account.</p>
                
                <!-- Time Section with PKT Note -->
                <p style="margin-top: 20px; margin-bottom: 20px;">
                    <strong>Time:</strong> ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short' })}
                    <br>
                    <span style="font-size: 12px; color: #94a3b8;">(Note: This time is based on Pakistan Standard Time - PKT)</span>
                </p>

                <div class="security-box">
                    <div class="security-title">Didn't make this change?</div>
                    <p class="security-desc">If you did not request a password change, please contact our support team immediately to secure your account.</p>
                </div>
                <div class="footer">© ${new Date().getFullYear()} TeamFlow. All rights reserved.</div>
            </div>
        </div>
    </body>
    </html>
    `;
}

module.exports = { generateOtp, getOtpHtml, getResPasswordOtpHtml, getPasswordChangedHtml }