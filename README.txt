Fishyra 内容管理版

部署到现有 GitHub Pages：
1. 解压压缩包，将其中所有文件上传到 fishyra.github.io 仓库根目录。
2. index.html 会替换现有首页，请先保留旧版副本。
3. 提交后等待 GitHub Pages 部署完成。
4. 打开 https://fishyra.github.io/admin.html，用已创建的管理员邮箱和密码登录。
5. 新建作品或动态，保存草稿，或点击发布。

页面结构：
index.html 首页：最多展示两篇最新作品和两篇最新动态。
works.html 作品列表：每页六篇。
news.html 动态列表：每页六篇。
post.html?id=内容ID：独立详情页。
admin.html 管理后台：邮箱密码登录、编辑、草稿、发布和删除。

当前数据库为空，原来的 ØMAN、LiveSpear 需要在后台各创建一次。
正文当前为纯文本，支持换行；封面使用 https 图片网址，不含图片上传。
所有公开页面都只读取已发布内容。
config.js 中只包含公开的 publishable key。
登录密码不写在文件中，由 Supabase 验证。
依赖 jsDelivr 的 Supabase JS 组件，以及 Supabase 服务网络可达。

尚需真实管理员登录后验证保存和发布；本地未使用你的账号密码。
