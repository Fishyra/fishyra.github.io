"use strict";

// ---------- 基础工具 ----------

const $ = (id) => document.getElementById(id);

function message(text) {
  const target = $("message");

  if (target) {
    target.textContent = text;
  }
}

function element(tag, text, className) {
  const node = document.createElement(tag);

  if (text !== undefined) {
    node.textContent = text;
  }

  if (className) {
    node.className = className;
  }

  return node;
}

// 图片和项目链接均支持 HTTP、HTTPS。
function safeURL(value) {
  if (!value) return "";

  try {
    const url = new URL(value);

    if (["http:", "https:"].includes(url.protocol)) {
      return url.href;
    }
  } catch (error) {
    return "";
  }

  return "";
}

function createImage(value) {
  const url = safeURL(value);

  if (!url) return null;

  const image = document.createElement("img");

  image.src = url;
  image.alt = "";
  image.loading = "lazy";
  image.referrerPolicy = "no-referrer";
  image.onerror = () => image.remove();

  return image;
}

function externalLink(url, text, className = "button") {
  const link = element("a", text, className);

  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";

  return link;
}

// 请求超过 20 秒时显示提示，避免一直停在加载状态。
// 保存请求超时后，应先刷新列表确认结果，再决定是否重试。
async function request(operation) {
  let timer;

  try {
    return await Promise.race([
      operation,
      new Promise((resolve, reject) => {
        timer = setTimeout(() => {
          reject(
            new Error(
              "连接超时。请检查网络；如果正在保存，请先刷新列表确认是否已保存。"
            )
          );
        }, 20000);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

// ---------- Markdown 渲染 ----------

let markdownLoader;

function loadMarkdown() {
  if (!markdownLoader) {
    markdownLoader = Promise.all([
      loadLocalScript("vendor/marked.js", () => window.marked),
      loadLocalScript("vendor/purify.js", () => window.DOMPurify)
    ]).catch((error) => {
      markdownLoader = null;
      throw error;
    });
  }
  return markdownLoader;
}

function loadLocalScript(path, available) {
  if (available()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = new URL(path, document.baseURI).href;
    const timer = setTimeout(() => {
      script.remove();
      reject(new Error("Markdown 组件加载超时，请确认 vendor 文件夹已上传。"));
    }, 12000);
    script.onload = () => {
      clearTimeout(timer);
      if (available()) resolve();
      else reject(new Error("Markdown 组件内容不完整。"));
    };
    script.onerror = () => {
      clearTimeout(timer);
      script.remove();
      reject(new Error("Markdown 组件加载失败，请确认 vendor 文件夹已上传。"));
    };
    document.head.append(script);
  });
}

async function renderMarkdown(target, source) {
  await loadMarkdown();
  const html = window.marked.parse(source || "", {
    gfm: true,
    breaks: true
  });
  const clean = window.DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["style", "form", "input", "button", "textarea", "select"],
    FORBID_ATTR: ["style", "id", "name"]
  });
  target.innerHTML = clean;
  target.className = "markdown-body";
  target.querySelectorAll("img").forEach((image) => {
    image.loading = "lazy";
    image.referrerPolicy = "no-referrer";
  });
  target.querySelectorAll("a[href]").forEach((link) => {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  });
}

const markdownStyle = document.createElement("style");
markdownStyle.textContent = `
  .markdown-body { white-space: normal; overflow-wrap: anywhere; line-height: 1.9; }
  .markdown-body > :first-child { margin-top: 0; }
  .markdown-body h1 { font-size: 32px; letter-spacing: -1px; line-height: 1.4; margin: 32px 0 16px; }
  .markdown-body h2 { font-size: 27px; line-height: 1.4; margin: 28px 0 14px; }
  .markdown-body h3 { font-size: 22px; margin: 24px 0 12px; }
  .markdown-body h4, .markdown-body h5, .markdown-body h6 { font-size: 18px; margin: 20px 0 10px; }
  .markdown-body p { margin: 0 0 18px; }
  .markdown-body img { display: block; max-width: 100%; height: auto; border-radius: 8px; margin: 20px 0; }
  .markdown-body a { text-decoration: underline; text-underline-offset: 4px; }
  .markdown-body blockquote { border-left: 3px solid var(--muted); margin: 20px 0; padding: 4px 20px; color: var(--muted); }
  .markdown-body ul, .markdown-body ol { padding-left: 26px; margin-bottom: 20px; }
  .markdown-body li { margin: 5px 0; }
  .markdown-body code { background: var(--surface); padding: 2px 6px; border-radius: 4px; font-family: ui-monospace, monospace; font-size: .9em; }
  .markdown-body pre { overflow-x: auto; padding: 18px; background: var(--surface); border: 1px solid var(--line); border-radius: 8px; }
  .markdown-body pre code { padding: 0; background: none; }
  .markdown-body table { display: block; max-width: 100%; overflow-x: auto; border-collapse: collapse; margin: 20px 0; }
  .markdown-body th, .markdown-body td { border: 1px solid var(--line); padding: 8px 14px; text-align: left; }
  .markdown-body hr { border: 0; border-top: 1px solid var(--line); margin: 28px 0; }
  .markdown-tools { display: flex; flex-wrap: wrap; gap: 10px; margin: 10px 0; }
  .markdown-tools button { font-size: 13px; padding: 8px 12px; }
  .markdown-help { color: var(--muted); font-size: 12px; margin-bottom: 10px; }
  #markdownPreview { padding: 20px; border: 1px solid var(--line); border-radius: 8px; margin-top: 15px; }
`;
document.head.append(markdownStyle);

// ---------- 启动 ----------

async function start() {
  const page = document.body.dataset.page;

  if (page === "home" || page === "about") {
    return;
  }

  if (!window.supabase || !window.FISHYRA_CONFIG) {
    throw new Error(
      "连接组件加载失败。请检查网络，并确认 config.js 已上传。"
    );
  }

  const { url, key } = window.FISHYRA_CONFIG;

  const db = window.supabase.createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  });

  // ---------- 内容卡片 ----------

  function createCard(post) {
    const card = element("article", undefined, "card");
    const image = createImage(post.cover_url);
    const content = element("div", undefined, "content");
    const actions = element("div", undefined, "card-actions");

    if (image) {
      card.append(image);
    }

    content.append(
      element("h3", post.title),
      element("p", post.summary || ""),
      element("p", (post.tags || []).join(" / "), "tags")
    );

    const detail = element("a", "查看详情 ↗", "button");

    detail.href = "post.html?id=" + encodeURIComponent(post.id);
    actions.append(detail);

    const projectURL = safeURL(post.project_url);

    if (post.type === "project" && projectURL) {
      actions.append(
        externalLink(
          projectURL,
          "访问项目 ↗",
          "button primary"
        )
      );
    }

    content.append(actions);
    card.append(content);

    return card;
  }

  // ---------- 动态时间线与项目搜索样式 ----------

  const listStyle = element("style");
  listStyle.textContent = `
    body[data-page="news"] #listing {
      display: block;
      border-top: 1px solid var(--line);
    }
    .timeline-item {
      display: grid;
      grid-template-columns: 125px minmax(0, 1fr);
      gap: 30px;
      border-bottom: 1px solid var(--line);
      padding: 30px 0;
    }
    .timeline-date {
      font: 12px/1.8 ui-monospace, monospace;
      color: var(--muted);
      padding-top: 5px;
    }
    .timeline-content {
      position: relative;
      border-left: 1px solid var(--line);
      padding-left: 30px;
    }
    .timeline-content::before {
      content: "";
      position: absolute;
      top: 9px;
      left: -4px;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--fg);
    }
    .timeline-content h3 {
      margin: 0 0 12px;
      font-size: 23px;
      line-height: 1.5;
      overflow-wrap: anywhere;
    }
    .timeline-content p {
      margin: 0 0 16px;
      color: var(--muted);
      font-size: 14px;
      line-height: 1.8;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .timeline-read { font-size: 13px; }
    .timeline-read:hover { text-decoration: underline; }
    .project-search {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin: 0 0 28px;
    }
    .project-search input {
      flex: 1 1 200px;
      width: auto;
      min-width: 0;
    }
    .project-search button { flex-shrink: 0; }
    .project-search a { align-self: center; font-size: 13px; }
    @media (max-width: 600px) {
      .timeline-item { grid-template-columns: 1fr; gap: 10px; padding: 25px 0; }
      .timeline-content { padding-left: 20px; }
      .timeline-content h3 { font-size: 20px; }
    }
  `;
  document.head.append(listStyle);

  function createTimelineItem(post) {
    const row = element("article", undefined, "timeline-item");
    const date = new Date(post.created_at);
    const time = element("time", date.toLocaleDateString("zh-CN", {
      year: "numeric", month: "2-digit", day: "2-digit"
    }), "timeline-date");
    time.dateTime = post.created_at;

    const content = element("div", undefined, "timeline-content");
    const title = element("h3");
    const titleLink = element("a", post.title);
    titleLink.href = "post.html?id=" + encodeURIComponent(post.id);
    title.append(titleLink);

    const read = element("a", "阅读全文 ↗", "timeline-read");
    read.href = titleLink.href;
    content.append(title, element("p", post.summary || ""), read);
    row.append(time, content);
    return row;
  }

  // ---------- 项目与动态列表 ----------

  if (page === "works" || page === "news") {
    const previous = $("previous");
    const next = $("next");

    previous.disabled = true;
    next.disabled = true;

    const parameter = new URLSearchParams(location.search);
    const parsedPage = Number(parameter.get("page") || 1);

    const currentPage =
      Number.isInteger(parsedPage) && parsedPage > 0
        ? Math.min(parsedPage, 100000)
        : 1;

    const pageSize = 30;
    const first = (currentPage - 1) * pageSize;

    const keyword = (parameter.get("q") || "").trim();

    if (page === "works") {
      const searchForm = element("form", undefined, "project-search");
      searchForm.setAttribute("role", "search");
      const input = element("input");
      input.type = "search";
      input.name = "q";
      input.value = keyword;
      input.placeholder = "搜索项目标题或简介…";
      input.setAttribute("aria-label", "搜索 Fishyra 的项目");
      const submit = element("button", "搜索", "primary");
      submit.type = "submit";
      searchForm.append(input, submit);
      if (keyword) {
        const clear = element("a", "清除搜索");
        clear.href = "works.html";
        searchForm.append(clear);
      }
      searchForm.onsubmit = (event) => {
        event.preventDefault();
        const query = new URLSearchParams();
        if (input.value.trim()) query.set("q", input.value.trim());
        location.href = "works.html" + (query.size ? "?" + query.toString() : "");
      };
      $("listing").before(searchForm);
    }

    let query = db.from("posts")
      .select("*")
      .eq("status", "published")
      .eq("type", page === "works" ? "project" : "news");

    if (page === "works") {
      query = query.order("sort_order", { ascending: true });
      if (keyword) {
        // 引号包裹过滤词，转义通配符与 PostgREST 特殊字符。
        const escaped = keyword.replace(/[\\%_"]/g, (character) => "\\" + character);
        const pattern = '"%' + escaped + '%"';
        query = query.or("title.ilike." + pattern + ",summary.ilike." + pattern);
      }
    }

    const result = await request(
      query.order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(first, first + pageSize)
    );

    if (result.error) throw result.error;

    const rows = result.data || [];
    const listing = $("listing");

    listing.replaceChildren();

    rows.slice(0, pageSize).forEach((post) => {
      listing.append(page === "news" ? createTimelineItem(post) : createCard(post));
    });

    message(rows.length ? (page === "works" && keyword ? `搜索：${keyword}` : "") : (keyword ? "没有找到匹配的项目。" : "这一页暂无内容。"));

    $("pageNumber").textContent = `第 ${currentPage} 页`;

    previous.disabled = currentPage === 1;
    next.disabled = rows.length <= pageSize;

    function goToPage(number) {
      const parameters = new URLSearchParams();
      parameters.set("page", String(number));
      if (page === "works" && keyword) parameters.set("q", keyword);
      location.href = `${page}.html?${parameters.toString()}`;
    }
    previous.onclick = () => goToPage(currentPage - 1);
    next.onclick = () => goToPage(currentPage + 1);

    return;
  }

  // ---------- 内容详情 ----------

  if (page === "post") {
    const id = new URLSearchParams(location.search).get("id");

    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      message("内容地址无效。");
      return;
    }

    const result = await request(
      db
        .from("posts")
        .select("*")
        .eq("id", id)
        .eq("status", "published")
        .maybeSingle()
    );

    if (result.error) throw result.error;

    const post = result.data;

    if (!post) {
      message("内容不存在或尚未发布。");
      return;
    }

    document.title = `${post.title} — Fishyra`;

    $("backList").href =
      post.type === "project" ? "works.html" : "news.html";

    const content = $("postContent");
    const date = new Date(post.created_at).toLocaleDateString(
      "zh-CN"
    );

    content.replaceChildren();

    content.append(
      element("h1", post.title),
      element(
        "p",
        `${date} / ${(post.tags || []).join(" · ")}`,
        "muted"
      )
    );

    const image = createImage(post.cover_url);

    if (image) {
      image.style.width = "100%";
      image.style.maxHeight = "480px";
      image.style.objectFit = "cover";

      content.append(image);
    }

    content.append(
      element("p", post.summary || "", "muted"),
      element("div", post.body || "", "body-text markdown-pending")
    );

    const articleBody = content.querySelector(".markdown-pending");
    try {
      await renderMarkdown(articleBody, post.body || "");
    } catch (error) {
      // 组件不可用时仍保留原文，避免正文消失。
      message(error.message + " 当前显示原文。");
      return;
    }

    const projectURL = safeURL(post.project_url);

    if (projectURL) {
      content.append(
        externalLink(projectURL, "访问项目 ↗")
      );
    }

    message("");
    return;
  }

  // ---------- 管理后台 ----------

  if (page !== "admin") return;

  let posts = [];
  let selected = null;
  let dirty = false;
  let busy = false;

  const form = $("editor");

  const bodyInput = form.elements.body;
  const bodyLabel = form.querySelector('label[for="body"]');
  if (bodyLabel) bodyLabel.textContent = "正文（支持 Markdown 和图片）";
  bodyInput.placeholder = "## 标题\n\n正文内容，可使用 **加粗**。\n\n![图片说明](https://图片网址)";

  const tools = element("div", undefined, "markdown-tools");
  const previewButton = element("button", "预览正文");
  const imageButton = element("button", "插入图片");
  previewButton.type = "button";
  imageButton.type = "button";
  tools.append(previewButton, imageButton);
  bodyInput.before(tools);

  const help = element("p", "图片写法：![图片说明](图片网址)。也可以点击“插入图片”，粘贴图片链接。", "markdown-help");
  const preview = element("div");
  preview.id = "markdownPreview";
  preview.hidden = true;
  bodyInput.after(help, preview);

  imageButton.onclick = () => {
    const supplied = prompt("粘贴图片网址（HTTP 或 HTTPS）：");
    if (supplied === null) return;
    const url = safeURL(supplied.trim());
    if (!url) { message("请输入有效的图片网址。"); return; }
    const description = prompt("图片说明（可以留空）：", "") ?? "";
    const label = description.replace(/[\[\]\\]/g, "");
    const encodedURL = url.replace(/\(/g, "%28").replace(/\)/g, "%29");
    bodyInput.setRangeText("\n\n![" + label + "](" + encodedURL + ")\n\n",
      bodyInput.selectionStart, bodyInput.selectionEnd, "end");
    bodyInput.dispatchEvent(new Event("input", { bubbles: true }));
    bodyInput.focus();
  };

  previewButton.onclick = async () => {
    if (!preview.hidden) {
      preview.hidden = true;
      previewButton.textContent = "预览正文";
      return;
    }
    previewButton.disabled = true;
    try {
      await renderMarkdown(preview, bodyInput.value);
      preview.hidden = false;
      previewButton.textContent = "关闭预览";
    } catch (error) {
      message(error.message);
    } finally {
      previewButton.disabled = false;
    }
  };

  bodyInput.addEventListener("input", () => {
    preview.hidden = true;
    previewButton.textContent = "预览正文";
  });


  form.addEventListener("input", () => {
    dirty = true;
  });

  window.addEventListener("beforeunload", (event) => {
    if (dirty) {
      event.preventDefault();
      event.returnValue = "";
    }
  });

  function canLeaveEditor() {
    return (
      !dirty ||
      confirm("有尚未保存的修改，确定离开当前内容？")
    );
  }

  function setBusy(value) {
    busy = value;

    document
      .querySelectorAll("#dashboard button, #loginForm button")
      .forEach((button) => {
        button.disabled = value;
      });
  }

  function showLogin(text) {
    $("login").hidden = false;
    $("dashboard").hidden = true;

    message(text);
  }

  // 动态固定按时间排列；只有项目可调整排序。
  function syncSortingField() {
    const input = form.elements.sort_order;
    if (!input) return;
    const isProject = form.elements.type.value === "project";
    input.hidden = !isProject;
    input.required = isProject;
    const label = form.querySelector('label[for="sort_order"]');
    if (label) label.hidden = !isProject;
    const hint = input.nextElementSibling;
    if (hint && hint.tagName === "SMALL") hint.hidden = !isProject;
  }
  form.elements.type.addEventListener("change", syncSortingField);

  function edit(post) {
    preview.hidden = true;
    previewButton.textContent = "预览正文";
    selected = post;

    const fields = [
      "type",
      "title",
      "summary",
      "body",
      "cover_url",
      "project_url",
      "tags",
      "sort_order"
    ];

    fields.forEach((name) => {
      let value = name === "type" ? "project" : (name === "sort_order" ? 0 : "");

      if (post) {
        value =
          name === "tags"
            ? (post.tags || []).join(", ")
            : name === "sort_order" ? (post.sort_order ?? 0) : (post[name] || "");
      }

      form.elements[name].value = value;
    });

    $("editorTitle").textContent =
      post ? "编辑内容" : "新建内容";

    $("remove").hidden = !post;

    if (post) {
      const status =
        post.status === "published" ? "已发布" : "草稿";

      const updated = new Date(
        post.updated_at
      ).toLocaleString("zh-CN");

      $("postStatus").textContent =
        `${status} · 更新于 ${updated}`;
    } else {
      $("postStatus").textContent = "尚未保存";
    }

    syncSortingField();
    dirty = false;
  }

  function renderList() {
    const list = $("postList");
    const filter = $("filter").value;

    const rows = posts.filter((post) => {
      return filter === "all" || post.type === filter;
    });

    list.replaceChildren();

    if (!rows.length) {
      list.append(
        element(
          "p",
          "暂无内容，点击“新建内容”开始。",
          "muted"
        )
      );
    }

    rows.forEach((post) => {
      const button = element(
        "button",
        post.title,
        "item"
      );

      const type =
        post.type === "project"
          ? "Fishyra的项目们"
          : "动态";

      const status =
        post.status === "published" ? "已发布" : "草稿";

      button.type = "button";
      button.append(
        element("small", `${type} / ${status}` + (post.type === "project" ? ` / 排序：${post.sort_order ?? 0}` : ""))
      );

      button.onclick = () => {
        if (!busy && canLeaveEditor()) {
          edit(post);
        }
      };

      list.append(button);
    });
  }

  async function loadPosts() {
    const result = await request(
      db
        .from("posts")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
    );

    if (result.error) throw result.error;

    posts = result.data || [];
    renderList();
  }

  async function checkAccess() {
    const result = await request(db.auth.getUser());

    if (result.error) {
      if (
        result.error.name === "AuthSessionMissingError" ||
        result.error.status === 401 ||
        result.error.status === 403
      ) {
        showLogin("请输入管理员邮箱和密码。");
        return;
      }

      throw result.error;
    }

    const user = result.data.user;

    if (!user) {
      showLogin("请输入管理员邮箱和密码。");
      return;
    }

    const admin = await request(
      db
        .from("admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle()
    );

    if (admin.error) throw admin.error;

    if (!admin.data) {
      await request(db.auth.signOut({ scope: "local" }));

      showLogin("此账号没有管理员权限。");
      return;
    }

    await loadPosts();

    $("login").hidden = true;
    $("dashboard").hidden = false;

    edit(null);
    message(`已登录：${user.email || ""}`);
  }

  // ---------- 登录与退出 ----------

  $("loginForm").onsubmit = async (event) => {
    event.preventDefault();

    if (busy) return;

    setBusy(true);
    message("正在登录…");

    try {
      const result = await request(
        db.auth.signInWithPassword({
          email: $("email").value.trim(),
          password: $("password").value
        })
      );

      if (result.error) throw result.error;

      $("password").value = "";

      await checkAccess();
    } catch (error) {
      message(`登录失败：${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  $("logout").onclick = async () => {
    if (busy || !canLeaveEditor()) return;

    setBusy(true);

    try {
      const result = await request(
        db.auth.signOut({ scope: "local" })
      );

      if (result.error) throw result.error;

      posts = [];
      edit(null);

      $("postList").replaceChildren();
      showLogin("已退出登录。");
    } catch (error) {
      message(error.message);
    } finally {
      setBusy(false);
    }
  };

  // ---------- 新建、筛选、刷新 ----------

  $("newPost").onclick = () => {
    if (!busy && canLeaveEditor()) {
      edit(null);
    }
  };

  $("filter").onchange = renderList;

  $("reload").onclick = async () => {
    if (busy) return;

    setBusy(true);

    try {
      await loadPosts();
      message("列表已刷新。");
    } catch (error) {
      message(`刷新失败：${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  // ---------- 保存与发布 ----------

  async function save(status) {
    if (busy || !form.reportValidity()) return;

    const values = Object.fromEntries(
      new FormData(form)
    );

    values.title = values.title.trim();

    if (!values.title) {
      message("请填写标题。");
      return;
    }

    for (const name of ["cover_url", "project_url"]) {
      values[name] = values[name].trim();

      if (values[name] && !safeURL(values[name])) {
        message(
          "请填写完整的网址，例如 http://example.com 或 https://example.com。"
        );

        return;
      }
    }

    values.tags = values.tags
      .split(/[,，]/)
      .map((tag) => tag.trim())
      .filter(Boolean);

    const order = values.type === "project" ? Number(values.sort_order) : 0;

    if (!Number.isInteger(order) || order < -2147483648 || order > 2147483647) {
      message("排序请填写整数，例如 -10、0、10。");
      return;
    }

    values.sort_order = order;
    values.status = status;

    setBusy(true);
    message("正在保存…");

    try {
      let query;

      if (selected) {
        query = db
          .from("posts")
          .update(values)
          .eq("id", selected.id)
          .eq("updated_at", selected.updated_at);
      } else {
        query = db
          .from("posts")
          .insert(values);
      }

      const result = await request(
        query.select().maybeSingle()
      );

      if (result.error) throw result.error;

      if (!result.data) {
        throw new Error(
          "内容已变化或权限已失效，请刷新列表后重新打开。"
        );
      }

      edit(result.data);

      try {
        await loadPosts();
      } catch (error) {
        message(
          "内容已保存，但列表刷新失败。请稍后点击“刷新列表”。"
        );

        return;
      }

      message(
        status === "published"
          ? "已发布。项目或动态列表刷新后即可看到内容。"
          : "草稿已保存，仅管理员可见。"
      );
    } catch (error) {
      message(`保存未确认：${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  form.onsubmit = (event) => {
    event.preventDefault();
    save("published");
  };

  // 保存编辑内容，同时保留原来的发布状态。
  $("saveChanges").onclick = () => {
    save(selected ? selected.status : "draft");
  };

  $("draft").onclick = () => {
    save("draft");
  };

  // ---------- 删除内容 ----------

  $("remove").onclick = async () => {
    if (busy || !selected) return;

    const confirmed = confirm(
      `确定永久删除“${selected.title}”？此操作无法撤销。`
    );

    if (!confirmed) return;

    setBusy(true);

    try {
      const result = await request(
        db
          .from("posts")
          .delete()
          .eq("id", selected.id)
          .eq("updated_at", selected.updated_at)
          .select("id")
      );

      if (result.error) throw result.error;

      if (!result.data || !result.data.length) {
        throw new Error(
          "内容已变化或权限已失效，请刷新列表。"
        );
      }

      edit(null);

      try {
        await loadPosts();
        message("内容已删除。");
      } catch (error) {
        message("内容已删除，请稍后刷新列表。");
      }
    } catch (error) {
      message(`删除未确认：${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  // 先显示登录表单，检查失败时也不会只剩加载文字。
  showLogin("正在检查登录状态…");
  setBusy(true);

  try {
    await checkAccess();
  } finally {
    setBusy(false);
  }
}

start().catch((error) => {
  message(`暂时无法完成操作：${error.message}`);
});
