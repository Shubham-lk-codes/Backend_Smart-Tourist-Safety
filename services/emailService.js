const nodemailer = require("nodemailer");
const { MailtrapTransport } = require("mailtrap");

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport(
      MailtrapTransport({
        token: "6f9a429f801e3b6d00c949af8d7695b5",
      })
    );
  }

  async sendWelcomeEmail(userData) {
    const mailOptions = {
      from: {
        address: "noreply@smarttouristsafety.com",
        name: "Smart Tourist Safety",
      },
      to: userData.email,
      subject: `Welcome to Smart Tourist Safety, ${userData.name}!`,
      html: `...`, // Your HTML template
      category: "User Registration"
    };

    return await this.transporter.sendMail(mailOptions);
  }

  async sendOTPEmail(email, otp, name) {
    const mailOptions = {
      from: {
        address: "noreply@smarttouristsafety.com",
        name: "Smart Tourist Safety",
      },
      to: email,
      subject: "Your OTP for Smart Tourist Safety",
      html: `...`, // OTP email template
      category: "OTP Verification"
    };

    return await this.transporter.sendMail(mailOptions);
  }
}

module.exports = new EmailService();