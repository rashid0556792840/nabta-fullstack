// Unit 3: JavaScript logic, DOM, RegExp and secure form handling (no frameworks)
'use strict';

// Escapes text so it can never be interpreted as HTML (prevents script injection)
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Removes tags entirely, then trims
function sanitize(value) {
  return String(value).replace(/<[^>]*>/g, '').trim();
}

const PATTERNS = {
  name: /^[A-Za-z؀-ۿ][A-Za-z؀-ۿ\s.'-]{1,59}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  phone: /^\+?[0-9\s-]{7,20}$/,
};

// ----- Kabsa spice calculator (maths) -----
const spiceForm = document.getElementById('spice-form');
if (spiceForm) {
  spiceForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const servings = Number(document.getElementById('servings').value);
    const out = document.getElementById('spice-result');
    if (!Number.isInteger(servings) || servings < 1 || servings > 100) {
      alert('Please enter a whole number of servings between 1 and 100.');
      return;
    }
    // House rule of thumb: about 5 g of kabsa mix and 125 g of rice per serving
    const spiceGrams = servings * 5;
    const riceKg = (servings * 125) / 1000;
    const bags = Math.ceil(spiceGrams / 250); // the mix is sold in 250 g bags
    out.textContent = `About ${spiceGrams} g of kabsa mix (${bags} bag${bags === 1 ? '' : 's'} of 250 g) and ${riceKg.toFixed(2)} kg of rice.`;
  });
}

// ----- Contact form -----
const contactForm = document.getElementById('contact-form');
if (contactForm) {
  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(contactForm));
    const problems = [];

    // 1) Native HTML validation first
    if (!contactForm.checkValidity()) {
      contactForm.querySelectorAll(':invalid').forEach((el) => {
        const label = contactForm.querySelector(`label[for="${el.id}"]`);
        problems.push(`${label ? label.textContent : el.name}: ${el.validationMessage}`);
      });
    }

    // 2) Extra checks with regular expressions
    if (!PATTERNS.name.test(data.name.trim())) problems.push('Name: letters, spaces, apostrophes and hyphens only.');
    if (!PATTERNS.email.test(data.email.trim())) problems.push('Email: please enter a valid address.');
    if (data.phone && !PATTERNS.phone.test(data.phone.trim())) problems.push('Phone: digits, spaces, + and - only.');
    if (/<\s*script/i.test(data.message)) problems.push('Message: HTML or script tags are not allowed.');

    const errorBox = document.getElementById('errors');
    if (problems.length) {
      errorBox.textContent = [...new Set(problems)].join('\n'); // textContent never runs HTML
      errorBox.hidden = false;
      return;
    }
    errorBox.hidden = true;

    if (!confirm('Send this message to the Nabta team?')) return;

    // 3) Show the cleaned values safely
    const list = document.getElementById('preview-list');
    list.innerHTML = Object.entries(data)
      .map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(sanitize(v))}</dd>`)
      .join('');
    document.getElementById('preview').hidden = false;
    contactForm.reset();
  });
}
