/* globals bootstrap */
document.addEventListener("DOMContentLoaded", () => {
  // === API endpoints (an deine Backend-Routen angepasst) ===
  const API_LIST = "/api/webhooks";
  const API_CREATE = "/api/webhook";
  const API_ITEM = (id) => `/api/webhook/${encodeURIComponent(id)}`;

  // === Form & UI Elemente ===
  const createForm = document.getElementById("webhookForm");
  const tbody = document.getElementById("webhookTbody");
  const emptyState = document.getElementById("emptyState");
  const reloadBtn = document.getElementById("reloadBtn");

  // Edit Modal
  const editModalEl = document.getElementById("editModal");
  const editModal = editModalEl ? new bootstrap.Modal(editModalEl) : null;
  const edit_id = document.getElementById("edit_id");
  const edit_name = document.getElementById("edit_name");
  const edit_description = document.getElementById("edit_description");
  const edit_targets = document.getElementById("edit_targets");
  const edit_enabled = document.getElementById("edit_enabled");
  const editSaveBtn = document.getElementById("editSaveBtn");

  // === Helpers ===
  const parseTargets = (text) =>
    (text || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  const formatTargets = (arr) =>
    Array.isArray(arr) ? arr.join(", ") : "";

  // Fetch helpers
  async function apiGetList() {
    const res = await fetch(API_LIST, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`GET ${API_LIST} failed: ${res.status}`);
    return res.json();
  }

  async function apiCreate(payload) {
    const res = await fetch(API_CREATE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`POST ${API_CREATE} failed: ${res.status}`);
    return res.json();
  }

  async function apiUpdate(id, payload) {
    const res = await fetch(API_ITEM(id), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`PUT ${API_ITEM(id)} failed: ${res.status}`);
    return res.json();
  }

  async function apiDelete(id) {
    const res = await fetch(API_ITEM(id), { method: "DELETE" });
    if (!res.ok) throw new Error(`DELETE ${API_ITEM(id)} failed: ${res.status}`);
  }

  // === Render Table ===
  function renderTable(items) {
    tbody.innerHTML = "";
    if (!items || items.length === 0) {
      emptyState?.classList.remove("d-none");
      return;
    }
    emptyState?.classList.add("d-none");

    items.forEach((a) => {
      const tr = document.createElement("tr");

      const tdName = document.createElement("td");
      tdName.textContent = a.name || "(no name)";
      tr.appendChild(tdName);

      const tdDesc = document.createElement("td");
      tdDesc.textContent = a.description || "";
      tr.appendChild(tdDesc);

      const tdTargets = document.createElement("td");
      tdTargets.innerHTML =
        a.targets && a.targets.length
          ? `<span class="badge text-bg-secondary me-1">${a.targets.length}</span> ${formatTargets(a.targets)}`
          : `<span class="text-muted">none</span>`;
      tr.appendChild(tdTargets);

      const tdUrl = document.createElement("td");
      tdUrl.innerHTML = a.url
        ? `<a href="${a.url}" target="_blank" rel="noopener noreferrer">${a.url}</a>`
        : `<span class="text-muted">—</span>`;
      tr.appendChild(tdUrl);

      const tdEnabled = document.createElement("td");
      tdEnabled.innerHTML = `
        <div class="form-check form-switch">
          <input class="form-check-input enable-switch" type="checkbox" ${a.enabled ? "checked" : ""} data-id="${a.id}">
        </div>`;
      tr.appendChild(tdEnabled);

      const tdActions = document.createElement("td");
      tdActions.className = "text-end";
      tdActions.innerHTML = `
        <div class="btn-group">
          <button class="btn btn-sm btn-outline-primary edit-btn" data-id="${a.id}">Edit</button>
          <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${a.id}">Delete</button>
        </div>`;
      tr.appendChild(tdActions);

      tbody.appendChild(tr);


      tbody.querySelectorAll(".enable-switch").forEach(sw => {
  sw.addEventListener("change", async (e) => {
    const id = e.target.dataset.id;
    const enabled = e.target.checked;

    console.log(`Toggle for ${id}: ${enabled}`);

    try {
      await apiUpdate(id, { enabled });
      console.log("Updated successfully");
    } catch (err) {
      console.error("Error:", err);
      // rollback UI if error
      e.target.checked = !enabled;
    }
  });
});

    });

    // Enable toggle
    tbody.querySelectorAll(".enable-switch").forEach((sw) => {
      sw.addEventListener("change", async (e) => {
        const id = e.target.dataset.id;
        const enabled = e.target.checked;
        try {
          await apiUpdate(id, { enabled });
        } catch (err) {
          console.error(err);
          e.target.checked = !enabled; // rollback
        }
      });
    });

    // Edit
    tbody.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        try {
          // Frisch aus der Liste ziehen
          const list = await apiGetList();
          const a = list.find((x) => x.id === id);
          if (!a || !editModal) return;

          edit_id.value = a.id;
          edit_name.value = a.name || "";
          edit_description.value = a.description || "";
          edit_targets.value = formatTargets(a.targets || []);
          edit_enabled.checked = !!a.enabled;

          editModal.show();
        } catch (err) {
          console.error(err);
        }
      });
    });

    // Delete
    tbody.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        if (!confirm("Delete this adapter?")) return;
        try {
          await apiDelete(id);
          await loadAndRender();
        } catch (err) {
          console.error(err);
        }
      });
    });
  }

  // === Load & render ===
  async function loadAndRender() {
    try {
      const data = await apiGetList();
      renderTable(data);
    } catch (err) {
      console.error(err);
    }
  }

  // === Create handler ===
  if (createForm) {
    createForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("name").value.trim();
      const description = document.getElementById("description").value.trim();
      const targets = parseTargets(document.getElementById("targets").value);

      try {
        await apiCreate({ name, description, targets });
        createForm.reset();
        await loadAndRender();
      } catch (err) {
        console.error(err);
      }
    });
  }

  // === Edit save ===
  if (editSaveBtn) {
    editSaveBtn.addEventListener("click", async () => {
      const id = edit_id.value;
      const payload = {
        name: edit_name.value.trim(),
        description: edit_description.value.trim(),
        targets: parseTargets(edit_targets.value),
        enabled: !!edit_enabled.checked,
      };
      try {
        await apiUpdate(id, payload);
        editModal.hide();
        await loadAndRender();
      } catch (err) {
        console.error(err);
      }
    });
  }

  // Reload
  reloadBtn?.addEventListener("click", loadAndRender);

  // Initial load
  loadAndRender();
});
