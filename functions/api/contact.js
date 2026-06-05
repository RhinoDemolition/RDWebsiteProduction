const RECIPIENT = 'enquiries@rhinodemolition.com.au';
const FROM      = 'Rhino Demolition <noreply@rhinodemolition.com.au>';
const MAX_FIELD  = 256;
const MAX_MSG    = 5000;
const EMAIL_RE   = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function onRequestPost(context) {
  const { request, env } = context;

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return json({ success: false, error: 'Invalid request format.' }, 400);
  }

  const get = (k) => (formData.get(k) ?? '').toString().trim();

  // Honeypot — bots fill this, humans leave it blank
  if (get('website')) {
    return json({ success: false, error: 'Submission rejected.' }, 400);
  }

  const firstname = get('firstname');
  const lastname  = get('lastname');
  const email     = get('email');
  const phone     = get('phone');
  const mobile    = get('mobile');
  const comment   = get('comment');
  const formType  = get('form_type') || 'contact';

  if (!firstname || !lastname || !email || !comment) {
    return json({
      success: false,
      error: 'Please fill in all required fields: First name, Last name, Email, and Enquiry.',
    }, 400);
  }

  if (
    firstname.length > MAX_FIELD ||
    lastname.length  > MAX_FIELD ||
    email.length     > MAX_FIELD ||
    comment.length   > MAX_MSG
  ) {
    return json({ success: false, error: 'Input exceeds maximum allowed length.' }, 400);
  }

  if (!EMAIL_RE.test(email)) {
    return json({ success: false, error: 'Please enter a valid email address.' }, 400);
  }

  const isCareer = formType === 'careers';
  const subject  = isCareer
    ? `Career Enquiry — ${firstname} ${lastname}`
    : `Contact Enquiry — ${firstname} ${lastname}`;

  const text = [
    `New ${isCareer ? 'Career' : 'Contact'} Enquiry via rhinodemolition.com.au`,
    '',
    `Name:   ${firstname} ${lastname}`,
    `Email:  ${email}`,
    `Phone:  ${phone  || '—'}`,
    `Mobile: ${mobile || '—'}`,
    '',
    'Message:',
    comment,
  ].join('\n');

  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY not set');
    return json({
      success: false,
      error: 'Email service unavailable. Please call (02) 9790 6067 or email enquiries@rhinodemolition.com.au.',
    }, 500);
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: [RECIPIENT],
      reply_to: email,
      subject,
      text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('Resend API error', res.status, body);
    return json({
      success: false,
      error: 'Failed to send your enquiry. Please call (02) 9790 6067 or email enquiries@rhinodemolition.com.au.',
    }, 500);
  }

  return json({
    success: true,
    message: 'Thank you for your enquiry. We will be in touch shortly.',
  }, 200);
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
