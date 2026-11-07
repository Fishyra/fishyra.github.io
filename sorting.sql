-- 在 Supabase SQL Editor 新建查询，运行一次。
-- 现有内容默认排序为 0，不改动正文、草稿或发布状态。
alter table public.posts
  add column if not exists sort_order integer not null default 0;

create index if not exists posts_sort_order_idx
  on public.posts (status, type, sort_order asc, created_at desc, id desc);

-- 确认新字段可用。
select id, title, sort_order
from public.posts
order by sort_order asc, created_at desc, id desc
limit 30;
