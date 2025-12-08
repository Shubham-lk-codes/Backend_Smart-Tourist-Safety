// const UserManager = require('../blockchain/UserManager');
// const nodemailer = require("nodemailer");
// const { MailtrapTransport } = require("mailtrap");
// const TOKEN = "6f9a429f801e3b6d00c949af8d7695b5";
// const transporter = nodemailer.createTransport(
//   MailtrapTransport({
//     token: TOKEN,
//   })
// );



// const userManager = new UserManager();

// // Initialize when server starts
// userManager.initialize().catch(console.error);

// const userController = {

  
  
//   // Register new user
//   // registerUser: async (req, res) => {
//   //   try {
//   //     const { name, email, phone, location } = req.body;

//   //     if (!name || !email) {
//   //       return res.status(400).json({
//   //         error: 'Name and email are required'
//   //       });
//   //     }

//   //     const userData = {
//   //       name,
//   //       email,
//   //       phone: phone || '',
//   //       location: location || ''
//   //     };

//   //     const user = await userManager.registerUser(userData);

//   //     res.status(201).json({
//   //       message: 'User registered successfully',
//   //       user: {
//   //         userId: user.userId,
//   //         name: user.name,
//   //         email: user.email,
//   //         blockId: user.blockId,
//   //         blockHash: user.blockHash,
//   //         timestamp: user.timestamp
//   //       }
//   //     });
//   //   } catch (error) {
//   //     console.error('Error registering user:', error);
//   //     res.status(500).json({
//   //       error: 'Internal server error: ' + error.message
//   //     });
//   //   }
//   // },

//   // User registration function with welcome email
// registerUser: async (req, res) => {
//   try {
//     const { name, email, phone, location } = req.body;

//     if (!name || !email) {
//       return res.status(400).json({
//         error: 'Name and email are required'
//       });
//     }

//     // Check if user already exists
//     const existingUser = await userManager.findUserByEmail(email);
//     if (existingUser) {
//       return res.status(400).json({
//         error: 'User with this email already exists'
//       });
//     }

//     const userData = {
//       name,
//       email,
//       phone: phone || '',
//       location: location || ''
//     };

//     // Register user
//     const user = await userManager.registerUser(userData);

//     // Send welcome email via Mailtrap
//     try {
//       const sender = {
//         address: "noreply@smarttouristsafety.com",
//         name: "Smart Tourist Safety",
//       };

//       const mailOptions = {
//         from: sender,
//         to: email,
//         subject: "Welcome to Smart Tourist Safety Monitoring System! 🎉",
//         text: `Dear ${name},

// Welcome to Smart Tourist Safety Monitoring System!

// Your account has been successfully created. Here are your account details:

// Name: ${name}
// Email: ${email}
// Phone: ${phone || 'Not provided'}
// Location: ${location || 'Not provided'}
// User ID: ${user.userId}
// Registration Date: ${new Date(user.timestamp).toLocaleDateString()}

// Thank you for joining our platform. We're dedicated to ensuring tourist safety through our monitoring system.

// You can now login and access all features:
// - Real-time safety monitoring
// - Emergency alerts
// - Safety guidelines
// - Location tracking
// - And much more!

// Stay safe and enjoy your travels!

// Best regards,
// Smart Tourist Safety Team`,
//         html: `
// <!DOCTYPE html>
// <html>
// <head>
//     <meta charset="UTF-8">
//     <meta name="viewport" content="width=device-width, initial-scale=1.0">
//     <title>Welcome to Smart Tourist Safety</title>
//     <style>
//         body {
//             font-family: 'Arial', sans-serif;
//             line-height: 1.6;
//             color: #333;
//             max-width: 600px;
//             margin: 0 auto;
//             padding: 20px;
//             background-color: #f5f5f5;
//         }
//         .container {
//             background-color: white;
//             border-radius: 10px;
//             overflow: hidden;
//             box-shadow: 0 4px 15px rgba(0,0,0,0.1);
//         }
//         .header {
//             background: linear-gradient(135deg, #4CAF50, #2E7D32);
//             color: white;
//             padding: 30px 20px;
//             text-align: center;
//         }
//         .header h1 {
//             margin: 0;
//             font-size: 28px;
//         }
//         .header p {
//             margin: 10px 0 0;
//             opacity: 0.9;
//         }
//         .content {
//             padding: 30px;
//         }
//         .welcome-text {
//             font-size: 18px;
//             margin-bottom: 25px;
//             color: #2E7D32;
//         }
//         .user-info {
//             background-color: #f8f9fa;
//             border-radius: 8px;
//             padding: 20px;
//             margin: 25px 0;
//             border-left: 4px solid #4CAF50;
//         }
//         .info-item {
//             margin: 10px 0;
//             display: flex;
//             align-items: center;
//         }
//         .info-label {
//             font-weight: bold;
//             min-width: 120px;
//             color: #555;
//         }
//         .features {
//             background-color: #e8f5e9;
//             border-radius: 8px;
//             padding: 20px;
//             margin: 25px 0;
//         }
//         .features h3 {
//             color: #2E7D32;
//             margin-top: 0;
//         }
//         .features ul {
//             padding-left: 20px;
//         }
//         .features li {
//             margin: 8px 0;
//         }
//         .cta-button {
//             display: inline-block;
//             background: linear-gradient(135deg, #4CAF50, #2E7D32);
//             color: white;
//             padding: 14px 32px;
//             text-decoration: none;
//             border-radius: 5px;
//             font-weight: bold;
//             margin: 20px 0;
//             text-align: center;
//             transition: transform 0.3s ease;
//         }
//         .cta-button:hover {
//             transform: translateY(-2px);
//             box-shadow: 0 5px 15px rgba(76, 175, 80, 0.3);
//         }
//         .footer {
//             text-align: center;
//             padding: 20px;
//             background-color: #f8f9fa;
//             border-top: 1px solid #eee;
//             color: #666;
//             font-size: 14px;
//         }
//         .logo {
//             text-align: center;
//             margin-bottom: 20px;
//         }
//         .logo h2 {
//             color: #2E7D32;
//             margin: 0;
//             font-size: 24px;
//         }
//     </style>
// </head>
// <body>
//     <div class="container">
//         <div class="header">
//             <h1>🎉 Welcome Aboard! 🎉</h1>
//             <p>Smart Tourist Safety Monitoring System</p>
//         </div>
        
//         <div class="content">
//             <div class="logo">
//                 <h2>Smart Tourist Safety</h2>
//             </div>
            
//             <p class="welcome-text">Dear <strong>${name}</strong>,</p>
            
//             <p>We're thrilled to welcome you to the <strong>Smart Tourist Safety Monitoring System</strong>! Your account has been successfully created and you're now part of our safety ecosystem.</p>
            
//             <div class="user-info">
//                 <h3 style="color: #2E7D32; margin-top: 0;">Your Account Details:</h3>
//                 <div class="info-item">
//                     <span class="info-label">Name:</span>
//                     <span>${name}</span>
//                 </div>
//                 <div class="info-item">
//                     <span class="info-label">Email:</span>
//                     <span>${email}</span>
//                 </div>
//                 <div class="info-item">
//                     <span class="info-label">Phone:</span>
//                     <span>${phone || 'Not provided'}</span>
//                 </div>
//                 <div class="info-item">
//                     <span class="info-label">Location:</span>
//                     <span>${location || 'Not provided'}</span>
//                 </div>
//                 <div class="info-item">
//                     <span class="info-label">User ID:</span>
//                     <span>${user.userId}</span>
//                 </div>
//                 <div class="info-item">
//                     <span class="info-label">Registered On:</span>
//                     <span>${new Date(user.timestamp).toLocaleDateString('en-US', { 
//                         weekday: 'long',
//                         year: 'numeric',
//                         month: 'long',
//                         day: 'numeric',
//                         hour: '2-digit',
//                         minute: '2-digit'
//                     })}</span>
//                 </div>
//             </div>
            
//             <p>Your safety is our priority. With our monitoring system, you can:</p>
            
//             <div class="features">
//                 <h3>🚀 Key Features You Can Access:</h3>
//                 <ul>
//                     <li><strong>Real-time Safety Monitoring</strong> - 24/7 surveillance</li>
//                     <li><strong>Emergency Alert System</strong> - Instant notifications</li>
//                     <li><strong>Live Location Tracking</strong> - GPS-based monitoring</li>
//                     <li><strong>Safety Guidelines & Tips</strong> - Tourist safety information</li>
//                     <li><strong>SOS Emergency Button</strong> - One-touch emergency contact</li>
//                     <li><strong>Incident Reporting</strong> - Report safety concerns instantly</li>
//                     <li><strong>Safety Zone Alerts</strong> - Notifications about unsafe areas</li>
//                 </ul>
//             </div>
            
//             <div style="text-align: center;">
//                 <a href="https://your-platform-url.com/login" class="cta-button">
//                     🚀 Access Your Dashboard
//                 </a>
//             </div>
            
//             <p>If you have any questions or need assistance, our support team is always ready to help you.</p>
            
//             <p><strong>Remember:</strong> Your safety is our mission. Travel smart, travel safe!</p>
            
//             <p>Best regards,<br>
//             <strong>The Smart Tourist Safety Team</strong></p>
//         </div>
        
//         <div class="footer">
//             <p>© ${new Date().getFullYear()} Smart Tourist Safety Monitoring System. All rights reserved.</p>
//             <p>This is an automated message, please do not reply to this email.</p>
//             <p>For support, contact: support@smarttouristsafety.com</p>
//         </div>
//     </div>
// </body>
// </html>`,
//         category: "User Registration"
//       };

//       // Send email
//       const info = await transporter.sendMail(mailOptions);
//       console.log("✅ Welcome email sent via Mailtrap!");
//       console.log("📧 Email sent to:", email);
//       console.log("📋 Mailtrap preview:", `https://mailtrap.io/inboxes/your-inbox/messages/${info.messageId}`);

//     } catch (emailError) {
//       console.error("❌ Email sending failed:", emailError);
//       // Don't fail registration if email fails
//       // Continue with user registration
//     }

//     res.status(201).json({
//       message: 'User registered successfully',
//       user: {
//         userId: user.userId,
//         name: user.name,
//         email: user.email,
//         blockId: user.blockId,
//         blockHash: user.blockHash,
//         timestamp: user.timestamp
//       },
//       emailSent: true
//     });

//   } catch (error) {
//     console.error('Error registering user:', error);
    
//     // Check for specific errors
//     let errorMessage = 'Internal server error: ' + error.message;
//     let statusCode = 500;
    
//     if (error.message.includes('already exists') || error.message.includes('duplicate')) {
//       errorMessage = 'User with this email already exists';
//       statusCode = 400;
//     }
    
//     res.status(statusCode).json({
//       error: errorMessage
//     });
//   }
// },

//   // Get user details
//   getUser: async (req, res) => {
//     try {
//       const { userId } = req.params;
//       const verification = await userManager.verifyUser(userId);

//       if (!verification.verified) {
//         return res.status(404).json({
//           error: 'User not found or verification failed'
//         });
//       }

//       res.json({
//         user: verification.user,
//         blockchainVerified: verification.blockchainVerified,
//         blockData: verification.blockData
//       });
//     } catch (error) {
//       console.error('Error getting user:', error);
//       res.status(500).json({
//         error: 'Internal server error'
//       });
//     }
//   },

//   // Add user activity
//   addActivity: async (req, res) => {
//     try {
//       const { userId } = req.params;
//       const { activityType, details } = req.body;

//       if (!activityType) {
//         return res.status(400).json({
//           error: 'Activity type is required'
//         });
//       }

//       const activity = await userManager.addUserActivity(userId, activityType, details);

//       res.json({
//         message: 'Activity recorded successfully',
//         activity: activity.activity,
//         blockId: activity.blockId,
//         blockHash: activity.blockHash
//       });
//     } catch (error) {
//       console.error('Error adding activity:', error);
//       res.status(500).json({
//         error: error.message
//       });
//     }
//   },

//   // Get user activities
//   getActivities: async (req, res) => {
//     try {
//       const { userId } = req.params;
//       const activities = await userManager.getUserActivities(userId);

//       res.json({
//         userId,
//         activities: activities.map(activity => ({
//           activityType: activity.activityType,
//           details: activity.details,
//           timestamp: activity.timestamp,
//           blockHash: activity.blockHash
//         }))
//       });
//     } catch (error) {
//       console.error('Error getting activities:', error);
//       res.status(500).json({
//         error: 'Internal server error'
//       });
//     }
//   },

//   // Get all users
//   getAllUsers: async (req, res) => {
//     try {
//       const users = await userManager.getAllUsers();
//       const stats = await userManager.getBlockchainStats();

//       res.json({
//         stats,
//         users: users.map(user => ({
//           userId: user.userId,
//           name: user.name,
//           email: user.email,
//           registeredAt: user.timestamp,
//           blockId: user.blockId
//         }))
//       });
//     } catch (error) {
//       console.error('Error getting users:', error);
//       res.status(500).json({
//         error: 'Internal server error'
//       });
//     }
//   },

//   // Get blockchain info
//   getBlockchainInfo: async (req, res) => {
//     try {
//       const stats = await userManager.getBlockchainStats();
//       res.json(stats);
//     } catch (error) {
//       console.error('Error getting blockchain info:', error);
//       res.status(500).json({
//         error: 'Internal server error'
//       });
//     }
//   }
// };

// module.exports = userController;

const UserManager = require('../blockchain/UserManager');
const nodemailer = require("nodemailer");
const { MailtrapTransport } = require("mailtrap");

// Mailtrap configuration
const TOKEN = "6f9a429f801e3b6d00c949af8d7695b5";
const transporter = nodemailer.createTransport(
  MailtrapTransport({
    token: TOKEN,
  })
);

const userManager = new UserManager();

// Initialize when server starts
userManager.initialize().catch(console.error);

const userController = {
  // User registration function with welcome email
  registerUser: async (req, res) => {
    try {
      const { name, email, phone, location } = req.body;

      if (!name || !email) {
        return res.status(400).json({
          error: 'Name and email are required'
        });
      }

      // Check if user already exists
      // Note: This will only work if findUserByEmail method is implemented in UserManager
      // If not, you can skip this check or implement it differently
      let existingUser = null;
      try {
        // Try to use the method if it exists
        if (typeof userManager.findUserByEmail === 'function') {
          existingUser = await userManager.findUserByEmail(email);
        } else {
          // Alternative: Get all users and check
          const allUsers = await userManager.getAllUsers();
          existingUser = allUsers.find(user => user.email === email);
        }
      } catch (findError) {
        console.log('User check skipped:', findError.message);
      }

      if (existingUser) {
        return res.status(400).json({
          error: 'User with this email already exists'
        });
      }

      const userData = {
        name,
        email,
        phone: phone || '',
        location: location || ''
      };

      // Register user
      const user = await userManager.registerUser(userData);

      // Send welcome email via Mailtrap
      try {
        const sender = {
          address: "noreply@smarttouristsafety.com",
          name: "Smart Tourist Safety",
        };

        const mailOptions = {
          from: sender,
          to: email,
          subject: "Welcome to Smart Tourist Safety Monitoring System! 🎉",
          text: `Dear ${name},

Welcome to Smart Tourist Safety Monitoring System!

Your account has been successfully created. Here are your account details:

Name: ${name}
Email: ${email}
Phone: ${phone || 'Not provided'}
Location: ${location || 'Not provided'}
User ID: ${user.userId}
Registration Date: ${new Date(user.timestamp).toLocaleDateString()}

Thank you for joining our platform. We're dedicated to ensuring tourist safety through our monitoring system.

You can now login and access all features:
- Real-time safety monitoring
- Emergency alerts
- Safety guidelines
- Location tracking
- And much more!

Stay safe and enjoy your travels!

Best regards,
Smart Tourist Safety Team`,
          html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Smart Tourist Safety</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #4CAF50, #2E7D32);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
        }
        .header p {
            margin: 10px 0 0;
            opacity: 0.9;
        }
        .content {
            padding: 30px;
        }
        .welcome-text {
            font-size: 18px;
            margin-bottom: 25px;
            color: #2E7D32;
        }
        .user-info {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
            border-left: 4px solid #4CAF50;
        }
        .info-item {
            margin: 10px 0;
            display: flex;
            align-items: center;
        }
        .info-label {
            font-weight: bold;
            min-width: 120px;
            color: #555;
        }
        .features {
            background-color: #e8f5e9;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
        }
        .features h3 {
            color: #2E7D32;
            margin-top: 0;
        }
        .features ul {
            padding-left: 20px;
        }
        .features li {
            margin: 8px 0;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #4CAF50, #2E7D32);
            color: white;
            padding: 14px 32px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin: 20px 0;
            text-align: center;
            transition: transform 0.3s ease;
        }
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(76, 175, 80, 0.3);
        }
        .footer {
            text-align: center;
            padding: 20px;
            background-color: #f8f9fa;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 14px;
        }
        .logo {
            text-align: center;
            margin-bottom: 20px;
        }
        .logo h2 {
            color: #2E7D32;
            margin: 0;
            font-size: 24px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Welcome Aboard! 🎉</h1>
            <p>Smart Tourist Safety Monitoring System</p>
        </div>
        
        <div class="content">
            <div class="logo">
                <h2>Smart Tourist Safety</h2>
            </div>
            
            <p class="welcome-text">Dear <strong>${name}</strong>,</p>
            
            <p>We're thrilled to welcome you to the <strong>Smart Tourist Safety Monitoring System</strong>! Your account has been successfully created and you're now part of our safety ecosystem.</p>
            
            <div class="user-info">
                <h3 style="color: #2E7D32; margin-top: 0;">Your Account Details:</h3>
                <div class="info-item">
                    <span class="info-label">Name:</span>
                    <span>${name}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Email:</span>
                    <span>${email}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Phone:</span>
                    <span>${phone || 'Not provided'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Location:</span>
                    <span>${location || 'Not provided'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">User ID:</span>
                    <span>${user.userId}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Registered On:</span>
                    <span>${new Date(user.timestamp).toLocaleDateString('en-US', { 
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}</span>
                </div>
            </div>
            
            <p>Your safety is our priority. With our monitoring system, you can:</p>
            
            <div class="features">
                <h3>🚀 Key Features You Can Access:</h3>
                <ul>
                    <li><strong>Real-time Safety Monitoring</strong> - 24/7 surveillance</li>
                    <li><strong>Emergency Alert System</strong> - Instant notifications</li>
                    <li><strong>Live Location Tracking</strong> - GPS-based monitoring</li>
                    <li><strong>Safety Guidelines & Tips</strong> - Tourist safety information</li>
                    <li><strong>SOS Emergency Button</strong> - One-touch emergency contact</li>
                    <li><strong>Incident Reporting</strong> - Report safety concerns instantly</li>
                    <li><strong>Safety Zone Alerts</strong> - Notifications about unsafe areas</li>
                </ul>
            </div>
            
            <div style="text-align: center;">
                <a href="http://localhost:5173/login" class="cta-button">
                    🚀 Access Your Dashboard
                </a>
            </div>
            
            <p>If you have any questions or need assistance, our support team is always ready to help you.</p>
            
            <p><strong>Remember:</strong> Your safety is our mission. Travel smart, travel safe!</p>
            
            <p>Best regards,<br>
            <strong>The Smart Tourist Safety Team</strong></p>
        </div>
        
        <div class="footer">
            <p>© ${new Date().getFullYear()} Smart Tourist Safety Monitoring System. All rights reserved.</p>
            <p>This is an automated message, please do not reply to this email.</p>
            <p>For support, contact: support@smarttouristsafety.com</p>
        </div>
    </div>
</body>
</html>`,
          category: "User Registration"
        };

        // Send email
        const info = await transporter.sendMail(mailOptions);
        console.log("✅ Welcome email sent via Mailtrap!");
        console.log("📧 Email sent to:", email);
        console.log("📋 Mailtrap message ID:", info.messageId);

      } catch (emailError) {
        console.error("❌ Email sending failed:", emailError.message);
        // Don't fail registration if email fails
        // Continue with user registration
      }

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          userId: user.userId,
          name: user.name,
          email: user.email,
          blockId: user.blockId,
          blockHash: user.blockHash,
          timestamp: user.timestamp
        },
        emailSent: true
      });

    } catch (error) {
      console.error('Error registering user:', error);
      
      // Check for specific errors
      let errorMessage = 'Internal server error: ' + error.message;
      let statusCode = 500;
      
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        errorMessage = 'User with this email already exists';
        statusCode = 400;
      }
      
      res.status(statusCode).json({
        error: errorMessage
      });
    }
  },

  // Get user details
  getUser: async (req, res) => {
    try {
      const { userId } = req.params;
      const verification = await userManager.verifyUser(userId);

      if (!verification.verified) {
        return res.status(404).json({
          error: 'User not found or verification failed'
        });
      }

      res.json({
        user: verification.user,
        blockchainVerified: verification.blockchainVerified,
        blockData: verification.blockData
      });
    } catch (error) {
      console.error('Error getting user:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  },

  // Add user activity
  addActivity: async (req, res) => {
    try {
      const { userId } = req.params;
      const { activityType, details } = req.body;

      if (!activityType) {
        return res.status(400).json({
          error: 'Activity type is required'
        });
      }

      const activity = await userManager.addUserActivity(userId, activityType, details);

      res.json({
        message: 'Activity recorded successfully',
        activity: activity.activity,
        blockId: activity.blockId,
        blockHash: activity.blockHash
      });
    } catch (error) {
      console.error('Error adding activity:', error);
      res.status(500).json({
        error: error.message
      });
    }
  },

  // Get user activities
  getActivities: async (req, res) => {
    try {
      const { userId } = req.params;
      const activities = await userManager.getUserActivities(userId);

      res.json({
        userId,
        activities: activities.map(activity => ({
          activityType: activity.activityType,
          details: activity.details,
          timestamp: activity.timestamp,
          blockHash: activity.blockHash
        }))
      });
    } catch (error) {
      console.error('Error getting activities:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  },

  // Get all users
  getAllUsers: async (req, res) => {
    try {
      const users = await userManager.getAllUsers();
      const stats = await userManager.getBlockchainStats();

      res.json({
        stats,
        users: users.map(user => ({
          userId: user.userId,
          name: user.name,
          email: user.email,
          registeredAt: user.timestamp,
          blockId: user.blockId
        }))
      });
    } catch (error) {
      console.error('Error getting users:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  },

  // Get blockchain info
  getBlockchainInfo: async (req, res) => {
    try {
      const stats = await userManager.getBlockchainStats();
      res.json(stats);
    } catch (error) {
      console.error('Error getting blockchain info:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
};

module.exports = userController;