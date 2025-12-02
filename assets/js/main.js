// ===== MENÚ HAMBURGUESA =====
const MobileMenu = {
  initialized: false,
  toggle: null,
  nav: null,
  mainMenuItems: null,
  idiomaBtn: null,
  idiomaList: null,
  backBtn: null,
  showingLanguages: false,
  init() {
    this.toggle = document.getElementById('menu-toggle');
    this.nav = document.getElementById('main-nav');
    this.mainMenuItems = document.getElementById('main-menu-items');
    this.idiomaBtn = document.getElementById('idioma-mobile-btn');
    this.idiomaList = document.getElementById('idioma-mobile-list');
    this.backBtn = document.getElementById('back-to-menu');
    if (!this.toggle || !this.nav) return;
    if (this.initialized) return;
    this.initialized = true;
    
    this.toggle.addEventListener('click', () => this.toggleMenu());
    
    // Cerrar menú al hacer clic en enlaces de sección
    const navLinks = this.nav.querySelectorAll('a[data-section]');
    navLinks.forEach(link => {
      link.addEventListener('click', () => this.closeMenu());
    });
    
    // Manejar clic en botón de idioma móvil
    if (this.idiomaBtn) {
      this.idiomaBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.showLanguages();
      });
    }
    
    // Manejar clic en botón volver
    if (this.backBtn) {
      this.backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.hideLanguages();
      });
    }
    
    // Manejar selección de idioma
    if (this.idiomaList) {
      const langLinks = this.idiomaList.querySelectorAll('a[data-lang]');
      langLinks.forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const lang = link.getAttribute('data-lang');
          cambiarIdioma(lang);
          // Mantener el menú abierto y seguir en la lista de idiomas
          // (no cerrar ni volver automáticamente al menú principal)
          // Si en el futuro prefieres volver al menú principal, descomenta:
          // this.hideLanguages();
        });
      });
    }
    
    // Cerrar menú al hacer clic fuera
    document.addEventListener('click', (e) => {
      if (this.nav.classList.contains('active') && 
          !this.nav.contains(e.target) && 
          !this.toggle.contains(e.target)) {
        this.closeMenu();
      }
    });
  },
  toggleMenu() {
    this.toggle.classList.toggle('active');
    this.nav.classList.toggle('active');
    if (this.nav.classList.contains('active')) {
      // Al abrir el menú, asegúrate de mostrar el listado principal
      this.hideLanguages();
    } else {
      this.hideLanguages();
    }
  },
  closeMenu() {
    this.toggle.classList.remove('active');
    this.nav.classList.remove('active');
    this.hideLanguages();
  },
  showLanguages() {
    if (!this.idiomaList || !this.mainMenuItems) return;
    this.mainMenuItems.style.display = 'none';
    this.idiomaList.style.display = 'flex';
    this.showingLanguages = true;
  },
  hideLanguages() {
    if (!this.idiomaList || !this.mainMenuItems) return;
    this.idiomaList.style.display = 'none';
    this.mainMenuItems.style.display = 'flex';
    this.showingLanguages = false;
  }
};

// ===== ESTADO GLOBAL Y UTILIDADES =====
const $ = {
  header: null, indice: null, main: null, footer: null, galeriaContainer: null, galeria: null,
  body: document.body, html: document.documentElement,
  lastScrollY: 0, 
  // Estado específico para ocultar/mostrar header según scroll del contenedor (≤1024px)
  lastHeaderContainerScrollTop: 0,
  // Para tracking táctil en móviles
  touchStartY: undefined,
  // Dirección previa del scroll para detectar cambios bruscos
  lastScrollDirection: 0, // 1: abajo, -1: arriba, 0: sin movimiento
  get headerHeight() { return window.innerWidth <= 768 ? 60 : 70; },
  // isMobile: uso general (≤768px) para comportamientos de UI como alturas del header
  get isMobile() { return window.innerWidth <= 768; },
  // isNarrow: modo "móvil/estrecho" de la galería/proyectos (≤1024px), alineado con CSS
  get isNarrow() { return window.innerWidth <= 1024; },
  isProyectosActive: false, lastScrollTop: 0, bottleEffectTriggered: false,
  lastIsNarrow: null,
  throttles: new Set(), timers: new Map(), rafId: null,
  initialized: false
};

const throttle = (key, fn, ms = 16) => {
  if ($.throttles.has(key)) return;
  $.throttles.add(key);
  $.rafId && cancelAnimationFrame($.rafId);
  $.rafId = requestAnimationFrame(() => { 
    fn(); 
    setTimeout(() => $.throttles.delete(key), ms); 
    $.rafId = null;
  });
};

const debounce = (key, fn, ms = 250) => {
  const timer = $.timers.get(key);
  timer && clearTimeout(timer);
  $.timers.set(key, setTimeout(() => { fn(); $.timers.delete(key); }, ms));
};

// ===== LAYOUT, SCROLL Y NAVEGACIÓN =====
const Layout = {
  init() {
    // Map the actual element IDs/nodes used in the HTML to the $ cache.
    // Note: the main container uses id="desktop-version" and <footer> has no id,
    // so we must query them explicitly instead of assuming ids named 'main'/'footer'.
    $.header = document.getElementById('main-header');
    $.indice = document.getElementById('indice');
    $.main = document.getElementById('desktop-version');
    $.footer = document.querySelector('footer');
    $.galeriaContainer = document.getElementById('galeria-container');
    $.galeria = document.getElementById('galeria');
    this.update();
    TopNav.init();
    // El footer se controla globalmente por scroll: solo aparece al llegar al fondo
  },
  update() {
    if (!$.header || !$.main) return;
    // En móvil el header NO es fijo: no debemos empujar el contenido
    const margin = $.isNarrow ? 0 : $.headerHeight;
    $.main.style.marginTop = `${margin}px`;
    // Ajustar el índice solo en escritorio; en móvil lo gobierna el CSS (top: 60px)
    if (!$.isNarrow && $.indice) {
      $.indice.style.top = `${margin}px`;
    } else if ($.isNarrow && $.indice) {
      // Limpiar override inline para respetar CSS responsive
      $.indice.style.top = '';
    }
  }
};

// ===== INTRO OVERLAY (animación inicial) =====
const IntroOverlay = {
  key: 'introShownAt',
  sessionKey: 'introPlayedSession',
  thresholdHours: 12, // mostrar solo si han pasado 12 horas
  overlay: null,
  video: null,
  shouldShow() {
    try {
      // No reproducir más de una vez por sesión del navegador
      const playedSession = sessionStorage.getItem(this.sessionKey);
      if (playedSession === '1') return false;

      const last = localStorage.getItem(this.key);
      if (!last) return true; // primera vez
      const lastTs = parseInt(last, 10);
      if (Number.isNaN(lastTs)) return true;
      const hours = (Date.now() - lastTs) / (1000 * 60 * 60);
      return hours >= this.thresholdHours;
    } catch {
      return false;
    }
  },
  markShown() {
    try {
      localStorage.setItem(this.key, String(Date.now()));
      sessionStorage.setItem(this.sessionKey, '1');
    } catch {}
  },
  detectFormat() {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const v = document.createElement('video');
    const canWebm = !!v.canPlayType && v.canPlayType('video/webm; codecs="vp9"');
    // Heurística: Safari usa .mov con alpha; Chrome/Firefox/Edge usan .webm con alpha
    if (!isSafari && canWebm) {
      return { src: 'Jmotion_1.webm', type: 'video/webm' };
    }
    return { src: 'Jmotion_FINAL.mov', type: 'video/quicktime' };
  },
  createOverlay() {
    if (document.getElementById('intro-overlay')) return; // ya existe
    this.overlay = document.createElement('div');
    this.overlay.id = 'intro-overlay';
    // Color de fondo igual al header
    this.overlay.style.background = '#001f3f';
    this.video = document.createElement('video');
    this.video.id = 'intro-video';
    this.video.autoplay = true;
    this.video.muted = true; // evitar bloqueo por autoplay
    this.video.playsInline = true;
    this.video.style.maxWidth = '60vw';
    this.video.style.maxHeight = '60vh';
    const fmt = this.detectFormat();
    const source = document.createElement('source');
    source.src = fmt.src;
    source.type = fmt.type;
    this.video.appendChild(source);
    this.overlay.appendChild(this.video);
    document.body.appendChild(this.overlay);
  },
  fadeOut() {
    if (!this.overlay) return;
    this.overlay.classList.add('fade-out');
    setTimeout(() => {
      try { this.overlay.remove(); } catch {}
    }, 1500);
  },
  init() {
    if (!this.shouldShow()) return;
    // Marca inmediato para evitar que otras secciones o páginas en la misma sesión
    // vuelvan a disparar la intro antes de que termine.
    this.markShown();
    this.createOverlay();
    // Salida al finalizar o si falla la carga
    const done = () => this.fadeOut();
    this.video?.addEventListener('ended', done);
    this.video?.addEventListener('error', done);
    // Timeout de seguridad por si el evento ended no llega
    setTimeout(done, 10000);
    // Permitir cerrar manualmente al hacer clic
    this.overlay?.addEventListener('click', done);
  }
};

const TopNav = {
  init() {
    const links = document.querySelectorAll('header nav a[data-section]');
    links.forEach(a => {
      const href = a.getAttribute('href') || '';
      const isHashOrEmpty = href === '' || href === null || href.startsWith('#');
      if (isHashOrEmpty) {
        // Monopágina: interceptar para alternar secciones
        a.addEventListener('click', e => {
          e.preventDefault();
          const id = a.getAttribute('data-section');
          if (id) mostrarSeccion(id);
        });
        a.setAttribute('role', 'button');
        a.setAttribute('tabindex', '0');
        a.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); a.click(); } });
      } else {
        // Multipágina: dejar que el navegador navegue
        a.removeAttribute('role');
        a.removeAttribute('tabindex');
      }
    });
    // set initial aria-current
    this.updateAria(document.querySelector('section.active')?.id || 'menu');
  },
  updateAria(activeId) {
    document.querySelectorAll('header nav a[data-section]').forEach(a => {
      const isActive = a.getAttribute('data-section') === activeId;
      a.setAttribute('aria-current', isActive ? 'page' : 'false');
    });
  }
};

const Scroll = {
  footerVisible: false, hideTimer: null,
  handleMain() {
    throttle('scroll', () => {
      const delta = window.scrollY - $.lastScrollY;
      // En móvil/ventanas estrechas: ocultar header solo en proyectos.html
      if (window.innerWidth <= 1220) { // margen extra para cubrir límites de breakpoint/zoom
        const inProyectosPage = document.body.classList.contains('proyectos-page');
        if (inProyectosPage) {
          const indiceMobileVisible = (() => { 
            const im = document.getElementById('indice-mobile'); 
            if (!im) return false; 
            const cs = window.getComputedStyle(im); 
            return cs && cs.display !== 'none'; 
          })();
          if (indiceMobileVisible) {
            // Detectar dirección actual
            const currentDirection = delta > 0 ? 1 : (delta < 0 ? -1 : 0);
            // Móvil puro: sin umbral para reacción inmediata
            const threshold = window.innerWidth <= 768 ? 0 : 6;
            
            // Reaccionar si hay cambio de dirección o movimiento sostenido
            if (currentDirection !== 0 && (currentDirection !== $.lastScrollDirection || Math.abs(delta) > threshold)) {
              if (currentDirection > 0) {
                $.header?.classList.add('hidden');
              } else {
                $.header?.classList.remove('hidden');
              }
              $.lastScrollDirection = currentDirection;
            }
          }
        } else {
          // Asegurar que no queda oculto fuera de proyectos
          $.header?.classList.remove('hidden');
        }
      } else if (Math.abs(delta) > 5) {
        // En desktop: mantener umbral para evitar parpadeos
        const hide = delta > 0 && window.scrollY > 100;
        $.header?.classList.toggle('hidden', hide);
      }
      this.updateLayout();
      $.lastScrollY = window.scrollY;
      // Actualizar índice activo en proyectos.html para cualquier scroll (pequeño o grande)
      try {
        if (document.body.classList.contains('proyectos-page')) {
          throttle('nav-active', () => Nav.updateActive(), 16);
        }
      } catch {}
      // Solo actualizar footer en desktop (>1024px)
      if (window.innerWidth > 1024) {
        this.updateFooter();
      }
    });
  },
  updateLayout() {
    const visible = !$.header?.classList.contains('hidden');
    // En móvil no empujar: header es relativo
    const top = $.isNarrow ? 0 : (visible ? $.headerHeight : 0);
    if ($.main) $.main.style.marginTop = `${top}px`;
    if (!$.isNarrow && $.indice) {
      $.indice.style.top = `${top}px`;
    } else if ($.isNarrow && $.indice) {
      $.indice.style.top = '';
    }
  },
  updateFooter() {
    // Si estamos usando el observador por sección, no recalcular aquí
    if (typeof FooterWatch !== 'undefined' && FooterWatch.usingObserver) return;
    if (!$.footer) return;

    // Caso 1: sección Proyectos activa -> controlar por scroll del contenedor
    if ($.isProyectosActive && $.galeriaContainer) {
      const {scrollTop, scrollHeight, clientHeight} = $.galeriaContainer;
      // Aumentar tolerancia a 50px para detectar mejor el final
      const atBottom = (scrollTop + clientHeight) >= (scrollHeight - 50);
      if (atBottom) {
        this.showFooter();
      } else {
        this.hideFooter();
      }
      $.lastScrollTop = scrollTop;
      return;
    }

    // Caso 2: resto de secciones -> controlar por scroll de ventana
    // Buscar la sección activa actual
    const activeSection = document.querySelector('section.active');
    if (!activeSection) {
      this.hideFooter();
      return;
    }
    // En móvil, no mostrar footer en Redes ni Contacto para evitar desplazamientos
    try {
      const activeId = activeSection.id;
      if ($.isMobile && (activeId === 'redes' || activeId === 'contacto')) {
        this.hideFooter();
        return;
      }
    } catch {}

    const doc = document.documentElement;
    const winH = window.innerHeight;
    const scrollY = window.scrollY || window.pageYOffset || doc.scrollTop || 0;
    
    // Calcular el alto total de la sección activa
    const sectionRect = activeSection.getBoundingClientRect();
    const sectionTop = scrollY + sectionRect.top;
    const sectionHeight = activeSection.scrollHeight || sectionRect.height;
    const sectionBottom = sectionTop + sectionHeight;
    
    // Calcular cuánto hemos scrolleado dentro de la sección
    const scrollBottom = scrollY + winH;
    
    // Si la sección cabe completamente en la ventana, mostrar footer inmediatamente
    if (sectionHeight <= winH) {
      this.showFooter();
      return;
    }
    
    // Mostrar footer cuando estamos a 100px o menos del final de la sección
    // Esto da un margen generoso para que siempre aparezca
    const atBottom = scrollBottom >= (sectionBottom - 100);
    
    if (atBottom) {
      this.showFooter();
    } else {
      this.hideFooter();
    }
  },
  showFooter() {
    if (this.footerVisible) return;
    $.footer?.classList.add('visible');
    // Establecer altura del footer como variable CSS y marcar estado en body
    try {
      const h = $.footer.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--footer-h', `${h}px`);
      document.body.classList.add('footer-visible');
    } catch {}
    this.footerVisible = true;
    this.hideTimer && clearTimeout(this.hideTimer);
  },
  hideFooter() {
    $.footer?.classList.remove('visible');
    document.body.classList.remove('footer-visible');
    this.footerVisible = false;
  },
  syncFooterVar() {
    if (!this.footerVisible || !$.footer) return;
    const h = $.footer.getBoundingClientRect().height;
    document.documentElement.style.setProperty('--footer-h', `${h}px`);
  },
  scheduleHide() {
    this.hideTimer && clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => this.hideFooter(), 25);
  }
};

const Nav = {
  // grupos se construirá dinámicamente a partir del HTML del índice para
  // permanecer sincronizado si se añaden/eliminan secciones.
  grupos: [],
  links: null, activeGroup: null, elements: new Map(),
  io: null,
  navRaf: null,
  lastCentered: null,

  // Flag para controlar si el padding ya ha sido calculado y aplicado
  paddingApplied: false,

  init() {
    const desktopLinks = document.querySelectorAll('#indice a');
    const mobileLinks = document.querySelectorAll('#indice-mobile a');
    this.links = [...desktopLinks, ...mobileLinks];

    // Tomar sólo los wrappers de proyecto (.image-wrap con id pN) para evitar
    // confusiones con elementos internos que comparten id pN en imágenes u overlays.
    const sourceForTargets = desktopLinks.length ? desktopLinks : mobileLinks;
    const linkTargets = Array.from(sourceForTargets).map(a => a.getAttribute('href').substring(1));
    const galleryNodes = Array.from(document.querySelectorAll('#galeria .image-wrap[id]'))
                              .filter(el => /^p\d+$/.test(el.id));
    const galleryOrder = galleryNodes.map(el => el.id);

    this.grupos = linkTargets.map((target, i) => {
      const startIdx = galleryOrder.indexOf(target);
      const nextTarget = linkTargets[i + 1];
      const endIdx = nextTarget ? galleryOrder.indexOf(nextTarget) : galleryOrder.length;
      let ids = [];
      if (startIdx >= 0) {
        ids = galleryOrder.slice(startIdx, endIdx >= 0 ? endIdx : galleryOrder.length);
      } else {
        // Si el id del índice no está en la galería (por alguna discrepancia),
        // mantenerlo como único id para que el clic siga funcionando.
        ids = [target];
      }
      return { ids, link: `#${target}` };
    });

    // Cachear específicamente los wrappers `.image-wrap[id="pN"]` para evitar
    // colisiones con otros elementos internos que comparten id="pN" (imágenes, overlays)
    this.grupos.forEach(g => g.ids.forEach(id => {
      const el = document.querySelector(`#galeria .image-wrap[id="${id}"]`);
      el && this.elements.set(id, el);
    }));

    this.links.forEach(link => {
      link.onclick = e => {
        e.preventDefault();
        const target = this.elements.get(link.getAttribute('href').substring(1));
        if (!target) return;
        // Usar scrollIntoView para que actúe sobre el contenedor scrollable correcto
        // (window en móvil/estrecho; #galeria-container en desktop)
        try {
          target.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
        } catch {
          // Fallback
          if ($.isNarrow) {
            const top = target.getBoundingClientRect().top + (window.scrollY || 0);
            window.scrollTo({ top, behavior: 'smooth' });
          } else if ($.galeriaContainer) {
            $.galeriaContainer.scrollTo({ top: target.offsetTop, behavior: 'smooth' });
          }
        }
      };
    });

    // Observer ligero para detectar cambios de visibilidad de secciones y
    // refrescar el índice sin depender de los eventos de scroll.
    try {
      const root = ($.isNarrow || !$.galeriaContainer) ? null : $.galeriaContainer;
      this.io = new IntersectionObserver(() => this.scheduleUpdate(), { root, threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] });
      this.elements.forEach((el) => { try { el && this.io.observe(el); } catch {} });
      // Recalcular al cambiar tamaño/orientación
      window.addEventListener('resize', () => this.scheduleUpdate(), { passive: true });
      // Refresco adicional en scroll de ventana (modo móvil) como respaldo
      window.addEventListener('scroll', () => this.scheduleUpdate(), { passive: true });
      // En desktop, también escuchar el scroll del contenedor de galería
      if ($.galeriaContainer) {
        $.galeriaContainer.addEventListener('scroll', () => this.scheduleUpdate(), { passive: true });
      }
    } catch {}
  },
  scheduleUpdate() {
    if (this.navRaf) return;
    this.navRaf = requestAnimationFrame(() => { try { this.updateActive(); } finally { this.navRaf = null; } });
  },
  centerActive: function(href) {
      try {
          if (!href) return;
          const mobileNav = document.getElementById('indice-mobile');
          if (!mobileNav) return;
          const scroller = mobileNav.querySelector('ul');
          const anchor = mobileNav.querySelector(`a[href='${href}']`);
          if (!scroller || !anchor) return;

          // Remover padding previo: queremos centrar el chip sin forzar espacio para dos chips completos
          scroller.style.paddingLeft = '0';
          scroller.style.paddingRight = '0';

          const scRect = scroller.getBoundingClientRect();
          const aRect = anchor.getBoundingClientRect();

          // Calcular el centro del chip activo en coordenadas de scroll
          const anchorCenter = (aRect.left - scRect.left) + scroller.scrollLeft + (aRect.width / 2);
          // Centrar el chip: el centro del chip debe coincidir con el centro del viewport del scroller
          const targetLeft = anchorCenter - (scroller.clientWidth / 2);

          scroller.scrollTo({ left: targetLeft, behavior: 'smooth' });
          this.lastCentered = href;
      } catch (e) {
          console.error("Error in centerActive:", e);
      }
  },

  updateActive: function() {
    let active = null;
    // Línea de referencia según modo de scroll
    const useContainer = !$.isNarrow && !!$.galeriaContainer;
    const winScroll = (window.scrollY || 0);
    const winH = (window.innerHeight || document.documentElement.clientHeight);
    const centerY = useContainer
      ? ($.galeriaContainer.scrollTop + $.galeriaContainer.clientHeight / 2)
      : (winScroll + winH / 2);

    for (const g of this.grupos) {
      const firstEl = g.ids.map(id => this.elements.get(id)).find(Boolean);
      const lastEl = [...g.ids].reverse().map(id => this.elements.get(id)).find(Boolean);
      if (!firstEl || !lastEl) continue;

      let start, end;
      if (useContainer) {
        // Medidas relativas al contenedor con scroll interno (desktop)
        start = firstEl.offsetTop;
        end = lastEl.offsetTop + lastEl.offsetHeight;
      } else {
        // Medidas relativas al documento (móvil / ventana)
        const firstRect = firstEl.getBoundingClientRect();
        const lastRect = lastEl.getBoundingClientRect();
        start = firstRect.top + winScroll;
        end = lastRect.bottom + winScroll;
      }

      if (start <= centerY && end >= centerY) {
        active = g.link;
        break;
      }
    }

    // Fallback al último grupo si hemos pasado su inicio
    if (!active && this.grupos.length) {
      const lastGroup = this.grupos[this.grupos.length - 1];
      const lastEl = [...lastGroup.ids].reverse().map(id => this.elements.get(id)).find(Boolean);
      if (lastEl) {
        const startLast = useContainer ? lastEl.offsetTop : (lastEl.getBoundingClientRect().top + winScroll);
        if (startLast <= centerY) active = lastGroup.link;
      }
    }

    if (this.activeGroup !== active) {
      this.links.forEach(l => l.classList.remove('active'));
      if (active) {
        document.querySelectorAll(`#indice a[href='${active}'], #indice-mobile a[href='${active}']`)?.forEach(el => el.classList.add('active'));
      }
      this.activeGroup = active;
      // Centrar el chip activo en el índice móvil
      if (active) this.centerActive(active);
    }
  }
};
// ===== UTILIDAD PARA AÑADIR TEXTOS =====
function addTextOverlay(imageId, text, options = {}) {
  const imageWrap = document.querySelector(`.image-wrap#${imageId}`);
  if (!imageWrap) {
    console.warn(`No se encontró image-wrap con id: ${imageId}`);
    return null;
  }
  
  const textDiv = document.createElement('div');
  textDiv.className = 'text-overlay';
  textDiv.textContent = text;
  
  // Aplicar posicionamiento y estilos usando variables CSS
  const styles = {
    '--text-top': options.top || '10%',
    '--text-left': options.left || '10%',
    '--text-right': options.right || 'auto',
    '--text-bottom': options.bottom || 'auto',
    '--text-width': options.width || 'auto',
    '--text-height': options.height || 'auto',
    '--text-max-width': options.maxWidth || '300px',
    '--text-align': options.align || 'left',
    '--text-transform': options.transform || 'none',
    'color': options.color || '#333',
    'font-size': options.fontSize || '16px',
    'font-weight': options.fontWeight || 'normal'
  };
  
  Object.entries(styles).forEach(([prop, value]) => {
    if (value !== 'auto' && value !== 'none') {
      textDiv.style.setProperty(prop, value);
    }
  });
  
  imageWrap.appendChild(textDiv);
  return textDiv;
}

// ===== Arranque (centralizado más abajo con init()) =====

// ===== FUNCIONES DE NAVEGACIÓN Y IDIOMA =====
function mostrarSeccion(id) {
  document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
  
  // Ocultar footer inmediatamente al cambiar de sección
  Scroll.hideFooter();
  // En móvil: bloquear scroll cuando estemos en secciones de pantalla completa
  try {
    const lock = $.isMobile && (id === 'redes' || id === 'contacto');
    document.body.classList.toggle('lock-scroll', lock);
    document.documentElement.classList.toggle('lock-scroll', lock);
  } catch {}
  
  // Resetear scroll a la parte superior
  window.scrollTo({top: 0, behavior: 'smooth'});
  if ($.galeriaContainer) $.galeriaContainer.scrollTop = 0;
  
  // actualizar estado de nav superior
  TopNav.updateAria(id);
  
  $.isProyectosActive = (id === 'proyectos');
  // Desactivar scroll global sólo en escritorio ancho (>1024px)
  $.body.classList.toggle('proyectos-active', $.isProyectosActive && !$.isNarrow);
  // Reconfigurar observador del footer para la sección activa
  try { FooterWatch.attachToCurrentSection(); } catch {}
  
  // Manejo del carrusel (footer se controla globalmente por scroll)
  if (id === 'menu') {
    requestAnimationFrame(() => Carousel.start());
  } else {
    Carousel.stop();
  }
  
  if ($.isProyectosActive) {
    debounce('setup', () => { Videos.init(); Effects.setup(); Overlays.update(); Thumbnails.start(); }, 100);
  } else {
    Effects.reset(); Thumbnails.stop();
  }
  
  // Evaluar footer después de que la sección se haya cargado completamente
  // Aumentar el delay y verificar múltiples veces para asegurar detección correcta
  setTimeout(() => { 
    Layout.update(); 
    // Si el observador está activo, no hace falta; en fallback, recalcular
    if (!FooterWatch.usingObserver) Scroll.updateFooter(); 
  }, 200);
  
  // Verificar de nuevo después de que las animaciones se hayan completado
  setTimeout(() => { 
    if (!FooterWatch.usingObserver) Scroll.updateFooter(); 
  }, 600);
  
  // Una última verificación para secciones que cargan contenido dinámicamente
  setTimeout(() => { 
    if (!FooterWatch.usingObserver) Scroll.updateFooter(); 
  }, 1200);
}

function irAProyecto(targetRef) {
  // Si no estamos en la página de proyectos, navegar vía URL
  const onProyectosPage = !!document.getElementById('proyectos');
  const isStringRef = typeof targetRef === 'string';
  if (!onProyectosPage) {
    const anchor = isStringRef ? String(targetRef) : '';
    const url = anchor ? `proyectos.html#${anchor}` : 'proyectos.html';
    window.location.href = url;
    return;
  }

  // En página de proyectos: comportamiento SPA, mostrar sección y hacer scroll
  mostrarSeccion('proyectos');
  setTimeout(() => {
    let target = null;
    if (isStringRef) {
      // Ir a la sección (image-wrap) con id concreto, p.ej. 'p3', 'p7'
      target = document.getElementById(targetRef);
    } else {
      // Compatibilidad con índices antiguos (por índice)
      target = $.galeria?.querySelectorAll('img, video')[targetRef];
    }
    if (target && $.galeriaContainer) {
      $.galeriaContainer.scrollTo({ top: target.offsetTop, behavior: 'smooth' });
    }
  }, 100);
}

const Lang = {
  init() {
    const [btn, list] = ['idioma-btn', 'idioma-list'].map(id => document.getElementById(id));
    const elements = document.querySelectorAll('[data-es]');
    
  if (btn && list) {
      // A11y roles y control de estado
      btn.setAttribute('aria-haspopup', 'listbox');
      btn.setAttribute('aria-controls', 'idioma-list');
      btn.setAttribute('aria-expanded', 'false');
      list.setAttribute('role', 'listbox');
      list.querySelectorAll('div').forEach(d => d.setAttribute('role', 'option'));

      const toggle = (open) => {
        const willOpen = typeof open === 'boolean' ? open : list.style.display !== 'block';
        list.style.display = willOpen ? 'block' : 'none';
        btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
        list.setAttribute('aria-hidden', willOpen ? 'false' : 'true');
      };

      btn.onclick = () => toggle();
      document.onclick = e => !btn.contains(e.target) && !list.contains(e.target) && toggle(false);
      document.addEventListener('keydown', e => { if (e.key === 'Escape') toggle(false); });

      // Opciones de idioma sin inline handlers
      list.querySelectorAll('[data-lang]').forEach(opt => {
        opt.addEventListener('click', () => cambiarIdioma(opt.getAttribute('data-lang')));
        opt.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cambiarIdioma(opt.getAttribute('data-lang')); }});
        opt.setAttribute('tabindex', '0');
      });
    }
    
    this.change = lang => {
      localStorage.setItem('idioma', lang);

      // Actualizar URL y enlaces para persistencia entre páginas
      const url = new URL(window.location);
      url.searchParams.set('lang', lang);
      window.history.replaceState({}, '', url);
      
      document.querySelectorAll('a[href]').forEach(a => {
        const href = a.getAttribute('href');
        if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('javascript:')) {
          try {
            let [path, hash] = href.split('#');
            let [base, query] = path.split('?');
            // Evitar modificar enlaces a archivos que no sean html (opcional, pero recomendable)
            if (base.endsWith('.pdf') || base.endsWith('.jpg') || base.endsWith('.png')) return;
            
            const params = new URLSearchParams(query);
            params.set('lang', lang);
            a.setAttribute('href', `${base}?${params.toString()}${hash ? '#' + hash : ''}`);
          } catch (e) {}
        }
      });

      if (btn) btn.textContent = lang.toUpperCase();
      elements.forEach(el => {
        const text = el.getAttribute(`data-${lang}`);
        text && (el.textContent = text);
      });
      // Actualizar enlace de CV según idioma
      try {
        const cvBtn = document.getElementById('btn-cv');
        if (cvBtn) {
          const href = lang === 'en' ? 'assets/Secciones/Menu/CV/Resume_JaimeCereijo.pdf' : 'assets/Secciones/Menu/CV/Curriculum_JaimeCereijo.pdf';
          cvBtn.setAttribute('href', href);
        }
      } catch {}
      // Re-formatear autores de referencias: salto de línea antes del rol
      try { formatQuoteAuthors(); } catch {}
    };
    
    const urlParams = new URLSearchParams(window.location.search);
    const initialLang = urlParams.get('lang') || localStorage.getItem('idioma') || 'es';
    this.change(initialLang);
  }
};

function cambiarIdioma(idioma) { Lang.change(idioma); }

// Inserta un salto de línea entre el nombre del autor y su rol (entre paréntesis o tras coma)
function formatQuoteAuthors() {
  const spans = document.querySelectorAll('.quote-author span');
  spans.forEach(span => {
    if (!span) return;
    // Usar el texto actualmente visible (ya aplicado por Lang.change)
    const text = span.textContent || '';
    if (!text) return;
    let splitIdx = text.indexOf('(');
    if (splitIdx === -1) {
      const comma = text.indexOf(',');
      if (comma !== -1) splitIdx = comma;
    }
    if (splitIdx > 0 && splitIdx < text.length) {
      const name = text.slice(0, splitIdx).trim();
      const rest = text.slice(splitIdx).trim();
      span.innerHTML = `${name}<br><span class="quote-author-role">${rest}</span>`;
    } else {
      // Mantener el texto tal cual si no hay separador
      span.textContent = text;
    }
  });
}

// ===== OVERLAYS Y EFECTOS OPTIMIZADOS =====
const Overlays = {
  container: null,
  updatePending: false,
  elements: new Map(),
  cascadeTimers: new Map(),
  observer: null,
  activeIds: new Set(),
  init() {
    this.container = $.galeriaContainer;
    if (!this.container) return;

    // Cache elementos al inicio
    document.querySelectorAll('.image-wrap').forEach(wrap => {
      const base = wrap.querySelector('.base');
      if (base) {
        this.elements.set(wrap.id, {
          wrap,
          base,
          overlays: Array.from(wrap.querySelectorAll('.overlay:not([data-stand]):not(.overlay-botella), .overlay2:not(.overlay-rollo)')),
          stands: wrap.querySelectorAll('.overlay[data-stand="true"]'),
          rollos: wrap.querySelectorAll('.overlay-rollo')
        });
        wrap.dataset.overlayId = wrap.id;
      }
    });

    const root = this.container || null;
    try {
      this.observer = new IntersectionObserver((entries) => this.handleIntersect(entries), {
        root,
        threshold: 0.12
      });
      this.elements.forEach(({wrap}) => wrap && this.observer.observe(wrap));
    } catch {
      this.observer = null;
      // Fallback: activar todos los elementos
      this.elements.forEach((_, id) => this.activeIds.add(id));
    }

    this.container.addEventListener('scroll', () => this.requestUpdate(), {passive: true});
    window.addEventListener('resize', () => this.handleResize(), {passive: true});
    this.requestUpdate(true);
  },

  handleResize() {
    if (!$.isProyectosActive) return;
    this.requestUpdate(true);
  },

  handleIntersect(entries) {
    entries.forEach(entry => {
      const id = entry.target?.dataset?.overlayId;
      if (!id) return;
      if (entry.isIntersecting) {
        this.activeIds.add(id);
      } else {
        this.activeIds.delete(id);
        this.resetWrap(id);
      }
    });
    this.requestUpdate();
  },

  requestUpdate(force = false) {
    if (!$.isProyectosActive) return;
    if (this.updatePending && !force) return;
    this.updatePending = true;
    requestAnimationFrame(() => this.update());
  },

  getViewportInfo(base, containerRect) {
    const rect = base.getBoundingClientRect();
    const visibleHeight = Math.max(0, Math.min(rect.bottom, containerRect.bottom) - Math.max(rect.top, containerRect.top));
    const imgCenter = rect.top + rect.height / 2;
    const containerCenter = containerRect.top + containerRect.height / 2;
    return {
      visible: rect.height > 0 ? (visibleHeight / rect.height) >= 0.6 : false,
      centered: Math.abs(imgCenter - containerCenter) <= containerRect.height * 0.3,
      outOfView: rect.bottom <= containerRect.top || rect.top >= containerRect.bottom
    };
  },

  resetWrap(id) {
    const entry = this.elements.get(id);
    if (!entry) return;
    const {overlays, stands, rollos, wrap} = entry;
    if (overlays?.length) {
      overlays.forEach(o => o.classList.remove('visible'));
      const prev = this.cascadeTimers.get(id);
      if (prev) {
        prev.forEach(t => clearTimeout(t));
        this.cascadeTimers.delete(id);
      }
    }
    stands?.forEach(stand => stand.classList.remove('immediate-visible', 'resetting'));
    rollos?.forEach(rollo => {
      const initial = rollo.getAttribute('data-initial-direction') || 'left';
      rollo.classList.remove('centered', 'displaced-left', 'displaced-right');
      rollo.classList.add(`displaced-${initial}`);
      rollo.style.transform = rollo.classList.contains('overlay2') ? 'translateX(-50%)' : '';
      const rolloNum = rollo.getAttribute('data-rollo');
      if (rolloNum === '2' && wrap) {
        const associatedText = wrap.querySelector('.text-overlay');
        if (associatedText) {
          associatedText.classList.remove('centered', 'displaced-left', 'displaced-right');
          associatedText.classList.add(`displaced-${initial}`);
          associatedText.style.transform = 'translateX(0px)';
        }
      }
    });
  },

  update() {
    if (!$.isProyectosActive) {
      this.updatePending = false;
      return;
    }
    const activeIds = this.activeIds.size ? Array.from(this.activeIds) : Array.from(this.elements.keys());
    const containerRect = (this.container || document.documentElement).getBoundingClientRect();

    activeIds.forEach(id => {
      const entry = this.elements.get(id);
      if (!entry) return;
      const {wrap, base, overlays, stands, rollos} = entry;
      const info = this.getViewportInfo(base, containerRect);

      if (wrap && wrap.id === 'p9') {
        // Sección especial gestionada aparte
      } else if (overlays && overlays.length) {
        if (info.visible) {
          if (overlays.length > 1) {
            if (!overlays[0].classList.contains('visible')) {
              const prev = this.cascadeTimers.get(wrap.id);
              if (prev) { prev.forEach(t => clearTimeout(t)); this.cascadeTimers.delete(wrap.id); }
              const timers = [];
              overlays.forEach((o, i) => {
                const t = setTimeout(() => { o.classList.add('visible'); }, i * 140);
                timers.push(t);
              });
              this.cascadeTimers.set(wrap.id, timers);
            }
          } else {
            overlays.forEach(o => o.classList.add('visible'));
          }
        } else {
          overlays.forEach(o => o.classList.remove('visible'));
          const prev = this.cascadeTimers.get(wrap.id);
          if (prev) { prev.forEach(t => clearTimeout(t)); this.cascadeTimers.delete(wrap.id); }
        }
      }

      this.processStands(stands, info);
      this.processRollos(rollos, info);
    });

    const scrollPos = $.isNarrow 
      ? ((window.scrollY || 0) + (window.innerHeight || document.documentElement.clientHeight) / 4)
      : ($.galeriaContainer.scrollTop + $.galeriaContainer.clientHeight / 4);
    Nav.updateActive(scrollPos);
    !$.bottleEffectTriggered && Bottles.checkTrigger();
    this.updatePending = false;
  },
  
  processStands(stands, {outOfView, centered}) {
    stands.forEach(stand => {
      const visible = stand.classList.contains('immediate-visible');
      if (outOfView && visible) {
        stand.classList.remove('immediate-visible');
        setTimeout(() => {
          stand.classList.add('resetting');
          setTimeout(() => stand.classList.remove('resetting'), 50);
        }, 600);
      } else if (centered && !visible && !outOfView) {
        stand.classList.add('immediate-visible');
      }
    });
  },
  
  processRollos(rollos, {centered}) {
    rollos.forEach(rollo => {
      const isCentered = rollo.classList.contains('centered');
      if (centered !== isCentered) {
        rollo.classList.toggle('centered', centered);
        if (centered) {
          rollo.classList.remove('displaced-left', 'displaced-right');
        } else {
          const dir = rollo.getAttribute('data-initial-direction') === 'right' ? 'displaced-right' : 'displaced-left';
          rollo.classList.add(dir);
        }
      }
      
      // Sincronizar texto asociado al rollo (especialmente rollo2)
      const rolloNum = rollo.getAttribute('data-rollo');
      if (rolloNum === '2') {
        const wrap = rollo.closest('.image-wrap');
        const associatedText = wrap?.querySelector('.text-overlay');
        if (associatedText) {
          // Copiar las mismas clases de estado del rollo al texto
          associatedText.classList.toggle('centered', rollo.classList.contains('centered'));
          associatedText.classList.toggle('displaced-left', rollo.classList.contains('displaced-left'));
          associatedText.classList.toggle('displaced-right', rollo.classList.contains('displaced-right'));
        }
      }
    });
  }
};

// ===== EFECTOS CONSOLIDADOS =====
const Effects = {
  handlers: new WeakMap(),
  
  setup() {
    ['stands', 'bottles', 'rollos', 'carteles'].forEach((type, i) => 
      debounce(`setup-${type}`, () => this[`setup${type.charAt(0).toUpperCase() + type.slice(1)}`](), 100 + i * 50));
  },
  
  setupStands() {
    document.querySelectorAll('[data-stand="true"]').forEach(stand => {
      if (this.handlers.has(stand)) return;
      
      Object.assign(stand.style, {position: 'absolute', pointerEvents: 'auto', cursor: 'default'});
      const rectState = {rect: null, ts: 0};
      const getRect = () => {
        const now = performance.now();
        if (!rectState.rect || (now - rectState.ts) > 500) {
          rectState.rect = stand.getBoundingClientRect();
          rectState.ts = now;
        }
        return rectState.rect;
      };
      const invalidateRect = () => { rectState.rect = null; };
      
      let hovering = false, isHovering = false;
      const isOpaque = (x, y) => {
        const rect = getRect();
        const [relX, relY] = [(x - rect.left) / rect.width, (y - rect.top) / rect.height];
        return relX >= 0.25 && relX <= 0.75 && relY >= 0.15 && relY <= 0.85;
      };
      
      const onMouseMove = e => {
        const opaque = isOpaque(e.clientX, e.clientY);
        if (opaque !== isHovering) {
          isHovering = opaque;
          if (opaque) {
            hovering = true;
            Object.assign(stand.style, {willChange: 'transform', transform: 'scale(1.02)', cursor: 'pointer'});
          } else {
            hovering = false;
            Object.assign(stand.style, {cursor: 'default', transform: 'scale(1)', willChange: 'auto'});
            return;
          }
        }
        
        if (hovering && opaque) {
          const rect = getRect();
          const [centerX, centerY] = [rect.left + rect.width / 2, rect.top + rect.height / 2];
          const [deltaX, deltaY] = [(e.clientX - centerX) * 0.06, (e.clientY - centerY) * 0.06];
          const [x, y] = [Math.max(-8, Math.min(8, deltaX)), Math.max(-8, Math.min(8, deltaY))];
          stand.style.transform = `scale(1.02) translate(${x}px, ${y}px)`;
        }
      };
      
      const onMouseLeave = () => {
        hovering = isHovering = false;
        Object.assign(stand.style, {cursor: 'default', transform: 'scale(1)'});
        setTimeout(() => stand.style.willChange = 'auto', 200);
        invalidateRect();
      };
      
      ['mousemove', 'mouseleave'].forEach((e, i) => 
        stand.addEventListener(e, [onMouseMove, onMouseLeave][i]));
      this.handlers.set(stand, {onMouseMove, onMouseLeave});
    });
  },
  
  setupRollos() {
    document.querySelectorAll('.overlay-rollo').forEach(rollo => {
      if (this.handlers.has(rollo)) return;
      
      const dir = Math.random() > 0.5 ? 'right' : 'left';
      rollo.classList.add(`displaced-${dir}`);
      rollo.setAttribute('data-initial-direction', dir);
      Object.assign(rollo.style, {pointerEvents: 'auto', zIndex: '100'});
      const rectState = {rect: null, ts: 0};
      const getRect = () => {
        const now = performance.now();
        if (!rectState.rect || (now - rectState.ts) > 500) {
          rectState.rect = rollo.getBoundingClientRect();
          rectState.ts = now;
        }
        return rectState.rect;
      };
      const invalidateRect = () => { rectState.rect = null; };
      
      // Encontrar el texto asociado (especialmente para rollo2)
      const rolloNum = rollo.getAttribute('data-rollo');
      const wrap = rollo.closest('.image-wrap');
      const associatedText = (rolloNum === '2' && wrap) ? wrap.querySelector('.text-overlay') : null;
      
      // Si hay texto asociado, aplicarle también las clases iniciales
      if (associatedText) {
        associatedText.classList.add(`displaced-${dir}`);
        associatedText.setAttribute('data-initial-direction', dir);
      }
      
      const onMouseMove = e => {
        if (rollo.classList.contains('centered')) {
          const rect = getRect();
          const x = Math.max(-8, Math.min(8, (e.clientX - rect.left - rect.width / 2) * 0.06));
          rollo.style.transform = `translateX(-50%) translateX(${x}px)`;
          
          // Sincronizar movimiento del texto asociado
          if (associatedText) {
            associatedText.style.transform = `translateX(${x}px)`;
          }
        }
      };
      
      const onMouseLeave = () => {
        rollo.style.cursor = 'default';
        const transform = rollo.classList.contains('centered') 
          ? 'translateX(-50%) translateX(0px)'
          : `translateX(-50%) translateX(${rollo.classList.contains('displaced-left') ? '-5%' : '5%'})`;
        rollo.style.transform = transform;
        invalidateRect();
        
        // Sincronizar reset del texto asociado
        if (associatedText) {
          const textTransform = rollo.classList.contains('centered')
            ? 'translateX(0px)'
            : `translateX(${rollo.classList.contains('displaced-left') ? '-5%' : '5%'})`;
          associatedText.style.transform = textTransform;
        }
      };
      
      rollo.addEventListener('mouseenter', () => Object.assign(rollo.style, {cursor: 'pointer', pointerEvents: 'auto', zIndex: '100'}));
      ['mousemove', 'mouseleave', 'click'].forEach((e, i) => 
        rollo.addEventListener(e, [onMouseMove, onMouseLeave, e => { e.preventDefault(); e.stopPropagation(); }][i]));
      
      this.handlers.set(rollo, {onMouseMove, onMouseLeave});
    });
  },
  
  setupBottles() {
    const container = document.querySelector('.image-wrap#p4');
    if (!container || container.hasAttribute('data-bottles-configured')) return;
    
    const bottles = Array.from(document.querySelectorAll('.overlay-botella'));
    if (!bottles.length) return;
    
    bottles.forEach((bottle, i) => {
      bottle.style.zIndex = (10 + i).toString();
      bottle.style.pointerEvents = 'none';
    });
    
    container.setAttribute('data-bottles-configured', 'true');
    const ranges = [[0.0682, 0.1877], [0.1877, 0.266], [0.266, 0.33], [0.33, 0.375], [0.375, 0.43], 
                   [0.43, 0.48], [0.48, 0.52], [0.52, 0.555], [0.555, 0.585]];
    let lastActive = null, rafPending = false;
    const rectState = {rect: null, ts: 0};
    const getRect = () => {
      const now = performance.now();
      if (!rectState.rect || (now - rectState.ts) > 500) {
        rectState.rect = container.getBoundingClientRect();
        rectState.ts = now;
      }
      return rectState.rect;
    };
    const invalidateRect = () => { rectState.rect = null; };
    
    const onMouseMove = e => {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => {
        const rect = getRect();
        const [relX, relY] = [(e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height];
        let active = null;
        
        if (relY >= 0.2 && relY <= 0.8) {
          ranges.some((range, i) => {
            if (relX >= range[0] && relX <= range[1]) {
              active = i + 1;
              return true;
            }
          });
        }
        
        if (lastActive !== active) {
          bottles.forEach(b => b.classList.remove('hover-active'));
          if (active) {
            container.querySelector(`.overlay-botella[data-botella="${active}"]`)?.classList.add('hover-active');
            container.style.cursor = 'pointer';
          } else container.style.cursor = 'default';
          lastActive = active;
        }
        rafPending = false;
      });
    };
    
    const onMouseLeave = () => {
      bottles.forEach(b => b.classList.remove('hover-active'));
      container.style.cursor = 'default';
      lastActive = null;
        invalidateRect();
    };
    
    ['mousemove', 'mouseleave'].forEach((e, i) => 
      container.addEventListener(e, [onMouseMove, onMouseLeave][i]));

    // Hacer el contenedor focusable para accesibilidad y atender clicks/teclas
    try { container.setAttribute('tabindex', '0'); container.setAttribute('role', 'button'); } catch {}

    // Al hacer click en la zona de las botellas abrimos la imagen correspondiente
    container.addEventListener('click', (evt) => {
      // lastActive contiene el índice (1..9) de la botella calculada por onMouseMove
      if (!lastActive) return;
      // Construir la ruta asumida dentro de Botellas_PopUp usando extensión .jpg
      const popupPath = `assets/Secciones/Proyectos/Nostre/Botellas_PopUp/Botella${lastActive}.jpg`;
      try { window.open(popupPath, '_blank', 'noopener'); } catch (e) { window.location.href = popupPath; }
    });

    // Soporte por teclado: Enter / Space abren la botella actualmente activa
    container.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!lastActive) return;
        const el = container.querySelector(`.overlay-botella[data-botella="${lastActive}"]`);
        const rel = el && el.getAttribute && el.getAttribute('src');
        if (!lastActive) return;
        const popupPath = `assets/Secciones/Proyectos/Nostre/Botellas_PopUp/Botella${lastActive}.jpg`;
        try { window.open(popupPath, '_blank', 'noopener'); } catch (e) { window.location.href = popupPath; }
      }
    });
  },

  setupCartels() {
    const container = document.querySelector('.image-wrap#p9');
    if (!container || container.hasAttribute('data-cartels-configured')) return;

    const areas = Array.from(container.querySelectorAll('.cartel-area[data-cartel]'));
    if (!areas.length) {
      container.setAttribute('data-cartels-configured', 'true');
      return;
    }

    // Helper: compute and persist transform-origin for each area-overlay pair.
    const computeAllOrigins = () => {
      areas.forEach(area => {
        const id = area.getAttribute('data-cartel');
        const overlay = container.querySelector(`.overlay[data-cartel="${id}"]`);
        const sombra = container.querySelector(`.sombra[data-cartel="${id}"]`);
        if (!overlay && !sombra) return;
        // Ensure overlays/sombras don't intercept pointer events (areas will control interaction)
        overlay && (overlay.style.pointerEvents = 'none');
        sombra && (sombra.style.pointerEvents = 'none');

        const areaRect = area.getBoundingClientRect();
        // Compute origins relative to overlay/sombra bounding boxes if present
        const centerX = areaRect.left + areaRect.width / 2;
        const centerY = areaRect.top + areaRect.height / 2;
        if (overlay) {
          const overlayRect = overlay.getBoundingClientRect();
          // compute origin as percentage to keep the same relative pivot across
          // elements that may have different intrinsic sizes
          const ox = Math.max(0, Math.min(overlayRect.width, centerX - overlayRect.left));
          const oy = Math.max(0, Math.min(overlayRect.height, centerY - overlayRect.top));
          const px = (overlayRect.width > 0) ? (ox / overlayRect.width) * 100 : 50;
          const py = (overlayRect.height > 0) ? (oy / overlayRect.height) * 100 : 50;
          overlay.style.transformOrigin = `${px.toFixed(2)}% ${py.toFixed(2)}%`;
        }
        if (sombra) {
          const sombraRect = sombra.getBoundingClientRect();
          const sx = Math.max(0, Math.min(sombraRect.width, centerX - sombraRect.left));
          const sy = Math.max(0, Math.min(sombraRect.height, centerY - sombraRect.top));
          const spx = (sombraRect.width > 0) ? (sx / sombraRect.width) * 100 : 50;
          const spy = (sombraRect.height > 0) ? (sy / sombraRect.height) * 100 : 50;
          sombra.style.transformOrigin = `${spx.toFixed(2)}% ${spy.toFixed(2)}%`;
        }
      });
    };

    // Initial computation
    computeAllOrigins();
    // Recompute on resize (debounced) so origins stay correct if layout changes
    window.addEventListener('resize', () => debounce('cartel-origins', computeAllOrigins, 120));

    areas.forEach(area => {
      const id = area.getAttribute('data-cartel');
      const overlay = container.querySelector(`.overlay[data-cartel="${id}"]`);
      const sombra = container.querySelector(`.sombra[data-cartel="${id}"]`);
      // If neither element present, skip
      if (!overlay && !sombra) return;

      const onEnter = () => {
        overlay && overlay.classList.add('active');
        sombra && sombra.classList.add('active');
      };
      const onLeave = () => {
        overlay && overlay.classList.remove('active');
        sombra && sombra.classList.remove('active');
      };

      // Attach listeners (areas control interactivity)
      area.addEventListener('mouseenter', onEnter);
      area.addEventListener('mouseleave', onLeave);
      area.addEventListener('pointerenter', onEnter);
      area.addEventListener('pointerleave', onLeave);
      // Also support keyboard focus/blur to mirror hover behavior
      area.addEventListener('focus', onEnter);
      area.addEventListener('blur', onLeave);
      // Click: abrir popup con la imagen grande correspondiente (mismo patrón que las botellas)
      area.addEventListener('click', (evt) => {
        evt.preventDefault();
  const popupPath = `assets/Secciones/Proyectos/Zombis/Carteles_PopUp/cartel${id}.webp`;
        try { window.open(popupPath, '_blank', 'noopener'); } catch (e) { window.location.href = popupPath; }
        // Tras abrir el popup, desactivar la overlay/sombra y quitar el foco del área
        try { onLeave(); } catch (ignore) {}
        try { area.blur(); } catch (ignore) {}
      });
      // Teclado: Enter / Space abren el popup y también desactivan la overlay/sombra
      area.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const popupPath = `assets/Secciones/Proyectos/Zombis/Carteles_PopUp/cartel${id}.webp`;
          try { window.open(popupPath, '_blank', 'noopener'); } catch (err) { window.location.href = popupPath; }
          try { onLeave(); } catch (ignore) {}
          try { area.blur(); } catch (ignore) {}
        }
      });
    });

    // Inicializar efecto de aparición al entrar en la sección 'Zona Zombi' (p9)
    // Aplicar clase inicial que oculta por opacidad tanto a los carteles como a las sombras,
    // y observar el contenedor de galería para hacer la aparición una vez la sección sea visible.
    try {
      const p9Overlays = Array.from(container.querySelectorAll('.overlay'));
      const p9Sombras = Array.from(container.querySelectorAll('.sombra'));
      const all = p9Overlays.concat(p9Sombras).filter(Boolean);

      // Queremos que SOLO los carteles impares participen en la animación de entrada
      // y en el orden específico pedido por el usuario: 3, 7, 1, 5.
      const desiredOrder = ['3', '7', '1', '5'];

      // Añadir clase inicial solo a los elementos que correspondan a carteles impares
      all.forEach(el => {
        const id = el.getAttribute && el.getAttribute('data-cartel');
        if (id && parseInt(id) % 2 === 1) {
          el.classList.add('p9-entrance-hidden');
        }
      });

      // Función que activa la aparición: reemplaza la clase hidden por la clase shown
      // y además simula brevemente el efecto 'hover' (clase .active) en cascada,
      // en el orden fijo para los carteles impares.
      const triggerEntrance = () => {
        try {
          // Agrupar elementos por su data-cartel para activar overlay+sombra juntos
          const groups = new Map();
          container.querySelectorAll('.overlay[data-cartel], .sombra[data-cartel]').forEach(el => {
            const id = el.getAttribute('data-cartel');
            if (!id) return;
            // Sólo incluir carteles impares
            if (parseInt(id) % 2 === 0) return;
            if (!groups.has(id)) groups.set(id, []);
            groups.get(id).push(el);
          });

          // Construir la lista de ids en el orden solicitado, ignorando los que no existan
          const ids = desiredOrder.filter(id => groups.has(id));

          const cssTransition = 220; // tiempo de la transición CSS (ms)
          // Aumentar 'overlap' reduce el solapamiento (más tiempo entre inicios).
          // Valor aumentado a 220ms para un solapamiento notablemente menor.
          const overlap = 220; // ms entre inicios
          const activeDuration = Math.max(260, cssTransition + 40);

          ids.forEach((id, idx) => {
            const delay = idx * overlap; // sin variación aleatoria para respetar el orden exacto
            setTimeout(() => {
              const els = groups.get(id) || [];
              els.forEach(el => {
                el.classList.remove('p9-entrance-hidden');
                // Forzar reflow mínimo antes de añadir la clase de shown para asegurar la transición
                void el.offsetWidth;
                el.classList.add('p9-entrance-shown');
              });

              // Simular el hover: activar la clase .active en overlay+sombra durante un instante
              els.forEach(el => el.classList.add('active'));
              setTimeout(() => els.forEach(el => el.classList.remove('active')), activeDuration);
            }, Math.max(0, Math.round(delay)));
          });
        } catch (err) { /* silencioso */ }
      };

      // Si $.galeriaContainer está disponible, usamos IntersectionObserver con root=shell
      const root = $.galeriaContainer || null;
      const io = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            // Ejecutar la aparición y el efecto hover en cascada cada vez
            // que la sección entre en el viewport suficiente.
            triggerEntrance();
            // No desconectamos el observer: permitimos que se vuelva a
            // ejecutar cuando el usuario salga y regrese a la sección.
            break;
          }
        }
      }, { root, threshold: 0.45 });

      // Observar la propia sección (container)
      io.observe(container);

      // Si la sección ya está dentro del viewport suficiente en el momento de la carga,
      // disparar inmediatamente sin esperar al IO.
      try {
        if (root) {
          const rootRect = root.getBoundingClientRect();
          const secRect = container.getBoundingClientRect();
          const visibleHeight = Math.max(0, Math.min(secRect.bottom, rootRect.bottom) - Math.max(secRect.top, rootRect.top));
          if (visibleHeight / secRect.height >= 0.45) {
            triggerEntrance();
            // keep observing so the effect can run again on re-entry
          }
        } else {
          // Si no hay root, fallback a viewport check
          const secRect = container.getBoundingClientRect();
          const winH = window.innerHeight || document.documentElement.clientHeight;
          const visibleHeight = Math.max(0, Math.min(secRect.bottom, winH) - Math.max(secRect.top, 0));
          if (visibleHeight / secRect.height >= 0.45) {
            triggerEntrance();
            // keep observing so the effect can run again on re-entry
          }
        }
      } catch (e) { /* silencioso */ }
    } catch (e) { /* silencioso */ }

    container.setAttribute('data-cartels-configurados', 'true');
  },
  
  reset() {
    document.querySelectorAll('.overlay-stand, .overlay-rollo, .overlay-botella').forEach(el => {
      el.classList.remove('immediate-visible', 'resetting', 'centered', 'hover-active');
      Object.assign(el.style, {transform: '', cursor: 'default', willChange: 'auto'});
    });
    // clear any cascade timers and visible classes for thumbnail overlays
    Overlays.cascadeTimers.forEach(arr => arr.forEach(t => clearTimeout(t)));
    Overlays.cascadeTimers.clear();
    document.querySelectorAll('#p9 .overlay, #p11 .overlay, #p15 .overlay').forEach(o => o.classList.remove('visible'));
    this.handlers = new WeakMap();
  }
};

const Bottles = {
  cachedElements: null,
  checkTrigger() {
    if (!this.cachedElements) {
      this.cachedElements = {
        nostre2: document.getElementById('p4'),
        bottles: Array.from(document.querySelectorAll('.overlay-botella'))
          .sort((a, b) => parseInt(a.getAttribute('data-botella')) - parseInt(b.getAttribute('data-botella')))
      };
    }
    
    const {nostre2} = this.cachedElements;
    if (!nostre2 || !$.galeriaContainer) return;
    
    const containerRect = $.galeriaContainer.getBoundingClientRect();
    const sectionRect = nostre2.getBoundingClientRect();
    const [zoneTop, zoneBottom] = [containerRect.top + containerRect.height * 0.3, 
                                  containerRect.top + containerRect.height * 0.7];
    
    if (sectionRect.top <= zoneBottom && sectionRect.bottom >= zoneTop) {
      $.bottleEffectTriggered = true;
      setTimeout(() => this.pulse(), 100);
    }
    
    if ($.bottleEffectTriggered && (sectionRect.bottom < containerRect.top - 200 || 
                                   sectionRect.top > containerRect.bottom + 200)) {
      $.bottleEffectTriggered = false;
    }
  },
  
  pulse() {
    this.cachedElements.bottles.forEach((bottle, i) => {
      setTimeout(() => {
        bottle.classList.add('pulse');
        setTimeout(() => bottle.classList.remove('pulse'), 250);
      }, i * 120);
    });
  }
};

// ===== VIDEOS Y FUNCIONES SIMPLIFICADAS =====
const Videos = { 
  init() {
    document.querySelectorAll('#galeria video').forEach(video => {
      ['muted', 'playsinline', 'loop'].forEach(attr => video.setAttribute(attr, ''));
      video.setAttribute('preload', 'metadata');
      video.play().catch(() => {
        if (!document.hasAttribute('data-video-fallback')) {
          document.setAttribute('data-video-fallback', 'true');
          const handleClick = () => {
            document.querySelectorAll('#galeria video').forEach(v => v.play().catch(() => {}));
            document.removeEventListener('click', handleClick);
          };
          document.addEventListener('click', handleClick);
        }
      });
    });
  }
};

// ===== OBSERVADOR DE PIE DE PÁGINA PARA MENÚ =====
const FooterIO = {
  io: null,
  sentinel: null,
  observeMenu() {
    const section = document.getElementById('menu');
    if (!section || !$.footer) return;

    if (!this.sentinel) {
      this.sentinel = document.createElement('div');
      this.sentinel.id = 'footer-sentinel';
      this.sentinel.style.cssText = 'width:100%; height:1px;';
    }
    if (!this.sentinel.isConnected) section.appendChild(this.sentinel);

    this.disconnect();
    this.io = new IntersectionObserver(entries => {
      const entry = entries[0];
      if (!entry) return;
      if (entry.isIntersecting) Scroll.showFooter(); else Scroll.hideFooter();
    }, { root: null, threshold: 0.01 });
    this.io.observe(this.sentinel);
  },
  disconnect() {
    if (this.io) { this.io.disconnect(); this.io = null; }
  }
};

// ===== OBSERVADOR GENERAL DE FOOTER POR SECCIÓN =====
// Emula el comportamiento de "Proyectos" en escritorio (usar el contenedor que scrollea)
// pero aplicado a todas las secciones: mostramos el footer cuando un sentinel al final
// de la sección entra en el viewport del scroll correspondiente.
const FooterWatch = {
  io: null,
  sentinel: null,
  parent: null,
  usingObserver: false,
  ensureSentinel() {
    if (!this.sentinel) {
      this.sentinel = document.createElement('div');
      this.sentinel.id = 'footer-sentinel-generic';
      this.sentinel.style.cssText = 'width:100%;height:1px;pointer-events:none;';
    }
    return this.sentinel;
  },
  detach() {
    try { this.io && this.io.disconnect(); } catch {}
    this.io = null;
    if (this.sentinel && this.sentinel.parentNode) {
      try { this.sentinel.parentNode.removeChild(this.sentinel); } catch {}
    }
    this.parent = null;
    this.usingObserver = false;
  },
  attachToCurrentSection() {
    if (!$.footer) { this.detach(); return; }
    const active = document.querySelector('section.active');
    if (!active) { this.detach(); return; }

    // En página dedicada de proyectos (body.proyectos-page) desactivamos IO
    // para forzar el cálculo manual vía Scroll.updateFooter sobre el contenedor interno.
    if (document.body.classList.contains('proyectos-page')) {
      this.detach();
      this.usingObserver = false;
      return;
    }

    // Determinar el contenedor de scroll y el padre donde insertar el sentinel
    let parent = active;
    let root = null;
    if ($.isProyectosActive && $.galeriaContainer) {
      parent = $.galeriaContainer;
      root = $.galeriaContainer; // observar respecto al contenedor interno
    }

    // Evitar re-adjuntar si ya está en el mismo parent
    if (this.parent === parent && this.io) {
      // Asegurar que seguimos activos
      this.usingObserver = true;
      return;
    }

    // Reiniciar y adjuntar
    this.detach();
    const sentinel = this.ensureSentinel();
    try { parent.appendChild(sentinel); } catch { /* ignora si falla */ }
    this.parent = parent;

    // Crear el IO con root apropiado; usamos threshold bajo para activar al tocar fondo
    try {
      this.io = new IntersectionObserver((entries) => {
        const entry = entries && entries[0];
        if (!entry) return;
        if (entry.isIntersecting) {
          Scroll.showFooter();
        } else {
          Scroll.hideFooter();
        }
      }, { root, threshold: 0.01 });
      this.io.observe(sentinel);
      this.usingObserver = true;
    } catch (e) {
      // Fallback si IO no está disponible
      this.usingObserver = false;
    }
  }
};

const setupNormalOverlays = () => {
  document.querySelectorAll('.overlay:not([data-stand]):not(.overlay-botella), .overlay2:not(.overlay-rollo)')
          .forEach(img => {
    // Omitir hover en los thumbnails (p9, p11 y p15)
    if (img.closest('#p9') || img.closest('#p11') || img.closest('#p15')) return;
    const handleMouseMove = e => {
      // keep basic small parallax for overlays, but do not conflict with thumbnail translate animation
      const rect = img.getBoundingClientRect();
      const [x, y] = [((e.clientX - rect.left) / rect.width - 0.5) * 10, 
                     ((e.clientY - rect.top) / rect.height - 0.5) * 10];
      img.classList.add('hovered');
      const base = img.classList.contains('overlay2') ? 'translateX(-50%)' : '';
      img.style.transform = `${base} scale(1.03) translate(${x}px, ${y}px)`;
    };
    const handleMouseLeave = () => { 
      img.classList.remove('hovered'); 
      img.style.transform = ''; 
    };
    
    ['mousemove', 'mouseleave'].forEach((e, i) => 
      img.addEventListener(e, [handleMouseMove, handleMouseLeave][i]));
  });
};

// ===== THUMBNAILS: ciclo de grupos 1.x, 2.x, 3.x sin máscaras =====
const Thumbnails = {
  timer: null,
  currentGroup: 1,
  overlays: [],
  preloaded: false,
  isTransitioning: false,
  cascadeTimers: [],
  preload() {
    if (this.preloaded) return;
    const images = [];
    [1,2,3].forEach(g => [1,2,3,4].forEach(i => {
      const img = new Image();
  img.src = `assets/Secciones/Proyectos/Thumbnails/${g}.${i}.webp`;
      images.push(img);
    }));
    this.preloaded = true;
  },
  initCache() {
    this.overlays = Array.from(document.querySelectorAll('#p11 .overlay'));
  },
  setGroup(group) {
    if (!this.overlays.length) this.initCache();
    if (this.isTransitioning) return; // Prevenir múltiples transiciones simultáneas
    
    this.isTransitioning = true;
    
    // Activar rectángulos con un retardo más corto después de las imágenes
    setTimeout(() => this.activateRectangles(), 200);
    
    this.overlays.forEach((el, idx) => {
      // Marcar como en transición para mantener visibilidad
      el.classList.add('transitioning');
      
      // Crear elemento temporal para la nueva imagen
  const newSrc = `assets/Secciones/Proyectos/Thumbnails/${group}.${idx+1}.webp`;
      const tmp = document.createElement('img');
      tmp.alt = el.alt || '';
      tmp.className = `${el.className} visible thumb-temp`;
      tmp.style.cssText = `
        position: absolute;
        top: ${getComputedStyle(el).top || '0%'};
        left: ${getComputedStyle(el).left || '0'};
        width: ${getComputedStyle(el).width || '100%'};
        height: ${getComputedStyle(el).height || 'auto'};
        object-fit: ${getComputedStyle(el).objectFit || 'contain'};
        z-index: 100;
        pointer-events: none;
        opacity: 0;
      `;
      
      // Configurar máscara con gradiente diagonal
      const feather = '3%';
      const mask = `linear-gradient(110deg, rgba(0,0,0,1) calc(var(--edge, -10%) - ${feather}), rgba(0,0,0,1) var(--edge, -10%), rgba(0,0,0,0) calc(var(--edge, -10%) + ${feather}))`;
      Object.assign(tmp.style, {
        webkitMaskImage: mask,
        maskImage: mask,
        webkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        webkitMaskSize: '200% 200%',
        maskSize: '200% 200%'
      });
      tmp.style.setProperty('--edge', '-10%');

      tmp.addEventListener('load', () => {
        // Hacer visible inmediatamente para evitar espacios en blanco
        tmp.style.opacity = '1';
        el.parentElement.appendChild(tmp);
        
        // Animación diagonal suave
        const duration = 1600;
        const start = performance.now();
        const easeInOut = t => t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2)/2;
        
        const step = now => {
          let p = Math.min(1, Math.max(0, (now - start) / duration));
          const eased = easeInOut(p);
          const edge = -10 + 120 * eased;
          const edgeValue = edge.toFixed(2) + '%';
          
          // Aplicar valor de --edge solo a la imagen nueva
          tmp.style.setProperty('--edge', edgeValue);
          
          if (p < 1) {
            requestAnimationFrame(step);
          } else {
            // Finalizar: primero cambiar src, luego esperar un frame antes de limpiar
            el.src = newSrc;
            
            // Esperar a que la nueva imagen se renderice antes de limpiar
            requestAnimationFrame(() => {
              el.classList.remove('transitioning');
              tmp.remove();
              
              // Marcar transición completa cuando se procese el último overlay
              if (idx === this.overlays.length - 1) {
                // Dar un pequeño delay adicional para evitar parpadeos
                setTimeout(() => {
                  this.isTransitioning = false;
                }, 50);
              }
            });
          }
        };
        requestAnimationFrame(step);
      }, {once: true});
      
      tmp.onerror = () => {
        console.warn('Failed to load thumbnail:', newSrc);
        if (tmp.isConnected) tmp.remove();
        this.transitioning = false;
      };
      
      tmp.src = newSrc;
    });
    
    this.currentGroup = group;
    this.setTextGroup(group);
  },
  activateRectangles() {
    // Activar los cuatro rectángulos con el efecto de barrido simultáneo
    const rectangles = document.querySelectorAll('#p11 .thumb-mask');
    const duration = 1400;
    const start = performance.now();
    const easeInOut = t => t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2)/2;
    
    rectangles.forEach((rect) => {
      // Configurar máscara diagonal
      const feather = '3%';
      const mask = `linear-gradient(110deg, rgba(0,0,0,1) calc(var(--edge, -20%) - ${feather}), rgba(0,0,0,1) var(--edge, -20%), rgba(0,0,0,0) calc(var(--edge, -20%) + ${feather}))`;
      Object.assign(rect.style, {
        webkitMaskImage: mask,
        maskImage: mask,
        webkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        webkitMaskSize: '200% 200%',
        maskSize: '200% 200%'
      });
      rect.style.setProperty('--edge', '-20%');
      
      // Hacer visible el rectángulo
      rect.classList.add('active');
    });
    
    // Animación sincronizada para todos los rectángulos
    const step = now => {
      let p = Math.min(1, Math.max(0, (now - start) / duration));
      const eased = easeInOut(p);
      const edge = -20 + 140 * eased;
      const edgeValue = edge.toFixed(2) + '%';
      
      // Aplicar a todos los rectángulos simultáneamente
      rectangles.forEach(rect => {
        rect.style.setProperty('--edge', edgeValue);
      });
      
      if (p < 1) {
        requestAnimationFrame(step);
      } else {
        // Al finalizar, ocultar todos los rectángulos
        rectangles.forEach(rect => {
          rect.classList.remove('active');
        });
      }
    };
    requestAnimationFrame(step);
  },
  setTextGroup(group) {
    // Transición suave de textos sin ocultar todos al mismo tiempo
    const all = Array.from(document.querySelectorAll('#p11 .text-group'));
    const current = Array.from(document.querySelectorAll(`#p11 .text-group-${group}`));
    
    // Ocultar textos no actuales gradualmente
    all.forEach(el => {
      if (!current.includes(el)) {
        el.classList.remove('visible');
      }
    });
    
    // Mostrar textos actuales con escalonado
    const baseDelay = 150;
    current.forEach((el, i) => {
      setTimeout(() => el.classList.add('visible'), baseDelay + i * 80);
    });
  },
  nextGroup() {
    if (this.isTransitioning) return; // Evitar cambios durante transición
    const next = this.currentGroup === 3 ? 1 : this.currentGroup + 1;
    this.setGroup(next);
  },
  start() {
    // Evitar iniciar en móvil: la versión móvil usa MobileThumbnails
    if (window.innerWidth <= 1024) return;
    this.preload();
    this.initCache();
    if (!this.overlays.length) return;
    if (this.timer) return;
    
    // Asegurar que las imágenes base están visibles (cascada)
    // Limpiar timers previos
    this.cascadeTimers.forEach(t => clearTimeout(t));
    this.cascadeTimers = [];
    this.overlays.forEach((el, i) => {
      const t = setTimeout(() => el.classList.add('visible'), i * 120);
      this.cascadeTimers.push(t);
    });
    
    // Inicializar textos del grupo 1
    document.querySelectorAll('#p11 .text-group').forEach(el => {
      if (el.style) el.style.display = '';
      el.classList.remove('visible');
    });
    this.setTextGroup(1);
    
    // Iniciar ciclo automático
    this.timer = setInterval(() => this.nextGroup(), 5000);
  },
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isTransitioning = false;
    
    // Limpiar elementos temporales y estados
    document.querySelectorAll('.thumb-temp').forEach(el => el.remove());
    this.overlays.forEach(el => {
      el.classList.remove('transitioning');
      el.style.opacity = '';
      el.style.filter = '';
    });
    
    // Limpiar rectángulos
    document.querySelectorAll('#p11 .thumb-mask').forEach(rect => {
      rect.classList.remove('active');
      rect.style.removeProperty('--edge');
    });
    // Limpiar cascade timers si los hubiera
    this.cascadeTimers.forEach(t => clearTimeout(t));
    this.cascadeTimers = [];
  }
};

// Utilidad ligera para sincronizar el carrusel principal con réplicas (mini carrusel)
const createSignal = () => {
  const listeners = new Map();
  const last = new Map();
  return {
    on(type, handler) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(handler);
    },
    off(type, handler) {
      listeners.get(type)?.delete(handler);
    },
    emit(type, detail) {
      last.set(type, detail);
      const payload = { detail };
      listeners.get(type)?.forEach(handler => {
        try {
          handler(payload);
        } catch (err) {
          console.error('CarouselSync handler failed', err);
        }
      });
    },
    get(type) {
      return last.get(type);
    }
  };
};

const CarouselSync = createSignal();

// ===== CARRUSEL AUTOMÁTICO CON BUCLE INFINITO (centrado perfecto) =====
const Carousel = {
  container: null,
  allSlides: [],        // todas las imágenes dentro del carrusel (incluye buffers y clones)
  sequenceIndices: [],  // índices (en allSlides) de las 4 imágenes de la secuencia (2,3,4,5)
  seqPos: 0,            // posición actual dentro de la secuencia
  autoTimer: null,
  isMenuActive: false,
  animationDuration: 800,
  autoSpeed: 5800,
  userSlideDuration: 400,
  firstSeqContainerIndex: null,
  lastSeqContainerIndex: null,
  bufferAfterLastIndex: null,
  pendingSnapPrev: false,
  pendingSnap: false,
  onTransitionEnd: null,
  transitionString: '',
  currentTransition: '',
  currentTransform: '',
  // Seguimiento de cursor para recalcular hover durante animaciones
  lastMouseX: null,
  lastMouseY: null,
  hoverRecalcActive: false,
  pointerStartX: null,
  pointerCurrentX: null,
  isDragging: false,
  swipeThreshold: 30,

  init() {
    this.container = document.querySelector('.carousel');
    if (!this.container) return;

    // Recoger todas las imágenes actuales del carrusel (manteniendo buffers)
    this.allSlides = Array.from(this.container.querySelectorAll('img'));

    // Construir la secuencia: tomar hasta 4 imágenes que NO sean buffers ni clones
    const logical = this.allSlides.filter(img => !img.classList.contains('carousel-buffer') && !img.dataset.clone);
    // Si hay más de 4, usa las 4 primeras; si hay menos, usa las disponibles (tolerante a la maqueta actual)
    const seq = logical.slice(0, 4);
    if (!seq.length) {
      console.warn('Carrusel: no hay imágenes válidas para la secuencia');
      return;
    }
    this.sequenceIndices = seq.map(img => this.allSlides.indexOf(img)).filter(i => i >= 0);
    this.firstSeqContainerIndex = this.sequenceIndices[0] ?? null;
    this.lastSeqContainerIndex = this.sequenceIndices[this.sequenceIndices.length - 1] ?? null;
    this.bufferAfterLastIndex = (this.lastSeqContainerIndex != null && this.lastSeqContainerIndex + 1 < this.allSlides.length)
      ? this.lastSeqContainerIndex + 1 : null;

    // Configurar transición del contenedor
  this.transitionString = `transform ${this.animationDuration}ms ease-in-out`;
  this.setTransition(this.transitionString);
  this.setTransformString(this.container.style.transform || '');

    // Recentrar al redimensionar para mantener el slide activo centrado
    window.addEventListener('resize', () => debounce('carousel-resize', () => this.centerCurrent(true), 100));

    // Al terminar una transición hacia el buffer, hacer snap inmediato al inicio
    this.onTransitionEnd = (e) => {
      if (e.target !== this.container || e.propertyName !== 'transform') return;
      if (this.pendingSnap) {
        this.pendingSnap = false;
        // Teletransporte al primer elemento de la secuencia, manteniendo la imagen centrada idéntica
        if (this.firstSeqContainerIndex != null) {
          this.centerByContainerIndex(this.firstSeqContainerIndex, true);
          this.seqPos = 0;
        }
        // Tras completar el snap, reiniciar el temporizador automático
        this.resetAutoTimer();
        return;
      }
      if (this.pendingSnapPrev) {
        this.pendingSnapPrev = false;
        // Teletransporte al último elemento de la secuencia tras retroceder a buffer previo
        if (this.lastSeqContainerIndex != null) {
          this.centerByContainerIndex(this.lastSeqContainerIndex, true);
          this.seqPos = this.sequenceIndices.length - 1;
        }
        // Tras completar el snap, reiniciar el temporizador automático
        this.resetAutoTimer();
        return;
      }
      // Transición normal completada: reiniciar temporizador para contar desde ahora
      this.resetAutoTimer();
    };
    this.container.addEventListener('transitionend', this.onTransitionEnd);

    // Registrar posición del cursor para recálculo continuo del hover
    window.addEventListener('mousemove', (e) => {
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    }, {passive: true});

    // Preparar interactividad (clics y gestos)
    this.attachInteractions();
  },

  setTransition(value) {
    if (!this.container) return;
    this.currentTransition = value;
    this.container.style.transition = value;
    CarouselSync.emit('transition', { value });
  },

  setTransformString(value) {
    if (!this.container) return;
    this.currentTransform = value;
    this.container.style.transform = value;
    CarouselSync.emit('transform', { value });
    // Si hay cursor presente, forzar recálculo inmediato del hover
    this.forceHoverRecalc();
  },

  getDefaultTransition() {
    return this.transitionString || `transform ${this.animationDuration}ms ease-in-out`;
  },

  // Centra un slide por su índice en allSlides (método base)
  centerByContainerIndex(containerIndex, immediate = false) {
    const target = this.allSlides[containerIndex];
    if (!target) return;

    const containerWidth = this.container.clientWidth;
    // Centrar por el wrapper del slide (figure) para evitar offsets anidados
    const wrapper = target.closest('.carousel-item') || target;
    const targetCenter = wrapper.offsetLeft + wrapper.offsetWidth / 2;
    const translateX = (containerWidth / 2) - targetCenter;

    const transformValue = `translateX(${translateX}px)`;
    if (immediate) {
      const fallback = this.getDefaultTransition();
      const prev = this.currentTransition || fallback;
      this.setTransition('none');
      this.setTransformString(transformValue);
      // Forzar reflow y restaurar transición
      this.container.offsetHeight;
      this.setTransition(prev || fallback);
    } else {
      const active = this.getDefaultTransition();
      if (this.currentTransition !== active) this.setTransition(active);
      this.setTransformString(transformValue);
      // Durante la transición, activar bucle de recálculo de hover
      this.startHoverRecalcLoop();
    }
    
    // Forzar actualización del estado hover después de que la transición complete
    this.refreshHoverState();
  },

  centerCurrent(immediate = false) {
    const idx = this.sequenceIndices[this.seqPos];
    if (idx != null) this.centerByContainerIndex(idx, immediate);
  },

  next() {
    // Si estamos al final de la secuencia, mover una imagen más (buffer) y luego teletransportar
    if (this.seqPos >= this.sequenceIndices.length - 1) {
      if (this.bufferAfterLastIndex != null) {
        this.pendingSnap = true; // marcamos que tras la animación haremos snap
        this.centerByContainerIndex(this.bufferAfterLastIndex, false); // animación hacia buffer (una más)
      } else {
        // Fallback: teletransporte inmediato si no hay buffer detectado
        this.seqPos = 0;
        this.centerCurrent(true);
      }
    } else {
      // Avanzar de uno en uno dentro de la secuencia
      this.seqPos += 1;
      this.centerCurrent(false);
    }
  },

  prev() {
    // Si estamos al inicio de la secuencia, mover una imagen atrás (buffer previo) y luego teletransportar
    if (this.seqPos <= 0) {
      const bufferBeforeIndex = (this.firstSeqContainerIndex != null) ? this.firstSeqContainerIndex - 1 : null;
      if (bufferBeforeIndex != null && bufferBeforeIndex >= 0) {
        this.pendingSnapPrev = true;
        this.centerByContainerIndex(bufferBeforeIndex, false);
      } else {
        // Fallback sin buffer: ir directamente al último
        this.seqPos = this.sequenceIndices.length - 1;
        this.centerCurrent(true);
      }
    } else {
      this.seqPos -= 1;
      this.centerCurrent(false);
    }
  },
  // Movimiento inmediato para interacción de usuario (swipe/clic lateral)
  userSlide(direction) {
    if (!this.sequenceIndices.length) return;
    // Configurar transición más rápida para esta interacción
    const prevTransition = this.transitionString;
    const fast = `transform ${this.userSlideDuration}ms ease-out`;
    this.transitionString = fast;
    this.setTransition(fast);
    if (direction === 'next') {
      if (this.seqPos >= this.sequenceIndices.length - 1) {
        this.seqPos = 0; // wrap directo sin usar buffer
        this.centerCurrent(false);
      } else {
        this.seqPos += 1;
        this.centerCurrent(false);
      }
    } else if (direction === 'prev') {
      if (this.seqPos <= 0) {
        this.seqPos = this.sequenceIndices.length - 1; // wrap directo
        this.centerCurrent(false);
      } else {
        this.seqPos -= 1;
        this.centerCurrent(false);
      }
    }
    // Restaurar transición por defecto después de terminar
    setTimeout(() => {
      this.transitionString = prevTransition;
      this.setTransition(prevTransition);
    }, this.userSlideDuration + 20);
  },

  start() {
    if (!this.container || !this.sequenceIndices.length) return;
    if (this.autoTimer) return;
    this.isMenuActive = true;

    // Iniciar centrando la primera imagen de la secuencia (2)
    this.seqPos = 0;
    // Esperar a que el layout esté listo un instante para evitar cálculos con 0px
    requestAnimationFrame(() => this.centerCurrent(true));

    this.autoTimer = setInterval(() => {
      if (this.isMenuActive) this.next();
    }, this.autoSpeed);
  },

  stop() {
    if (this.autoTimer) {
      clearInterval(this.autoTimer);
      this.autoTimer = null;
    }
    this.isMenuActive = false;
    this.stopHoverRecalcLoop();
  }
};

// Añadir métodos de interacción al prototipo del objeto Carousel
Carousel.attachInteractions = function() {
  if (!this.container || !this.sequenceIndices.length) return;
  // Asegurar que los eventos táctiles no interfieren con el scroll vertical
  this.container.style.touchAction = 'pan-y';

  // Clic en imágenes: si no es la central, recentrar; si es la central, permitir navegación
  this.allSlides.forEach(img => {
    if (img.dataset.clone) return; // ignorar clones; permitir buffers para casos especiales
    img.addEventListener('click', (e) => {
      const containerIndex = this.allSlides.indexOf(img);
      const centralIndex = this.sequenceIndices[this.seqPos];
      const isCentral = containerIndex === centralIndex;
      if (!isCentral) {
        // Interceptar navegación inline
        e.preventDefault();
        e.stopPropagation();
        const bufferBeforeIndex = (this.firstSeqContainerIndex != null) ? this.firstSeqContainerIndex - 1 : null;
        // Caso especial: clic en el buffer previo (imagen 1 duplicada)
        if (bufferBeforeIndex != null && containerIndex === bufferBeforeIndex) {
          // Teletransportar al buffer tras el final (imagen 5) y luego retroceder al último original (imagen 4)
          if (this.bufferAfterLastIndex != null) {
            this.centerByContainerIndex(this.bufferAfterLastIndex, true);
            // Posicionar seqPos en la última posición válida (imagen 4)
            // y animar directamente a ella en lugar de usar prev()
            this.seqPos = this.sequenceIndices.length - 1;
            requestAnimationFrame(() => {
              this.centerCurrent(false); // animar a imagen 4
            });
            return;
          }
        }
        // Caso especial: clic en el buffer posterior (imagen 5 duplicada)
        if (this.bufferAfterLastIndex != null && containerIndex === this.bufferAfterLastIndex) {
          // Avanzar a buffer y dejar que snap lleve al primer original (imagen 2)
          this.pendingSnap = true;
          this.centerByContainerIndex(this.bufferAfterLastIndex, false);
          return;
        }
        // Clic en una imagen de la secuencia: mover esa al centro
        const logicalPos = this.sequenceIndices.indexOf(containerIndex);
        if (logicalPos >= 0) {
          this.seqPos = logicalPos;
          this.centerCurrent(false);
        }
        // Reiniciar temporizador tras interacción
        this.resetAutoTimer();
      } else {
        // Central: dejar que el onclick HTML (irAProyecto) actúe
      }
    }, true); // usar captura para adelantarnos al handler inline
  });

  // Gestos de swipe (pointer) sólo para táctil/lápiz; sin seguimiento de ratón
  const isTouchLike = (e) => e.pointerType === 'touch' || e.pointerType === 'pen';

  this.container.addEventListener('pointerdown', (e) => {
    if (!isTouchLike(e)) return;
    this.pointerId = e.pointerId;
    this.container.setPointerCapture?.(e.pointerId);
    this.pointerStartX = e.clientX;
    this.pointerCurrentX = e.clientX;
    this.isDragging = false;
  });

  this.container.addEventListener('pointermove', (e) => {
    if (!isTouchLike(e)) return;
    if (this.pointerStartX == null || e.pointerId !== this.pointerId) return;
    this.pointerCurrentX = e.clientX;
    const dx = this.pointerCurrentX - this.pointerStartX;

    if (Math.abs(dx) > 5) {
      this.isDragging = true;
      // Efecto visual ligero mientras se arrastra (sólo táctil)
      const resistance = 0.3;
      const offset = dx * resistance;
      const baseTransform = this.currentTransform || 'translateX(0)';
      const match = baseTransform.match(/translateX\(([^)]+)\)/);
      const currentX = match ? parseFloat(match[1]) : 0;
      this.container.style.transition = 'none';
      this.container.style.transform = `translateX(${currentX + offset}px)`;
    }
  });

  const endDrag = (e) => {
    if (e && !isTouchLike(e)) return;
    if (this.pointerStartX == null) return;
    const dx = (this.pointerCurrentX ?? this.pointerStartX) - this.pointerStartX;
    // Restaurar transición por defecto
    this.setTransition(this.getDefaultTransition());
    // Decidir navegación por umbral
    if (Math.abs(dx) >= this.swipeThreshold) {
      const dir = dx < 0 ? 'next' : 'prev';
      this.userSlide(dir);
    } else {
      // Recentrar al actual si no superó umbral
      this.centerCurrent(false);
    }
    // Reiniciar timer automático tras interacción
    this.resetAutoTimer();
    // Limpiar estado de drag
    this.pointerStartX = null;
    this.pointerCurrentX = null;
    this.isDragging = false;
    this.pointerId = null;
    try { if (e) this.container.releasePointerCapture?.(e.pointerId); } catch {}
  };

  this.container.addEventListener('pointerup', endDrag);
  this.container.addEventListener('pointercancel', endDrag);
  this.container.addEventListener('pointerleave', endDrag);
};

// Reiniciar el temporizador automático para que el siguiente avance
// ocurra tras completar la transición actual
Carousel.resetAutoTimer = function() {
  if (!this.isMenuActive) return;
  if (this.autoTimer) {
    try { clearInterval(this.autoTimer); } catch {}
    this.autoTimer = null;
  }
  this.autoTimer = setInterval(() => {
    if (this.isMenuActive) this.next();
  }, this.autoSpeed);
};

// Forzar actualización del estado hover tras cambios de posición del carrusel
Carousel.refreshHoverState = function() {
  if (!this.container) return;
  // Obtener posición actual del cursor y recalcular qué elemento está debajo
  // Usamos un temporizador para que ocurra después de que el DOM se haya actualizado
  setTimeout(() => {
    // Forzar recálculo de hover quitando y restaurando pointer-events
    const originalPointerEvents = this.container.style.pointerEvents;
    this.container.style.pointerEvents = 'none';
    // Forzar reflow
    void this.container.offsetHeight;
    this.container.style.pointerEvents = originalPointerEvents || '';
    
    // Alternativamente, disparar mousemove en la posición actual del cursor
    // para que el navegador recalcule el hover
    if (typeof MouseEvent !== 'undefined') {
      const x = this.lastMouseX ?? (window.innerWidth / 2);
      const y = this.lastMouseY ?? (window.innerHeight / 2);
      const target = document.elementFromPoint(x, y);
      if (target) {
        const evt = new MouseEvent('mousemove', { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y });
        target.dispatchEvent(evt);
      }
    }
  }, this.animationDuration + 50); // Esperar a que termine la animación
};

// Recalcular hover continuamente durante la animación del carrusel
Carousel.startHoverRecalcLoop = function() {
  if (this.hoverRecalcActive) return;
  this.hoverRecalcActive = true;
  const tick = () => {
    if (!this.hoverRecalcActive) return;
    this.forceHoverRecalc();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

Carousel.stopHoverRecalcLoop = function() {
  this.hoverRecalcActive = false;
};

Carousel.forceHoverRecalc = function() {
  try {
    const x = this.lastMouseX;
    const y = this.lastMouseY;
    if (x == null || y == null) return; // no cursor
    const target = document.elementFromPoint(x, y);
    if (target) {
      const evt = new MouseEvent('mousemove', { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y });
      target.dispatchEvent(evt);
    }
  } catch {}
};

// ===== MINI CARRUSEL EN "DESARROLLO WEB" (ESPEJO EN TIEMPO REAL) =====
const WebdevMini = {
  host: null,
  scaleWrap: null,
  clone: null,
  main: null,
  created: false,
  syncHandlers: null,
  init() {
    // Contenedor del mini carrusel dentro del círculo de servicio 2
    this.host = document.querySelector('.service-2 .mini-carousel');
    this.main = document.querySelector('#menu .carousel');
    if (!this.host || !this.main) return;

    // Crear bajo demanda para no duplicar recursos si no se usa
    const circle = document.querySelector('.service-2');
    if (circle) {
      circle.addEventListener('mouseenter', () => this.ensureCreated(), {passive: true});
      // En caso de navegación por teclado
      circle.addEventListener('focus', () => this.ensureCreated(), {passive: true});
    }

    // Recalcular escala en resize
    window.addEventListener('resize', () => debounce('mini-scale', () => this.updateScale(), 120), {passive: true});
  },
  ensureCreated() {
    if (this.created) {
      this.applyStateFromMain();
      this.updateScale();
      return;
    }
    this.createClone();
    this.updateScale();
    this.applyStateFromMain();
    this.bindSync();
    this.created = true;
  },
  createClone() {
    // Wrapper que aplicará la escala y centrado
    this.scaleWrap = document.createElement('div');
    this.scaleWrap.className = 'mini-scale';

    // Clonar carrusel principal (deep) y marcarlo como mini
    this.clone = this.main.cloneNode(true);
    this.clone.setAttribute('data-mini', 'true');
    // No queremos que el mini capture eventos ni clics
    this.clone.style.pointerEvents = 'none';

    // Alinear transición con el principal (si existiera)
    try { this.clone.style.transition = getComputedStyle(this.main).transition; } catch {}

    this.scaleWrap.appendChild(this.clone);
    this.host.appendChild(this.scaleWrap);
  },
  bindSync() {
    if (this.syncHandlers || !this.clone) return;
    const applyTransition = ({ detail }) => {
      if (!this.clone) return;
      const value = detail?.value || '';
      if (!value || /none/.test(value) || /\b0s\b/.test(value)) {
        this.clone.style.transition = 'none';
      } else {
        this.clone.style.transition = value;
      }
    };
    const applyTransform = ({ detail }) => {
      if (!this.clone) return;
      this.clone.style.transform = detail?.value || '';
    };
    CarouselSync.on('transition', applyTransition);
    CarouselSync.on('transform', applyTransform);
    this.syncHandlers = { applyTransition, applyTransform };
  },
  applyStateFromMain() {
    if (!this.clone || !this.main) return;
    const stateTransition = CarouselSync.get('transition')?.value;
    const stateTransform = CarouselSync.get('transform')?.value;
    const normalizeTransition = (value) => {
      if (!value || /none/.test(value) || /\b0s\b/.test(value)) return 'none';
      return value;
    };
    if (stateTransition !== undefined) {
      this.clone.style.transition = normalizeTransition(stateTransition);
    } else {
      try {
        const t = getComputedStyle(this.main).transition || '';
        this.clone.style.transition = normalizeTransition(t);
      } catch {
        this.clone.style.transition = 'none';
      }
    }
    if (stateTransform !== undefined) {
      this.clone.style.transform = stateTransform || '';
    } else {
      this.clone.style.transform = this.main.style.transform || '';
    }
  },
  updateScale() {
    if (!this.scaleWrap || !this.main) return;
    try {
      const circle = this.host.closest('.service-circle');
      if (!circle) return;
      const circleRect = circle.getBoundingClientRect();
      const refImg = this.main.querySelector('img:not(.carousel-buffer)');
      if (!refImg) return;
      const imgRect = refImg.getBoundingClientRect();
      if (!imgRect.height || !circleRect.width) return;
      // Ajuste: que la altura del slide encaje dentro del diámetro del círculo y reducir un poco el tamaño
      const diameter = Math.min(circleRect.width, circleRect.height);
      const baseScale = diameter / imgRect.height;
      const factor = 0.45; // hacerlo aún más pequeño
      const finalScale = Math.max(0.1, Math.min(1.0, baseScale * factor));
      this.scaleWrap.style.setProperty('--mini-scale', finalScale.toString());
    } catch {}
  }
};

const Intro = {
  init() {
    const [video, overlay] = ['intro-video', 'intro-overlay'].map(id => document.getElementById(id));
    if (!video || !overlay) return;
    
    [$.html, $.body].forEach(el => el.classList.add('intro-active'));
    
    video.src = /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent) ? 'Jmotion_1.mov' : 'Jmotion_FINAL.webm';
    Object.assign(video, {muted: true, autoplay: true, playsInline: true});
    
    const tryPlay = () => video.play().catch(() => 
      ['touchstart', 'click'].forEach(event => 
        document.addEventListener(event, () => video.play(), {once: true})));
    
    video.addEventListener('canplaythrough', tryPlay, {once: true});
    setTimeout(tryPlay, 2000);
    
    setTimeout(() => {
      overlay.classList.add('fade-out');
      [$.html, $.body].forEach(el => el.classList.remove('intro-active'));
      setTimeout(() => overlay.remove(), 1600);
    }, 3000);
  }
};

// ===== MEJORA PROGRESIVA DE IMÁGENES =====
function enhanceImagesAttributes() {
  try {
    const imgs = document.querySelectorAll('img');
    imgs.forEach(img => {
      // Evitar tocar iconos de social si ya están configurados
      if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
      if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
    });
  } catch {}
}

// ===== CACHE-BUSTING PARA SLIDESHOWS DE SERVICIOS =====
function hydrateCircleSlides() {
  // Añadir versión a data-src para cache-busting, pero NO aplicar el background
  // directamente: lo cargaremos perezosamente desde lazyLoadFrames().
  const assetVersion = '2025-10-24-1';
  const frames = document.querySelectorAll('.circle-slideshow .frame[data-src]');
  frames.forEach(el => {
    const src = el.getAttribute('data-src');
    if (!src) return;
    const url = src + (src.includes('?') ? '&' : '?') + 'v=' + assetVersion;
    el.setAttribute('data-src', url);
  });
}

// Carga perezosa de fondos para .frame[data-src]. Se activa por IntersectionObserver
// o por hover/focus en el service-circle padre. Una vez cargada, añade la clase .loaded
function lazyLoadFrames() {
  const frames = document.querySelectorAll('.circle-slideshow .frame[data-src]');
  if (!frames.length) return;

  const load = (el) => {
    if (!el || el.classList.contains('loaded')) return;
    const src = el.getAttribute('data-src');
    if (!src) return;
    el.style.backgroundImage = `url("${src}")`;
    el.classList.add('loaded');
  };

  const io = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        load(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { root: null, threshold: 0.08 });

  frames.forEach(f => {
    io.observe(f);
    const circle = f.closest('.service-circle');
    if (circle) {
      // al pasar el ratón o al recibir focus cargamos la imagen si no está
      circle.addEventListener('mouseenter', () => load(f), {once: true});
      circle.addEventListener('focus', () => load(f), {once: true});
    }
  });
}

// ===== DESCRIPCIÓN DINÁMICA DE SERVICIOS (bajo los círculos) =====
const ServicesDesc = {
  el: null,
  textEl: null,
  currentKey: null,
  genericTimer: null,
  lastIndex: null, // índice del círculo anterior para determinar dirección (fallback)
  lastEl: null,    // último círculo activo (element)
  intentLockKey: null, // clave del círculo actualmente bloqueado por intención
  intentLockEl: null,  // elemento de círculo bloqueado
  hoverStartTime: null, // tiempo en que empezó el hover
  hoverDelay: 150, // milisegundos base antes de evaluar intención
  minDwellMs: 140, // permanencia mínima sobre el círculo
  minSwitchInterval: 320, // tiempo mínimo entre cambios para evitar parpadeos
  lastSwitchAt: 0, // timestamp del último cambio aplicado
  steadyWindowMs: 120, // ventana de muestreo para velocidad
  hoverTimer: null, // timer para el delay
  mouseMovements: [], // array para rastrear movimientos del puntero
  velocityThreshold: 800, // píxeles/segundo - si se mueve más rápido, ignorar
  animTimers: [], // timeouts activos de animación para poder cancelarlos
  isAnimating: false,
  generic: {
    es: 'En toda Valencia no encontrarás un diseñador con un perfil más completo. El abanico de servicios que ofrezco, todos ellos ejemplificados en mi galería de proyectos, cubre cualquier necesidad que pueda surgir durante el desarrollo de una campaña gráfica. Diseño, desarrollo web, edición de vídeo, gráficos móviles, ilustración… Sea cual sea tu proyecto, yo puedo darle cara mejor que nadie.',
    en: "In all of Valencia, you won't find a designer with a more complete profile. My range of services, all showcased in my project gallery, covers any need throughout a graphic campaign. Graphic design, web development, video editing, motion graphics, illustration… Whatever your project, I can bring it to life better than anyone.",
    fr: "À Valence, vous ne trouverez pas de designer au profil plus complet. Ma gamme de services, tous illustrés dans ma galerie de projets, couvre tout besoin pouvant surgir lors d’une campagne graphique. Design graphique, développement web, montage vidéo, motion design, illustration… Quel que soit votre projet, je peux lui donner la meilleure vitrine.",
    pt: "Em Valência, você não vai encontrar um designer com um perfil mais completo. Minha gama de serviços — todos exemplificados na galeria de projetos — cobre qualquer necessidade ao longo de uma campanha gráfica. Design gráfico, desenvolvimento web, edição de vídeo, motion graphics, ilustração… Seja qual for o seu projeto, posso dar a melhor cara a ele."
  },
  descriptions: {
    es: {
      'service-1': 'Branding, maquetación, edición de imagen, impresión… Si quieres que tu marca o campaña destaque más que ninguna otra, si buscas un diseño icónico y atemporal que se quede grabado en todo el que lo vea, no busques más. Mi creatividad y mi ingenio sumados a mi capacidad técnica son las herramientas que necesitas para darle a tus proyectos una identidad única.',
      'service-2': 'Desde marcas personales y pequeños negocios hasta las mayores multinacionales; toda marca necesita una web. Yo puedo crear tu propio espacio en la red, adaptado a tus preferencias y necesidades, y qué mejor ejemplo que esta misma web. Aquí podrás ver lo que podría ser tu propia página o, si ya tienes una, de las mejoras que yo podría implementarle.',
      'service-3': 'Un buen vídeo no solo se ve, se siente. Con una edición cuidada, ritmo preciso y narrativa visual efectiva, puedo transformar cualquier conjunto de clips en una pieza profesional y emocionante. Ya sea un spot, un tráiler o contenido para redes, me aseguraré de que transmita justo lo que quieres contar, con un acabado fluido, dinámico y visualmente impecable.',
      'service-4': 'Toda campaña gráfica está incompleta sin movimiento. En redes, la atención del usuario lo es todo, y nada es más llamativo que un movimiento orquestado para destacar. Mediante gráficos animados, puedo dar vida a tus ideas para comunicar en instantes lo que un texto tardaría minutos. En un entorno donde todo se mueve, tus diseños también deberían hacerlo.',
      'service-5': 'Incluso las grandes ideas son ignoradas si no las comunicas correctamente. Ya quieras darles a tus presentaciones un acabado profesional con transiciones fluidas; crear fotomontajes híper realistas de productos que no existen aún; o construir un discurso contundente; yo te ayudaré a comunicar tus ideas de forma atractiva y convincente para asegurar su éxito.',
      'service-6': '¿Buscas un artista que ilustre tus historias o que diseñe una mascota para tu marca? ¿Alguien creativo que se pueda adaptar a cualquier estilo? ¡Soy justo lo que necesitas! Con un porfolio entero dedicado al diseño de personajes, no hay nadie mejor para darle cara a tus proyectos. Contáctame a través de redes y te mostraré decenas de ejemplos de otros trabajos.'
    },
    en: {
      'service-1': "Branding, layout, image editing, print… If you want your brand or campaign to stand out above the rest—if you're looking for an iconic, timeless design that stays with everyone who sees it—look no further. My creativity and ingenuity, combined with my technical skills, are the tools you need to give your projects a truly unique identity.",
      'service-2': "From personal brands and small businesses to the largest multinationals, every brand needs a website. I can create your own space on the web, tailored to your preferences and needs—and this very site is the best example. Here you can see what your own page could be or, if you already have one, the improvements I could implement.",
      'service-3': "A good video is not only seen; it's felt. With careful editing, precise rhythm, and effective visual storytelling, I can turn any set of clips into a professional and compelling piece. Whether it's a spot, a trailer, or social content, I'll make sure it conveys exactly what you want, with a fluid, dynamic, visually impeccable finish.",
      'service-4': "No graphic campaign is complete without movement. On social platforms, user attention is everything, and nothing is more eye‑catching than motion crafted to stand out. Through animated graphics, I can bring your ideas to life and communicate in seconds what a text would take minutes to explain. In a world where everything moves, your designs should too.",
      'service-5': "Even great ideas are ignored if you don’t communicate them properly. Whether you want to give your presentations a professional finish with smooth transitions; create hyper‑realistic photomontages of products that don’t exist yet; or build a compelling narrative—I’ll help you communicate your ideas attractively and convincingly to ensure their success.",
      'service-6': "Looking for an artist to illustrate your stories or design a mascot for your brand? Someone creative who can adapt to any style? I’m exactly what you need. With an entire portfolio focused on character design, there’s no one better to give your projects a face. Contact me via social media and I’ll show you dozens of examples from other work."
    },
    fr: {
      'service-1': "Branding, mise en page, retouche d’image, impression… Si vous voulez que votre marque ou votre campagne se distingue de toutes les autres — si vous cherchez un design iconique et intemporel qui marque quiconque le voit — ne cherchez plus. Ma créativité et mon ingéniosité, alliées à ma maîtrise technique, sont les outils dont vous avez besoin pour donner à vos projets une identité unique.",
      'service-2': "Des marques personnelles et petites entreprises jusqu’aux plus grandes multinationales, toute marque a besoin d’un site web. Je peux créer votre espace sur le web, adapté à vos préférences et besoins — et ce site en est le meilleur exemple. Vous pouvez y voir ce que pourrait être votre propre page ou, si vous en avez déjà une, les améliorations que je peux y apporter.",
      'service-3': "Une bonne vidéo ne se regarde pas seulement, elle se ressent. Avec un montage soigné, un rythme précis et une narration visuelle efficace, je peux transformer n’importe quel ensemble de plans en une pièce professionnelle et captivante. Qu’il s’agisse d’un spot, d’une bande‑annonce ou de contenu pour les réseaux, je veillerai à transmettre exactement ce que vous voulez, avec un rendu fluide, dynamique et visuellement impeccable.",
      'service-4': "Aucune campagne graphique n’est complète sans mouvement. Sur les réseaux, l’attention est primordiale, et rien n’attire davantage l’œil qu’un mouvement pensé pour se démarquer. Grâce aux graphismes animés, je donne vie à vos idées et communique en quelques secondes ce qu’un texte mettrait des minutes à expliquer. Dans un monde où tout bouge, vos designs doivent bouger eux aussi.",
      'service-5': "Même les grandes idées sont ignorées si elles ne sont pas bien communiquées. Que vous souhaitiez donner à vos présentations une finition professionnelle avec des transitions fluides, créer des photomontages hyperréalistes de produits qui n’existent pas encore, ou construire un discours percutant, je vous aiderai à communiquer vos idées de manière attractive et convaincante pour en assurer le succès.",
      'service-6': "Vous cherchez un artiste pour illustrer vos histoires ou créer une mascotte pour votre marque ? Quelqu’un de créatif et capable de s’adapter à tous les styles ? Je suis exactement ce qu’il vous faut. Avec tout un portfolio dédié au character design, difficile de trouver mieux pour donner un visage à vos projets. Contactez‑moi sur les réseaux et je vous montrerai des dizaines d’exemples d’autres travaux."
    },
    pt: {
      'service-1': "Branding, paginação, edição de imagem, impressão… Se pretende que a sua marca ou campanha se destaque como nenhuma outra — se procura um design icónico e intemporal que fique gravado em quem o vê — não procure mais. A minha criatividade e engenho, somados à minha capacidade técnica, são as ferramentas de que precisa para dar aos seus projetos uma identidade única.",
      'service-2': "De marcas pessoais e pequenos negócios às maiores multinacionais, toda marca precisa de um site. Posso criar o seu espaço na web, adaptado às suas preferências e necessidades — e este próprio site é o melhor exemplo. Aqui pode ver como poderia ser a sua página ou, se já tiver uma, as melhorias que posso implementar.",
      'service-3': "Um bom vídeo não só se vê, sente‑se. Com uma edição cuidada, ritmo preciso e narrativa visual eficaz, posso transformar qualquer conjunto de clips numa peça profissional e envolvente. Seja um spot, um trailer ou conteúdo para redes, garanto que transmite exatamente o que pretende, com um acabamento fluido, dinâmico e visualmente impecável.",
      'service-4': "Nenhuma campanha gráfica fica completa sem movimento. Nas redes, a atenção do utilizador é tudo, e nada chama mais a atenção do que um movimento pensado para se destacar. Com gráficos animados, dou vida às suas ideias e comunico em segundos o que um texto levaria minutos a explicar. Num ambiente onde tudo se mexe, os seus designs também devem mexer‑se.",
      'service-5': "Mesmo as grandes ideias são ignoradas se não forem bem comunicadas. Quer pretenda dar às suas apresentações um acabamento profissional com transições fluidas; criar fotomontagens hiper‑realistas de produtos que ainda não existem; ou construir um discurso contundente; eu ajudo a comunicar as suas ideias de forma atrativa e convincente para garantir o seu sucesso.",
      'service-6': "Procura um artista para ilustrar as suas histórias ou criar uma mascote para a sua marca? Alguém criativo que se adapte a qualquer estilo? Sou exatamente o que precisa. Com um portfólio inteiro dedicado ao design de personagens, não há melhor para dar um rosto aos seus projetos. Fale comigo pelas redes e eu mostro‑lhe dezenas de exemplos de outros trabalhos."
    }
  },
  init() {
    this.el = document.querySelector('.services-description');
    this.textEl = document.getElementById('services-description-text');
    if (!this.el || !this.textEl) return;

    // Inicializar con texto genérico y asegurar presencia de data-es/data-en
    this.setGeneric(true);

    const circles = document.querySelectorAll('.services-circles .service-circle');
    circles.forEach(circle => {
      // Accesibilidad básica
      circle.setAttribute('role', 'button');
      circle.setAttribute('tabindex', '0');

      const show = () => this.scheduleShow(circle);
      const reset = () => this.cancelShow(circle);

      // Rastrear movimiento del puntero para calcular velocidad (pointer > mouse)
      circle.addEventListener('pointermove', (e) => this.trackMouseMovement(e));
      circle.addEventListener('pointerenter', show);
      circle.addEventListener('mouseenter', show); // fallback
      // Focus por teclado: mostrar inmediatamente (no aplicar gating por velocidad)
      circle.addEventListener('focus', () => this.lockTo(circle));
      circle.addEventListener('pointerleave', reset);
      circle.addEventListener('mouseleave', reset);
      circle.addEventListener('blur', reset);
      circle.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.lockTo(circle); }
        if (e.key === 'Escape') { this.clearGenericTimer(); this.unlockIntent(); this.setGeneric(); circle.blur(); }
      });

      // Tocar en pantallas táctiles: mostrar inmediato
      circle.addEventListener('touchstart', () => this.lockTo(circle), {passive: true});
    });

    // Si el puntero sale del contenedor completo, iniciar retardo para genérico
    document.querySelector('.services-circles')?.addEventListener('mouseleave', () => this.resetIfNoneHovered());
  },
  trackMouseMovement(e) {
    const now = Date.now();
    const x = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? 0;
    const y = e.clientY ?? (e.touches && e.touches[0]?.clientY) ?? 0;
    this.mouseMovements.push({ x, y, time: now });
    
    // Mantener solo los últimos steadyWindowMs de movimientos
    this.mouseMovements = this.mouseMovements.filter(m => now - m.time < this.steadyWindowMs);
  },
  calculateMouseVelocity() {
    if (this.mouseMovements.length < 2) return 0;
    const first = this.mouseMovements[0];
    const last = this.mouseMovements[this.mouseMovements.length - 1];
    const deltaX = last.x - first.x;
    const deltaY = last.y - first.y;
    const distance = Math.hypot(deltaX, deltaY);
    const deltaTime = (last.time - first.time) / 1000; // segundos
    return deltaTime > 0 ? distance / deltaTime : 0;
  },
  scheduleShow(circle) {
    // Si ya está bloqueado en este mismo círculo, no hacer nada
    if (this.intentLockEl === circle) return;

    // Si hubo un cambio hace poco, esperar a que pase el intervalo mínimo
    const now = Date.now();
    if (now - this.lastSwitchAt < this.minSwitchInterval) return;

    // Limpiar cualquier timer previo
    this.cancelShow(circle);

    this.hoverStartTime = now;
    this.mouseMovements = []; // resetear rastreo de movimientos

    // Evaluación diferida de intención
    this.hoverTimer = setTimeout(() => {
      const dwell = Date.now() - this.hoverStartTime;
      const velocity = this.calculateMouseVelocity();

      // Condiciones de intención: permanencia mínima + baja velocidad
      const intends = (dwell >= this.minDwellMs) && (velocity < this.velocityThreshold);
      if (intends) this.lockTo(circle);
      // Si no hay intención aún pero seguimos encima, reintentar pronto
      else if (circle.matches(':hover')) {
        // Reintentar tras un breve periodo para capturar la desaceleración natural
        this.hoverTimer = setTimeout(() => this.scheduleShow(circle), 80);
        return;
      }
      this.hoverTimer = null;
    }, this.hoverDelay);
  },
  cancelShow(circle) {
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = null;
    }
    this.mouseMovements = [];
    // Si salimos del círculo que estaba bloqueado, liberar y volver a genérico con retardo corto
    if (circle && this.intentLockEl === circle) {
      this.unlockIntent();
      this.resetIfNoneHovered();
    }
  },
  lockTo(circle) {
    const key = Array.from(circle.classList).find(c => /^service-\d+$/.test(c));
    if (!key) return;
    // Evitar cambios si ya está activo o dentro del intervalo mínimo
    if (this.intentLockKey === key) return;
    const now = Date.now();
    if (now - this.lastSwitchAt < this.minSwitchInterval) return;

    this.intentLockKey = key;
    this.intentLockEl = circle;
    this.lastSwitchAt = now;
    this.showFor(circle);
  },
  unlockIntent() {
    this.intentLockKey = null;
    this.intentLockEl = null;
  },
  setGeneric(immediate = false) {
    this.currentKey = null;
    const wasIndex = this.lastIndex;
    const wasEl = this.lastEl;
    this.lastIndex = null;
    this.lastEl = null;
    
    this.textEl.setAttribute('data-es', this.generic.es);
    this.textEl.setAttribute('data-en', this.generic.en);
    this.textEl.setAttribute('data-fr', this.generic.fr);
    this.textEl.setAttribute('data-pt', this.generic.pt);
    
    if (immediate) {
      // Primera carga: sin animación
      this.applyLanguage();
    } else {
      // Animar salida y entrada
      this.animateTextChange(wasIndex, null, wasEl, null);
    }
  },
  showFor(circle) {
    this.clearGenericTimer();
    const key = Array.from(circle.classList).find(c => /^service-\d+$/.test(c));
    if (!key) return;
    
    // Extraer número del servicio (service-1 → 1)
    const newIndex = parseInt(key.split('-')[1]);
    const oldIndex = this.lastIndex;
    const oldEl = this.lastEl;
    
    if (this.currentKey === key) return; // ya está mostrado
    
    this.currentKey = key;
    this.lastIndex = newIndex;
    this.lastEl = circle;
    
    const es = this.descriptions.es[key] || this.generic.es;
    const en = this.descriptions.en[key] || this.generic.en;
    const fr = (this.descriptions.fr && this.descriptions.fr[key]) || this.generic.fr;
    const pt = (this.descriptions.pt && this.descriptions.pt[key]) || this.generic.pt;
    this.textEl.setAttribute('data-es', es);
    this.textEl.setAttribute('data-en', en);
    this.textEl.setAttribute('data-fr', fr);
    this.textEl.setAttribute('data-pt', pt);
    
    this.animateTextChange(oldIndex, newIndex, oldEl, circle);
  },
  animateTextChange(fromIndex, toIndex, fromEl, toEl) {
    // Determinar dirección del movimiento
    // Si fromIndex es null (venimos del genérico o inicio), calculamos según posición si hay toEl
    // Si toIndex es null (vamos al genérico), salir en sentido opuesto al último movimiento
    let slideOut = 'slide-out-left';
    let slideIn = 'slide-in-right';
    
    const getCenter = (el) => {
      if (!el) return {x: 0, y: 0};
      const rect = el.getBoundingClientRect();
      return {x: rect.left + rect.width / 2, y: rect.top + rect.height / 2};
    };
    const fromC = getCenter(fromEl);
    const toC = getCenter(toEl);
    const dx = toC.x - fromC.x;
    // const dy = toC.y - fromC.y; // Reservado para futura lógica vertical
    if (fromEl && toEl) {
      // Determinar por posición real en pantalla para que funcione en responsive
      if (dx > 0) { slideOut = 'slide-out-left'; slideIn = 'slide-in-right'; }
      else if (dx < 0) { slideOut = 'slide-out-right'; slideIn = 'slide-in-left'; }
    } else if (fromEl && !toEl) {
      // Vamos al genérico: salir en función del último círculo
      slideOut = (fromIndex && fromIndex <= 3) ? 'slide-out-left' : 'slide-out-right';
      slideIn = (fromIndex && fromIndex <= 3) ? 'slide-in-right' : 'slide-in-left';
    } else if (!fromEl && toEl) {
      // Entramos desde genérico: en función de posición en grid aproximamos desde borde
      // Si el centro está a la izquierda de la mitad de la pantalla, entrar desde la izquierda
      const mid = (window.innerWidth || document.documentElement.clientWidth) / 2;
      slideIn = (toC.x < mid) ? 'slide-in-left' : 'slide-in-right';
      slideOut = (toC.x < mid) ? 'slide-out-right' : 'slide-out-left';
    } else if (fromIndex !== null && toIndex !== null) {
      // Fallback a indices si no hay elementos
      if (toIndex > fromIndex) { slideOut = 'slide-out-left'; slideIn = 'slide-in-right'; }
      else { slideOut = 'slide-out-right'; slideIn = 'slide-in-left'; }
    }
    
    // Limpiar clases previas
    this.clearAnimTimers();
    this.textEl.classList.remove('slide-in-left', 'slide-in-right', 'slide-out-left', 'slide-out-right');
    
    // Forzar reflow para reiniciar animación
    void this.textEl.offsetWidth;
    
    // Aplicar salida
    this.textEl.classList.add(slideOut);
    
    // Después de la animación de salida, cambiar texto y animar entrada
    this.isAnimating = true;
    const t1 = setTimeout(() => {
      this.applyLanguage();
      this.textEl.classList.remove(slideOut);
      void this.textEl.offsetWidth;
      this.textEl.classList.add(slideIn);
      
      // Limpiar clase de entrada tras completar
      const t2 = setTimeout(() => {
        this.textEl.classList.remove(slideIn);
        this.isAnimating = false;
      }, 260);
      this.animTimers.push(t2);
    }, 250);
    this.animTimers.push(t1);
  },
  resetIfNoneHovered() {
    // Si ningún círculo está en :hover, programar genérico con 1s de retardo
    if (!document.querySelector('.service-circle:hover')) {
      this.clearGenericTimer();
      this.genericTimer = setTimeout(() => {
        this.setGeneric();
        this.genericTimer = null;
      }, 250);
    }
  },
  clearGenericTimer() {
    if (this.genericTimer) {
      clearTimeout(this.genericTimer);
      this.genericTimer = null;
    }
  },
  clearAnimTimers() {
    if (this.animTimers.length) {
      this.animTimers.forEach(id => clearTimeout(id));
      this.animTimers = [];
    }
  },
  applyLanguage() {
    const lang = localStorage.getItem('idioma') || 'es';
    const txt = this.textEl.getAttribute(`data-${lang}`) || '';
    this.textEl.textContent = txt;
  }
};

// ===== OVERLAYS MÓVILES =====
const MobileOverlays = {
  io: null,
  init() {
    // Solo activar en pantallas móviles/estrechas
    if (window.innerWidth > 1024) return;
    if (this.io) return; // ya inicializado
    
    try {
      // Observador para detectar cuando los image-wrap entran en viewport
      this.io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const wrap = entry.target;
            // Activar TODAS las overlays de imagen dentro del wrap (p. ej., botellas 1..9)
            const imgOverlays = wrap.querySelectorAll('.mobile-overlay');
            if (imgOverlays && imgOverlays.length) {
              imgOverlays.forEach((img, idx) => {
                if (!img.classList.contains('visible')) {
                  // Pequeño escalonado para una entrada más agradable
                  setTimeout(() => img.classList.add('visible'), 150 + idx * 60);
                }
              });
            }
            // Activar overlays de texto (puede haber más de uno en un mismo wrap)
            const textOverlays = wrap.querySelectorAll('.mobile-text-overlay');
            if (textOverlays && textOverlays.length) {
              textOverlays.forEach((textOverlay, textIdx) => {
                if (!textOverlay.classList.contains('visible')) {
                  setTimeout(() => textOverlay.classList.add('visible'), 300 + textIdx * 80);
                }
              });
            }
          }
        });
      }, {
        root: document.getElementById('galeria-container'),
        threshold: 0.3 // Activar cuando el 30% del wrap sea visible
      });
      
      // Observar todos los image-wrap que tengan overlays móviles
      document.querySelectorAll('.image-wrap').forEach(wrap => {
        if (wrap.querySelector('.mobile-overlay') || wrap.querySelector('.mobile-text-overlay')) {
          this.io.observe(wrap);
        }
      });
    } catch (e) {
      console.warn('MobileOverlays IntersectionObserver failed:', e);
      // Fallback: hacer todas las imágenes visibles inmediatamente
      try {
        document.querySelectorAll('.mobile-overlay, .mobile-text-overlay').forEach(el => {
          el.classList.add('visible');
        });
      } catch (err) {
        console.warn('MobileOverlays fallback failed:', err);
      }
    }

    // Iniciar ciclo específico de thumbnails móviles si existe p10 con imágenes .thumb-mobile
    try { MobileThumbnails.init(); } catch (e) { console.warn('MobileThumbnails init failed:', e); }
    
    // Iniciar scroll horizontal del rollo móvil si existe
    try { MobileRollo.init(); } catch (e) { console.warn('MobileRollo init failed:', e); }

    try { MobileCards.init(); } catch (e) { console.warn('MobileCards init failed:', e); }
  }
};

// ===== CARTAS MÓVILES (p16) - Ciclo automático =====
const MobileCards = {
  cards: [],
  currentIndex: 0,
  timer: null,
  duration: 3000,
  initialized: false,
  init() {
    if (this.initialized) return;
    if (window.innerWidth > 1024) return; // Solo en móvil
    
    const wrap = document.querySelector('.image-wrap#p16');
    if (!wrap) return;
    
    this.cards = Array.from(wrap.querySelectorAll('.mobile-card'));
    if (this.cards.length === 0) return;
    
    this.initialized = true;
    this.start();
  },
  start() {
    if (this.timer || this.cards.length === 0) return;
    
    // Mostrar la primera carta
    this.showCard(0);
    
    // Iniciar ciclo automático
    this.timer = setInterval(() => this.next(), this.duration);
  },
  showCard(index) {
    if (index < 0 || index >= this.cards.length) return;
    
    // Ocultar todas
    this.cards.forEach(card => {
      card.classList.remove('is-active');
      card.classList.add('is-inactive');
    });
    
    // Mostrar la actual
    this.cards[index].classList.remove('is-inactive');
    this.cards[index].classList.add('is-active');
    this.currentIndex = index;
  },
  next() {
    const nextIndex = (this.currentIndex + 1) % this.cards.length;
    this.showCard(nextIndex);
  },
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
};

// ===== ROLLO MÓVIL DESLIZABLE (p12) =====
const MobileRollo = {
  wrap: null,
  img: null,
  isDragging: false,
  startX: 0,
  startY: 0,
  currentX: 0,
  minX: 0,
  pointerId: null,
  dragDirection: null,
  directionLocked: false,
  initialized: false,
  // Auto-scroll state
  autoRAF: null,
  autoDir: -1, // -1 hacia minX (derecha->izquierda), +1 hacia 0 (izquierda->derecha)
  autoBaseSpeed: 18, // px/segundo, más rápido (≈x2+)
  autoLastTs: 0,
  autoEnabled: true,
  isVisible: false,
  idleResumeTimer: null,
  idleResumeMs: 3000,
  visibilityObserver: null,
  // Auto ramp after (re)start
  autoRamp: 1,
  autoRampStartTs: 0,
  autoRampDurMs: 180,
  // Easing helpers
  clamp01(t) { return t < 0 ? 0 : (t > 1 ? 1 : t); },
  easeOutCubic(t) { t = this.clamp01(t); return 1 - Math.pow(1 - t, 3); },
  smoothStep(t) { t = this.clamp01(t); return t * t * (3 - 2 * t); },
  // Inercia
  moveSamples: [], // {x, t}
  inertialRAF: null,
  inertialVel: 0, // px/s
  inertialDecel: 2200, // px/s^2
  inertialMinVel: 18, // px/s, umbral para detener
  onPointerDown: null,
  onPointerMove: null,
  onPointerUp: null,
  onTouchStart: null,
  onTouchMove: null,
  onTouchEnd: null,
  onMouseDown: null,
  onMouseMove: null,
  onMouseUp: null,
  onResize: null,
  resizeObserver: null,
  // Cursor/hover tracking
  lastMouseX: null,
  lastMouseY: null,
  // Scroll lock during manual drag (mobile/touch)
  scrollLocked: false,
  lockScroll() {
    if (this.scrollLocked) return;
    this.scrollLocked = true;
    try {
      document.body.classList.add('rollo-scroll-lock');
      document.documentElement.style.overscrollBehavior = 'contain';
      document.body.style.overscrollBehavior = 'contain';
      document.documentElement.style.touchAction = 'none';
      document.body.style.touchAction = 'none';
    } catch {}
    // Prevent default scroll on global touchmove while dragging
    this._onGlobalTouchMove = (ev) => { if (this.isDragging) { try { ev.preventDefault(); } catch {} } };
    window.addEventListener('touchmove', this._onGlobalTouchMove, { passive: false });
  },
  unlockScroll() {
    if (!this.scrollLocked) return;
    this.scrollLocked = false;
    try {
      document.body.classList.remove('rollo-scroll-lock');
      document.documentElement.style.overscrollBehavior = '';
      document.body.style.overscrollBehavior = '';
      document.documentElement.style.touchAction = '';
      document.body.style.touchAction = '';
    } catch {}
    try { window.removeEventListener('touchmove', this._onGlobalTouchMove); } catch {}
    this._onGlobalTouchMove = null;
  },
  isInGrabBand(x, y) {
    if (!this.img) return false;
    const rect = this.img.getBoundingClientRect();
    if (!(x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom)) return false;
    if (!rect.height) return false;
    const relY = (y - rect.top) / rect.height;
    return relY >= 0.55 && relY <= 0.95;
  },
  updateCursorFromPoint(x, y) {
    if (!this.wrap || !this.img) return;
    // Sólo cambiar cursor cuando no estamos arrastrando
    if (this.isDragging) return;
    // Banda vertical [55%, 95%] del alto de la imagen del rollo
    const inBand = this.isInGrabBand(x, y);
    this.wrap.style.cursor = inBand ? 'grab' : 'default';
  },
  init() {
    if (this.initialized) return;
    this.wrap = document.querySelector('.image-wrap#p12');
    if (!this.wrap) return;
    this.img = this.wrap.querySelector('.mobile-rollo-scroll');
    if (!this.img) return;
    // Evitar arrastre nativo del navegador (ghost image) en desktop
    try { this.img.setAttribute('draggable', 'false'); } catch {}

    // Recalcular límites una vez que la imagen esté cargada y en cada resize/orientación.
    const updateBoundsNow = () => this.updateBounds(true);
    if (!this.img.complete) {
      this.img.addEventListener('load', updateBoundsNow, {once: true});
    }
    // Ejecutar tras un frame para asegurar que el wrapper ya no está display:none.
    requestAnimationFrame(updateBoundsNow);
    this.onResize = () => debounce('mobile-rollo-resize', updateBoundsNow, 120);
    window.addEventListener('resize', this.onResize, {passive: true});
    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(() => this.updateBounds(true));
      try { this.resizeObserver.observe(this.wrap); } catch {}
    }

    // Configurar observador de visibilidad para arrancar/parar auto-scroll
    try {
      const root = document.getElementById('galeria-container') || null;
      this.visibilityObserver = new IntersectionObserver((entries) => {
        const entry = entries && entries[0];
        if (!entry) return;
        if (entry.isIntersecting) {
          this.isVisible = true;
          // Iniciar auto si procede
          this.maybeStartAuto();
        } else {
          this.isVisible = false;
          this.stopAuto();
        }
      }, { root, threshold: 0.35 });
      this.visibilityObserver.observe(this.wrap);
    } catch (e) { /* silencioso */ }

    if (window.PointerEvent) {
      this.onPointerDown = (e) => {
        if (e.pointerType === 'mouse' && e.buttons !== 1) return;
        if (!this.canDrag()) return;
        // Sólo permitir agarre si comienza dentro de la banda
        if (!this.isInGrabBand(e.clientX, e.clientY)) return;
        this.pointerId = e.pointerId;
        this.wrap.setPointerCapture?.(e.pointerId);
        // En desktop, prevenir arrastre nativo del img sólo si vamos a arrastrar
        if (e.pointerType === 'mouse') {
          try { e.preventDefault(); } catch {}
        }
        this.handleStart(e.clientX, e.clientY);
        // En touch, bloquear scroll de la página hasta finalizar el drag
        if (e.pointerType === 'touch') this.lockScroll();
        // No preventDefault aquí para permitir determinación de dirección
      };
      this.onPointerMove = (e) => {
        if (!this.isDragging || e.pointerId !== this.pointerId) return;
        const shouldPrevent = this.handleMove(e.clientX, e.clientY);
        if (shouldPrevent) {
          e.preventDefault();
        }
      };
      this.onPointerUp = (e) => {
        if (e.pointerId !== this.pointerId) return;
        this.wrap.releasePointerCapture?.(e.pointerId);
        this.handleEnd();
        // Liberar bloqueo de scroll si estaba activo
        this.unlockScroll();
      };
      // Actualizar cursor cuando el puntero se mueve sobre el área sin arrastrar
      this.wrap.addEventListener('pointermove', (e) => {
        this.lastMouseX = e.clientX; this.lastMouseY = e.clientY;
        this.updateCursorFromPoint(e.clientX, e.clientY);
      });
      this.wrap.addEventListener('pointerleave', () => {
        this.wrap.style.cursor = 'default';
      });
      this.wrap.addEventListener('pointerdown', this.onPointerDown);
      this.wrap.addEventListener('pointermove', this.onPointerMove);
      this.wrap.addEventListener('pointerup', this.onPointerUp);
      this.wrap.addEventListener('pointercancel', this.onPointerUp);
      this.wrap.addEventListener('pointerleave', this.onPointerUp);
    } else {
      // Touch fallback
      this.onTouchStart = (e) => {
        if (!this.canDrag()) return;
        const touch = e.touches[0];
        if (!touch) return;
        if (!this.isInGrabBand(touch.clientX, touch.clientY)) return;
        this.handleStart(touch.clientX, touch.clientY);
        // Bloquear scroll global hasta terminar el drag
        this.lockScroll();
        // No preventDefault para permitir detección de dirección
      };
      this.onTouchMove = (e) => {
        if (!this.isDragging) return;
        const touch = e.touches[0];
        if (!touch) return;
        const shouldPrevent = this.handleMove(touch.clientX, touch.clientY);
        if (shouldPrevent) {
          e.preventDefault();
        }
      };
      this.onTouchEnd = () => this.handleEnd();
      // Al finalizar/cancelar, liberar bloqueo
      this.wrap.addEventListener('touchend', () => this.unlockScroll());
      this.wrap.addEventListener('touchcancel', () => this.unlockScroll());
      this.wrap.addEventListener('touchstart', this.onTouchStart, {passive: true});
      this.wrap.addEventListener('touchmove', this.onTouchMove, {passive: false});
      this.wrap.addEventListener('touchend', this.onTouchEnd);
      this.wrap.addEventListener('touchcancel', this.onTouchEnd);

      // Mouse fallback (para pruebas en escritorio estrecho)
      this.onMouseDown = (e) => {
        if (e.button !== 0 || !this.canDrag()) return;
        if (!this.isInGrabBand(e.clientX, e.clientY)) return;
        // Prevenir drag nativo del navegador (ghost) en fallback mouse, sólo si vamos a arrastrar
        try { e.preventDefault(); } catch {}
        this.handleStart(e.clientX, e.clientY);
        // No preventDefault para permitir detección de dirección
      };
      this.onMouseMove = (e) => {
        if (!this.isDragging) return;
        const shouldPrevent = this.handleMove(e.clientX, e.clientY);
        if (shouldPrevent) {
          e.preventDefault();
        }
      };
      this.onMouseUp = () => this.handleEnd();
      this.wrap.addEventListener('mousedown', this.onMouseDown);
      document.addEventListener('mousemove', this.onMouseMove);
      document.addEventListener('mouseup', this.onMouseUp);
      // Seguimiento de cursor en fallback mouse para actualizar mano
      this.wrap.addEventListener('mousemove', (e) => {
        this.lastMouseX = e.clientX; this.lastMouseY = e.clientY;
        this.updateCursorFromPoint(e.clientX, e.clientY);
      });
      this.wrap.addEventListener('mouseleave', () => { this.wrap.style.cursor = 'default'; });
    }

    this.initialized = true;
    // Intentar arrancar auto-scroll si ya está visible al iniciar
    this.maybeStartAuto();
  },
  canDrag() {
    return this.minX < 0;
  },
  updateBounds(adjustCurrent = false) {
    if (!this.wrap || !this.img) return;
    const wrapRect = this.wrap.getBoundingClientRect();
    if (!wrapRect.width || !wrapRect.height) {
      this.minX = 0;
      this.wrap.classList.remove('mobile-rollo-enabled');
      return;
    }

    let displayedWidth = this.img.getBoundingClientRect().width;
    if ((!displayedWidth || !isFinite(displayedWidth)) && this.img.naturalWidth && this.img.naturalHeight) {
      const scale = wrapRect.height / this.img.naturalHeight;
      if (scale > 0) displayedWidth = this.img.naturalWidth * scale;
    }
    if (!displayedWidth || !isFinite(displayedWidth)) {
      displayedWidth = wrapRect.width;
    }

    const newMin = Math.min(0, wrapRect.width - displayedWidth);
    this.minX = isFinite(newMin) ? newMin : 0;
    this.wrap.classList.toggle('mobile-rollo-enabled', this.minX < 0);
    if (adjustCurrent) {
      const clamped = Math.max(this.minX, Math.min(0, this.currentX));
      this.applyPosition(clamped);
    }
    // Si no hay espacio para deslizar, detener auto
    if (!this.canDrag()) this.stopAuto(); else this.maybeStartAuto();
  },
  handleStart(clientX, clientY) {
    if (!this.canDrag()) return;
    this.isDragging = true;
    this.startX = clientX - this.currentX;
    this.startY = clientY || 0;
    this.dragDirection = null;
    this.directionLocked = false;
    this.img.style.willChange = 'transform';
    this.wrap.style.cursor = 'grabbing';
    // Cualquier gesto manual interrumpe el auto-scroll
    this.stopAutoTemporarily();
    // Cancelar inercia en curso y resetear muestreo
    this.stopInertia();
    this.moveSamples = [{ x: this.currentX, t: performance.now() }];
  },
  handleMove(clientX, clientY) {
    if (!this.isDragging || !this.img) return;
    
    // Detectar dirección del gesto en las primeras movidas
    if (!this.directionLocked) {
      const deltaX = Math.abs(clientX - (this.startX + this.currentX));
      const deltaY = Math.abs(clientY - this.startY);
      
      // Necesitamos un movimiento mínimo para determinar dirección
      if (deltaX > 5 || deltaY > 5) {
        this.dragDirection = deltaX > deltaY ? 'horizontal' : 'vertical';
        this.directionLocked = true;
        
        // Si es vertical, cancelar el drag del rollo para permitir scroll de página
        if (this.dragDirection === 'vertical') {
          this.isDragging = false;
          this.wrap.classList.remove('mobile-rollo-dragging');
          this.img.style.willChange = 'auto';
          return false;
        } else {
          this.wrap.classList.add('mobile-rollo-dragging');
        }
      }
    }
    
    // Solo mover si es horizontal
    if (this.dragDirection === 'horizontal') {
      const deltaX = clientX - this.startX;
      const clamped = Math.max(this.minX, Math.min(0, deltaX));
      this.applyPosition(clamped);
      // Interacción manual: reiniciar temporizador de reanudación
      this.stopAutoTemporarily();
      // Registrar muestra para velocidad
      const now = performance.now();
      this.moveSamples.push({ x: this.currentX, t: now });
      // Mantener últimas muestras (~140ms)
      const windowMs = 140;
      this.moveSamples = this.moveSamples.filter(s => (now - s.t) <= windowMs);
      return true;
    }
    return false;
  },
  handleEnd() {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.wrap.classList.remove('mobile-rollo-dragging');
    this.img.style.willChange = 'auto';
    this.pointerId = null;
    // Restaurar cursor según última posición del puntero
    if (this.lastMouseX != null && this.lastMouseY != null) this.updateCursorFromPoint(this.lastMouseX, this.lastMouseY);
    else this.wrap.style.cursor = 'default';
    // Calcular velocidad de salida para inercia
    const now = performance.now();
    // usar primera muestra dentro de ventana y la última
    const recent = this.moveSamples.filter(s => (now - s.t) <= 140);
    let v = 0;
    if (recent.length >= 2) {
      const first = recent[0];
      const last = recent[recent.length - 1];
      const dt = Math.max(0.001, (last.t - first.t) / 1000);
      v = (last.x - first.x) / dt; // px/s (signo coincide con desplazamiento)
    }
    this.moveSamples = [];
    // Si la velocidad es suficiente, iniciar inercia; si no, planificar auto
    if (Math.abs(v) >= this.inertialMinVel) {
      this.startInertia(v);
    } else {
      this.scheduleAutoResume();
    }
  },
  applyPosition(x) {
    this.currentX = x;
    this.img.style.setProperty('transform', `translateX(${x}px)`, 'important');
  },
  // ==== Inercia ====
  startInertia(initialVel) {
    this.stopInertia();
    this.inertialVel = initialVel;
    let last = performance.now();
    const zone = this.edgeZonePx();
    const step = (ts) => {
      const dt = Math.max(0, (ts - last) / 1000);
      last = ts;
      // Fricción lineal: reducir velocidad hacia 0
      const sign = Math.sign(this.inertialVel) || 1;
      const dec = this.inertialDecel * dt;
      let v = this.inertialVel - sign * dec;
      // Enlentecer cerca del borde hacia el que vamos (edge easing)
      const distToMin = Math.max(0, this.currentX - this.minX);
      const distToMax = Math.max(0, 0 - this.currentX);
      let factor = 1;
      if (v < 0) factor = Math.min(1, distToMin / zone);
      else if (v > 0) factor = Math.min(1, distToMax / zone);
      factor = Math.max(0.12, factor);
      // Aplicar inercia
      let nx = this.currentX + v * dt;
      // Límite y parada al tocar borde en la dirección de avance
      if (nx <= this.minX && v < 0) { nx = this.minX; v = 0; }
      if (nx >= 0 && v > 0) { nx = 0; v = 0; }
      this.applyPosition(nx);
      this.inertialVel = v;
      // Condición de parada
      if (Math.abs(v) < this.inertialMinVel) {
        this.stopInertia();
        this.scheduleAutoResume();
        return;
      }
      this.inertialRAF = requestAnimationFrame(step);
    };
    this.inertialRAF = requestAnimationFrame(step);
  },
  stopInertia() {
    if (this.inertialRAF) {
      cancelAnimationFrame(this.inertialRAF);
      this.inertialRAF = null;
    }
    this.inertialVel = 0;
  },
  // ==== Auto-scroll helpers ====
  edgeZonePx() {
    // Zona base: ~15% del span, acotada 40..120
    const span = Math.abs(this.minX);
    const base = Math.max(40, Math.min(120, span * 0.15));
    // Reducir nuevamente a la mitad: 6.25% del baseline
    const reduced = base * 0.0625;
    // Cotas más pequeñas para rampas muy cortas
    return Math.max(3, Math.min(8, reduced));
  },
  startAutoRamp() {
    const zone = this.edgeZonePx();
    // Duración aproximada proporcional a zona/velocidad base (rápida pero gradual)
    const ms = Math.max(120, Math.min(350, (zone / Math.max(1, this.autoBaseSpeed)) * 1000));
    this.autoRampDurMs = ms;
    this.autoRampStartTs = performance.now();
    this.autoRamp = 0;
  },
  // Preferimos salida rápida pero suave para ramp auto
  rampEaseOut(t) { return this.easeOutCubic(t); },
  maybeStartAuto() {
    if (!this.autoEnabled) return;
    if (!this.isVisible) return;
    if (!this.canDrag()) return;
    if (this.isDragging) return;
    if (this.autoRAF) return;
    // Si estamos pegados a un borde, arrancar hacia el centro opuesto
    if (this.currentX <= this.minX + 0.5) this.autoDir = +1;
    else if (this.currentX >= -0.5) this.autoDir = -1;
    this.autoLastTs = performance.now();
    this.startAutoRamp();
    const tick = (ts) => {
      if (!this.autoRAF) return; // parado
      const dt = Math.max(0, (ts - this.autoLastTs) / 1000);
      this.autoLastTs = ts;
      // Cálculo de velocidad con desaceleración cerca del borde de llegada
      // y aceleración simétrica desde el borde de salida.
      const zone = this.edgeZonePx();
      const distToMin = Math.max(0, this.currentX - this.minX);
      const distToMax = Math.max(0, 0 - this.currentX);

      // Factor de aproximación (desaceleración) hacia el borde destino (suavizado S-curve)
      const approachLin = (this.autoDir < 0)
        ? Math.min(1, distToMin / zone)
        : Math.min(1, distToMax / zone);
      const approachFactor = this.smoothStep(approachLin);

      // Factor de salida (aceleración) desde el borde opuesto, con easeOut para subir rápido
      const departDist = (this.autoDir < 0) ? (distToMax) : (distToMin);
      const departLin = Math.min(1, departDist / zone);
      const departFactor = this.easeOutCubic(departLin);

      // Usar el mínimo para combinar ambas condiciones
      let factor = Math.min(approachFactor, departFactor);
      // Aplicar rampa de arranque tras reinicio de auto (aceleración desde 0)
      if (this.autoRamp < 1) {
        const t = (ts - this.autoRampStartTs) / Math.max(1, this.autoRampDurMs);
        this.autoRamp = Math.min(1, Math.max(0, t));
        const ramp = this.rampEaseOut(this.autoRamp);
        factor *= ramp;
      }
      const step = this.autoDir * this.autoBaseSpeed * factor * dt;
      let nx = this.currentX + step;
      // Umbral de snap a borde para garantizar inversión natural
      const snapPx = 0.5;
      if (this.autoDir < 0 && distToMin <= snapPx) nx = this.minX; // acercándonos a minX
      if (this.autoDir > 0 && distToMax <= snapPx) nx = 0;        // acercándonos a 0
      // Gestión de límites con inversión suave
      if (nx <= this.minX) {
        nx = this.minX;
        this.autoDir = +1;
        // Micro-impulso para salir del borde manteniendo inicio en 0 de facto
        const kick = Math.min(0.2, Math.abs(this.minX) * 0.0012);
        nx = Math.min(0, nx + kick);
      } else if (nx >= 0) {
        nx = 0;
        this.autoDir = -1;
        const kick = Math.min(0.2, Math.abs(this.minX) * 0.0012);
        nx = Math.max(this.minX, nx - kick);
      }
      this.applyPosition(nx);
      this.autoRAF = requestAnimationFrame(tick);
    };
    this.autoRAF = requestAnimationFrame(tick);
  },
  stopAuto() {
    if (this.autoRAF) {
      cancelAnimationFrame(this.autoRAF);
      this.autoRAF = null;
    }
  },
  stopAutoTemporarily() {
    this.stopAuto();
    if (this.idleResumeTimer) {
      clearTimeout(this.idleResumeTimer);
      this.idleResumeTimer = null;
    }
  },
  scheduleAutoResume() {
    if (!this.autoEnabled) return;
    if (this.idleResumeTimer) {
      clearTimeout(this.idleResumeTimer);
      this.idleResumeTimer = null;
    }
    this.idleResumeTimer = setTimeout(() => {
      this.idleResumeTimer = null;
      this.maybeStartAuto();
    }, this.idleResumeMs);
  },
  destroy() {
    if (!this.initialized) return;
    if (window.PointerEvent) {
      this.wrap?.removeEventListener('pointerdown', this.onPointerDown);
      this.wrap?.removeEventListener('pointermove', this.onPointerMove);
      this.wrap?.removeEventListener('pointerup', this.onPointerUp);
      this.wrap?.removeEventListener('pointercancel', this.onPointerUp);
      this.wrap?.removeEventListener('pointerleave', this.onPointerUp);
    } else {
      this.wrap?.removeEventListener('touchstart', this.onTouchStart);
      this.wrap?.removeEventListener('touchmove', this.onTouchMove);
      this.wrap?.removeEventListener('touchend', this.onTouchEnd);
      this.wrap?.removeEventListener('touchcancel', this.onTouchEnd);
      this.wrap?.removeEventListener('mousedown', this.onMouseDown);
      document.removeEventListener('mousemove', this.onMouseMove);
      document.removeEventListener('mouseup', this.onMouseUp);
    }
    window.removeEventListener('resize', this.onResize);
    if (this.resizeObserver) {
      try { this.resizeObserver.disconnect(); } catch {}
      this.resizeObserver = null;
    }
    if (this.visibilityObserver) {
      try { this.visibilityObserver.disconnect(); } catch {}
      this.visibilityObserver = null;
    }
    this.stopAuto();
    if (this.idleResumeTimer) { clearTimeout(this.idleResumeTimer); this.idleResumeTimer = null; }
    this.wrap?.classList.remove('mobile-rollo-dragging', 'mobile-rollo-enabled');
    this.img?.style && (this.img.style.willChange = 'auto');
    this.initialized = false;
  }
};

// ===== THUMBNAILS MÓVILES (p10) =====
// Ciclo simplificado reutilizando imágenes en assets/Secciones/Proyectos/Thumbnails/movil/
// Grupos: 1.x, 2.x, 3.x cada uno con 4 imágenes (posiciones 1..4).
// Efecto: fundido + leve desplazamiento diagonal, escalonado por imagen.
const MobileThumbnails = {
  wrap: null,
  imgs: [],
  textBlocks: [],
  textTimers: [],
  group: 1,
  timer: null,
  duration: 5000,
  transitioning: false,
  preloaded: false,
  initialized: false,
  preload() {
    if (this.preloaded) return;
    try {
      [1,2,3].forEach(g => [1,2,3,4].forEach(i => {
        const im = new Image();
  im.src = `assets/Secciones/Proyectos/Thumbnails/movil/${g}.${i}.webp`;
      }));
      this.preloaded = true;
    } catch (e) {
      console.warn('MobileThumbnails preload failed:', e);
    }
  },
  init() {
    if (this.initialized) return;
    this.wrap = document.querySelector('#p10');
    if (!this.wrap) return;
    this.imgs = Array.from(this.wrap.querySelectorAll('.thumb-mobile.mobile-overlay'));
    if (!this.imgs.length) return;
    this.textBlocks = Array.from(this.wrap.querySelectorAll('.mobile-text-overlay.thumb-text-block'));
    this.updateTextGroup(this.group);
    
    try {
      this.preload();
      // Asegurar z-index por encima del fondo móvil pero debajo de textos
      this.imgs.forEach((img,i) => { img.style.zIndex = (2 + i).toString(); });
      // Añadir clase visible escalonada inicial (si MobileOverlays ya los activó no pasa nada)
      this.imgs.forEach((img,i) => setTimeout(() => img.classList.add('visible'), 180 + i*120));
      // Iniciar ciclo
      this.start();
      this.initialized = true;
    } catch (e) {
      console.warn('MobileThumbnails init failed:', e);
    }
  },
  next() {
    if (this.transitioning || !this.imgs.length) return;
    const nextGroup = this.group === 3 ? 1 : this.group + 1;
    this.setGroup(nextGroup);
  },
  setGroup(g) {
    if (!this.imgs.length) return;
    this.transitioning = true;
    this.updateTextGroup(g);
    let changed = false;
    
    this.imgs.forEach((img, idx) => {
  const newSrc = `assets/Secciones/Proyectos/Thumbnails/movil/${g}.${idx+1}.webp`;
      if (img.getAttribute('src') === newSrc) return; // nada que cambiar
      changed = true;
      
      try {
        // Crear imagen temporal con máscara diagonal (mismo método que desktop)
        const tmp = document.createElement('img');
        tmp.alt = img.alt || '';
        tmp.className = `mobile-overlay thumb-mobile thumb-temp`;
        tmp.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
          z-index: 100;
          pointer-events: none;
          opacity: 1;
        `;
        
        // Configurar máscara con gradiente diagonal (mismo que desktop)
        const feather = '3%';
        const mask = `linear-gradient(110deg, rgba(0,0,0,1) calc(var(--edge, -10%) - ${feather}), rgba(0,0,0,1) var(--edge, -10%), rgba(0,0,0,0) calc(var(--edge, -10%) + ${feather}))`;
        Object.assign(tmp.style, {
          webkitMaskImage: mask,
          maskImage: mask,
          webkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          webkitMaskSize: '200% 200%',
          maskSize: '200% 200%'
        });
        tmp.style.setProperty('--edge', '-10%');

        tmp.addEventListener('load', () => {
          if (!img.parentElement) return; // Safety check
          tmp.style.opacity = '1';
          img.parentElement.appendChild(tmp);
          
          // Animación diagonal suave (mismo timing que desktop)
          const duration = 1400;
          const start = performance.now();
          const easeInOut = t => t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2)/2;
          
          const step = now => {
            let p = Math.min(1, Math.max(0, (now - start) / duration));
            const eased = easeInOut(p);
            const edge = -10 + 120 * eased;
            const edgeValue = edge.toFixed(2) + '%';
            
            if (tmp.isConnected) tmp.style.setProperty('--edge', edgeValue);
            
            if (p < 1) {
              requestAnimationFrame(step);
            } else {
              // Finalizar: cambiar src y limpiar
              img.src = newSrc;
              requestAnimationFrame(() => {
                if (tmp.isConnected) tmp.remove();
                // Marcar transición completa cuando se procese la última imagen
                if (idx === this.imgs.length - 1) {
                  setTimeout(() => {
                    this.transitioning = false;
                  }, 50);
                }
              });
            }
          };
          requestAnimationFrame(step);
        }, {once: true});
        
        tmp.onerror = () => {
          console.warn('Failed to load thumbnail:', newSrc);
          if (tmp.isConnected) tmp.remove();
          this.transitioning = false;
        };
        
        tmp.src = newSrc;
      } catch (e) {
        console.warn('MobileThumbnails setGroup error:', e);
        this.transitioning = false;
      }
    });
    
    if (!changed) {
      this.transitioning = false;
    }
    this.group = g;
  },
  updateTextGroup(g) {
    if (!this.textBlocks.length) return;
    this.textTimers.forEach(timer => clearTimeout(timer));
    this.textTimers = [];

    this.textBlocks.forEach(block => {
      block.classList.remove('is-active');
      block.setAttribute('aria-hidden', 'true');
    });

    const current = this.textBlocks.filter(block => (parseInt(block.getAttribute('data-group'), 10) || 0) === g);
    const baseDelay = 150;
    const stepDelay = 80;

    current.forEach((block, idx) => {
      const timer = setTimeout(() => {
        block.classList.add('is-active');
        block.setAttribute('aria-hidden', 'false');
      }, baseDelay + idx * stepDelay);
      this.textTimers.push(timer);
    });
  },
  start() {
    if (this.timer || !this.imgs.length) return;
    this.timer = setInterval(() => this.next(), this.duration);
  },
  stop() { 
    if (this.timer) { 
      clearInterval(this.timer); 
      this.timer = null; 
    } 
    this.textTimers.forEach(timer => clearTimeout(timer));
    this.textTimers = [];
  }
};

// ===== FOOTER INLINE EN MÓVIL =====
const MobileFooter = {
  initialized: false,
  originalFooter: null,
  init() {
    if (this.initialized) return;
    if (window.innerWidth > 1024) return; // Solo en móvil/ventanas estrechas
    
    this.originalFooter = document.querySelector('footer');
    if (!this.originalFooter) return;
    
    // Insertar una copia del footer al final de cada sección
    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
      // Verificar si ya tiene un footer inline
      if (section.querySelector('footer.inline-footer')) return;
      
      // Clonar el footer
      const footerClone = this.originalFooter.cloneNode(true);
      footerClone.classList.add('inline-footer');
      footerClone.classList.remove('visible');
      
      // Insertar al final de la sección
      section.appendChild(footerClone);
    });
    
    this.initialized = true;
  },
  cleanup() {
    // Limpiar footers inline al cambiar a desktop
    document.querySelectorAll('footer.inline-footer').forEach(f => f.remove());
    this.initialized = false;
  }
};

// ===== SINCRONIZACIÓN DE SCROLL PROYECTOS (Desktop <-> Mobile) =====
const ProyectosSync = {
  initialized: false,
  wasNarrow: null,
  desktopToMobile: {
    'p1': 'p1', 'p2': 'p1',
    'p3': 'p3', 'p4': 'p3',
    'p5': 'p4', 'p6': 'p4',
    'p7': 'p7',
    'p8': 'p8',
    'p9': 'p9',
    'p10': 'p10', 'p11': 'p10',
    'p12': 'p12', 'p13': 'p12', 'p14': 'p12', 'p15': 'p12',
    'p16': 'p16', 'p17': 'p16', 'p18': 'p16',
    'p19': 'p19', 'p20': 'p19'
  },
  mobileToDesktop: {
    'p1': 'p1',
    'p3': 'p3',
    'p4': 'p5',
    'p7': 'p7',
    'p8': 'p8',
    'p9': 'p9',
    'p10': 'p10',
    'p12': 'p12',
    'p16': 'p16',
    'p19': 'p19'
  },
  lastVisibleId: null,

  init() {
    if (this.initialized) return;
    // Solo activar en la página de proyectos
    if (!document.body.classList.contains('proyectos-page')) return;
    
    this.wasNarrow = window.innerWidth <= 1024;
    this.initialized = true;
    
    // Función para rastrear qué elemento está visible
    const trackScroll = () => {
      // Usar exclusivamente los wrappers `.image-wrap[id="pN"]` para evitar
      // colisiones con elementos internos que también usan id="pN".
      const wraps = Array.from(document.querySelectorAll('#galeria .image-wrap[id]'))
                         .filter(el => /^p\d+$/.test(el.id));

      let visibleId = null;
      const viewportHeight = window.innerHeight;
      const center = viewportHeight / 2;

      for (const wrap of wraps) {
        const rect = wrap.getBoundingClientRect();
        if (rect.top <= center && rect.bottom >= center) {
          visibleId = wrap.id;
          break;
        }
      }

      if (visibleId && visibleId !== this.lastVisibleId) {
        console.log('Visible ID actualizado:', visibleId, 'isNarrow:', window.innerWidth <= 1024);
        this.lastVisibleId = visibleId;
      }
    };
    
    // Escuchar scroll en window y en el contenedor de galería
    window.addEventListener('scroll', trackScroll, {passive: true});
    const galeriaContainer = document.getElementById('galeria-container');
    if (galeriaContainer) {
      galeriaContainer.addEventListener('scroll', trackScroll, {passive: true});
    }
    
    // Chequeo inicial
    trackScroll();
    
    // Escuchar resize para aplicar la sincronización
    let resizeTimeout;
    window.addEventListener('resize', () => {
      const isNarrow = window.innerWidth <= 1024;
      if (this.wasNarrow !== isNarrow) {
        // Guardar el ID del modo anterior antes de cambiar
        const savedId = this.lastVisibleId;
        const savedWasNarrow = this.wasNarrow;
        
        console.log('Resize detectado:', {
          savedWasNarrow,
          isNarrow,
          savedId,
          direction: savedWasNarrow ? 'narrow→wide' : 'wide→narrow'
        });
        
        // Actualizar el estado inmediatamente
        this.wasNarrow = isNarrow;
        
        // Esperar a que el layout se estabilice antes de hacer scroll
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          if (savedId) {
            this.syncPosition(savedWasNarrow, isNarrow, savedId);
            // Después de sincronizar, forzar una actualización del tracking
            setTimeout(() => trackScroll(), 100);
          }
        }, 150);
      }
    });
  },
  
  syncPosition(fromNarrow, toNarrow, currentId) {
    let targetId = null;
    if (fromNarrow && !toNarrow) {
      // Mobile -> Desktop
      targetId = this.mobileToDesktop[currentId];
      // Fallback: si no está en el mapa, intentar usar el mismo ID
      if (!targetId) targetId = currentId; 
    } else if (!fromNarrow && toNarrow) {
      // Desktop -> Mobile
      targetId = this.desktopToMobile[currentId];
    }
    
    if (targetId) {
      // Buscar específicamente el .image-wrap con ese ID
      const targetEl = document.querySelector(`#galeria .image-wrap[id="${targetId}"]`);
      if (targetEl) {
        // Timeout para asegurar que el layout se ha estabilizado después del resize
        setTimeout(() => {
          // En modo ancho (desktop), scrollear el contenedor; en estrecho, la ventana
          if (!toNarrow) {
            // Modo desktop: scroll en #galeria-container
            const container = document.getElementById('galeria-container');
            if (container) {
              const containerRect = container.getBoundingClientRect();
              const targetRect = targetEl.getBoundingClientRect();
              const scrollTop = container.scrollTop + (targetRect.top - containerRect.top);
              container.scrollTo({top: scrollTop, behavior: 'auto'});
            }
          } else {
            // Modo móvil: scroll en window
            targetEl.scrollIntoView({block: 'start', behavior: 'auto'});
          }
        }, 200);
      }
    }
  }
};

// ===== INICIALIZACIÓN OPTIMIZADA =====
const init = () => {
  if ($.initialized) return; // prevent double init
  $.initialized = true;
  $.lastIsNarrow = $.isNarrow;
  [Layout, Nav, Overlays, Lang, Intro, Carousel, WebdevMini, ServicesDesc, MobileOverlays].forEach(comp => comp.init());
  
  // Inicializar footer inline en móvil
  MobileFooter.init();
  
  // Inicializar sincronización de scroll en proyectos
  ProyectosSync.init();
  
  // Asignar direcciones de rotación aleatorias (±15deg) a los overlays de p9
  try {
    const p9Overlays = document.querySelectorAll('#p9 .overlay');
    p9Overlays.forEach((el) => {
      // asignar ángulo de rotación aleatorio: 15deg o -15deg
      const sign = Math.random() > 0.5 ? 1 : -1;
      el.style.setProperty('--overlay-rot', `${15 * sign}deg`);
      // dejar --overlay-origin editable en línea o en CSS; por defecto ya está en CSS
    });
    // Asegurar que las sombras (si existen) reciben la misma variable de rotación
    const p9Sombras = document.querySelectorAll('#p9 .sombra');
    if (p9Sombras && p9Sombras.length) {
      // Re-use the same random sign strategy but match per-index to overlays when possible
      p9Sombras.forEach((s, i) => {
        // Try to find a corresponding overlay to copy the rotation value
        const overlay = document.querySelector(`#p9 .overlay[data-cartel="${s.getAttribute('data-cartel')}"]`);
        if (overlay && overlay.style && overlay.style.getPropertyValue('--overlay-rot')) {
          s.style.setProperty('--overlay-rot', overlay.style.getPropertyValue('--overlay-rot'));
        } else {
          const sign = Math.random() > 0.5 ? 1 : -1;
          s.style.setProperty('--overlay-rot', `${15 * sign}deg`);
        }
      });
    }
  } catch (e) { /* silent */ }
  // Botón Ver proyectos: ir a la sección proyectos
  try {
    const verBtn = document.getElementById('btn-ver-proyectos');
    verBtn && verBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const onProyectosPage = !!document.getElementById('proyectos');
      if (!onProyectosPage) {
        window.location.href = 'proyectos.html';
        return;
      }
      mostrarSeccion('proyectos');
    });
  } catch {}
  setupNormalOverlays();
  hydrateCircleSlides();
  // Cargar perezosamente las imágenes de los slides (via IO o hover)
  lazyLoadFrames();
  enhanceA11y();
  lazyMedia();
  // Configurar observador de footer para la sección activa
  try { FooterWatch.attachToCurrentSection(); } catch {}
  
  // Event listeners optimizados
  [
    [window, 'scroll', () => Scroll.handleMain()],
    // Fallback robusto: usar rueda/gesto de scroll para detectar dirección aunque el host del scroll no sea window
    [window, 'wheel', (e) => {
      try {
        if (!document.body.classList.contains('proyectos-page')) return;
        const im = document.getElementById('indice-mobile');
        if (!im) return;
        const cs = window.getComputedStyle(im);
        if (!cs || cs.display === 'none') return;
        const dy = e.deltaY || 0;
        const currentDirection = dy > 0 ? 1 : (dy < 0 ? -1 : 0);
        const threshold = window.innerWidth <= 768 ? 0 : 2;
        
        // Reaccionar inmediatamente a cambios de dirección
        if (currentDirection !== 0 && (Math.abs(dy) > threshold || currentDirection !== $.lastScrollDirection)) {
          if (currentDirection > 0) {
            $.header?.classList.add('hidden');
          } else {
            $.header?.classList.remove('hidden');
          }
          $.lastScrollDirection = currentDirection;
        }
      } catch {}
    }, {passive: true}],
    // Soporte táctil: trackear touchmove para móviles
    [window, 'touchstart', (e) => {
      try {
        if (!document.body.classList.contains('proyectos-page')) return;
        const im = document.getElementById('indice-mobile');
        if (!im) return;
        const cs = window.getComputedStyle(im);
        if (!cs || cs.display === 'none') return;
        $.touchStartY = e.touches[0]?.clientY || 0;
      } catch {}
    }, {passive: true}],
    [window, 'touchmove', (e) => {
      try {
        if (!document.body.classList.contains('proyectos-page')) return;
        const im = document.getElementById('indice-mobile');
        if (!im) return;
        const cs = window.getComputedStyle(im);
        if (!cs || cs.display === 'none') return;
        if ($.touchStartY === undefined) return;
        const currentY = e.touches[0]?.clientY || 0;
        const dy = $.touchStartY - currentY;
        const currentDirection = dy > 0 ? 1 : (dy < 0 ? -1 : 0);
        
        // Reaccionar inmediatamente a cualquier cambio de dirección
        if (currentDirection !== 0 && currentDirection !== $.lastScrollDirection) {
          if (currentDirection > 0) {
            $.header?.classList.add('hidden');
          } else {
            $.header?.classList.remove('hidden');
          }
          $.lastScrollDirection = currentDirection;
        }
        $.touchStartY = currentY;
      } catch {}
    }, {passive: true}],
    [window, 'resize', () => debounce('resize', () => { 
      const wasNarrow = $.lastIsNarrow ?? $.isNarrow;
      const nowNarrow = $.isNarrow;
      Layout.update(); 
      Scroll.syncFooterVar();
      try { FooterWatch.attachToCurrentSection(); } catch {}
      // Verificar footer también en resize (fallback si no hay IO)
      if (!FooterWatch.usingObserver) Scroll.updateFooter();
      // Recalcular índice activo tras cambios de layout/orientación
      try { Nav.updateActive && Nav.updateActive(); } catch {}
      
      // Gestionar footer inline al cambiar tamaño
      if (window.innerWidth <= 1024 && !MobileFooter.initialized) {
        MobileFooter.init();
      } else if (window.innerWidth > 1024 && MobileFooter.initialized) {
        MobileFooter.cleanup();
      }

      // Si cambiamos de modo (≤1024 ⇄ >1024), ajustar estado de Proyectos y overlays
      if (wasNarrow !== nowNarrow) {
        const proyectos = document.getElementById('proyectos');
        const proyectosActivo = proyectos?.classList.contains('active');
        // En página de proyectos o si la sección proyectos está activa
        if (document.body.classList.contains('proyectos-page') || proyectosActivo) {
          // Usar contenedor interno sólo en escritorio ancho
          $.isProyectosActive = !nowNarrow && !!proyectosActivo;
          // Alternar clase que bloquea scroll global sólo en escritorio
          $.body.classList.toggle('proyectos-active', $.isProyectosActive && !nowNarrow);
          // Recalcular y reactivar overlays/animaciones según modo
          try { Overlays.update && Overlays.update(); } catch {}
          try { if (nowNarrow) { MobileOverlays.init && MobileOverlays.init(); } } catch {}
          // Asegurar footer correcto tras el cambio de modo
          if (!FooterWatch.usingObserver) Scroll.updateFooter();
        }
        $.lastIsNarrow = nowNarrow;
      }
    }, 100)],
    [$.galeriaContainer, 'scroll', () => throttle('galeria', () => { 
      Overlays.update(); 
      // En contenedor interno, si no hay IO, seguir con cálculo manual
      if (!FooterWatch.usingObserver) Scroll.updateFooter();
      // Ocultar/mostrar header según dirección del scroll del contenedor en modo estrecho
      try {
        const indiceMobileVisible = (() => { 
          const im = document.getElementById('indice-mobile'); 
          if (!im) return false; 
          const cs = window.getComputedStyle(im); 
          return cs && cs.display !== 'none'; 
        })();
        if (document.body.classList.contains('proyectos-page') && indiceMobileVisible) {
          const st = $.galeriaContainer?.scrollTop || 0;
          const prev = $.lastHeaderContainerScrollTop || 0;
          const d = st - prev;
          // Umbral pequeño para evitar parpadeo por microajustes
          const threshold = 6;
          if (d > threshold) {
            $.header?.classList.add('hidden');
          } else if (d < -threshold) {
            $.header?.classList.remove('hidden');
          }
          $.lastHeaderContainerScrollTop = st;
        }
      } catch {}
      // Mantener resaltado del índice sincronizado cuando el scroll ocurre en el contenedor
      try { Nav.updateActive && Nav.updateActive(); } catch {}
    })]
  ].forEach(([target, event, handler]) => target?.addEventListener(event, handler, {passive: true}));
  
  // Observer para proyectos
  const proyectos = document.getElementById('proyectos');
  if (proyectos) {
    // Marcar estado de proyectos activo en páginas dedicadas
    $.isProyectosActive = proyectos.classList.contains('active');
    // Si Proyectos ya está activo al cargar (página dedicada), iniciar módulos necesarios
    if ($.isProyectosActive) {
      // En móviles dentro de la página dedicada de proyectos queremos scroll global del documento
      // y no el patrón de contenedor interno: desactivar flag para usar cálculo por ventana.
      if (document.body.classList.contains('proyectos-page') && window.innerWidth <= 1024) {
        $.isProyectosActive = false;
      }
      try {
        Videos.init && Videos.init();
      } catch {}
      try {
        Thumbnails.start && Thumbnails.start();
      } catch {}
      // Inicializar efectos interactivos (hover/parallax) en overlays/stands/rollos/carteles
      try {
        Effects.setup && Effects.setup();
      } catch {}
      // Asegurar que los overlays queden visibles y con hover activo al cargar esta página dedicada
      try {
        Overlays.update && Overlays.update();
      } catch {}
      // Activar hover/parallax en overlays "normales" (no-stand, no-botella, no-rollo)
      try {
        setupNormalOverlays && setupNormalOverlays();
      } catch {}
      try {
        if (window.innerWidth <= 1024 && MobileThumbnails.start) {
          MobileThumbnails.start();
        }
      } catch {}
    }
    new MutationObserver(mutations => {
      if (mutations.some(m => m.type === 'attributes' && m.attributeName === 'class' && 
                         proyectos.classList.contains('active'))) {
        setTimeout(() => { 
          Videos.init(); 
          Thumbnails.start(); 
          try { if (window.innerWidth <= 1024) { MobileThumbnails.start && MobileThumbnails.start(); } } catch {}
        }, 100);
        $.isProyectosActive = true;
      } else if (mutations.some(m => m.type === 'attributes' && m.attributeName === 'class' && 
                          !proyectos.classList.contains('active'))) {
        Thumbnails.stop();
        try { MobileThumbnails.stop && MobileThumbnails.stop(); } catch {}
        $.isProyectosActive = false;
      }
    }).observe(proyectos, {attributes: true, attributeFilter: ['class']});
  }
  
  // Iniciar carrusel si el menú está activo
  requestAnimationFrame(() => {
    if (document.getElementById('menu')?.classList.contains('active')) {
      Carousel.start();
    }
  });
  
  // Inicializar menú hamburguesa
  MobileMenu.init();
  
  // Asegurar que el footer empiece oculto
  Scroll.hideFooter();
  
  // Verificar footer en la carga inicial después de un breve delay
  setTimeout(() => { if (!FooterWatch.usingObserver) Scroll.updateFooter(); }, 300);
  // Marcar índice activo tras la carga inicial
  try { setTimeout(() => Nav.updateActive && Nav.updateActive(), 200); } catch {}

  // Soporte de deeplinks: si hay hash #pN, hacer scroll al elemento en la galería
  try {
    const hash = (location.hash || '').replace('#','');
    if (hash && /^p\d+$/.test(hash)) {
      const target = document.getElementById(hash);
      if (target) {
        if ($.isNarrow) {
          target.scrollIntoView({ block: 'start', behavior: 'auto' });
          Nav.updateActive((window.scrollY || 0) + (window.innerHeight || document.documentElement.clientHeight) / 4);
        } else if ($.galeriaContainer) {
          $.galeriaContainer.scrollTo({ top: target.offsetTop, behavior: 'auto' });
          Nav.updateActive(target.offsetTop);
        }
      }
    }
  } catch {}

  // Reflejar idioma almacenado en el botón de idioma del header
  try {
    const stored = (localStorage.getItem('idioma') || 'es').toUpperCase();
    const btn = document.getElementById('idioma-btn');
    if (btn) btn.textContent = stored;
  } catch {}
};

// Ejecutar una sola vez en cuanto el DOM esté listo
window.addEventListener('DOMContentLoaded', init, {once: true});

// ===== ACCESIBILIDAD Y CARGA DIFERIDA =====
function enhanceA11y() {
  // Nav principal: hacer focusable y activable por teclado sin cambiar HTML
  const navLinks = document.querySelectorAll('header nav a');
  navLinks.forEach(a => {
    a.setAttribute('role', 'button');
    a.setAttribute('tabindex', '0');
    const labelSpan = a.querySelector('span');
    if (labelSpan) {
      const lang = localStorage.getItem('idioma') || 'es';
      const lbl = labelSpan.getAttribute(`data-${lang}`) || '';
      if (lbl) a.setAttribute('aria-label', lbl);
    }
    a.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); a.click(); }
    });
  });
}

function lazyMedia() {
  // Imágenes de la galería: lazy + decoding async
  document.querySelectorAll('#galeria img').forEach(img => {
    try {
      img.loading = 'lazy';
      img.decoding = 'async';
    } catch {}
  });
  // Carousel: solo decoding async para mantener experiencia inmediata
  document.querySelectorAll('.carousel img').forEach(img => {
    try { img.decoding = 'async'; } catch {}
  });
}

// Ejecutar mejoras progresivas tras carga completa para no bloquear interacción inicial
window.addEventListener('load', () => {
  try { enhanceImagesAttributes(); } catch {}
  try { lazyMedia(); } catch {}
  try { enhanceA11y(); } catch {}
});
