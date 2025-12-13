import sgMail from '@sendgrid/mail';
export async function sendApprovalEmail(toEmail: string, userName: string) {
    
    const apiKey = process.env.SENDGRID_API_KEY_CLEAN;

    // 🚨 IMPORTANT: Always check if the key is available
    if (!apiKey) {
        console.error("SG_API_KEY is not set in environment variables. Cannot send email.");
        return;
    }
    
    // Set the SendGrid API Key for the current execution
    sgMail.setApiKey(apiKey);

    const msg = {
        to: toEmail,
        from: 'gibsonlim1911@gmail.com', // 🚨 Must be a verified Sender Identity in SendGrid
        subject: '🎉 Congratulations! Your Account Has Been Approved!',
        html: `
            <html>
                <body>
                    <h1>Welcome, ${userName}!</h1>
                    <p>We are delighted to inform you that your registration for the Food Redistribution App has been approved by the administrators.</p>
                    <p>You can now log in and begin using all the features, such as creating new food listings or reserving items.</p>
                    <p>Thank you for joining our mission!</p>
                    <p>The FDA Team</p>
                </body>
            </html>
        `,
    };

    try {
        await sgMail.send(msg);
    } catch (error: any) {
        console.error(`SendGrid Error for ${toEmail}:`, error.toString());
        // Log details if available (SendGrid provides specific details in error.response.body)
        if (error.response && error.response.body) {
            console.error("SendGrid Details:", error.response.body);
        }
    }
}