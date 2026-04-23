import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { authorEmail, postTitle, managementLink, isNewPost } = req.body

  const subject = isNewPost
    ? `Your post "${postTitle}" is live!`
    : `Someone wants to message you about "${postTitle}"`

  const html = isNewPost
    ? `<h2>Your post is live!</h2>
       <p>Your anonymous post <strong>"${postTitle}"</strong> has been published.</p>
       <p>Save this link to manage message requests:</p>
       <a href="${managementLink}">Manage My Post</a>`
    : `<h2>Someone wants to talk to you</h2>
       <p>A reader answered your secret question for <strong>"${postTitle}"</strong>.</p>
       <a href="${managementLink}">View Request</a>`

  try {
    await resend.emails.send({
      from: 'AnonShare <noreply@resend.dev>',
      to: authorEmail,
      subject,
      html
    })
    return res.status(200).json({ success: true })
  } catch (error) {
    return res.status(500).json({ error: 'Failed to send email' })
  }
}
