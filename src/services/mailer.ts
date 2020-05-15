import { createTestAccount, createTransport, getTestMessageUrl } from 'nodemailer';

import debug from '!/services/debug';
import templates from '!/services/mail-template';
import themes from '!/services/mail-template/themes';

const { COMPANY_NAME, NOREPLY_EMAIL, EMAIL_TEMPLATE, EMAIL_TEMPLATE_THEME } = process.env;

const DEFAULT_TEMPLATE = 'plainCard';
const DEFAULT_THEME = 'whiteBlue';

const log = debug.extend('mailer');

export default async function mailer(to: string, code: number) {
  if (!to || !code) {
    return;
  }

  // Generate test SMTP service account from ethereal.email
  const { user, pass } = await createTestAccount();

  log('Created test email account: %s:%s', user, pass);

  // Create reusable transporter object using the default SMTP transport
  const transporter = createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user, // generated ethereal user
      pass, // generated ethereal password
    },
  });

  // Get email template
  let template;
  if (EMAIL_TEMPLATE && templates[EMAIL_TEMPLATE]) {
    template = EMAIL_TEMPLATE;
  } else {
    template = DEFAULT_TEMPLATE;
  }

  log('Using email template: %s', template);
  const generate = templates[template];

  // Get email theme
  let templateTheme;
  if (EMAIL_TEMPLATE_THEME && themes[EMAIL_TEMPLATE_THEME]) {
    templateTheme = EMAIL_TEMPLATE_THEME;
  } else {
    templateTheme = DEFAULT_THEME;
  }

  log('Using email theme: %s', templateTheme);
  const theme = themes[templateTheme];

  const html = generate(code, theme);
  log('Generated HTML successfully');

  // Send mail with defined transport object
  try {
    const mailInfo = await transporter.sendMail({
      from: `"${COMPANY_NAME}" <${NOREPLY_EMAIL}>`,
      to,
      subject: `Change the password of your ${COMPANY_NAME} account`,
      text:
        `Type the code ${code} in the application to change your account password.\n` +
        "If you didn't request a new password, you can safely delete this email.\n",
      html,
    });
    transporter.close();

    log('Sent email to %s with code %s', to, code);
    log('Email preview URL: %s', getTestMessageUrl(mailInfo));
  } catch (e) {
    transporter.close();
    throw e;
  }
}
