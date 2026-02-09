// assets/js/admin.js
(async function initAdmin() {
  const sb = window.supabaseClient;

  const adminLabel = document.getElementById('adminLabel');
  const logoutBtn = document.getElementById('logoutBtn');
  const createInviteBtn = document.getElementById('createInviteBtn');
  const refreshBtn = document.getElementById('refreshBtn');
  const tbody = document.getElementById('invitesTbody');
  const stats = document.getElementById('stats');
  const toast = document.getElementById('toast');
  const errorBox = document.getElementById('error');

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1600);
  }
  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.add('show');
  }
  function clearError() {
    errorBox.classList.remove('show');
    errorBox.textContent = '';
  }

  // 1) Перевірка сесії
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    window.location.href = '/login.html';
    return;
  }

  const user = session.user;
  adminLabel.textContent = user.email || user.id;

  // 2) Простий "гейт" на адміна (щоб не пускати будь-кого)
  //    Замінити на свій email(и).
  const ADMIN_EMAILS = [
    "your-admin@email.com"
  ];

  if (user.email && !ADMIN_EMAILS.includes(user.email)) {
    showError("Немає доступу: цей акаунт не адмін.");
    createInviteBtn.disabled = true;
  }

  // 3) Helpers
  const fmt = (iso) => new Date(iso).toLocaleString('uk-UA', { dateStyle: 'medium', timeStyle: 'short' });

  function makeCode(len = 8) {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let out = "";
    for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  function inviteLink(code) {
    // На Netlify це буде твій домен. Тут беремо поточний origin.
    return `${window.location.origin}/invite.html?code=${encodeURIComponent(code)}`;
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      showToast("Скопійовано");
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      showToast("Скопійовано");
    }
  }

  // 4) Load invites
  async function loadInvites() {
    clearError();
    tbody.innerHTML = `<tr><td colspan="4" class="muted">Завантаження…</td></tr>`;

    const { data, error } = await sb
      .from('invites')
      .select('id, code, created_at, created_by, used_at, used_by')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      tbody.innerHTML = `<tr><td colspan="4" class="muted">Помилка</td></tr>`;
      showError(error.message);
      return;
    }

    const invites = data || [];
    const unused = invites.filter(i => !i.used_at && !i.used_by).length;
    stats.textContent = `Всього: ${invites.length} • Невикористаних: ${unused} • Використаних: ${invites.length - unused}`;

    if (!invites.length) {
      tbody.innerHTML = `<tr><td colspan="4" class="muted">Інвайтів поки немає</td></tr>`;
      return;
    }

    tbody.innerHTML = "";

    invites.forEach(inv => {
      const tr = document.createElement('tr');

      const isUsed = !!(inv.used_at || inv.used_by);
      const statusHtml = isUsed
        ? `<span class="badge used">Used</span>`
        : `<span class="badge ok">Unused</span>`;

      tr.innerHTML = `
        <td class="code">${inv.code}</td>
        <td>${fmt(inv.created_at)}</td>
        <td>${statusHtml}</td>
        <td style="text-align:right; white-space:nowrap;">
          <button class="btn ghost" data-copy="${inv.code}">Копіювати лінк</button>
          <button class="btn" data-copycode="${inv.code}">Копіювати code</button>
        </td>
      `;

      tr.querySelector('[data-copy]')?.addEventListener('click', () => copy(inviteLink(inv.code)));
      tr.querySelector('[data-copycode]')?.addEventListener('click', () => copy(inv.code));

      tbody.appendChild(tr);
    });
  }

  // 5) Create invite
  async function createInvite() {
    clearError();
    createInviteBtn.disabled = true;

    const code = makeCode(8);

    const { error } = await sb.from('invites').insert({
      code,
      created_by: user.id,
      used_at: null,
      used_by: null
    });

    createInviteBtn.disabled = false;

    if (error) {
      showError(error.message);
      return;
    }

    showToast("Інвайт створено");
    await loadInvites();

    // одразу копіюємо лінк
    await copy(inviteLink(code));
  }

  // 6) Events
  refreshBtn.addEventListener('click', loadInvites);

  createInviteBtn.addEventListener('click', () => {
    if (createInviteBtn.disabled) return;
    createInvite();
  });

  logoutBtn.addEventListener('click', async () => {
    await sb.auth.signOut();
    window.location.href = '/login.html';
  });

  // initial
  await loadInvites();
})();
