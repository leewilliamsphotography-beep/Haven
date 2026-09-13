'use strict';
if ('scrollRestoration' in history) { history.scrollRestoration = 'manual'; }
window.addEventListener('load', function() { window.scrollTo(0, 0); });

if ('serviceWorker' in navigator && !window.location.pathname.endsWith('staff.html') && !window.location.pathname.includes('bingo')) { 
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(err => console.log('SW registration failed: ', err)); }); 
}

let supabaseClient;

function safeGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
function safeSet(k,v){try{localStorage.setItem(k,v)}catch(e){}}
function generateSeasonalBackground(s){const bg=document.getElementById('seasonal-bg');if(!bg)return;bg.innerHTML='';if(!s)return;const c=window.innerWidth<768?15:20;for(let i=0;i<c;i++){const el=document.createElement('div');el.className='season-el '+s;el.style.left=Math.random()*100+'vw';el.style.animationDuration=(Math.random()*10+10)+'s';el.style.animationDelay=(Math.random()*15)+'s';const size=Math.random()*12+8;el.style.width=size+'px';el.style.height=size+'px';if(s==='winter')el.classList.add('snow');else if(s==='spring')el.classList.add('petal');else if(s==='summer')el.classList.add('sunbeam');else if(s==='autumn')el.classList.add('leaf');else return;bg.appendChild(el)}}

function timeAgo(date) {
    if (!date) return "";
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return "Just now";
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (Math.floor(interval) === 1) return "Yesterday";
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (Math.floor(interval) === 1) return "1 hour ago";
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return "Just now";
}

const TimeModule=(function(){
    function u(){
        const n=new Date();
        const d=n.toLocaleDateString('en-GB',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
        const t=n.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
        const e=document.getElementById('liveTimeDate');
        if(e)e.textContent=d+' • '+t;
    }
    function init(){u();setInterval(u,1000)}
    return{init};
})();

const ToastModule=(function(){
    const c=document.getElementById('toast-container');
    function show(msg){
        const t=document.createElement('div');
        t.className='toast';
        t.innerHTML=`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l2.5 7.5H22l-6.2 4.5 2.4 7.5L12 17l-6.2 4.5 2.4-7.5L2 9.5h7.5z"/></svg><span>${msg}</span>`;
        if(c) c.appendChild(t);
        setTimeout(()=>t.classList.add('show'),100);
        setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.remove(),400)},5000);
    }
    function init(){}
    return{init, show};
})();

const SplashModule = (function () {
  function init() {
    const splash = document.getElementById('splash-screen');
    const enterBtn = document.getElementById('enterAppBtn');
    if (!splash || !enterBtn) return;
    const hasVisited = safeGet('th-visited');
    function closeSplash() { splash.classList.add('hidden'); document.body.style.overflow = 'auto'; safeSet('th-visited', 'true'); }
    if (hasVisited === 'true') { splash.classList.add('hidden'); document.body.style.overflow = 'auto'; } 
    else { document.body.style.overflow = 'hidden'; }
    enterBtn.addEventListener('click', closeSplash);
  }
  return { init };
})();

const LayoutModule=(function(){const defaultOrder=['about','values','activities','featured-events','film-night','wilf','gallery','social','day','whats-new','faq','visit','changelog'];const key='th-layout-order';let currentOrder=[];function getOrder(){try{const saved=JSON.parse(safeGet(key));if(Array.isArray(saved)&&saved.length===defaultOrder.length){return saved;}}catch(e){}return[...defaultOrder];}function saveOrder(order){safeSet(key,JSON.stringify(order));}function applyLayout(order){const main=document.getElementById('main');const nav=document.getElementById('side-nav');if(!main||!nav)return;order.forEach(id=>{const section=document.getElementById(id);if(section){main.appendChild(section);}});order.forEach(id=>{const dot=nav.querySelector(`a[href="#${id}"]`);if(dot){nav.appendChild(dot);}});}function renderAdminUI(){const container=document.getElementById('layoutContainer');if(!container)return;container.innerHTML='';currentOrder.forEach((id,index)=>{const item=document.createElement('div');item.className='admin-film-item flex justify-between items-center';item.style.padding='8px 12px';const title=id.replace(/-/g,' ').replace(/\b\w/g,l=>l.toUpperCase());item.innerHTML=`<span style="text-transform:capitalize;font-size:.9rem">${title}</span><div class="flex gap-2"><button class="tester-btn layout-up" data-index="${index}" style="width: auto; margin: 0; padding: 4px 10px; font-size: 0.8rem; background: var(--cream-deep); color: var(--bark); border: 1px solid var(--border); ${index === 0 ? 'opacity: 0.3; pointer-events: none;' : ''}">▲</button><button class="tester-btn layout-down" data-index="${index}" style="width: auto; margin: 0; padding: 4px 10px; font-size: 0.8rem; background: var(--cream-deep); color: var(--bark); border: 1px solid var(--border); ${index === currentOrder.length - 1 ? 'opacity: 0.3; pointer-events: none;' : ''}">▼</button></div>`;container.appendChild(item);});container.querySelectorAll('.layout-up').forEach(btn=>{btn.addEventListener('click',(e)=>{const idx=parseInt(e.target.dataset.index);if(idx>0){[currentOrder[idx-1],currentOrder[idx]]=[currentOrder[idx],currentOrder[idx-1]];saveOrder(currentOrder);applyLayout(currentOrder);renderAdminUI();}});});container.querySelectorAll('.layout-down').forEach(btn=>{btn.addEventListener('click',(e)=>{const idx=parseInt(e.target.dataset.index);if(idx<currentOrder.length-1){[currentOrder[idx+1],currentOrder[idx]]=[currentOrder[idx],currentOrder[idx+1]];saveOrder(currentOrder);applyLayout(currentOrder);renderAdminUI();}});});}function resetLayout(){currentOrder=[...defaultOrder];saveOrder(currentOrder);applyLayout(currentOrder);renderAdminUI();ToastModule.show("Layout reset to default!");}function init(){currentOrder=getOrder();applyLayout(currentOrder);const resetBtn=document.getElementById('resetLayoutBtn');if(resetBtn){resetBtn.addEventListener('click',resetLayout);}}function onTesterOpen(){renderAdminUI();}return{init,onTesterOpen};})();

const LightboxModule=(function(){
    function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
    let imgs=[];
    const fallbackImgs=shuffle([{src:'https://i.ibb.co/xSq92n0r/123-1.jpg',alt:'Beautiful flower 1'},{src:'https://i.ibb.co/WNjYC10y/123-2.jpg',alt:'Beautiful flower 2'},{src:'https://i.ibb.co/Y7WfbmDV/123-3.jpg',alt:'Beautiful flower 3'},{src:'https://i.ibb.co/wFBgfMtX/123-4.jpg',alt:'Beautiful flower 4'},{src:'https://i.ibb.co/4nKQ3X6s/123-5.jpg',alt:'Beautiful flower 5'},{src:'https://i.ibb.co/dsc78qPJ/123-6.jpg',alt:'Beautiful flower 6'}]);
    let cur=0,lb,li,lc,lp,ln,lct,g,anim=false,tsx=0;
    
    async function loadImages(){
        if(!supabaseClient){imgs=fallbackImgs;renderGallery();return;}
        try{
            const{data,error}=await supabaseClient.from('gallery_items').select('*').order('created_at',{ascending:false});
            if(data&&data.length>0){
                imgs=data.map(item=>{
                    const{data:urlData}=supabaseClient.storage.from('gallery').getPublicUrl(item.storage_path);
                    return{src:urlData.publicUrl,alt:item.caption||'Gallery Photo',category:item.category||'General'};
                });
            }else{imgs=fallbackImgs;}
        }catch(e){imgs=fallbackImgs;}
        renderGallery();
    }
    
    function renderGallery(){
        if(!g)return;
        g.innerHTML='';
        if(imgs.length===0){g.innerHTML='<p style="color:var(--bark-soft);text-align:center;grid-column:1/-1;">No photos yet.</p>';return;}
        
        const isMobile = window.innerWidth < 768;
        g.style.display = 'block'; 
        g.style.columnCount = isMobile ? '2' : '3';
        g.style.columnGap = '12px';
        
        const categories = ['All', ...new Set(imgs.map(i => i.category).filter(Boolean))];
        if(categories.length > 1){
            const filterDiv = document.createElement('div');
            filterDiv.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;justify-content:center;column-span:all;';
            categories.forEach(cat => {
                const btn = document.createElement('button');
                btn.textContent = cat;
                btn.className = 'gallery-filter-btn';
                btn.dataset.category = cat;
                btn.style.cssText = 'padding: 6px 14px; border: 1px solid var(--border); background: var(--cream-deep); color: var(--bark); border-radius: 20px; cursor: pointer; font-weight: 600; font-size: 0.85rem; transition: var(--transition);';
                btn.addEventListener('click', (e) => {
                    document.querySelectorAll('.gallery-filter-btn').forEach(b => {
                        b.style.background = 'var(--cream-deep)'; b.style.color = 'var(--bark)';
                    });
                    e.target.style.background = 'var(--terracotta)'; e.target.style.color = '#fff';
                    renderFilteredGallery(cat);
                });
                filterDiv.appendChild(btn);
            });
            g.appendChild(filterDiv);
            filterDiv.querySelector('button').click();
        } else {
            renderFilteredGallery('All');
        }
    }
    
    function renderFilteredGallery(category){
        const thumbs = g.querySelectorAll('.gallery-thumb, .gallery-cta');
        thumbs.forEach(t => t.remove());
        
        const filtered = category === 'All' ? imgs : imgs.filter(i => i.category === category);
        filtered.slice(0,6).forEach((io,idx)=>{
            const t=document.createElement('img');
            t.src=io.src;t.alt=`View ${io.alt}`;
            t.className='gallery-thumb blur-load';t.loading='lazy';
            t.style.width = '100%'; t.style.height = 'auto'; t.style.marginBottom = '12px'; t.style.borderRadius = '12px'; t.style.display = 'block'; t.style.breakInside = 'avoid';
            t.addEventListener('load',()=>t.classList.add('loaded'));
            t.addEventListener('click',()=>o(idx, filtered));
            g.appendChild(t);
        });
        
        if(filtered.length > 0){
            const v=document.createElement('button');
            v.className='gallery-cta';
            v.setAttribute('aria-label','Open full photo gallery');
            v.innerHTML=`<div class="gallery-cta-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2-3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg></div><div class="gallery-cta-text">View All ${filtered.length} Photos</div>`;
            v.style.columnSpan = 'all'; v.style.marginTop = '12px'; v.style.width = '100%';
            v.addEventListener('click',()=>o(0, filtered));
            g.appendChild(v);
        }
    }
    
    function pl(){for(let i=-1;i<=2;i++){const idx=(cur+i+imgs.length)%imgs.length;const img=new Image();img.src=imgs[idx].src}}
    function r(d){if(anim)return;anim=true;const oc=d==='next'?'flip-out-next':'flip-out-prev',ic=d==='next'?'flip-in-next':'flip-in-prev';li.classList.add(oc);li.classList.remove('flip-in-next','flip-in-prev');void li.offsetWidth;setTimeout(()=>{li.src=imgs[cur].src;li.alt=imgs[cur].alt;lct.textContent=`${cur+1} / ${imgs.length}`;li.classList.remove(oc);void li.offsetWidth;li.classList.add(ic);setTimeout(()=>{anim=false;pl()},250)},250)}
    function o(i, list){if(list) imgs = list; cur=i;li.classList.remove('flip-in-next','flip-in-prev','flip-out-next','flip-out-prev');li.src=imgs[cur].src;li.alt=imgs[cur].alt;lct.textContent=`${cur+1} / ${imgs.length}`;lb.classList.add('active');anim=false;pl();}
    function c(){lb.classList.remove('active')}
    function n(){if(anim)return;cur=(cur+1)%imgs.length;r('next')}
    function p(){if(anim)return;cur=(cur-1+imgs.length)%imgs.length;r('prev')}
    function hk(e){if(!lb.classList.contains('active'))return;switch(e.key){case'Escape':c();break;case'ArrowRight':n();break;case'ArrowLeft':p();break}}
    function hts(e){tsx=e.changedTouches[0].clientX}
    function hte(e){if(!lb.classList.contains('active'))return;const tex=e.changedTouches[0].clientX,d=tex-tsx;if(Math.abs(d)>50){if(d<0)n();else p()}}
    function init(){
        lb=document.getElementById('lightbox');li=document.getElementById('lightboxImg');lc=document.getElementById('lightboxClose');lp=document.getElementById('lightboxPrev');ln=document.getElementById('lightboxNext');lct=document.getElementById('lightboxCounter');g=document.getElementById('galleryGrid');
        if(!lb||!g)return;loadImages();lc.addEventListener('click',c);ln.addEventListener('click',e=>{e.stopPropagation();n()});lp.addEventListener('click',e=>{e.stopPropagation();p()});li.addEventListener('click',e=>{e.stopPropagation();n()});lb.addEventListener('click',e=>{if(e.target===lb)c()});document.addEventListener('keydown',hk);lb.addEventListener('touchstart',hts,{passive:true});lb.addEventListener('touchend',hte,{passive:true})
    }
    return{init,loadImages};
})();

const DashboardModule=(function(){
    async function loadDashboard(){
        const sb = window.supabaseClient;
        if(!sb) return;
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const currentDayName = now.toLocaleDateString('en-GB', { weekday: 'long' });
        
        try {
            const [briefingRes, wilfRes, enquiriesRes, eventsRes, menuRes, celebRes] = await Promise.all([
                sb.from('daily_briefing').select('message').eq('id',1).single(),
                sb.from('wilf_status').select('is_visiting').eq('id',1).single(),
                sb.from('enquiries').select('id, created_at'),
                sb.from('events').select('*').gte('event_date', todayStr).order('event_date',{ascending:true}),
                sb.from('weekly_menu').select('*').eq('day_name', currentDayName).single(),
                sb.from('celebrations').select('*').order('month',{ascending:true}).order('day',{ascending:true})
            ]);

            function makeCardClickable(cardId, tabName) {
                const card = document.getElementById(cardId);
                if(card) {
                    card.style.cursor = 'pointer'; card.style.transition = 'transform 0.2s, border-color 0.2s';
                    card.onmouseenter = () => { card.style.transform = 'translateY(-3px)'; card.style.borderColor = 'var(--accent)'; };
                    card.onmouseleave = () => { card.style.transform = 'translateY(0)'; card.style.borderColor = 'var(--border)'; };
                    card.onclick = () => {
                        document.querySelectorAll('.tester-tab-btn').forEach(btn => btn.classList.remove('active'));
                        document.querySelectorAll('.tester-tab-content').forEach(tab => { tab.classList.remove('active'); tab.style.display = 'none'; });
                        const targetBtn = document.querySelector(`button[data-tab="${tabName}"]`);
                        if(targetBtn) targetBtn.classList.add('active');
                        const activeTab = document.getElementById(`tab-${tabName}`);
                        if (activeTab) { activeTab.classList.add('active'); activeTab.style.display = 'block'; }
                        const tabs = document.querySelector('.tester-tabs'); const backdrop = document.getElementById('mobileBackdrop');
                        if (tabs) tabs.classList.remove('mobile-open'); if (backdrop) backdrop.style.display = 'none';
                        localStorage.setItem('haven_active_tab', tabName);
                    };
                }
            }
            makeCardClickable('dashBriefing', 'briefing'); makeCardClickable('dashWilf', 'wilf'); makeCardClickable('dashEnquiries', 'enquiries'); makeCardClickable('dashEvents', 'events'); makeCardClickable('dashMenu', 'menu'); makeCardClickable('dashCelebrations', 'celebrations');

            const bContent = document.getElementById('dashBriefingContent');
            if(briefingRes.data && briefingRes.data.message && briefingRes.data.message.trim() !== ''){ bContent.innerHTML = `<p style="color: var(--fg); font-size: 1rem; font-weight: 600;">"${briefingRes.data.message}"</p><span style="font-size:0.75rem; color:var(--muted-2); display:block; margin-top:8px;">Click to edit &rarr;</span>`; } else { bContent.innerHTML = '<p style="color: var(--muted);">No briefing set for today.</p><span style="font-size:0.75rem; color:var(--muted-2); display:block; margin-top:8px;">Click to set &rarr;</span>'; }
            const wContent = document.getElementById('dashWilfContent');
            if(wilfRes.data && wilfRes.data.is_visiting){ wContent.innerHTML = '<span style="color: var(--accent); font-weight: 700; font-size: 1.1rem;">Wilf is visiting today! 🎉</span><span style="font-size:0.75rem; color:var(--muted-2); display:block; margin-top:8px;">Click to change &rarr;</span>'; } else { wContent.innerHTML = '<span style="color: var(--muted);">Wilf is currently off-site.</span><span style="font-size:0.75rem; color:var(--muted-2); display:block; margin-top:8px;">Click to change &rarr;</span>'; }
            const eContent = document.getElementById('dashEnquiriesContent');
            const enqCount = enquiriesRes.data ? enquiriesRes.data.length : 0;
            if(enqCount > 0){ eContent.innerHTML = `<span style="color: var(--fg); font-weight: 700; font-size: 1.5rem;">${enqCount}</span> <span style="color: var(--muted);">unread enquiry(s).</span><span style="font-size:0.75rem; color:var(--muted-2); display:block; margin-top:8px;">Click to view &rarr;</span>`; } else { eContent.innerHTML = '<span style="color: var(--muted);">Inbox zero! No new enquiries.</span><span style="font-size:0.75rem; color:var(--muted-2); display:block; margin-top:8px;">Click to view &rarr;</span>'; }
            const evContent = document.getElementById('dashEventsContent');
            const todayEvents = eventsRes.data ? eventsRes.data.filter(ev => ev.event_date === todayStr) : [];
            if(todayEvents.length > 0){ evContent.innerHTML = todayEvents.map(ev => `<div style="background: var(--surface-2); padding: 8px 12px; border-radius: 8px; margin-bottom: 8px; color: var(--fg);"><strong>${ev.title}</strong></div>`).join('') + '<span style="font-size:0.75rem; color:var(--muted-2); display:block; margin-top:8px;">Click to manage events &rarr;</span>'; } else { evContent.innerHTML = '<span style="color: var(--muted);">No events scheduled for today.</span><span style="font-size:0.75rem; color:var(--muted-2); display:block; margin-top:8px;">Click to add event &rarr;</span>'; }
            const mContent = document.getElementById('dashMenuContent');
            if(menuRes.data && menuRes.data.meal_text && menuRes.data.meal_text.trim() !== ''){ mContent.innerHTML = `<p style="color: var(--fg); font-size: 1rem; font-weight: 600;">${menuRes.data.meal_text}</p><span style="font-size:0.75rem; color:var(--muted-2); display:block; margin-top:8px;">Click to edit menu &rarr;</span>`; } else { mContent.innerHTML = '<span style="color: var(--muted);">Today\'s menu has not been updated.</span><span style="font-size:0.75rem; color:var(--muted-2); display:block; margin-top:8px;">Click to update &rarr;</span>'; }
            
            const wWeather = document.getElementById('dashWeatherContent');
            try {
                const weatherRes = await fetch('https://api.open-meteo.com/v1/forecast?latitude=50.96&longitude=0.21&daily=weather_code&timezone=GMT');
                const weatherData = await weatherRes.json();
                const tomorrowCode = weatherData.daily.weather_code[1];
                let suggestion = '';
                if (tomorrowCode === 0 || tomorrowCode <= 2) suggestion = "☀️ Sunny/Clear tomorrow: Plan a garden walk or outdoor tea!";
                else if (tomorrowCode >= 3 && tomorrowCode <= 48) suggestion = "🌫️ Cloudy/Foggy tomorrow: A good day for indoor arts & crafts.";
                else if ((tomorrowCode >= 51 && tomorrowCode <= 67) || (tomorrowCode >= 80 && tomorrowCode <= 82)) suggestion = "🌧️ Rain tomorrow: Perfect for a cozy movie afternoon.";
                else if ((tomorrowCode >= 71 && tomorrowCode <= 77) || (tomorrowCode >= 85 && tomorrowCode <= 86)) suggestion = "❄️ Snow tomorrow: Keep warm, maybe some indoor baking.";
                else if (tomorrowCode >= 95) suggestion = "⛈️ Storm tomorrow: Ensure all outdoor furniture is secured today.";
                else suggestion = "Check weather for activity planning.";
                wWeather.innerHTML = `<p style="color: var(--fg); font-size: 0.95rem;">${suggestion}</p>`;
            } catch (e) { wWeather.innerHTML = '<span style="color: var(--muted);">Weather forecast unavailable.</span>'; }

            const cContent = document.getElementById('dashCelebContent');
            if(celebRes.data && celebRes.data.length > 0){
                const today = new Date(); today.setHours(0,0,0,0);
                const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);
                const upcoming = celebRes.data.filter(c => {
                    let celebDate = new Date(today.getFullYear(), c.month - 1, c.day);
                    if (celebDate < today) celebDate.setFullYear(today.getFullYear() + 1);
                    return celebDate >= today && celebDate <= nextWeek;
                }).slice(0, 3);
                if(upcoming.length > 0){
                    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    cContent.innerHTML = upcoming.map(c => `<div style="background: var(--surface-2); padding: 8px 12px; border-radius: 8px; margin-bottom: 8px; color: var(--fg);"><strong>${c.name}</strong> - ${c.day} ${monthNames[c.month-1]} (${c.type})</div>`).join('') + '<span style="font-size:0.75rem; color:var(--muted-2); display:block; margin-top:8px;">Click to manage &rarr;</span>';
                } else { cContent.innerHTML = '<span style="color: var(--muted);">No celebrations in the next 7 days.</span>'; }
            } else { cContent.innerHTML = '<span style="color: var(--muted);">No celebrations listed.</span>'; }

        } catch(err){
            console.error("Dashboard load error:", err);
            document.querySelectorAll('[id^="dash"]').forEach(el => {
                if(el.id.includes('Content')) el.innerHTML = '<span style="color: var(--muted);">Error loading data.</span>';
            });
        }
    }
    function init(){}
    return { init, loadDashboard };
})();

const EventsModule=(function(){
    async function loadEvents(){const c=document.getElementById('eventsContainer');if(!c||!supabaseClient)return;try{let now=new Date().toISOString();const{data,error}=await supabaseClient.from('events').select('*').gte('event_date',now.split('T')[0]).order('event_date',{ascending:true});if(error)throw error;if(!data||data.length===0){c.innerHTML='<p style="color:var(--bark-soft);text-align:center;grid-column:1/-1;">No upcoming events scheduled right now.</p>';return;}c.innerHTML=data.slice(0,3).map(ev=>{const d=new Date(ev.event_date).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});return `<div class="card p-6 flex flex-col"><div class="display font-extrabold text-lg mb-2" style="color:var(--teal)">${ev.title}</div><div class="text-sm font-bold mb-3" style="color:var(--bark-soft)">${d}</div><p class="text-sm" style="color:var(--bark-soft)">${ev.description||''}</p></div>`;}).join('');}catch(e){c.innerHTML='<p style="color:var(--bark-soft);text-align:center;grid-column:1/-1;">Could not load events.</p>';}}
    async function loadAdminEvents(){const ac=document.getElementById('adminEventContainer');if(!ac||!supabaseClient)return;ac.innerHTML='<p class="text-sm" style="color: var(--bark-soft);">Loading events...</p>';try{const{data,error}=await supabaseClient.from('events').select('*').order('event_date',{ascending:true});if(error)throw error;if(!data||data.length===0){ac.innerHTML='<p class="text-sm" style="color: var(--bark-soft);">No events found.</p>';return;}ac.innerHTML=data.map(ev=>`<div class="admin-film-item" style="padding: 8px 12px;"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;"><span style="font-size:.8rem;font-weight:700;flex:1;">${ev.title} (${new Date(ev.event_date).toLocaleDateString('en-GB')})</span><button class="tester-btn del-event-btn" data-id="${ev.id}" style="width:auto;margin:0;padding:4px 8px;font-size:0.7rem;background:var(--terracotta);">Delete</button></div></div>`).join('');ac.querySelectorAll('.del-event-btn').forEach(btn=>btn.addEventListener('click',async(e)=>{const id=e.target.dataset.id;try{await supabaseClient.from('events').delete().eq('id',id);ToastModule.show('Event deleted!');loadAdminEvents();loadEvents();}catch(err){ToastModule.show('Error deleting event.');}}));}catch(e){ac.innerHTML='<p class="text-sm" style="color: var(--terracotta);">Error loading events.</p>';}}
    async function addEvent(){const t=document.getElementById('newEventTitle').value.trim();const d=document.getElementById('newEventDate').value;const desc=document.getElementById('newEventDesc').value.trim();if(!t||!d){ToastModule.show('Title and Date are required.');return;}try{const{error}=await supabaseClient.from('events').insert([{title:t,event_date:d,description:desc}]);if(error)throw error;ToastModule.show('Event added!');document.getElementById('newEventTitle').value='';document.getElementById('newEventDate').value='';document.getElementById('newEventDesc').value='';loadAdminEvents();loadEvents();}catch(err){ToastModule.show('Error adding event.');}}
    function init(){loadEvents();const addBtn=document.getElementById('addEventBtn');if(addBtn)addBtn.addEventListener('click',addEvent);}
    return{init,loadAdminEvents,loadEvents};
})();

const EnquiriesModule=(function(){
    async function loadAdminEnquiries(){const ac=document.getElementById('adminEnquiriesContainer');if(!ac||!supabaseClient)return;ac.innerHTML='<p class="text-sm" style="color: var(--bark-soft);">Loading enquiries...</p>';try{const{data,error}=await supabaseClient.from('enquiries').select('*').order('created_at',{ascending:false});if(error) throw error;if(!data||data.length===0){ ac.innerHTML='<p class="text-sm" style="color: var(--bark-soft);">No new enquiries.</p>'; return; }ac.innerHTML=data.map(enq=>{const d=new Date(enq.created_at).toLocaleString('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});return `<div class="admin-film-item" style="padding: 12px;"><div style="display:flex; justify-content:space-between; align-items:start; gap:8px; margin-bottom:6px;"><div><span style="font-weight:700; font-size:.9rem;">${enq.name}</span><span style="font-size:.75rem; color:var(--bark-soft); margin-left:8px;">${d}</span></div><button class="tester-btn del-enq-btn" data-id="${enq.id}" style="width:auto; margin:0; padding:4px 8px; font-size:0.7rem; background:var(--terracotta);">Delete</button></div><a href="mailto:${enq.email}" style="font-size:.85rem; color:var(--teal); font-weight:600; display:block; margin-bottom:6px;">${enq.email}</a><p style="font-size:.85rem; color:var(--bark-soft); line-height:1.4;">${enq.message}</p></div>`;}).join('');ac.querySelectorAll('.del-enq-btn').forEach(btn=>btn.addEventListener('click',async(e)=>{const id=e.target.dataset.id;try{ await supabaseClient.from('enquiries').delete().eq('id',id); ToastModule.show('Enquiry deleted!'); loadAdminEnquiries(); }catch(err){ ToastModule.show('Error deleting enquiry.'); }}));}catch(e){ ac.innerHTML='<p class="text-sm" style="color: var(--terracotta);">Error loading enquiries.</p>'; }}
    function init(){const form=document.getElementById('contactForm');if(form){form.addEventListener('submit',async(e)=>{e.preventDefault();const name=document.getElementById('contactName').value.trim();const email=document.getElementById('contactEmail').value.trim();const message=document.getElementById('contactMessage').value.trim();if(name&&email&&message){try{await supabaseClient.from('enquiries').insert([{name:name,email:email,message:message}]);ToastModule.show("Enquiry sent successfully!");form.reset();}catch(err){ToastModule.show("Error sending enquiry.");}}});}}
    return{init,loadAdminEnquiries};
})();

const BriefingModule=(function(){
    async function loadBriefing(){const bar=document.getElementById('briefing-bar');const textEl=document.getElementById('briefing-text');const input=document.getElementById('briefingInput');if(!bar||!supabaseClient) return;try{const{data,error}=await supabaseClient.from('daily_briefing').select('message').eq('id',1).single();if(error) throw error;if(data&&data.message&&data.message.trim()!==''){ textEl.textContent=data.message; bar.style.display='block'; if(input) input.value=data.message; } else { bar.style.display='none'; }}catch(e){ bar.style.display='none'; }}
    async function saveBriefing(){const input=document.getElementById('briefingInput');if(!input||!supabaseClient) return;const msg=input.value.trim();try{const{error}=await supabaseClient.from('daily_briefing').update({message:msg}).eq('id',1);if(error) throw error;ToastModule.show("Briefing updated!");loadBriefing();}catch(err){ ToastModule.show("Error saving briefing."); }}
    function init(){loadBriefing();const btn=document.getElementById('saveBriefingBtn');if(btn) btn.addEventListener('click',saveBriefing);}
    return{init,loadBriefing};
})();

const CelebrationModule=(function(){
    async function loadCelebrations(){const c=document.getElementById('celebrationsContainer');if(!c||!supabaseClient)return;try{const{data,error}=await supabaseClient.from('celebrations').select('*');if(error)throw error;if(!data||data.length===0){c.innerHTML='<p style="color:var(--bark-soft);text-align:center;grid-column:1/-1;">No upcoming celebrations listed right now.</p>';return;}}catch(e){}}
    async function loadAdminCelebrations(){const ac=document.getElementById('adminCelebContainer');if(!ac||!supabaseClient)return;ac.innerHTML='<p class="text-sm" style="color: var(--bark-soft);">Loading...</p>';try{const{data,error}=await supabaseClient.from('celebrations').select('*').order('month',{ascending:true}).order('day',{ascending:true});if(error)throw error;if(!data||data.length===0){ac.innerHTML='<p class="text-sm" style="color: var(--bark-soft);">No celebrations found.</p>';return;}const monthNames=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];ac.innerHTML=data.map(ev=>`<div class="admin-film-item" style="padding: 8px 12px;"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;"><span style="font-size:.8rem;font-weight:700;flex:1;">${ev.name} (${ev.day} ${monthNames[ev.month-1]}) - ${ev.type}</span><button class="tester-btn del-celeb-btn" data-id="${ev.id}" style="width:auto;margin:0;padding:4px 8px;font-size:0.7rem;background:var(--terracotta);">Delete</button></div></div>`).join('');ac.querySelectorAll('.del-celeb-btn').forEach(btn=>btn.addEventListener('click',async(e)=>{const id=e.target.dataset.id;try{await supabaseClient.from('celebrations').delete().eq('id',id);ToastModule.show('Celebration deleted!');loadAdminCelebrations();loadCelebrations();}catch(err){ToastModule.show('Error deleting celebration.');}}));}catch(e){ac.innerHTML='<p class="text-sm" style="color: var(--terracotta);">Error loading celebrations.</p>';}}
    function init(){loadCelebrations();}
    return{init,loadAdminCelebrations};
})();

const MenuModule=(function(){
    async function loadAdminMenu(){const ac=document.getElementById('adminMenuContainer');if(!ac||!supabaseClient) return;ac.innerHTML='<p class="text-sm" style="color: var(--bark-soft);">Loading menu...</p>';try{const{data,error}=await supabaseClient.from('weekly_menu').select('*').order('id',{ascending:true});if(error) throw error;if(!data||data.length===0){ ac.innerHTML='<p class="text-sm" style="color: var(--bark-soft);">No menu days found.</p>'; return; }ac.innerHTML=data.map(day=>`<div class="admin-film-item" style="padding: 8px 12px;"><label style="font-size:.8rem; font-weight:700; color:var(--bark); display:block; margin-bottom:4px;">${day.day_name}</label><input type="text" class="tester-input menu-input" data-id="${day.id}" value="${day.meal_text||''}" placeholder="e.g., Roast chicken" style="margin-top:0; padding:8px; font-size:.9rem;"></div>`).join('');}catch(e){ ac.innerHTML='<p class="text-sm" style="color: var(--terracotta);">Error loading menu.</p>'; }}
    function init(){}
    return{init,loadAdminMenu};
})();

const DatabaseModule=(function(){
    async function loadUpdates(){const ac=document.getElementById('adminUpdateContainer');if(!ac||!supabaseClient)return;ac.innerHTML='<p class="text-sm" style="color: var(--bark-soft);">Loading...</p>';try{const{data,error}=await supabaseClient.from('updates').select('*').order('created_at',{ascending:false});if(error)throw error;if(!data||data.length===0){ac.innerHTML='<p class="text-sm" style="color: var(--bark-soft);">No updates yet.</p>';return;}ac.innerHTML=data.map(i=>`<div class="admin-film-item" style="padding: 10px;"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;"><span style="font-size:.9rem;font-weight:700;flex:1;">${i.title}</span><button class="tester-btn del-update-btn" data-id="${i.id}" style="width:auto;margin:0;padding:4px 8px;font-size:0.7rem;background:var(--terracotta);">Delete</button></div></div>`).join('');ac.querySelectorAll('.del-update-btn').forEach(b=>b.addEventListener('click',async e=>{const id=e.target.dataset.id;try{await supabaseClient.from('updates').delete().eq('id',id);loadUpdates();ToastModule.show('Update deleted!');}catch(err){ToastModule.show('Error deleting update.');}}));}catch(err){ac.innerHTML='<p class="text-sm" style="color: var(--terracotta);">Error loading updates.</p>';}}
    function init(){}
    return{init,loadUpdates};
})();

const FilmNightModule=(function(){
    async function loadFilms(){const ac=document.getElementById('adminFilmContainer');if(!ac||!supabaseClient)return;ac.innerHTML='<p class="text-sm" style="color: var(--bark-soft);">Loading films...</p>';try{const{data,error}=await supabaseClient.from('Filmnight').select('*').order('created_at',{ascending:true});if(error)throw error;if(!data||data.length===0){ac.innerHTML='<p class="text-sm" style="color: var(--bark-soft);">No films found.</p>';return;}}catch(err){ac.innerHTML='<p class="text-sm" style="color: var(--terracotta);">Error loading films.</p>';}}
    function init(){}
    return{init,loadFilms};
})();

const CommunityModule=(function(){
    async function loadAdminCommunity(){const ac=document.getElementById('adminCommunityContainer');if(!ac||!supabaseClient)return;ac.innerHTML='<p class="text-sm" style="color: var(--bark-soft);">Loading...</p>';try{const{data,error}=await supabaseClient.from('community_spotlight').select('*').order('created_at',{ascending:false});if(error)throw error;if(!data||data.length===0){ac.innerHTML='<p class="text-sm" style="color: var(--bark-soft);">No posts found.</p>';return;}ac.innerHTML=data.map(post=>`<div class="admin-film-item" style="padding: 8px 12px;"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;"><span style="font-size:.8rem;font-weight:700;flex:1;">${post.title}</span><button class="tester-btn del-community-btn" data-id="${post.id}" style="width:auto;margin:0;padding:4px 8px;font-size:0.7rem;background:var(--terracotta);">Delete</button></div></div>`).join('');ac.querySelectorAll('.del-community-btn').forEach(btn=>btn.addEventListener('click',async(e)=>{const id=e.target.dataset.id;try{await supabaseClient.from('community_spotlight').delete().eq('id',id);ToastModule.show('Spotlight deleted!');loadAdminCommunity();}catch(err){ToastModule.show('Error deleting post.');}}));}catch(e){ac.innerHTML='<p class="text-sm" style="color: var(--terracotta);">Error loading posts.</p>';}}
    function init(){}
    return{init,loadAdminCommunity};
})();

const FeaturedEventsModule=(function(){
    async function loadAdminFeatured(){const ac=document.getElementById('adminFeaturedContainer');if(!ac||!supabaseClient)return;ac.innerHTML='<p class="text-sm" style="color: var(--bark-soft);">Loading...</p>';try{const{data,error}=await supabaseClient.from('featured_events').select('*').order('id',{ascending:false});if(error)throw error;if(!data||data.length===0){ac.innerHTML='<p class="text-sm" style="color: var(--bark-soft);">No featured events found.</p>';return;}ac.innerHTML=data.map(ev=>`<div class="admin-film-item" style="padding: 8px 12px;"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;"><span style="font-size:.8rem;font-weight:700;flex:1;">${ev.icon} ${ev.title}</span><button class="tester-btn del-featured-btn" data-id="${ev.id}" style="width:auto;margin:0;padding:4px 8px;font-size:0.7rem;background:var(--terracotta);">Delete</button></div></div>`).join('');ac.querySelectorAll('.del-featured-btn').forEach(btn=>btn.addEventListener('click',async(e)=>{const id=e.target.dataset.id;try{await supabaseClient.from('featured_events').delete().eq('id',id);ToastModule.show('Event deleted!');loadAdminFeatured();}catch(err){ToastModule.show('Error deleting event.');}}));}catch(e){ac.innerHTML='<p class="text-sm" style="color: var(--terracotta);">Error loading events.</p>';}}
    function init(){}
    return{init,loadAdminFeatured};
})();

const TesterModule=(function(){
    const m=document.getElementById('testerModal'),
          la=document.getElementById('testerLogin'),
          ma=document.getElementById('testerMenu'),
          emailInput=document.getElementById('testerEmail'),
          pi=document.getElementById('testerPass'),
          et=document.getElementById('testerError'),
          loginBtn=document.getElementById('testerLoginBtn');
    
    let isMenuLoaded = false; 

    function o(){
        m.classList.add('active');
        et.textContent='';
        checkAuthState();
    }
    function c(){ m.classList.remove('active'); }
    
    async function login(){
        const sb = window.supabaseClient;
        if (!sb) { et.textContent = 'Error: Database connection not loaded.'; return; }
        const email=emailInput.value.trim();
        const pass=pi.value;
        if(!email||!pass){ et.textContent='Please enter both email and password.'; return; }
        loginBtn.textContent='Verifying...';
        loginBtn.disabled=true;
        et.textContent='';
        try{
            const{data,error}=await sb.auth.signInWithPassword({email:email,password:pass});
            if(error) throw error;
        }catch(err){
            et.textContent='Login failed: '+err.message;
            loginBtn.textContent='Log In';
            loginBtn.disabled=false;
        }
    }
    
    async function logout(){
        const sb = window.supabaseClient;
        if (sb) await sb.auth.signOut();
        showLogin();
        c();
    }
    
        async function showMenu(){
        if(isMenuLoaded) return;
        isMenuLoaded = true;
        try {
            la.style.display='none';
            ma.style.display='flex'; 
            loginBtn.textContent='Log In';
            loginBtn.disabled=false;
            
            supabaseClient = window.supabaseClient;
            const sb = supabaseClient;
            const { data: { session } } = await sb.auth.getSession();
            const user=session?.user;
            const userRole=user?.user_metadata?.role;
            
            const menuTabBtn=document.querySelector('button[data-tab="menu"]');
            if(menuTabBtn){
                if(userRole==='chef'||userRole==='admin'){
                    menuTabBtn.style.display='flex';
                    if(typeof MenuModule!=='undefined') MenuModule.loadAdminMenu();
                }else{ menuTabBtn.style.display='none'; }
            }
            
            if(typeof FeaturedEventsModule!=='undefined') FeaturedEventsModule.loadAdminFeatured();
            if(typeof FilmNightModule!=='undefined') FilmNightModule.loadFilms();
            if(typeof LayoutModule!=='undefined') LayoutModule.onTesterOpen();
            if(typeof DatabaseModule!=='undefined') DatabaseModule.loadUpdates();
            if(typeof LightboxModule!=='undefined') LightboxModule.loadImages();
            if(typeof EventsModule!=='undefined') EventsModule.loadAdminEvents();
            if(typeof EnquiriesModule!=='undefined') EnquiriesModule.loadAdminEnquiries();
            if(typeof BriefingModule!=='undefined') BriefingModule.loadBriefing();
            if(typeof CelebrationModule!=='undefined') CelebrationModule.loadAdminCelebrations();
            if(typeof CommunityModule!=='undefined') CommunityModule.loadAdminCommunity();
            if(typeof MenuModule!=='undefined' && (userRole==='chef'||userRole==='admin')) MenuModule.loadAdminMenu();
            
            setTimeout(() => { renderPhotoAdmin(); }, 500);
            
            const dashBtn = document.querySelector('button[data-tab="dashboard"]');
            if(dashBtn) dashBtn.click();
            if(typeof DashboardModule!=='undefined') DashboardModule.loadDashboard();
            
        } catch(e) {
            console.error("Dashboard Load Error:", e);
            isMenuLoaded = false;
            if(la) la.style.display = 'flex';
            if(ma) ma.style.display = 'none';
            if(loginBtn) { loginBtn.textContent='Log In'; loginBtn.disabled=false; }
            if(et) et.textContent='Error loading dashboard. Try refreshing the page.';
        }
    }
    
    function showLogin(){
        isMenuLoaded = false;
        la.style.display='flex'; 
        ma.style.display='none';
        pi.value='';
        emailInput.value='';
        loginBtn.textContent='Log In';
        loginBtn.disabled=false;
    }
    
    async function checkAuthState(){
        try {
            const sb = window.supabaseClient;
            if (!sb) return showLogin();
            const{data:{session}}=await sb.auth.getSession();
            if(session){ showMenu(); } else { showLogin(); }
        } catch(e) { showLogin(); }
    }
    
    async function uploadPhoto(){
        const sb = window.supabaseClient;
        const fileInput=document.getElementById('photoUploadInput');
        const files = Array.from(fileInput.files);
        if(files.length === 0){ showToast("Please select at least one photo first."); return; }

        const captionInput=document.getElementById('photoCaptionInput');
        const categoryInput=document.getElementById('photoCategoryInput');
        const category = categoryInput ? categoryInput.value : 'General';
        const captionText = captionInput ? captionInput.value.trim() : '';
        let caption = captionText ? '_caption_'+captionText.replace(/[^a-zA-Z0-9 ]/g,'').replace(/\s+/g,'-') : '';

        let successCount = 0;
        for(let i = 0; i < files.length; i++){
            const file = files[i];
            if(!file.type.startsWith('image/')) continue;
            showToast(`Processing & compressing photo ${i + 1} of ${files.length}...`);
            try {
                const compressedBlob = await compressImage(file, 1200);
                const baseName = file.name.replace(/\.[^/.]+$/, "");
                const fileName=`photo_${Date.now()}_${i}${caption}_${baseName}.jpg`;
                const { error: upErr } = await sb.storage.from('gallery').upload(fileName, compressedBlob);
                if(upErr) throw upErr;
                const { error: dbErr } = await sb.from('gallery_items').insert([{ storage_path: fileName, caption: captionText, category: category }]);
                if(dbErr) throw dbErr;
                successCount++;
            } catch(err) { console.error("Upload error:", err); }
        }

        if(successCount > 0){
            showToast(`${successCount} photo(s) uploaded successfully!`);
            fileInput.value='';
            if(captionInput) captionInput.value='';
            const dropZone = document.getElementById('photoDropZone');
            if(dropZone) dropZone.innerHTML = '<span id="photoDropText">Drag & drop photos here<br>or click to select</span>';
            setTimeout(() => {
                if(typeof LightboxModule!=='undefined') LightboxModule.loadImages();
                renderPhotoAdmin();
            }, 1500);
        } else { showToast("Upload failed. Please ensure you are selecting valid image files."); }
    }
    
    function compressImage(file, maxWidth) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    let width = img.width; let height = img.height;
                    if (width > maxWidth) { const ratio = maxWidth / width; width = maxWidth; height = height * ratio; }
                    canvas.width = width; canvas.height = height;
                    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, width, height);
                    canvas.toBlob((blob) => {
                        if (!blob) { return reject(new Error('Canvas to Blob conversion failed')); }
                        resolve(blob);
                    }, 'image/jpeg', 0.7);
                };
                img.onerror = () => reject(new Error('Image load error'));
                img.src = event.target.result;
            };
            reader.onerror = () => reject(new Error('File read error'));
            reader.readAsDataURL(file);
        });
    }

    async function renderPhotoAdmin(){
        const sb = window.supabaseClient;
        const ac=document.getElementById('adminPhotoContainer');
        if(!ac) return;
        ac.innerHTML='<p class="text-sm" style="color: var(--bark-soft);">Loading photos...</p>';
        try{
            const{data,error}=await sb.from('gallery_items').select('*').order('created_at',{ascending:false});
            if(error) throw error;
            if(!data||data.length===0){ac.innerHTML='<p class="text-sm" style="color: var(--bark-soft);">No photos found.</p>';return;}
            
            let toolbar = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px; padding: 8px 12px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 8px;">
                <label style="font-size:.8rem; display:flex; align-items:center; gap:8px; cursor:pointer; color: var(--fg);">
                    <input type="checkbox" id="selectAllPhotos" style="width:16px; height:16px; cursor:pointer;"> Select All
                </label>
                <button id="deleteSelectedPhotosBtn" class="tester-btn" style="width:auto;margin:0;padding:6px 12px;font-size:0.7rem;background:var(--danger); color:#fff;">Remove Selected</button>
            </div>`;
            
            ac.innerHTML = toolbar + data.map(item => {
                const { data: urlData } = sb.storage.from('gallery').getPublicUrl(item.storage_path);
                const imgUrl = urlData.publicUrl;
                return `<div class="admin-film-item" style="padding: 8px 12px; display: flex; align-items: center; gap: 12px;">
                            <input type="checkbox" class="photo-check" data-id="${item.id}" data-path="${item.storage_path}" style="width:20px; height:20px; cursor:pointer; flex-shrink:0;">
                            <img src="${imgUrl}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px; flex-shrink: 0;">
                            <div style="flex:1;">
                                <span style="font-size:.8rem;font-weight:700;word-break:break-all; display:block;">${item.caption || item.storage_path}</span>
                                <span style="font-size:0.7rem; background: var(--accent-soft); color: var(--accent); padding: 2px 6px; border-radius: 4px; margin-top: 2px; display: inline-block;">${item.category}</span>
                            </div>
                            <button class="tester-btn del-photo-btn" data-id="${item.id}" data-path="${item.storage_path}" style="width:auto;margin:0;padding:4px 8px;font-size:0.7rem;background:var(--danger); color:#fff;">Delete</button>
                        </div>`;
            }).join('');
            
            ac.querySelectorAll('.del-photo-btn').forEach(btn=>btn.addEventListener('click',async(e)=>{
                const id=e.target.dataset.id; const path=e.target.dataset.path;
                try{
                    await sb.storage.from('gallery').remove([path]);
                    await sb.from('gallery_items').delete().eq('id', id);
                    showToast('Photo deleted!');
                    renderPhotoAdmin();
                    if(typeof LightboxModule!=='undefined') LightboxModule.loadImages();
                }catch(err){ showToast('Error deleting photo.'); }
            }));
            
            const selectAll = ac.querySelector('#selectAllPhotos');
            if(selectAll) { selectAll.addEventListener('change', (e) => { document.querySelectorAll('.photo-check').forEach(cb => cb.checked = e.target.checked); }); }
            
            const multiDelBtn = ac.querySelector('#deleteSelectedPhotosBtn');
            if(multiDelBtn) {
                multiDelBtn.addEventListener('click', async () => {
                    const checkboxes = document.querySelectorAll('.photo-check:checked');
                    if(checkboxes.length === 0){ showToast("Please select at least one photo to delete."); return; }
                    const ids = Array.from(checkboxes).map(cb => cb.dataset.id);
                    const paths = Array.from(checkboxes).map(cb => cb.dataset.path);
                    if(confirm(`Are you sure you want to delete ${ids.length} photo(s)?`)){
                        showToast("Deleting photos...");
                        try {
                            await sb.storage.from('gallery').remove(paths);
                            await sb.from('gallery_items').delete().in('id', ids);
                            showToast(`${ids.length} photo(s) deleted successfully!`);
                            renderPhotoAdmin();
                            if(typeof LightboxModule!=='undefined') LightboxModule.loadImages();
                        } catch(err){ showToast("Error deleting photos."); }
                    }
                });
            }
        }catch(err){ ac.innerHTML='<p class="text-sm" style="color: var(--danger);">Error loading photos.</p>'; }
    }
    
    function init(){
        const modalExists = document.getElementById('testerModal');
        if(!modalExists) return; 
        const closeBtn = document.getElementById('testerCloseBtn');
        if(closeBtn) closeBtn.addEventListener('click',c);
        if(loginBtn) loginBtn.addEventListener('click', function(e) { e.preventDefault(); login(); });
        const logoutBtn = document.getElementById('testerLogoutBtn');
        if(logoutBtn) logoutBtn.addEventListener('click',logout);
        if(pi) pi.addEventListener('keypress',e=>{ if(e.key==='Enter'){ login(); } });
        if(emailInput) emailInput.addEventListener('keypress',e=>{ if(e.key==='Enter'){ pi.focus(); } });
        
        const uploadBtn = document.getElementById('uploadPhotoBtn');
        if(uploadBtn) uploadBtn.addEventListener('click',uploadPhoto);
        
        m.addEventListener('click',e=>{ if(e.target===m){ c(); } });
        
        const sb = window.supabaseClient;
        if (sb) {
            sb.auth.onAuthStateChange((event,session)=>{
                if(event==='SIGNED_IN'){ showMenu(); }
                else if(event==='SIGNED_OUT'){ showLogin(); }
            });
        }
        showLogin(); 
        checkAuthState();
    }
    return{init, renderPhotoAdmin, uploadPhoto};
})();

function safeInit(name, fn) { try { fn(); } catch (e) { console.error(`Module ${name} crashed:`, e); } }

function initializeAppModules() {
    safeInit('Tester', () => TesterModule.init());
    safeInit('Layout', () => LayoutModule.init());
    safeInit('Splash', () => SplashModule.init());
    safeInit('Lightbox', () => LightboxModule.init());
    safeInit('Events', () => EventsModule.init());
    safeInit('Enquiries', () => EnquiriesModule.init());
    safeInit('Briefing', () => BriefingModule.init());
    safeInit('Celebration', () => CelebrationModule.init());
    console.log("Haven Portal Modules Loaded Successfully.");
}

document.addEventListener('DOMContentLoaded', function() {
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
        supabaseClient = window.supabase.createClient('https://bsbwrvqevtoujfvcvvju.supabase.co', 'sb_publishable_c6IrevCpSel1njeKV0PhEA_Rbw2UdAx');
        window.supabaseClient = supabaseClient;
        initializeAppModules();
    } else {
        let attempts = 0;
        const supabaseWait = setInterval(function() {
            attempts++;
            if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
                clearInterval(supabaseWait);
                supabaseClient = window.supabase.createClient('https://bsbwrvqevtoujfvcvvju.supabase.co', 'sb_publishable_c6IrevCpSel1njeKV0PhEA_Rbw2UdAx');
                window.supabaseClient = supabaseClient;
                initializeAppModules();
            } else if (attempts > 100) {
                clearInterval(supabaseWait);
                console.error("Supabase CDN failed to load.");
                const errDiv = document.getElementById('testerError');
                if(errDiv) errDiv.textContent = "Network Error: Could not load login library.";
            }
        }, 100);
    }
});