'use strict';
const $=id=>document.getElementById(id);
$('theme').onclick=()=>{const t=document.documentElement.dataset.theme==='light'?'dark':'light';document.documentElement.dataset.theme=t;try{localStorage.setItem('fishyra-theme',t)}catch(e){}};
const message=t=>{$('message').textContent=t;};
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
function safeURL(value){if(!value)return '';try{const u=new URL(value);return u.protocol==='https:'?u.href:''}catch(e){return ''}}
function image(value){const u=safeURL(value);if(!u)return null;const n=document.createElement('img');n.src=u;n.alt='';n.loading='lazy';n.referrerPolicy='no-referrer';n.onerror=()=>n.remove();return n;}
async function start(){
 if(!window.supabase||!window.FISHYRA_CONFIG)throw Error('连接组件加载失败，请检查网络并刷新页面。');
 const {url,key}=window.FISHYRA_CONFIG;
 const db=window.supabase.createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
 const page=document.body.dataset.page;
 function card(p){const card=el('article',undefined,'card'),img=image(p.cover_url);if(img)card.append(img);const content=el('div',undefined,'content');content.append(el('h3',p.title),el('p',p.summary),el('p',p.tags.join(' / '),'tags'));const a=el('a','查看内容 ↗','button');a.href='post.html?id='+encodeURIComponent(p.id);content.append(a);card.append(content);return card;}
 async function published(kind,from,to){const r=await db.from('posts').select('*').eq('status','published').eq('type',kind).order('created_at',{ascending:false}).order('id',{ascending:false}).range(from,to);if(r.error)throw r.error;return r.data;}
 if(page==='home'){
  const results=await Promise.all([published('project',0,1),published('news',0,1)]);
  results.forEach((posts,i)=>{const container=$(i===0?'projects':'updates');if(!posts.length)container.append(el('p','内容正在准备中。','muted'));posts.forEach(p=>container.append(card(p)))});message('');return;
 }
 if(page==='works'||page==='news'){
  const parsed=Number(new URLSearchParams(location.search).get('page')||1);const current=Number.isInteger(parsed)&&parsed>0?Math.min(parsed,100000):1;
  const rows=await published(page==='works'?'project':'news',(current-1)*6,current*6);
  rows.slice(0,6).forEach(p=>$('listing').append(card(p)));message(rows.length?'':'这一页暂无内容。');$('pageNumber').textContent='第 '+current+' 页';$('previous').disabled=current===1;$('next').disabled=rows.length<=6;
  function go(n){location.href=page+'.html?page='+n}$('previous').onclick=()=>go(current-1);$('next').onclick=()=>go(current+1);return;
 }
 if(page==='post'){
  const id=new URLSearchParams(location.search).get('id');if(!id||!/^[0-9a-f-]{36}$/i.test(id)){message('内容地址无效。');return}
  const r=await db.from('posts').select('*').eq('id',id).eq('status','published').maybeSingle();if(r.error)throw r.error;if(!r.data){message('内容不存在或尚未发布。');return}const p=r.data;document.title=p.title+' — Fishyra';$('backList').href=p.type==='project'?'works.html':'news.html';const content=$('postContent');content.append(el('h1',p.title),el('p',new Date(p.created_at).toLocaleDateString('zh-CN')+' / '+p.tags.join(' · '),'muted'));const img=image(p.cover_url);if(img){img.style.width='100%';img.style.maxHeight='480px';img.style.objectFit='cover';content.append(img)}content.append(el('p',p.summary,'muted'),el('div',p.body,'body-text'));const href=safeURL(p.project_url);if(href){const a=el('a','访问项目 ↗','button');a.href=href;a.target='_blank';a.rel='noopener noreferrer';content.append(a)}message('');return;
 }
 let posts=[],selected=null,dirty=false,busy=false;
 const form=$('editor');
 form.addEventListener('input',()=>dirty=true);
 window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
 const discard=()=>!dirty||confirm('有尚未保存的修改，确定离开当前内容？');
 function setBusy(v){busy=v;document.querySelectorAll('#dashboard button,#loginForm button').forEach(b=>b.disabled=v);}
 function edit(post){selected=post;for(const field of ['type','title','summary','body','cover_url','project_url','tags'])form.elements[field].value=post?(field==='tags'?post.tags.join(', '):post[field]):(field==='type'?'project':'');$('editorTitle').textContent=post?'编辑内容':'新建内容';$('postStatus').textContent=post?(post.status==='published'?'已发布':'草稿')+' · 更新于 '+new Date(post.updated_at).toLocaleString('zh-CN'):'尚未保存';$('remove').hidden=!post;dirty=false;}
 function render(){const list=$('postList');list.replaceChildren();const rows=posts.filter(p=>$('filter').value==='all'||p.type===$('filter').value);if(!rows.length)list.append(el('p','暂无内容，点击“新建内容”开始。','muted'));for(const p of rows){const b=el('button',p.title,'item');b.type='button';b.append(el('small',(p.type==='project'?'作品':'动态')+' / '+(p.status==='published'?'已发布':'草稿')));b.onclick=()=>{if(!busy&&discard())edit(p)};list.append(b)}}
 async function load(){const r=await db.from('posts').select('*').order('created_at',{ascending:false});if(r.error)throw r.error;posts=r.data;render();}
 async function access(){const {data,error}=await db.auth.getUser();if(error&&!data.user){$('login').hidden=false;$('dashboard').hidden=true;message('请输入管理员邮箱和密码。');return}if(!data.user){$('login').hidden=false;$('dashboard').hidden=true;message('请输入管理员邮箱和密码。');return}const r=await db.from('admins').select('user_id').eq('user_id',data.user.id).maybeSingle();if(r.error)throw r.error;if(!r.data){await db.auth.signOut({scope:'local'});$('login').hidden=false;$('dashboard').hidden=true;throw Error('此账号没有管理员权限，请使用已指定的管理员账号。')}$('login').hidden=true;$('dashboard').hidden=false;await load();edit(null);message('已登录：'+data.user.email);}
 $('loginForm').onsubmit=async e=>{e.preventDefault();setBusy(true);message('正在登录…');try{const r=await db.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(r.error)throw Error('登录失败：请检查邮箱、密码和账号确认状态。');$('password').value='';await access()}catch(e){message(e.message)}finally{setBusy(false)}};
 $('logout').onclick=async()=>{if(!discard())return;setBusy(true);try{const r=await db.auth.signOut({scope:'local'});if(r.error)throw r.error;dirty=false;posts=[];$('postList').replaceChildren();edit(null);$('dashboard').hidden=true;$('login').hidden=false;message('已退出登录。')}catch(e){message(e.message)}finally{setBusy(false)}};
 $('newPost').onclick=()=>{if(discard())edit(null)};
 $('filter').onchange=render;
 $('reload').onclick=async()=>{try{await load();message('列表已刷新。')}catch(e){message(e.message)}};
 async function save(status){if(busy||!form.reportValidity())return;const values=Object.fromEntries(new FormData(form));values.title=values.title.trim();if(!values.title){message('请填写标题。');return}for(const name of ['cover_url','project_url']){values[name]=values[name].trim();if(values[name]&&!safeURL(values[name])){message('封面与项目链接必须是完整的 https:// 地址。');return}}values.tags=values.tags.split(/[,，]/).map(t=>t.trim()).filter(Boolean);values.status=status;setBusy(true);message('正在保存…');try{let q=selected?db.from('posts').update(values).eq('id',selected.id).eq('updated_at',selected.updated_at):db.from('posts').insert(values);const r=await q.select().maybeSingle();if(r.error)throw r.error;if(!r.data)throw Error('未保存：内容已被修改、删除，或登录权限已失效。请刷新后重新打开。');edit(r.data);await load();message(status==='published'?'已发布。首页刷新后即可看到内容。':'草稿已保存，仅管理员可见。')}catch(e){message('保存失败：'+e.message)}finally{setBusy(false)}}
 form.onsubmit=e=>{e.preventDefault();save('published')};$('draft').onclick=()=>save('draft');
 $('remove').onclick=async()=>{if(busy||!selected||!confirm('确定永久删除“'+selected.title+'”？此操作无法撤销。'))return;setBusy(true);try{const r=await db.from('posts').delete().eq('id',selected.id).eq('updated_at',selected.updated_at).select('id');if(r.error)throw r.error;if(!r.data.length)throw Error('未删除：内容已变化或登录权限已失效，请刷新列表。');edit(null);await load();message('内容已删除。')}catch(e){message(e.message)}finally{setBusy(false)}};
 await access();
}
start().catch(e=>message('暂时无法完成操作：'+e.message));
