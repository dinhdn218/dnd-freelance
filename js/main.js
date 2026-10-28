(() => {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = matchMedia('(hover: hover)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGSAP = Boolean(window.gsap && window.ScrollTrigger);
  let lenis = null;

  /* =========================================================
     Phần chạy được cả khi không có GSAP
     ========================================================= */

  // ---- Theme sáng / tối ----
  const themeBtn = document.querySelector('.theme-toggle');
  const metaTheme = document.querySelector('meta[name="theme-color"]');

  function setThemeLabel(theme) {
    themeBtn.setAttribute('aria-label', theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối');
  }

  function applyTheme(theme) {
    root.dataset.theme = theme;
    metaTheme.content = theme === 'dark' ? '#110F0D' : '#F3EEE5';
    setThemeLabel(theme);
    try { localStorage.setItem('theme', theme); } catch (e) {}
  }

  setThemeLabel(root.dataset.theme);

  themeBtn.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    if (!document.startViewTransition || reduced) return applyTheme(next);

    // Lan màu theme mới ra từ nút bấm
    const r = themeBtn.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.startViewTransition(() => applyTheme(next)).ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 750, easing: 'cubic-bezier(.7, 0, .2, 1)', pseudoElement: '::view-transition-new(root)' },
      );
    });
  });

  // ---- Năm ở footer ----
  const year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();

  // ---- Sao chép email ----
  document.querySelectorAll('[data-copy]').forEach((btn) => {
    const state = btn.querySelector('.copy-state');
    let timer;
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
      } catch (e) {
        location.href = `mailto:${btn.dataset.copy}`;
        return;
      }
      state.textContent = 'Đã chép!';
      state.classList.add('is-done');
      clearTimeout(timer);
      timer = setTimeout(() => {
        state.textContent = 'Sao chép';
        state.classList.remove('is-done');
      }, 1800);
    });
  });

  // ---- Menu điện thoại ----
  const nav = document.querySelector('.nav');
  const menuBtn = document.querySelector('.menu-toggle');
  const menu = document.getElementById('menu');

  function setMenu(open) {
    root.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Đóng menu' : 'Mở menu');
    menu.inert = !open;
    nav.classList.remove('is-hidden');
    if (lenis) open ? lenis.stop() : lenis.start();
    else document.body.style.overflow = open ? 'hidden' : '';
  }

  menuBtn.addEventListener('click', () => setMenu(!root.classList.contains('menu-open')));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && root.classList.contains('menu-open')) {
      setMenu(false);
      menuBtn.focus();
    }
  });

  // ---- Link neo trong trang ----
  const navOffset = () => nav.offsetHeight + 8;

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.classList.contains('skip-link')) return;
    const id = a.getAttribute('href');
    const target = id === '#top' ? document.body : document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    if (root.classList.contains('menu-open')) setMenu(false);
    if (lenis) lenis.scrollTo(id === '#top' ? 0 : target, { offset: -navOffset(), duration: 1.4 });
    else window.scrollTo({ top: id === '#top' ? 0 : target.getBoundingClientRect().top + scrollY - navOffset(), behavior: reduced ? 'auto' : 'smooth' });
    history.replaceState(null, '', id === '#top' ? location.pathname : id);
  });

  // ---- Nav: nền mờ khi cuộn, ẩn khi cuộn xuống ----
  let lastY = scrollY;
  addEventListener('scroll', () => {
    const y = scrollY;
    nav.classList.toggle('is-scrolled', y > 20);
    if (!root.classList.contains('menu-open')) nav.classList.toggle('is-hidden', y > lastY && y > 400);
    lastY = y;
  }, { passive: true });

  // ---- Link nav đang xem ----
  const navLinks = [...document.querySelectorAll('.nav-links a')];
  const sectionIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      navLinks.forEach((l) => l.classList.toggle('is-active', l.getAttribute('href') === `#${en.target.id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  navLinks.forEach((l) => {
    const s = document.querySelector(l.getAttribute('href'));
    if (s) sectionIO.observe(s);
  });

  // ---- Nút Zalo nổi trên điện thoại: hiện khi đã qua hero, ẩn ở phần liên hệ ----
  const floatBtn = document.querySelector('.float-zalo');
  const heroEl = document.querySelector('.hero');
  const contactEl = document.getElementById('lien-he');
  const seen = new Map([[heroEl, true], [contactEl, false]]);
  new IntersectionObserver((entries) => {
    entries.forEach((en) => seen.set(en.target, en.isIntersecting));
    floatBtn.classList.toggle('is-visible', !seen.get(heroEl) && !seen.get(contactEl));
  }).observe(heroEl);
  new IntersectionObserver((entries) => {
    entries.forEach((en) => seen.set(en.target, en.isIntersecting));
    floatBtn.classList.toggle('is-visible', !seen.get(heroEl) && !seen.get(contactEl));
  }).observe(contactEl);

  // ---- Ảnh toàn trang: rê chuột (hoặc chạm) để cuộn ----
  const browsers = document.querySelectorAll('.browser');

  function measure(browser) {
    const view = browser.querySelector('.browser-view');
    const img = view.querySelector('img');
    if (!img.naturalHeight) return;
    const shownHeight = view.clientWidth * (img.naturalHeight / img.naturalWidth);
    const distance = Math.max(0, shownHeight - view.clientHeight);
    browser.style.setProperty('--pan', `${-distance}px`);
    browser.style.setProperty('--dur', `${Math.min(9, Math.max(2.5, distance / 420)).toFixed(2)}s`);
  }

  const browserRO = new ResizeObserver((entries) => entries.forEach((en) => measure(en.target)));
  browsers.forEach((browser) => {
    const img = browser.querySelector('.browser-view img');
    if (img.complete) measure(browser);
    else img.addEventListener('load', () => measure(browser), { once: true });
    browserRO.observe(browser);
    if (!canHover) browser.addEventListener('click', () => browser.classList.toggle('is-panning'));
  });

  /* =========================================================
     Animation (GSAP + Lenis)
     ========================================================= */
  if (!hasGSAP || reduced) {
    root.classList.remove('js');
    return;
  }

  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  root.classList.add('is-ready');

  if (window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  // ---- Tách tiêu đề thành từng chữ ----
  function splitWords(el) {
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) return frag.append(' ');
            const w = document.createElement('span');
            const inner = document.createElement('span');
            w.className = 'w';
            inner.className = 'w-in';
            inner.textContent = part;
            w.append(inner);
            frag.append(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') {
          walk(child);
        }
      });
    };
    walk(el);
    return el.querySelectorAll('.w-in');
  }

  const splits = new Map();
  document.querySelectorAll('[data-split]').forEach((el) => {
    const words = splitWords(el);
    gsap.set(words, { yPercent: 115 });
    el.style.visibility = 'visible';
    splits.set(el, words);
  });

  // Tiêu đề các section
  splits.forEach((words, el) => {
    if (el.dataset.split === 'intro') return;
    gsap.to(words, {
      yPercent: 0,
      duration: 1.2,
      ease: 'expo.out',
      stagger: 0.045,
      scrollTrigger: { trigger: el, start: 'top 86%' },
    });
  });

  // Các khối nội dung
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 90%',
    onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.08, overwrite: true }),
  });

  // ---- Loader + hero ----
  const loader = document.querySelector('.loader');
  const heroWords = splits.get(document.querySelector('[data-split="intro"]'));
  const fanPhones = gsap.utils.toArray('.fan-phone');
  const fanInners = gsap.utils.toArray('.fan-inner');

  const intro = gsap.timeline({ paused: true })
    .to(heroWords, { yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: 0.05 }, 0)
    .to('[data-intro]', { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.1 }, 0.35)
    .fromTo(fanInners, { opacity: 0, yPercent: 45 }, { opacity: 1, yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: 0.07 }, 0.15);

  // Các điện thoại chồng ở giữa rồi xoè ra vị trí khai báo trong HTML
  fanPhones.forEach((phone, i) => {
    const end = {};
    ['--x', '--y', '--r'].forEach((prop) => { end[prop] = phone.style.getPropertyValue(prop).trim(); });
    intro.fromTo(phone, { '--x': '0%', '--y': '0%', '--r': '0deg' }, { ...end, duration: 1.6, ease: 'expo.inOut' }, 0.35 + i * 0.04);
  });

  intro.add(() => {
      // Các điện thoại khẽ trôi lên xuống
      fanInners.forEach((el, i) => {
        gsap.to(el, { y: i % 2 ? 9 : -9, duration: 2.8 + i * 0.35, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      });
    });

  let visited = false;
  try { visited = sessionStorage.getItem('visited') === '1'; sessionStorage.setItem('visited', '1'); } catch (e) {}

  if (visited) {
    loader.remove();
    document.fonts.ready.then(() => intro.play());
  } else {
    lenis?.stop();
    const count = loader.querySelector('.loader-count');
    const progress = { v: 0 };
    const render = () => { count.textContent = Math.round(progress.v); };
    gsap.to(progress, { v: 88, duration: 1.1, ease: 'power2.out', onUpdate: render });

    const heroImg = document.querySelector('.fan-phone:last-child img');
    const imgReady = heroImg.complete ? Promise.resolve() : new Promise((r) => heroImg.addEventListener('load', r, { once: true }));
    const timeout = new Promise((r) => setTimeout(r, 2600));
    const minimum = new Promise((r) => setTimeout(r, 900));

    Promise.all([Promise.race([Promise.all([document.fonts.ready, imgReady]), timeout]), minimum]).then(() => {
      gsap.to(progress, {
        v: 100,
        duration: 0.35,
        ease: 'power1.out',
        overwrite: true,
        onUpdate: render,
        onComplete: () => {
          gsap.to(loader, { yPercent: -100, duration: 1.05, ease: 'expo.inOut', onComplete: () => loader.remove() });
          gsap.delayedCall(0.4, () => { intro.play(); lenis?.start(); });
        },
      });
    });
  }

  // Quạt điện thoại nghiêng theo chuột
  if (finePointer) {
    const fan = document.querySelector('.fan');
    const rotX = gsap.quickTo(fan, 'rotationX', { duration: 1.2, ease: 'power3' });
    const rotY = gsap.quickTo(fan, 'rotationY', { duration: 1.2, ease: 'power3' });
    heroEl.addEventListener('pointermove', (e) => {
      const r = heroEl.getBoundingClientRect();
      rotY(((e.clientX - r.left) / r.width - 0.5) * 16);
      rotX(-((e.clientY - r.top) / r.height - 0.5) * 10);
    });
    heroEl.addEventListener('pointerleave', () => { rotX(0); rotY(0); });
  }

  // Hero trôi lên khi cuộn qua
  gsap.to('.fan', {
    yPercent: -14,
    ease: 'none',
    scrollTrigger: { trigger: heroEl, start: 'top top', end: 'bottom top', scrub: true },
  });

  // ---- Thanh tiến độ cuộn ----
  gsap.to('.progress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });

  // ---- Dải chữ chạy, tăng tốc theo tốc độ cuộn ----
  const marquee = gsap.to('.marquee-track', { xPercent: -50, duration: 36, ease: 'none', repeat: -1 });
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate(self) {
      const boost = gsap.utils.clamp(1, 6, 1 + Math.abs(self.getVelocity()) / 450);
      gsap.to(marquee, {
        timeScale: boost,
        duration: 0.2,
        overwrite: true,
        onComplete: () => gsap.to(marquee, { timeScale: 1, duration: 1.4, ease: 'power2.out' }),
      });
    },
  });

  // ---- Dự án ----
  gsap.utils.toArray('.project').forEach((project) => {
    const info = project.querySelector('.project-info');
    const browser = project.querySelector('.browser');
    const view = project.querySelector('.browser-view');
    const phone = project.querySelector('.phone');

    gsap.timeline({ scrollTrigger: { trigger: project, start: 'top 78%' } })
      .from(browser, { y: 70, opacity: 0, duration: 1.2, ease: 'expo.out' }, 0)
      .from(view, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.3, ease: 'expo.inOut' }, 0.05)
      .from(phone, { y: 90, rotation: -10, opacity: 0, duration: 1.3, ease: 'expo.out' }, 0.45)
      .from(info.children, { y: 32, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.07 }, 0.15);

    gsap.to(phone, {
      yPercent: -14,
      ease: 'none',
      scrollTrigger: { trigger: project, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  const mm = gsap.matchMedia();

  // Thẻ trước thu nhỏ và tối đi khi thẻ sau trượt lên che
  mm.add('(min-width: 901px) and (min-height: 701px)', () => {
    const projects = gsap.utils.toArray('.project');
    projects.forEach((project, i) => {
      const next = projects[i + 1];
      if (!next) return;
      gsap.timeline({
        scrollTrigger: {
          trigger: next,
          start: 'top bottom',
          end: () => `top ${parseFloat(getComputedStyle(next).top)}px`,
          scrub: true,
          invalidateOnRefresh: true,
        },
      })
        .to(project.querySelector('.project-card'), { scale: 0.92, ease: 'none' }, 0)
        .to(project.querySelector('.project-shade'), { opacity: 1, ease: 'none' }, 0);
    });
  });

  // ---- Quy trình: đường kẻ chạy theo cuộn, chấm sáng dần ----
  mm.add({ desktop: '(min-width: 901px)', mobile: '(max-width: 900px)' }, (ctx) => {
    const { desktop } = ctx.conditions;
    const prop = desktop ? 'scaleX' : 'scaleY';
    const steps = gsap.utils.toArray('.step');
    gsap.fromTo('.steps-line span', { [prop]: 0 }, {
      [prop]: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: '.steps',
        start: 'top 72%',
        end: desktop ? 'top 28%' : 'bottom 60%',
        scrub: 0.4,
        onUpdate: (self) => steps.forEach((s, i) => s.classList.toggle('is-active', self.progress > i / steps.length)),
      },
    });
  });

  // ---- Số đếm ----
  document.querySelectorAll('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    const o = { v: 0 };
    el.textContent = '0';
    gsap.to(o, {
      v: end,
      duration: 2.2,
      ease: 'expo.out',
      onUpdate: () => { el.textContent = Math.round(o.v); },
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });

  // ---- Nút "hút" theo chuột ----
  if (finePointer) {
    document.querySelectorAll('[data-magnetic]').forEach((el) => {
      const x = gsap.quickTo(el, 'x', { duration: 0.8, ease: 'elastic.out(1, .4)' });
      const y = gsap.quickTo(el, 'y', { duration: 0.8, ease: 'elastic.out(1, .4)' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        x((e.clientX - r.left - r.width / 2) * 0.35);
        y((e.clientY - r.top - r.height / 2) * 0.35);
      });
      el.addEventListener('pointerleave', () => { x(0); y(0); });
    });
  }

  // ---- Con trỏ tuỳ biến ----
  if (finePointer) {
    const cursor = document.querySelector('.cursor');
    const label = cursor.querySelector('.cursor-label');
    const cx = gsap.quickTo(cursor, 'x', { duration: 0.45, ease: 'power3' });
    const cy = gsap.quickTo(cursor, 'y', { duration: 0.45, ease: 'power3' });

    addEventListener('pointermove', (e) => {
      if (!root.classList.contains('has-cursor')) {
        gsap.set(cursor, { x: e.clientX, y: e.clientY });
        root.classList.add('has-cursor');
      }
      cx(e.clientX);
      cy(e.clientY);
    }, { passive: true });

    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest('[data-cursor], a, button, summary');
      const text = t?.dataset.cursor;
      cursor.classList.toggle('is-label', Boolean(text));
      cursor.classList.toggle('is-link', Boolean(t) && !text);
      if (text) label.textContent = text;
    });
    document.documentElement.addEventListener('pointerleave', () => cursor.classList.add('is-hidden'));
    document.documentElement.addEventListener('pointerenter', () => cursor.classList.remove('is-hidden'));
  }

  // Tính lại vị trí sau khi font và ảnh tải xong
  document.fonts.ready.then(() => ScrollTrigger.refresh());
  addEventListener('load', () => ScrollTrigger.refresh());
})();
