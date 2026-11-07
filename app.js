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

    const pageSize = 6;
    const first = (currentPage - 1) * pageSize;

    const result = await request(
      db
        .from("posts")
        .select("*")
        .eq("status", "published")
        .eq("type", page === "works" ? "project" : "news")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(first, first + pageSize)
    );

    if (result.error) throw result.error;

    const rows = result.data || [];
    const listing = $("listing");

    listing.replaceChildren();

    rows.slice(0, pageSize).forEach((post) => {
      listing.append(createCard(post));
    });

    message(rows.length ? "" : "这一页暂无内容。");

    $("pageNumber").textContent = `第 ${currentPage} 页`;

    previous.disabled = currentPage === 1;
    next.disabled = rows.length <= pageSize;

    previous.onclick = () => {
      location.href = `${page}.html?page=${currentPage - 1}`;
    };

    next.onclick = () => {
      location.href = `${page}.html?page=${currentPage + 1}`;
    };

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
      element("div", post.body || "", "body-text")
    );

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

  function edit(post) {
    selected = post;

    const fields = [
      "type",
      "title",
      "summary",
      "body",
      "cover_url",
      "project_url",
      "tags"
    ];

    fields.forEach((name) => {
      let value = name === "type" ? "project" : "";

      if (post) {
        value =
          name === "tags"
            ? (post.tags || []).join(", ")
            : post[name] || "";
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
        element("small", `${type} / ${status}`)
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
