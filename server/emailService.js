const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Email configuration using transaction coordinator Gmail
const EMAIL_CONFIG = {
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'transaction.coordinator.agent@gmail.com',
    pass: 'xmvi xvso zblo oewe' // App password from Fathom project
  }
};

// Create transporter
const transporter = nodemailer.createTransport(EMAIL_CONFIG);

/**
 * Generate a secure random token for password setup
 * @returns {string} - Random token
 */
function generateSetupToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Send user invitation email with setup link
 * @param {object} user - User object with email, name, username
 * @param {string} setupToken - Token for password setup
 * @param {string} baseUrl - Base URL of the application
 * @returns {Promise<boolean>} - Success status
 */
async function sendUserInvitation(user, setupToken, baseUrl = 'https://ootb-property-dashboard.onrender.com') {
  try {
    const setupUrl = `${baseUrl}/setup-password?token=${setupToken}&username=${user.username}`;
    
    const mailOptions = {
      from: {
        name: 'Out Of The Box Properties',
        address: EMAIL_CONFIG.auth.user
      },
      to: user.email,
      subject: 'Welcome to OOTB Property Dashboard - Setup Your Account',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to OOTB Property Dashboard</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; padding: 30px 0; border-bottom: 3px solid #2563eb; }
            .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
            .content { padding: 30px 0; }
            .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 20px 0; }
            .button:hover { background-color: #1d4ed8; }
            .credentials { background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb; }
            .footer { text-align: center; padding: 20px 0; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
            .warning { background-color: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🏢 Out Of The Box Properties</div>
              <p style="margin: 10px 0 0 0; color: #6b7280;">Property Management Dashboard</p>
            </div>
            
            <div class="content">
              <h1 style="color: #1f2937;">Welcome to the Team, ${user.name}!</h1>
              
              <p>You've been invited to join the Out Of The Box Properties dashboard. To get started, you'll need to set up your password and activate your account.</p>
              
              <div class="credentials">
                <h3 style="margin: 0 0 15px 0; color: #374151;">Account Details:</h3>
                <p><strong>Username:</strong> ${user.username}</p>
                <p><strong>Email:</strong> ${user.email}</p>
                <p><strong>Role:</strong> ${user.role}</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${setupUrl}" class="button">Set Up Your Password</a>
              </div>
              
              <div class="warning">
                <p><strong>⚠️ Security Note:</strong> This setup link will expire in 24 hours for security purposes. If you don't complete setup within this time, please contact your administrator to resend the invitation.</p>
              </div>
              
              <h3>What You Can Do:</h3>
              <ul>
                <li>📊 View and manage property listings</li>
                <li>📋 Track tasks and deadlines</li>
                <li>🗂️ Access transaction coordination tools</li>
                <li>📈 Monitor portfolio performance</li>
                ${user.role === 'Admin' ? '<li>👥 Manage team members and permissions</li>' : ''}
              </ul>
              
              <p>If you have any questions or need assistance, please contact your administrator.</p>
            </div>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} Out Of The Box Properties</p>
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Welcome to Out Of The Box Properties!

You've been invited to join the property management dashboard.

Account Details:
- Username: ${user.username}
- Email: ${user.email}
- Role: ${user.role}

To set up your password and activate your account, visit:
${setupUrl}

This link will expire in 24 hours for security purposes.

If you have any questions, please contact your administrator.

© ${new Date().getFullYear()} Out Of The Box Properties
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Invitation email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('❌ Failed to send invitation email:', error);
    return false;
  }
}

/**
 * Send password reset email
 * @param {object} user - User object with email, name, username
 * @param {string} resetToken - Token for password reset
 * @param {string} baseUrl - Base URL of the application
 * @returns {Promise<boolean>} - Success status
 */
async function sendPasswordReset(user, resetToken, baseUrl = 'https://ootb-property-dashboard.onrender.com') {
  try {
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}&username=${user.username}`;
    
    const mailOptions = {
      from: {
        name: 'Out Of The Box Properties',
        address: EMAIL_CONFIG.auth.user
      },
      to: user.email,
      subject: 'Password Reset Request - OOTB Property Dashboard',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset Request</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; padding: 30px 0; border-bottom: 3px solid #dc2626; }
            .logo { font-size: 24px; font-weight: bold; color: #dc2626; }
            .content { padding: 30px 0; }
            .button { display: inline-block; background-color: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 20px 0; }
            .button:hover { background-color: #b91c1c; }
            .warning { background-color: #fef2f2; padding: 15px; border-radius: 6px; border-left: 4px solid #dc2626; margin: 20px 0; }
            .footer { text-align: center; padding: 20px 0; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🔒 Password Reset Request</div>
              <p style="margin: 10px 0 0 0; color: #6b7280;">Out Of The Box Properties</p>
            </div>
            
            <div class="content">
              <h1 style="color: #1f2937;">Password Reset Request</h1>
              
              <p>Hello ${user.name},</p>
              
              <p>We received a request to reset your password for your OOTB Property Dashboard account.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" class="button">Reset Your Password</a>
              </div>
              
              <div class="warning">
                <p><strong>⚠️ Security Information:</strong></p>
                <ul>
                  <li>This reset link will expire in 1 hour for security purposes</li>
                  <li>If you didn't request this reset, please ignore this email</li>
                  <li>Your password will remain unchanged until you click the link above</li>
                </ul>
              </div>
              
              <p>If you continue to have problems, please contact your administrator.</p>
            </div>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} Out Of The Box Properties</p>
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Password Reset Request

Hello ${user.name},

We received a request to reset your password for your OOTB Property Dashboard account.

To reset your password, visit: ${resetUrl}

This link will expire in 1 hour for security purposes.

If you didn't request this reset, please ignore this email.

© ${new Date().getFullYear()} Out Of The Box Properties
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error);
    return false;
  }
}

/**
 * Test email configuration
 * @returns {Promise<boolean>} - Success status
 */
async function testEmailConfig() {
  try {
    await transporter.verify();
    console.log('✅ Email configuration is valid');
    return true;
  } catch (error) {
    console.error('❌ Email configuration test failed:', error);
    return false;
  }
}

module.exports = {
  sendUserInvitation,
  sendPasswordReset,
  generateSetupToken,
  testEmailConfig
};