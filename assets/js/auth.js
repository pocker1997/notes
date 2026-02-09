// assets/js/auth.js
(async function initAuthPage() {
  const sb = window.supabaseClient;

  // Якщо вже залогінений — на головну
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    window.location.href = '/';
    return;
  }

  const emailEl = document.getElementById('email');
  const passEl = document.getElementById('password');
  const btn = document.getElementById('loginBtn');
  const err = document.getElementById('error');

  function showError(msg) {
    err.textContent = msg;
    err.classList.add('show');
  }

  btn?.addEventListener('click', async () => {
    err.classList.remove('show');

    const email = emailEl.value.trim();
    const password = passEl.value;

    if (!email || !password) {
      showError('Введи email та password');
      return;
    }

    btn.disabled = true;

    const { error } = await sb.auth.signInWithPassword({ email, password });

    btn.disabled = false;

    if (error) {
      showError(error.message);
      return;
    }

    window.location.href = '/';
  });
})();
