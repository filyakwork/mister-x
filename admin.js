(() => {
  const { apiBase, icon, esc, safeMedia, applyContent, getContent } = window.MR_X;
  const dialog = document.querySelector('#admin-modal'),
    area = document.querySelector('#admin-body'),
    status = document.querySelector('#admin-status'),
    panel = document.querySelector('#owner-login-panel'),
    toggle = document.querySelector('#owner-login-toggle');
  let csrf = '',
    user = '',
    activeTab = 'cases',
    adminData = null,
    requests = [],
    lastFocus;
  const labels = {
    cases: 'Кейси',
    credentials: 'Освіта',
    testimonials: 'Відгуки',
    profile: 'Профіль',
    requests: 'Звернення',
  };
  async function request(route, method = 'GET', data) {
    const r = await fetch(apiBase + route, {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        ...(data ? { 'Content-Type': 'application/json' } : {}),
        ...(method !== 'GET' ? { 'X-CSRF-Token': csrf } : {}),
      },
      ...(data ? { body: JSON.stringify(data) } : {}),
      signal: AbortSignal.timeout(45000),
    });
    let out;
    try {
      out = await r.json();
    } catch {
      throw Error(
        'Кабінет потребує серверної частини. Запустіть сайт через npm start або розмістіть його на Node.js-хостингу.',
      );
    }
    if (!r.ok) {
      if (r.status === 401 && route !== '/api/admin/login' && route !== '/api/admin/session') {
        csrf = '';
        dialog.close();
        panel.hidden = false;
        toggle.setAttribute('aria-expanded', 'true');
        document.querySelector('#login-status').textContent = 'Сесію завершено. Увійдіть повторно.';
      }
      throw Error(out.error || 'Не вдалося виконати запит.');
    }
    return out;
  }
  async function refresh() {
    adminData = await request('/api/admin/content');
    applyContent(adminData);
    if (activeTab === 'requests') {
      const r = await request('/api/admin/requests');
      requests = r.items;
    }
    render();
  }
  async function openCabinet() {
    lastFocus = document.activeElement;
    status.textContent = 'Завантаження…';
    if (!dialog.open) dialog.showModal();
    document.body.style.overflow = 'hidden';
    document.querySelector('#admin-user').textContent = user;
    try {
      await refresh();
      status.textContent = 'Зміни зберігаються на сервері й публікуються на сайті.';
    } catch (e) {
      status.textContent = e.message;
    }
  }
  toggle.onclick = async () => {
    if (csrf) {
      await openCabinet();
      return;
    }
    try {
      const s = await request('/api/admin/session');
      csrf = s.csrf;
      user = s.email;
      await openCabinet();
      return;
    } catch {}
    panel.hidden = !panel.hidden;
    toggle.setAttribute('aria-expanded', String(!panel.hidden));
    if (!panel.hidden) document.querySelector('[name=ownerEmail]').focus();
  };
  document.querySelector('#owner-login-form').onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    if (!f.reportValidity()) return;
    const b = f.querySelector('[type=submit]'),
      message = document.querySelector('#login-status');
    b.disabled = true;
    message.textContent = 'Перевірка входу…';
    try {
      const s = await request('/api/admin/login', 'POST', {
        email: f.elements.ownerEmail.value,
        password: f.elements.ownerPassword.value,
      });
      csrf = s.csrf;
      user = s.email;
      f.elements.ownerPassword.value = '';
      panel.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      toggle.innerHTML = 'Відкрити кабінет ' + icon('arrow-up-right');
      message.textContent = '';
      await openCabinet();
    } catch (e) {
      message.textContent = e.message;
    } finally {
      b.disabled = false;
    }
  };
  document.querySelector('#admin-close').onclick = () => dialog.close();
  dialog.addEventListener('close', () => {
    document.body.style.overflow = '';
    lastFocus?.focus();
  });
  document.querySelector('#admin-logout').onclick = async () => {
    try {
      await request('/api/admin/logout', 'POST', {});
      csrf = '';
      user = '';
      dialog.close();
      toggle.innerHTML = 'Вхід для юриста ' + icon('arrow-up-right');
      status.textContent = '';
    } catch (e) {
      status.textContent = e.message;
    }
  };
  function render() {
    document.querySelector('#admin-tabs').innerHTML = Object.entries(labels)
      .map(
        ([id, label]) =>
          /* HTML */ `<button data-admin-tab="${id}" aria-pressed="${activeTab === id}">
            ${label}${id === 'requests' ? ` (${requests.length})` : ''}
          </button>`,
      )
      .join('');
    document.querySelectorAll('[data-admin-tab]').forEach(
      (b) =>
        (b.onclick = async () => {
          activeTab = b.dataset.adminTab;
          status.textContent = '';
          try {
            if (activeTab === 'requests') requests = (await request('/api/admin/requests')).items;
            render();
          } catch (e) {
            status.textContent = e.message;
          }
        }),
    );
    if (activeTab === 'profile') return renderProfile();
    if (activeTab === 'requests') return renderRequests();
    renderMaterials();
  }
  function renderMaterials() {
    const list = adminData[activeTab] || [],
      isCase = activeTab === 'cases',
      isEducation = activeTab === 'credentials';
    area.innerHTML = /* HTML */ `<div class="admin-grid">
      <form id="material-form">
        <h3>Додати: ${labels[activeTab].toLowerCase()}</h3>
        <p class="muted">
          Матеріали після збереження будуть відкриті відвідувачам. Приберіть персональні дані й
          переконайтеся, що маєте дозвіл на публікацію.
        </p>
        <label
          >Назва<input name="title" required maxlength="150" placeholder="Назва матеріалу" /></label
        ><label
          >${isEducation ? 'Тип документа' : 'Категорія або тема'}<input
            name="category"
            maxlength="100"
            placeholder="${isEducation ? 'Диплом, сертифікат, кваліфікація' : 'Назва галузі або тип питання'}" /></label
        ><label>Дата або рік<input name="date" maxlength="80" placeholder="За наявності" /></label
        ><label
          >Опис<textarea
            name="description"
            rows="3"
            required
            maxlength="10000"
            placeholder="Опис матеріалу для відвідувачів"
          ></textarea></label
        >${isCase ? /* HTML */ `<label>Ситуація<textarea name="problem" rows="2" maxlength="5000"></textarea></label><label>Виконана робота<textarea name="work" rows="2" maxlength="5000"></textarea></label><label>Фактичний результат<textarea name="result" rows="2" maxlength="5000"></textarea></label>` : ''}<label
          >${isEducation ? 'Документ або зображення' : 'Зображення'}<input
            id="material-file"
            name="file"
            type="file"
            required
            accept="image/png,image/jpeg,image/webp${isEducation ? ',application/pdf' : ''}"
        /></label>
        <p class="muted">PNG, JPEG, WebP${isEducation ? ' або PDF' : ''}. До 8 МБ.</p>
        <div id="file-preview"></div>
        <button class="button" type="submit">
          Зберегти й опублікувати ${icon('arrow-up-right')}
        </button>
      </form>
      <div>
        <h3>Опубліковані матеріали (${list.length})</h3>
        <div class="admin-list">
          ${
            list.length
              ? list
                  .map(
                    (x) =>
                      /* HTML */ `<article class="admin-item">
                        ${x.file.endsWith('.pdf') ? /* HTML */ `<span class="admin-file-icon">PDF</span>` : /* HTML */ `<img src="${safeMedia(x.file)}" alt="${esc(x.title)}" />`}
                        <div>
                          <h4>${esc(x.title)}</h4>
                          <p>${esc(x.description)}</p>
                          <button class="admin-button" data-delete="${esc(x.id)}">Видалити</button>
                        </div>
                      </article>`,
                  )
                  .join('')
              : /* HTML */ `<p class="muted">Матеріалів ще немає.</p>`
          }
        </div>
      </div>
    </div>`;
    let previewURL = '';
    document.querySelector('#material-file').onchange = (e) => {
      if (previewURL) URL.revokeObjectURL(previewURL);
      const f = e.target.files[0],
        preview = document.querySelector('#file-preview');
      preview.innerHTML = '';
      if (!f) return;
      if (f.size > 8 * 1024 * 1024) {
        status.textContent = 'Файл перевищує 8 МБ.';
        e.target.value = '';
        return;
      }
      if (f.type === 'application/pdf') {
        preview.textContent = 'Вибрано PDF: ' + f.name;
        return;
      }
      previewURL = URL.createObjectURL(f);
      const im = document.createElement('img');
      im.src = previewURL;
      im.alt = 'Попередній перегляд';
      preview.append(im);
    };
    document.querySelector('#material-form').onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target;
      if (!f.reportValidity()) return;
      const button = f.querySelector('[type=submit]'),
        collection = activeTab,
        file = f.elements.file.files[0];
      if (!file || file.size > 8 * 1024 * 1024) {
        status.textContent = 'Виберіть файл до 8 МБ.';
        return;
      }
      button.disabled = true;
      status.textContent = 'Завантаження файла…';
      try {
        const data = await readBase64(file);
        const upload = await request('/api/admin/upload', 'POST', { data });
        const item = Object.fromEntries(new FormData(f));
        delete item.file;
        item.file = upload.file;
        status.textContent = 'Збереження матеріалу…';
        const out = await request('/api/admin/content', 'POST', { collection, item });
        if (previewURL) URL.revokeObjectURL(previewURL);
        adminData = out.content;
        applyContent(out.content);
        render();
        status.textContent =
          'Матеріал опубліковано. Відвідувачі побачать його одразу при відкритті сайту або протягом 5 секунд на вже відкритій сторінці.';
      } catch (e) {
        status.textContent = e.message;
        button.disabled = false;
      }
    };
    document.querySelectorAll('[data-delete]').forEach(
      (b) =>
        (b.onclick = async () => {
          if (!b.dataset.confirm) {
            b.dataset.confirm = 'true';
            b.textContent = 'Підтвердити видалення';
            return;
          }
          b.disabled = true;
          try {
            const out = await request(
              `/api/admin/content/${activeTab}/${b.dataset.delete}`,
              'DELETE',
            );
            adminData = out.content;
            applyContent(out.content);
            render();
            status.textContent = 'Матеріал і пов’язаний файл видалено із публікації.';
          } catch (e) {
            status.textContent = e.message;
            b.disabled = false;
          }
        }),
    );
  }
  function readBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(',')[1]);
      r.onerror = () => reject(Error('Не вдалося прочитати файл.'));
      r.readAsDataURL(file);
    });
  }
  function renderProfile() {
    const p = adminData.profile || {};
    area.innerHTML = /* HTML */ `<form id="profile-form" class="profile-form">
      <h3>Публічні дані практики</h3>
      <p class="muted">Це дані для відвідувачів. Вони не змінюють email і пароль входу.</p>
      <label
        >Досвід<input
          name="experience"
          maxlength="100"
          value="${esc(p.experience)}"
          placeholder="Наприклад: підтверджені роки практики" /></label
      ><label
        >Відсоток успішних справ<input
          name="successRate"
          type="number"
          min="0"
          max="100"
          step="0.01"
          value="${esc(p.successRate)}"
          placeholder="Лише підтверджений показник" /></label
      ><label
        >Період і спосіб розрахунку<textarea
          name="successNote"
          maxlength="600"
          rows="3"
          placeholder="Вкажіть період, кількість справ і визначення успішного результату"
        >
${esc(p.successNote)}</textarea></label
      ><label
        >Публічний email<input
          name="email"
          type="email"
          value="${esc(p.email)}"
          maxlength="254" /></label
      ><label>Телефон<input name="phone" value="${esc(p.phone)}" maxlength="100" /></label
      ><label>Місто<input name="city" value="${esc(p.city)}" maxlength="200" /></label
      ><button class="button" type="submit">Зберегти дані ${icon('arrow-up-right')}</button>
    </form>`;
    document.querySelector('#profile-form').onsubmit = async (e) => {
      e.preventDefault();
      if (!e.target.reportValidity()) return;
      const b = e.target.querySelector('[type=submit]');
      b.disabled = true;
      try {
        const out = await request(
          '/api/admin/profile',
          'PUT',
          Object.fromEntries(new FormData(e.target)),
        );
        adminData = out.content;
        applyContent(out.content);
        status.textContent = 'Публічні дані оновлено.';
      } catch (e) {
        status.textContent = e.message;
      } finally {
        b.disabled = false;
      }
    };
  }
  function renderRequests() {
    area.innerHTML = /* HTML */ `<div class="requests-heading">
        <h3>Приватні звернення (${requests.length})</h3>
        <button id="refresh-requests" class="admin-button">Оновити</button>
      </div>
      <p class="muted">Ці дані доступні тільки після входу власника. Сайт не публікує їх.</p>
      <div class="request-list">
        ${
          requests.length
            ? requests
                .map(
                  (x) =>
                    /* HTML */ `<article class="request-item">
                      <p class="eyebrow">${esc(new Date(x.createdAt).toLocaleString('uk-UA'))}</p>
                      <h3>${esc(x.name)}</h3>
                      <p><strong>Контакт:</strong> ${esc(x.contact)}</p>
                      <p><strong>Тема:</strong> ${esc(x.topic || 'Інше питання')}</p>
                      <p class="request-message">${esc(x.message)}</p>
                      <p class="mail-status">
                        Пошта:
                        ${x.emailStatus === 'sent' ? 'поштовий сервер прийняв лист' : x.emailStatus === 'failed' ? 'помилка надсилання' : 'не налаштована або лист ще не надіслано'}
                      </p>
                      ${x.emailStatus !== 'sent' ? /* HTML */ `<button class="admin-button" data-resend-email="${esc(x.id)}">Надіслати лист повторно</button>` : ''}<button
                        class="admin-button"
                        data-delete-request="${esc(x.id)}"
                      >
                        Видалити звернення
                      </button>
                    </article>`,
                )
                .join('')
            : /* HTML */ `<p>Нових звернень немає.</p>`
        }
      </div>`;
    document.querySelector('#refresh-requests').onclick = async () => {
      try {
        requests = (await request('/api/admin/requests')).items;
        render();
        status.textContent = 'Список оновлено.';
      } catch (e) {
        status.textContent = e.message;
      }
    };
    document.querySelectorAll('[data-resend-email]').forEach((button) => {
      button.onclick = async () => {
        button.disabled = true;
        status.textContent = 'Надсилання листа…';
        try {
          const out = await request(
            '/api/admin/requests/' + button.dataset.resendEmail + '/email',
            'POST',
            {},
          );
          requests = (await request('/api/admin/requests')).items;
          render();
          status.textContent = out.emailSent
            ? 'Поштовий сервер прийняв лист для власника.'
            : out.emailStatus === 'unconfigured'
              ? 'Налаштуйте SMTP на сервері. Звернення збережено в кабінеті.'
              : 'Не вдалося надіслати лист. Перевірте поштові налаштування. Звернення збережено.';
        } catch (exception) {
          status.textContent = exception.message;
          button.disabled = false;
        }
      };
    });
    document.querySelectorAll('[data-delete-request]').forEach(
      (b) =>
        (b.onclick = async () => {
          if (!b.dataset.confirm) {
            b.dataset.confirm = 'true';
            b.textContent = 'Підтвердити видалення';
            return;
          }
          try {
            await request('/api/admin/requests/' + b.dataset.deleteRequest, 'DELETE');
            requests = requests.filter((x) => x.id !== b.dataset.deleteRequest);
            render();
            status.textContent = 'Звернення видалено.';
          } catch (e) {
            status.textContent = e.message;
          }
        }),
    );
  }
})();
