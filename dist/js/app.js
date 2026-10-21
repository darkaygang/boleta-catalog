// BOLETA: small vanilla modules, no third-party code before a visitor asks for it.
export const $ = (id) => document.getElementById(id);
export const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function safeUrl(value, fallback = "") {
  try {
    const u = new URL(value, location.origin);
    return u.origin === location.origin
      ? u.pathname + u.search + u.hash
      : u.protocol === "https:"
        ? u.href
        : fallback;
  } catch {
    return fallback;
  }
}
export const norm = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function readLocal(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
export function writeLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage may be unavailable */
  }
}
export async function api(path, options = {}) {
  const res = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });
  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok)
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : "No pudimos completar la operación. Intenta de nuevo.",
    );
  return data;
}
export function toast(text) {
  $("toast").textContent = text;
  $("toast").classList.add("visible");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $("toast").classList.remove("visible"), 3500);
}
export function openDialog(id) {
  const el = typeof id === "string" ? $(id) : id;
  if (!el.open) el.showModal();
  document.body.style.overflow = "hidden";
}
export function closeDialog(el) {
  el.close();
  if (!document.querySelector("dialog[open]"))
    document.body.style.overflow = "";
}
export function wireDialog(el) {
  el.addEventListener("click", (e) => {
    if (e.target === el || e.target.closest(".close-dialog")) closeDialog(el);
  });
  el.addEventListener("close", () => {
    if (!document.querySelector("dialog[open]"))
      document.body.style.overflow = "";
  });
}
export const defaults = {
  brand: {
    name: "BOLETA",
    accent: "#60328A",
    logo: "/images/boleta-logo.webp",
  },
  hero: {
    eyebrow: "ARCHIVO 001 / EST. 2022",
    title: "FUERA DE\nLO COMÚN.",
    description: "Piezas para los que tienen su propia forma de ver las cosas.",
    cta: "Explorar el archivo",
    image: "/images/hero-glasses.webp",
    secondary_image: "/images/hero-ring.webp",
  },
  fonts: { heading: "Barlow Condensed", body: "Manrope" },
  logistics: {
    label: "Por encargo",
    estimated_arrival: "2026-12-15",
    note: "Llegada estimada, sujeta a logística.",
  },
  contacts: { store_whatsapp: "584245314215", studio_whatsapp: "573215885381" },
  radio: {
    playlist_url: "https://open.spotify.com/playlist/7JwsCKwcOZGfaWoJu8guQn",
  },
  studio: {
    title: "TU NEGOCIO.\nOTRA DIMENSIÓN.",
    description:
      "Webs, automatización y experiencias digitales por Digital Solution.",
    cta: "Hablemos de tu proyecto",
    url: "https://digital-solution-page.vercel.app",
  },
  faq: [
    {
      question: "¿Cómo encargar?",
      answer:
        "Arma tu selección y consulta disponibilidad y condiciones por WhatsApp.",
    },
    {
      question: "¿Cuándo llega?",
      answer:
        "Llegada estimada el 15 de diciembre de 2026, sujeta a logística.",
    },
    {
      question: "¿Cómo elijo mi talla?",
      answer:
        "Consulta las medidas y confírmalas por WhatsApp antes de encargar.",
    },
  ],
  payment: { deposit_percent: null, bcv_rate: null, bcv_date: "" },
  rewards: { enabled: false, terms: "", prizes: [] },
};
defaults.copy = {
  radio_title: "BOLETA RADIO",
  radio_description: "SONIDOS PARA UN MUNDO DIFERENTE.",
  how_eyebrow: "SIN VUELTAS / ASÍ FUNCIONA",
  how_title: "TU ESTILO.\nTU SELECCIÓN.",
  how_step1_title: "Encuentra tu pieza",
  how_step1_text: "Explora el archivo y revisa las fotos y variantes.",
  how_step2_title: "Arma tu selección",
  how_step2_text: "Escoge talla o variante y añade lo que va contigo.",
  how_step3_title: "Conversemos",
  how_step3_text:
    "Confirma disponibilidad, entrega y condiciones por WhatsApp antes de pagar.",
  community_eyebrow: "NO TE PIERDAS EL SIGUIENTE ARCHIVO.",
  community_title: "QUÉDATE EN\nLA FRECUENCIA.",
  community_description:
    "Déjanos tu contacto para responder tu consulta. Tú decides si también quieres novedades.",
  archive_title: "TU PRÓXIMA\nPIEZA.",
  archive_description:
    "Encuentra lo que va contigo. Arma tu selección y hablamos.",
};
defaults.site_sections = {
  order: [
    "radio",
    "categories",
    "studio",
    "catalog",
    "how",
    "faq",
    "rewards",
    "community",
  ],
  hidden: [],
};
export const state = {
  settings: structuredClone(defaults),
  products: [],
  cart: readLocal("boleta-selection-v2", []),
  category: "Todo",
  query: "",
  sort: "featured",
  limit: 24,
  editor: false,
  product: null,
  variant: null,
  quantity: 1,
  image: 0,
};
if (!Array.isArray(state.cart)) state.cart = [];
export function dateLabel(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return "Por confirmar";
  return new Intl.DateTimeFormat("es-VE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value + "T12:00:00Z"));
}
export function arrivalText() {
  return `${state.settings.logistics.label || "Por encargo"} · Llegada estimada: ${dateLabel(state.settings.logistics.estimated_arrival)}`;
}
export function priceNumber(p) {
  const v = p.numeric_usd ?? p.price;
  return v !== null && v !== "" && Number.isFinite(Number(v)) && Number(v) > 0
    ? Number(v)
    : null;
}
export function priceLabel(p) {
  const n = priceNumber(p);
  return n === null
    ? "Precio por confirmar"
    : new Intl.NumberFormat("es-VE", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }).format(n);
}
export function categoryOf(p) {
  const s = norm((p.title || p.name || "") + " " + p.category);
  if (/lente|gafa|eyewear|glasses/.test(s)) return "Lentes";
  if (/anillo|ring/.test(s)) return "Anillos";
  if (/camisa|hoodie|pantal|ropa|short|bermud|chaqueta|sudader|franela/.test(s))
    return "Ropa";
  return p.category || "Accesorios";
}
// Only local catalogue photos use the fixed-size cached thumbnail endpoint.
// Product detail keeps the original image; external media URLs stay unchanged.
export function thumbnail(source) {
  const src =
    typeof source === "string"
      ? source
      : source?.thumb || source?.image || source?.image_url;
  const url = safeUrl(src, "/images/boleta-logo.webp");
  if (url.startsWith("/photos/"))
    return "/api/thumbnail?src=" + encodeURIComponent(url.slice(1));
  return url;
}
export function gallery(p) {
  let values = p.gallery;
  if (typeof values === "string") {
    try {
      values = JSON.parse(values);
    } catch {
      values = [];
    }
  }
  return [
    ...new Set(
      [p.image || p.image_url, ...(Array.isArray(values) ? values : [])].filter(
        Boolean,
      ),
    ),
  ]
    .map((x) => safeUrl(x))
    .filter(Boolean);
}
export function variants(p) {
  let v = p.variants;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      v = [];
    }
  }
  if (Array.isArray(v) && v.length)
    return v.map((x, i) =>
      typeof x === "string"
        ? { id: String(i), label: x }
        : {
            ...x,
            id: String(x.id ?? i),
            stock: x.quantity ?? x.stock,
            available:
              p.in_stock !== false &&
              p.available !== false &&
              x.available !== false,
            label:
              x.label ||
              [x.size, x.color].filter(Boolean).join(" / ") ||
              x.name ||
              "Variante",
          },
    );
  let sizes = p.sizes;
  if (typeof sizes === "string") {
    try {
      sizes = JSON.parse(sizes);
    } catch {
      sizes = sizes.split(",");
    }
  }
  return (Array.isArray(sizes) && sizes.length ? sizes : ["Única"]).map(
    (x, i) => ({
      id: "size:" + String(x),
      label: String(x),
      available: p.in_stock !== false && p.available !== false,
    }),
  );
}
export function whatsapp(text, studio = false) {
  const phone = String(
    studio
      ? state.settings.contacts.studio_whatsapp
      : state.settings.contacts.store_whatsapp,
  ).replace(/\D/g, "");
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
export function goWhatsApp(text, studio = false, targetWindow = null) {
  track(studio ? "studio_contact_click" : "whatsapp_click");
  const url = whatsapp(text, studio);
  if (targetWindow) {
    targetWindow.location.replace(url);
  } else if (arguments.length >= 3) {
    location.assign(url);
  } else window.open(url, "_blank", "noopener,noreferrer");
}
export function track(event, properties = {}) {
  if (readLocal("boleta-analytics", false) !== true) return;
  fetch("/api/events", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event,
      ...(properties.product_id ? { product_id: properties.product_id } : {}),
    }),
  }).catch(() => {});
}
function mergeSettings(input) {
  const result = structuredClone(defaults);
  for (const key of Object.keys(result)) {
    if (Array.isArray(result[key]))
      result[key] = Array.isArray(input?.[key]) ? input[key] : result[key];
    else result[key] = { ...result[key], ...(input?.[key] || {}) };
  }
  return result;
}
export function applySettings(input) {
  state.settings = mergeSettings(input);
  const s = state.settings;
  document.documentElement.style.setProperty(
    "--accent",
    /^#[0-9a-f]{6}$/i.test(s.brand.accent) ? s.brand.accent : "#60328A",
  );
  const fonts = [
    "Barlow Condensed",
    "Manrope",
    "Arial Black",
    "Arial",
    "Georgia",
    "Courier New",
    "Impact",
    "Helvetica",
    "Verdana",
    "Trebuchet MS",
    "system-ui",
    "DM Mono",
  ];
  document.documentElement.style.setProperty(
    "--heading",
    `"${fonts.includes(s.fonts.heading) ? s.fonts.heading : "Barlow Condensed"}",sans-serif`,
  );
  document.documentElement.style.setProperty(
    "--body",
    `"${fonts.includes(s.fonts.body) ? s.fonts.body : "Manrope"}",sans-serif`,
  );
  $("heroTitle").textContent = s.hero.title;
  $("heroEyebrow").textContent = s.hero.eyebrow;
  $("heroDescription").textContent = s.hero.description;
  $("heroCta").textContent = s.hero.cta + " ↗";
  $("heroGlasses").src = safeUrl(s.hero.image, defaults.hero.image);
  $("heroRing").src = safeUrl(
    s.hero.secondary_image,
    defaults.hero.secondary_image,
  );
  document
    .querySelectorAll(".brand img,.footer>img")
    .forEach((x) => (x.src = safeUrl(s.brand.logo, defaults.brand.logo)));
  $("logisticsSummary").textContent = `${arrivalText()} · ${s.logistics.note}`;
  $("studioTitle").textContent = s.studio.title;
  $("studioDescription").textContent = s.studio.description;
  $("studioButton").textContent = s.studio.cta + " ↗";
  $("footerWhatsApp").href = whatsapp("Hola BOLETA, tengo una consulta.");
  renderFaq();
  $("rewardSection").hidden = !(
    s.rewards.enabled &&
    s.rewards.terms &&
    s.rewards.prizes?.length
  );
  $("rewardTerms").textContent = s.rewards.terms || "";
  $("rewardPeek").hidden = $("rewardSection").hidden;
  renderRewardWheel();
  applyCopyAndSections();
  if (state.products.length) renderProducts();
}
let lastSectionOrder = "";
export const sectionIds = {
  radio: "radio",
  categories: "categoryCards",
  studio: "estudio",
  catalog: "catalogo",
  how: "como-encargar",
  faq: "preguntas",
  rewards: "rewardSection",
  community: "comunidad",
};
function applyCopyAndSections() {
  const c = state.settings.copy;
  const set = (selector, key) => {
    const el = document.querySelector(selector);
    if (el) el.textContent = c[key];
  };
  set("#radio h2", "radio_title");
  set("#radio .radio-copy p", "radio_description");
  set("#como-encargar>.micro", "how_eyebrow");
  set("#como-encargar h2", "how_title");
  for (let i = 1; i <= 3; i++) {
    set(
      "#como-encargar li:nth-child(" + i + ") strong",
      "how_step" + i + "_title",
    );
    set("#como-encargar li:nth-child(" + i + ") p", "how_step" + i + "_text");
  }
  set("#comunidad>.micro", "community_eyebrow");
  set("#comunidad>h2", "community_title");
  set("#comunidad>p:not(.micro):not(.privacy)", "community_description");
  set("#archiveTitle", "archive_title");
  set(".archive-intro", "archive_description");
  const sections = state.settings.site_sections;
  const order = sections.order.filter((id) => sectionIds[id]);
  const signature = JSON.stringify(order);
  if (lastSectionOrder !== signature) {
    const main = document.querySelector("main.shell"),
      footer = main.querySelector(".footer");
    for (const key of order) {
      const node = $(sectionIds[key]);
      main.insertBefore(node, footer);
      if (key === "radio") {
        main.insertBefore($("radioEmbed"), footer);
        main.insertBefore($("rewardPeek"), footer);
      }
    }
    lastSectionOrder = signature;
  }
  for (const [key, id] of Object.entries(sectionIds)) {
    if (key === "rewards")
      $(id).hidden =
        sections.hidden.includes(key) ||
        !(
          state.settings.rewards.enabled &&
          state.settings.rewards.terms &&
          state.settings.rewards.prizes.length
        );
    else $(id).hidden = sections.hidden.includes(key);
  }
  if (sections.hidden.includes("radio")) $("radioEmbed").hidden = true;
  $("rewardPeek").hidden = $("rewardSection").hidden;
}
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $("themeToggle").setAttribute(
    "aria-label",
    theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro",
  );
  $("themeToggle").firstChild.textContent = theme === "dark" ? "☾ " : "☼ ";
  document.querySelector('meta[name="theme-color"]').content =
    theme === "dark" ? "#0b090f" : "#f4f1eb";
}
const savedTheme = readLocal("boleta-theme", null);
setTheme(
  savedTheme ||
    (window.matchMedia?.("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark"),
);
$("themeToggle").onclick = () => {
  const theme =
    document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  setTheme(theme);
  writeLocal("boleta-theme", theme);
};
export function renderProducts() {
  const query = norm(state.query).split(/\s+/).filter(Boolean);
  const list = state.products.filter(
    (p) =>
      p.status !== "descartado" &&
      p.status !== "archivado" &&
      (state.category === "Todo" || categoryOf(p) === state.category) &&
      query.every((q) =>
        norm(
          [p.title, p.name, p.brand, p.code, p.category, p.material].join(" "),
        ).includes(q),
      ),
  );
  if (state.sort === "low")
    list.sort(
      (a, b) => (priceNumber(a) ?? Infinity) - (priceNumber(b) ?? Infinity),
    );
  if (state.sort === "high")
    list.sort((a, b) => (priceNumber(b) ?? -1) - (priceNumber(a) ?? -1));
  if (state.sort === "name")
    list.sort((a, b) =>
      (a.title || a.name || "").localeCompare(b.title || b.name || ""),
    );
  $("productCount").textContent = `${list.length} piezas en el archivo`;
  $("productGrid").innerHTML = list.length
    ? list
        .slice(0, state.limit)
        .map(
          (p, i) =>
            `<article class="product-card" data-id="${esc(p.id)}"><button class="product-open" data-open="${esc(p.id)}" aria-label="Ver ${esc(p.title || p.name)}"><div class="product-photo"><img src="${esc(thumbnail(p))}" alt="${esc(p.title || p.name)}" width="400" height="450" loading="lazy" decoding="async"><span class="product-index">${String(i + 1).padStart(2, "0")} / ${esc(p.code || p.id)}</span><span class="card-arrow" aria-hidden="true">↗</span></div><div class="product-info"><p class="micro">${esc(categoryOf(p))} / ${esc(p.brand || "BOLETA")}</p><h3>${esc(p.title || p.name)}</h3><span class="price">${esc(priceLabel(p))}</span></div></button>${state.editor ? `<button class="product-edit-button" data-edit="${esc(p.id)}">✎ Editar esta pieza</button>` : ""}</article>`,
        )
        .join("")
    : '<p class="empty">No hay piezas con esos filtros. Prueba otra búsqueda.</p>';
  $("loadMore").hidden = list.length <= state.limit;
  const cats = ["Todo", ...new Set(state.products.map(categoryOf))];
  $("categoryTabs").innerHTML = cats
    .map(
      (x) =>
        `<button class="${state.category === x ? "active" : ""}" data-filter="${esc(x)}" aria-pressed="${state.category === x}">${esc(x)}</button>`,
    )
    .join("");
}
export async function loadProducts() {
  state.products = await api("/api/products");
  if (!Array.isArray(state.products))
    throw new Error("El archivo no está disponible.");
  renderProducts();
  updateCart();
}
$("productGrid").onclick = (e) => {
  const open = e.target.closest("[data-open]");
  if (open) openProduct(open.dataset.open);
  const edit = e.target.closest("[data-edit]");
  if (edit)
    document.dispatchEvent(
      new CustomEvent("boleta-edit-product", { detail: edit.dataset.edit }),
    );
};
$("categoryTabs").onclick = (e) => {
  const b = e.target.closest("[data-filter]");
  if (!b) return;
  state.category = b.dataset.filter;
  state.limit = 24;
  renderProducts();
};
$("categoryCards").onclick = (e) => {
  const b = e.target.closest("[data-category]");
  if (!b) return;
  state.category = b.dataset.category;
  state.limit = 24;
  renderProducts();
  $("catalogo").scrollIntoView();
  $("searchInput").focus({ preventScroll: true });
};
$("searchInput").oninput = (e) => {
  state.query = e.target.value;
  state.limit = 24;
  renderProducts();
};
$("sortSelect").onchange = (e) => {
  state.sort = e.target.value;
  renderProducts();
};
$("loadMore").onclick = () => {
  state.limit += 24;
  renderProducts();
};
export function openProduct(id) {
  const p = state.products.find((x) => String(x.id) === String(id));
  if (!p) return;
  state.product = p;
  state.variant = null;
  state.quantity = 1;
  state.image = 0;
  renderProductDialog();
  openDialog("productDialog");
  track("view_product", { product_id: String(p.id) });
}
function renderProductDialog() {
  const p = state.product,
    photos = gallery(p),
    vs = variants(p),
    priced =
      state.variant && Number(state.variant.price) > 0
        ? {
            ...p,
            numeric_usd: Number(state.variant.price),
            price: Number(state.variant.price),
          }
        : p;
  $("productContent").innerHTML =
    `<div class="product-layout"><button class="icon-btn product-close close-dialog" aria-label="Cerrar producto">×</button><div class="product-gallery"><div class="product-main-image"><img id="detailImage" src="${esc(photos[state.image] || "/images/boleta-logo.webp")}" alt="${esc(p.title || p.name)} — foto ${state.image + 1}" width="650" height="650">${photos.length > 1 ? `<div class="gallery-controls"><button data-gallery-prev aria-label="Foto anterior">←</button><span>${state.image + 1} / ${photos.length}</span><button data-gallery-next aria-label="Foto siguiente">→</button></div>` : ""}</div><div class="gallery-thumbs">${photos.map((src, i) => `<button data-photo="${i}" class="${i === state.image ? "active" : ""}" aria-label="Ver foto ${i + 1}" aria-pressed="${i === state.image}"><img src="${esc(thumbnail(src))}" alt="" width="62" height="62" loading="lazy"></button>`).join("")}</div></div><div class="product-detail"><p class="micro">${esc(p.code || p.id)} / ${esc(p.brand || "BOLETA")}</p><h2 id="productTitle">${esc(p.title || p.name)}</h2><p class="detail-price">${esc(priceLabel(priced))}</p>${bcvPrice(priced) ? `<p class="privacy">${esc(bcvPrice(priced))}</p>` : ""}<p class="product-description">${esc(p.description || p.material || "El detalle hace la diferencia. Consulta las medidas y disponibilidad antes de encargar.")}</p><p class="field-label" id="variantLabel">Elige tu variante</p><div class="variant-pills" role="group" aria-labelledby="variantLabel">${vs.map((v) => `<button data-variant="${esc(v.id)}" class="${state.variant?.id === v.id ? "active" : ""}" aria-pressed="${state.variant?.id === v.id}" ${v.available === false || v.stock === 0 ? "disabled" : ""}>${esc(v.label)}</button>`).join("")}</div><div class="quantity-row"><span>Cantidad</span><button data-qty="-1" aria-label="Reducir cantidad">−</button><input id="detailQuantity" type="number" min="1" max="99" value="${state.quantity}" aria-label="Cantidad"><button data-qty="1" aria-label="Aumentar cantidad">+</button></div><div class="logistics-note">${esc(arrivalText())}<br>${esc(state.settings.logistics.note)}</div><button id="addSelection" class="button primary" ${!state.variant ? "disabled" : ""}>${state.variant ? "Añadir a mi selección ↗" : "Primero elige tu variante"}</button><p class="privacy">Consulta por WhatsApp antes de pagar. Añadir una pieza no confirma una reserva.</p></div></div>`;
}
function bcvPrice(p) {
  const { bcv_rate, bcv_date } = state.settings.payment || {};
  return priceNumber(p) &&
    Number(bcv_rate) > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(bcv_date || "")
    ? `Bs. ${(priceNumber(p) * Number(bcv_rate)).toLocaleString("es-VE", { maximumFractionDigits: 2 })} · tasa ${dateLabel(bcv_date)}`
    : "";
}
$("productContent").onclick = (e) => {
  if (
    e.target.closest("[data-gallery-prev]") ||
    e.target.closest("[data-gallery-next]")
  ) {
    const len = gallery(state.product).length;
    state.image =
      (state.image + (e.target.closest("[data-gallery-next]") ? 1 : -1) + len) %
      len;
    renderProductDialog();
  }
  const photo = e.target.closest("[data-photo]");
  if (photo) {
    state.image = Number(photo.dataset.photo);
    renderProductDialog();
    $("productContent")
      .querySelector('[data-photo="' + state.image + '"]')
      ?.focus({ preventScroll: true });
  }
  const v = e.target.closest("[data-variant]");
  if (v) {
    state.variant = variants(state.product).find(
      (x) => x.id === v.dataset.variant,
    );
    renderProductDialog();
    Array.from($("productContent").querySelectorAll("[data-variant]"))
      .find((b) => b.dataset.variant === state.variant.id)
      ?.focus({ preventScroll: true });
    track("select_variant", {
      product_id: String(state.product.id),
      variant: state.variant.id,
    });
  }
  const qty = e.target.closest("[data-qty]");
  if (qty) {
    state.quantity = Math.min(
      99,
      Math.max(1, state.quantity + Number(qty.dataset.qty)),
    );
    $("detailQuantity").value = state.quantity;
  }
  if (e.target.closest("#addSelection")) addToCart();
};
$("productContent").onchange = (e) => {
  if (e.target.id === "detailQuantity")
    state.quantity = Math.min(
      99,
      Math.max(1, Math.floor(Number(e.target.value) || 1)),
    );
  if (e.target.id === "detailQuantity") e.target.value = state.quantity;
};
function addToCart() {
  if (!state.product || !state.variant) return;
  const p = state.product,
    v = state.variant;
  const stock =
    Number.isFinite(Number(v.stock)) && v.stock !== null
      ? Number(v.stock)
      : null;
  const item = state.cart.find(
    (x) => String(x.id) === String(p.id) && x.variant_id === v.id,
  );
  if (stock !== null && (item?.quantity || 0) + state.quantity > stock) {
    toast("Esa cantidad supera la disponibilidad de esta variante.");
    return;
  }
  if (item) item.quantity = Math.min(99, item.quantity + state.quantity);
  else
    state.cart.push({
      id: String(p.id),
      variant_id: v.id,
      variant: v.label,
      quantity: state.quantity,
    });
  updateCart();
  track("add_to_selection", {
    product_id: String(p.id),
    variant: v.id,
    quantity: state.quantity,
  });
  toast("Pieza añadida a tu selección.");
  closeDialog($("productDialog"));
}
export function updateCart() {
  state.cart = state.cart
    .filter(
      (x) =>
        x &&
        typeof x.id === "string" &&
        typeof x.variant_id === "string" &&
        x.quantity > 0,
    )
    .map((x) => ({ ...x, quantity: Math.min(99, Math.floor(x.quantity)) }));
  writeLocal("boleta-selection-v2", state.cart);
  const count = state.cart.reduce((s, x) => s + x.quantity, 0);
  $("cartBadge").textContent = count;
  $("floatingCount").textContent = count;
  $("floatingCart").hidden = count === 0;
  document.body.classList.toggle("has-selection", count > 0);
  if ($("selectionDialog").open) renderSelection();
}
function selectionRows() {
  return state.cart.map((x) => {
    const p = state.products.find((p) => String(p.id) === x.id),
      v = p ? variants(p).find((v) => v.id === x.variant_id) : null;
    return {
      item: x,
      p:
        p && v && Number(v.price) > 0
          ? { ...p, numeric_usd: Number(v.price), price: Number(v.price) }
          : p,
      v,
    };
  });
}
function paymentText(total, pending) {
  const p = state.settings.payment || {};
  let result = "";
  const dated =
    Number(p.bcv_rate) > 0 && /^\d{4}-\d{2}-\d{2}$/.test(p.bcv_date || "");
  if (dated)
    result =
      (pending ? "Subtotal conocido" : "Total de referencia") +
      " en Bs. " +
      (total * Number(p.bcv_rate)).toLocaleString("es-VE", {
        maximumFractionDigits: 2,
      }) +
      " · tasa configurada " +
      Number(p.bcv_rate) +
      " Bs./USD del " +
      dateLabel(p.bcv_date) +
      ".";
  if (Number(p.deposit_percent) > 0 && !pending)
    result +=
      " Anticipo configurado " +
      Number(p.deposit_percent) +
      "%: USD " +
      ((total * Number(p.deposit_percent)) / 100).toFixed(2) +
      (dated
        ? " / Bs. " +
          (
            (total * Number(p.bcv_rate) * Number(p.deposit_percent)) /
            100
          ).toLocaleString("es-VE", { maximumFractionDigits: 2 })
        : "") +
      ". Confirma condiciones antes de pagar.";
  return result;
}
function selectionSummary() {
  let total = 0,
    pending = false;
  for (const { item, p, v } of selectionRows()) {
    if (
      !p ||
      !v ||
      v.available === false ||
      v.stock === 0 ||
      (v.stock !== null &&
        v.stock !== undefined &&
        item.quantity > Number(v.stock)) ||
      priceNumber(p) === null
    )
      pending = true;
    else total += priceNumber(p) * item.quantity;
  }
  return { total, pending };
}
export function renderSelection() {
  const { total, pending } = selectionSummary();
  $("selectionContent").innerHTML = state.cart.length
    ? `<div class="selection-items">${selectionRows()
        .map(
          ({ item: x, p, v }, i) =>
            `<div class="selection-item"><img src="${esc(thumbnail(p))}" alt="" width="75" height="90"><div><h3>${esc(p?.title || p?.name || "Producto pendiente de confirmar")}</h3><p>${esc(x.variant)} · ${p ? esc(priceLabel(p)) : "Precio por confirmar"}${!v || v.available === false || v.stock === 0 || (v.stock !== undefined && v.stock !== null && x.quantity > Number(v.stock)) ? " · DISPONIBILIDAD POR CONFIRMAR" : ""}</p><div class="quantity-row"><button data-cart-qty="${i}" data-delta="-1" aria-label="Reducir cantidad">−</button><span>${x.quantity}</span><button data-cart-qty="${i}" data-delta="1" aria-label="Aumentar cantidad">+</button><button data-remove="${i}" class="selection-remove">Quitar</button></div></div></div>`,
        )
        .join(
          "",
        )}</div><div class="selection-bottom"><div class="selection-total"><span>${pending ? "Subtotal conocido" : "Total de referencia"}</span><span>${total.toLocaleString("es-VE", { style: "currency", currency: "USD" })}</span></div>${pending ? "<p>Hay precios o disponibilidad por confirmar. Solicita la cotización completa.</p>" : ""}${paymentText(total, pending) ? `<p>${esc(paymentText(total, pending))}</p>` : ""}<p>${esc(arrivalText())}. ${esc(state.settings.logistics.note)} Consultar no confirma reserva ni pago.</p><button id="checkoutButton" class="button primary">Consultar por WhatsApp ↗</button></div>`
    : '<div class="empty"><p>Tu selección empieza con una pieza.</p><button class="small-button" id="continueShopping">Explorar el archivo ↗</button></div>';
}
function openSelection() {
  renderSelection();
  openDialog("selectionDialog");
}
$("cartButton").onclick = openSelection;
$("floatingCart").onclick = openSelection;
$("selectionContent").onclick = async (e) => {
  const q = e.target.closest("[data-cart-qty]");
  if (q) {
    const x = state.cart[Number(q.dataset.cartQty)];
    const p = state.products.find((p) => String(p.id) === x.id),
      v = p ? variants(p).find((v) => v.id === x.variant_id) : null;
    const next = Math.min(
      99,
      Math.max(1, x.quantity + Number(q.dataset.delta)),
    );
    if (v?.stock !== undefined && v.stock !== null && next > Number(v.stock)) {
      toast("Esa cantidad supera la disponibilidad de esta variante.");
      return;
    }
    x.quantity = next;
    updateCart();
  }
  const r = e.target.closest("[data-remove]");
  if (r) {
    state.cart.splice(Number(r.dataset.remove), 1);
    updateCart();
  }
  if (e.target.closest("#continueShopping")) {
    closeDialog($("selectionDialog"));
    $("catalogo").scrollIntoView();
  }
  if (e.target.closest("#checkoutButton")) {
    const checkoutWindow = window.open("about:blank", "_blank");
    if (checkoutWindow) checkoutWindow.opener = null;
    try {
      await loadProducts();
    } catch {
      checkoutWindow?.close();
      toast("No pudimos verificar el catálogo actual. Intenta nuevamente.");
      return;
    }
    const { total, pending } = selectionSummary();
    const lines = selectionRows().map(
      ({ item: x, p, v }) =>
        `• ${p?.code || x.id} ${p?.title || p?.name || "Producto por confirmar"} | ${x.variant} | Cantidad: ${x.quantity} | ${p ? priceLabel(p) : "por confirmar"}${!v || v.available === false || v.stock === 0 || (v.stock !== undefined && v.stock !== null && x.quantity > Number(v.stock)) ? " | DISPONIBILIDAD POR CONFIRMAR" : ""}`,
    );
    goWhatsApp(
      `Hola BOLETA, quiero consultar esta selección:\n\n${lines.join("\n")}\n\n${pending ? "Subtotal conocido" : "Total de referencia"}: $${total.toFixed(2)}${pending ? " + precios pendientes" : ""}.\n${arrivalText()}.\n${paymentText(total, pending)}\nPor favor confirma disponibilidad, medidas, precio final, anticipo y condiciones de entrega. Entiendo que este mensaje no confirma una reserva.`,
      false,
      checkoutWindow,
    );
  }
};
function renderFaq() {
  $("faqList").innerHTML = state.settings.faq
    .map(
      (f, i) =>
        `<details data-faq="${i}"><summary>${esc(f.question)}</summary><p>${esc(f.answer)}</p></details>`,
    )
    .join("");
  $("guideFaq").innerHTML = state.settings.faq
    .map(
      (f, i) =>
        `<button class="guide-option" data-guide-faq="${i}" aria-expanded="false">${esc(f.question)} <span>+</span></button><p class="guide-answer" id="guideAnswer${i}" hidden>${esc(f.answer)}</p>`,
    )
    .join("");
}
$("faqList").addEventListener(
  "toggle",
  (e) => {
    if (e.target.open)
      track("faq_open", { question_index: Number(e.target.dataset.faq) });
  },
  true,
);
$("guideFaq").onclick = (e) => {
  const b = e.target.closest("[data-guide-faq]");
  if (!b) return;
  const a = $("guideAnswer" + b.dataset.guideFaq);
  a.hidden = !a.hidden;
  b.setAttribute("aria-expanded", String(!a.hidden));
  track("faq_open", { question_index: Number(b.dataset.guideFaq) });
};
function dismissInvite() {
  $("guideInvite").hidden = true;
  writeLocal("boleta-guide-dismissed", true);
}
function openGuide() {
  dismissInvite();
  openDialog("guideDialog");
}
$("guideCard").onclick = openGuide;
$("guideLauncher").onclick = openGuide;
$("dismissGuideInvite").onclick = dismissInvite;
$("guideInviteButton").onclick = () => {
  dismissInvite();
  startTutorial();
};
$("guideHuman").onclick = () =>
  goWhatsApp("Hola BOLETA, tengo una duda sobre el catálogo.");
let tourIndex = 0,
  tourFocus = null;
const steps = [
  {
    target: "categoryCards",
    title: "Encuentra tu frecuencia.",
    text: "Lentes y anillos a un toque. También puedes explorar todas las piezas en el archivo.",
  },
  {
    target: "catalogControls",
    title: "Ve directo a tu pieza.",
    text: "Busca por nombre, marca o código y usa las categorías para filtrar.",
  },
  {
    target: "productGrid",
    title: "Mira los detalles.",
    text: "Abre una pieza para ver las fotos, elegir su variante y añadir la cantidad a tu selección.",
  },
  {
    target: "floatingCart",
    title: "Tu selección, a tu ritmo.",
    text: "Aquí verás las piezas que añadas. Puedes ajustar cantidades o quitar cualquiera.",
  },
  {
    target: "como-encargar",
    title: "Confirmamos por WhatsApp.",
    text: "Desde tu selección, pulsa Consultar. Confirmaremos disponibilidad, precio y condiciones contigo antes de pagar.",
  },
];
function drawTour() {
  tourFocus?.classList.remove("tutorial-focus");
  const step = steps[tourIndex];
  let target = $(step.target);
  if (step.target === "productGrid")
    target = $("productGrid").querySelector(".product-card") || target;
  if (target.hidden)
    target = $("cartButton").offsetParent
      ? $("cartButton")
      : $("como-encargar");
  tourFocus = target;
  target.classList.add("tutorial-focus");
  target.scrollIntoView({
    block: "center",
    behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "instant"
      : "smooth",
  });
  $("tutorialStep").textContent =
    `GUÍA BOLETA / ${tourIndex + 1} DE ${steps.length}`;
  $("tutorialTitle").textContent = step.title;
  $("tutorialText").textContent = step.text;
  $("tutorialPrev").disabled = tourIndex === 0;
  $("tutorialNext").textContent =
    tourIndex === steps.length - 1 ? "Listo, a explorar ↗" : "Siguiente ↗";
  $("tutorial").hidden = false;
  $("tutorialNext").focus({ preventScroll: true });
}
function startTutorial() {
  document.querySelectorAll("dialog[open]").forEach(closeDialog);
  $("siteMenu").hidden = true;
  $("menuButton").setAttribute("aria-expanded", "false");
  tourIndex = 0;
  drawTour();
}
function endTutorial() {
  tourFocus?.classList.remove("tutorial-focus");
  $("tutorial").hidden = true;
  $("guideLauncher").focus({ preventScroll: true });
}
$("tutorialButton").onclick = startTutorial;
$("startTutorial").onclick = startTutorial;
$("guideTutorial").onclick = startTutorial;
$("tutorialNext").onclick = () => {
  if (++tourIndex >= steps.length) endTutorial();
  else drawTour();
};
$("tutorialPrev").onclick = () => {
  if (tourIndex > 0) {
    tourIndex--;
    drawTour();
  }
};
$("tutorialClose").onclick = endTutorial;
$("menuButton").onclick = () => {
  $("siteMenu").hidden = !$("siteMenu").hidden;
  $("menuButton").setAttribute("aria-expanded", String(!$("siteMenu").hidden));
};
$("siteMenu").addEventListener("click", (e) => {
  if (e.target.closest("a")) {
    $("siteMenu").hidden = true;
    $("menuButton").setAttribute("aria-expanded", "false");
  }
});
$("radioButton").onclick = () => {
  if (!$("radioEmbed").hidden) {
    $("radioEmbed").hidden = true;
    $("radioEmbed").replaceChildren();
    $("radioButton").textContent = "▷ Escuchar playlist";
    return;
  }
  const u = new URL(
    safeUrl(state.settings.radio.playlist_url, defaults.radio.playlist_url),
  );
  const match = u.pathname.match(/(?:embed\/)?playlist\/([A-Za-z0-9]+)/);
  if (u.hostname !== "open.spotify.com" || !match) {
    toast("La playlist aún no está configurada.");
    return;
  }
  const frame = document.createElement("iframe");
  frame.src = `https://open.spotify.com/embed/playlist/${match[1]}?utm_source=generator`;
  frame.title = "BOLETA Radio — Spotify";
  frame.allow =
    "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
  frame.loading = "lazy";
  $("radioEmbed").append(frame);
  $("radioEmbed").hidden = false;
  $("radioButton").textContent = "Cerrar reproductor ×";
  track("radio_open");
};
$("studioButton").onclick = () =>
  goWhatsApp(
    "Hola Digital Solution, vi la experiencia BOLETA y quiero una vitrina web para mi negocio. Me interesa conversar sobre mi proyecto.",
    true,
  );
$("leadForm").onsubmit = async (e) => {
  e.preventDefault();
  const form = e.currentTarget,
    b = form.querySelector("button[type=submit]"),
    f = new FormData(form);
  b.disabled = true;
  $("leadStatus").textContent = "Enviando…";
  try {
    const r = await api("/api/leads", {
      method: "POST",
      body: JSON.stringify({
        name: f.get("name"),
        whatsapp: f.get("whatsapp"),
        consent: f.get("consent") === "on",
        marketing_consent: f.get("marketing") === "on",
        consent_version: "2026-10",
        website: f.get("website"),
      }),
    });
    if (!r.success)
      throw new Error("No recibimos confirmación. Intenta otra vez.");
    $("leadStatus").textContent =
      "Recibimos tu contacto. Gracias por conectar con BOLETA.";
    form.reset();
  } catch (err) {
    $("leadStatus").textContent = err.message;
  } finally {
    b.disabled = false;
  }
};
function renderRewardWheel() {
  const prizes = state.settings.rewards.prizes || [];
  if (!prizes.length) return;
  let stage = $("rewardWheelStage");
  if (!stage) {
    stage = document.createElement("div");
    stage.id = "rewardWheelStage";
    stage.className = "reward-wheel-stage";
    $("rewardTerms").after(stage);
  }
  const n = prizes.length,
    colors = ["#60328A", "#2d183f", "#9764c3", "#463052"];
  stage.innerHTML =
    '<div class="wheel-pointer" aria-hidden="true">▼</div><div id="rewardWheel" class="reward-wheel" aria-hidden="true"><span>BOLETA</span></div><div class="wheel-legend"></div>';
  const wheel = $("rewardWheel");
  wheel.style.background =
    "conic-gradient(" +
    prizes
      .map(
        (p, i) =>
          colors[i % colors.length] +
          " " +
          (i * 360) / n +
          "deg " +
          ((i + 1) * 360) / n +
          "deg",
      )
      .join(",") +
    ")";
  prizes.forEach((p, i) => {
    const label = document.createElement("b");
    label.textContent = String(i + 1).padStart(2, "0");
    label.style.transform =
      "rotate(" +
      ((i + 0.5) * 360) / n +
      "deg) translateY(-78px) rotate(-" +
      ((i + 0.5) * 360) / n +
      "deg)";
    wheel.append(label);
  });
  stage.querySelector(".wheel-legend").innerHTML = prizes
    .map(
      (p, i) =>
        "<span>" +
        String(i + 1).padStart(2, "0") +
        " / " +
        esc(p.label) +
        "</span>",
    )
    .join("");
}
let wheelRotation = 0;
$("spinButton").onclick = async () => {
  const b = $("spinButton");
  b.disabled = true;
  $("rewardResult").textContent = "Abriendo tu detalle…";
  try {
    const r = await api("/api/rewards/spin", { method: "POST", body: "{}" });
    const prizes = state.settings.rewards.prizes || [],
      idx = prizes.findIndex((p) => p.id === r.prize.id);
    if (idx >= 0 && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const target = 360 - ((idx + 0.5) * 360) / prizes.length;
      wheelRotation = Math.ceil(wheelRotation / 360) * 360 + 1440 + target;
      $("rewardWheel").style.transform = "rotate(" + wheelRotation + "deg)";
      await new Promise((resolve) => setTimeout(resolve, 2200));
    }
    $("rewardResult").textContent =
      `${r.already_spun ? "Tu detalle guardado" : "Tu detalle"}: ${r.prize.label}. ${r.prize.description || ""}${r.claim_code ? " Código: " + r.claim_code : ""}`;
    if (r.prize.kind === "wallpaper") {
      let dl = $("wallpaperDownload");
      if (!dl) {
        dl = document.createElement("button");
        dl.id = "wallpaperDownload";
        dl.className = "button secondary";
        $("rewardResult").after(dl);
      }
      dl.textContent = "Descargar mi fondo BOLETA ↓";
      dl.onclick = async () => {
        try {
          const { downloadWallpaper } = await import("./wallpaper.js");
          await downloadWallpaper(r.prize.design);
        } catch {
          toast("No pudimos preparar la descarga. Intenta nuevamente.");
        }
      };
    }
  } catch (err) {
    $("rewardResult").textContent = err.message;
  } finally {
    b.disabled = false;
  }
};
$("privacyButton").onclick = () => {
  $("noticeTitle").textContent = "TUS DATOS, EN CLARO.";
  $("noticeContent").innerHTML =
    `<p>Usamos el nombre y WhatsApp que compartas para responder tu consulta. Solo enviamos novedades si marcas la casilla opcional.</p><p>Puedes pedir acceso, corrección o eliminación y darte de baja escribiendo BAJA a nuestro WhatsApp.</p><a class="button secondary" href="${esc(whatsapp("BAJA. Quiero retirar mi consentimiento y eliminar mis datos de contacto."))}" target="_blank" rel="noopener">Solicitar baja por WhatsApp ↗</a><p>Las métricas opcionales cuentan navegación sin incluir nombre ni teléfono. Un clic en WhatsApp no se considera una venta.</p><label class="checkbox"><input type="checkbox" id="analyticsConsent" ${readLocal("boleta-analytics", false) ? "checked" : ""}><span>Permito métricas de navegación anónimas para mejorar la experiencia.</span></label>`;
  openDialog("noticeDialog");
  $("analyticsConsent").onchange = (e) => {
    writeLocal("boleta-analytics", e.target.checked);
    if (e.target.checked) track("page_view");
  };
};
const scrollMarks = new Set();
window.addEventListener(
  "scroll",
  () => {
    const total = document.documentElement.scrollHeight - innerHeight;
    if (total <= 0) return;
    const percent = Math.round((scrollY / total) * 100);
    for (const n of [25, 50, 75, 100])
      if (percent >= n && !scrollMarks.has(n)) {
        scrollMarks.add(n);
        track("scroll_" + n);
      }
  },
  { passive: true },
);
$("year").textContent = new Date().getFullYear();
document.querySelectorAll("dialog").forEach(wireDialog);
$("editorButton").onclick = () =>
  import("./editor.js")
    .then((m) => m.openEditor())
    .catch(() => toast("No pudimos abrir el editor. Recarga la página."));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("tutorial").hidden) endTutorial();
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "e") {
    e.preventDefault();
    $("editorButton").click();
  }
});
async function init() {
  track("page_view");
  try {
    applySettings(await api("/api/site-settings"));
  } catch {
    applySettings(defaults);
  }
  try {
    await loadProducts();
  } catch (err) {
    $("productCount").textContent = "Archivo no disponible temporalmente";
    $("productGrid").innerHTML =
      `<div class="empty"><p>${esc(err.message)}</p><button id="retryProducts" class="small-button">Intentar de nuevo</button></div>`;
    $("retryProducts").onclick = () =>
      loadProducts().catch((e) => toast(e.message));
  }
  if (
    "IntersectionObserver" in window &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    document.body.classList.add("motion-ready");
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            observer.unobserve(e.target);
          }
        }),
      { threshold: 0.08 },
    );
    document.querySelectorAll(".reveal").forEach((x) => observer.observe(x));
  }
  if (!readLocal("boleta-guide-dismissed", false))
    setTimeout(() => {
      $("guideInvite").hidden = false;
    }, 1800);
  if (new URLSearchParams(location.search).has("editor"))
    $("editorButton").click();
}
init();
