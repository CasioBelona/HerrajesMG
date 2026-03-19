(function(){
  function normalize(text){
    return (text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  }

  let productsDataPromise = null;

  function getProductsDataSrc(){
    const siteScript = Array.from(document.scripts).find((script) => /(?:^|\/)assets\/js\/site\.js(?:\?.*)?$/.test(script.getAttribute('src') || ''));
    if(!siteScript || !siteScript.src){ return null; }
    return new URL('products-data.js', siteScript.src).href;
  }

  function ensureProductsData(){
    if(Array.isArray(window.HMG_PRODUCTS)){ return Promise.resolve(window.HMG_PRODUCTS); }
    if(productsDataPromise){ return productsDataPromise; }

    const src = getProductsDataSrc();
    if(!src){
      productsDataPromise = Promise.resolve([]);
      return productsDataPromise;
    }

    productsDataPromise = new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve(Array.isArray(window.HMG_PRODUCTS) ? window.HMG_PRODUCTS : []);
      script.onerror = () => resolve([]);
      document.body.appendChild(script);
    });

    return productsDataPromise;
  }

  function buildSuggestions(container, query, data){
    const q = normalize(query).trim();
    if(!container){ return; }
    if(!q){
      container.hidden = true;
      container.innerHTML = '';
      return;
    }

    const matches = (data || []).filter((item) => {
      const hay = normalize(item.name + ' ' + item.groupLabel + ' ' + item.subcategoryFull);
      return hay.includes(q);
    }).slice(0,8);

    if(!matches.length){
      container.hidden = true;
      container.innerHTML = '';
      return;
    }

    container.innerHTML = matches.map((item) => {
      const href = item.detailUrlRoot || item.rootDetailUrl;
      return '<a href="' + href + '"><strong>' + item.name + '</strong><span>' + [item.groupLabel, item.subcategoryFull].filter(Boolean).join(' · ') + '</span></a>';
    }).join('');
    container.hidden = false;
  }

  document.querySelectorAll('[data-search-box]').forEach((box) => {
    const input = box.querySelector('.product-search-input');
    const suggestions = box.querySelector('.search-suggestions');
    const form = box.querySelector('form');
    if(!input || !form){ return; }

    const refreshSuggestions = () => {
      const query = input.value;
      if(!query.trim()){
        buildSuggestions(suggestions, '', []);
        return;
      }
      ensureProductsData().then((data) => {
        if(input.value !== query){ return; }
        buildSuggestions(suggestions, query, data);
      });
    };

    input.addEventListener('input', refreshSuggestions);
    input.addEventListener('focus', refreshSuggestions);
    document.addEventListener('click', (event) => {
      if(!box.contains(event.target) && suggestions){ suggestions.hidden = true; }
    });

    form.addEventListener('submit', async (event) => {
      const q = input.value.trim();
      if(!q){ return; }
      event.preventDefault();
      const data = await ensureProductsData();
      const exact = data.find((item) => normalize(item.name) === normalize(q));
      if(exact){
        window.location.href = exact.detailUrlRoot || exact.rootDetailUrl;
        return;
      }
      HTMLFormElement.prototype.submit.call(form);
    });
  });

  const searchPage = document.querySelector('[data-search-page]');
  if(searchPage){
    const input = document.getElementById('catalogSearchInput');
    const grid = document.getElementById('catalogGrid');
    const cards = Array.from(grid ? grid.children : []);
    const count = document.getElementById('catalogResultCount');
    const empty = document.getElementById('catalogEmpty');
    const suggestions = searchPage.querySelector('.page-suggestions');
    const form = searchPage.querySelector('.catalog-search-form');
    const params = new URLSearchParams(window.location.search);

    if(input && params.get('q')){ input.value = params.get('q'); }

    const filterCards = () => {
      if(!input){ return; }
      const q = normalize(input.value).trim();
      let visible = 0;

      cards.forEach((card) => {
        const hay = normalize((card.dataset.name || '') + ' ' + (card.dataset.group || '') + ' ' + (card.dataset.subcategory || ''));
        const show = !q || hay.includes(q);
        card.hidden = !show;
        if(show){ visible++; }
      });

      if(count){
        count.textContent = q ? 'Mostrando ' + visible + ' coincidencias para "' + input.value + '".' : 'Mostrando ' + cards.length + ' productos del catálogo.';
      }
      if(empty){ empty.hidden = visible !== 0; }

      if(q){
        ensureProductsData().then((data) => {
          if(!input || normalize(input.value).trim() !== q){ return; }
          buildSuggestions(suggestions, input.value, data);
        });
      } else {
        buildSuggestions(suggestions, '', []);
      }
    };

    if(input){
      input.addEventListener('input', filterCards);
      input.addEventListener('focus', filterCards);
    }

    if(form){
      form.addEventListener('submit', async (event) => {
        if(!input){ return; }
        const q = input.value.trim();
        if(!q){
          filterCards();
          return;
        }
        event.preventDefault();
        const data = await ensureProductsData();
        const exact = data.find((item) => normalize(item.name) === normalize(q));
        if(exact){
          window.location.href = exact.detailUrlRoot || exact.rootDetailUrl;
        } else {
          filterCards();
        }
      });
    }

    document.addEventListener('click', (event) => {
      if(!searchPage.contains(event.target) && suggestions){ suggestions.hidden = true; }
    });

    filterCards();
  }
})();

(function(){
  function isMobile(){
    return window.matchMedia('(max-width: 768px)').matches;
  }

  document.addEventListener('DOMContentLoaded', function(){
    const headerInner = document.querySelector('.header-inner');
    const nav = document.querySelector('.nav');
    if(!headerInner || !nav){ return; }

    let toggle = headerInner.querySelector('.mobile-nav-toggle');
    if(!toggle){
      toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'mobile-nav-toggle';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Abrir menú');
      toggle.innerHTML = '<svg class="icon-menu" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></svg><svg class="icon-close" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.3 5.71 12 12l6.3 6.29-1.41 1.41L10.59 13.41 4.29 19.7 2.88 18.29 9.17 12 2.88 5.71 4.29 4.3l6.3 6.29 6.29-6.3z"/></svg>';
      headerInner.insertBefore(toggle, nav);
    }

    const productos = nav.querySelector('.nav-productos');
    const productsLink = productos ? productos.querySelector('.nav-link') : null;
    const mobileSections = productos ? Array.from(productos.querySelectorAll('.mega-col')) : [];

    function setMobileSectionExpanded(section, expanded){
      const link = section.querySelector('h4 a');
      const toggle = section.querySelector('.mobile-section-toggle');
      if(link){ link.setAttribute('aria-expanded', expanded ? 'true' : 'false'); }
      if(toggle){
        toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        const sectionLabel = (link ? link.textContent : '').trim();
        toggle.setAttribute('aria-label', (expanded ? 'Contraer' : 'Expandir') + (sectionLabel ? ' ' + sectionLabel : ' categoría'));
      }
    }

    function collapseMobileSections(){
      mobileSections.forEach((section) => {
        section.classList.remove('mobile-section-open');
        setMobileSectionExpanded(section, false);
      });
    }

    mobileSections.forEach((section) => {
      const heading = section.querySelector('h4');
      const link = heading ? heading.querySelector('a') : null;
      if(!heading || !link){ return; }

      let toggleButton = heading.querySelector('.mobile-section-toggle');
      if(!toggleButton){
        toggleButton = document.createElement('button');
        toggleButton.type = 'button';
        toggleButton.className = 'mobile-section-toggle';
        heading.appendChild(toggleButton);
      }

      setMobileSectionExpanded(section, false);

      toggleButton.addEventListener('click', function(event){
        if(!isMobile()){ return; }
        event.preventDefault();
        event.stopPropagation();
        const isOpen = section.classList.contains('mobile-section-open');
        if(isOpen){
          section.classList.remove('mobile-section-open');
          setMobileSectionExpanded(section, false);
          return;
        }
        collapseMobileSections();
        section.classList.add('mobile-section-open');
        setMobileSectionExpanded(section, true);
      });
    });

    function setNavOpen(open){
      document.body.classList.toggle('mobile-nav-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      if(!open && productos){
        productos.classList.remove('menu-open');
        collapseMobileSections();
      }
    }

    function toggleProductsMenu(force){
      if(!productos){ return; }
      const open = typeof force === 'boolean' ? force : !productos.classList.contains('menu-open');
      productos.classList.toggle('menu-open', open);
      if(!open){ collapseMobileSections(); }
    }

    toggle.addEventListener('click', function(){
      if(!isMobile()){ return; }
      setNavOpen(!document.body.classList.contains('mobile-nav-open'));
    });

    if(productsLink){
      productsLink.addEventListener('click', function(event){
        if(!isMobile()){ return; }
        if(!document.body.classList.contains('mobile-nav-open')){
          event.preventDefault();
          setNavOpen(true);
          toggleProductsMenu(true);
          return;
        }
        if(!productos.classList.contains('menu-open')){
          event.preventDefault();
          toggleProductsMenu(true);
        }
      });
    }

    nav.querySelectorAll('a').forEach(function(link){
      link.addEventListener('click', function(){
        if(!isMobile()){ return; }
        const isProductsLink = productsLink && link === productsLink;
        const isSectionHeading = link.closest('.mega-col h4');
        if(!isProductsLink && !isSectionHeading){ setNavOpen(false); }
      });
    });

    document.addEventListener('click', function(event){
      if(!isMobile()){ return; }
      if(!headerInner.contains(event.target)){
        setNavOpen(false);
      }
    });

    document.addEventListener('keydown', function(event){
      if(event.key === 'Escape'){ setNavOpen(false); }
    });

    window.addEventListener('resize', function(){
      if(!isMobile()){
        setNavOpen(false);
        collapseMobileSections();
      }
    });
  });
})();
