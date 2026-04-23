import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://eqfkottylawzhgrmsgri.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxZmtvdHR5bGF3emhncm1zZ3JpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NzAyNjQsImV4cCI6MjA5MjQ0NjI2NH0.jJz9S_MATyqSJY0hfMa7N9MAWdZqKuxm0X851q5qXxk'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function generateToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

function getPage() {
  return window.location.pathname.split('/').pop()
}

// DARK/LIGHT MODE
window.toggleTheme = function() {
  const html = document.documentElement
  const btn = document.querySelector('.theme-toggle')
  if (html.getAttribute('data-theme') === 'dark') {
    html.setAttribute('data-theme', 'light')
    btn.textContent = '☀️ Light'
    localStorage.setItem('theme', 'light')
  } else {
    html.setAttribute('data-theme', 'dark')
    btn.textContent = '🌙 Dark'
    localStorage.setItem('theme', 'dark')
  }
}

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'dark'
document.documentElement.setAttribute('data-theme', savedTheme)
const themeBtn = document.querySelector('.theme-toggle')
if (themeBtn) themeBtn.textContent = savedTheme === 'dark' ? '🌙 Dark' : '☀️ Light'

// INDEX PAGE
if (getPage() === 'index.html' || getPage() === '') {
  loadPosts()
}

async function loadPosts() {
  const { data, error } = await supabase
    .from('posts')
    .select('id, title, image_url, created_at')
    .order('created_at', { ascending: false })

  const container = document.getElementById('posts-container')

  if (error || !data || data.length === 0) {
    container.innerHTML = '<p class="empty">No posts yet. Be the first to share!</p>'
    return
  }

  container.innerHTML = ''

  for (const post of data) {
    const likesRes = await supabase.from('reactions').select('id', { count: 'exact' }).eq('post_id', post.id).eq('type', 'like')
    const dislikesRes = await supabase.from('reactions').select('id', { count: 'exact' }).eq('post_id', post.id).eq('type', 'dislike')
    const commentsRes = await supabase.from('comments').select('id', { count: 'exact' }).eq('post_id', post.id)

    const likes = likesRes.count || 0
    const dislikes = dislikesRes.count || 0
    const commentCount = commentsRes.count || 0

    const card = document.createElement('div')
    card.className = 'post-card'
    card.innerHTML = `
      ${post.image_url ? `<img src="${post.image_url}" alt="post image" />` : ''}
      <div class="post-card-body">
        <p class="post-date">${new Date(post.created_at).toLocaleDateString()}</p>
        <h3>${post.title}</h3>
        <div class="post-card-actions">
          <button onclick="openDescription('${post.id}', '${post.title}')">📖 Read</button>
          <button onclick="openComments('${post.id}')">💬 ${commentCount}</button>
          <button onclick="openMessage('${post.id}')">✉️ Message</button>
        </div>
        <div class="reactions">
          <button class="react-btn" id="like-${post.id}" onclick="react('${post.id}', 'like')">👍 <span id="like-count-${post.id}">${likes}</span></button>
          <button class="react-btn" id="dislike-${post.id}" onclick="react('${post.id}', 'dislike')">👎 <span id="dislike-count-${post.id}">${dislikes}</span></button>
        </div>
      </div>
    `
    container.appendChild(card)
  }
}

// REACTIONS
window.react = async function(postId, type) {
  await supabase.from('reactions').insert({ post_id: postId, type })

  const likesRes = await supabase.from('reactions').select('id', { count: 'exact' }).eq('post_id', postId).eq('type', 'like')
  const dislikesRes = await supabase.from('reactions').select('id', { count: 'exact' }).eq('post_id', postId).eq('type', 'dislike')

  document.getElementById('like-count-' + postId).textContent = likesRes.count || 0
  document.getElementById('dislike-count-' + postId).textContent = dislikesRes.count || 0

  if (type === 'like') {
    document.getElementById('like-' + postId).classList.add('liked')
    document.getElementById('dislike-' + postId).classList.remove('disliked')
  } else {
    document.getElementById('dislike-' + postId).classList.add('disliked')
    document.getElementById('like-' + postId).classList.remove('liked')
  }
}

// OPEN DESCRIPTION
window.openDescription = async function(postId, title) {
  const { data } = await supabase.from('posts').select('body').eq('id', postId).single()
  document.getElementById('modal-title').textContent = title
  document.getElementById('modal-body').textContent = data.body
  document.getElementById('desc-modal').classList.remove('hidden')
}

// COMMENTS
let currentCommentPostId = null

window.openComments = async function(postId) {
  currentCommentPostId = postId
  document.getElementById('comment-name').value = ''
  document.getElementById('comment-body').value = ''
  document.getElementById('comment-feedback').textContent = ''
  document.getElementById('comments-modal').classList.remove('hidden')
  loadComments(postId)
}

async function loadComments(postId) {
  const { data } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  const list = document.getElementById('comments-list')

  if (!data || data.length === 0) {
    list.innerHTML = '<p class="empty" style="padding:1rem 0">No comments yet. Be the first!</p>'
    return
  }

  list.innerHTML = data.map(c => `
    <div class="comment-item">
      <div class="comment-author">${c.name || 'Anonymous'}</div>
      <div class="comment-text">${c.body}</div>
      <div class="comment-date">${new Date(c.created_at).toLocaleString()}</div>
    </div>
  `).join('')
}

window.submitComment = async function() {
  const name = document.getElementById('comment-name').value.trim()
  const body = document.getElementById('comment-body').value.trim()
  const feedback = document.getElementById('comment-feedback')

  if (!body) {
    feedback.textContent = 'Please write a comment first.'
    feedback.className = 'feedback error'
    return
  }

  const { error } = await supabase.from('comments').insert({
    post_id: currentCommentPostId,
    name: name || null,
    body
  })

  if (error) {
    feedback.textContent = 'Something went wrong. Try again.'
    feedback.className = 'feedback error'
    return
  }

  feedback.textContent = '✅ Comment posted!'
  feedback.className = 'feedback success'
  document.getElementById('comment-body').value = ''
  document.getElementById('comment-name').value = ''
  loadComments(currentCommentPostId)
}

// MESSAGE
let currentPostId = null

window.openMessage = async function(postId) {
  currentPostId = postId
  const savedToken = localStorage.getItem('reader_token_' + postId)
  if (savedToken) { checkRequestStatus(postId, savedToken); return }
  const { data } = await supabase.from('posts').select('secret_question').eq('id', postId).single()
  document.getElementById('question-text').textContent = data.secret_question
  document.getElementById('answer-input').value = ''
  document.getElementById('answer-feedback').textContent = ''
  document.getElementById('msg-modal').classList.remove('hidden')
}

window.submitAnswer = async function() {
  const userAnswer = document.getElementById('answer-input').value.trim()
  const feedback = document.getElementById('answer-feedback')
  if (!userAnswer) { feedback.textContent = 'Please enter an answer.'; feedback.className = 'feedback error'; return }
  const { data } = await supabase.from('posts').select('secret_answer, contact_info, author_email, title, management_token').eq('id', currentPostId).single()
  if (userAnswer.toLowerCase() !== data.secret_answer.toLowerCase()) { feedback.textContent = '❌ Wrong answer. Try again!'; feedback.className = 'feedback error'; return }
  const readerToken = generateToken()
  const { error } = await supabase.from('requests').insert({ post_id: currentPostId, status: 'pending', contact_info: data.contact_info, reader_token: readerToken })
  if (error) { feedback.textContent = 'Something went wrong.'; feedback.className = 'feedback error'; return }
  localStorage.setItem('reader_token_' + currentPostId, readerToken)
  const managementLink = `${window.location.origin}/manage.html?token=${data.management_token}`
  await fetch('/api/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ authorEmail: data.author_email, postTitle: data.title, managementLink }) })
  feedback.textContent = '✅ Request sent! The author will be notified.'
  feedback.className = 'feedback success'
  document.getElementById('answer-input').disabled = true
}

async function checkRequestStatus(postId, readerToken) {
  const { data } = await supabase.from('requests').select('status, contact_info').eq('post_id', postId).eq('reader_token', readerToken).single()
  const statusText = document.getElementById('status-text')
  if (!data) { statusText.textContent = 'Request not found.' }
  else if (data.status === 'pending') { statusText.innerHTML = '<span class="status-pending">⏳ Still pending. The author has not responded yet.</span>' }
  else if (data.status === 'accepted') { statusText.innerHTML = `<span class="status-accepted">✅ Accepted! Contact: <strong>${data.contact_info}</strong></span>` }
  else if (data.status === 'rejected') { statusText.innerHTML = '<span class="status-rejected">❌ The author declined your request.</span>' }
  document.getElementById('status-modal').classList.remove('hidden')
}

window.closeModal = function(id) { document.getElementById(id).classList.add('hidden') }

// CREATE POST
if (getPage() === 'create.html') {
  window.createPost = async function() {
    const title = document.getElementById('title').value.trim()
    const body = document.getElementById('body').value.trim()
    const secret_question = document.getElementById('secret_question').value.trim()
    const secret_answer = document.getElementById('secret_answer').value.trim()
    const contact_info = document.getElementById('contact_info').value.trim()
    const author_email = document.getElementById('author_email').value.trim()
    const photoFile = document.getElementById('photo').files[0]
    const feedback = document.getElementById('post-feedback')
    if (!title || !body || !secret_question || !secret_answer || !contact_info || !author_email) { feedback.textContent = 'Please fill in all required fields.'; feedback.className = 'feedback error'; return }
    feedback.textContent = 'Publishing...'; feedback.className = 'feedback'
    let image_url = null
    if (photoFile) {
      const fileName = `${generateToken()}-${photoFile.name}`
      const { error: uploadError } = await supabase.storage.from('post-images').upload(fileName, photoFile)
      if (!uploadError) { const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(fileName); image_url = urlData.publicUrl }
    }
    const management_token = generateToken()
    const { error } = await supabase.from('posts').insert({ title, body, secret_question, secret_answer: secret_answer.toLowerCase(), contact_info, author_email, image_url, management_token })
    if (error) { feedback.textContent = 'Something went wrong. Please try again.'; feedback.className = 'feedback error'; return }
    const managementLink = `${window.location.origin}/manage.html?token=${management_token}`
    await fetch('/api/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ authorEmail: author_email, postTitle: title, managementLink, isNewPost: true }) })
    feedback.textContent = '✅ Posted! Check your email for your management link.'
    feedback.className = 'feedback success'
  }
}

// MANAGE PAGE
if (getPage() === 'manage.html') {
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token')
  if (!token) { document.getElementById('requests-container').innerHTML = '<p class="empty">Invalid management token.</p>' }
  else { loadRequests(token) }
}

async function loadRequests(token) {
  const { data: post } = await supabase.from('posts').select('id, title').eq('management_token', token).single()
  if (!post) { document.getElementById('requests-container').innerHTML = '<p class="empty">Post not found.</p>'; return }
  const { data: requests } = await supabase.from('requests').select('*').eq('post_id', post.id).order('created_at', { ascending: false })
  const container = document.getElementById('requests-container')
  if (!requests || requests.length === 0) { container.innerHTML = `<p class="empty">No requests yet for: <strong>${post.title}</strong></p>`; return }
  container.innerHTML = `<p style="margin-bottom:1rem;color:var(--muted);font-size:0.9rem">Post: <strong style="color:var(--text)">${post.title}</strong></p>
    ${requests.map(req => `<div class="request-card" id="req-${req.id}">
      <h4>Request from an anonymous reader</h4>
      <p>Received: ${new Date(req.created_at).toLocaleString()}</p>
      <p>Status: <span class="status-${req.status}">${req.status}</span></p>
      ${req.status === 'pending' ? `<div class="request-actions"><button class="btn-green" onclick="respondToRequest('${req.id}', 'accepted')">✅ Accept</button><button class="btn-red" onclick="respondToRequest('${req.id}', 'rejected')">❌ Reject</button></div>` : ''}
    </div>`).join('')}`
}

window.respondToRequest = async function(requestId, status) {
  await supabase.from('requests').update({ status }).eq('id', requestId)
  const card = document.getElementById('req-' + requestId)
  card.querySelector('.request-actions')?.remove()
  card.querySelector('p:last-of-type').innerHTML = `Status: <span class="status-${status}">${status}</span>`
}
