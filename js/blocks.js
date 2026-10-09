/* Comportamiento de los bloques. Sin dependencias. */
(() => {
  // ---------- Header: sombra al hacer scroll (como xternall.com) ----------
  const header = document.querySelector('[data-header]');
  if (header) {
    const onScroll = () => { header.dataset.scrolled = window.scrollY > 10; };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ---------- Menú: hamburguesa (móvil) y submenú "Otras Soluciones" ----------
  const toggle = document.querySelector('[data-menu-toggle]');
  const menu = toggle && document.getElementById(toggle.getAttribute('aria-controls'));
  const subToggles = [...document.querySelectorAll('.x-nav__sub-toggle')];
  const closeSubs = except => subToggles.forEach(b => { if (b !== except) b.setAttribute('aria-expanded', 'false'); });
  // Despliegue tipo "slide" (equivalente al slideToggle de Divi en xternall.com)
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SWING = 'cubic-bezier(.02, .01, .47, 1)'; // easing "swing" de jQuery (Divi)
  const slide = (el, open) => {
    if (reduceMotion || !el.animate) return Promise.resolve();
    const h = el.scrollHeight;
    const frames = [{ height: '0px', paddingTop: '0px', paddingBottom: '0px' }, { height: h + 'px' }];
    return el.animate(open ? frames : frames.reverse(), { duration: 500, easing: SWING }).finished.catch(() => {});
  };
  const setOpen = open => {
    if (!menu) return;
    const isOpen = menu.dataset.open === 'true';
    if (open === isOpen) return;
    toggle.setAttribute('aria-expanded', open);
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    const mobile = getComputedStyle(toggle).display !== 'none';
    if (open) {
      menu.dataset.open = 'true';
      if (mobile) slide(menu, true);
    } else {
      const done = () => { menu.dataset.open = 'false'; closeSubs(); };
      mobile ? slide(menu, false).then(done) : done();
    }
  };
  if (toggle && menu) {
    toggle.addEventListener('click', () => setOpen(menu.dataset.open !== 'true'));
    menu.addEventListener('click', e => { if (e.target.closest('a')) setOpen(false); });
  }
  subToggles.forEach(btn => btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') !== 'true';
    closeSubs(btn);
    btn.setAttribute('aria-expanded', open);
  }));
  document.addEventListener('click', e => {
    if (header && !header.contains(e.target)) { closeSubs(); setOpen(false); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeSubs(); setOpen(false); } });

  // ---------- Colapsables con slide (<details data-slide="ms">) ----------
  document.querySelectorAll('details[data-slide]').forEach(det => {
    const summary = det.querySelector('summary');
    const body = summary.nextElementSibling;
    const ms = +det.dataset.slide || 700;
    let busy = false;
    summary.addEventListener('click', e => {
      e.preventDefault();
      if (busy) return;
      if (reduceMotion || !body.animate) { det.open = !det.open; return; }
      busy = true;
      const opening = !det.open;
      if (opening) det.open = true;
      const h = body.scrollHeight;
      const frames = [{ height: '0px', paddingTop: '0px', paddingBottom: '0px' }, { height: h + 'px' }];
      body.animate(opening ? frames : frames.reverse(), { duration: ms, easing: SWING }).finished
        .catch(() => {})
        .then(() => { if (!opening) det.open = false; busy = false; });
    });
  });

  // ---------- Tabs (accesibles, con flechas) ----------
  document.querySelectorAll('[data-tabs]').forEach(root => {
    const tabs = [...root.querySelectorAll(':scope [role="tab"]')];
    const select = tab => {
      tabs.forEach(t => {
        const on = t === tab;
        t.setAttribute('aria-selected', on);
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', e => {
        const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (!step) return;
        const next = tabs[(i + step + tabs.length) % tabs.length];
        next.focus(); select(next);
      });
    });
  });

  // ---------- Diálogos ----------
  const open = dlg => { if (dlg && !dlg.open) dlg.showModal(); };
  document.querySelectorAll('[data-dialog-open]').forEach(btn =>
    btn.addEventListener('click', () => open(document.getElementById(btn.dataset.dialogOpen))));
  document.querySelectorAll('dialog').forEach(dlg => {
    dlg.addEventListener('click', e => {
      if (e.target === dlg || e.target.closest('[data-dialog-close]')) dlg.close();
    });
  });

  // Detalle de colaborador: los datos viven en <template id="person-xx">
  const personDlg = document.getElementById('person-dialog');
  if (personDlg) {
    const field = name => personDlg.querySelector(`[data-f="${name}"]`);
    document.addEventListener('click', e => {
      const btn = e.target.closest('[data-person]');
      if (!btn) return;
      const src = document.getElementById(`person-${btn.dataset.person}`);
      if (!src) return;
      const d = src.dataset;
      field('name').textContent = d.name;
      field('week').textContent = d.week;
      field('state').textContent = d.state;
      field('state').className = `x-badge x-badge--${d.tone}`;
      field('detail').textContent = src.content.textContent.trim();
      field('entry').textContent = d.entry;
      field('exit').textContent = d.exit;
      open(personDlg);
    });
  }

  // ---------- Formulario de demo → CRM ----------
  // ============================ CONFIGURACIÓN CRM ============================
  // ⚠ La api-key queda VISIBLE en el código de la página publicada. Usar solo una
  //   clave que únicamente permita CREAR contactos (sin leer, editar ni borrar).
  // Con apiKey vacía: en local se simula el envío (y se muestra en consola lo que
  // se mandaría); publicada, el formulario muestra error y no envía nada.
  const CRM = {
    endpoint: 'https://erp.grupotimexico.com/ords/crm/api/contactos',
    apiKey: '019dd108dd62--cde1f77a6bb56d37dc6045c2',                                   // ← pegar aquí la api-key
    fijos: {                                      // valores que define el CRM
      categoria: 'Xternall',
      servicio: 'Xternall 40',
      canal_contacto: 'landing page - Xternall 40',
      interesado: null,
      estatus: null
    }
  };
  // ===========================================================================

  // Parámetros de campaña del link (?utm_source=…&utm_campaign=…)
  const utm = new URLSearchParams(location.search);

  // Arma el registro con la estructura de /ords/crm/api/contactos
  const toCRM = data => {
    const full = (data.name || '').trim().replace(/\s+/g, ' ');
    const [nombre, ...resto] = full.split(' ');
    const mensaje = ['Solicitud de demo']
      .concat(data.size ? `Colaboradores: ${data.size}` : [])
      .concat('Aceptó ser contactado sobre una demo')
      .join(' · ');
    return {
      nombre: nombre || null,
      apellido: resto.join(' ') || null,
      correo: (data.email || '').trim().toLowerCase() || null,
      telefono: null,                             // el formulario no lo pide
      empresa: (data.company || '').trim() || null,
      categoria: CRM.fijos.categoria,
      servicio: CRM.fijos.servicio,
      canal_contacto: CRM.fijos.canal_contacto,
      fuente: ['xternall-40', utm.get('utm_source')].filter(Boolean).join(' / '),
      campana: utm.get('utm_campaign') || null,
      mensaje_inicial: mensaje,
      interesado: CRM.fijos.interesado,
      necesita_atencion: null,                    // campos internos del CRM
      por_que: null,
      respondio_correo: null,
      responsable: null,
      estatus: CRM.fijos.estatus,
      creado: null,                               // los asigna el servidor
      creado_por: null,
      actualizado: null,
      actualizado_por: null
    };
  };

  document.querySelectorAll('[data-demo-form]').forEach(form => {
    const card = form.parentElement;
    const errorBox = form.querySelector('.b-demo__error');
    const success = card.querySelector('.b-demo__success');
    const submit = form.querySelector('[type="submit"]');
    const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === 'file:';

    const showError = msg => { errorBox.textContent = msg; errorBox.hidden = false; };
    const setBusy = busy => {
      submit.setAttribute('aria-busy', busy);
      submit.innerHTML = busy ? '<span class="x-spin" aria-hidden="true"></span>Guardando solicitud…' : submit.dataset.label;
    };

    form.addEventListener('submit', async e => {
      e.preventDefault();
      errorBox.hidden = true;
      if (!form.reportValidity()) return;
      if (!form.consent.checked) return showError('Confirma que podemos contactarte sobre la demo.');
      if (form.website.value) return; // honeypot: bots

      const registro = toCRM(Object.fromEntries(new FormData(form)));

      setBusy(true);
      try {
        if (CRM.apiKey) {
          const res = await fetch(CRM.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'api-key': CRM.apiKey },
            body: JSON.stringify(registro)
          });
          if (!res.ok) throw new Error(`CRM respondió ${res.status}`);
          const json = await res.json().catch(() => ({}));
          const id = json.id ?? json.id_contacto ?? json.contacto_id;
          const folio = success.querySelector('[data-folio]');
          if (folio && id != null) { folio.querySelector('b').textContent = id; folio.hidden = false; }
        } else if (isLocal) {
          console.info('[demo-form] Sin api-key: envío SIMULADO. Esto se mandaría al CRM:', registro);
          await new Promise(r => setTimeout(r, 600));
        } else {
          throw new Error('Falta la api-key del CRM');
        }
        form.hidden = true;
        success.hidden = false;
      } catch (err) {
        console.error('[demo-form]', err);
        showError('No pudimos guardar tu solicitud. Inténtalo de nuevo.');
      } finally {
        setBusy(false);
      }
    });
  });
})();
