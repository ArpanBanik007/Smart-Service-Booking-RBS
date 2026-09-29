import nodemailer from "nodemailer";

export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendOTPEmail = async (email, otp) => {
  console.log(`[AUTH] Generating OTP for ${email}: ${otp}`);

  // Create transporter using Brevo SMTP credentials configured in .env
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST && process.env.SMTP_HOST !== "smtp.gmail.com"
      ? process.env.SMTP_HOST
      : "smtp-relay.brevo.com",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: false, // TLS
    auth: {
      user: process.env.BREVO_SMTP_USER,
      pass: process.env.BREVO_SMTP_PASS,
    },
  });

  const mailOptions = {
    from: `"${process.env.APP_NAME || "Near It... Support"}" <${process.env.BREVO_SENDER_EMAIL || "support@pashe.in"}>`,
    to: email,
    subject: "Near It... Email Verification Code",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
                  max-width: 520px; margin: 40px auto; background-color: #ffffff; 
                  border-radius: 16px; overflow: hidden; 
                  box-shadow: 0 4px 24px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
        
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); 
                    padding: 32px 40px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 800; 
                     color: #ffffff; letter-spacing: -0.5px;">Near It...</h1>
          <p style="margin: 6px 0 0; color: #c7d2fe; font-size: 13px;">Service, by your side</p>
        </div>

        <div style="padding: 40px 40px 32px;">
          <h2 style="margin: 0 0 12px; font-size: 20px; color: #0f172a; font-weight: 700;">
            Verify your email address
          </h2>
          <p style="margin: 0 0 28px; font-size: 15px; color: #475569; line-height: 1.6;">
            Hi there! Use the verification code below to complete your registration.
            This code expires in <strong>3 minutes</strong>.
          </p>

          <div style="background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
                      border: 2px dashed #818cf8; border-radius: 12px; 
                      padding: 24px; text-align: center; margin-bottom: 28px;">
            <p style="margin: 0 0 8px; font-size: 12px; color: #4338ca; 
                      text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">
              Your OTP Code
            </p>
            <span style="font-size: 42px; font-weight: 800; letter-spacing: 10px; 
                         color: #312e81; font-family: 'Courier New', monospace;">
              ${otp}
            </span>
          </div>

          <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; 
                      border-radius: 6px; padding: 14px 16px; margin-bottom: 28px;">
            <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.5;">
              ⚠️ <strong>Never share this code</strong> with anyone. Near It... will never ask for your OTP via phone or chat.
            </p>
          </div>

          <p style="margin: 0; font-size: 14px; color: #64748b; line-height: 1.6;">
            Didn't request this? You can safely ignore this email.
          </p>
        </div>

        <div style="background-color: #f8fafc; padding: 20px 40px; 
                    border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #94a3b8;">
            © ${new Date().getFullYear()} Near It... Platform · All rights reserved
          </p>
        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ OTP Email sent successfully:", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ SMTP send error:", error.message);
    // If SMTP fails, in development allow continuation if required, or rethrow
    throw error;
  }
};