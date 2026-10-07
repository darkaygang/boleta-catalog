/**
 * BOLETA CLOTHING — OFFICIAL APPLICATION LOGIC
 * High-performance editorial showcase, drag-and-drop order drawer,
 * WhatsApp checkout, In-Browser Live Editor, Drag-to-Merge, photo upload & SQLite API.
 */

(function () {
  'use strict';

  // Configuración de contactos y reglas de encargo
  const CONFIG = {
    whatsappPhone: "584245314215", // Teléfono oficial para pedidos de items (B2C)
    b2bPhone: "573215885381",      // Teléfono oficial para desarrollo web (B2B)
    initialDepositPercent: 50
  };

  // Helper de normalización para búsqueda insensible a acentos/tildes y mayúsculas
  function normalizeStr(str) {
    if (!str) return '';
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  // Estado global de la aplicación
  const state = {
    products: [],
    filteredProducts: [],
    activeCategory: 'TODOS',
    searchQuery: '',
    sortBy: 'featured',
    cart: [], // Array de { id, size, quantity }
    activeModalProduct: null,
    activeModalImgIndex: 0,
    selectedModalSize: null,
    selectedModalColor: 'Blanco',

    // Estado del Modo Editor
    isEditorMode: false,
    discardedIds: new Set(),
    editingProductId: null,
    mergePending: null, // { sourceId, targetId }
    selectedNewProductFiles: []
  };

  // Referencias a elementos del DOM
  const dom = {
    productGrid: document.getElementById('productGrid'),
    productCount: document.getElementById('productCount'),
    categoryTabs: document.getElementById('categoryTabs'),
    searchInput: document.getElementById('searchInput'),
    searchClear: document.getElementById('searchClear'),
    sortSelect: document.getElementById('sortSelect'),
    headerSearchBtn: document.getElementById('headerSearchBtn'),
    navToggle: document.getElementById('navToggle'),
    siteNav: document.getElementById('siteNav'),

    // Carrito / Mi Pedido
    headerCartBtn: document.getElementById('headerCartBtn'),
    floatingCartBtn: document.getElementById('floatingCartBtn'),
    cartCountBadge: document.getElementById('cartCountBadge'),
    floatingCartCount: document.getElementById('floatingCartCount'),
    drawerCount: document.getElementById('drawerCount'),
    cartDrawer: document.getElementById('cartDrawer'),
    cartDrawerOverlay: document.getElementById('cartDrawerOverlay'),
    cartDrawerClose: document.getElementById('cartDrawerClose'),
    cartDrawerBody: document.getElementById('cartDrawerBody'),
    cartTotalUsd: document.getElementById('cartTotalUsd'),
    cartTotalBcv: document.getElementById('cartTotalBcv'),
    cartDepositUsd: document.getElementById('cartDepositUsd'),
    cartDepositBcv: document.getElementById('cartDepositBcv'),
    cartRemainingUsd: document.getElementById('cartRemainingUsd'),
    cartRemainingBcv: document.getElementById('cartRemainingBcv'),
    checkoutBtn: document.getElementById('checkoutBtn'),

    // Quick View Modal
    productModal: document.getElementById('productModal'),
    modalCloseBtn: document.getElementById('modalCloseBtn'),
    modalThumbs: document.getElementById('modalThumbs'),
    modalImage: document.getElementById('modalImage'),
    modalPrevImg: document.getElementById('modalPrevImg'),
    modalNextImg: document.getElementById('modalNextImg'),
    modalImgCounter: document.getElementById('modalImgCounter'),
    modalTag: document.getElementById('modalTag'),
    modalCode: document.getElementById('modalCode'),
    modalTitle: document.getElementById('modalTitle'),
    modalBrand: document.getElementById('modalBrand'),
    modalCategory: document.getElementById('modalCategory'),
    modalPriceUsd: document.getElementById('modalPriceUsd'),
    modalPriceBcv: document.getElementById('modalPriceBcv'),
    modalDesc: document.getElementById('modalDesc'),
    modalVariantPills: document.getElementById('modalVariantPills'),
    modalColorBlock: document.getElementById('modalColorBlock'),
    modalColorName: document.getElementById('modalColorName'),
    modalColorDots: document.getElementById('modalColorDots'),
    modalMaterial: document.getElementById('modalMaterial'),
    modalAddCartBtn: document.getElementById('modalAddCartBtn'),
    modalWhatsappBtn: document.getElementById('modalWhatsappBtn'),
    toastContainer: document.getElementById('toastContainer'),

    // Toolbar de Modo Editor
    editorToolbar: document.getElementById('editorToolbar'),
    editorStatsBadge: document.getElementById('editorStatsBadge'),
    editorNewItemBtn: document.getElementById('editorNewItemBtn'),
    editorExportBtn: document.getElementById('editorExportBtn'),
    editorResetBtn: document.getElementById('editorResetBtn'),
    editorExitBtn: document.getElementById('editorExitBtn'),
    footerEditorToggle: document.getElementById('footerEditorToggle'),

    // Modal de Edición de Producto
    productEditModal: document.getElementById('productEditModal'),
    editModalCloseBtn: document.getElementById('editModalCloseBtn'),
    productEditForm: document.getElementById('productEditForm'),
    editModalImg: document.getElementById('editModalImg'),
    editModalCode: document.getElementById('editModalCode'),
    editGalleryStrip: document.getElementById('editGalleryStrip'),
    editPhotoDropZone: document.getElementById('editPhotoDropZone'),
    editPhotoInput: document.getElementById('editPhotoInput'),
    editMainPhotoBtn: document.getElementById('editMainPhotoBtn'),
    editMainPhotoInput: document.getElementById('editMainPhotoInput'),
    editFieldPurchased: document.getElementById('editFieldPurchased'),
    editFieldTitle: document.getElementById('editFieldTitle'),
    editFieldCategory: document.getElementById('editFieldCategory'),
    editFieldBrand: document.getElementById('editFieldBrand'),
    editFieldPriceUsd: document.getElementById('editFieldPriceUsd'),
    editFieldPriceBcv: document.getElementById('editFieldPriceBcv'),
    editFieldMaterial: document.getElementById('editFieldMaterial'),
    editFieldSizes: document.getElementById('editFieldSizes'),

    // Modal de Fusión (Drag-to-Merge)
    mergeConfirmModal: document.getElementById('mergeConfirmModal'),
    mergeModalCloseBtn: document.getElementById('mergeModalCloseBtn'),
    mergeCancelBtn: document.getElementById('mergeCancelBtn'),
    mergeConfirmBtn: document.getElementById('mergeConfirmBtn'),
    mergeSourceTitle: document.getElementById('mergeSourceTitle'),
    mergeTargetTitle: document.getElementById('mergeTargetTitle'),
    mergeSourceImg: document.getElementById('mergeSourceImg'),
    mergeTargetImg: document.getElementById('mergeTargetImg'),

    // Modal de Añadir Nuevo Producto
    addProductModal: document.getElementById('addProductModal'),
    addProductCloseBtn: document.getElementById('addProductCloseBtn'),
    addProductForm: document.getElementById('addProductForm'),
    uploadDropZone: document.getElementById('uploadDropZone'),
    newProductFileInput: document.getElementById('newProductFileInput'),
    uploadPlaceholder: document.getElementById('uploadPlaceholder'),
    uploadPreviewBox: document.getElementById('uploadPreviewBox'),
    uploadPreviewStrip: document.getElementById('uploadPreviewStrip'),
    removeUploadImgBtn: document.getElementById('removeUploadImgBtn'),
    newFieldTitle: document.getElementById('newFieldTitle'),
    newFieldCategory: document.getElementById('newFieldCategory'),
    newFieldBrand: document.getElementById('newFieldBrand'),
    newFieldPriceUsd: document.getElementById('newFieldPriceUsd'),
    newFieldPriceBcv: document.getElementById('newFieldPriceBcv'),
    newFieldMaterial: document.getElementById('newFieldMaterial'),
    newFieldSizes: document.getElementById('newFieldSizes'),
    newFieldPurchased: document.getElementById('newFieldPurchased'),
    newProductSubmitBtn: document.getElementById('newProductSubmitBtn')
  };

  // Inicialización
  function init() {
    loadCartFromStorage();
    loadCatalogData();
    setupEventListeners();
    checkInitialEditorState();
  }

  function checkInitialEditorState() {
    if (localStorage.getItem('boleta_editor_active') === '1' || localStorage.getItem('bdv_editor_active') === '1') {
      toggleEditorMode(true);
    }
  }

  // Carga de productos (con soporte de SQLite API, localStorage y fallback estático)
  function loadCatalogData() {
    const savedDiscarded = localStorage.getItem('boleta_discarded_ids') || localStorage.getItem('bdv_discarded_ids');
    if (savedDiscarded) {
      try {
        state.discardedIds = new Set(JSON.parse(savedDiscarded));
      } catch (e) {
        state.discardedIds = new Set();
      }
    }

    // Intentar primero desde el backend FastAPI (/api/products)
    fetch('/api/products')
      .then(res => {
        if (!res.ok) throw new Error('API no disponible');
        return res.json();
      })
      .then(apiProducts => {
        if (Array.isArray(apiProducts) && apiProducts.length > 0) {
          state.products = apiProducts.map(sanitizeProduct);
          applyFilters();
          renderCategoryTabs();
          updateEditorStats();
          return;
        }
        fallbackLoad();
      })
      .catch(() => {
        fallbackLoad();
      });

    function fallbackLoad() {
      const savedCustom = localStorage.getItem('boleta_custom_catalog') || localStorage.getItem('bdv_custom_catalog');
      if (savedCustom) {
        try {
          const parsed = JSON.parse(savedCustom);
          state.products = parsed.map(sanitizeProduct);
          applyFilters();
          renderCategoryTabs();
          updateEditorStats();
          return;
        } catch (e) {
          console.warn("Error parseando catálogo personalizado de localStorage:", e);
        }
      }

      if (window.BOLETA_CATALOG && Array.isArray(window.BOLETA_CATALOG)) {
        state.products = JSON.parse(JSON.stringify(window.BOLETA_CATALOG)).map(sanitizeProduct);
        applyFilters();
        renderCategoryTabs();
        updateEditorStats();
      } else {
        fetch('data/products.json')
          .then(res => res.json())
          .then(data => {
            state.products = data.map(sanitizeProduct);
            applyFilters();
            renderCategoryTabs();
            updateEditorStats();
          })
          .catch(err => {
            console.error("Error al cargar products.json:", err);
          });
      }
    }
  }

  function sanitizeProduct(p) {
    if (!p.gallery) p.gallery = [];
    if (!p.currentImgIndex) p.currentImgIndex = 0;
    if (!p.numeric_usd) {
      const matchUsd = String(p.price_usd || '').match(/(\d+)/);
      p.numeric_usd = matchUsd ? parseInt(matchUsd[1]) : 0;
    }
    if (!p.numeric_bcv) {
      const match = String(p.price_bcv || '').match(/(\d+)/);
      p.numeric_bcv = match ? parseInt(match[1]) : Math.round(p.numeric_usd * 1.15);
    }
    p.is_purchased = Boolean(p.is_purchased);
    return p;
  }

  // Pestañas de categorías dinámicas
  function renderCategoryTabs() {
    if (!dom.categoryTabs) return;

    const categories = ['TODOS', 'Joyería', 'Lentes', 'Shorts', 'Prendas', 'Accesorios', 'Objects'];
    const activeProducts = state.products.filter(p => !state.discardedIds.has(String(p.id)) && p.status !== 'descartado');

    dom.categoryTabs.innerHTML = categories.map(cat => {
      const count = cat === 'TODOS'
        ? activeProducts.length
        : activeProducts.filter(p => normalizeStr(p.category) === normalizeStr(cat)).length;

      const isActive = state.activeCategory === cat ? 'active' : '';
      return `
        <button class="category-chip ${isActive}" data-category="${cat}">
          ${cat} <span class="category-chip-count">(${count})</span>
        </button>
      `;
    }).join('');

    dom.categoryTabs.querySelectorAll('.category-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        state.activeCategory = chip.getAttribute('data-category');
        dom.categoryTabs.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        applyFilters();
      });
    });
  }

  // Filtrado y búsqueda multi-token
  function applyFilters() {
    let list = state.products.filter(p => !state.discardedIds.has(String(p.id)) && p.status !== 'descartado');

    // Filtro por categoría
    if (state.activeCategory !== 'TODOS') {
      const targetCat = normalizeStr(state.activeCategory);
      list = list.filter(p => normalizeStr(p.category) === targetCat);
    }

    // Búsqueda multi-token
    if (state.searchQuery) {
      const tokens = normalizeStr(state.searchQuery).split(/\s+/).filter(Boolean);
      list = list.filter(p => {
        const searchable = normalizeStr([
          p.title,
          p.code,
          p.category,
          p.brand,
          p.material,
          (p.sizes || []).join(' ')
        ].join(' '));

        return tokens.every(token => searchable.includes(token));
      });
    }

    // Ordenación
    if (state.sortBy === 'price-asc') {
      list.sort((a, b) => (a.numeric_usd || 0) - (b.numeric_usd || 0));
    } else if (state.sortBy === 'price-desc') {
      list.sort((a, b) => (b.numeric_usd || 0) - (a.numeric_usd || 0));
    }

    state.filteredProducts = list;
    renderGrid();

    if (dom.productCount) {
      const totalActive = state.products.filter(p => !state.discardedIds.has(String(p.id)) && p.status !== 'descartado').length;
      dom.productCount.textContent = `${list.length} de ${totalActive} piezas`;
    }
  }

  // Renderizado de tarjetas en grilla
  function renderGrid() {
    if (!dom.productGrid) return;

    if (state.filteredProducts.length === 0) {
      dom.productGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
          <div style="font-size: 2.2rem; margin-bottom: 12px; color: var(--purple);">✦ BOLETA</div>
          <h3 style="color: var(--text-primary); margin-bottom: 8px;">No se encontraron artículos</h3>
          <p style="font-size: 0.82rem;">Prueba buscando otras palabras clave o cambia de categoría.</p>
        </div>
      `;
      return;
    }

    dom.productGrid.innerHTML = state.filteredProducts.map(p => {
      const allPhotos = [p.image].concat(p.gallery || []);
      const currentIdx = p.currentImgIndex || 0;
      const displayImg = allPhotos[currentIdx] || p.image;
      const hasMultiplePhotos = allPhotos.length > 1;

      return `
        <article class="product-card" id="card-${p.id}" draggable="true" data-id="${p.id}">
          <div class="card-editor-overlay">
            <button class="btn-card-action btn-card-edit" data-id="${p.id}" title="Editar este producto">✏️</button>
            <button class="btn-card-action btn-card-discard" data-id="${p.id}" title="Descartar este producto">🗑️</button>
          </div>
          <div class="card-image-wrap" data-id="${p.id}">
            <span class="card-tag-order">● ${p.tag || 'POR ENCARGO'}</span>
            <span class="card-code">${p.code || `#BOL-${p.id}`}</span>
            ${p.is_purchased ? `<span class="card-purchased-badge">EN TRÁNSITO / BARQUISIMETO</span>` : ''}
            <img class="card-image" id="img-${p.id}" src="${displayImg}" alt="${p.title}" loading="lazy">

            ${hasMultiplePhotos ? `
              <button class="card-gallery-btn prev" data-id="${p.id}" title="Foto anterior">‹</button>
              <button class="card-gallery-btn next" data-id="${p.id}" title="Siguiente foto">›</button>
              <div class="card-gallery-dots">
                ${allPhotos.map((_, i) => `<span class="gallery-dot ${i === currentIdx ? 'active' : ''}" data-id="${p.id}" data-idx="${i}"></span>`).join('')}
              </div>
              <span class="card-gallery-badge">📷 ${allPhotos.length} fotos</span>
            ` : ''}
          </div>
          <div class="card-body">
            <div>
              <div class="card-brand">${p.brand || 'BOLETA'}</div>
              <h3 class="card-title" title="${p.title}">${p.title}</h3>
              <div class="card-specs">${p.material || 'Material garantizado'}</div>
            </div>
            <div>
              <div class="card-prices">
                <span class="price-usd">${p.price_usd}</span>
                <span class="price-bcv">${p.price_bcv}</span>
              </div>
              <div class="card-actions">
                <button class="btn-add-cart" data-id="${p.id}">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M12 5v14M5 12h14"/></svg>
                  AÑADIR
                </button>
                <button class="btn-quick-view" data-id="${p.id}" title="Ver detalle completo">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
            </div>
          </div>
        </article>
      `;
    }).join('');

    attachCardEvents();
  }

  // Eventos de tarjetas (Click, Modal, Drag & Drop, Galería, Drag-to-Merge)
  function attachCardEvents() {
    const cards = dom.productGrid.querySelectorAll('.product-card');

    cards.forEach(card => {
      const id = card.getAttribute('data-id');

      // 1. Iniciar arrastre de tarjeta
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', id);
        e.dataTransfer.effectAllowed = 'copyMove';
        card.classList.add('is-dragging');
        if (dom.floatingCartBtn) dom.floatingCartBtn.classList.add('pulse-drag');
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('is-dragging');
        if (dom.floatingCartBtn) dom.floatingCartBtn.classList.remove('pulse-drag');
      });

      // 2. Drag-to-Merge (arrastrar tarjeta sobre otra para unir fotos y borrar duplicado)
      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        card.classList.add('card-drag-target');
      });

      card.addEventListener('dragleave', () => {
        card.classList.remove('card-drag-target');
      });

      card.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        card.classList.remove('card-drag-target');

        const sourceId = e.dataTransfer.getData('text/plain');
        const targetId = id;

        if (sourceId && sourceId !== targetId) {
          triggerMergePrompt(sourceId, targetId);
        }
      });
    });

    // 3. Mini-galería de tarjeta (flechas y dots)
    dom.productGrid.querySelectorAll('.card-gallery-btn.prev').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigateCardGallery(btn.getAttribute('data-id'), -1);
      });
    });

    dom.productGrid.querySelectorAll('.card-gallery-btn.next').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigateCardGallery(btn.getAttribute('data-id'), 1);
      });
    });

    dom.productGrid.querySelectorAll('.gallery-dot').forEach(dot => {
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        setCardGalleryIndex(dot.getAttribute('data-id'), parseInt(dot.getAttribute('data-idx')));
      });
    });

    // 4. Botón de añadir al pedido
    dom.productGrid.querySelectorAll('.btn-add-cart').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const card = document.getElementById(`card-${id}`);
        const img = card ? card.querySelector('.card-image') : null;
        triggerFlyToCart(img);
        addToCart(id);
      });
    });

    // 5. Ver detalle / Quick View
    dom.productGrid.querySelectorAll('.btn-quick-view, .card-image-wrap').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.card-editor-overlay') || e.target.closest('.card-gallery-btn') || e.target.closest('.card-gallery-dots')) {
          return;
        }
        openProductModal(el.getAttribute('data-id'));
      });
    });

    // 6. Botones del Modo Editor
    dom.productGrid.querySelectorAll('.btn-card-discard').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        discardProduct(btn.getAttribute('data-id'));
      });
    });

    dom.productGrid.querySelectorAll('.btn-card-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openProductEditModal(btn.getAttribute('data-id'));
      });
    });
  }

  function navigateCardGallery(productId, delta) {
    const p = state.products.find(item => String(item.id) === String(productId));
    if (!p) return;

    const allPhotos = [p.image].concat(p.gallery || []);
    if (allPhotos.length <= 1) return;

    let current = p.currentImgIndex || 0;
    current = (current + delta + allPhotos.length) % allPhotos.length;
    p.currentImgIndex = current;
    updateCardImageDisplay(p);
  }

  function setCardGalleryIndex(productId, index) {
    const p = state.products.find(item => String(item.id) === String(productId));
    if (!p) return;

    const allPhotos = [p.image].concat(p.gallery || []);
    if (index >= 0 && index < allPhotos.length) {
      p.currentImgIndex = index;
      updateCardImageDisplay(p);
    }
  }

  function updateCardImageDisplay(p) {
    const allPhotos = [p.image].concat(p.gallery || []);
    const imgEl = document.getElementById(`img-${p.id}`);
    if (imgEl) {
      imgEl.src = allPhotos[p.currentImgIndex] || p.image;
    }

    const card = document.getElementById(`card-${p.id}`);
    if (card) {
      card.querySelectorAll('.gallery-dot').forEach((dot, idx) => {
        dot.classList.toggle('active', idx === p.currentImgIndex);
      });
    }
  }

  // Fusión Drag-to-Merge
  function triggerMergePrompt(sourceId, targetId) {
    const sourceProd = state.products.find(p => String(p.id) === String(sourceId));
    const targetProd = state.products.find(p => String(p.id) === String(targetId));
    if (!sourceProd || !targetProd) return;

    state.mergePending = { sourceId, targetId };

    if (dom.mergeSourceTitle) dom.mergeSourceTitle.textContent = `${sourceProd.title} (${sourceProd.code || '#' + sourceProd.id})`;
    if (dom.mergeTargetTitle) dom.mergeTargetTitle.textContent = `${targetProd.title} (${targetProd.code || '#' + targetProd.id})`;
    if (dom.mergeSourceImg) dom.mergeSourceImg.src = sourceProd.image;
    if (dom.mergeTargetImg) dom.mergeTargetImg.src = targetProd.image;

    if (dom.mergeConfirmModal) dom.mergeConfirmModal.classList.add('active');
  }

  async function executeCardMerge() {
    if (!state.mergePending) return;
    const { sourceId, targetId } = state.mergePending;

    const sourceProd = state.products.find(p => String(p.id) === String(sourceId));
    const targetProd = state.products.find(p => String(p.id) === String(targetId));

    if (sourceProd && targetProd) {
      const photosToTransfer = [sourceProd.image].concat(sourceProd.gallery || []);
      if (!targetProd.gallery) targetProd.gallery = [];

      photosToTransfer.forEach(photo => {
        if (photo && photo !== targetProd.image && !targetProd.gallery.includes(photo)) {
          targetProd.gallery.push(photo);
        }
      });

      state.discardedIds.add(String(sourceId));

      // Sincronizar con API si está disponible
      try {
        fetch('/api/products/merge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source_id: String(sourceId), target_id: String(targetId) })
        }).catch(() => {});
      } catch (e) {}

      saveEditorState();
      applyFilters();
      renderCategoryTabs();
      showToast(`✓ Foto fusionada en ${targetProd.title}. Duplicado descartado.`);
    }

    closeMergeModal();
  }

  function closeMergeModal() {
    if (dom.mergeConfirmModal) dom.mergeConfirmModal.classList.remove('active');
    state.mergePending = null;
  }

  // Animación de partícula volando al carrito
  function triggerFlyToCart(originImg) {
    if (!originImg || (!dom.floatingCartBtn && !dom.headerCartBtn)) return;
    const targetBtn = dom.floatingCartBtn || dom.headerCartBtn;

    const originRect = originImg.getBoundingClientRect();
    const targetRect = targetBtn.getBoundingClientRect();

    const particle = document.createElement('img');
    particle.src = originImg.src;
    particle.className = 'flying-particle';
    particle.style.top = `${originRect.top + originRect.height / 2 - 25}px`;
    particle.style.left = `${originRect.left + originRect.width / 2 - 25}px`;

    document.body.appendChild(particle);

    requestAnimationFrame(() => {
      particle.style.transform = `translate(${targetRect.left - originRect.left}px, ${targetRect.top - originRect.top}px) scale(0.2)`;
      particle.style.opacity = '0.2';
    });

    setTimeout(() => particle.remove(), 650);
  }

  // Quick View Modal
  function openProductModal(productId) {
    const product = state.products.find(p => String(p.id) === String(productId));
    if (!product) return;

    state.activeModalProduct = product;
    state.activeModalImgIndex = 0;
    state.selectedModalSize = product.sizes && product.sizes.length > 0 ? product.sizes[0] : 'Única';
    state.selectedModalColor = 'Blanco';

    const allPhotos = [product.image].concat(product.gallery || []);

    if (dom.modalImage) dom.modalImage.src = allPhotos[0] || product.image;
    if (dom.modalTag) dom.modalTag.textContent = product.is_purchased ? '● EN TRÁNSITO' : '● POR ENCARGO';
    if (dom.modalCode) dom.modalCode.textContent = product.code || `#BOL-${product.id}`;
    if (dom.modalTitle) dom.modalTitle.textContent = product.title;
    if (dom.modalBrand) dom.modalBrand.textContent = product.brand || 'BOLETA';
    if (dom.modalCategory) dom.modalCategory.textContent = product.category || 'Accesorios';
    if (dom.modalPriceUsd) dom.modalPriceUsd.textContent = product.price_usd;
    if (dom.modalPriceBcv) dom.modalPriceBcv.textContent = product.price_bcv;
    if (dom.modalMaterial) dom.modalMaterial.textContent = product.material || 'Material garantizado';
    if (dom.modalDesc) dom.modalDesc.textContent = `Pieza editorial de catálogo por encargo. Se reserva con 50% de abono inicial y el restante al recibir en Barquisimeto.`;

    updateModalImgCounter(allPhotos.length);

    // Miniaturas en la galería izquierda
    if (dom.modalThumbs) {
      if (allPhotos.length > 1) {
        dom.modalThumbs.style.display = 'flex';
        dom.modalThumbs.innerHTML = allPhotos.map((img, idx) => `
          <img src="${img}" class="qv-thumb ${idx === 0 ? 'active' : ''}" data-idx="${idx}" alt="Miniatura">
        `).join('');

        dom.modalThumbs.querySelectorAll('.qv-thumb').forEach(th => {
          th.addEventListener('click', () => {
            setModalImageIndex(parseInt(th.getAttribute('data-idx')));
          });
        });
      } else {
        dom.modalThumbs.style.display = 'none';
      }
    }

    // Variantes / Tallas
    if (dom.modalVariantPills) {
      if (product.sizes && product.sizes.length > 0) {
        dom.modalVariantPills.innerHTML = product.sizes.map((s, idx) => `
          <button class="variant-pill ${idx === 0 ? 'active' : ''}" data-size="${s}">${s}</button>
        `).join('');

        dom.modalVariantPills.querySelectorAll('.variant-pill').forEach(pill => {
          pill.addEventListener('click', () => {
            dom.modalVariantPills.querySelectorAll('.variant-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            state.selectedModalSize = pill.getAttribute('data-size');
          });
        });
      } else {
        dom.modalVariantPills.innerHTML = `<span class="variant-pill active">Talla Única</span>`;
      }
    }

    // Puntos de color
    if (dom.modalColorDots) {
      const colors = [
        { name: 'Blanco', color: '#F0F0F0' },
        { name: 'Negro', color: '#101010' },
        { name: 'Plata', color: '#B0B0B0' }
      ];
      dom.modalColorDots.innerHTML = colors.map((c, idx) => `
        <span class="color-dot ${idx === 0 ? 'active' : ''}" style="background: ${c.color};" data-color="${c.name}" title="${c.name}"></span>
      `).join('');

      dom.modalColorDots.querySelectorAll('.color-dot').forEach(dot => {
        dot.addEventListener('click', () => {
          dom.modalColorDots.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
          dot.classList.add('active');
          state.selectedModalColor = dot.getAttribute('data-color');
          if (dom.modalColorName) dom.modalColorName.textContent = state.selectedModalColor;
        });
      });
    }

    if (dom.productModal) dom.productModal.classList.add('active');
  }

  function setModalImageIndex(index) {
    if (!state.activeModalProduct) return;
    const allPhotos = [state.activeModalProduct.image].concat(state.activeModalProduct.gallery || []);
    if (index >= 0 && index < allPhotos.length) {
      state.activeModalImgIndex = index;
      if (dom.modalImage) dom.modalImage.src = allPhotos[index];
      if (dom.modalThumbs) {
        dom.modalThumbs.querySelectorAll('.qv-thumb').forEach((th, i) => {
          th.classList.toggle('active', i === index);
        });
      }
      updateModalImgCounter(allPhotos.length);
    }
  }

  function updateModalImgCounter(total) {
    if (dom.modalImgCounter) {
      dom.modalImgCounter.textContent = `${state.activeModalImgIndex + 1}/${total}`;
    }
  }

  function closeProductModal() {
    if (dom.productModal) dom.productModal.classList.remove('active');
    state.activeModalProduct = null;
  }

  // Gestión de Carrito ("MI PEDIDO")
  function addToCart(productId, sizeOverride = null) {
    const product = state.products.find(p => String(p.id) === String(productId));
    if (!product) return;

    const size = sizeOverride || (product.sizes && product.sizes.length > 0 ? product.sizes[0] : 'Única');
    const existingIndex = state.cart.findIndex(item => String(item.id) === String(productId) && item.size === size);

    if (existingIndex > -1) {
      state.cart[existingIndex].quantity += 1;
    } else {
      state.cart.push({
        id: String(productId),
        size: size,
        quantity: 1
      });
    }

    saveCartToStorage();
    updateCartUI();
    showToast(`✓ "${product.title}" añadido al pedido`);
  }

  function removeFromCart(productId, size) {
    state.cart = state.cart.filter(item => !(String(item.id) === String(productId) && item.size === size));
    saveCartToStorage();
    updateCartUI();
  }

  function updateQuantity(productId, size, delta) {
    const item = state.cart.find(i => String(i.id) === String(productId) && i.size === size);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
      removeFromCart(productId, size);
      return;
    }

    saveCartToStorage();
    updateCartUI();
  }

  // Cálculo dual independiente (USD y BCV) y UI del Drawer
  function updateCartUI() {
    const totalCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);

    if (dom.cartCountBadge) dom.cartCountBadge.textContent = totalCount;
    if (dom.floatingCartCount) dom.floatingCartCount.textContent = totalCount;
    if (dom.drawerCount) dom.drawerCount.textContent = `(${totalCount})`;

    if (!dom.cartDrawerBody) return;

    if (state.cart.length === 0) {
      dom.cartDrawerBody.innerHTML = `
        <div class="cart-empty">
          <div class="cart-empty-icon">✦ BOLETA</div>
          <div class="cart-empty-text">Tu pedido está vacío</div>
          <button class="cart-empty-btn" id="startBrowsingBtn">Explorar Catálogo</button>
        </div>
      `;
      const btn = document.getElementById('startBrowsingBtn');
      if (btn) btn.addEventListener('click', closeCartDrawer);

      if (dom.cartTotalUsd) dom.cartTotalUsd.textContent = "$0 USD";
      if (dom.cartTotalBcv) dom.cartTotalBcv.textContent = "0$ BCV";
      if (dom.cartDepositUsd) dom.cartDepositUsd.textContent = "$0 USD";
      if (dom.cartDepositBcv) dom.cartDepositBcv.textContent = "0$ BCV";
      if (dom.cartRemainingUsd) dom.cartRemainingUsd.textContent = "$0 USD";
      if (dom.cartRemainingBcv) dom.cartRemainingBcv.textContent = "0$ BCV";

      if (dom.checkoutBtn) {
        dom.checkoutBtn.style.opacity = "0.45";
        dom.checkoutBtn.style.pointerEvents = "none";
      }
      return;
    }

    let totalUsd = 0;
    let totalBcv = 0;

    dom.cartDrawerBody.innerHTML = state.cart.map(item => {
      const prod = state.products.find(p => String(p.id) === String(item.id));
      if (!prod) return '';

      const usdSub = (prod.numeric_usd || 0) * item.quantity;
      const bcvUnit = prod.numeric_bcv || parseInt(prod.price_bcv) || 25;
      const bcvSub = bcvUnit * item.quantity;

      totalUsd += usdSub;
      totalBcv += bcvSub;

      return `
        <div class="cart-item">
          <img class="cart-item-img" src="${prod.image}" alt="${prod.title}">
          <div class="cart-item-info">
            <div class="cart-item-title">${prod.title}</div>
            <div class="cart-item-variant">Talla/Opción: ${item.size}</div>
            <div class="cart-item-prices">
              <span>$${usdSub} USD</span>
              <span class="bcv">(${bcvSub}$ BCV)</span>
            </div>
          </div>
          <div class="cart-item-controls">
            <div class="cart-qty-group">
              <button class="qty-btn btn-qty-dec" data-id="${item.id}" data-size="${item.size}">−</button>
              <span class="qty-number">${item.quantity}</span>
              <button class="qty-btn btn-qty-inc" data-id="${item.id}" data-size="${item.size}">+</button>
            </div>
            <button class="cart-item-remove" data-id="${item.id}" data-size="${item.size}">Eliminar</button>
          </div>
        </div>
      `;
    }).join('');

    const depositUsd = Math.round(totalUsd * 0.5);
    const depositBcv = Math.round(totalBcv * 0.5);
    const remainingUsd = totalUsd - depositUsd;
    const remainingBcv = totalBcv - depositBcv;

    if (dom.cartTotalUsd) dom.cartTotalUsd.textContent = `$${totalUsd} USD`;
    if (dom.cartTotalBcv) dom.cartTotalBcv.textContent = `${totalBcv}$ BCV`;
    if (dom.cartDepositUsd) dom.cartDepositUsd.textContent = `$${depositUsd} USD`;
    if (dom.cartDepositBcv) dom.cartDepositBcv.textContent = `${depositBcv}$ BCV`;
    if (dom.cartRemainingUsd) dom.cartRemainingUsd.textContent = `$${remainingUsd} USD`;
    if (dom.cartRemainingBcv) dom.cartRemainingBcv.textContent = `${remainingBcv}$ BCV`;

    if (dom.checkoutBtn) {
      dom.checkoutBtn.style.opacity = "1";
      dom.checkoutBtn.style.pointerEvents = "auto";
    }

    // Eventos dentro del drawer
    dom.cartDrawerBody.querySelectorAll('.btn-qty-inc').forEach(btn => {
      btn.addEventListener('click', () => {
        updateQuantity(btn.getAttribute('data-id'), btn.getAttribute('data-size'), 1);
      });
    });

    dom.cartDrawerBody.querySelectorAll('.btn-qty-dec').forEach(btn => {
      btn.addEventListener('click', () => {
        updateQuantity(btn.getAttribute('data-id'), btn.getAttribute('data-size'), -1);
      });
    });

    dom.cartDrawerBody.querySelectorAll('.cart-item-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        removeFromCart(btn.getAttribute('data-id'), btn.getAttribute('data-size'));
      });
    });
  }

  // Checkout vía WhatsApp estructurado
  function checkoutViaWhatsApp() {
    if (state.cart.length === 0) return;

    let totalUsd = 0;
    let totalBcv = 0;
    const itemsLines = [];

    state.cart.forEach((item, index) => {
      const prod = state.products.find(p => String(p.id) === String(item.id));
      if (prod) {
        const usdSub = (prod.numeric_usd || 0) * item.quantity;
        const bcvUnit = prod.numeric_bcv || parseInt(prod.price_bcv) || 25;
        const bcvSub = bcvUnit * item.quantity;

        totalUsd += usdSub;
        totalBcv += bcvSub;

        itemsLines.push(`${index + 1}. [${prod.code || '#' + prod.id}] ${prod.title}\n   • Talla/Opción: ${item.size}\n   • Cantidad: ${item.quantity}\n   • Precio: $${usdSub} USD (${bcvSub}$ BCV)`);
      }
    });

    const depositUsd = Math.round(totalUsd * 0.5);
    const depositBcv = Math.round(totalBcv * 0.5);
    const remainingUsd = totalUsd - depositUsd;
    const remainingBcv = totalBcv - depositBcv;

    const message =
`🛒 *SOLICITUD DE ENCARGO — BOLETA CLOTHING* 🛒

Hola BOLETA, deseo apartar las siguientes piezas exclusivas:

${itemsLines.join('\n\n')}

━━━━━━━━━━━━━━━━━━━━
💰 *Total:* $${totalUsd} USD (${totalBcv}$ BCV)
💳 *Abono Inicial (50%):* $${depositUsd} USD (${depositBcv}$ BCV)
📍 *Saldo restante (50%):* Se cancela al llegar a Barquisimeto ($${remainingUsd} USD / ${remainingBcv}$ BCV)
━━━━━━━━━━━━━━━━━━━━

_Deseo confirmar disponibilidad, tallas y coordinar fotos al privado._`;

    const encoded = encodeURIComponent(message);
    const phone = CONFIG.whatsappPhone ? CONFIG.whatsappPhone.replace(/[^0-9]/g, '') : '584245314215';
    const whatsappUrl = `https://wa.me/${phone}?text=${encoded}`;

    window.open(whatsappUrl, '_blank');
  }

  function openCartDrawer() {
    if (dom.cartDrawer && dom.cartDrawerOverlay) {
      dom.cartDrawer.classList.add('active');
      dom.cartDrawerOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeCartDrawer() {
    if (dom.cartDrawer && dom.cartDrawerOverlay) {
      dom.cartDrawer.classList.remove('active');
      dom.cartDrawerOverlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  function saveCartToStorage() {
    try {
      localStorage.setItem('boleta_cart', JSON.stringify(state.cart));
    } catch (e) {}
  }

  function loadCartFromStorage() {
    try {
      const saved = localStorage.getItem('boleta_cart') || localStorage.getItem('bdv_cart');
      if (saved) {
        state.cart = JSON.parse(saved);
        updateCartUI();
      }
    } catch (e) {
      state.cart = [];
    }
  }

  // =========================================================================
  // MODO EDITOR & ADMIN
  // =========================================================================

  function toggleEditorMode(forceActive = null) {
    if (forceActive !== null) {
      state.isEditorMode = forceActive;
    } else {
      state.isEditorMode = !state.isEditorMode;
    }

    if (state.isEditorMode) {
      document.body.classList.add('editor-mode-active');
      if (dom.editorToolbar) dom.editorToolbar.style.display = 'block';
      localStorage.setItem('boleta_editor_active', '1');
      updateEditorStats();
      showToast('⚙️ Modo Edición ACTIVADO (Arrastra posts para fusionar)');
    } else {
      document.body.classList.remove('editor-mode-active');
      if (dom.editorToolbar) dom.editorToolbar.style.display = 'none';
      localStorage.removeItem('boleta_editor_active');
      showToast('Modo Edición desactivado');
    }
  }

  function updateEditorStats() {
    if (!dom.editorStatsBadge) return;
    const totalActive = state.products.filter(p => !state.discardedIds.has(String(p.id)) && p.status !== 'descartado').length;
    const totalDiscarded = state.discardedIds.size;
    dom.editorStatsBadge.textContent = `${totalActive} Activos • ${totalDiscarded} Descartados`;
  }

  function saveEditorState() {
    try {
      localStorage.setItem('boleta_custom_catalog', JSON.stringify(state.products));
      localStorage.setItem('boleta_discarded_ids', JSON.stringify(Array.from(state.discardedIds)));
    } catch (e) {}
    updateEditorStats();
  }

  function discardProduct(productId) {
    const card = document.getElementById(`card-${productId}`);
    if (card) {
      card.style.transition = 'all 0.3s ease';
      card.style.opacity = '0';
      card.style.transform = 'scale(0.85)';
    }

    setTimeout(() => {
      state.discardedIds.add(String(productId));

      // Sincronizar borrado con API SQLite
      try {
        fetch(`/api/products/${productId}`, { method: 'DELETE' }).catch(() => {});
      } catch (e) {}

      saveEditorState();
      applyFilters();
      renderCategoryTabs();
      showToast(`🗑️ Producto #${productId} descartado`);
    }, 280);
  }

  // Modal de edición de producto existente
  function openProductEditModal(productId) {
    const p = state.products.find(item => String(item.id) === String(productId));
    if (!p) return;

    state.editingProductId = productId;

    if (dom.editFieldTitle) dom.editFieldTitle.value = p.title || '';
    if (dom.editFieldCategory) dom.editFieldCategory.value = p.category || 'Joyería';
    if (dom.editFieldBrand) dom.editFieldBrand.value = p.brand || 'BOLETA';
    if (dom.editFieldPriceUsd) dom.editFieldPriceUsd.value = p.numeric_usd || 0;
    if (dom.editFieldPriceBcv) dom.editFieldPriceBcv.value = p.price_bcv || '';
    if (dom.editFieldMaterial) dom.editFieldMaterial.value = p.material || '';
    if (dom.editFieldSizes) dom.editFieldSizes.value = (p.sizes || []).join(', ');
    if (dom.editFieldPurchased) dom.editFieldPurchased.checked = Boolean(p.is_purchased);
    if (dom.editModalImg) dom.editModalImg.src = p.image;
    if (dom.editModalCode) dom.editModalCode.textContent = p.code || `#BOL-${p.id}`;

    renderEditGalleryStrip(p);

    if (dom.productEditModal) dom.productEditModal.classList.add('active');
  }

  function renderEditGalleryStrip(p) {
    if (!dom.editGalleryStrip) return;
    const allPhotos = [p.image].concat(p.gallery || []);

    dom.editGalleryStrip.innerHTML = allPhotos.map((img, idx) => `
      <div style="position: relative; display: inline-block;">
        <img src="${img}" style="width: 55px; height: 55px; object-fit: cover; border-radius: 4px; border: 1px solid rgba(139,77,255,0.4);" alt="Foto">
        ${idx > 0 ? `
          <button type="button" class="btn-remove-gallery-photo" data-idx="${idx - 1}" style="position: absolute; top: -6px; right: -6px; width: 18px; height: 18px; border-radius: 50%; background: #FF5E7E; color: #FFF; border: none; font-size: 10px; cursor: pointer;">✕</button>
        ` : ''}
      </div>
    `).join('');

    dom.editGalleryStrip.querySelectorAll('.btn-remove-gallery-photo').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const removeIdx = parseInt(btn.getAttribute('data-idx'));
        if (p.gallery && p.gallery.length > removeIdx) {
          p.gallery.splice(removeIdx, 1);
          renderEditGalleryStrip(p);
          saveEditorState();
          applyFilters();
        }
      });
    });
  }

  function closeProductEditModal() {
    if (dom.productEditModal) dom.productEditModal.classList.remove('active');
    state.editingProductId = null;
  }

  async function handleEditFormSubmit(e) {
    e.preventDefault();
    if (!state.editingProductId) return;

    const p = state.products.find(item => String(item.id) === String(state.editingProductId));
    if (!p) return;

    p.title = dom.editFieldTitle.value.trim();
    p.category = dom.editFieldCategory.value;
    p.brand = dom.editFieldBrand.value.trim() || 'BOLETA';
    p.numeric_usd = Number(dom.editFieldPriceUsd.value) || p.numeric_usd;
    p.price_usd = `$${p.numeric_usd} USD`;
    p.price_bcv = dom.editFieldPriceBcv.value.trim() || `${Math.round(p.numeric_usd * 1.15)}$ BCV`;

    const matchBcv = p.price_bcv.match(/(\d+)/);
    p.numeric_bcv = matchBcv ? parseInt(matchBcv[1]) : Math.round(p.numeric_usd * 1.15);

    p.material = dom.editFieldMaterial.value.trim();
    p.sizes = dom.editFieldSizes.value.split(',').map(s => s.trim()).filter(Boolean);
    p.is_purchased = dom.editFieldPurchased ? dom.editFieldPurchased.checked : p.is_purchased;

    // Sincronizar cambios con API FastAPI / SQLite
    try {
      fetch(`/api/products/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: p.title,
          category: p.category,
          brand: p.brand,
          numeric_usd: p.numeric_usd,
          numeric_bcv: p.numeric_bcv,
          price_usd: p.price_usd,
          price_bcv: p.price_bcv,
          material: p.material,
          sizes: p.sizes,
          is_purchased: p.is_purchased,
          gallery: p.gallery
        })
      }).catch(() => {});
    } catch (err) {}

    saveEditorState();
    applyFilters();
    renderCategoryTabs();
    closeProductEditModal();
    showToast(`✓ Cambios guardados para #${p.id}`);
  }

  // Subida de fotos desde PC para producto en edición
  async function handleEditPhotoUpload(files) {
    if (!state.editingProductId || !files || files.length === 0) return;
    const p = state.products.find(item => String(item.id) === String(state.editingProductId));
    if (!p) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (res.ok) {
          const data = await res.json();
          if (!p.gallery) p.gallery = [];
          p.gallery.push(data.url);
        } else {
          throw new Error('Upload failed');
        }
      } catch (err) {
        // Fallback FileReader local
        const reader = new FileReader();
        reader.onload = (e) => {
          if (!p.gallery) p.gallery = [];
          p.gallery.push(e.target.result);
          renderEditGalleryStrip(p);
          saveEditorState();
          applyFilters();
        };
        reader.readAsDataURL(file);
      }
    }

    renderEditGalleryStrip(p);
    saveEditorState();
    applyFilters();
    showToast(`✓ Fotos añadidas a la galería de #${p.id}`);
  }

  // Cambiar foto principal
  async function handleEditMainPhoto(file) {
    if (!state.editingProductId || !file || !file.type.startsWith('image/')) return;
    const p = state.products.find(item => String(item.id) === String(state.editingProductId));
    if (!p) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        p.image = data.url;
        p.thumb = data.thumb || data.url;
      } else {
        throw new Error('Upload failed');
      }
    } catch (err) {
      const reader = new FileReader();
      reader.onload = (e) => {
        p.image = e.target.result;
        p.thumb = e.target.result;
        if (dom.editModalImg) dom.editModalImg.src = p.image;
        saveEditorState();
        applyFilters();
      };
      reader.readAsDataURL(file);
      return;
    }

    if (dom.editModalImg) dom.editModalImg.src = p.image;
    saveEditorState();
    applyFilters();
    showToast(`✓ Foto principal actualizada para #${p.id}`);
  }

  // Modal Añadir Nuevo Producto (Admin)
  function openAddProductModal() {
    if (dom.addProductModal) {
      dom.addProductModal.classList.add('active');
      if (dom.newFieldTitle) dom.newFieldTitle.focus();
    }
  }

  function closeAddProductModal() {
    if (dom.addProductModal) {
      dom.addProductModal.classList.remove('active');
      if (dom.addProductForm) dom.addProductForm.reset();
      clearNewProductImages();
    }
  }

  function clearNewProductImages() {
    state.selectedNewProductFiles = [];
    if (dom.newProductFileInput) dom.newProductFileInput.value = '';
    if (dom.uploadPreviewBox) dom.uploadPreviewBox.style.display = 'none';
    if (dom.uploadPlaceholder) dom.uploadPlaceholder.style.display = 'block';
    if (dom.removeUploadImgBtn) dom.removeUploadImgBtn.style.display = 'none';
    if (dom.uploadPreviewStrip) dom.uploadPreviewStrip.innerHTML = '';
  }

  function handleNewProductFiles(files) {
    if (!files || files.length === 0) return;
    state.selectedNewProductFiles = Array.from(files).filter(f => f.type.startsWith('image/'));

    if (state.selectedNewProductFiles.length === 0) {
      showToast('⚠️ Por favor selecciona archivos de imagen válidos');
      return;
    }

    if (dom.uploadPlaceholder) dom.uploadPlaceholder.style.display = 'none';
    if (dom.uploadPreviewBox) dom.uploadPreviewBox.style.display = 'flex';
    if (dom.removeUploadImgBtn) dom.removeUploadImgBtn.style.display = 'inline-block';

    if (dom.uploadPreviewStrip) {
      dom.uploadPreviewStrip.innerHTML = '';
      state.selectedNewProductFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = document.createElement('img');
          img.src = e.target.result;
          img.className = 'upload-preview-item';
          dom.uploadPreviewStrip.appendChild(img);
        };
        reader.readAsDataURL(file);
      });
    }
  }

  async function handleAddProductSubmit(e) {
    e.preventDefault();
    const title = dom.newFieldTitle.value.trim();
    if (!title) return;

    const category = dom.newFieldCategory.value;
    const brand = dom.newFieldBrand.value.trim() || 'BOLETA';
    const numUsd = parseFloat(dom.newFieldPriceUsd.value) || 0;
    const priceBcvVal = dom.newFieldPriceBcv.value.trim();
    const numBcv = priceBcvVal ? (parseInt(priceBcvVal.match(/\d+/)?.[0]) || Math.round(numUsd * 1.15)) : Math.round(numUsd * 1.15);
    const material = dom.newFieldMaterial.value.trim();
    const sizes = dom.newFieldSizes.value.trim() || 'Única';
    const isPurchased = dom.newFieldPurchased ? dom.newFieldPurchased.checked : false;

    if (dom.newProductSubmitBtn) {
      dom.newProductSubmitBtn.disabled = true;
      dom.newProductSubmitBtn.textContent = '⏳ Publicando producto…';
    }

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('category', category);
      formData.append('brand', brand);
      formData.append('numeric_usd', numUsd);
      formData.append('numeric_bcv', numBcv);
      formData.append('material', material);
      formData.append('sizes', sizes);
      formData.append('tag', 'POR ENCARGO');

      if (state.selectedNewProductFiles.length > 0) {
        formData.append('image_file', state.selectedNewProductFiles[0]);
      }

      const res = await fetch('/api/products', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const created = await res.json();
        created.is_purchased = isPurchased;

        // Subir fotos adicionales si las hay
        if (state.selectedNewProductFiles.length > 1) {
          for (let i = 1; i < state.selectedNewProductFiles.length; i++) {
            const addForm = new FormData();
            addForm.append('file', state.selectedNewProductFiles[i]);
            const addRes = await fetch('/api/upload', { method: 'POST', body: addForm });
            if (addRes.ok) {
              const addData = await addRes.json();
              if (!created.gallery) created.gallery = [];
              created.gallery.push(addData.url);
            }
          }
        }

        state.products.unshift(sanitizeProduct(created));
        saveEditorState();
        applyFilters();
        renderCategoryTabs();
        closeAddProductModal();
        showToast(`✓ "${title}" publicado en la vitrina`);
      } else {
        throw new Error('Servidor retornó ' + res.status);
      }
    } catch (err) {
      console.warn("API POST no disponible, agregando localmente:", err);
      const newId = String(Date.now());
      const previewImgs = dom.uploadPreviewStrip.querySelectorAll('img');
      const firstImg = previewImgs.length > 0 ? previewImgs[0].src : 'images/logo.png';
      const gallery = [];
      for (let i = 1; i < previewImgs.length; i++) {
        gallery.push(previewImgs[i].src);
      }

      const localProd = sanitizeProduct({
        id: newId,
        code: `#BOL-${newId.slice(-4)}`,
        title: title,
        category: category,
        brand: brand,
        numeric_usd: numUsd,
        numeric_bcv: numBcv,
        price_usd: `$${numUsd} USD`,
        price_bcv: `${numBcv}$ BCV`,
        image: firstImg,
        thumb: firstImg,
        gallery: gallery,
        sizes: sizes.split(',').map(s => s.trim()).filter(Boolean),
        material: material,
        tag: 'POR ENCARGO',
        is_purchased: isPurchased,
        in_stock: true,
        status: 'aprobado'
      });

      state.products.unshift(localProd);
      saveEditorState();
      applyFilters();
      renderCategoryTabs();
      closeAddProductModal();
      showToast(`✓ "${title}" añadido al catálogo local`);
    } finally {
      if (dom.newProductSubmitBtn) {
        dom.newProductSubmitBtn.disabled = false;
        dom.newProductSubmitBtn.textContent = '⚡ Publicar Producto en la Vitrina';
      }
    }
  }

  // Exportar catalog.json saneado
  function exportCleanCatalog() {
    const cleanProducts = state.products
      .filter(p => !state.discardedIds.has(String(p.id)) && p.status !== 'descartado')
      .map(p => ({
        ...p,
        status: 'aprobado'
      }));

    const jsonString = JSON.stringify(cleanProducts, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'catalog.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    showToast(`💾 catalog.json descargado con éxito (${cleanProducts.length} productos activos)`);
  }

  function resetToOriginalCatalog() {
    if (!confirm('¿Deseas restaurar el catálogo al estado original y cancelar todos los descartes?')) {
      return;
    }

    localStorage.removeItem('boleta_custom_catalog');
    localStorage.removeItem('boleta_discarded_ids');
    localStorage.removeItem('bdv_custom_catalog');
    localStorage.removeItem('bdv_discarded_ids');
    state.discardedIds = new Set();

    if (window.BOLETA_CATALOG) {
      state.products = JSON.parse(JSON.stringify(window.BOLETA_CATALOG)).map(sanitizeProduct);
    }
    applyFilters();
    renderCategoryTabs();
    updateEditorStats();
    showToast('🔄 Catálogo restaurado al estado original');
  }

  function showToast(text) {
    if (!dom.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>⚡</span><span>${text}</span>`;
    dom.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  // Configuración de escuchas globales
  function setupEventListeners() {
    // Buscador
    if (dom.searchInput) {
      dom.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        if (dom.searchClear) {
          dom.searchClear.classList.toggle('visible', Boolean(state.searchQuery));
        }
        applyFilters();
      });
    }

    if (dom.searchClear) {
      dom.searchClear.addEventListener('click', () => {
        dom.searchInput.value = '';
        state.searchQuery = '';
        dom.searchClear.classList.remove('visible');
        applyFilters();
      });
    }

    if (dom.headerSearchBtn) {
      dom.headerSearchBtn.addEventListener('click', () => {
        const catSection = document.getElementById('catalogo');
        if (catSection) catSection.scrollIntoView({ behavior: 'smooth' });
        if (dom.searchInput) dom.searchInput.focus();
      });
    }

    // Ordenación
    if (dom.sortSelect) {
      dom.sortSelect.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        applyFilters();
      });
    }

    // Mobile nav toggle
    if (dom.navToggle && dom.siteNav) {
      dom.navToggle.addEventListener('click', () => {
        const isOpen = dom.siteNav.style.display === 'flex';
        dom.siteNav.style.display = isOpen ? 'none' : 'flex';
        if (!isOpen) {
          dom.siteNav.style.flexDirection = 'column';
          dom.siteNav.style.position = 'absolute';
          dom.siteNav.style.top = '100%';
          dom.siteNav.style.left = '0';
          dom.siteNav.style.right = '0';
          dom.siteNav.style.background = 'rgba(8, 6, 13, 0.98)';
          dom.siteNav.style.padding = '20px';
          dom.siteNav.style.borderBottom = '1px solid rgba(139, 77, 255, 0.2)';
        }
      });
    }

    // Botones de Carrito
    if (dom.headerCartBtn) dom.headerCartBtn.addEventListener('click', openCartDrawer);
    if (dom.floatingCartBtn) dom.floatingCartBtn.addEventListener('click', openCartDrawer);
    if (dom.cartDrawerClose) dom.cartDrawerClose.addEventListener('click', closeCartDrawer);
    if (dom.cartDrawerOverlay) dom.cartDrawerOverlay.addEventListener('click', closeCartDrawer);
    if (dom.checkoutBtn) dom.checkoutBtn.addEventListener('click', checkoutViaWhatsApp);

    // Modal Quick View
    if (dom.modalCloseBtn) dom.modalCloseBtn.addEventListener('click', closeProductModal);
    if (dom.productModal) {
      dom.productModal.addEventListener('click', (e) => {
        if (e.target === dom.productModal) closeProductModal();
      });
    }

    if (dom.modalPrevImg) {
      dom.modalPrevImg.addEventListener('click', () => {
        if (!state.activeModalProduct) return;
        const total = 1 + (state.activeModalProduct.gallery || []).length;
        setModalImageIndex((state.activeModalImgIndex - 1 + total) % total);
      });
    }

    if (dom.modalNextImg) {
      dom.modalNextImg.addEventListener('click', () => {
        if (!state.activeModalProduct) return;
        const total = 1 + (state.activeModalProduct.gallery || []).length;
        setModalImageIndex((state.activeModalImgIndex + 1) % total);
      });
    }

    if (dom.modalAddCartBtn) {
      dom.modalAddCartBtn.addEventListener('click', () => {
        if (state.activeModalProduct) {
          addToCart(state.activeModalProduct.id, state.selectedModalSize);
          closeProductModal();
        }
      });
    }

    if (dom.modalWhatsappBtn) {
      dom.modalWhatsappBtn.addEventListener('click', () => {
        if (state.activeModalProduct) {
          const p = state.activeModalProduct;
          const msg = encodeURIComponent(`Hola BOLETA, me interesa encargar la siguiente pieza:\n• [${p.code || '#' + p.id}] ${p.title}\n• Talla: ${state.selectedModalSize || 'Única'}\n• Precio: ${p.price_usd} (${p.price_bcv})\n\n¿Tienes disponibilidad para Barquisimeto?`);
          const phone = CONFIG.whatsappPhone ? CONFIG.whatsappPhone.replace(/[^0-9]/g, '') : '584245314215';
          window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
        }
      });
    }

    // Live Editor Toolbar
    if (dom.editorNewItemBtn) dom.editorNewItemBtn.addEventListener('click', openAddProductModal);
    if (dom.editorExportBtn) dom.editorExportBtn.addEventListener('click', exportCleanCatalog);
    if (dom.editorResetBtn) dom.editorResetBtn.addEventListener('click', resetToOriginalCatalog);
    if (dom.editorExitBtn) dom.editorExitBtn.addEventListener('click', () => toggleEditorMode(false));
    if (dom.footerEditorToggle) {
      dom.footerEditorToggle.addEventListener('click', (e) => {
        e.preventDefault();
        toggleEditorMode();
      });
    }

    // Modal de Edición de Producto
    if (dom.editModalCloseBtn) dom.editModalCloseBtn.addEventListener('click', closeProductEditModal);
    if (dom.productEditModal) {
      dom.productEditModal.addEventListener('click', (e) => {
        if (e.target === dom.productEditModal) closeProductEditModal();
      });
    }
    if (dom.productEditForm) dom.productEditForm.addEventListener('submit', handleEditFormSubmit);

    // Subida de fotos dentro del modal de edición
    if (dom.editPhotoDropZone) {
      dom.editPhotoDropZone.addEventListener('click', () => {
        if (dom.editPhotoInput) dom.editPhotoInput.click();
      });
      dom.editPhotoDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dom.editPhotoDropZone.style.borderColor = 'var(--purple)';
      });
      dom.editPhotoDropZone.addEventListener('dragleave', () => {
        dom.editPhotoDropZone.style.borderColor = 'rgba(139, 77, 255, 0.5)';
      });
      dom.editPhotoDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dom.editPhotoDropZone.style.borderColor = 'rgba(139, 77, 255, 0.5)';
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          handleEditPhotoUpload(e.dataTransfer.files);
        }
      });
    }

    if (dom.editPhotoInput) {
      dom.editPhotoInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          handleEditPhotoUpload(e.target.files);
        }
      });
    }

    if (dom.editMainPhotoBtn) {
      dom.editMainPhotoBtn.addEventListener('click', () => {
        if (dom.editMainPhotoInput) dom.editMainPhotoInput.click();
      });
    }

    if (dom.editMainPhotoInput) {
      dom.editMainPhotoInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          handleEditMainPhoto(e.target.files[0]);
        }
      });
    }

    // Modal de Fusión (Drag-to-Merge)
    if (dom.mergeModalCloseBtn) dom.mergeModalCloseBtn.addEventListener('click', closeMergeModal);
    if (dom.mergeCancelBtn) dom.mergeCancelBtn.addEventListener('click', closeMergeModal);
    if (dom.mergeConfirmBtn) dom.mergeConfirmBtn.addEventListener('click', executeCardMerge);
    if (dom.mergeConfirmModal) {
      dom.mergeConfirmModal.addEventListener('click', (e) => {
        if (e.target === dom.mergeConfirmModal) closeMergeModal();
      });
    }

    // Modal de Añadir Nuevo Producto
    if (dom.addProductCloseBtn) dom.addProductCloseBtn.addEventListener('click', closeAddProductModal);
    if (dom.addProductModal) {
      dom.addProductModal.addEventListener('click', (e) => {
        if (e.target === dom.addProductModal) closeAddProductModal();
      });
    }
    if (dom.addProductForm) dom.addProductForm.addEventListener('submit', handleAddProductSubmit);

    // Drop zone para nuevo producto
    if (dom.uploadDropZone) {
      dom.uploadDropZone.addEventListener('click', (e) => {
        if (e.target !== dom.removeUploadImgBtn && dom.newProductFileInput) {
          dom.newProductFileInput.click();
        }
      });

      dom.uploadDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dom.uploadDropZone.classList.add('dragover');
      });

      dom.uploadDropZone.addEventListener('dragleave', () => {
        dom.uploadDropZone.classList.remove('dragover');
      });

      dom.uploadDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dom.uploadDropZone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          handleNewProductFiles(e.dataTransfer.files);
        }
      });
    }

    if (dom.newProductFileInput) {
      dom.newProductFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          handleNewProductFiles(e.target.files);
        }
      });
    }

    if (dom.removeUploadImgBtn) {
      dom.removeUploadImgBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        clearNewProductImages();
      });
    }

    // Atajos de teclado (Ctrl + Shift + E, Esc, Enter)
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
        e.preventDefault();
        toggleEditorMode();
      } else if (e.key === 'Escape') {
        closeProductModal();
        closeProductEditModal();
        closeMergeModal();
        closeAddProductModal();
        closeCartDrawer();
      } else if (e.key === 'Enter' && dom.mergeConfirmModal && dom.mergeConfirmModal.classList.contains('active')) {
        e.preventDefault();
        executeCardMerge();
      }
    });

    // Enlaces B2B a WhatsApp (+57 321 5885381)
    document.querySelectorAll('.b2b-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const b2bMsg = encodeURIComponent("Hola, vi la vitrina de BOLETA CLOTHING y me interesa una página web interactiva para mi negocio.");
        const phone = CONFIG.b2bPhone ? CONFIG.b2bPhone.replace(/[^0-9]/g, '') : '573215885381';
        window.open(`https://wa.me/${phone}?text=${b2bMsg}`, '_blank');
      });
    });
  }

  // Ejecución al cargar DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
