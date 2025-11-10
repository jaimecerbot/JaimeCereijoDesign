// ===== MENÚ HAMBURGUESA =====
const MobileMenu = {
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
  get headerHeight() { return window.innerWidth <= 768 ? 60 : 70; },
  get isMobile() { return window.innerWidth <= 768; },
  isProyectosActive: false, lastScrollTop: 0, bottleEffectTriggered: false,
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
    const margin = $.isMobile ? 0 : $.headerHeight;
    $.main.style.marginTop = `${margin}px`;
    // Ajustar el índice solo en escritorio; en móvil lo gobierna el CSS (top: 60px)
    if (!$.isMobile && $.indice) {
      $.indice.style.top = `${margin}px`;
    } else if ($.isMobile && $.indice) {
      // Limpiar override inline para respetar CSS responsive
      $.indice.style.top = '';
    }
  }
};

const TopNav = {
  init() {
    const links = document.querySelectorAll('header nav a[data-section]');
    links.forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        const id = a.getAttribute('data-section');
        if (id) mostrarSeccion(id);
      });
      a.setAttribute('role', 'button');
      a.setAttribute('tabindex', '0');
      a.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); a.click(); } });
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
      if (Math.abs(delta) > 5) {
        const hide = delta > 0 && window.scrollY > 100;
        $.header?.classList.toggle('hidden', hide);
        this.updateLayout();
        $.lastScrollY = window.scrollY;
      }
      this.updateFooter();
    });
  },
  updateLayout() {
    const visible = !$.header?.classList.contains('hidden');
    // En móvil no empujar: header es relativo
    const top = $.isMobile ? 0 : (visible ? $.headerHeight : 0);
    if ($.main) $.main.style.marginTop = `${top}px`;
    if (!$.isMobile && $.indice) {
      $.indice.style.top = `${top}px`;
    } else if ($.isMobile && $.indice) {
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
  init() {
    this.links = document.querySelectorAll("#indice a");

    // Tomar el orden real de los elementos dentro del contenedor #galeria
    // (incluye .image-wrap, videos o imgs sueltos). Esto nos permite crear
    // rangos para cada enlace del índice: cada link será activo desde su
    // primera imagen hasta la primera imagen del siguiente link.
    const linkTargets = Array.from(this.links).map(a => a.getAttribute('href').substring(1));
    const galleryNodes = Array.from(document.querySelectorAll('#galeria [id]'))
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

    // Cachear los elementos reales disponibles en la galería
    this.grupos.forEach(g => g.ids.forEach(id => {
      const el = document.getElementById(id);
      el && this.elements.set(id, el);
    }));

    this.links.forEach(link => {
      link.onclick = e => {
        e.preventDefault();
        const target = this.elements.get(link.getAttribute("href").substring(1));
        target && $.galeriaContainer?.scrollTo({top: target.offsetTop, behavior: "smooth"});
      };
    });
  },
  updateActive(scrollPos) {
    let active = null;

    for (const g of this.grupos) {
      // Buscar primer y último elemento válido del grupo
      const firstEl = g.ids.map(id => this.elements.get(id)).find(Boolean);
      const lastEl = [...g.ids].reverse().map(id => this.elements.get(id)).find(Boolean);
      if (!firstEl || !lastEl) continue;
      const start = firstEl.offsetTop;
      const end = lastEl.offsetTop + lastEl.offsetHeight;
      if (scrollPos >= start && scrollPos < end) {
        active = g.link;
        break;
      }
    }

    // Si no hay ninguno activo y estamos más abajo que el inicio del último
    // grupo, marcar el último (útil al llegar al final de la galería).
    if (!active && this.grupos.length) {
      const lastGroup = this.grupos[this.grupos.length - 1];
      const lastEl = [...lastGroup.ids].reverse().map(id => this.elements.get(id)).find(Boolean);
      if (lastEl && scrollPos >= lastEl.offsetTop) active = lastGroup.link;
    }

    if (this.activeGroup !== active) {
      this.links.forEach(l => l.classList.remove("active"));
      active && document.querySelector(`#indice a[href='${active}']`)?.classList.add("active");
      this.activeGroup = active;
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
  $.body.classList.toggle('proyectos-active', $.isProyectosActive && !$.isMobile);
  // Reconfigurar observador del footer para la sección activa
  try { FooterWatch.attachToCurrentSection(); } catch {}
  
  // Manejo del carrusel (footer se controla globalmente por scroll)
  if (id === 'menu') {
    setTimeout(() => Carousel.start(), 500);
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
  mostrarSeccion('proyectos');
  setTimeout(() => {
    let target = null;
    if (typeof targetRef === 'string') {
      // Ir a la sección (image-wrap) con id concreto, p.ej. 'p3', 'p7'
      target = document.getElementById(targetRef);
    } else {
      // Compatibilidad con índices antiguos
      target = $.galeria?.querySelectorAll('img, video')[targetRef];
    }
    target && $.galeriaContainer?.scrollTo({top: target.offsetTop, behavior: "smooth"});
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
      btn.textContent = lang.toUpperCase();
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
    
    this.change(localStorage.getItem('idioma') || 'es');
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
  container: null, updatePending: false, elements: new Map(), cache: new Map(),
  cascadeTimers: new Map(),
  init() {
    this.container = $.galeriaContainer;
    if (!this.container) return;
    
    // Cache elementos al inicio
    document.querySelectorAll('.image-wrap').forEach(wrap => {
      const base = wrap.querySelector('.base');
      if (base) {
        this.elements.set(wrap.id, {
          wrap, base,
          overlays: Array.from(wrap.querySelectorAll('.overlay:not([data-stand]):not(.overlay-botella), .overlay2:not(.overlay-rollo)')),
          stands: wrap.querySelectorAll('.overlay[data-stand="true"]'),
          rollos: wrap.querySelectorAll('.overlay-rollo')
        });
      }
    });
    
    this.container.addEventListener('scroll', () => throttle('overlay', () => this.update()), {passive: true});
    window.addEventListener('resize', () => throttle('overlay-resize', () => this.update()), {passive: true});
  },
  
  getViewportInfo(img) {
    const key = `${img.id}-${$.galeriaContainer.scrollTop}`;
    if (this.cache.has(key)) return this.cache.get(key);
    
    const rect = img.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();
    const visibleHeight = Math.max(0, Math.min(rect.bottom, containerRect.bottom) - Math.max(rect.top, containerRect.top));
    const imgCenter = rect.top + rect.height / 2;
    const containerCenter = containerRect.top + containerRect.height / 2;
    
    const info = {
      visible: (visibleHeight / rect.height) >= 0.6,
      centered: Math.abs(imgCenter - containerCenter) <= containerRect.height * 0.3,
      outOfView: rect.bottom <= containerRect.top || rect.top >= containerRect.bottom
    };
    
    // Limpiar cache viejo
    this.cache.size > 20 && this.cache.clear();
    this.cache.set(key, info);
    return info;
  },
  
  update() {
    if (!$.isProyectosActive || this.updatePending) return;
    this.updatePending = true;
    
    requestAnimationFrame(() => {
      this.elements.forEach(({wrap, base, overlays, stands, rollos}) => {
        const info = this.getViewportInfo(base);
        
          // -- Overlays: normal single overlay or multiple overlays (cascade for those that share base)
          // Excluir explicitamente la galería p9 (Zona Zombi) para que sus carteles/sombras
          // no reciban efectos de llegada/salida adicionales desde este flujo. p9 usa su
          // propio mecanismo de aparición controlado en Effects.setupCartels().
          if (wrap && wrap.id === 'p9') {
            // Skip overlays handling for p9 entirely
          } else if (overlays && overlays.length) {
            if (info.visible) {
              // if multiple overlays in same wrap, cascade them only when first not already visible
              if (overlays.length > 1) {
                if (!overlays[0].classList.contains('visible')) {
                  // clear any previous cascade timers
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
              // not visible -> remove classes and clear timers
              overlays.forEach(o => o.classList.remove('visible'));
              const prev = this.cascadeTimers.get(wrap.id);
              if (prev) { prev.forEach(t => clearTimeout(t)); this.cascadeTimers.delete(wrap.id); }
            }
          }

        this.processStands(stands, info);
        this.processRollos(rollos, info);
      });
      
      Nav.updateActive($.galeriaContainer.scrollTop + $.galeriaContainer.clientHeight / 4);
      !$.bottleEffectTriggered && Bottles.checkTrigger();
      this.updatePending = false;
    });
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
    ['stands', 'bottles', 'rollos', 'cartels'].forEach((type, i) => 
      debounce(`setup-${type}`, () => this[`setup${type.charAt(0).toUpperCase() + type.slice(1)}`](), 100 + i * 50));
  },
  
  setupStands() {
    document.querySelectorAll('[data-stand="true"]').forEach(stand => {
      if (this.handlers.has(stand)) return;
      
      Object.assign(stand.style, {position: 'absolute', pointerEvents: 'auto', cursor: 'default'});
      
      let hovering = false, isHovering = false;
      const isOpaque = (x, y) => {
        const rect = stand.getBoundingClientRect();
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
          const rect = stand.getBoundingClientRect();
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
          const rect = rollo.getBoundingClientRect();
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
    
    const onMouseMove = e => {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => {
        const rect = container.getBoundingClientRect();
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
        const popupPath = `assets/Secciones/Proyectos/Zombis/Carteles_PopUp/cartel${id}.png`;
        try { window.open(popupPath, '_blank', 'noopener'); } catch (e) { window.location.href = popupPath; }
        // Tras abrir el popup, desactivar la overlay/sombra y quitar el foco del área
        try { onLeave(); } catch (ignore) {}
        try { area.blur(); } catch (ignore) {}
      });
      // Teclado: Enter / Space abren el popup y también desactivan la overlay/sombra
      area.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const popupPath = `assets/Secciones/Proyectos/Zombis/Carteles_PopUp/cartel${id}.png`;
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

    container.setAttribute('data-cartels-configured', 'true');
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
      img.src = `assets/Secciones/Proyectos/Thumbnails/${g}.${i}.png`;
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
      const newSrc = `assets/Secciones/Proyectos/Thumbnails/${group}.${idx+1}.png`;
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
  firstSeqContainerIndex: null,
  lastSeqContainerIndex: null,
  bufferAfterLastIndex: null,
  pendingSnap: false,
  onTransitionEnd: null,

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
    this.container.style.transition = `transform ${this.animationDuration}ms ease-in-out`;

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
      }
    };
    this.container.addEventListener('transitionend', this.onTransitionEnd);
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

    if (immediate) {
      const prev = this.container.style.transition;
      this.container.style.transition = 'none';
      this.container.style.transform = `translateX(${translateX}px)`;
      // Forzar reflow y restaurar transición
      this.container.offsetHeight;
      this.container.style.transition = prev || `transform ${this.animationDuration}ms ease-in-out`;
    } else {
      this.container.style.transform = `translateX(${translateX}px)`;
    }
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
  }
};

// ===== MINI CARRUSEL EN "DESARROLLO WEB" (ESPEJO EN TIEMPO REAL) =====
const WebdevMini = {
  host: null,
  scaleWrap: null,
  clone: null,
  main: null,
  mo: null,
  created: false,
  snapping: false,
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
      // Alinear primero la transición y luego el transform para evitar animaciones indebidas
      this.copyTransition();
      this.copyTransform();
      this.updateScale();
      return;
    }
    this.createClone();
    this.observeMain();
    this.updateScale();
    // Inicial: copiar transición antes que transform
    this.copyTransition();
    this.copyTransform();
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
  observeMain() {
    if (this.mo) return;
    this.mo = new MutationObserver(entries => {
      for (const e of entries) {
        if (e.type === 'attributes' && e.attributeName === 'style') {
          // Al cambiar estilos en el carrusel principal (transform o transition),
          // sincronizar SIEMPRE transición antes que transform para que el mini
          // desactive la animación durante el teletransporte y no se vea el movimiento
          // Si estamos en medio de un snap forzado, evitamos re-aplicar con transición
          if (this.snapping) return;
          this.copyTransition();
          this.copyTransform();
        }
      }
    });
    this.mo.observe(this.main, {attributes: true, attributeFilter: ['style']});

    // En cada fin de transición del carrusel grande, el propio carrusel puede teletransportar.
    // Forzamos el snap del mini: desactivar transición -> copiar transform -> reactivar transición.
    const onMainTransitionEnd = () => {
      try { this.snapNow(); } catch {}
    };
    this.main.addEventListener('transitionend', onMainTransitionEnd);
  },
  copyTransform() {
    if (!this.clone || !this.main) return;
    // Reflejar el translateX exacto del carrusel principal
    this.clone.style.transform = this.main.style.transform || '';
  },
  copyTransition() {
    if (!this.clone || !this.main) return;
    try {
      // Usar el estilo computado para capturar tanto 'none' (snap) como el easing completo
      const t = getComputedStyle(this.main).transition || '';
      // Normalizar valores que equivalen a 'sin transición'
      if (!t || /none/.test(t) || /\b0s\b/.test(t)) {
        this.clone.style.transition = 'none';
      } else {
        this.clone.style.transition = t;
      }
    } catch {}
  },
  snapNow() {
    if (!this.clone || !this.main) return;
    this.snapping = true;
    // Desactivar cualquier transición para que el cambio de transform sea instantáneo
    const prev = this.clone.style.transition;
    this.clone.style.transition = 'none';
    // Copiar la posición final exacta del principal
    this.clone.style.transform = this.main.style.transform || '';
    // Forzar reflow para aplicar el cambio inmediatamente sin animación
    // eslint-disable-next-line no-unused-expressions
    this.clone.offsetHeight;
    // Restaurar la transición a la del principal para próximos movimientos
    this.copyTransition();
    // Pequeña ventana para ignorar mutaciones coalescidas del mismo tick
    setTimeout(() => { this.snapping = false; }, 0);
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
    es: 'En toda Valencia no encontrarás un diseñador con un perfil más completo. El abanico de servicios que ofrezco, todos ellos ejemplificados en mi galería de proyectos, cubre cualquier necesidad que pueda surgir durante el desarrollo de una campaña gráfica. Diseño, desarrollo web, edición de vídeo, gráficos móviles… Sea cual sea tu proyecto, yo puedo darle cara mejor que nadie.',
    en: 'Hover over a service to see a description.'
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
      'service-1': 'Graphic design: visual identities, posters, layout, and promotional pieces.',
      'service-2': 'Web development: modern, fast websites—from landing pages to interactive portfolios.',
      'service-3': 'Video editing: cuts, color, titles, and integrated graphics for social and promos.',
      'service-4': 'Motion graphics: animations that enhance your message across digital platforms.',
      'service-5': 'Project comms: boards, decks, and clear, persuasive visual materials.',
      'service-6': 'Illustration: versatile styles for editorial, social media, and commercial work.'
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
    this.textEl.setAttribute('data-es', es);
    this.textEl.setAttribute('data-en', en);
    
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
            // Activar overlay de texto (si existe)
            const textOverlay = wrap.querySelector('.mobile-text-overlay');
            if (textOverlay && !textOverlay.classList.contains('visible')) {
              setTimeout(() => textOverlay.classList.add('visible'), 300);
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
  }
};

// ===== ROLLO MÓVIL DESLIZABLE (p12) =====
const MobileRollo = {
  wrap: null,
  img: null,
  isDragging: false,
  startX: 0,
  currentX: 0,
  initialized: false,
  mouseMoveHandler: null,
  mouseUpHandler: null,
  init() {
    if (this.initialized) return;
    this.wrap = document.querySelector('#p12');
    if (!this.wrap) return;
    this.img = this.wrap.querySelector('.mobile-rollo-scroll');
    if (!this.img) return;

    // Touch events en el wrap y la imagen
    const handleTouchStart = (e) => {
      this.handleStart(e.touches[0].clientX);
    };
    const handleTouchMove = (e) => {
      if (this.isDragging) {
        e.preventDefault(); // Evitar scroll vertical mientras se arrastra
        this.handleMove(e.touches[0].clientX);
      }
    };
    const handleTouchEnd = () => this.handleEnd();

    this.wrap.addEventListener('touchstart', handleTouchStart, {passive: true});
    this.wrap.addEventListener('touchmove', handleTouchMove, {passive: false});
    this.wrap.addEventListener('touchend', handleTouchEnd);

    // Mouse events en el wrap (para pruebas en desktop/ventanas estrechas)
    this.wrap.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.handleStart(e.clientX);
    });
    
    // Los eventos mousemove y mouseup deben estar en document para capturar el arrastre
    // incluso cuando el cursor sale del wrap - usar referencias para poder limpiar
    this.mouseMoveHandler = (e) => {
      if (this.isDragging) {
        e.preventDefault();
        this.handleMove(e.clientX);
      }
    };
    this.mouseUpHandler = () => {
      if (this.isDragging) this.handleEnd();
    };
    
    document.addEventListener('mousemove', this.mouseMoveHandler);
    document.addEventListener('mouseup', this.mouseUpHandler);
    
    this.initialized = true;
  },
  handleStart(x) {
    this.isDragging = true;
    this.startX = x - this.currentX;
  },
  handleMove(x) {
    if (!this.isDragging || !this.img) return;
    const deltaX = x - this.startX;
    // Limitar el rango: desde 0 (inicio) hasta -200% (2/3 fuera de pantalla a la izquierda)
    const maxOffset = -(this.img.offsetWidth * 2 / 3);
    this.currentX = Math.max(maxOffset, Math.min(0, deltaX));
    this.img.style.transform = `translateX(${this.currentX}px)`;
  },
  handleEnd() {
    this.isDragging = false;
  },
  destroy() {
    if (this.mouseMoveHandler) {
      document.removeEventListener('mousemove', this.mouseMoveHandler);
    }
    if (this.mouseUpHandler) {
      document.removeEventListener('mouseup', this.mouseUpHandler);
    }
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
        im.src = `assets/Secciones/Proyectos/Thumbnails/movil/${g}.${i}.png`;
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
    
    this.imgs.forEach((img, idx) => {
      const newSrc = `assets/Secciones/Proyectos/Thumbnails/movil/${g}.${idx+1}.png`;
      if (img.getAttribute('src') === newSrc) return; // nada que cambiar
      
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
    
    this.group = g;
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
  }
};

// ===== INICIALIZACIÓN OPTIMIZADA =====
const init = () => {
  if ($.initialized) return; // prevent double init
  $.initialized = true;
  [Layout, Nav, Overlays, Lang, Intro, Carousel, WebdevMini, ServicesDesc, MobileOverlays].forEach(comp => comp.init());
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
    verBtn && verBtn.addEventListener('click', (e) => { e.preventDefault(); mostrarSeccion('proyectos'); });
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
    [window, 'resize', () => debounce('resize', () => { 
      Layout.update(); 
      Scroll.syncFooterVar();
      try { FooterWatch.attachToCurrentSection(); } catch {}
      // Verificar footer también en resize (fallback si no hay IO)
      if (!FooterWatch.usingObserver) Scroll.updateFooter();
    }, 100)],
    [$.galeriaContainer, 'scroll', () => throttle('galeria', () => { 
      Overlays.update(); 
      // En contenedor interno, si no hay IO, seguir con cálculo manual
      if (!FooterWatch.usingObserver) Scroll.updateFooter(); 
    })]
  ].forEach(([target, event, handler]) => target?.addEventListener(event, handler, {passive: true}));
  
  // Observer para proyectos
  const proyectos = document.getElementById('proyectos');
  if (proyectos) {
    new MutationObserver(mutations => {
      if (mutations.some(m => m.type === 'attributes' && m.attributeName === 'class' && 
                         proyectos.classList.contains('active'))) {
        setTimeout(() => { 
          Videos.init(); 
          Thumbnails.start(); 
          try { if (window.innerWidth <= 1024) { MobileThumbnails.start && MobileThumbnails.start(); } } catch {}
        }, 100);
      } else if (mutations.some(m => m.type === 'attributes' && m.attributeName === 'class' && 
                          !proyectos.classList.contains('active'))) {
        Thumbnails.stop();
        try { MobileThumbnails.stop && MobileThumbnails.stop(); } catch {}
      }
    }).observe(proyectos, {attributes: true, attributeFilter: ['class']});
  }
  
  // Iniciar carrusel si el menú está activo
  setTimeout(() => {
    if (document.getElementById('menu')?.classList.contains('active')) {
      Carousel.start();
    }
  }, 1000);
  
  // Inicializar menú hamburguesa
  MobileMenu.init();
  
  // Asegurar que el footer empiece oculto
  Scroll.hideFooter();
  
  // Verificar footer en la carga inicial después de un breve delay
  setTimeout(() => { if (!FooterWatch.usingObserver) Scroll.updateFooter(); }, 300);
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
