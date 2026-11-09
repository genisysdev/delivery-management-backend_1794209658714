import nodemailer from 'nodemailer';

export const sendEmail = async (to, subject, html) => {

    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT),
        secure: false,
        requireTLS: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
    try {
        const info = await transporter.sendMail({
            from: `"P-Sense" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html,
        });
        return info;
    } catch (error) {
        console.log(error);
        throw error;
    }
};