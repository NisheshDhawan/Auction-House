import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables - try current directory first, then parent
const envPaths = [
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), '..', '.env')
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log(`📄 Loaded environment variables from: ${envPath}`);
    break;
  }
}

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  debug: process.env.DEBUG_SMTP === 'true', // Enable debug logging
  logger: process.env.DEBUG_SMTP === 'true' // Enable logger
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP configuration error:', error);
    console.log('🔧 SMTP Configuration Help:');
    console.log('- Check your SMTP credentials in .env file');
    console.log('- For Gmail: Use App Password, not regular password');
    console.log('- For Outlook: Enable "Less secure app access"');
    console.log('- Run: node setup-smtp.js for guided setup');
  } else {
    console.log('✅ SMTP server is ready to send emails');
    console.log('📧 Email service:', process.env.SMTP_HOST);
    console.log('👤 From:', process.env.SMTP_FROM_EMAIL);
  }
});

// Send OTP email
export const sendOTPEmail = async (email, otp, fullName) => {
  try {
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'Auction House'}" <${process.env.SMTP_FROM_EMAIL}>`,
      to: email,
      subject: 'Verify Your Email - Auction House',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">🔨 Auction House</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Hello ${fullName}!</h2>
                      <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                        Thank you for signing up with Auction House. To complete your registration, please verify your email address using the code below:
                      </p>
                      
                      <!-- OTP Box -->
                      <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                        <tr>
                          <td align="center" style="padding: 20px; background-color: #f8f9fa; border-radius: 8px; border: 2px dashed #667eea;">
                            <div style="font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                              ${otp}
                            </div>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 20px 0; color: #666666; font-size: 14px; line-height: 1.5;">
                        This code will expire in <strong>10 minutes</strong>. If you didn't request this code, please ignore this email.
                      </p>
                      
                      <div style="margin: 30px 0; padding: 20px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                        <p style="margin: 0; color: #856404; font-size: 14px;">
                          <strong>Security Tip:</strong> Never share this code with anyone. Auction House will never ask for your verification code.
                        </p>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center;">
                      <p style="margin: 0 0 10px 0; color: #999999; font-size: 12px;">
                        © 2025 Auction House. All rights reserved.
                      </p>
                      <p style="margin: 0; color: #999999; font-size: 12px;">
                        This is an automated email, please do not reply.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `Hello ${fullName}!\n\nThank you for signing up with Auction House. Your verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please ignore this email.\n\n© 2025 Auction House. All rights reserved.`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
};

// Send category request status email
export const sendCategoryRequestStatusEmail = async (email, fullName, categoryName, status, reviewNotes) => {
  try {
    const isApproved = status === 'approved';
    const statusText = isApproved ? 'Approved' : 'Rejected';
    const statusColor = isApproved ? '#10b981' : '#ef4444';
    const statusIcon = isApproved ? '✅' : '❌';

    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'Auction House'}" <${process.env.SMTP_FROM_EMAIL}>`,
      to: email,
      subject: `Category Request ${statusText} - ${categoryName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Category Request ${statusText}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">🔨 Auction House</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <div style="text-align: center; margin-bottom: 30px;">
                        <div style="font-size: 48px; margin-bottom: 10px;">${statusIcon}</div>
                        <h2 style="margin: 0; color: ${statusColor}; font-size: 24px;">Category Request ${statusText}</h2>
                      </div>
                      
                      <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px;">Hello ${fullName},</p>
                      
                      <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                        Your request for the category "<strong>${categoryName}</strong>" has been <strong style="color: ${statusColor};">${status}</strong>.
                      </p>
                      
                      ${reviewNotes ? `
                        <div style="margin: 20px 0; padding: 20px; background-color: #f8f9fa; border-left: 4px solid ${statusColor}; border-radius: 4px;">
                          <h3 style="margin: 0 0 10px 0; color: #333333; font-size: 16px;">Admin Notes:</h3>
                          <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.5;">
                            ${reviewNotes}
                          </p>
                        </div>
                      ` : ''}
                      
                      ${isApproved ? `
                        <p style="margin: 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                          The category is now available for use in the auction house. You can start creating listings under this category.
                        </p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                          <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}" style="display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">
                            Visit Auction House
                          </a>
                        </div>
                      ` : `
                        <p style="margin: 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                          You can submit a new category request with different details if needed.
                        </p>
                      `}
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center;">
                      <p style="margin: 0 0 10px 0; color: #999999; font-size: 12px;">
                        © 2025 Auction House. All rights reserved.
                      </p>
                      <p style="margin: 0; color: #999999; font-size: 12px;">
                        This is an automated email, please do not reply.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `Hello ${fullName}!\n\nYour request for the category "${categoryName}" has been ${status}.\n\n${reviewNotes ? `Admin Notes: ${reviewNotes}\n\n` : ''}${isApproved ? 'The category is now available for use in the auction house.' : 'You can submit a new category request with different details if needed.'}\n\n© 2025 Auction House. All rights reserved.`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Category status email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Error sending category status email:', error);
    throw error;
  }
};

// Send auction winner notification email
export const sendAuctionWinnerEmail = async (email, fullName, productName, winningBid, listingId, productImage) => {
  try {
    const mailOptions = {
      from: `"Auction House Winner Notification" <${process.env.SMTP_FROM_EMAIL}>`,
      to: email,
      subject: `🎉 Congratulations! You Won the Auction for ${productName}`,
      // Add headers to improve deliverability
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
        'X-Mailer': 'Auction House System',
        'Reply-To': process.env.SMTP_FROM_EMAIL
      },
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Auction Winner - ${productName}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px 8px 0 0;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">🎉 Congratulations!</h1>
                      <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px; opacity: 0.9;">You Won the Auction!</p>
                    </td>
                  </tr>
                  
                  <!-- Winner Badge -->
                  <tr>
                    <td style="padding: 30px 40px 20px 40px; text-align: center;">
                      <div style="display: inline-block; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: #ffffff; padding: 15px 30px; border-radius: 50px; font-size: 18px; font-weight: bold; margin-bottom: 20px;">
                        🏆 AUCTION WINNER 🏆
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 0 40px 30px 40px;">
                      <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px; text-align: center;">Hello ${fullName}!</h2>
                      
                      <p style="margin: 0 0 30px 0; color: #666666; font-size: 16px; line-height: 1.6; text-align: center;">
                        Fantastic news! You have successfully won the auction for <strong style="color: #10b981;">${productName}</strong>. 
                        The product is now reserved for you!
                      </p>
                      
                      <!-- Product Details Card -->
                      <div style="background-color: #f8f9fa; border-radius: 12px; padding: 25px; margin: 30px 0; border-left: 4px solid #10b981;">
                        ${productImage ? `
                          <div style="text-align: center; margin-bottom: 20px;">
                            <img src="${productImage}" alt="${productName}" style="max-width: 200px; max-height: 200px; border-radius: 8px; object-fit: cover;">
                          </div>
                        ` : ''}
                        
                        <h3 style="margin: 0 0 15px 0; color: #333333; font-size: 20px; text-align: center;">${productName}</h3>
                        
                        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                          <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                              <strong style="color: #374151;">Your Winning Bid:</strong>
                            </td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                              <span style="font-size: 24px; font-weight: bold; color: #10b981;">₹${winningBid.toLocaleString('en-IN')}</span>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                              <strong style="color: #374151;">Listing ID:</strong>
                            </td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                              <span style="color: #6b7280; font-family: monospace;">${listingId}</span>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 10px 0;">
                              <strong style="color: #374151;">Status:</strong>
                            </td>
                            <td style="padding: 10px 0; text-align: right;">
                              <span style="background-color: #10b981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">AUCTION WON</span>
                            </td>
                          </tr>
                        </table>
                      </div>
                      
                      <!-- Next Steps -->
                      <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 12px; padding: 25px; margin: 30px 0; color: white;">
                        <h3 style="margin: 0 0 15px 0; font-size: 18px; text-align: center;">🚀 Next Steps to Claim Your Product</h3>
                        
                        <div style="margin: 20px 0;">
                          <div style="display: flex; align-items: center; margin-bottom: 15px;">
                            <div style="background-color: rgba(255,255,255,0.2); border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold;">1</div>
                            <span>Visit your "My Products" page to see your won auctions</span>
                          </div>
                          <div style="display: flex; align-items: center; margin-bottom: 15px;">
                            <div style="background-color: rgba(255,255,255,0.2); border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold;">2</div>
                            <span>Complete the payment to claim ownership</span>
                          </div>
                          <div style="display: flex; align-items: center;">
                            <div style="background-color: rgba(255,255,255,0.2); border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold;">3</div>
                            <span>The product will be transferred to your account</span>
                          </div>
                        </div>
                      </div>
                      
                      <!-- Action Button -->
                      <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.CLIENT_URL || 'http://localhost:8080'}/my-products" 
                           style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
                          🎯 Make Payment & Claim Product
                        </a>
                      </div>
                      
                      <!-- Important Notice -->
                      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 4px; margin: 30px 0;">
                        <h4 style="margin: 0 0 10px 0; color: #92400e; font-size: 16px;">⏰ Important Notice</h4>
                        <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                          Please complete your payment within <strong>7 days</strong> to claim ownership of this product. 
                          After payment, the product will be automatically transferred to your account and you can resell it if desired.
                        </p>
                      </div>
                      
                      <!-- Email Delivery Notice -->
                      <div style="background-color: #e0f2fe; border-left: 4px solid #0288d1; padding: 20px; border-radius: 4px; margin: 30px 0;">
                        <h4 style="margin: 0 0 10px 0; color: #01579b; font-size: 16px;">📧 Email Delivery Notice</h4>
                        <p style="margin: 0; color: #01579b; font-size: 14px; line-height: 1.5;">
                          If this email went to your spam folder, please mark it as "Not Spam" and add 
                          <strong>${process.env.SMTP_FROM_EMAIL}</strong> to your contacts to ensure you receive future notifications.
                        </p>
                      </div>
                      
                      <!-- Congratulations Message -->
                      <div style="text-align: center; margin: 30px 0;">
                        <p style="margin: 0; color: #666666; font-size: 16px; line-height: 1.6;">
                          🎊 Congratulations on your successful bid! We're excited to see you claim your new product. 
                          Thank you for being part of the Auction House community!
                        </p>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center;">
                      <p style="margin: 0 0 10px 0; color: #999999; font-size: 12px;">
                        © 2025 Auction House. All rights reserved.
                      </p>
                      <p style="margin: 0; color: #999999; font-size: 12px;">
                        Questions? Contact us at ${process.env.SMTP_FROM_EMAIL}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `
🎉 Congratulations ${fullName}!

You have won the auction for: ${productName}
Your winning bid: ₹${winningBid.toLocaleString('en-IN')}
Listing ID: ${listingId}

Next Steps:
1. Visit your "My Products" page
2. Complete the payment to claim ownership  
3. The product will be transferred to your account

Visit: ${process.env.CLIENT_URL || 'http://localhost:8080'}/my-products

Please complete your payment within 7 days to claim ownership.

IMPORTANT: If this email went to your spam folder, please mark it as "Not Spam" 
and add ${process.env.SMTP_FROM_EMAIL} to your contacts.

Thank you for being part of Auction House!
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Auction winner email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Error sending auction winner email:', error);
    throw error;
  }
};
export const sendWelcomeEmail = async (email, fullName) => {
  try {
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'Auction House'}" <${process.env.SMTP_FROM_EMAIL}>`,
      to: email,
      subject: 'Welcome to Auction House!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to Auction House</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px;">
                  <tr>
                    <td style="padding: 40px; text-align: center;">
                      <h1 style="color: #667eea; font-size: 32px;">🎉 Welcome to Auction House!</h1>
                      <p style="color: #666666; font-size: 16px; line-height: 1.6;">
                        Hi ${fullName},<br><br>
                        Your account has been successfully verified! You're now part of the Auction House community.
                      </p>
                      <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}" style="display: inline-block; margin: 20px 0; padding: 15px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">
                        Start Exploring
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    throw error;
  }
};
