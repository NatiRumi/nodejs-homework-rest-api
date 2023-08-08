const sgMail = require("@sendgrid/mail");
const dotenv = require("dotenv");
dotenv.config();


sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmail = async (data) => {
    const email = {...data, from: "volosgoto@yahoo.com"};
    await sgMail.send(email);
    return true;
}

module.exports = sendEmail;