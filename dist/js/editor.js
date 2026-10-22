import {
  $,
  esc,
  api,
  toast,
  state,
  applySettings,
  renderProducts,
  loadProducts,
  safeUrl,
  gallery,
  openDialog,
  closeDialog,
  wireDialog,
  sectionIds,
} from "./app.js";
let csrf = "",
  version = 0,
  draft = null,
  published = null,
  panelTab = "content",
  adminProducts = [],
  dirty = false,
  activeProduct = null,
  photos = [];
const root = $("editorRoot");
let toolbarObserver = null;
function observeToolbar(bar) {
  toolbarObserver?.disconnect();
  const update = () =>
    document.documentElement.style.setProperty(
      "--editor-toolbar-height",
      bar.getBoundingClientRect().height + "px",
    );
  update();
  if ("ResizeObserver" in window) {
    toolbarObserver = new ResizeObserver(update);
    toolbarObserver.observe(bar);
  } else window.addEventListener("resize", update, { passive: true });
}

const adminApi = (path, options = {}) =>
  api(path, {
    ...options,
    headers: { "X-CSRF-Token": csrf, ...options.headers },
  });
function newDialog(id, title, body) {
  $(id)?.remove();
  const d = document.createElement("dialog");
  d.id = id;
  d.className = "sheet admin-dialog";
  d.innerHTML = `<div class="dialog-head"><h2>${esc(title)}</h2><button class="icon-btn close-dialog" aria-label="Cerrar">×</button></div>${body}`;
  root.append(d);
  wireDialog(d);
  return d;
}
export async function openEditor() {
  try {
    const session = await api("/api/auth/session");
    if (!session.authenticated) {
      login();
      return;
    }
    csrf = session.csrf_token;
    await enter();
  } catch (err) {
    toast(err.message);
  }
}
function login() {
  const d = newDialog(
    "adminLogin",
    "ACCESO AL ESTUDIO.",
    `<form id="adminLoginForm" class="admin-form"><p class="editor-note">Acceso privado. Tu contraseña se verifica en el servidor; nunca se guarda en este navegador.</p><label>Contraseña de administración<input name="password" type="password" autocomplete="current-password" required></label><button class="button primary">Entrar al editor ↗</button><p id="adminLoginStatus" role="status"></p></form>`,
  );
  $("adminLoginForm").onsubmit = async (e) => {
    e.preventDefault();
    const b = e.currentTarget.querySelector("button");
    b.disabled = true;
    try {
      await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          password: new FormData(e.currentTarget).get("password"),
        }),
      });
      const session = await api("/api/auth/session");
      csrf = session.csrf_token;
      closeDialog(d);
      await enter();
    } catch (err) {
      $("adminLoginStatus").textContent = err.message;
    } finally {
      b.disabled = false;
    }
  };
  openDialog(d);
}
async function enter() {
  const data = await adminApi("/api/admin/site-settings");
  version = data.version;
  draft = structuredClone(data.draft);
  published = structuredClone(data.published);
  dirty = false;
  state.editor = true;
  applySettings(draft);
  draft = structuredClone(state.settings);
  renderBar();
  renderPanel("content");
  renderProducts();
  toast("Editor activo. Estás viendo el borrador privado.");
}
function renderBar() {
  document.querySelector(".editor-bar")?.remove();
  const bar = document.createElement("div");
  bar.className = "editor-bar";
  bar.innerHTML = `<strong>✦ ESTUDIO BOLETA <span id="draftStatus">BORRADOR · v${version}</span></strong><div class="editor-bar-actions"><button id="openSettings">Personalizar</button><button id="newProduct">+ Pieza</button><button id="allProducts">Productos</button><button id="mobilePreview">Vista móvil</button><button id="saveDraft">Guardar borrador</button><button id="publishDraft" class="primary">Publicar</button><button id="exitEditor">Salir</button></div>`;
  document.body.prepend(bar);
  observeToolbar(bar);
  $("openSettings").onclick = () => renderPanel(panelTab);
  $("newProduct").onclick = () => editProduct(null);
  $("allProducts").onclick = () => renderPanel("products");
  $("mobilePreview").onclick = () => {
    document.body.classList.toggle("preview-mobile");
    toast(
      document.body.classList.contains("preview-mobile")
        ? "Vista móvil activada."
        : "Vista completa activada.",
    );
  };
  $("saveDraft").onclick = () => saveDraft();
  $("publishDraft").onclick = () => confirmPublish();
  $("exitEditor").onclick = exitEditor;
  document.querySelectorAll(".block-edit-button").forEach((x) => x.remove());
  const blocks = [
    ["hero", "Editar hero", "content", "hero.title"],
    ["estudio", "Editar estudio", "content", "studio.title"],
    ["radio", "Editar radio", "content", "copy.radio_title"],
    ["preguntas", "Editar guía", "faq", ""],
    ["como-encargar", "Editar pasos", "content", "copy.how_title"],
    ["comunidad", "Editar comunidad", "content", "copy.community_title"],
    ["catalogo", "Editar archivo", "content", "copy.archive_title"],
  ];
  blocks.forEach(([id, label, tab, path]) => {
    const block = $(id);
    block.classList.add("edit-highlight");
    const b = document.createElement("button");
    b.className = "block-edit-button";
    b.textContent = "✎ " + label;
    b.onclick = async () => {
      await renderPanel(tab);
      const field = path
        ? document.querySelector('[data-path="' + path + '"]')
        : document.querySelector("#faqEditor input");
      field?.focus();
      field?.scrollIntoView({ block: "center" });
    };
    block.append(b);
  });
}
function get(path) {
  return path.split(".").reduce((v, k) => v?.[k], draft);
}
function put(path, value) {
  const parts = path.split(".");
  let obj = draft;
  parts.slice(0, -1).forEach((k) => (obj = obj[k]));
  obj[parts.at(-1)] = value;
  dirty = true;
  $("draftStatus").textContent = "CAMBIOS SIN GUARDAR";
  applySettings(draft);
}
function field(
  label,
  path,
  { type = "text", area = false, options = null } = {},
) {
  const v = get(path);
  if (options)
    return `<label>${esc(label)}<select data-path="${esc(path)}">${options.map((x) => `<option value="${esc(x)}" ${x === v ? "selected" : ""}>${esc(x)}</option>`).join("")}</select></label>`;
  return `<label>${esc(label)}${area ? `<textarea data-path="${esc(path)}">${esc(v)}</textarea>` : `<input data-path="${esc(path)}" type="${type}" value="${esc(v ?? "")}">`}</label>`;
}
function uploadField(label, path) {
  return `<label>${esc(label)}<img class="editor-image-preview" src="${esc(safeUrl(get(path)))}" alt="Vista previa" width="300" height="120"><input data-upload="${esc(path)}" type="file" accept="image/png,image/jpeg,image/webp"><span class="micro">PNG, JPG o WebP · máximo 10 MB. Se guarda en tu almacenamiento configurado.</span></label>`;
}
async function renderPanel(tab = panelTab) {
  panelTab = tab;
  document.querySelector(".editor-panel")?.remove();
  const p = document.createElement("aside");
  p.className = "editor-panel";
  p.setAttribute("aria-label", "Personalizar página");
  p.innerHTML = `<div class="dialog-head"><div><p class="micro">EDICIÓN VISUAL / BORRADOR</p><h2>HAZLO TUYO.</h2></div><button class="icon-btn" id="closeEditorPanel" aria-label="Ver página sin panel">×</button></div><div class="editor-tabs">${[
    ["content", "Contenido"],
    ["style", "Estilo"],
    ["photos", "Fotos"],
    ["sections", "Secciones"],
    ["faq", "Guía"],
    ["products", "Piezas"],
    ["history", "Historial"],
    ["stats", "Métricas"],
    ["leads", "Contactos"],
  ]
    .map(
      ([id, label]) =>
        `<button data-tab="${id}" class="${tab === id ? "active" : ""}">${label}</button>`,
    )
    .join("")}</div><div class="editor-fields" id="editorFields"></div>`;
  root.append(p);
  $("closeEditorPanel").onclick = () => p.remove();
  p.querySelector(".editor-tabs").onclick = (e) => {
    const b = e.target.closest("[data-tab]");
    if (b) renderPanel(b.dataset.tab);
  };
  const el = $("editorFields");
  if (tab === "content")
    el.innerHTML = `<p class="editor-note">Los textos cambian en tu vista previa al escribir. Guarda borrador y publica cuando estés listo. Las piezas se guardan directamente y lo indican antes de confirmar.</p><h3>Hero principal</h3>${field("Línea superior", "hero.eyebrow")}${field("Frase principal (puedes usar saltos de línea)", "hero.title", { area: true })}${field("Descripción", "hero.description", { area: true })}${field("Botón principal", "hero.cta")}<h3>Entrega</h3>${field("Estado visible", "logistics.label")}${field("Llegada estimada", "logistics.estimated_arrival", { type: "date" })}${field("Nota logística", "logistics.note", { area: true })}<h3>Contactos y música</h3>${field("WhatsApp tienda (solo dígitos y país)", "contacts.store_whatsapp")}${field("WhatsApp Digital Solution", "contacts.studio_whatsapp")}${field("Enlace de playlist Spotify", "radio.playlist_url", { type: "url" })}<h3>Digital Solution</h3>${field("Titular", "studio.title", { area: true })}${field("Descripción", "studio.description", { area: true })}${field("Botón", "studio.cta")}<h3>Condiciones comerciales</h3><p class="editor-note">Déjalas vacías hasta confirmar. La tasa solo aparece con fecha; nunca se calcula a partir de precios BCV antiguos.</p>${field("Anticipo (%) opcional", "payment.deposit_percent", { type: "number" })}${field("Tasa Bs. por USD (opcional)", "payment.bcv_rate", { type: "number" })}${field("Fecha de la tasa", "payment.bcv_date", { type: "date" })}<h3>Archivo, radio y comunidad</h3>${field("Titular del archivo", "copy.archive_title", { area: true })}${field("Descripción del archivo", "copy.archive_description", { area: true })}${field("Título radio", "copy.radio_title")}${field("Descripción radio", "copy.radio_description", { area: true })}${field("Línea superior cómo encargar", "copy.how_eyebrow")}${field("Título cómo encargar", "copy.how_title", { area: true })}${[1, 2, 3].map((i) => field("Paso " + i + " / título", "copy.how_step" + i + "_title") + field("Paso " + i + " / explicación", "copy.how_step" + i + "_text", { area: true })).join("")}${field("Línea superior comunidad", "copy.community_eyebrow")}${field("Título comunidad", "copy.community_title", { area: true })}${field("Descripción comunidad", "copy.community_description", { area: true })}${saveButton()}`;
  if (tab === "style")
    el.innerHTML = `<h3>Identidad</h3>${field("Color principal", "brand.accent", { type: "color" })}${field("Fuente de titulares", "fonts.heading", { options: ["Barlow Condensed", "Arial Black", "Impact", "Georgia", "Manrope"] })}${field("Fuente del hero", "fonts.hero", { options: ["Georgia", "Barlow Condensed", "Arial Black", "Impact", "Manrope"] })}${field("Fuente de textos", "fonts.body", { options: ["Manrope", "Arial", "Georgia", "Courier New", "system-ui"] })}<h3>Vista previa</h3><div class="editor-row"><button class="button secondary" id="previewDark">☾ Oscuro</button><button class="button secondary" id="previewLight">☼ Claro</button></div><button class="button secondary" id="panelMobile">Ver en formato móvil</button><p class="editor-note">La preferencia claro/oscuro pertenece a cada visitante. Las fuentes se limitan a las opciones validadas del sitio.</p>${saveButton()}`;
  if (tab === "sections") {
    el.innerHTML =
      '<h3>Tu página, en tu orden.</h3><p class="editor-note">Usa las flechas para mover secciones. Hero, cabecera y pie son fijos. El archivo permanece visible para que siempre se pueda consultar.</p><div id="sectionsEditor"></div>' +
      saveButton();
    renderSectionsEditor();
  }
  if (tab === "photos")
    el.innerHTML = `<h3>Imágenes de portada</h3><p class="editor-note">Para conservar el diseño usa recortes con fondo transparente en lentes y anillo.</p>${uploadField("Fondo Vitrina Cromada", "hero.backdrop")}${uploadField("Lentes protagonistas", "hero.image")}${uploadField("Anillo protagonista", "hero.secondary_image")}${uploadField("Logo de BOLETA", "brand.logo")}${uploadField("Logo de Digital Solution", "studio.logo")}${saveButton()}`;
  if (tab === "faq") {
    el.innerHTML = `<h3>El guía responde por ti.</h3><p class="editor-note">Respuestas definidas por ti, sin inteligencia artificial ni aprendizaje automático. Se actualizan en el panel de ayuda y en preguntas frecuentes.</p><div id="faqEditor"></div><button class="button secondary" id="addFaq">+ Añadir pregunta</button>${saveButton()}`;
    renderFaqEditor();
    $("addFaq").onclick = () => {
      draft.faq.push({
        question: "Nueva pregunta",
        answer: "Escribe tu respuesta.",
      });
      dirty = true;
      renderFaqEditor();
      applySettings(draft);
    };
  }
  if (tab === "products") {
    el.innerHTML = '<p class="editor-note">Cargando piezas…</p>';
    try {
      adminProducts = await adminApi("/api/admin/products");
      el.innerHTML = `<h3>Todas las piezas</h3><p class="editor-note">Editar, archivar y fusionar se aplican al catálogo al guardar, independientemente del borrador de diseño.</p><button id="panelNewProduct" class="button primary">+ Nueva pieza</button><label>Buscar pieza<input id="adminProductSearch" type="search" placeholder="Nombre, marca, código…"></label><div id="adminProductList" class="admin-list"></div>`;
      const render = () => {
        $("adminProductList").innerHTML = adminProducts
          .filter((x) =>
            (x.title || x.name || "")
              .toLowerCase()
              .includes($("adminProductSearch").value.toLowerCase()),
          )
          .map(
            (x) =>
              `<div><strong>${esc(x.title || x.name)}</strong><p>${esc(x.code || x.id)} · ${esc(x.status || "aprobado")}</p><button class="small-button" data-admin-product="${esc(x.id)}">Editar ↗</button>${x.status !== "aprobado" ? `<button class="small-button" data-restore-product="${esc(x.id)}">Restaurar</button>` : ""}</div>`,
          )
          .join("");
      };
      render();
      $("adminProductSearch").oninput = render;
      $("panelNewProduct").onclick = () => editProduct(null);
      $("adminProductList").onclick = async (e) => {
        const b = e.target.closest("[data-admin-product]");
        if (b) editProduct(b.dataset.adminProduct);
        const r = e.target.closest("[data-restore-product]");
        if (r)
          try {
            await adminApi(
              "/api/products/" + encodeURIComponent(r.dataset.restoreProduct),
              { method: "PATCH", body: JSON.stringify({ status: "aprobado" }) },
            );
            await loadProducts();
            renderPanel("products");
            toast("Pieza restaurada.");
          } catch (err) {
            toast(err.message);
          }
      };
    } catch (err) {
      el.textContent = err.message;
    }
  }
  if (tab === "history") {
    el.innerHTML = "<p>Cargando historial…</p>";
    try {
      const data = await adminApi("/api/admin/site-settings/history");
      el.innerHTML = `<h3>Recuperar una versión</h3><p class="editor-note">Restaurar carga esa versión en el borrador. No cambia la página pública hasta que publiques.</p><button class="button secondary" id="revertPublished">Descartar cambios y usar publicado</button><div class="admin-list">${data.history.map((x, i) => `<div><strong>Versión ${x.version}</strong><p>${esc(x.at)}</p><button class="small-button" data-history="${i}">Cargar en borrador</button></div>`).join("") || "<p>Aún no hay versiones publicadas anteriores.</p>"}</div>`;
      $("revertPublished").onclick = () => {
        draft = structuredClone(published);
        dirty = true;
        applySettings(draft);
        toast("Versión publicada cargada. Guarda para reemplazar el borrador.");
        renderPanel("content");
      };
      el.onclick = async (e) => {
        const b = e.target.closest("[data-history]");
        if (!b) return;
        try {
          const r = await adminApi("/api/admin/site-settings/restore", {
            method: "POST",
            body: JSON.stringify({
              version,
              history_version: data.history[Number(b.dataset.history)].version,
            }),
          });
          version = r.version;
          draft = r.draft;
          published = r.published;
          dirty = false;
          applySettings(draft);
          renderBar();
          toast("Versión recuperada en borrador.");
        } catch (err) {
          toast(err.message);
        }
      };
    } catch (err) {
      el.textContent = err.message;
    }
  }
  if (tab === "stats") {
    el.innerHTML = "<p>Cargando métricas…</p>";
    try {
      const s = await adminApi("/api/admin/stats");
      el.innerHTML = `<h3>Señales del archivo</h3><div class="stat-grid"><div><b>${Number(s.totals) || 0}</b><span>EVENTOS CON CONSENTIMIENTO</span></div><div><b>${Number(s.leads_count) || 0}</b><span>CONTACTOS RECIBIDOS</span></div></div><div class="admin-list">${
        Object.entries(s.events || {})
          .map(
            ([key, val]) =>
              `<div><strong>${esc(key)}</strong><p>${Number(val)} eventos</p></div>`,
          )
          .join("") || "<p>Aún no hay eventos registrados.</p>"
      }</div><p class="editor-note">${esc(s.note || "Clics en WhatsApp no confirman conversaciones ni pagos.")} Las métricas solo se registran cuando el visitante lo permite en Privacidad.</p><h3>Actividad por día</h3><div class="admin-list">${Object.entries(
        s.daily || {},
      )
        .slice(-14)
        .reverse()
        .map(([day, n]) => `<div>${esc(day)} · ${Number(n)} eventos</div>`)
        .join("")}</div>`;
    } catch (err) {
      el.textContent = err.message;
    }
  }
  if (tab === "leads") {
    el.innerHTML = "<p>Cargando contactos privados…</p>";
    try {
      const s = await adminApi("/api/admin/leads");
      el.innerHTML = `<h3>Contactos de BOLETA</h3><p class="editor-note">Solo los contactos que aceptaron novedades pueden recibir promociones. Elimina datos si solicitan la baja.</p><button class="button secondary" id="exportLeads">Exportar CSV privado ↓</button><div class="admin-list">${s.leads.map((x) => `<div><strong>${esc(x.name)}</strong><p>${esc(x.whatsapp)}</p><p>Novedades: ${x.marketing_consent ? "SÍ, ACEPTÓ" : "NO"} · ${esc(x.consented_at || x.created_at || x.at || "")}</p><button class="small-button editor-danger" data-delete-lead="${esc(x.id)}">Eliminar datos</button></div>`).join("") || "<p>Aún no hay contactos.</p>"}</div>`;
      $("exportLeads").onclick = () => {
        const rows = [
          ["nombre", "whatsapp", "marketing_consent", "fecha"],
          ...s.leads.map((x) => [
            x.name,
            x.whatsapp,
            x.marketing_consent ? "sí" : "no",
            x.consented_at || x.created_at || x.at || "",
          ]),
        ];
        const csv =
          "\uFEFF" +
          rows
            .map((row) =>
              row
                .map(
                  (v) =>
                    '"' +
                    String(v ?? "")
                      .replace(/^[=+@-]/, "'")
                      .replace(/"/g, '""') +
                    '"',
                )
                .join(","),
            )
            .join("\r\n");
        const url = URL.createObjectURL(
          new Blob([csv], { type: "text/csv;charset=utf-8" }),
        );
        const a = document.createElement("a");
        a.href = url;
        a.download = "boleta-contactos-privados.csv";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      };
      el.onclick = (e) => {
        const b = e.target.closest("[data-delete-lead]");
        if (b)
          confirmAction(
            "¿Eliminar este contacto?",
            "Se borrarán estos datos de contacto del sistema.",
            async () => {
              await adminApi(
                "/api/admin/leads/" + encodeURIComponent(b.dataset.deleteLead),
                { method: "DELETE" },
              );
              renderPanel("leads");
              toast("Contacto eliminado.");
            },
          );
      };
    } catch (err) {
      el.textContent = err.message;
    }
  }
  wireFields(el);
  $("previewDark")?.addEventListener("click", () => {
    document.documentElement.dataset.theme = "dark";
  });
  $("previewLight")?.addEventListener("click", () => {
    document.documentElement.dataset.theme = "light";
  });
  $("panelMobile")?.addEventListener("click", () => {
    document.body.classList.toggle("preview-mobile");
    p.remove();
  });
}
function renderSectionsEditor() {
  const el = $("sectionsEditor");
  const labels = {
    radio: "BOLETA Radio",
    categories: "Accesos y guía",
    studio: "Digital Solution",
    catalog: "El archivo",
    how: "Cómo encargar",
    faq: "Preguntas frecuentes",
    community: "Comunidad",
  };
  el.innerHTML = draft.site_sections.order
    .map(
      (key, i) =>
        '<div class="section-edit-row"><strong>' +
        labels[key] +
        '</strong><div><button class="small-button" data-move-section="' +
        i +
        '" data-direction="-1" aria-label="Subir ' +
        labels[key] +
        '" ' +
        (i === 0 ? "disabled" : "") +
        '>↑</button><button class="small-button" data-move-section="' +
        i +
        '" data-direction="1" aria-label="Bajar ' +
        labels[key] +
        '" ' +
        (i === draft.site_sections.order.length - 1 ? "disabled" : "") +
        '>↓</button></div><label class="checkbox"><input data-hide-section="' +
        key +
        '" type="checkbox" ' +
        (!draft.site_sections.hidden.includes(key) ? "checked" : "") +
        " " +
        (key === "catalog" ? "disabled" : "") +
        "><span>Visible" +
        (key === "catalog" ? " (siempre)" : "") +
        "</span></label></div>",
    )
    .join("");
  el.onclick = (e) => {
    const b = e.target.closest("[data-move-section]");
    if (!b) return;
    const i = Number(b.dataset.moveSection),
      next = i + Number(b.dataset.direction);
    if (next < 0 || next >= draft.site_sections.order.length) return;
    [draft.site_sections.order[i], draft.site_sections.order[next]] = [
      draft.site_sections.order[next],
      draft.site_sections.order[i],
    ];
    dirty = true;
    applySettings(draft);
    renderSectionsEditor();
  };
  el.onchange = (e) => {
    const key = e.target.dataset.hideSection;
    if (!key) return;
    draft.site_sections.hidden = draft.site_sections.hidden.filter(
      (x) => x !== key,
    );
    if (!e.target.checked) draft.site_sections.hidden.push(key);
    dirty = true;
    applySettings(draft);
  };
}
function saveButton() {
  return '<button class="button primary" data-save-draft>Guardar borrador</button><p class="micro">La publicación requiere el botón Publicar de la barra superior.</p>';
}
function wireFields(el) {
  el.querySelectorAll("[data-path]").forEach((input) =>
    input.addEventListener("input", () => {
      let v = input.value;
      if (input.type === "number") v = v === "" ? null : Number(v);
      put(input.dataset.path, v);
    }),
  );
  el.querySelectorAll("[data-save-draft]").forEach(
    (b) => (b.onclick = () => saveDraft()),
  );
  el.querySelectorAll("[data-upload]").forEach(
    (input) =>
      (input.onchange = async () => {
        const f = input.files[0];
        if (!f) return;
        input.disabled = true;
        try {
          const src = await upload(f);
          put(input.dataset.upload, src);
          input.previousElementSibling.src = src;
          toast("Foto subida. Guarda el borrador para conservar el cambio.");
        } catch (err) {
          toast(err.message);
        } finally {
          input.disabled = false;
        }
      }),
  );
}
function renderFaqEditor() {
  const el = $("faqEditor");
  el.innerHTML = draft.faq
    .map(
      (f, i) =>
        `<div class="faq-edit-row"><label>Pregunta ${i + 1}<input data-faq-index="${i}" data-key="question" value="${esc(f.question)}"></label><label>Respuesta<textarea data-faq-index="${i}" data-key="answer">${esc(f.answer)}</textarea></label><button class="small-button editor-danger" data-delete-faq="${i}">Quitar pregunta</button></div>`,
    )
    .join("");
  el.oninput = (e) => {
    const i = e.target.dataset.faqIndex;
    if (i === undefined) return;
    draft.faq[Number(i)][e.target.dataset.key] = e.target.value;
    dirty = true;
    $("draftStatus").textContent = "CAMBIOS SIN GUARDAR";
    applySettings(draft);
  };
  el.onclick = (e) => {
    const b = e.target.closest("[data-delete-faq]");
    if (b) {
      draft.faq.splice(Number(b.dataset.deleteFaq), 1);
      dirty = true;
      renderFaqEditor();
      applySettings(draft);
    }
  };
}
async function upload(file) {
  if (file.size > 10 * 1024 * 1024) throw new Error("La imagen supera 10 MB.");
  const form = new FormData();
  form.append("file", file);
  const r = await adminApi("/api/upload", { method: "POST", body: form });
  return r.url || r.image_url;
}
async function saveDraft() {
  try {
    const data = await adminApi("/api/admin/site-settings", {
      method: "PUT",
      body: JSON.stringify({ version, settings: draft }),
    });
    version = data.version;
    draft = structuredClone(data.draft);
    published = structuredClone(data.published);
    dirty = false;
    renderBar();
    toast("Borrador guardado en el servidor.");
    return true;
  } catch (err) {
    toast(err.message);
    return false;
  }
}
function confirmAction(title, text, action) {
  const d = newDialog(
    "adminConfirm",
    title,
    `<div class="admin-form"><p>${esc(text)}</p><button class="button primary" id="confirmAction">Confirmar</button><button class="button secondary close-dialog">Cancelar</button><p id="confirmStatus" role="status"></p></div>`,
  );
  $("confirmAction").onclick = async () => {
    $("confirmAction").disabled = true;
    try {
      await action();
      closeDialog(d);
    } catch (err) {
      $("confirmStatus").textContent = err.message;
      $("confirmAction").disabled = false;
    }
  };
  openDialog(d);
}
function confirmPublish() {
  confirmAction(
    "¿PUBLICAR ESTA VERSIÓN?",
    "Se guardará el borrador actual y será visible para todos los visitantes. La versión anterior quedará en Historial.",
    async () => {
      if (dirty && !(await saveDraft()))
        throw new Error("No se pudo guardar el borrador. No se publicó.");
      const d = await adminApi("/api/admin/site-settings/publish", {
        method: "POST",
        body: JSON.stringify({ version }),
      });
      version = d.version;
      draft = structuredClone(d.draft);
      published = structuredClone(d.published);
      dirty = false;
      applySettings(published);
      renderBar();
      toast("Cambios publicados y confirmados por el servidor.");
    },
  );
}
async function exitEditor() {
  if (dirty) {
    confirmAction(
      "HAY CAMBIOS SIN GUARDAR.",
      "Si sales, se descartan los cambios de esta vista. Tu último borrador guardado se conserva.",
      () => doExit(),
    );
  } else await doExit();
}
async function doExit() {
  try {
    await adminApi("/api/auth/logout", { method: "POST", body: "{}" });
  } catch (err) {
    toast(err.message);
    return;
  }
  state.editor = false;
  csrf = "";
  document.querySelector(".editor-panel")?.remove();
  document.querySelector(".editor-bar")?.remove();
  toolbarObserver?.disconnect();
  document.documentElement.style.removeProperty("--editor-toolbar-height");
  document
    .querySelectorAll(".edit-highlight")
    .forEach((x) => x.classList.remove("edit-highlight"));
  document.querySelectorAll(".block-edit-button").forEach((x) => x.remove());
  document.body.classList.remove("preview-mobile");
  applySettings(published);
  renderProducts();
  dirty = false;
  toast("Sesión cerrada. Vista pública restaurada.");
}
async function editProduct(id) {
  try {
    if (id) {
      activeProduct =
        adminProducts.find((x) => String(x.id) === String(id)) ||
        state.products.find((x) => String(x.id) === String(id));
      if (!activeProduct)
        activeProduct = await adminApi(
          "/api/products/" + encodeURIComponent(id),
        );
    } else activeProduct = null;
    photos = activeProduct ? gallery(activeProduct) : [];
    const p = activeProduct || {},
      v = Array.isArray(p.variants) ? p.variants : [];
    const variantText = v
      .map((x) =>
        [
          x.size || x.label || "",
          x.color || "",
          x.quantity ?? x.stock ?? "",
          x.price ?? "",
        ].join(" | "),
      )
      .join("\n");
    const d = newDialog(
      "editProductDialog",
      id ? "EDITAR PIEZA." : "NUEVA PIEZA.",
      `<form class="admin-form" id="productAdminForm"><p class="editor-note">Al guardar se modifica el catálogo. La publicación del diseño es independiente.</p><label>Nombre<input name="title" required maxlength="160" value="${esc(p.title || p.name || "")}"></label><div class="editor-row"><label>Categoría<input name="category" required value="${esc(p.category || "Accesorios")}"></label><label>Marca<input name="brand" value="${esc(p.brand || "BOLETA")}"></label></div><label>Precio USD (vacío = por confirmar)<input name="price" type="number" min="0" step="0.01" value="${esc(p.numeric_usd ?? p.price ?? "")}"></label><label>Descripción / materiales<textarea name="description">${esc(p.description || p.material || "")}</textarea></label><label>Tallas separadas por coma (si no hay variantes detalladas)<input name="sizes" value="${esc(Array.isArray(p.sizes) ? p.sizes.join(", ") : "Única")}"></label><label>Variantes: una por línea · talla | color | existencias | precio USD<textarea name="variants" placeholder="S | Negro | 3 | 25&#10;M | Morado | 2 | 25">${esc(variantText)}</textarea><span class="micro">Deja existencias vacías si están por confirmar. No se preselecciona una variante al comprar.</span></label><label>Fotos (puedes elegir varias)<input id="productPhotos" type="file" multiple accept="image/jpeg,image/png,image/webp"></label><div class="admin-gallery" id="adminGallery"></div><label class="checkbox"><input type="checkbox" name="is_purchased" ${p.is_purchased ? "checked" : ""}><span>Comprado al proveedor</span></label><label class="checkbox"><input type="checkbox" name="in_stock" ${p.in_stock !== false ? "checked" : ""}><span>Disponible para consultar</span></label><button class="button primary" type="submit">Guardar pieza en catálogo</button>${id ? '<button type="button" class="button secondary" id="mergeProduct">Unir fotos de otra pieza</button><button type="button" class="button secondary editor-danger" id="archiveProduct">Archivar pieza</button>' : ""}<p id="productSaveStatus" role="status"></p></form>`,
    );
    renderAdminGallery();
    $("productPhotos").onchange = async (e) => {
      const input = e.target;
      input.disabled = true;
      try {
        for (const f of input.files) {
          photos.push(await upload(f));
        }
        renderAdminGallery();
        toast("Fotos subidas. Guarda la pieza para asociarlas.");
      } catch (err) {
        toast(err.message);
      } finally {
        input.disabled = false;
        input.value = "";
      }
    };
    $("productAdminForm").onsubmit = saveProduct;
    if (id) {
      $("archiveProduct").onclick = () =>
        confirmAction(
          "¿ARCHIVAR ESTA PIEZA?",
          "Dejará de aparecer públicamente. Puedes restaurarla desde Piezas.",
          async () => {
            await adminApi("/api/products/" + encodeURIComponent(id), {
              method: "DELETE",
            });
            closeDialog(d);
            await loadProducts();
            toast("Pieza archivada.");
          },
        );
      $("mergeProduct").onclick = () => mergeProduct(id, d);
    }
    openDialog(d);
  } catch (err) {
    toast(err.message);
  }
}
function renderAdminGallery() {
  $("adminGallery").innerHTML = photos
    .map(
      (src, i) =>
        `<div><img src="${esc(src)}" alt="Foto ${i + 1}" width="85" height="85"><button type="button" data-main-photo="${i}">${i === 0 ? "Principal ✓" : "Hacer principal"}</button><button type="button" data-remove-photo="${i}">Quitar foto</button></div>`,
    )
    .join("");
  $("adminGallery").onclick = (e) => {
    const main = e.target.closest("[data-main-photo]");
    if (main) {
      const [src] = photos.splice(Number(main.dataset.mainPhoto), 1);
      photos.unshift(src);
      renderAdminGallery();
    }
    const r = e.target.closest("[data-remove-photo]");
    if (r) {
      photos.splice(Number(r.dataset.removePhoto), 1);
      renderAdminGallery();
    }
  };
}
async function saveProduct(e) {
  e.preventDefault();
  const form = e.currentTarget,
    f = new FormData(form),
    b = form.querySelector("[type=submit]");
  b.disabled = true;
  $("productSaveStatus").textContent = "Guardando…";
  try {
    const variants = String(f.get("variants") || "")
      .split("\n")
      .filter((x) => x.trim())
      .map((line, i) => {
        const [size, color, stock, variantPrice] = line
          .split("|")
          .map((x) => x.trim());
        if (stock !== "" && stock !== undefined && !/^\d+$/.test(stock))
          throw new Error(
            "Las existencias deben ser enteros positivos o vacías.",
          );
        return {
          id:
            activeProduct?.variants?.find(
              (v) =>
                String(v.size || "") === String(size || "") &&
                String(v.color || "") === String(color || ""),
            )?.id || "v" + Date.now() + "-" + i,
          size,
          color,
          ...(stock === "" || stock === undefined
            ? {}
            : { quantity: Number(stock) }),
          ...(variantPrice === "" || variantPrice === undefined
            ? {}
            : { price: Number(variantPrice) }),
        };
      });
    const price = f.get("price") === "" ? 0 : Number(f.get("price"));
    const payload = {
      title: f.get("title"),
      name: f.get("title"),
      category: f.get("category"),
      brand: f.get("brand"),
      numeric_usd: price,
      price,
      price_usd: price === null ? "Precio por confirmar" : `$${price} USD`,
      description: f.get("description"),
      material: f.get("description"),
      sizes: String(f.get("sizes"))
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      variants,
      image: photos[0] || "/images/boleta-logo.webp",
      image_url: photos[0] || "/images/boleta-logo.webp",
      thumb: photos[0] || "/images/boleta-logo.webp",
      gallery: photos.slice(1),
      is_purchased: f.get("is_purchased") === "on",
      in_stock: f.get("in_stock") === "on",
      available: f.get("in_stock") === "on",
      status: activeProduct?.status || "aprobado",
    };
    await adminApi(
      activeProduct
        ? "/api/products/" + encodeURIComponent(activeProduct.id)
        : "/api/products",
      { method: activeProduct ? "PUT" : "POST", body: JSON.stringify(payload) },
    );
    await loadProducts();
    closeDialog($("editProductDialog"));
    toast("Pieza guardada y confirmada por el servidor.");
    if (panelTab === "products") renderPanel("products");
  } catch (err) {
    $("productSaveStatus").textContent = err.message;
  } finally {
    b.disabled = false;
  }
}
async function mergeProduct(targetId, parent) {
  try {
    adminProducts = await adminApi("/api/admin/products");
    const candidates = adminProducts.filter(
      (x) => String(x.id) !== String(targetId) && x.status === "aprobado",
    );
    const d = newDialog(
      "mergeProductDialog",
      "UNIR GALERÍAS.",
      `<form class="admin-form" id="mergeForm"><p class="editor-note">Se copiarán las fotos de la pieza elegida a esta galería. La pieza de origen se archivará; no se mezclan sus tallas ni precios.</p><label>Pieza de origen<select name="source_id">${candidates.map((x) => `<option value="${esc(x.id)}">${esc(x.title || x.name)} · ${esc(x.code || x.id)}</option>`).join("")}</select></label><button class="button primary">Confirmar unión y archivar origen</button><p id="mergeStatus" role="status"></p></form>`,
    );
    $("mergeForm").onsubmit = async (e) => {
      e.preventDefault();
      const source = new FormData(e.currentTarget).get("source_id");
      try {
        await adminApi("/api/products/merge", {
          method: "POST",
          body: JSON.stringify({
            source_id: source,
            target_id: String(targetId),
          }),
        });
        await loadProducts();
        closeDialog(d);
        closeDialog(parent);
        toast("Galerías unidas. Pieza de origen archivada.");
        await editProduct(targetId);
      } catch (err) {
        $("mergeStatus").textContent = err.message;
      }
    };
    openDialog(d);
  } catch (err) {
    toast(err.message);
  }
}
document.addEventListener("boleta-edit-product", (e) => {
  if (state.editor) editProduct(e.detail);
});
window.addEventListener("beforeunload", (e) => {
  if (state.editor && dirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});
