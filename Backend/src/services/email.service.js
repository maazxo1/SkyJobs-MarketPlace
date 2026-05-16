let resend;
try {
  if (process.env.RESEND_API_KEY) {
    const { Resend } = require('resend');
    resend = new Resend(process.env.RESEND_API_KEY);
  }
} catch {}

const FROM = process.env.EMAIL_FROM || 'SkyJobs <noreply@skyjobs.dev>';
const APP_URL = process.env.CLIENT_URL || 'http://localhost:5173';

async function sendEmail({ to, subject, html }) {
  if (!resend) return; // email not configured — silently skip
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch {} // non-critical
}

const base = (body) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f0f1a;margin:0;padding:24px}
  .wrap{max-width:560px;margin:0 auto}
  .card{background:#1a1a2e;border:1px solid #2a2a4a;border-radius:16px;overflow:hidden}
  .hdr{background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:28px 32px;border-bottom:1px solid #2a2a4a}
  .logo{font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px}
  .logo span{color:#f59e0b}
  .body{padding:28px 32px;color:#c8c8e0;line-height:1.65;font-size:15px}
  .body h2{color:#fff;font-size:20px;margin:0 0 14px;font-weight:700}
  .body p{margin:0 0 14px}
  .btn{display:inline-block;background:#f59e0b;color:#0f0f1a;text-decoration:none;padding:13px 26px;border-radius:10px;font-weight:700;font-size:14px;margin-top:8px}
  .quote{border-left:3px solid #f59e0b;padding:10px 16px;margin:14px 0;background:rgba(245,158,11,0.07);border-radius:0 8px 8px 0;color:#e0d9c0;font-style:italic}
  .pill{display:inline-block;background:rgba(245,158,11,0.15);color:#f59e0b;padding:4px 10px;border-radius:20px;font-size:13px;font-weight:600}
  .footer{padding:16px 32px;text-align:center;color:#555577;font-size:12px;border-top:1px solid #2a2a4a}
  a{color:#f59e0b}
</style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <div class="hdr"><div class="logo">Sky<span>Jobs</span></div></div>
    <div class="body">${body}</div>
    <div class="footer">SkyJobs Marketplace &mdash; Automated message, please do not reply.<br>
    <a href="${APP_URL}">skyjobs.dev</a></div>
  </div>
</div>
</body>
</html>`;

const templates = {
  welcome({ name }) {
    return {
      subject: 'Welcome to SkyJobs — your marketplace is ready',
      html: base(`
        <h2>Welcome aboard, ${name}!</h2>
        <p>Your SkyJobs account is active. Browse open jobs, post your work, and start building your reputation on the platform.</p>
        <p>Here's how to get started:</p>
        <ul style="padding-left:18px;color:#c8c8e0">
          <li style="margin-bottom:6px">Complete your profile to boost visibility</li>
          <li style="margin-bottom:6px">Browse job listings and submit proposals</li>
          <li style="margin-bottom:6px">Get notified instantly when clients respond</li>
        </ul>
        <a href="${APP_URL}" class="btn">Go to Dashboard</a>
      `),
    };
  },

  bidReceived({ clientName, freelancerName, jobTitle, amount, jobId }) {
    return {
      subject: `New proposal on "${jobTitle}"`,
      html: base(`
        <h2>You received a new proposal</h2>
        <p>Hi <strong>${clientName}</strong>,</p>
        <p><strong>${freelancerName}</strong> submitted a proposal on your job:</p>
        <p style="font-size:17px;color:#fff;font-weight:700">${jobTitle}</p>
        <p>Proposed amount: <span class="pill">$${amount}</span></p>
        <a href="${APP_URL}/jobs/${jobId}" class="btn">Review Proposal</a>
      `),
    };
  },

  bidAccepted({ freelancerName, jobTitle, amount, orderId }) {
    return {
      subject: `Your proposal was accepted — "${jobTitle}"`,
      html: base(`
        <h2>Congratulations, ${freelancerName}!</h2>
        <p>Your proposal was accepted. Here are the details:</p>
        <p style="font-size:17px;color:#fff;font-weight:700">${jobTitle}</p>
        <p>Agreed amount: <span class="pill">$${amount}</span></p>
        <p>Head to your order page to start work when you're ready.</p>
        <a href="${APP_URL}/orders/${orderId}" class="btn">View Order</a>
      `),
    };
  },

  orderStarted({ clientName, freelancerName, jobTitle, orderId, deadline }) {
    return {
      subject: `Work has started on "${jobTitle}"`,
      html: base(`
        <h2>Your freelancer has started</h2>
        <p>Hi <strong>${clientName}</strong>,</p>
        <p><strong>${freelancerName}</strong> has started working on <strong>"${jobTitle}"</strong>.</p>
        <p>Expected delivery by: <span class="pill">${deadline}</span></p>
        <a href="${APP_URL}/orders/${orderId}" class="btn">Track Order</a>
      `),
    };
  },

  orderDelivered({ clientName, freelancerName, jobTitle, orderId }) {
    return {
      subject: `Delivery ready for review — "${jobTitle}"`,
      html: base(`
        <h2>Your delivery is ready!</h2>
        <p>Hi <strong>${clientName}</strong>,</p>
        <p><strong>${freelancerName}</strong> has submitted their work on <strong>"${jobTitle}"</strong>. Please review and either approve it or request changes.</p>
        <p style="font-size:13px;color:#888899">If no action is taken within 3 days, the order will be automatically approved and payment released.</p>
        <a href="${APP_URL}/orders/${orderId}" class="btn">Review Delivery</a>
      `),
    };
  },

  orderCompleted({ freelancerName, jobTitle, payout, orderId }) {
    return {
      subject: `Payment released — "${jobTitle}"`,
      html: base(`
        <h2>Payment has been released!</h2>
        <p>Hi <strong>${freelancerName}</strong>,</p>
        <p>The order for <strong>"${jobTitle}"</strong> is complete. Your earnings are on their way:</p>
        <p style="font-size:24px;color:#f59e0b;font-weight:800">$${payout}</p>
        <p style="font-size:13px;color:#888899">Funds enter a 7-day clearance period before becoming available for withdrawal.</p>
        <a href="${APP_URL}/orders/${orderId}" class="btn">View Order</a>
      `),
    };
  },

  revisionRequested({ freelancerName, jobTitle, feedback, orderId }) {
    return {
      subject: `Revision requested on "${jobTitle}"`,
      html: base(`
        <h2>Revision requested</h2>
        <p>Hi <strong>${freelancerName}</strong>,</p>
        <p>The client has requested a revision on <strong>"${jobTitle}"</strong>.</p>
        ${feedback ? `<div class="quote">${feedback}</div>` : ''}
        <a href="${APP_URL}/orders/${orderId}" class="btn">View Feedback</a>
      `),
    };
  },

  disputeOpened({ name, jobTitle, disputeId, isRespondent }) {
    return {
      subject: `Dispute opened — "${jobTitle}"`,
      html: base(`
        <h2>A dispute has been ${isRespondent ? 'filed against your order' : 'opened'}</h2>
        <p>Hi <strong>${name}</strong>,</p>
        ${isRespondent
          ? `<p>A dispute has been opened on your order for <strong>"${jobTitle}"</strong>. You have <strong>72 hours</strong> to submit your response before it escalates to admin review.</p>`
          : `<p>Your dispute for <strong>"${jobTitle}"</strong> has been received and is now under review.</p>`
        }
        <a href="${APP_URL}/disputes/${disputeId}" class="btn">View Dispute</a>
      `),
    };
  },
};

async function sendTemplateEmail(to, templateName, data) {
  const fn = templates[templateName];
  if (!fn) return;
  const { subject, html } = fn(data);
  await sendEmail({ to, subject, html });
}

module.exports = { sendEmail, sendTemplateEmail };
