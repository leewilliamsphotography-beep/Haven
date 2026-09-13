'use strict';
let supabaseClient;

// ==========================================
// TOAST MODULE
// ==========================================
const ToastModule = (function() {
    function show(msg) {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.position = 'fixed';
            container.style.bottom = '24px';
            container.style.right = '24px';
            container.style.zIndex = '99999';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = msg;
        container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }
    function init() {}
    return { init, show };
})();

// ==========================================
// DASHBOARD MODULE
// ==========================================
const DashboardModule = (function() {
    async function loadDashboard() {
        const sb = window.supabaseClient;
        if (!sb) return;
        
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const currentDayName = now.toLocaleDateString('en-GB', { weekday: 'long' });
        
        try {
            const [briefingRes, wilfRes, enquiriesRes, eventsRes, menuRes] = await Promise.all([
                sb.from('daily_briefing').select('message').eq('id', 1).single(),
                sb.from('wilf_status').select('is_visiting').eq('id', 1).single(),
                sb.from('enquiries').select('id, created_at'),
                sb.from('events').select('*').gte('event_date', todayStr).order('event_date', { ascending: true }),
                sb.from('weekly_menu').select('*').eq('day_name', currentDayName).single()
            ]);

            function makeCardClickable(cardId, tabName) {
                const card = document.getElementById(cardId);
                if (card) {
                    card.style.cursor = 'pointer';
                    card.onclick = () => {
                        document.querySelectorAll('.tester-tab-btn').forEach(btn => btn.classList.remove('active'));
                        document.querySelectorAll('.tester-tab-content').forEach(tab => { tab.classList.remove('active'); tab.style.display = 'none'; });
                        const targetBtn = document.querySelector(`button[data-tab="${tabName}"]`);
                        if (targetBtn) targetBtn.classList.add('active');
                        const activeTab = document.getElementById(`tab-${tabName}`);
                        if (activeTab) { activeTab.classList.add('active'); activeTab.style.display = 'block'; }
                        localStorage.setItem('haven_active_tab', tabName);
                    };
                }
            }

            makeCardClickable('dashBriefing', 'briefing');
            makeCardClickable('dashWilf', 'wilf');
            makeCardClickable('dashEnquiries', 'enquiries');
            makeCardClickable('dashEvents', 'events');
            makeCardClickable('dashMenu', 'menu');

            const bContent = document.getElementById('dashBriefingContent');
            if (bContent) {
                if (briefingRes.data && briefingRes.data.message && briefingRes.data.message.trim() !== '') {
                    bContent.innerHTML = `<p style="font-weight: 600;">"${briefingRes.data.message}"</p>`;
                } else { bContent.innerHTML = '<p>No briefing set for today.</p>'; }
            }

            const wContent = document.getElementById('dashWilfContent');
            if (wContent) {
                if (wilfRes.data && wilfRes.data.is_visiting) {
                    wContent.innerHTML = '<span style="color: var(--accent); font-weight: 700;">Wilf is visiting today! 🎉</span>';
                } else { wContent.innerHTML = '<span>Wilf is off-site.</span>'; }
            }

            const eContent = document.getElementById('dashEnquiriesContent');
            if (eContent) {
                const enqCount = enquiriesRes.data ? enquiriesRes.data.length : 0;
                if (enqCount > 0) { eContent.innerHTML = `<span style="font-size: 1.5rem; font-weight:700;">${enqCount}</span> unread.`; } 
                else { eContent.innerHTML = '<span>Inbox zero!</span>'; }
            }

            const evContent = document.getElementById('dashEventsContent');
            if (evContent) {
                const todayEvents = eventsRes.data ? eventsRes.data.filter(ev => ev.event_date === todayStr) : [];
                if (todayEvents.length > 0) {
                    evContent.innerHTML = todayEvents.map(ev => `<div style="background: var(--surface-2); padding: 8px 12px; border-radius: 8px; margin-bottom: 8px;"><strong>${ev.title}</strong></div>`).join('');
                } else { evContent.innerHTML = '<span>No events scheduled for today.</span>'; }
            }

            const mContent = document.getElementById('dashMenuContent');
            if (mContent) {
                if (menuRes.data && menuRes.data.meal_text && menuRes.data.meal_text.trim() !== '') {
                    mContent.innerHTML = `<p style="font-weight: 600;">${menuRes.data.meal_text}</p>`;
                } else { mContent.innerHTML = '<span>Today\'s menu has not been updated.</span>'; }
            }

        } catch (err) {
            console.error("Dashboard load error:", err);
        }
    }
    
    function init() {}
    return { init, loadDashboard };
})();

// ==========================================
// LIGHTBOX MODULE (Collage Gallery)
// ==========================================
const LightboxModule = (function() {
    let imgs = [];
    const fallbackImgs = [
        { src: 'https://i.ibb.co/xSq92n0r/123-1.jpg', alt: 'Flower 1', category: 'General' },
        { src: 'https://i.ibb.co/WNjYC10y/123-2.jpg', alt: 'Flower 2', category: 'General' }
    ];
    let cur = 0, lb, li, lc, lp, ln, lct, g, anim = false, tsx = 0;

    async function loadImages() {
        if (!supabaseClient) { imgs = fallbackImgs; renderGallery(); return; }
        try {
            const { data, error } = await supabaseClient.from('gallery_items').select('*').order('created_at', { ascending: false });
            if (data && data.length > 0) {
                imgs = data.map(item => {
                    const { data: urlData } = supabaseClient.storage.from('gallery').getPublicUrl(item.storage_path);
                    return { src: urlData.publicUrl, alt: item.caption || 'Gallery Photo', category: item.category || 'General' };
                });
            } else { imgs = fallbackImgs; }
        } catch (e) { imgs = fallbackImgs; }
        renderGallery();
    }

    function renderGallery() {
        if (!g) return;
        g.innerHTML = '';
        if (imgs.length === 0) { g.innerHTML = '<p>No photos yet.</p>'; return; }
        
        const isMobile = window.innerWidth < 768;
        g.style.display = 'block'; 
        g.style.columnCount = isMobile ? '2' : '3';
        g.style.columnGap = '12px';
        
        const categories = ['All', ...new Set(imgs.map(i => i.category).filter(Boolean))];
        if (categories.length > 1) {
            const filterDiv = document.createElement('div');
            filterDiv.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;justify-content:center;column-span:all;';
            categories.forEach(cat => {
                const btn = document.createElement('button');
                btn.textContent = cat;
                btn.dataset.category = cat;
                btn.style.cssText = 'padding: 6px 14px; border: 1px solid var(--border); background: var(--surface-2); color: var(--fg); border-radius: 20px; cursor: pointer; font-weight: 600; font-size: 0.85rem;';
                btn.addEventListener('click', (e) => {
                    document.querySelectorAll('.gallery-filter-btn').forEach(b => { b.style.background = 'var(--surface-2)'; b.style.color = 'var(--fg)'; });
                    e.target.style.background = 'var(--accent)'; e.target.style.color = '#000';
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

    function renderFilteredGallery(category) {
        const thumbs = g.querySelectorAll('.gallery-thumb, .gallery-cta');
        thumbs.forEach(t => t.remove());
        const filtered = category === 'All' ? imgs : imgs.filter(i => i.category === category);
        
        filtered.slice(0, 6).forEach((io, idx) => {
            const t = document.createElement('img');
            t.src = io.src; t.alt = `View ${io.alt}`;
            t.className = 'gallery-thumb blur-load'; t.loading = 'lazy';
            t.style.cssText = 'width: 100%; height: auto; margin-bottom: 12px; border-radius: 12px; display: block; break-inside: avoid;';
            t.addEventListener('load', () => t.classList.add('loaded'));
            t.addEventListener('click', () => o(idx, filtered));
            g.appendChild(t);
        });
        
        if (filtered.length > 0) {
            const v = document.createElement('button');
            v.className = 'gallery-cta';
            v.innerHTML = `<div class="gallery-cta-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2-3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg></div><div class="gallery-cta-text">View All ${filtered.length} Photos</div>`;
            v.style.cssText = 'column-span: all; margin-top: 12px; width: 100%;';
            v.addEventListener('click', () => o(0, filtered));
            g.appendChild(v);
        }
    }

    function o(i, list) { if(list) imgs = list; cur = i; if(lb) lb.classList.add('active'); }
    function c() { if(lb) lb.classList.remove('active'); }
    
    function init() {
        lb = document.getElementById('lightbox');
        li = document.getElementById('lightboxImg');
        lc = document.getElementById('lightboxClose');
        lp = document.getElementById('lightboxPrev');
        ln = document.getElementById('lightboxNext');
        lct = document.getElementById('lightboxCounter');
        g = document.getElementById('galleryGrid');
        if (!lb || !g) return;
        loadImages();
        if(lc) lc.addEventListener('click', c);
    }
    return { init, loadImages };
})();

// ==========================================
// OTHER MODULES (Basic Shells to prevent crashes)
// ==========================================
const EventsModule = (function() {
    async function loadAdminEvents(){const ac=document.getElementById('adminEventContainer');if(!ac||!supabaseClient)return;ac.innerHTML='<p>Loading events...</p>';try{const{data,error}=await supabaseClient.from('events').select('*').order('event_date',{ascending:true});if(error)throw error;if(!data||data.length===0){ac.innerHTML='<p>No events found.</p>';return;}ac.innerHTML=data.map(ev=>`<div class="admin-film-item" style="padding: 8px 12px;"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;"><span style="flex:1;">${ev.title} (${new Date(ev.event_date).toLocaleDateString('en-GB')})</span><button class="tester-btn del-event-btn" data-id="${ev.id}" style="padding:4px 8px;font-size:0.7rem;background:var(--terracotta);">Delete</button></div></div>`).join('');ac.querySelectorAll('.del-event-btn').forEach(btn=>btn.addEventListener('click',async(e)=>{const id=e.target.dataset.id;try{await supabaseClient.from('events').delete().eq('id',id);ToastModule.show('Event deleted!');loadAdminEvents();}catch(err){ToastModule.show('Error deleting event.');}}));}catch(e){ac.innerHTML='<p>Error loading events.</p>';}}
    return { init(){}, loadAdminEvents, loadEvents(){} };
})();
const EnquiriesModule = (function() {
    async function loadAdminEnquiries(){const ac=document.getElementById('adminEnquiriesContainer');if(!ac||!supabaseClient)return;ac.innerHTML='<p>Loading enquiries...</p>';try{const{data,error}=await supabaseClient.from('enquiries').select('*').order('created_at',{ascending:false});if(error) throw error;if(!data||data.length===0){ ac.innerHTML='<p>No new enquiries.</p>'; return; }ac.innerHTML=data.map(enq=>`<div class="admin-film-item" style="padding: 12px;"><div style="display:flex; justify-content:space-between; align-items:start; gap:8px; margin-bottom:6px;"><div><span style="font-weight:700;">${enq.name}</span></div><button class="tester-btn del-enq-btn" data-id="${enq.id}" style="padding:4px 8px; font-size:0.7rem; background:var(--terracotta);">Delete</button></div><a href="mailto:${enq.email}" style="font-size:.85rem; color:var(--teal); font-weight:600; display:block; margin-bottom:6px;">${enq.email}</a><p style="font-size:.85rem; opacity:0.8;">${enq.message}</p></div>`).join('');ac.querySelectorAll('.del-enq-btn').forEach(btn=>btn.addEventListener('click',async(e)=>{const id=e.target.dataset.id;try{ await supabaseClient.from('enquiries').delete().eq('id',id); ToastModule.show('Enquiry deleted!'); loadAdminEnquiries(); }catch(err){ ToastModule.show('Error deleting enquiry.'); }}));}catch(e){ ac.innerHTML='<p>Error loading enquiries.</p>'; }}
    return { init(){}, loadAdminEnquiries };
})();
const BriefingModule = (function() {
    async function loadBriefing(){const bar=document.getElementById('briefing-bar');const textEl=document.getElementById('briefing-text');const input=document.getElementById('briefingInput');if(!bar||!supabaseClient) return;try{const{data,error}=await supabaseClient.from('daily_briefing').select('message').eq('id',1).single();if(error) throw error;if(data&&data.message&&data.message.trim()!==''){ textEl.textContent=data.message; bar.style.display='block'; if(input) input.value=data.message; } else { bar.style.display='none'; }}catch(e){ bar.style.display='none'; }}
    return { init(){}, loadBriefing };
})();
const CelebrationModule = (function() {
    async function loadAdminCelebrations(){const ac=document.getElementById('adminCelebContainer');if(!ac||!supabaseClient)return;ac.innerHTML='<p>Loading...</p>';try{const{data,error}=await supabaseClient.from('celebrations').select('*').order('month',{ascending:true}).order('day',{ascending:true});if(error)throw error;if(!data||data.length===0){ac.innerHTML='<p>No celebrations found.</p>';return;}const monthNames=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];ac.innerHTML=data.map(ev=>`<div class="admin-film-item" style="padding: 8px 12px;"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;"><span style="flex:1;">${ev.name} (${ev.day} ${monthNames[ev.month-1]}) - ${ev.type}</span><button class="tester-btn del-celeb-btn" data-id="${ev.id}" style="padding:4px 8px;font-size:0.7rem;background:var(--terracotta);">Delete</button></div></div>`).join('');ac.querySelectorAll('.del-celeb-btn').forEach(btn=>btn.addEventListener('click',async(e)=>{const id=e.target.dataset.id;try{await supabaseClient.from('celebrations').delete().eq('id',id);ToastModule.show('Celebration deleted!');loadAdminCelebrations();}catch(err){ToastModule.show('Error deleting celebration.');}}));}catch(e){ac.innerHTML='<p>Error loading celebrations.</p>';}}
    return { init(){}, loadAdminCelebrations };
})();
const MenuModule = (function() {
    async function loadAdminMenu(){const ac=document.getElementById('adminMenuContainer');if(!ac||!supabaseClient) return;ac.innerHTML='<p>Loading menu...</p>';try{const{data,error}=await supabaseClient.from('weekly_menu').select('*').order('id',{ascending:true});if(error) throw error;if(!data||data.length===0){ ac.innerHTML='<p>No menu days found.</p>'; return; }ac.innerHTML=data.map(day=>`<div class="admin-film-item" style="padding: 8px 12px;"><label style="font-size:.8rem; font-weight:700; display:block; margin-bottom:4px;">${day.day_name}</label><input type="text" class="tester-input menu-input" data-id="${day.id}" value="${day.meal_text||''}" placeholder="e.g., Roast chicken" style="margin-top:0; padding:8px; font-size:.9rem;"></div>`).join('');}catch(e){ ac.innerHTML='<p>Error loading menu.</p>'; }}
    return { init(){}, loadAdminMenu };
})();
const DatabaseModule = (function() {
    async function loadUpdates(){const ac=document.getElementById('adminUpdateContainer');if(!ac||!supabaseClient)return;ac.innerHTML='<p>Loading...</p>';try{const{data,error}=await supabaseClient.from('updates').select('*').order('created_at',{ascending:false});if(error)throw error;if(!data||data.length===0){ac.innerHTML='<p>No updates yet.</p>';return;}ac.innerHTML=data.map(i=>`<div class="admin-film-item" style="padding: 10px;"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;"><span style="flex:1;">${i.title}</span><button class="tester-btn del-update-btn" data-id="${i.id}" style="padding:4px 8px;font-size:0.7rem;background:var(--terracotta);">Delete</button></div></div>`).join('');ac.querySelectorAll('.del-update-btn').forEach(b=>b.addEventListener('click',async e=>{const id=e.target.dataset.id;try{await supabaseClient.from('updates').delete().eq('id',id);loadUpdates();ToastModule.show('Update deleted!');}catch(err){ToastModule.show('Error deleting update.');}}));}catch(err){ac.innerHTML='<p>Error loading updates.</p>';}}
    return { init(){}, loadUpdates };
})();
const FilmNightModule = (function() {
    async function loadFilms(){const ac=document.getElementById('adminFilmContainer');if(!ac||!supabaseClient)return;ac.innerHTML='<p>Loading films...</p>';try{const{data,error}=await supabaseClient.from('Filmnight').select('*').order('created_at',{ascending:true});if(error)throw error;if(!data||data.length===0){ac.innerHTML='<p>No films found.</p>';return;}}catch(err){ac.innerHTML='<p>Error loading films.</p>';}}
    return { init(){}, loadFilms };
})();
const CommunityModule = (function() {
    async function loadAdminCommunity(){const ac=document.getElementById('adminCommunityContainer');if(!ac||!supabaseClient)return;ac.innerHTML='<p>Loading...</p>';try{const{data,error}=await supabaseClient.from('community_spotlight').select('*').order('created_at',{ascending:false});if(error)throw error;if(!data||data.length===0){ac.innerHTML='<p>No posts found.</p>';return;}ac.innerHTML=data.map(post=>`<div class="admin-film-item" style="padding: 8px 12px;"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;"><span style="flex:1;">${post.title}</span><button class="tester-btn del-community-btn" data-id="${post.id}" style="padding:4px 8px;font-size:0.7rem;background:var(--terracotta);">Delete</button></div></div>`).join('');ac.querySelectorAll('.del-community-btn').forEach(btn=>btn.addEventListener('click',async(e)=>{const id=e.target.dataset.id;try{await supabaseClient.from('community_spotlight').delete().eq('id',id);ToastModule.show('Spotlight deleted!');loadAdminCommunity();}catch(err){ToastModule.show('Error deleting post.');}}));}catch(e){ac.innerHTML='<p>Error loading posts.</p>';}}
    return { init(){}, loadAdminCommunity };
})();
const FeaturedEventsModule = (function() {
    async function loadAdminFeatured(){const ac=document.getElementById('adminFeaturedContainer');if(!ac||!supabaseClient)return;ac.innerHTML='<p>Loading...</p>';try{const{data,error}=await supabaseClient.from('featured_events').select('*').order('id',{ascending:false});if(error)throw error;if(!data||data.length===0){ac.innerHTML='<p>No featured events found.</p>';return;}ac.innerHTML=data.map(ev=>`<div class="admin-film-item" style="padding: 8px 12px;"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;"><span style="flex:1;">${ev.icon} ${ev.title}</span><button class="tester-btn del-featured-btn" data-id="${ev.id}" style="padding:4px 8px;font-size:0.7rem;background:var(--terracotta);">Delete</button></div></div>`).join('');ac.querySelectorAll('.del-featured-btn').forEach(btn=>btn.addEventListener('click',async(e)=>{const id=e.target.dataset.id;try{await supabaseClient.from('featured_events').delete().eq('id',id);ToastModule.show('Event deleted!');loadAdminFeatured();}catch(err){ToastModule.show('Error deleting event.');}}));}catch(e){ac.innerHTML='<p>Error loading events.</p>';}}
    return { init(){}, loadAdminFeatured };
})();
const LayoutModule = (function() {
    function init() {}
    function onTesterOpen() {
        const container = document.getElementById('layoutContainer');
        if(container) container.innerHTML = '<p>Layout customizer ready.</p>';
    }
    return { init, onTesterOpen };
})();

// ==========================================
// TESTER MODULE (Core Portal & Photo Upload)
// ==========================================
const TesterModule = (function() {
    let m, la, ma, emailInput, pi, et, loginBtn;
    let isMenuLoaded = false; 

    function c() { if(m) m.classList.remove('active'); }
    
    async function login() {
        const sb = window.supabaseClient;
        if (!sb) { if(et) et.textContent = 'Error: Database connection not loaded.'; return; }
        if (!emailInput || !pi) return;
        const email = emailInput.value.trim();
        const pass = pi.value;
        if (!email || !pass) { if(et) et.textContent = 'Please enter both email and password.'; return; }
        if(loginBtn) { loginBtn.textContent = 'Verifying...'; loginBtn.disabled = true; }
        if(et) et.textContent = '';
        try {
            const { data, error } = await sb.auth.signInWithPassword({ email: email, password: pass });
            if (error) throw error;
        } catch (err) {
            if(et) et.textContent = 'Login failed: ' + err.message;
            if(loginBtn) { loginBtn.textContent = 'Log In'; loginBtn.disabled = false; }
        }
    }
    
    async function logout() {
        const sb = window.supabaseClient;
        if (sb) await sb.auth.signOut();
        showLogin();
        c();
    }
    
    async function showMenu() {
        if (isMenuLoaded) return;
        isMenuLoaded = true;
        try {
            if(la) la.style.display = 'none';
            if(ma) ma.style.display = 'flex'; 
            if(loginBtn) { loginBtn.textContent = 'Log In'; loginBtn.disabled = false; }
            
            supabaseClient = window.supabaseClient;
            const sb = supabaseClient;
            const { data: { session } } = await sb.auth.getSession();
            const user = session?.user;
            const userRole = user?.user_metadata?.role;
            
            if (typeof FeaturedEventsModule !== 'undefined') FeaturedEventsModule.loadAdminFeatured();
            if (typeof FilmNightModule !== 'undefined') FilmNightModule.loadFilms();
            if (typeof LayoutModule !== 'undefined') LayoutModule.onTesterOpen();
            if (typeof DatabaseModule !== 'undefined') DatabaseModule.loadUpdates();
            if (typeof LightboxModule !== 'undefined') LightboxModule.loadImages();
            if (typeof EventsModule !== 'undefined') EventsModule.loadAdminEvents();
            if (typeof EnquiriesModule !== 'undefined') EnquiriesModule.loadAdminEnquiries();
            if (typeof BriefingModule !== 'undefined') BriefingModule.loadBriefing();
            if (typeof CelebrationModule !== 'undefined') CelebrationModule.loadAdminCelebrations();
            if (typeof CommunityModule !== 'undefined') CommunityModule.loadAdminCommunity();
            if (typeof MenuModule !== 'undefined' && (userRole === 'chef' || userRole === 'admin')) MenuModule.loadAdminMenu();
            
            setTimeout(() => { renderPhotoAdmin(); }, 500);
            
            const dashBtn = document.querySelector('button[data-tab="dashboard"]');
            if (dashBtn) dashBtn.click();
            if (typeof DashboardModule !== 'undefined') DashboardModule.loadDashboard();
            
        } catch (e) {
            console.error("Dashboard Load Error:", e);
            isMenuLoaded = false;
            if(la) la.style.display = 'flex';
            if(ma) ma.style.display = 'none';
            if(loginBtn) { loginBtn.textContent = 'Log In'; loginBtn.disabled = false; }
            if(et) et.textContent = 'Error loading dashboard. Try refreshing the page.';
        }
    }
    
    function showLogin() {
        isMenuLoaded = false;
        if(la) la.style.display = 'flex'; 
        if(ma) ma.style.display = 'none';
        if(pi) pi.value = '';
        if(emailInput) emailInput.value = '';
        if(loginBtn) { loginBtn.textContent = 'Log In'; loginBtn.disabled = false; }
    }
    
    async function checkAuthState() {
        try {
            const sb = window.supabaseClient;
            if (!sb) return showLogin();
            const { data: { session } } = await sb.auth.getSession();
            if (session) { showMenu(); } else { showLogin(); }
        } catch (e) { showLogin(); }
    }
    
    async function uploadPhoto() {
        const sb = window.supabaseClient;
        const fileInput = document.getElementById('photoUploadInput');
        const files = Array.from(fileInput.files);
        if (files.length === 0) { showToast("Please select at least one photo first."); return; }

        const captionInput = document.getElementById('photoCaptionInput');
        const categoryInput = document.getElementById('photoCategoryInput');
        const category = categoryInput ? categoryInput.value : 'General';
        const captionText = captionInput ? captionInput.value.trim() : '';
        let caption = captionText ? '_caption_' + captionText.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '-') : '';

        let successCount = 0;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!file.type.startsWith('image/')) continue;
            showToast(`Processing & compressing photo ${i + 1} of ${files.length}...`);
            try {
                const compressedBlob = await compressImage(file, 1200);
                const baseName = file.name.replace(/\.[^/.]+$/, "").replace(/\s+/g, '_').replace(/[^\w\-]/g, '');
                const fileName = `photo_${Date.now()}_${i}${caption}_${baseName}.jpg`;
                const { error: upErr } = await sb.storage.from('gallery').upload(fileName, compressedBlob);
                if (upErr) throw upErr;
                const { error: dbErr } = await sb.from('gallery_items').insert([{ storage_path: fileName, caption: captionText, category: category }]);
                if (dbErr) throw dbErr;
                successCount++;
            } catch (err) { console.error("Upload error:", err); }
        }

        if (successCount > 0) {
            showToast(`${successCount} photo(s) uploaded successfully!`);
            fileInput.value = '';
            if (captionInput) captionInput.value = '';
            const dropZone = document.getElementById('photoDropZone');
            if (dropZone) dropZone.innerHTML = '<span id="photoDropText">Drag & drop photos here<br>or click to select</span>';
            setTimeout(() => {
                if (typeof LightboxModule !== 'undefined') LightboxModule.loadImages();
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

    async function renderPhotoAdmin() {
        const sb = window.supabaseClient;
        const ac = document.getElementById('adminPhotoContainer');
        if (!ac) return;
        ac.innerHTML = '<p>Loading photos...</p>';
        try {
            const { data, error } = await sb.from('gallery_items').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            if (!data || data.length === 0) { ac.innerHTML = '<p>No photos found.</p>'; return; }
            
            let toolbar = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px; padding: 8px 12px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 8px;">
                <label style="font-size:.8rem; display:flex; align-items:center; gap:8px; cursor:pointer;">
                    <input type="checkbox" id="selectAllPhotos" style="width:16px; height:16px; cursor:pointer;"> Select All
                </label>
                <button id="deleteSelectedPhotosBtn" class="tester-btn" style="padding:6px 12px;font-size:0.7rem;background:var(--danger); color:#fff;">Remove Selected</button>
            </div>`;
            
            ac.innerHTML = toolbar + data.map(item => {
                const { data: urlData } = sb.storage.from('gallery').getPublicUrl(item.storage_path);
                const imgUrl = urlData.publicUrl;
                return `<div class="admin-film-item" style="padding: 8px 12px; display: flex; align-items: center; gap: 12px;">
                            <input type="checkbox" class="photo-check" data-id="${item.id}" data-path="${item.storage_path}" style="width:20px; height:20px; cursor:pointer; flex-shrink:0;">
                            <img src="${imgUrl}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px; flex-shrink: 0;">
                            <div style="flex:1;">
                                <span style="font-size:.8rem;font-weight:700;display:block;">${item.caption || item.storage_path}</span>
                                <span style="font-size:0.7rem; background: var(--accent-soft); color: var(--accent); padding: 2px 6px; border-radius: 4px; margin-top: 2px; display: inline-block;">${item.category}</span>
                            </div>
                            <button class="tester-btn del-photo-btn" data-id="${item.id}" data-path="${item.storage_path}" style="padding:4px 8px;font-size:0.7rem;background:var(--danger); color:#fff;">Delete</button>
                        </div>`;
            }).join('');
            
            ac.querySelectorAll('.del-photo-btn').forEach(btn => btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id; const path = e.target.dataset.path;
                try {
                    await sb.storage.from('gallery').remove([path]);
                    await sb.from('gallery_items').delete().eq('id', id);
                    showToast('Photo deleted!');
                    renderPhotoAdmin();
                    if (typeof LightboxModule !== 'undefined') LightboxModule.loadImages();
                } catch (err) { showToast('Error deleting photo.'); }
            }));
            
            const selectAll = ac.querySelector('#selectAllPhotos');
            if (selectAll) { selectAll.addEventListener('change', (e) => { document.querySelectorAll('.photo-check').forEach(cb => cb.checked = e.target.checked); }); }
            
            const multiDelBtn = ac.querySelector('#deleteSelectedPhotosBtn');
            if (multiDelBtn) {
                multiDelBtn.addEventListener('click', async () => {
                    const checkboxes = document.querySelectorAll('.photo-check:checked');
                    if (checkboxes.length === 0) { showToast("Please select at least one photo to delete."); return; }
                    const ids = Array.from(checkboxes).map(cb => cb.dataset.id);
                    const paths = Array.from(checkboxes).map(cb => cb.dataset.path);
                    if (confirm(`Are you sure you want to delete ${ids.length} photo(s)?`)) {
                        showToast("Deleting photos...");
                        try {
                            await sb.storage.from('gallery').remove(paths);
                            await sb.from('gallery_items').delete().in('id', ids);
                            showToast(`${ids.length} photo(s) deleted successfully!`);
                            renderPhotoAdmin();
                            if (typeof LightboxModule !== 'undefined') LightboxModule.loadImages();
                        } catch (err) { showToast("Error deleting photos."); }
                    }
                });
            }
        } catch (err) { ac.innerHTML = '<p>Error loading photos.</p>'; }
    }
    
        function init() {
        m = document.getElementById('testerModal');
        la = document.getElementById('testerLogin');
        ma = document.getElementById('testerMenu');
        emailInput = document.getElementById('testerEmail');
        pi = document.getElementById('testerPass');
        et = document.getElementById('testerError');
        loginBtn = document.getElementById('testerLoginBtn');
        
        if (!m) return; 
        
        // BULLETPROOF GLOBAL LISTENER FOR TABS & BUTTONS
        document.addEventListener('click', function(e) {
            // 1. Handle Login/Logout/Close/Upload Buttons
            if (e.target && e.target.id === 'testerLoginBtn') { e.preventDefault(); login(); }
            if (e.target && e.target.id === 'testerLogoutBtn') { e.preventDefault(); logout(); }
            if (e.target && e.target.id === 'testerCloseBtn') { c(); }
            if (e.target && e.target.id === 'uploadPhotoBtn') { uploadPhoto(); }
            
            // 2. Handle Tab Switching
            const tabBtn = e.target.closest('.tester-tab-btn');
            if (tabBtn && tabBtn.dataset.tab) {
                const tabName = tabBtn.dataset.tab;
                document.querySelectorAll('.tester-tab-btn').forEach(btn => btn.classList.remove('active'));
                document.querySelectorAll('.tester-tab-content').forEach(tab => { tab.classList.remove('active'); tab.style.display = 'none'; });
                tabBtn.classList.add('active');
                const activeTab = document.getElementById(`tab-${tabName}`);
                if (activeTab) { activeTab.classList.add('active'); activeTab.style.display = 'block'; }
                const tabs = document.querySelector('.tester-tabs'); 
                const backdrop = document.getElementById('mobileBackdrop');
                if (tabs) tabs.classList.remove('mobile-open'); 
                if (backdrop) backdrop.style.display = 'none';
                localStorage.setItem('haven_active_tab', tabName);
                if (tabName === 'dashboard' && typeof DashboardModule !== 'undefined') { 
                    DashboardModule.loadDashboard(); 
                }
            }
        });
        
        if (pi) pi.addEventListener('keypress', e => { if (e.key === 'Enter') login(); });
        if (emailInput) emailInput.addEventListener('keypress', e => { if (e.key === 'Enter') pi.focus(); });
        
        if (m) m.addEventListener('click', e => { if (e.target === m) c(); });
        
        const sb = window.supabaseClient;
        if (sb) {
            sb.auth.onAuthStateChange((event, session) => {
                if (event === 'SIGNED_IN') showMenu();
                else if (event === 'SIGNED_OUT') showLogin();
            });
        }
        showLogin(); 
        checkAuthState();
    }
    
    return { init, renderPhotoAdmin, uploadPhoto };
})();

// ==========================================
// BOOT SEQUENCE
// ==========================================
function safeInit(name, fn) { try { fn(); } catch (e) { console.error(`Module ${name} crashed:`, e); } }

function initializeAppModules() {
    safeInit('Tester', () => TesterModule.init());
    safeInit('Layout', () => LayoutModule.init());
    safeInit('Lightbox', () => LightboxModule.init());
    console.log("Haven Portal Modules Loaded Successfully.");
}

function bootApp() {
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
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootApp);
} else {
    bootApp();
}