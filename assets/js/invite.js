// assets/js/invite.js
(async function processInvite() {
  const sb = window.supabaseClient;

  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');

  const loading = document.getElementById('loading');
  const welcomeScreen = document.getElementById('welcomeScreen');
  const errorScreen = document.getElementById('errorScreen');

  function showError() {
    loading.style.display = 'none';
    errorScreen.classList.add('show');
  }

  if (!code) {
    showError();
    return;
  }

  // Перевіряємо, що інвайт існує і ще не використаний
  const { data: invites, error } = await sb
    .from('invites')
    .select('*')
    .eq('code', code);

  if (error) {
    console.error('Fetch error:', error);
    showError();
    return;
  }

  const invite = invites && invites.find(inv => inv.used_by === null || inv.used_by === undefined);
  if (!invite) {
    showError();
    return;
  }

  // ВАЖЛИВО: тут більше НІЯКОГО signUp
  // Просто показуємо welcome, і відправляємо на login
  loading.style.display = 'none';
  welcomeScreen.style.display = 'block';

  setTimeout(() => {
    welcomeScreen.classList.add('fade-out');
    setTimeout(() => {
      window.location.href = '/login.html';
    }, 1500);
  }, 1000);
})();
