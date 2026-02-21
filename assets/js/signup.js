// assets/js/signup.js
(async function initSignupPage() {
  const sb = window.supabaseClient;

  // Already signed in → go to app
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    window.location.href = '/';
    return;
  }

  const emailEl = document.getElementById('email');
  const passEl = document.getElementById('password');
  const btn = document.getElementById('signupBtn');
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
      showError('Enter email and password');
      return;
    }

    if (password.length < 6) {
      showError('Password must be at least 6 characters');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Creating account…';

    const { data, error } = await sb.auth.signUp({ email, password });

    btn.disabled = false;
    btn.textContent = 'Sign up';

    if (error) {
      showError(error.message);
      return;
    }

    // Supabase may return a user without a session if email already exists (soft-deleted)
    if (!data.session) {
      showError('Account already exists. Try signing in instead.');
      return;
    }

    // Clear any leftover onboarding flag from previous account
    localStorage.removeItem('dumka_onboarded');

    // Success — redirect to welcome onboarding
    window.location.href = '/welcome.html';
  });
})();
