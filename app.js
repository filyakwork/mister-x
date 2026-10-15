const cfg = window.SITE_CONFIG || {};
const apiBase = (cfg.apiBase || '').replace(/\/$/, '');
const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const safeMedia = (s) =>
  typeof s === 'string' &&
  (/^\/uploads\/[a-f0-9]{32}\.(png|jpg|webp|pdf)$/.test(s) || /^images\/[a-z0-9-]+\.webp$/.test(s))
    ? s
    : '';
// Service catalogue and categories. Edit descriptions here.
const { groups, services, demoCases, faq } = window.MR_SITE_DATA;
const { icon } = window.MR_ICONS;
let live = {
    version: 0,
    cases: [],
    credentials: cfg.credentials || [],
    testimonials: cfg.testimonials || [],
    profile: {},
  },
  backend = false,
  caseIndex = 0,
  documentIndex = 0,
  reviewIndex = 0;
const modal = document.querySelector('#modal'),
  mc = document.querySelector('#modal-content');
let previousFocus;
function openModal(html) {
  previousFocus = document.activeElement;
  mc.innerHTML = html;
  modal.showModal();
  document.body.style.overflow = 'hidden';
  modal.querySelector('.modal-close').focus();
}
function closeModal() {
  modal.close();
}
modal.querySelector('.modal-close').onclick = closeModal;
modal.addEventListener('close', () => {
  document.body.style.overflow = '';
  previousFocus?.focus();
});
modal.addEventListener('click', (e) => {
  if (e.target === modal) {
    const r = modal.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
      closeModal();
  }
});
let currentServiceGroup = 'all';
let currentServicePage = 0;

function servicePageSize() {
  return innerWidth <= 480 ? 2 : innerWidth <= 800 ? 4 : 6;
}

function renderServices(group = 'all', page = 0) {
  currentServiceGroup = group;
  document.querySelector('#service-filters').innerHTML = groups
    .map(
      ([id, label]) =>
        /* HTML */ `<button data-group="${id}" aria-pressed="${id === group}">${label}</button>`,
    )
    .join('');
  const matches = services
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => group === 'all' || s[1] === group);
  const pageSize = servicePageSize();
  const pages = Math.max(1, Math.ceil(matches.length / pageSize));
  currentServicePage = Math.max(0, Math.min(page, pages - 1));
  const start = currentServicePage * pageSize;
  const visible = matches.slice(start, start + pageSize);
  document.querySelector('#service-count').textContent =
    `Показано ${start + 1}–${Math.min(start + pageSize, matches.length)} з ${matches.length} напрямів`;
  document.querySelector('#services-page').textContent =
    `Сторінка ${currentServicePage + 1} / ${pages}`;
  document.querySelector('#prev-services').disabled = pages <= 1;
  document.querySelector('#next-services').disabled = pages <= 1;
  document.querySelector('#prev-services').onclick = () =>
    renderServices(group, (currentServicePage - 1 + pages) % pages);
  document.querySelector('#next-services').onclick = () =>
    renderServices(group, (currentServicePage + 1) % pages);
  document.querySelector('#services').innerHTML = visible
    .map(
      ({ s, i }) =>
        /* HTML */ `<button class="service" data-service="${i}" aria-label="Докладніше: ${s[0]}">
          <div class="image-wrap">
            <img loading="lazy" src="images/${s[2]}.webp" alt="Тематичне зображення" />
          </div>
          <div class="service-heading">
            <span>${String(i + 1).padStart(2, '0')}</span>
            <h3>${s[0]}</h3>
            <b>${icon('arrow-up-right')}</b>
          </div>
          <p>${s[3]}</p>
        </button>`,
    )
    .join('');
  document.querySelectorAll('[data-group]').forEach(
    (b) =>
      (b.onclick = () => {
        renderServices(b.dataset.group);
        document.querySelector(`[data-group="${b.dataset.group}"]`).focus({ preventScroll: true });
      }),
  );
  document.querySelectorAll('[data-service]').forEach(
    (b) =>
      (b.onclick = () => {
        const s = services[+b.dataset.service];
        openModal(
          /* HTML */ `<p class="eyebrow">ЮРИДИЧНА ПОСЛУГА</p>
            <h2>${esc(s[0])}</h2>
            <p>${esc(s[4])}</p>
            <p class="muted">
              Можливість надання послуги потрібно погодити з юристом відповідно до його
              спеціалізації та статусу.
            </p>
            <button class="button" id="discuss">
              Зробити звернення ${icon('arrow-up-right')}
            </button>`,
        );
        document.querySelector('#discuss').onclick = () => {
          document.querySelector('[name=topic]').value = s[0];
          closeModal();
          document.querySelector('#contact').scrollIntoView({ behavior: 'smooth' });
          document.querySelector('[name=name]').focus({ preventScroll: true });
        };
      }),
  );
}
renderServices();
document.querySelector('[name=topic]').innerHTML =
  /* HTML */ `<option>Інше питання</option>` +
  services.map((s) => /* HTML */ `<option>${esc(s[0])}</option>`).join('');
function actualCases() {
  return live.cases.length ? live.cases : demoCases;
}
// Public galleries retain their current item when refreshed.
function renderCases() {
  const list = actualCases();
  caseIndex = Math.max(0, Math.min(caseIndex, list.length - 1));
  const count = innerWidth <= 800 ? 1 : Math.min(2, list.length);
  const chosen = Array.from({ length: count }, (_, i) => ({
    c: list[(caseIndex + i) % list.length],
    i: (caseIndex + i) % list.length,
  }));
  document.querySelector('#case-note').textContent = live.cases.length
    ? 'Опубліковані юристом матеріали. Конфіденційні дані мають бути анонімізовані.'
    : 'Умовні приклади. Не реальні справи або обіцянки результату.';
  document.querySelector('#case-grid').innerHTML = chosen
    .map(
      ({ c, i }) =>
        /* HTML */ `<article class="case-card">
          <img loading="lazy" src="${safeMedia(c.file)}" alt="${esc(c.title)}" />
          <div>
            <p class="eyebrow">
              ${esc(c.category || 'ЮРИДИЧНА СПРАВА')} ${c.demo ? '/ УМОВНИЙ ПРИКЛАД' : ''}
            </p>
            <h3>${esc(c.title)}</h3>
            <p>${esc(c.description)}</p>
            <button data-case="${i}">Детальніше ${icon('arrow-up-right')}</button>
          </div>
        </article>`,
    )
    .join('');
  document.querySelector('#case-count').textContent = `${caseIndex + 1} / ${list.length}`;
  document.querySelector('#prev-case').disabled = document.querySelector('#next-case').disabled =
    list.length <= count;
  document.querySelectorAll('[data-case]').forEach(
    (b) =>
      (b.onclick = () => {
        const c = list[+b.dataset.case];
        openModal(
          /* HTML */ `<p class="eyebrow">
              ${c.demo ? 'УМОВНИЙ ПРИКЛАД' : esc(c.category || 'КЕЙС')}
            </p>
            <h2>${esc(c.title)}</h2>
            <img src="${safeMedia(c.file)}" alt="${esc(c.title)}" />
            <p>${esc(c.description)}</p>
            ${[
              ['Ситуація', c.problem],
              ['Виконана робота', c.work],
              ['Результат', c.result],
            ]
              .filter((x) => x[1])
              .map(
                ([label, text]) =>
                  /* HTML */ `<h3>${label}</h3>
                    <p>${esc(text)}</p>`,
              )
              .join('')}${c.date ? /* HTML */ `<p>${esc(c.date)}</p>` : ''}`,
        );
      }),
  );
}
function moveCase(dir) {
  const n = actualCases().length;
  caseIndex = (caseIndex + dir + n) % n;
  renderCases();
}
document.querySelector('#prev-case').onclick = () => moveCase(-1);
document.querySelector('#next-case').onclick = () => moveCase(1);
function renderEducation() {
  const list = live.credentials;
  documentIndex = Math.max(0, Math.min(documentIndex, list.length - 1));
  const d = list[documentIndex];
  document.querySelector('#documents').innerHTML = d
    ? d.file.endsWith('.pdf')
      ? /* HTML */ `<div class="document-placeholder">
          <span>${icon('document')}</span>
          <h3>PDF-документ</h3>
          <a class="button" href="${safeMedia(d.file)}" target="_blank" rel="noopener"
            >Відкрити документ ${icon('arrow-up-right')}</a
          >
        </div>`
      : /* HTML */ `<button
          class="document document-image"
          id="open-document"
          aria-label="Збільшити документ"
        >
          <img src="${safeMedia(d.file)}" alt="${esc(d.title)}" /><span
            >Збільшити ${icon('arrow-up-right')}</span
          >
        </button>`
    : /* HTML */ `<div class="document-placeholder">
        <span>${icon('document')}</span>
        <h3>Документ буде додано</h3>
        <p>Місце для справжнього диплома<br />або професійного сертифіката.</p>
      </div>`;
  document.querySelector('#document-description').innerHTML = d
    ? /* HTML */ `<p class="eyebrow">${esc(d.category || 'КВАЛІФІКАЦІЯ')}</p>
        <h3>${esc(d.title)}</h3>
        <p>${esc(d.description)}</p>
        ${d.date ? /* HTML */ `<p class="muted">${esc(d.date)}</p>` : ''}`
    : /* HTML */ `<p class="eyebrow">ОСВІТА ТА КВАЛІФІКАЦІЯ</p>
        <h3>Факти, які можна перевірити.</h3>
        <p>
          Юрист може додати документ і його опис у кабінеті. Під час гортання опис праворуч
          змінюватиметься разом із документом.
        </p>`;
  document.querySelector('#document-count').textContent = list.length
    ? `${documentIndex + 1} / ${list.length}`
    : 'Документи ще не додані';
  document.querySelector('#prev-document').disabled = document.querySelector(
    '#next-document',
  ).disabled = list.length < 2;
  const b = document.querySelector('#open-document');
  if (b)
    b.onclick = () => {
      openModal(
        /* HTML */ `<h2>${esc(d.title)}</h2>
          <div class="zoom-viewport">
            <img id="doc-image" src="${safeMedia(d.file)}" alt="${esc(d.title)}" />
          </div>
          <button class="admin-button" id="zoom-doc">Збільшити / скинути</button>
          <p>${esc(d.description)}</p>`,
      );
      document.querySelector('#zoom-doc').onclick = () =>
        document.querySelector('#doc-image').classList.toggle('zoomed');
    };
}
function moveDocument(dir) {
  const n = live.credentials.length;
  if (n) {
    documentIndex = (documentIndex + dir + n) % n;
    renderEducation();
  }
}
document.querySelector('#prev-document').onclick = () => moveDocument(-1);
document.querySelector('#next-document').onclick = () => moveDocument(1);
function renderReviews() {
  const list = live.testimonials;
  reviewIndex = Math.max(0, Math.min(reviewIndex, list.length - 1));
  const t = list[reviewIndex];
  const el = document.querySelector('#review-content');
  el.innerHTML = t
    ? /* HTML */ `<button class="review-image" id="open-review" aria-label="Збільшити відгук">
          <img src="${safeMedia(t.file)}" alt="${esc(t.title)}" /><span
            >Переглянути відгук ${icon('arrow-up-right')}</span
          >
        </button>
        <div class="review-description">
          <h3>${esc(t.title)}</h3>
          <p>${esc(t.description)}</p>
          ${t.date ? /* HTML */ `<p class="muted">${esc(t.date)}</p>` : ''}
        </div>`
    : /* HTML */ `<div class="review-placeholder">
          <span>${icon('image')}</span>
          <h3>Місце для відгуку</h3>
          <p>Юрист може додати зображення погодженого відгуку та його опис.</p>
        </div>
        <div class="review-description">
          <p class="review-empty">Репутація має голос.</p>
          <p class="muted">Справжні відгуки ще не додані.</p>
        </div>`;
  document.querySelector('#review-count').textContent = list.length
    ? `${reviewIndex + 1} / ${list.length}`
    : 'Відгуки ще не додані';
  document.querySelector('#prev-review').disabled = document.querySelector(
    '#next-review',
  ).disabled = list.length < 2;
  const b = document.querySelector('#open-review');
  if (b)
    b.onclick = () =>
      openModal(
        /* HTML */ `<h2>${esc(t.title)}</h2>
          <img src="${safeMedia(t.file)}" alt="${esc(t.title)}" />
          <p>${esc(t.description)}</p>`,
      );
}
function moveReview(dir) {
  const n = live.testimonials.length;
  if (n) {
    reviewIndex = (reviewIndex + dir + n) % n;
    renderReviews();
  }
}
document.querySelector('#prev-review').onclick = () => moveReview(-1);
document.querySelector('#next-review').onclick = () => moveReview(1);
function carouselKeys(el, move) {
  el.tabIndex = 0;
  el.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      move(1);
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      move(-1);
    }
  });
  let start;
  el.addEventListener('touchstart', (e) => (start = e.changedTouches[0].clientX), {
    passive: true,
  });
  el.addEventListener(
    'touchend',
    (e) => {
      if (start === undefined) return;
      const diff = e.changedTouches[0].clientX - start;
      if (Math.abs(diff) > 60) move(diff < 0 ? 1 : -1);
      start = undefined;
    },
    { passive: true },
  );
}
carouselKeys(document.querySelector('#case-grid'), moveCase);
carouselKeys(document.querySelector('.education-gallery'), moveDocument);
carouselKeys(document.querySelector('#review-content'), moveReview);
function renderProfile() {
  const p = live.profile || {};
  document.querySelector('#experience-value').textContent = p.experience || 'Дані буде додано';
  document.querySelector('#success-value').textContent =
    p.successRate !== '' && p.successRate != null ? p.successRate + '%' : 'Показник буде додано';
  document.querySelector('#success-note').textContent =
    p.successNote || 'Лише підтверджені дані з поясненням періоду та розрахунку.';
  const email = p.email || cfg.email,
    phone = p.phone || cfg.phone,
    city = p.city || cfg.city;
  const contactLines = [
    city ? /* HTML */ `<p>${esc(city)}</p>` : '',
    email
      ? /* HTML */ `<p><a href="mailto:${encodeURIComponent(email)}">${esc(email)}</a></p>`
      : '',
    phone
      ? /* HTML */ `<p><a href="tel:${phone.replace(/[^+\d]/g, '')}">${esc(phone)}</a></p>`
      : '',
  ].filter(Boolean);
  document.querySelector('#contact-details').innerHTML = contactLines.length
    ? contactLines.join('')
    : /* HTML */ `<p class="muted">Контактні дані власника ще не додані.</p>`;
}
function applyContent(value) {
  if (
    !value ||
    !Array.isArray(value.cases) ||
    !Array.isArray(value.credentials) ||
    !Array.isArray(value.testimonials)
  )
    return;
  live = value;
  renderCases();
  renderEducation();
  renderReviews();
  renderProfile();
}
// Reuse the server-rendered public snapshot before the first network refresh.
try {
  const snapshot = document.querySelector('#initial-content')?.textContent;
  if (snapshot) live = JSON.parse(snapshot);
} catch {
  /* A broken optional snapshot must not prevent normal API loading. */
}
applyContent(live);
window.MR_X = {
  apiBase,
  icon,
  esc,
  safeMedia,
  applyContent,
  getContent: () => live,
  openModal,
  closeModal,
};
// Poll only active pages. Public content never includes client requests.
async function syncContent() {
  try {
    const r = await fetch(apiBase + '/api/content', { cache: 'no-store' });
    if (!r.ok) return;
    const data = await r.json();
    backend = true;
    if (data.version !== live.version || !window.MR_X.firstSync) {
      window.MR_X.firstSync = true;
      applyContent(data);
    }
  } catch {
    backend = false;
  }
}
syncContent();
setInterval(() => {
  if (!document.hidden) syncContent();
}, 5000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) syncContent();
});
window.addEventListener('resize', () => {
  renderCases();
  renderServices(currentServiceGroup, currentServicePage);
});
// Navigation, accessibility and FAQ.

document.querySelector('#faq-list').innerHTML = faq
  .map(
    ([q, a]) =>
      /* HTML */ `<details>
        <summary>${q}</summary>
        <p>${a}</p>
      </details>`,
  )
  .join('');
const menu = document.querySelector('#mobile-menu'),
  toggle = document.querySelector('.menu-toggle');
function setMenu(open) {
  menu.hidden = !open;
  toggle.setAttribute('aria-expanded', open);
  toggle.setAttribute('aria-label', open ? 'Закрити меню' : 'Відкрити меню');
  toggle.innerHTML = icon(open ? 'close' : 'menu');
  document.body.style.overflow = open ? 'hidden' : '';
}
toggle.onclick = () => setMenu(menu.hidden);
menu.querySelectorAll('a').forEach((a) => (a.onclick = () => setMenu(false)));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !menu.hidden) {
    setMenu(false);
    toggle.focus();
  }
  if (e.key === 'Tab' && !menu.hidden) {
    const items = [toggle, ...menu.querySelectorAll('a')];
    if (e.shiftKey && document.activeElement === items[0]) {
      e.preventDefault();
      items.at(-1).focus();
    } else if (!e.shiftKey && document.activeElement === items.at(-1)) {
      e.preventDefault();
      items[0].focus();
    }
  }
});
window.addEventListener('resize', () => {
  if (innerWidth > 800 && !menu.hidden) setMenu(false);
});
const obs = new IntersectionObserver(
  (entries) =>
    entries.forEach((e) => {
      if (e.isIntersecting)
        document
          .querySelectorAll('nav a')
          .forEach((a) => a.classList.toggle('active', a.hash === '#' + e.target.id));
    }),
  { rootMargin: '-20% 0px -55% 0px' },
);
document.querySelectorAll('section[id]').forEach((s) => obs.observe(s));
const reveal = new IntersectionObserver(
  (es) =>
    es.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        reveal.unobserve(e.target);
      }
    }),
  { threshold: 0.08 },
);
document.querySelectorAll('.section-heading,.steps,.about>div').forEach((e) => {
  e.classList.add('reveal');
  reveal.observe(e);
});
window.addEventListener(
  'scroll',
  () => {
    document.querySelector('header').classList.toggle('scrolled', scrollY > 20);
    const h = document.documentElement;
    document.querySelector('.progress').style.width =
      (scrollY / Math.max(1, h.scrollHeight - h.clientHeight)) * 100 + '%';
  },
  { passive: true },
);
document.querySelector('#year').textContent = new Date().getFullYear();
const privacy = /* HTML */ `<p class="eyebrow">ІНФОРМАЦІЯ ДЛЯ ВІДВІДУВАЧА</p>
  <h2>Конфіденційність</h2>
  <p>
    Форма запитує ім’я, контакт і короткий опис питання для зворотного зв’язку. Після успішного
    надсилання сервер зберігає звернення у приватному кабінеті власника. Після налаштування SMTP
    сервер також надсилає звернення на email власника через його поштового провайдера. Ці звернення
    не публікуються на сайті.
  </p>
  <p>
    Власник має доповнити цю заготовку своїми реквізитами, контактами щодо персональних даних, метою
    і правовою підставою обробки, строками зберігання та способом реалізації прав особи до реального
    запуску.
  </p>
  <p>
    Не додавайте паспортні дані, банківські реквізити або матеріали конфіденційної справи.
    Налаштовані контакти доступні у відповідному блоці.
  </p>`;
document.querySelectorAll('[data-policy]').forEach((b) => (b.onclick = () => openModal(privacy)));
document.querySelector('[data-cookies]').onclick = () =>
  openModal(
    /* HTML */ `<h2>Cookies</h2>
      <p>
        Для входу власника використовується лише захищений сеансовий cookie. Він не містить пароль і
        не використовується для реклами. Аналітичних трекерів немає.
      </p>`,
  );
// Persist first, then notify by email. SMTP acceptance is distinct from storage.
document.querySelector('#contact-form').onsubmit = async (e) => {
  e.preventDefault();
  const form = e.target;
  if (!form.reportValidity()) return;
  const d = Object.fromEntries(new FormData(form));
  d.consent = true;
  const status = document.querySelector('#form-status'),
    button = document.querySelector('#submit-button');
  if (
    !/^\S+@\S+\.\S+$/.test(d.contact) &&
    ((!d.contact.includes('@') && d.contact.replace(/\D/g, '').length < 7) ||
      d.contact.includes('@'))
  ) {
    status.textContent = 'Укажіть коректний email або телефон.';
    form.elements.contact.focus();
    return;
  }
  button.disabled = true;
  status.textContent = 'Надсилання…';
  try {
    const r = await fetch(apiBase + '/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(d),
      signal: AbortSignal.timeout(45000),
    });
    let out;
    try {
      out = await r.json();
    } catch {
      throw Error('Серверна частина ще не підключена. Звернення не надіслано.');
    }
    if (!r.ok || out.ok !== true) throw Error(out.error || 'Не вдалося надіслати звернення.');
    status.textContent = out.emailSent
      ? 'Звернення збережено у кабінеті. Поштовий сервер прийняв лист для юриста.'
      : 'Звернення збережено у кабінеті юриста. Лист поки не надіслано — повторно заповнювати форму не потрібно.';
    form.reset();
  } catch (err) {
    status.textContent =
      err.message === 'Failed to fetch'
        ? 'З’єднання із сервером недоступне. Звернення не надіслано.'
        : err.message;
  } finally {
    button.disabled = false;
  }
};
