const els = {
  run: document.getElementById("btn-run"),
  confirmAll: document.getElementById("btn-confirm-all"),
  stage: document.getElementById("stat-stage"),
  drafts: document.getElementById("stat-drafts"),
  exc: document.getElementById("stat-exc"),
  demands: document.getElementById("stat-demands"),
  logSection: document.getElementById("log-section"),
  logList: document.getElementById("log-list"),
  draftsList: document.getElementById("drafts-list"),
  excList: document.getElementById("exc-list"),
};

const STAGE_LABEL = {
  idle: "尚未執行",
  load: "讀取資料",
  validate: "驗證中",
  allocate: "匹配中",
  explain: "產生說明",
  await_human: "待人工確認",
  done: "已完成",
  failed: "失敗",
};

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "請求失敗");
  return data;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function statusBadge(status) {
  const map = {
    pending: "待確認",
    confirmed: "已確認",
    rejected: "已駁回",
  };
  return `<span class="badge ${status}">${map[status] || status}</span>`;
}

function draftCard(item) {
  return `
    <article class="item" data-id="${escapeHtml(item.demand_id)}">
      <div class="item-top">
        <div>
          <p class="item-title">${escapeHtml(item.suggested_so_draft_id)} · ${escapeHtml(item.customer_name)}</p>
          <p class="item-meta">
            ${escapeHtml(item.sku_id)} ${escapeHtml(item.sku_name)} ·
            分配 ${escapeHtml(item.allocated_qty)}${escapeHtml(item.unit)} ·
            交期 ${escapeHtml(item.suggested_delivery_date)} ·
            ${escapeHtml(item.linked_production_order_id)} / ${escapeHtml(item.linked_batch_no)}
          </p>
        </div>
        <div>
          <span class="badge draft">草稿</span>
          ${statusBadge(item.confirm_status)}
        </div>
      </div>
      <p class="reason"><strong>匹配依據</strong>：${escapeHtml(item.match_reason)}</p>
      <p class="suggest"><strong>建議</strong>：${escapeHtml(item.suggestion)}</p>
      <div class="item-actions">
        <button class="btn small ok" data-action="confirmed">確認</button>
        <button class="btn small no" data-action="rejected">駁回</button>
        <button class="btn small wait" data-action="pending">待決</button>
      </div>
    </article>
  `;
}

function excCard(item) {
  const severe = ["數量不足", "品號不一致"].includes(item.exception_type);
  return `
    <article class="item exception ${severe ? "bad" : ""}" data-id="${escapeHtml(item.demand_id)}">
      <div class="item-top">
        <div>
          <p class="item-title">${escapeHtml(item.exception_type)} · ${escapeHtml(item.demand_id)}</p>
          <p class="item-meta">
            ${escapeHtml(item.customer_name || "—")} ·
            ${escapeHtml(item.sku_id)} ${escapeHtml(item.sku_name)} ·
            需求 ${escapeHtml(item.requested_qty)}${escapeHtml(item.unit || "")}
          </p>
        </div>
        <div>
          <span class="badge exc">${escapeHtml(item.exception_type)}</span>
          ${statusBadge(item.confirm_status)}
        </div>
      </div>
      <p class="reason"><strong>依據</strong>：${escapeHtml(item.match_reason)}</p>
      <p class="suggest"><strong>建議下一步</strong>：${escapeHtml(item.suggestion)}</p>
      <div class="item-actions">
        <button class="btn small ok" data-action="confirmed">已決裁／接受建議</button>
        <button class="btn small no" data-action="rejected">駁回</button>
        <button class="btn small wait" data-action="pending">待決</button>
      </div>
    </article>
  `;
}

function render(session) {
  const items = session.items || [];
  const drafts = items.filter((i) => i.result_type === "sales_order_draft");
  const excs = items.filter((i) => i.result_type === "exception");

  els.stage.textContent = STAGE_LABEL[session.stage] || session.stage;
  els.drafts.textContent = session.summary?.draft_count ?? drafts.length ?? "—";
  els.exc.textContent = session.summary?.exception_count ?? excs.length ?? "—";
  els.demands.textContent = session.summary?.demands ?? "—";

  if (session.messages?.length) {
    els.logSection.hidden = false;
    els.logList.innerHTML = session.messages.map((m) => `<li>${escapeHtml(m)}</li>`).join("");
  }

  if (!items.length) {
    els.draftsList.className = "list empty-hint";
    els.excList.className = "list empty-hint";
    els.draftsList.textContent = "尚無草稿";
    els.excList.textContent = "尚無例外";
    els.confirmAll.disabled = true;
    return;
  }

  els.draftsList.className = "list";
  els.excList.className = "list";
  els.draftsList.innerHTML = drafts.length
    ? drafts.map(draftCard).join("")
    : `<div class="empty-hint">沒有可產生的草稿</div>`;
  els.excList.innerHTML = excs.length
    ? excs.map(excCard).join("")
    : `<div class="empty-hint">沒有例外</div>`;

  els.confirmAll.disabled = drafts.length === 0;
}

async function refresh() {
  const data = await api("/api/session");
  render(data.session);
}

els.run.addEventListener("click", async () => {
  els.run.disabled = true;
  els.run.textContent = "執行中…";
  try {
    const data = await api("/api/run", { method: "POST", body: "{}" });
    render(data.session);
  } catch (err) {
    alert(err.message);
  } finally {
    els.run.disabled = false;
    els.run.textContent = "執行 Agent";
  }
});

els.confirmAll.addEventListener("click", async () => {
  try {
    const data = await api("/api/confirm-drafts", { method: "POST", body: "{}" });
    render(data.session);
  } catch (err) {
    alert(err.message);
  }
});

document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const card = btn.closest("[data-id]");
  if (!card) return;
  const demandId = card.getAttribute("data-id");
  const decision = btn.getAttribute("data-action");
  try {
    const data = await api("/api/confirm", {
      method: "POST",
      body: JSON.stringify({ demand_id: demandId, decision }),
    });
    render(data.session);
  } catch (err) {
    alert(err.message);
  }
});

refresh().catch(() => {
  /* 初次無 session 也沒關係 */
});
