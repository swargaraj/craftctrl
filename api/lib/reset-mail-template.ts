export function getResetEmailTemplate(
  resetLink: string,
  ipAddress: string,
  browser: string,
  device: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Password Reset</title>

    <style>
      body,
      table,
      td,
      a {
        -webkit-text-size-adjust: 100%;
        -ms-text-size-adjust: 100%;
      }
      table {
        border-collapse: collapse !important;
      }
      img {
        border: 0;
        height: auto;
        line-height: 100%;
        outline: none;
        text-decoration: none;
      }
      a {
        text-decoration: none;
      }

      body {
        margin: 0;
        padding: 0;
        font-family: "Helvetica", sans-serif;
        background: linear-gradient(
          to bottom,
          rgba(0, 0, 0, 0.2) 0%,
          rgba(0, 0, 0, 0.2) 45%,
          #ffffff 45%,
          #ffffff 100%
        );
        color: #111;
      }

      .wrapper {
        width: 100%;
        padding-top: 40px;
      }

      .card {
        max-width: 680px;
        margin: 0 auto;
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06);
        overflow: hidden;
        border: 1px solid #f2f2f2;
      }

      .header {
        padding: 28px 32px 16px;
        border-bottom: 1px solid #f2f2f2;
      }

      .brand {
        font-weight: 700;
        font-size: 20px;
        color: #000;
        letter-spacing: -0.2px;
      }

      .content {
        padding: 10px 32px 16px;
      }

      h1 {
        margin: 12px 0 8px;
        font-size: 22px;
        font-weight: 600;
        color: #000;
      }

      p {
        font-size: 15px;
        line-height: 1.45;
      }

      .btn {
        display: inline-block;
        padding: 12px 22px;
        background: #000;
        color: #fff !important;
        border-radius: 8px;
        font-weight: 600;
        margin-bottom: 20px;
        user-select: none;
      }

      .meta {
        background: #fafafa;
        border: 1px solid #f0f0f0;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 13px;
        margin: 16px 0;
      }

      .meta div {
        margin-top: 0.5rem;
      }

      .meta div:first-child {
        margin-top: 0;
      }

      .meta dt,
      .meta dd {
        display: inline-block;
        vertical-align: middle;
        margin: 0;
      }

      .meta dt {
        font-weight: 600;
        font-size: 13px;
      }

      .meta dd {
        margin: 0;
        font-size: 13px;
      }

      .small {
        font-size: 13px;
        color: #555;
      }

      .footer {
        border-top: 1px solid #f2f2f2;
        padding: 20px 32px;
        font-size: 13px;
        color: #666;
      }

      @media (max-width: 480px) {
        .card {
          margin: 0 8px;
        }
        .header,
        .content,
        .footer {
          padding: 20px;
        }
      }
    </style>
  </head>

  <body>
    <div class="wrapper">
      <table role="presentation" width="100%">
        <tr>
          <td align="center">
            <table role="presentation" class="card">
              <tr>
                <td class="header">
                  <div class="brand">CraftCtrl</div>
                </td>
              </tr>

              <tr>
                <td class="content">
                  <h1>Password Reset Request</h1>
                  <p>
                    We received a request to reset your password. Click the
                    button below to continue:
                  </p>

                  <a
                    href="${resetLink}"
                    class="btn"
                    target="_blank"
                    rel="noopener noreferrer"
                    >Reset Password</a
                  >

                  <p class="small">
                    This link will expire in
                    <strong>60 minutes</strong>.
                  </p>

                  <p class="small">
                    If the button doesn't work, copy and paste this link into
                    your browser:
                  </p>

                  <div class="meta">
                    <p class="small">${resetLink}</p>
                  </div>

                  <div class="meta">
                    <div>
                      <dt>IP Address:</dt>
                      <dd>${ipAddress}</dd>
                    </div>

                    <div>
                      <dt>Browser:</dt>
                      <dd>${browser}</dd>
                    </div>

                    <div>
                      <dt>Device:</dt>
                      <dd>${device}</dd>
                    </div>
                  </div>

                  <p class="small">
                    If you didn't request this, ignore this email. No changes
                    will be made.
                  </p>
                </td>
              </tr>

              <tr>
                <td class="footer">
                  <div>Thanks,<br /><strong>CraftCtrl</strong></div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  </body>
</html>`;
}
