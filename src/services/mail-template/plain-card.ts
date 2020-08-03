/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { Theme } from '!/services/mail-template/themes';

const { COMPANY_NAME, COMPANY_LOGO_BASE64, SITE_URL } = process.env;

export default function plainCard(code: number, theme: Theme): string {
  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta http-equiv="x-ua-compatible" content="ie=edge" />
      <title>Change Your Password</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style type="text/css">
        /**
         * Google webfonts. Recommended to include the .woff version for cross-client compatibility.
         */
        @media screen {
          @font-face {
            font-family: "Source Sans Pro";
            font-style: normal;
            font-weight: 400;
            src: local("Source Sans Pro Regular"), local("SourceSansPro-Regular"),
              url(https://fonts.gstatic.com/s/sourcesanspro/v10/ODelI1aHBYDBqgeIAH2zlBM0YzuT7MdOe03otPbuUS0.woff)
                format("woff");
          }

          @font-face {
            font-family: "Source Sans Pro";
            font-style: normal;
            font-weight: 700;
            src: local("Source Sans Pro Bold"), local("SourceSansPro-Bold"),
              url(https://fonts.gstatic.com/s/sourcesanspro/v10/toadOcfmlt9b38dHJxOBGFkQc6VGVFSmCnC_l7QZG60.woff)
                format("woff");
          }
        }

        /**
         * Avoid browser level font resizing.
         * 1. Windows Mobile
         * 2. iOS / OSX
         */
        body,
        table,
        td,
        a {
          -ms-text-size-adjust: 100%; /* 1 */
          -webkit-text-size-adjust: 100%; /* 2 */
        }

        /**
         * Remove extra space added to tables and cells in Outlook.
         */
        table,
        td {
          mso-table-rspace: 0pt;
          mso-table-lspace: 0pt;
        }

        /**
         * Better fluid images in Internet Explorer.
         */
        img {
          -ms-interpolation-mode: bicubic;
        }

        /**
         * Remove blue links for iOS devices.
         */
        a[x-apple-data-detectors] {
          font-family: inherit !important;
          font-size: inherit !important;
          font-weight: inherit !important;
          line-height: inherit !important;
          color: inherit !important;
          text-decoration: none !important;
        }

        /**
         * Fix centering issues in Android 4.4.
         */
        div[style*="margin: 16px 0;"] {
          margin: 0 !important;
        }

        body {
          width: 100% !important;
          height: 100% !important;
          padding: 0 !important;
          margin: 0 !important;
          color: ${theme.textColor};
        }

        /**
         * Collapse table borders to avoid space between cells.
         */
        table {
          border-collapse: collapse !important;
        }

        a {
          color: ${theme.linkTextColor};
        }

        img {
          height: auto;
          line-height: 100%;
          text-decoration: none;
          border: 0;
          outline: none;
        }
      </style>
    </head>
    <body style="background-color: ${theme.bodyBgColor};">
      <!-- start preheader -->
      <div
        class="preheader"
        style="display: none; max-width: 0; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: #fff; opacity: 0;"
      >
        Change the password of your ${COMPANY_NAME} account
      </div>
      <!-- end preheader -->

      <!-- start body -->
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <!-- start logo -->
        <tr>
          <td align="center" bgcolor="${theme.bodyBgColor}">
            <!--[if (gte mso 9)|(IE)]>
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
          <tr>
          <td align="center" valign="top" width="600">
          <![endif]-->
            <table
              border="0"
              cellpadding="0"
              cellspacing="0"
              width="100%"
              style="max-width: 600px;"
            >
              <tr>
                <td align="center" valign="top" style="padding: 36px 24px;">
                  <a
                    href="${SITE_URL}"
                    target="_blank"
                    style="display: inline-block;"
                  >
                  <img src="${COMPANY_LOGO_BASE64}" alt="${COMPANY_NAME}" border="0" width="48" style="display: block; width: 48px; max-width: 48px; min-width: 48px;">
                  </a>
                </td>
              </tr>
            </table>

            <!--[if (gte mso 9)|(IE)]>
          </td>
          </tr>
          </table>
          <![endif]-->
          </td>
        </tr>
        <!-- end logo -->

        <!-- start hero -->
        <tr>
          <td align="center" bgcolor="${theme.bodyBgColor}">
            <!--[if (gte mso 9)|(IE)]>
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
          <tr>
          <td align="center" valign="top" width="600">
          <![endif]-->
            <table
              border="0"
              cellpadding="0"
              cellspacing="0"
              width="100%"
              style="max-width: 600px;"
            >
              <tr>
                <td
                  align="left"
                  bgcolor="${theme.panelBgColor}"
                  style="padding: 36px 24px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; border-top: 3px solid ${theme.panelBorderColor};"
                >
                  <h1
                    style="margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -1px; line-height: 48px;"
                  >
                    Change Your Password
                  </h1>
                </td>
              </tr>
            </table>

            <!--[if (gte mso 9)|(IE)]>
          </td>
          </tr>
          </table>
          <![endif]-->
          </td>
        </tr>
        <!-- end hero -->

        <!-- start copy block -->
        <tr>
          <td align="center" bgcolor="${theme.bodyBgColor}">
            <!--[if (gte mso 9)|(IE)]>
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
          <tr>
          <td align="center" valign="top" width="600">
          <![endif]-->
            <table
              border="0"
              cellpadding="0"
              cellspacing="0"
              width="100%"
              style="max-width: 600px;"
            >
              <!-- start copy -->
              <tr>
                <td
                  align="left"
                  bgcolor="${theme.panelBgColor}"
                  style="padding: 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px;"
                >
                  <p style="margin: 0;">
                    Type the following code in the application to change your account password.
                    If you didn't request a new password, you can safely delete this email.
                  </p>
                </td>
              </tr>
              <!-- end copy -->

              <!-- start button -->
              <tr>
                <td align="left" bgcolor="${theme.panelBgColor}">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td align="center" bgcolor="${theme.panelBgColor}" style="padding: 12px;">
                        <table border="0" cellpadding="0" cellspacing="0">
                          <tr>
                            <td
                              align="center"
                              bgcolor="${theme.buttonBgColor}"
                              style="border-radius: 6px;"
                            >
                              <span
                                target="_blank"
                                style="display: inline-block; padding: 16px 36px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 24px; letter-spacing: 6px; color: ${theme.buttonTextColor}; text-decoration: none; border-radius: 6px;"
                                >${code}</span
                              >
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- end button -->

              <!-- start copy -->
              <tr>
                <td
                  align="left"
                  bgcolor="${theme.panelBgColor}"
                  style="padding: 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px; border-bottom: 3px solid ${theme.panelBorderColor}"
                >
                  <p style="margin: 0;">
                    Cheers,<br />
                    ${COMPANY_NAME}
                  </p>
                </td>
              </tr>
              <!-- end copy -->
            </table>

            <!--[if (gte mso 9)|(IE)]>
          </td>
          </tr>
          </table>
          <![endif]-->
          </td>
        </tr>
        <!-- end copy block -->

        <!-- start footer -->
        <tr>
          <td align="center" bgcolor="${theme.bodyBgColor}" style="padding: 24px;">
            <!--[if (gte mso 9)|(IE)]>
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
          <tr>
          <td align="center" valign="top" width="600">
          <![endif]-->
            <table
              border="0"
              cellpadding="0"
              cellspacing="0"
              width="100%"
              style="max-width: 600px;"
            >
              <!-- start permission -->
              <tr>
                <td
                  align="center"
                  bgcolor="${theme.bodyBgColor}"
                  style="padding: 12px 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 20px; color: ${theme.textColorFaded};"
                >
                  <p style="margin: 0;">
                    You received this email because we received a request for
                    password change of your account. If you didn't request a
                    password change you can safely delete this email.
                  </p>
                </td>
              </tr>
              <!-- end permission -->
            </table>

            <!--[if (gte mso 9)|(IE)]>
          </td>
          </tr>
          </table>
          <![endif]-->
          </td>
        </tr>
        <!-- end footer -->
      </table>

      <!-- end body -->
    </body>
  </html>
  `;
}
