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
        const badge=document.getElementById('quietHoursBadge');
        if(badge){
            const hours=n.getHours();
            const minutes=n.getMinutes();
            const currentMinutes=hours*60+minutes;
            const isLunch = currentMinutes >= 720 && currentMinutes <= 810; 
            const isEveningMorning = currentMinutes >= 1170 || currentMinutes <= 480; 
            if(isLunch || isEveningMorning){ badge.textContent="Quiet Hours"; badge.className="quiet-badge resting-hours"; badge.style.display="inline-block"; } 
            else { badge.textContent="Active Hours"; badge.className="quiet-badge active-hours"; badge.style.display="inline-block"; }
        }
    }
    function init(){u();setInterval(u,1000)}
    return{init};
})();

const ToastModule=(function(){
    const c=document.getElementById('toast-container');
    const notifBtn=document.getElementById('notifBtn');
    function show(msg){
        const t=document.createElement('div');
        t.className='toast';
        t.innerHTML=`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l2.5 7.5H22l-6.2 4.5 2.4 7.5L12 17l-6.2 4.5 2.4-7.5L2 9.5h7.5z"/></svg><span>${msg}</span>`;
        c.appendChild(t);
        setTimeout(()=>t.classList.add('show'),100);
        setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.remove(),400)},5000);
        if("Notification" in window && Notification.permission==="granted"){ try { new Notification("Tinkers Hatch Update", { body: msg }); } catch(e) {} }
    }
    async function requestPermission(){
        if(!("Notification" in window)){ ToastModule.show("Notifications not supported on this device."); return; }
        if(Notification.permission==="granted"){ ToastModule.show("Notifications are already enabled!"); return; }
        if(Notification.permission!=="denied"){
            const perm=await Notification.requestPermission();
            if(perm==="granted"){ ToastModule.show("Push notifications enabled! You'll get updates now."); new Notification("Tinkers Hatch", { body: "Notifications successfully turned on!" }); } 
            else { ToastModule.show("Notifications were blocked. You can change this in your browser settings."); }
        } else { ToastModule.show("Notifications are blocked in your browser settings."); }
    }
    function init(){
        const modalExists = document.getElementById('testerModal');
        if(!modalExists) return; 

        if(gearBtn) gearBtn.addEventListener('click',o);
        if(footerLogin) footerLogin.addEventListener('click',o);
        
        const closeBtn = document.getElementById('testerCloseBtn');
        if(closeBtn) closeBtn.addEventListener('click',c);
        
        // FIX: Removed duplicate "const loginBtn" which was crashing the script
        if(loginBtn) loginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            login();
        });
        
        const logoutBtn = document.getElementById('testerLogoutBtn');
        if(logoutBtn) logoutBtn.addEventListener('click',logout);
        
        if(pi) pi.addEventListener('keypress',e=>{ if(e.key==='Enter'){ login(); } });
        if(emailInput) emailInput.addEventListener('keypress',e=>{ if(e.key==='Enter'){ pi.focus(); } });
        
        document.querySelectorAll('.tester-season-btn').forEach(b=>b.addEventListener('click',e=>ss(e.target.dataset.season, e)));
        
        const broadcastBtn = document.getElementById('broadcastBtn');
        if(broadcastBtn) broadcastBtn.addEventListener('click',bc);
        
        const uploadBtn = document.getElementById('uploadPhotoBtn');
        if(uploadBtn) uploadBtn.addEventListener('click',uploadPhoto);
        
        m.addEventListener('click',e=>{ if(e.target===m){ c(); } });
        
        supabaseClient.auth.onAuthStateChange((event,session)=>{
            if(event==='SIGNED_IN'){ showMenu(); }
            else if(event==='SIGNED_OUT'){ showLogin(); }
        });
        
        showLogin(); 
        checkAuthState();
    }
    return{init};
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
    document.querySelectorAll('.splash-shortcut').forEach(btn => {
      btn.addEventListener('click', evt => { evt.preventDefault(); closeSplash(); const target = btn.getAttribute('href'); setTimeout(() => { const el = document.querySelector(target); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 800); });
    });
    const versionTag = document.getElementById('version-tag');
    if (versionTag) versionTag.textContent = 'Version 3.5';
  }
  return { init };
})();

const LayoutModule=(function(){const defaultOrder=['about','values','activities','featured-events','film-night','wilf','gallery','social','day','whats-new','faq','visit','changelog'];const key='th-layout-order';let currentOrder=[];function getOrder(){try{const saved=JSON.parse(safeGet(key));if(Array.isArray(saved)&&saved.length===defaultOrder.length){return saved;}}catch(e){}return[...defaultOrder];}function saveOrder(order){safeSet(key,JSON.stringify(order));}function applyLayout(order){const main=document.getElementById('main');const nav=document.getElementById('side-nav');if(!main||!nav)return;order.forEach(id=>{const section=document.getElementById(id);if(section){main.appendChild(section);}});order.forEach(id=>{const dot=nav.querySelector(`a[href="#${id}"]`);if(dot){nav.appendChild(dot);}});}function renderAdminUI(){const container=document.getElementById('layoutContainer');if(!container)return;container.innerHTML='';currentOrder.forEach((id,index)=>{const item=document.createElement('div');item.className='admin-film-item flex justify-between items-center';item.style.padding='8px 12px';const title=id.replace(/-/g,' ').replace(/\b\w/g,l=>l.toUpperCase());item.innerHTML=`<span style="text-transform:capitalize;font-size:.9rem">${title}</span><div class="flex gap-2"><button class="tester-btn layout-up" data-index="${index}" style="width: auto; margin: 0; padding: 4px 10px; font-size: 0.8rem; background: var(--cream-deep); color: var(--bark); border: 1px solid var(--border); ${index === 0 ? 'opacity: 0.3; pointer-events: none;' : ''}">▲</button><button class="tester-btn layout-down" data-index="${index}" style="width: auto; margin: 0; padding: 4px 10px; font-size: 0.8rem; background: var(--cream-deep); color: var(--bark); border: 1px solid var(--border); ${index === currentOrder.length - 1 ? 'opacity: 0.3; pointer-events: none;' : ''}">▼</button></div>`;container.appendChild(item);});container.querySelectorAll('.layout-up').forEach(btn=>{btn.addEventListener('click',(e)=>{const idx=parseInt(e.target.dataset.index);if(idx>0){[currentOrder[idx-1],currentOrder[idx]]=[currentOrder[idx],currentOrder[idx-1]];saveOrder(currentOrder);applyLayout(currentOrder);renderAdminUI();}});});container.querySelectorAll('.layout-down').forEach(btn=>{btn.addEventListener('click',(e)=>{const idx=parseInt(e.target.dataset.index);if(idx<currentOrder.length-1){[currentOrder[idx+1],currentOrder[idx]]=[currentOrder[idx],currentOrder[idx+1]];saveOrder(currentOrder);applyLayout(currentOrder);renderAdminUI();}});});}function resetLayout(){currentOrder=[...defaultOrder];saveOrder(currentOrder);applyLayout(currentOrder);renderAdminUI();ToastModule.show("Layout reto default!");}function init(){currentOrder=getOrder();applyLayout(currentOrder);const resetBtn=document.getElementById('resetLayoutBtn');if(resetBtn){resetBtn.addEventListener('click',resetLayout);}}function onTesterOpen(){renderAdminUI();}return{init,onTesterOpen};})();
const SideNavModule=(function(){function init(){const dots=document.querySelectorAll('.side-dot');if(!dots.length)return;const sections=Array.from(dots).map(dot=>{const id=dot.getAttribute('href').replace('#','');return document.getElementById(id);}).filter(Boolean);if(sections.length===0)return;function onScroll(){const scrollPos=window.scrollY+(window.innerHeight*0.4);let currentId=sections[0].id;for(let i=0;i<sections.length;i++){const section=sections[i];const offsetTop=section.getBoundingClientRect().top+window.scrollY;if(offsetTop<=scrollPos){currentId=section.id;}}dots.forEach(dot=>{if(dot.getAttribute('href')===`#${currentId}`){dot.classList.add('active');}else{dot.classList.remove('active');}});}let ticking=false;window.addEventListener('scroll',()=>{if(!ticking){window.requestAnimationFrame(()=>{onScroll();ticking=false;});ticking=true;}},{passive:true});onScroll();dots.forEach(dot=>dot.addEventListener('click',(e)=>{e.preventDefault();const target=document.querySelector(dot.getAttribute('href'));if(target)target.scrollIntoView({behavior:'smooth'});}));}return{init};})();
const AccessibilityModule=(function(){function init(){const t=document.getElementById('a11yToggle'),c=document.getElementById('a11yContent');if(!t||!c)return;t.addEventListener('click',e=>{e.stopPropagation();const o=c.classList.toggle('show');t.setAttribute('aria-expanded',o);});document.addEventListener('click',e=>{if(c.classList.contains('show')&&!c.contains(e.target)&&!t.contains(e.target)){c.classList.remove('show');t.setAttribute('aria-expanded','false');}});}return{init};})();
const QuickJumpModule=(function(){function init(){const t=document.getElementById('quickJumpToggle'),c=document.getElementById('quickJumpContent');if(!t||!c)return;t.addEventListener('click',e=>{e.stopPropagation();const o=c.classList.toggle('show');t.setAttribute('aria-expanded',o);});document.addEventListener('click',e=>{if(c.classList.contains('show')&&!c.contains(e.target)&&!t.contains(e.target)){c.classList.remove('show');t.setAttribute('aria-expanded','false');}});c.querySelectorAll('.quick-jump-link').forEach(link=>{link.addEventListener('click',e=>{e.preventDefault();c.classList.remove('show');t.setAttribute('aria-expanded','false');const target=document.querySelector(link.getAttribute('href'));if(target)target.scrollIntoView({behavior:'smooth'});});});const footerLink=document.getElementById('footerChangelogLink');const changelogSection=document.getElementById('changelog');if(footerLink&&changelogSection){footerLink.addEventListener('click',e=>{e.preventDefault();changelogSection.style.display='block';setTimeout(()=>changelogSection.scrollIntoView({behavior:'smooth'}),100);});}}return{init};})();
const ReadAloudModule=(function(){let s=window.speechSynthesis,v=[],r=false;const b=document.getElementById('readAloudBtn');function lv(){if(s)v=s.getVoices()}function gv(){if(!v.length)lv();const p=["Google UK English Female","Google UK English Male","Google US English","Microsoft Sonia - English (United Kingdom)","Microsoft Ryan - English (United Kingdom)","Microsoft Hazel - English (United Kingdom)","Microsoft George - English (United Kingdom)","Samantha","Daniel","Karen","Moira","Tessa"];for(let n of p){let vc=v.find(x=>x.name===n);if(vc)return vc}return v.find(x=>x.lang==='en-GB')||v.find(x=>x.lang==='en-US')||v.find(x=>x.lang.startsWith('en'))||(v.length?v[0]:null)}function st(){if(s)s.cancel();r=false;if(b){b.setAttribute('aria-pressed','false');b.classList.remove('active')}}function gc(){const m=document.getElementById('main');if(!m)return[];const c=m.cloneNode(true);c.querySelectorAll('button, nav, .ambient-player, svg, img, .hidden, [aria-hidden="true"], .lightbox-overlay, .gallery-cta, .toast-container, #sensory-overlay, #testerOpenBtn, #backToTopBtn, .bcn-btn').forEach(e=>e.remove());let ch=[];c.querySelectorAll('h1, h2, h3, h4, p, li, summary, span.tag').forEach(e=>{let t=e.innerText.trim();if(t){let s=t.match(/[^\.!\?]+[\.!\?]+|[^\.!\?]+$/g)||[t];s.forEach(x=>ch.push(x.trim()))}});return ch}function str(){if(!s)return alert('Text-to-speech is not supported on this device.');let ch=gc();if(!ch.length)return;r=true;if(b){b.setAttribute('aria-pressed','true');b.classList.add('active')}let i=0;const vc=gv();function sn(){if(!r||i>=ch.length){st();return}let t=ch[i];if(!t){i++;sn();return}let u=new SpeechSynthesisUtterance(t);if(vc){u.voice=vc;u.lang=vc.lang}else{u.lang='en-GB'}u.rate=0.92;u.pitch=1.0;u.volume=1.0;u.onend=()=>{i++;setTimeout(sn,120)};u.onerror=()=>st();s.speak(u)}sn()}function tg(){if(r)st();else str()}function init(){if(!b||!s)return;lv();if(typeof s.onvoiceschanged!=='undefined')s.onvoiceschanged=lv;b.addEventListener('click',tg);window.addEventListener('beforeunload',st)}return{init}})();
const AmbientAudioModule=(function(){const btns=document.querySelectorAll('.ambient-btn'),ov=document.getElementById('sensory-overlay');let ctx=null,mg=null,an=[],cs=null,bs=null,ds=null,nc={};function ec(){if(!ctx){const A=window.AudioContext||window.webkitAudioContext;if(!A)return false;ctx=new A()}if(ctx.state==='suspended')ctx.resume();return true}function mnb(t){if(nc[t])return nc[t];const sr=ctx.sampleRate,len=12*sr,buf=ctx.createBuffer(1,len,sr),d=buf.getChannelData(0);if(t==='white'){for(let i=0;i<len;i++)d[i]=Math.random()*2-1}else if(t==='pink'){let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;for(let i=0;i<len;i++){const w=Math.random()*2-1;b0=0.99886*b0+w*0.0555179;b1=0.99332*b1+w*0.0750759;b2=0.96900*b2+w*0.1538520;b3=0.86650*b3+w*0.3104856;b4=0.55000*b4+w*0.5329522;b5=-0.7616*b5-w*0.0168980;d[i]=(b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.11;b6=w*0.115926}}else if(t==='brown'){let l=0;for(let i=0;i<len;i++){const w=Math.random()*2-1;l=(l+0.02*w)/1.02;d[i]=l*3.5}}nc[t]=buf;return buf}function sa(){if(bs)clearTimeout(bs);if(ds)clearTimeout(ds);an.forEach(n=>{try{if(n.stop)n.stop()}catch(e){}try{if(n.disconnect)n.disconnect()}catch(e){}});an=[];if(mg){try{mg.gain.cancelScheduledValues(ctx.currentTime);mg.gain.setValueAtTime(mg.gain.value,ctx.currentTime);mg.gain.linearRampToValueAtTime(0,ctx.currentTime+0.5)}catch(e){}setTimeout(()=>{try{mg.disconnect()}catch(e){}},600);mg=null}cs=null;btns.forEach(b=>b.classList.remove('active'));if(ov)ov.classList.remove('active');if(ctx&&ctx.state==='running'){setTimeout(()=>{if(cs===null&&ctx&&ctx.state==='running')ctx.suspend()},1000)}}function an_add(n){an.push(n);n.onended=()=>{const i=an.indexOf(n);if(i>-1)an.splice(i,1);try{n.disconnect()}catch(e){}}}function srain(){if(!ec())return;const c=ctx;mg=c.createGain();mg.gain.setValueAtTime(0,c.currentTime);mg.gain.linearRampToValueAtTime(0.6,c.currentTime+0.4);mg.connect(c.destination);const h=c.createBufferSource();h.buffer=mnb('white');h.loop=true;const hf=c.createBiquadFilter();hf.type='bandpass';hf.frequency.value=3800;hf.Q.value=0.7;const hg=c.createGain();hg.gain.value=0.25;h.connect(hf);hf.connect(hg);hg.connect(mg);h.start();an_add(h);const m=c.createBufferSource();m.buffer=mnb('pink');m.loop=true;const mf=c.createBiquadFilter();mf.type='bandpass';mf.frequency.value=1200;mf.Q.value=0.5;const mgl=c.createGain();mgl.gain.value=0.5;m.connect(mf);mf.connect(mgl);mgl.connect(mg);m.start();an_add(m);const l=c.createBufferSource();l.buffer=mnb('brown');l.loop=true;const lf=c.createBiquadFilter();lf.type='lowpass';lf.frequency.value=320;const lg=c.createGain();lg.gain.value=0.4;l.connect(lf);lf.connect(lg);lg.connect(mg);l.start();an_add(l);function sd(){if(cs!=='rain')return;try{const t=c.currentTime+0.1+Math.random()*0.4;const o=c.createOscillator();o.type='sine';const f=600+Math.random()*1800;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*0.4,t+0.08);const g=c.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.08+Math.random()*0.06,t+0.005);g.gain.exponentialRampToValueAtTime(0.0001,t+0.12);o.connect(g);g.connect(mg);o.start(t);o.stop(t+0.15);an_add(o)}catch(e){}ds=setTimeout(sd,80+Math.random()*250)}sd()}function socean(){if(!ec())return;const c=ctx;mg=c.createGain();mg.gain.setValueAtTime(0,c.currentTime);mg.gain.linearRampToValueAtTime(0.8,c.currentTime+0.6);mg.connect(c.destination);const n=c.createBufferSource();n.buffer=mnb('brown');n.loop=true;const lf=c.createBiquadFilter();lf.type='lowpass';lf.frequency.value=500;const ng=c.createGain();ng.gain.value=0.6;n.connect(lf);lf.connect(ng);ng.connect(mg);n.start();an_add(n);const f=c.createBufferSource();f.buffer=mnb('pink');f.loop=true;const ff=c.createBiquadFilter();ff.type='bandpass';ff.frequency.value=2200;ff.Q.value=0.5;const fg=c.createGain();fg.gain.value=0.2;f.connect(ff);ff.connect(fg);fg.connect(mg);f.start();an_add(f);const wl=c.createOscillator();wl.type='sine';wl.frequency.value=0.1;const lg=c.createGain();lg.gain.value=0.3;wl.connect(lg);lg.connect(ng.gain);wl.start();an_add(wl);const wl2=c.createOscillator();wl2.type='sine';wl2.frequency.value=0.06;const lg2=c.createGain();lg2.gain.value=0.15;wl2.connect(lg2);lg2.connect(fg.gain);wl2.start();an_add(wl2)}function sbirds(){if(!ec())return;const c=ctx;mg=c.createGain();mg.gain.setValueAtTime(0,c.currentTime);mg.gain.linearRampToValueAtTime(0.7,c.currentTime+0.5);mg.connect(c.destination);const w=c.createBufferSource();w.buffer=mnb('pink');w.loop=true;const wf=c.createBiquadFilter();wf.type='bandpass';wf.frequency.value=600;wf.Q.value=0.4;const wg=c.createGain();wg.gain.value=0.12;w.connect(wf);wf.connect(wg);wg.connect(mg);w.start();an_add(w);function ch(t){const o=c.createOscillator();o.type='sine';const b=1800+Math.random()*2400;const d=0.08+Math.random()*0.22;o.frequency.setValueAtTime(b,t);o.frequency.exponentialRampToValueAtTime(b*1.4,t+d*0.4);o.frequency.exponentialRampToValueAtTime(b*0.9,t+d);const g=c.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.3+Math.random()*0.15,t+0.02);g.gain.exponentialRampToValueAtTime(0.0001,t+d);o.connect(g);g.connect(mg);o.start(t);o.stop(t+d+0.05);an_add(o);if(Math.random()>0.5){const o2=c.createOscillator();o2.type='triangle';o2.frequency.setValueAtTime(b*1.5,t);o2.frequency.exponentialRampToValueAtTime(b*1.5*1.4,t+d*0.4);const g2=c.createGain();g2.gain.setValueAtTime(0,t);g2.gain.linearRampToValueAtTime(0.12,t+0.02);g2.gain.exponentialRampToValueAtTime(0.0001,t+d);o2.connect(g2);g2.connect(mg);o2.start(t);o2.stop(t+d+0.05);an_add(o2)}}function sc(){if(cs!=='birds')return;try{const t=c.currentTime+0.05;const b=Math.random()>0.6?(Math.random()>0.5?2:3):1;for(let i=0;i<b;i++)ch(t+i*(0.12+Math.random()*0.08))}catch(e){}bs=setTimeout(sc,800+Math.random()*2700)}sc()}function tg(snd){if(cs===snd){sa();return}sa();cs=snd;if(snd==='rain')srain();else if(snd==='ocean')socean();else if(snd==='birds')sbirds();else return;btns.forEach(b=>b.classList.remove('active'));const ab=document.querySelector(`.ambient-btn[data-sound="${snd}"]`);if(ab)ab.classList.add('active');if(ov)ov.classList.add('active')}function init(){if(!btns.length)return;btns.forEach(b=>b.addEventListener('click',()=>tg(b.dataset.sound)));window.addEventListener('beforeunload',sa)}return{init}})();
const SensoryModule=(function(){function toggle(state){const b=document.body;if(state==='on')b.classList.add('sensory-mode-active');else b.classList.remove('sensory-mode-active');safeSet('th-sensory',state);}function init(){document.querySelectorAll('#sensoryToggleBtn, #sensoryFloatBtn').forEach(btn=>{if(!btn)return;btn.addEventListener('click',()=>{if(document.body.classList.contains('sensory-mode-active')){toggle('off');}else{toggle('on');}});});const exitBtn=document.getElementById('exitSensoryBtn');if(exitBtn){exitBtn.addEventListener('click',()=>{toggle('off');const activeAudioBtn=document.querySelector('#sensoryOverlay .ambient-btn.active');if(activeAudioBtn)activeAudioBtn.click();});}}return{init};})();
const BackToTopModule=(function(){function init(){const b=document.getElementById('backToTopBtn');if(!b)return;let t=false;function os(){if(t)return;t=true;requestAnimationFrame(()=>{if(window.scrollY>400)b.classList.add('show');else b.classList.remove('show');t=false})}window.addEventListener('scroll',os,{passive:true});b.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));b.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();window.scrollTo({top:0,behavior:'smooth'})}})}return{init}})();
const SeasonalModule=(function(){function g(){const m=new Date().getMonth()+1;if([12,1,2].includes(m))return'winter';if([3,4,5].includes(m))return'spring';if([6,7,8].includes(m))return'summer';if([9,10,11].includes(m))return'autumn';return'summer'}function init(){const b=document.body,t=safeGet('th-theme'),p=safeGet('th-palette');if((!t||t==='light')&&(!p||p==='nature')){const s=g();b.classList.add('season-'+s);generateSeasonalBackground(s)}}return{init,getCurrentSeason:g}})();
const FaviconModule=(function(){function getTimeOfDay(){const h=new Date().getHours();if(h>=5&&h<12)return'morning';if(h>=12&&h<17)return'afternoon';if(h>=17&&h<20)return'evening';return'night';}function setFavicon(svg){let link=document.querySelector("link[rel~='icon']");if(!link){link=document.createElement('link');link.rel='icon';document.head.appendChild(link);}link.type='image/svg+xml';link.href='data:image/svg+xml;base64,'+btoa(svg);}async function init(){let isBirthday=false;if(typeof supabaseClient!=='undefined'&&supabaseClient){try{const now=new Date();const currentMonth=now.getMonth()+1;const currentDay=now.getDate();const{data,error}=await supabaseClient.from('celebrations').select('day, month').eq('day',currentDay).eq('month',currentMonth);if(data&&data.length>0)isBirthday=true;}catch(e){console.error('Favicon bday check failed',e);}}let svg='';let themeColor="#152630";if(isBirthday){svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="#FCFBFA"/><path fill="#C25528" d="M25 55c0-5 10-10 15-5s10 5 15 0 10-5 15 0 10 5 15 5 10 0 15-5v30H25V55z"/><rect x="20" y="80" width="60" height="10" rx="5" fill="#A87816"/><circle cx="50" cy="25" r="5" fill="#FFD700"/><path d="M50 25v-8" stroke="#FFD700" stroke-width="2"/></svg>`;themeColor="#C25528";}else{const timeOfDay=getTimeOfDay();if(timeOfDay==='morning'){svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="#FCFBFA"/><path d="M15 75h70" stroke="#A87816" stroke-width="8" stroke-linecap="round"/><circle cx="50" cy="75" r="25" fill="#D9A521"/><path d="M50 35v-10M30 45l-6-6M70 45l6-6" stroke="#D9A521" stroke-width="6" stroke-linecap="round"/></svg>`;themeColor="#D9A521";}else if(timeOfDay==='afternoon'){svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="#FCFBFA"/><circle cx="50" cy="50" r="20" fill="#D9A521"/><path d="M50 15v10M50 75v10M15 50h10M75 50h10M25 25l7 7M68 68l7 7M75 25l-7 7M32 68l-7 7" stroke="#D9A521" stroke-width="8" stroke-linecap="round"/></svg>`;themeColor="#14856A";}else if(timeOfDay==='evening'){svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="#FCFBFA"/><path d="M15 75h70" stroke="#C25528" stroke-width="8" stroke-linecap="round"/><circle cx="50" cy="75" r="25" fill="#E74C3C"/><path d="M50 40v-5M30 50l-4-4M70 50l4-4" stroke="#E74C3C" stroke-width="6" stroke-linecap="round"/></svg>`;themeColor="#C25528";}else if(timeOfDay==='night'){svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="#1A2B3C"/><path d="M65 50a25 25 0 1 1-25-25a20 20 0 0 0 25 25z" fill="#FDFCF8"/><circle cx="30" cy="30" r="3" fill="#FFF"/><circle cx="75" cy="70" r="2" fill="#FFF"/></svg>`;themeColor="#111418";}}setFavicon(svg);let themeMeta=document.querySelector("meta[name='theme-color']");if(themeMeta)themeMeta.setAttribute("content",themeColor);}return{init};})();
const ThemeModule=(function(){const b=document.body,k='th-theme',c=['theme-dark','theme-warm','theme-soft','theme-high-contrast'];function set(t){c.forEach(x=>b.classList.remove(x));b.classList.remove('season-winter','season-spring','season-summer','season-autumn');if(t!=='light')b.classList.add('theme-'+t);document.querySelectorAll('.theme-btn').forEach(e=>e.setAttribute('aria-pressed',e.dataset.theme===t));safeSet(k,t);if(t!=='light')document.getElementById('seasonal-bg').innerHTML='';else{const p=safeGet('th-palette');if(!p||p==='nature'){const s=SeasonalModule.getCurrentSeason();b.classList.add('season-'+s);generateSeasonalBackground(s)}}}function init(){let s='light';try{s=safeGet(k)||'light'}catch(e){}if(s==='light'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches){s='dark';}set(s);document.querySelectorAll('.theme-btn').forEach(e=>e.addEventListener('click',()=>set(e.dataset.theme)))}return{init,setTheme:set}})();
const FontSizeModule=(function(){const h=document.documentElement,b=document.body,k='th-fontsize',c=['th-text-xs','th-text-sm','th-text-md','th-text-lg','th-text-bold'];function set(s){c.forEach(x=>h.classList.remove(x));c.forEach(x=>b.classList.remove(x));h.classList.add('th-text-'+s);if(s==='bold')b.classList.add('th-text-bold');safeSet(k,s);document.querySelectorAll('.font-btn').forEach(btn=>btn.setAttribute('aria-pressed',btn.dataset.size===s))}function init(){const btns=document.querySelectorAll('.font-btn');if(!btns.length)return;let s='md';try{s=safeGet(k)||'md'}catch(e){}set(s);btns.forEach(btn=>btn.addEventListener('click',()=>set(btn.dataset.size)))}return{init}})();
const DyslexiaModule=(function(){const b=document.body,k='th-dyslexia';function set(state){if(state==='on')b.classList.add('dyslexia-mode');else b.classList.remove('dyslexia-mode');safeSet(k,state);document.querySelectorAll('.dyslexia-btn').forEach(btn=>btn.setAttribute('aria-pressed',btn.dataset.dyslexia===state));}function init(){const btns=document.querySelectorAll('.dyslexia-btn');if(!btns.length)return;let s=safeGet(k)||'off';set(s);btns.forEach(btn=>btn.addEventListener('click',()=>set(btn.dataset.dyslexia)));}return{init};})();
const PaletteModule=(function(){const b=document.body,k='th-palette',p=['palette-ocean','palette-sunset','palette-berry'];function set(v){p.forEach(x=>b.classList.remove(x));b.classList.remove('season-winter','season-spring','season-summer','season-autumn');if(v!=='nature')b.classList.add('palette-'+v);safeSet(k,v);document.querySelectorAll('.palette-btn').forEach(btn=>btn.setAttribute('aria-pressed',btn.dataset.palette===v));if(v!=='nature')document.getElementById('seasonal-bg').innerHTML='';else{const t=safeGet('th-theme');if(!t||t==='light'){const s=SeasonalModule.getCurrentSeason();b.classList.add('season-'+s);generateSeasonalBackground(s)}}}function init(){const btns=document.querySelectorAll('.palette-btn');if(!btns.length)return;let s='nature';try{s=safeGet(k)||'nature'}catch(e){}set(s);btns.forEach(btn=>btn.addEventListener('click',()=>set(btn.dataset.palette)))}return{init}})();
const RevealModule=(function(){function init(){if(!('IntersectionObserver'in window)){document.querySelectorAll('.reveal').forEach(e=>e.classList.add('in'));return}const ob=new IntersectionObserver(e=>{e.forEach(en=>{if(en.isIntersecting){en.target.classList.add('in');ob.unobserve(en.target)}})},{threshold:0,rootMargin:'0px 0px -10% 0px'});document.querySelectorAll('.reveal').forEach(e=>ob.observe(e))}return{init}})();
const MoodModule=(function(){const r={happy:{t:"We're glad you're feeling happy!",b:"Maybe today is a good day to share that with someone. A smile, a wave, or a 'good morning' can make someone else's day brighter too."},calm:{t:"Calm is a lovely way to feel.",b:"The garden is a beautiful spot for quiet moments today. There's a bench by the apple tree that catches the morning sun."},curious:{t:"Curiosity is a wonderful thing.",b:"There's a new art project starting this afternoon — trying something new is always welcome, even just to watch at first."},tired:{t:"It's okay to feel tired.",b:"Be gentle with yourself today. The cozy lounge has comfortable chairs and a pot of tea is never far away. Rest counts as doing something."},excited:{t:"How lovely — excitement!",b:"Channel that energy! Today's baking session is making bread rolls, and there's a film afternoon with proper popcorn at 3pm."}};function init(){const btns=document.querySelectorAll('.mood-btn'),md=document.getElementById('moodDefault'),mm=document.getElementById('moodMessage');if(!btns.length||!md||!mm)return;btns.forEach(btn=>btn.addEventListener('click',()=>{const k=btn.dataset.mood,res=r[k];if(!res)return;btns.forEach(b=>b.classList.remove('active'));btn.classList.add('active');md.hidden=true;mm.hidden=false;mm.innerHTML=`<div style="max-width:600px;margin:0 auto;"><div class="display font-extrabold text-xl mb-4" style="color:var(--bark)">${res.t}</div><p style="color:var(--bark-soft);line-height:1.6;">${res.b}</p></div>`}))}return{init}})();
const LightboxModule=(function(){function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}let imgs=[];const fallbackImgs=shuffle([{src:'https://i.ibb.co/xSq92n0r/123-1.jpg',alt:'Beautiful flower 1'},{src:'https://i.ibb.co/WNjYC10y/123-2.jpg',alt:'Beautiful flower 2'},{src:'https://i.ibb.co/Y7WfbmDV/123-3.jpg',alt:'Beautiful flower 3'},{src:'https://i.ibb.co/wFBgfMtX/123-4.jpg',alt:'Beautiful flower 4'},{src:'https://i.ibb.co/4nKQ3X6s/123-5.jpg',alt:'Beautiful flower 5'},{src:'https://i.ibb.co/dsc78qPJ/123-6.jpg',alt:'Beautiful flower 6'}]);let cur=0,lb,li,lc,lp,ln,lct,g,anim=false,tsx=0;async function loadImages(){if(!supabaseClient){imgs=fallbackImgs;renderGallery();return;}try{const{data,error}=await supabaseClient.storage.from('gallery').list('',{limit:100,offset:0,sortBy:{column:'created_at',order:'desc'}});if(data&&data.length>0){imgs=data.filter(file=>!file.name.startsWith('.')).map(file=>{const{data:urlData}=supabaseClient.storage.from('gallery').getPublicUrl(file.name);let alt='Gallery Photo';if(file.name.includes('_caption_')){const match=file.name.match(/_caption_([^_]+)/);if(match&&match[1]){alt=match[1].replace(/-/g,' ');}}return{src:urlData.publicUrl,alt:alt};});}else{imgs=fallbackImgs;}}catch(e){imgs=fallbackImgs;}renderGallery();}function renderGallery(){if(!g)return;g.innerHTML='';if(imgs.length===0){g.innerHTML='<p style="color:var(--bark-soft);text-align:center;grid-column:1/-1;">No photos yet.</p>';return;}imgs.slice(0,6).forEach((io,idx)=>{const t=document.createElement('img');t.src=io.src;t.alt=`View ${io.alt}`;t.className='gallery-thumb blur-load';t.loading='lazy';t.addEventListener('load',()=>t.classList.add('loaded'));t.addEventListener('click',()=>o(idx));g.appendChild(t);});const v=document.createElement('button');v.className='gallery-cta';v.setAttribute('aria-label','Open full photo gallery');v.innerHTML=`<div class="gallery-cta-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2-3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg></div><div class="gallery-cta-text">View All ${imgs.length} Photos</div>`;v.addEventListener('click',()=>o(0));g.appendChild(v);}function pl(){for(let i=-1;i<=2;i++){const idx=(cur+i+imgs.length)%imgs.length;const img=new Image();img.src=imgs[idx].src}}function r(d){if(anim)return;anim=true;const oc=d==='next'?'flip-out-next':'flip-out-prev',ic=d==='next'?'flip-in-next':'flip-in-prev';li.classList.add(oc);li.classList.remove('flip-in-next','flip-in-prev');void li.offsetWidth;setTimeout(()=>{li.src=imgs[cur].src;li.alt=imgs[cur].alt;lct.textContent=`${cur+1} / ${imgs.length}`;li.classList.remove(oc);void li.offsetWidth;li.classList.add(ic);setTimeout(()=>{anim=false;pl()},250)},250)}function o(i){cur=i;li.classList.remove('flip-in-next','flip-in-prev','flip-out-next','flip-out-prev');li.src=imgs[cur].src;li.alt=imgs[cur].alt;lct.textContent=`${cur+1} / ${imgs.length}`;lb.classList.add('active');anim=false;pl()}function c(){lb.classList.remove('active')}function n(){if(anim)return;cur=(cur+1)%imgs.length;r('next')}function p(){if(anim)return;cur=(cur-1+imgs.length)%imgs.length;r('prev')}function hk(e){if(!lb.classList.contains('active'))return;switch(e.key){case'Escape':c();break;case'ArrowRight':n();break;case'ArrowLeft':p();break}}function hts(e){tsx=e.changedTouches[0].clientX}function hte(e){if(!lb.classList.contains('active'))return;const tex=e.changedTouches[0].clientX,d=tex-tsx;if(Math.abs(d)>50){if(d<0)n();else p()}}function init(){lb=document.getElementById('lightbox');li=document.getElementById('lightboxImg');lc=document.getElementById('lightboxClose');lp=document.getElementById('lightboxPrev');ln=document.getElementById('lightboxNext');lct=document.getElementById('lightboxCounter');g=document.getElementById('galleryGrid');if(!lb||!g)return;loadImages();lc.addEventListener('click',c);ln.addEventListener('click',e=>{e.stopPropagation();n()});lp.addEventListener('click',e=>{e.stopPropagation();p()});li.addEventListener('click',e=>{e.stopPropagation();n()});lb.addEventListener('click',e=>{if(e.target===lb)c()});document.addEventListener('keydown',hk);lb.addEventListener('touchstart',hts,{passive:true});lb.addEventListener('touchend',hte,{passive:true})}return{init,loadImages};})();
const FooterA11yModule=(function(){function init(){const b=document.getElementById('footerA11y');if(!b)return;b.addEventListener('click',()=>{const n=document.createElement('div');n.setAttribute('role','alert');n.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--bark);color:#fff;padding:16px 24px;border-radius:8px;z-index:3000;max-width:90vw;box-shadow:0 10px 30px rgba(0,0,0,.2);font-size:14px;';n.innerHTML='Our full accessibility statement is available on request. Please call us on <strong>01435 863119</strong> or email <strong>services@tinkershatch.co.uk</strong> and we will send it to you in your preferred format.';document.body.appendChild(n);setTimeout(()=>{n.style.transition='opacity .4s ease';n.style.opacity='0';setTimeout(()=>n.remove(),400)},5000)})}return{init}})();
const ProgressModule=(function(){function init(){const b=document.getElementById('progress-bar');if(!b)return;let t=false;function u(){const ws=window.scrollY||document.documentElement.scrollTop,h=document.documentElement.scrollHeight-window.innerHeight,sc=h>0?(ws/h)*100:0;b.style.width=sc+'%';t=false}window.addEventListener('scroll',()=>{if(!t){requestAnimationFrame(u);t=true}},{passive:true})}return{init}})();
const ParallaxModule=(function(){function init(){if(window.matchMedia('(max-width: 768px)').matches) return;const items=document.querySelectorAll('[data-parallax]');if(!items.length||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;let ticking=false;function update(){const sy=window.pageYOffset;const updates=[];items.forEach(i=>{const speed=parseFloat(i.dataset.parallax);if(i.dataset.pt==='fixed'){updates.push({el:i, transform:`translate3d(0, ${sy*speed}px, 0)`})}else{const rect=i.getBoundingClientRect();const centerOffset=(rect.top+rect.height/2)-(window.innerHeight/2);updates.push({el:i, transform:`translate3d(0, ${centerOffset*speed*-1}px, 0)`})}});updates.forEach(u=>u.el.style.transform=u.transform);ticking=false}function onScroll(){if(!ticking){window.requestAnimationFrame(update);ticking=true}}window.addEventListener('scroll',onScroll,{passive:true});update()}return{init}})();
const WeatherModule=(function(){async function init(){const widget=document.getElementById('weatherWidget');if(!widget)return;const lat=50.96;const lon=0.26;const url=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`;try{const res=await fetch(url);const data=await res.json();const temp=Math.round(data.current.temperature_2m);const code=data.current.weather_code;let icon="🌤️";let title="A lovely day";let message="A light jacket might be a good idea for a walk.";if(code===0){icon="☀️";title="Sunny skies!";message="The sun is shining! Don't forget your suncream and a hat for the garden.";}else if(code>=1&&code<=3){icon="⛅";title="Soft clouds";message="A gentle, overcast day. Perfect for a stroll without getting too hot.";}else if(code>=45&&code<=48){icon="🌫️";title="Misty morning";message="It's a bit foggy out. Take care if you're driving to see us.";}else if((code>=51&&code<=67)||(code>=80&&code<=82)){icon="🌧️";title="Rainy day";message="It's raining! Best bring a coat and a brolly—perfect weather for a cuppa indoors.";}else if((code>=71&&code<=77)||(code>=85&&code<=86)){icon="❄️";title="Snowing!";message="It's snowing! Wrap up warm in your cosiest scarf and mittens.";}else if(code>=95){icon="⛈️";title="Stormy weather";message="Stormy out there today. Best to stay cozy by the fire indoors.";}widget.innerHTML=`<div class="weather-icon">${icon}</div><div class="weather-text"><h3>${title} • ${temp}°C</h3><p>${message}</p></div>`;}catch(e){widget.innerHTML=`<div class="weather-text"><h3>Weather</h3><p>Check the forecast before visiting!</p></div>`;}}return{init};})();
const CelebrationModule=(function(){async function loadCelebrations(){const c=document.getElementById('celebrationsContainer');if(!c||!supabaseClient)return;c.innerHTML='<p style="color:var(--bark-soft);text-align:center;grid-column:1/-1;">Loading celebrations...</p>';try{const{data,error}=await supabaseClient.from('celebrations').select('*');if(error)throw error;if(!data||data.length===0){c.innerHTML='<p style="color:var(--bark-soft);text-align:center;grid-column:1/-1;">No upcoming celebrations listed right now.</p>';return;}const now=new Date();const currentMonth=now.getMonth()+1;const currentDay=now.getDate();const monthNames=["January","February","March","April","May","June","July","August","September","October","November","December"];const todayCelebs=data.filter(x=>x.month===currentMonth&&x.day===currentDay);if(todayCelebs.length>0){triggerConfetti();const badge=document.getElementById('celebrationBadge');const name=todayCelebs[0].name;const type=todayCelebs[0].type;badge.innerHTML=`🎉 Happy ${type}, ${name}!`;badge.style.display='flex';}const upcoming=data.filter(x=>{if(x.month===currentMonth&&x.day>=currentDay)return true;if(x.month===(currentMonth%12)+1)return true;return false;}).sort((a,b)=>(a.month*100+a.day)-(b.month*100+b.day));if(upcoming.length===0){c.innerHTML='<p style="color:var(--bark-soft);text-align:center;grid-column:1/-1;">No upcoming celebrations in the near future.</p>';return;}c.innerHTML=upcoming.map(ev=>{const icon=ev.type==='Birthday'?'🎂':'💍';return `<div class="celebration-card reveal in"><div class="icon">${icon}</div><div class="info"><h4>${ev.name}</h4><p>${ev.day} ${monthNames[ev.month-1]} • ${ev.type}</p></div></div>`;}).join('');}catch(e){c.innerHTML='<p style="color:var(--bark-soft);text-align:center;grid-column:1/-1;">Could not load celebrations.</p>';}}function triggerConfetti(){const container=document.getElementById('confettiContainer');const colors=['#C25528','#A87816','#A63A5A','#7CA890','#1AA37E','#F2C200'];for(let i=0;i<50;i++){const piece=document.createElement('div');piece.className='confetti-piece';piece.style.left=Math.random()*100+'vw';piece.style.background=colors[Math.floor(Math.random()*colors.length)];piece.style.animationDelay=Math.random()*2+'s';piece.style.width=(Math.random()*8+4)+'px';piece.style.height=(Math.random()*8+4)+'px';container.appendChild(piece);setTimeout(()=>piece.remove(),5000);}}async function loadAdminCelebrations(){const ac=document.getElementById('adminCelebContainer');if(!ac||!supabaseClient)return;ac.innerHTML='<p class="text-sm" style="color: var(--bark-soft);">Loading...</p>';try{const{data,error}=await supabaseClient.from('celebrations').select('*').order('month',{ascending:true}).order('day',{ascending:true});if(error)throw error;if(!data||data.length===0){ac.innerHTML='<p class="text-sm" style="color: var(--bark-soft);">No celebrations found.</p>';return;}const monthNames=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];ac.innerHTML=data.map(ev=>`<div class="admin-film-item" style="padding: 8px 12px;"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;"><span style="font-size:.8rem;font-weight:700;flex:1;">${ev.name} (${ev.day} ${monthNames[ev.month-1]}) - ${ev.type}</span><button class="tester-btn del-celeb-btn" data-id="${ev.id}" style="width:auto;margin:0;padding:4px 8px;font-size:0.7rem;background:var(--terracotta);">Delete</button></div></div>`).join('');ac.querySelectorAll('.del-celeb-btn').forEach(btn=>btn.addEventListener('click',async(e)=>{const id=e.target.dataset.id;try{await supabaseClient.from('celebrations').delete().eq('id',id);ToastModule.show('Celebration deleted!');loadAdminCelebrations();loadCelebrations();}catch(err){ToastModule.show('Error deleting celebration.');}}));}catch(e){ac.innerHTML='<p class="text-sm" style="color: var(--terracotta);">Error loading celebrations.</p>';}}async function addCelebration(){const name=document.getElementById('newCelebName').value.trim();const type=document.getElementById('newCelebType').value;const month=parseInt(document.getElementById('newCelebMonth').value);const day=parseInt(document.getElementById('newCelebDay').value);if(!name||!day||day<1||day>31){ToastModule.show('Name and valid Day (1-31) are required.');return;}try{const{error}=await supabaseClient.from('celebrations').insert([{name:name,type:type,month:month,day:day}]);if(error)throw error;ToastModule.show('Celebration added!');document.getElementById('newCelebName').value='';document.getElementById('newCelebDay').value='';loadAdminCelebrations();loadCelebrations();}catch(err){ToastModule.show('Error adding celebration.');}}function init(){loadCelebrations();const btn=document.getElementById('addCelebBtn');if(btn)btn.addEventListener('click',addCelebration);}return{init,loadAdminCelebrations};})();
const DatabaseModule=(function(){
    async function lu(){
        const c=document.getElementById('changelog-container');
        const ac=document.getElementById('adminUpdateContainer');
        if(c)c.innerHTML='<p style="color: var(--bark-soft);">Loading updates...</p>';
        if(ac)ac.innerHTML='<p class="text-sm" style="color: var(--bark-soft);">Loading...</p>';
        try{
            const{data,error}=await supabaseClient.from('updates').select('*').order('created_at',{ascending:false});
            if(error)throw error;
            if(c){
                if(!data||data.length===0){c.innerHTML='<p style="color: var(--bark-soft);">No updates just yet. Check back soon!</p>';}
                else{c.innerHTML=data.map(i=>{const d=new Date(i.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});return`<div class="changelog-item"><div class="font-bold mb-1" style="color: var(--bark)">${i.title||'Update'} <span class="text-xs font-normal" style="color: var(--bark-soft); opacity: 0.7;">- ${d}</span></div><p class="text-sm" style="color: var(--bark-soft)">${i.content||''}</p></div>`}).join('');}
            }
            if(ac){
                if(!data||data.length===0){ac.innerHTML='<p class="text-sm" style="color: var(--bark-soft);">No updates yet.</p>';}
                else{
                    ac.innerHTML=data.map(i=>`<div class="admin-film-item" style="padding: 10px;"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;"><span style="font-size:.9rem;font-weight:700;flex:1;">${i.title}</span><button class="tester-btn del-update-btn" data-id="${i.id}" style="width:auto;margin:0;padding:4px 8px;font-size:0.7rem;background:var(--terracotta);">Delete</button></div></div>`).join('');
                    ac.querySelectorAll('.del-update-btn').forEach(b=>b.addEventListener('click',async e=>{
                        const id=e.target.dataset.id;
                        if(confirm('Delete this update?')){
                            try{await supabaseClient.from('updates').delete().eq('id',id);lu();ToastModule.show('Update deleted!');}catch(err){ToastModule.show('Error deleting update.');}
                        }
                    }));
                }
            }
        }catch(err){
            console.warn('Database unreachable.',err.message);
            if(c)c.innerHTML=`<div class="changelog-item"><div class="font-bold mb-1" style="color: var(--bark)">Offline Mode</div><p class="text-sm" style="color: var(--bark-soft)">Couldn't reach the database.</p></div>`;
        }
    }
    async function addUpdate(title,content){
        try{
            const{error}=await supabaseClient.from('updates').insert([{title:title,content:content}]);
            if(error)throw error;
            ToastModule.show('Update posted successfully!');
            lu();
        }catch(err){ToastModule.show('Error posting update.');}
    }
    function init(){
        lu();
        const addBtn=document.getElementById('addUpdateBtn');
        const titleInp=document.getElementById('newUpdateTitle');
        const contentInp=document.getElementById('newUpdateContent');
        if(addBtn&&titleInp&&contentInp){
            addBtn.addEventListener('click',()=>{
                const t=titleInp.value.trim();
                const c=contentInp.value.trim();
                if(t&&c){
                    addUpdate(t,c);
                    titleInp.value='';
                    contentInp.value='';
                }else{ToastModule.show('Title and content are required.');}
            });
        }
    }
    return{init,loadUpdates:lu}
})();
const FilmNightModule=(function(){
    let films=[];
    async function lf(){
        if(!supabaseClient)return;
        const c=document.getElementById('filmListContainer'), uc=document.getElementById('upcomingFilmsContainer'), ac=document.getElementById('adminFilmContainer');
        if(!c&&!ac)return;
        if(c)c.innerHTML='<p style="color: var(--bark-soft); text-align: center; grid-column: 1/-1;">Loading films...</p>';
        if(uc)uc.innerHTML='<p style="color: var(--bark-soft); text-align: center; grid-column: 1/-1;">Checking the schedule...</p>';
        if(ac)ac.innerHTML='<p class="text-sm" style="color: var(--bark-soft);">Loading films...</p>';
        try{const{data,error}=await supabaseClient.from('Filmnight').select('*').order('created_at',{ascending:true});if(error)throw error;films=data||[];rf();raf();}catch(err){if(c)c.innerHTML='<p style="color: var(--terracotta); text-align: center; grid-column: 1/-1;">Error loading films.</p>';if(uc)uc.innerHTML='<p style="color: var(--terracotta); text-align: center; grid-column: 1/-1;">Error loading films.</p>';if(ac)ac.innerHTML='<p class="text-sm" style="color: var(--terracotta);">Error loading films.</p>';console.error('Film load error:',err);}
    }
    function rf(){const c=document.getElementById('filmListContainer');const uc=document.getElementById('upcomingFilmsContainer');if(!c&&!uc)return;const upcoming=films.filter(f=>!f.watched);const reviewed=films.filter(f=>f.watched);if(uc){if(upcoming.length===0){uc.innerHTML='<p style="color: var(--bark-soft); text-align: center; grid-column: 1/-1;">No films scheduled yet. Check back soon!</p>';}else{uc.innerHTML=upcoming.map(f=>`<div class="card p-6 flex flex-col items-center text-center"><div class="w-12 h-12 rounded-full flex items-center justify-center mb-4" style="background:var(--cream)"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--terracotta)" stroke-width="2"><path d="M5 4l14 8-14 8V4z"/></svg></div><h5 class="display font-extrabold text-lg mb-2" style="color:var(--bark)">${f.title}</h5><p class="text-sm" style="color:var(--bark-soft);">Coming soon to Film Night!</p></div>`).join('');}}if(c){if(reviewed.length===0){c.innerHTML='<p style="color: var(--bark-soft); text-align: center; grid-column: 1/-1;">No reviews just yet. Check back after our next film night!</p>';}else{c.innerHTML=reviewed.map(f=>`<div class="card p-6 flex flex-col"><div class="flex justify-between items-start mb-2"><h5 class="display font-extrabold text-lg" style="color:var(--bark)">${f.title}</h5>${f.is_staff_favourite?`<span class="staff-fav" title="Staff Favourite" style="color: var(--honey); font-size: 1.2rem;">★</span>`:''}</div>${f.review?`<p class="text-sm mb-4" style="color:var(--bark-soft); font-style: italic; border-left: 3px solid var(--teal); padding-left: 10px;">"${f.review}"</p>`:`<p class="text-sm mb-4" style="color:var(--bark-soft);">No review yet.</p>`}</div>`).join('');}}}
    function raf(){const c=document.getElementById('adminFilmContainer');if(!c)return;if(films.length===0){c.innerHTML='<p class="text-sm" style="color: var(--bark-soft);">No films found. Add one above!</p>';return;}c.innerHTML=films.map(f=>`<div class="admin-film-item"><h6><span>${f.title} ${f.watched?'<span style="font-size:0.7rem; color:var(--sage);">(Watched)</span>':'<span style="font-size:0.7rem; color:var(--terracotta);">(Upcoming)</span>'}</span><div class="flex gap-2"><button class="tester-btn" data-fav-id="${f.id}" style="width: auto; margin: 0; padding: 6px 12px; font-size: 0.8rem; background: ${f.is_staff_favourite?'var(--honey)':'var(--cream)'}; color: ${f.is_staff_favourite?'#000':'var(--bark)'}; border: 1px solid ${f.is_staff_favourite?'var(--honey)':'var(--border)'};">${f.is_staff_favourite?'★ Fav':'Mark Fav'}</button><button class="tester-btn" data-action="toggle-watched" data-id="${f.id}" style="width: auto; margin: 0; padding: 6px 12px; font-size: 0.8rem; background: var(--teal); color: #fff;">${f.watched?'✓ Unwatch':'Mark Watched'}</button><button class="tester-btn" data-del-id="${f.id}" style="width: auto; margin: 0; padding: 6px 12px; font-size: 0.8rem; background: var(--terracotta); color: #fff; border: 1px solid var(--terracotta);">Delete</button></div></h6><textarea class="film-review" placeholder="Write a review..." data-action="save-review" data-id="${f.id}">${f.review||''}</textarea></div>`).join('');c.querySelectorAll('[data-fav-id]').forEach(b=>b.addEventListener('click',async e=>{const id=e.target.dataset.favId,f=films.find(x=>x.id==id);if(!f)return;try{await supabaseClient.from('Filmnight').update({is_staff_favourite:!f.is_staff_favourite}).eq('id',id);lf();}catch(err){ToastModule.show('Error updating favourite.');}}));c.querySelectorAll('[data-action="toggle-watched"]').forEach(b=>b.addEventListener('click',async e=>{tw(e.target.dataset.id);}));c.querySelectorAll('[data-del-id]').forEach(b=>b.addEventListener('click',async e=>{const id=e.target.dataset.delId;if(confirm('Are you sure you want to delete this film?'))df(id);}));c.querySelectorAll('[data-action="save-review"]').forEach(t=>t.addEventListener('blur',e=>sr(e.target.dataset.id,e.target.value)));}
    async function tw(id){const f=films.find(x=>x.id==id);if(!f)return;const ns=!f.watched;try{const{error}=await supabaseClient.from('Filmnight').update({watched:ns}).eq('id',id);if(error)throw error;f.watched=ns;rf();raf();}catch(err){ToastModule.show('Error updating status.');}}
    async function sr(id,review){try{const{error}=await supabaseClient.from('Filmnight').update({review:review}).eq('id',id);if(error)throw error;const f=films.find(x=>x.id==id);if(f)f.review=review;rf();ToastModule.show('Review saved!');}catch(err){ToastModule.show('Error saving review.');}}
    async function af(title){try{const{data,error}=await supabaseClient.from('Filmnight').insert([{title:title,watched:false,review:'',is_staff_favourite:false}]).select();if(error)throw error;if(data&&data.length>0){films.push(data[0]);rf();raf();ToastModule.show('Film added!');}}catch(err){console.error('Add film error details:',err);ToastModule.show('Error adding film.');}}
    async function df(id){try{const{error}=await supabaseClient.from('Filmnight').delete().eq('id',id);if(error)throw error;films=films.filter(f=>f.id!=id);rf();raf();ToastModule.show('Film deleted!');}catch(err){console.error('Delete error:',err);ToastModule.show('Error deleting film.');}}
    function init(){const ab=document.getElementById('addFilmBtn'),ti=document.getElementById('newFilmTitle');if(ab&&ti){ab.addEventListener('click',()=>{const t=ti.value.trim();if(t){af(t);ti.value=''}});ti.addEventListener('keypress',e=>{if(e.key==='Enter'){e.preventDefault();ab.click()}});}lf();}
    return{init,loadFilms:lf};
})();

const SummerEffectsModule=(function(){function init(){const c=document.getElementById('summerParticles');if(!c)return;c.innerHTML='';const m=window.innerWidth<768,n=m?12:25;for(let i=0;i<n;i++){const p=document.createElement('div');p.classList.add('particle');const s=Math.random()*4+2;p.style.width=s+'px';p.style.height=s+'px';p.style.left=Math.random()*100+'%';p.style.bottom=(Math.random()*-40)+'px';p.style.animationDuration=(Math.random()*8+10)+'s';p.style.animationDelay=(Math.random()*12)+'s';c.appendChild(p)}}return{init}})();

const EventsModule=(function(){
    async function loadEvents(){
        const c=document.getElementById('eventsContainer');const printBtn=document.getElementById('printScheduleBtn');const printContainer=document.getElementById('printableSchedule');const badge=document.getElementById('eventsFreshnessBadge');
        if(!c||!supabaseClient)return;c.innerHTML='<p style="color:var(--bark-soft);text-align:center;grid-column:1/-1;">Checking for upcoming events...</p>';
        try{let now=new Date().toISOString();const{data,error}=await supabaseClient.from('events').select('*').gte('event_date',now.split('T')[0]).order('event_date',{ascending:true});if(error)throw error;if(!data||data.length===0){c.innerHTML='<p style="color:var(--bark-soft);text-align:center;grid-column:1/-1;">No upcoming events scheduled right now. Please check back soon!</p>';if(printBtn)printBtn.style.display='none';if(badge)badge.style.display='none';return;}if(badge){const latest=data.reduce((a,b)=>new Date(a.updated_at)>new Date(b.updated_at)?a:b);if(latest&&latest.updated_at){badge.innerHTML=`Updated ${timeAgo(latest.updated_at)}`;badge.style.display='inline-flex';}}if(printBtn)printBtn.style.display='inline-flex';const today=new Date();today.setHours(0,0,0,0);c.innerHTML=data.slice(0,3).map(ev=>{const d=new Date(ev.event_date).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});const evDate=new Date(ev.event_date);evDate.setHours(0,0,0,0);const isToday=today.getTime()===evDate.getTime();const todayBadge=isToday?`<div class="tag mb-3" style="background: var(--terracotta); color: #fff; border-color: var(--terracotta); align-self: flex-start;">🔥 Happening Today!</div>`:'';const cardStyle=isToday?`border-color: var(--terracotta);`:'';return `<div class="card p-6 flex flex-col" style="${cardStyle}">${todayBadge}<div class="display font-extrabold text-lg mb-2" style="color:var(--teal)">${ev.title}</div><div class="text-sm font-bold mb-3" style="color:var(--bark-soft)">${d}</div><p class="text-sm" style="color:var(--bark-soft)">${ev.description||''}</p></div>`;}).join('');if(printContainer){printContainer.innerHTML=`<h1 style="font-family: 'Outfit', sans-serif; color: #152630; margin-bottom: 4px;">Tinkers Hatch</h1><h2 style="font-family: 'Outfit', sans-serif; color: #4A5C66; font-size: 1.2rem; margin-top: 0; margin-bottom: 24px;">Full Upcoming Events Schedule</h2><div style="display: flex; flex-direction: column; gap: 16px;">${data.map(ev=>{const d=new Date(ev.event_date).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});return `<div style="border: 1px solid #ccc; border-radius: 8px; padding: 16px; break-inside: avoid;"><div style="font-weight: 800; font-size: 1.1rem; color: #1AA37E; margin-bottom: 4px;">${ev.title}</div><div style="font-weight: 700; font-size: 0.9rem; color: #4A5C66; margin-bottom: 8px;">${d}</div><div style="font-size: 0.95rem; color: #152630;">${ev.description||'No additional details.'}</div></div>`;}).join('')}</div><p style="margin-top: 32px; font-size: 0.8rem; color: #999; text-align: center;">Generated from tinkershatch.co.uk on ${new Date().toLocaleDateString('en-GB')}</p>`;}}catch(e){c.innerHTML='<p style="color:var(--bark-soft);text-align:center;grid-column:1/-1;">Could not load events.</p>';if(printBtn)printBtn.style.display='none';if(badge)badge.style.display='none';}}
    async function loadAdminEvents(){const ac=document.getElementById('adminEventContainer');if(!ac||!supabaseClient)return;ac.innerHTML='<p class="text-sm" style="color: var(--bark-soft);">Loading events...</p>';try{const{data,error}=await supabaseClient.from('events').select('*').order('event_date',{ascending:true});if(error)throw error;if(!data||data.length===0){ac.innerHTML='<p class="text-sm" style="color: var(--bark-soft);">No events found.</p>';return;}ac.innerHTML=data.map(ev=>`<div class="admin-film-item" style="padding: 8px 12px;"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;"><span style="font-size:.8rem;font-weight:700;flex:1;">${ev.title} (${new Date(ev.event_date).toLocaleDateString('en-GB')})</span><button class="tester-btn del-event-btn" data-id="${ev.id}" style="width:auto;margin:0;padding:4px 8px;font-size:0.7rem;background:var(--terracotta);">Delete</button></div></div>`).join('');ac.querySelectorAll('.del-event-btn').forEach(btn=>btn.addEventListener('click',async(e)=>{const id=e.target.dataset.id;try{await supabaseClient.from('events').delete().eq('id',id);ToastModule.show('Event deleted!');loadAdminEvents();loadEvents();}catch(err){ToastModule.show('Error deleting event.');}}));}catch(e){ac.innerHTML='<p class="text-sm" style="color: var(--terracotta);">Error loading events.</p>';}}
    async function addEvent(){const t=document.getElementById('newEventTitle').value.trim();const d=document.getElementById('newEventDate').value;const desc=document.getElementById('newEventDesc').value.trim();if(!t||!d){ToastModule.show('Title and Date are required.');return;}try{const{error}=await supabaseClient.from('events').insert([{title:t,event_date:d,description:desc}]);if(error)throw error;ToastModule.show('Event added!');fetch('https://ntfy.sh/tinkers-hatch-live',{method:'POST',body:`New Event Added: ${t} on ${d}`}).catch(()=>{});document.getElementById('newEventTitle').value='';document.getElementById('newEventDate').value='';document.getElementById('newEventDesc').value='';loadAdminEvents();loadEvents();}catch(err){ToastModule.show('Error adding event.');}}
    function init(){loadEvents();const addBtn=document.getElementById('addEventBtn');if(addBtn)addBtn.addEventListener('click',addEvent);const printBtn=document.getElementById('printScheduleBtn');if(printBtn)printBtn.addEventListener('click',()=>window.print());}
    return{init,loadAdminEvents,loadEvents};
})();

const WilfModule=(function(){async function loadStatus(){const badge=document.getElementById('wilfStatusBadge');if(!badge||!supabaseClient)return;try{const{data,error}=await supabaseClient.from('wilf_status').select('is_visiting').eq('id',1).single();if(error)throw error;if(data&&data.is_visiting){badge.style.display='inline-flex';badge.style.background='var(--sage)';badge.style.color='#fff';badge.innerHTML='🐕 Wilf is visiting today!';}else{badge.style.display='inline-flex';badge.style.background='var(--cream-deep)';badge.style.color='var(--bark-soft)';badge.innerHTML='🐕 Wilf is currently off-site.';}}catch(e){}}async function toggleStatus(){if(!supabaseClient)return;try{const{data,error}=await supabaseClient.from('wilf_status').select('is_visiting').eq('id',1).single();if(error)throw error;const newStatus=!data.is_visiting;const{error:updateError}=await supabaseClient.from('wilf_status').update({is_visiting:newStatus}).eq('id',1);if(updateError)throw updateError;ToastModule.show(`Wilf status updated to: ${newStatus?'Visiting':'Off-site'}`);loadStatus();}catch(err){ToastModule.show('Error updating Wilf status.');}}function init(){loadStatus();const toggleBtn=document.getElementById('wilfToggleBtn');if(toggleBtn)toggleBtn.addEventListener('click',toggleStatus);}return{init,loadStatus};})();
const MenuModule=(function(){
    async function loadMenu(){const c=document.getElementById('menuContainer');const badge=document.getElementById('menuFreshnessBadge');if(!c||!supabaseClient) return;try{const{data,error}=await supabaseClient.from('weekly_menu').select('*').order('id',{ascending:true});if(error) throw error;if(!data||data.length===0){ c.innerHTML='<p style="color:var(--bark-soft);text-align:center;grid-column:1/-1;">Menu is being updated. Please check back soon!</p>'; return; }if(badge){const latest=data.reduce((a,b)=>new Date(a.updated_at)>new Date(b.updated_at)?a:b);if(latest&&latest.updated_at){ badge.innerHTML=`Updated ${timeAgo(latest.updated_at)}`; badge.style.display='inline-flex'; }}c.innerHTML=data.map(day=>{const meal=day.meal_text&&day.meal_text.trim()!==''?day.meal_text:'To be announced';const isPlaceholder=!day.meal_text||day.meal_text.trim()==='';return `<div class="card p-6 flex flex-col"><div class="display font-extrabold text-lg mb-2" style="color:var(--terracotta)">${day.day_name}</div><p class="text-sm" style="color:var(--bark-soft); ${isPlaceholder?'font-style: italic; opacity: 0.7;':''}">${meal}</p></div>`;}).join('');}catch(e){ c.innerHTML='<p style="color:var(--bark-soft);text-align:center;grid-column:1/-1;">Could not load the menu.</p>'; }}
    async function loadAdminMenu(){const ac=document.getElementById('adminMenuContainer');if(!ac||!supabaseClient) return;ac.innerHTML='<p class="text-sm" style="color: var(--bark-soft);">Loading menu...</p>';try{const{data,error}=await supabaseClient.from('weekly_menu').select('*').order('id',{ascending:true});if(error) throw error;if(!data||data.length===0){ ac.innerHTML='<p class="text-sm" style="color: var(--bark-soft);">No menu days found.</p>'; return; }ac.innerHTML=data.map(day=>`<div class="admin-film-item" style="padding: 8px 12px;"><label style="font-size:.8rem; font-weight:700; color:var(--bark); display:block; margin-bottom:4px;">${day.day_name}</label><input type="text" class="tester-input menu-input" data-id="${day.id}" value="${day.meal_text||''}" placeholder="e.g., Roast chicken with seasonal veg" style="margin-top:0; padding:8px; font-size:.9rem;"></div>`).join('');}catch(e){ ac.innerHTML='<p class="text-sm" style="color: var(--terracotta);">Error loading menu.</p>'; }}
    async function saveMenu(){const inputs=document.querySelectorAll('.menu-input');if(inputs.length===0) return;ToastModule.show("Saving menu...");try{for(let i=0;i<inputs.length;i++){const id=inputs[i].dataset.id;const val=inputs[i].value.trim();const{error}=await supabaseClient.from('weekly_menu').update({meal_text:val}).eq('id',id);if(error) throw error;}ToastModule.show("Weekly menu saved successfully!");loadAdminMenu();loadMenu();}catch(err){ ToastModule.show("Error saving menu."); }}
    function init(){loadMenu();const saveBtn=document.getElementById('saveMenuBtn');if(saveBtn) saveBtn.addEventListener('click',saveMenu);}
    return{init,loadAdminMenu};
})();

const CommunityModule=(function(){
    async function loadCommunity(){const c=document.getElementById('communityContainer');if(!c||!supabaseClient) return;c.innerHTML='<p style="color:var(--bark-soft);text-align:center;grid-column:1/-1;">Loading community moments...</p>';try{const{data,error}=await supabaseClient.from('community_spotlight').select('*').order('created_at',{ascending:false}).limit(6);if(error) throw error;if(!data||data.length===0){ c.innerHTML='<p style="color:var(--bark-soft);text-align:center;grid-column:1/-1;">No community updates just yet. Check back soon!</p>'; return; }c.innerHTML=data.map(post=>{const d=new Date(post.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});const imgHtml=post.image_url?`<div style="height: 200px; background-image: url('${post.image_url}'); background-size: cover; background-position: center; border-radius: 8px; margin-bottom: 12px;"></div>`:'';return `<div class="card p-6 flex flex-col">${imgHtml}<div class="display font-extrabold text-lg mb-1" style="color:var(--teal)">${post.title}</div><div class="text-xs font-bold mb-3" style="color:var(--bark-soft)">${d}</div><p class="text-sm" style="color:var(--bark-soft); line-height: 1.6;">${post.description}</p></div>`;}).join('');}catch(e){ c.innerHTML='<p style="color:var(--bark-soft);text-align:center;grid-column:1/-1;">Could not load community updates.</p>'; }}
    async function loadAdminCommunity(){const ac=document.getElementById('adminCommunityContainer');if(!ac||!supabaseClient) return;ac.innerHTML='<p class="text-sm" style="color: var(--bark-soft);">Loading...</p>';try{const{data,error}=await supabaseClient.from('community_spotlight').select('*').order('created_at',{ascending:false});if(error) throw error;if(!data||data.length===0){ ac.innerHTML='<p class="text-sm" style="color: var(--bark-soft);">No posts found.</p>'; return; }ac.innerHTML=data.map(post=>`<div class="admin-film-item" style="padding: 8px 12px;"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;"><span style="font-size:.8rem;font-weight:700;flex:1;">${post.title}</span><button class="tester-btn del-community-btn" data-id="${post.id}" style="width:auto;margin:0;padding:4px 8px;font-size:0.7rem;background:var(--terracotta);">Delete</button></div></div>`).join('');ac.querySelectorAll('.del-community-btn').forEach(btn=>btn.addEventListener('click',async(e)=>{const id=e.target.dataset.id;try{ await supabaseClient.from('community_spotlight').delete().eq('id',id); ToastModule.show('Spotlight deleted!'); loadAdminCommunity(); loadCommunity(); }catch(err){ ToastModule.show('Error deleting post.'); }}));}catch(e){ ac.innerHTML='<p class="text-sm" style="color: var(--terracotta);">Error loading posts.</p>'; }}
    async function addCommunity(){const t=document.getElementById('newCommunityTitle').value.trim();const d=document.getElementById('newCommunityDesc').value.trim();const img=document.getElementById('newCommunityImg').value.trim();if(!t||!d){ ToastModule.show('Title and Description are required.'); return; }try{const{error}=await supabaseClient.from('community_spotlight').insert([{title:t,description:d,image_url:img}]);if(error) throw error;ToastModule.show('Community spotlight posted!');document.getElementById('newCommunityTitle').value=''; document.getElementById('newCommunityDesc').value=''; document.getElementById('newCommunityImg').value='';loadAdminCommunity(); loadCommunity();}catch(err){ ToastModule.show('Error adding post.'); }}
    function init(){loadCommunity();const addBtn=document.getElementById('addCommunityBtn');if(addBtn) addBtn.addEventListener('click',addCommunity);}
    return{init,loadAdminCommunity};
})();

const EnquiriesModule=(function(){
    async function submitEnquiry(name,email,message){try{const{error}=await supabaseClient.from('enquiries').insert([{name:name,email:email,message:message}]);if(error) throw error;ToastModule.show("Enquiry sent successfully! We'll be in touch soon.");return true;}catch(err){ ToastModule.show("Error sending enquiry. Please try calling us instead."); return false; }}
    async function loadAdminEnquiries(){const ac=document.getElementById('adminEnquiriesContainer');if(!ac||!supabaseClient) return;ac.innerHTML='<p class="text-sm" style="color: var(--bark-soft);">Loading enquiries...</p>';try{const{data,error}=await supabaseClient.from('enquiries').select('*').order('created_at',{ascending:false});if(error) throw error;if(!data||data.length===0){ ac.innerHTML='<p class="text-sm" style="color: var(--bark-soft);">No new enquiries.</p>'; return; }ac.innerHTML=data.map(enq=>{const d=new Date(enq.created_at).toLocaleString('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});return `<div class="admin-film-item" style="padding: 12px;"><div style="display:flex; justify-content:space-between; align-items:start; gap:8px; margin-bottom:6px;"><div><span style="font-weight:700; font-size:.9rem;">${enq.name}</span><span style="font-size:.75rem; color:var(--bark-soft); margin-left:8px;">${d}</span></div><button class="tester-btn del-enq-btn" data-id="${enq.id}" style="width:auto; margin:0; padding:4px 8px; font-size:0.7rem; background:var(--terracotta);">Delete</button></div><a href="mailto:${enq.email}" style="font-size:.85rem; color:var(--teal); font-weight:600; display:block; margin-bottom:6px;">${enq.email}</a><p style="font-size:.85rem; color:var(--bark-soft); line-height:1.4;">${enq.message}</p></div>`;}).join('');ac.querySelectorAll('.del-enq-btn').forEach(btn=>btn.addEventListener('click',async(e)=>{const id=e.target.dataset.id;try{ await supabaseClient.from('enquiries').delete().eq('id',id); ToastModule.show('Enquiry deleted!'); loadAdminEnquiries(); }catch(err){ ToastModule.show('Error deleting enquiry.'); }}));}catch(e){ ac.innerHTML='<p class="text-sm" style="color: var(--terracotta);">Error loading enquiries.</p>'; }}
    function init(){const form=document.getElementById('contactForm');if(form){form.addEventListener('submit',async(e)=>{e.preventDefault();const name=document.getElementById('contactName').value.trim();const email=document.getElementById('contactEmail').value.trim();const message=document.getElementById('contactMessage').value.trim();if(name&&email&&message){const success=await submitEnquiry(name,email,message);if(success){ form.reset(); }}});}}
    return{init,loadAdminEnquiries};
})();

const BriefingModule=(function(){
    async function loadBriefing(){const bar=document.getElementById('briefing-bar');const textEl=document.getElementById('briefing-text');const input=document.getElementById('briefingInput');if(!bar||!supabaseClient) return;try{const{data,error}=await supabaseClient.from('daily_briefing').select('message').eq('id',1).single();if(error) throw error;if(data&&data.message&&data.message.trim()!==''){ textEl.textContent=data.message; bar.style.display='block'; if(input) input.value=data.message; } else { bar.style.display='none'; }}catch(e){ bar.style.display='none'; }}
    async function saveBriefing(){const input=document.getElementById('briefingInput');if(!input||!supabaseClient) return;const msg=input.value.trim();try{const{error}=await supabaseClient.from('daily_briefing').update({message:msg}).eq('id',1);if(error) throw error;ToastModule.show("Briefing updated!");loadBriefing();}catch(err){ ToastModule.show("Error saving briefing."); }}
    function init(){loadBriefing();const btn=document.getElementById('saveBriefingBtn');if(btn) btn.addEventListener('click',saveBriefing);}
    return{init,loadBriefing};
})();

const MaintenanceModule=(function(){
    async function checkStatus(){const banner=document.getElementById('maintenance-banner');if(!banner||!supabaseClient) return;try{const{data,error}=await supabaseClient.from('site_settings').select('maintenance_mode').eq('id',1).single();if(error) throw error;if(data&&data.maintenance_mode){ banner.style.display='block'; } else { banner.style.display='none'; }}catch(e){}}
    async function toggle(){try{const{data,error}=await supabaseClient.from('site_settings').select('maintenance_mode').eq('id',1).single();if(error) throw error;const newStatus=!data.maintenance_mode;const{error:updateError}=await supabaseClient.from('site_settings').update({maintenance_mode:newStatus}).eq('id',1);if(updateError) throw updateError;ToastModule.show(`Maintenance Mode is now ${newStatus?'ON':'OFF'}`);checkStatus();}catch(err){ ToastModule.show('Error toggling maintenance mode.'); }}
    function init(){checkStatus();const btn=document.getElementById('toggleMaintenanceBtn');if(btn) btn.addEventListener('click',toggle);}
    return{init};
})();

const FeaturedEventsModule = (function() {
    let editingId = null;
    async function loadFeatured() {const c = document.getElementById('featuredEventsContainer');if (!c || !supabaseClient) return;c.innerHTML = '<p style="color:var(--bark-soft);text-align:center;">Loading featured events...</p>';try {const { data, error } = await supabaseClient.from('featured_events').select('*').eq('is_active', true).order('id', { ascending: true });if (error) throw error;if (!data || data.length === 0) {c.innerHTML = '<p style="color:var(--bark-soft);text-align:center;">No featured events right now. Check back soon!</p>';return;}c.innerHTML = data.map(ev => {const bgStyle = ev.color && ev.color.startsWith('#') ? `linear-gradient(135deg, var(--honey), ${ev.color})` : (ev.color || 'linear-gradient(135deg, #A87816, #C25528)');return `<div class="featured-banner" style="background: ${bgStyle};"><div class="icon-row">${ev.icon || '🎉'}</div><span class="tag mb-4 inline-flex">Save the Date</span><h2>${ev.title}</h2>${ev.date_text ? `<p class="date">${ev.date_text}</p>` : ''}<p>${ev.description || ''}</p></div>`;}).join('');} catch (e) { c.innerHTML = '<p style="color:var(--bark-soft);text-align:center;">Could not load featured events.</p>'; }}
    async function loadAdminFeatured() {const ac = document.getElementById('adminFeaturedContainer');if (!ac || !supabaseClient) return;ac.innerHTML = '<p class="text-sm" style="color: var(--bark-soft);">Loading...</p>';try {const { data, error } = await supabaseClient.from('featured_events').select('*').order('id', { ascending: false });if (error) throw error;if (!data || data.length === 0) { ac.innerHTML = '<p class="text-sm" style="color: var(--bark-soft);">No featured events found.</p>'; return; }ac.innerHTML = data.map(ev => `<div class="admin-film-item" style="padding: 8px 12px;"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;"><span style="font-size:.8rem;font-weight:700;flex:1;">${ev.icon} ${ev.title} ${ev.is_active ? '' : '(Hidden)'}</span><div class="flex gap-2"><button class="tester-btn edit-featured-btn" data-id="${ev.id}" style="width:auto;margin:0;padding:4px 8px;font-size:0.7rem;background:var(--honey);color:#000;">Edit</button><button class="tester-btn toggle-featured-btn" data-id="${ev.id}" data-active="${ev.is_active}" style="width:auto;margin:0;padding:4px 8px;font-size:0.7rem;background:${ev.is_active ? 'var(--sage)' : 'var(--bark-soft)'};">${ev.is_active ? 'Hide' : 'Show'}</button><button class="tester-btn del-featured-btn" data-id="${ev.id}" style="width:auto;margin:0;padding:4px 8px;font-size:0.7rem;background:var(--terracotta);">Delete</button></div></div></div>`).join('');ac.querySelectorAll('.edit-featured-btn').forEach(btn => btn.addEventListener('click', async (e) => {const id = e.target.dataset.id;try {const { data: ev, error } = await supabaseClient.from('featured_events').select('*').eq('id', id).single();if (error) throw error;document.getElementById('newFeaturedTitle').value = ev.title;document.getElementById('newFeaturedDate').value = ev.date_text || '';document.getElementById('newFeaturedDesc').value = ev.description || '';const iconSelect = document.getElementById('newFeaturedIcon');Array.from(iconSelect.querySelectorAll('option[data-temp="true"]')).forEach(opt => opt.remove());let iconExists = Array.from(iconSelect.options).some(opt => opt.value === ev.icon);if (iconExists) { iconSelect.value = ev.icon; } else if (ev.icon) {let opt = document.createElement('option');opt.value = ev.icon; opt.textContent = ev.icon + " (Current)"; opt.setAttribute('data-temp', 'true');iconSelect.prepend(opt); iconSelect.value = ev.icon;} else { iconSelect.value = '🎉'; }const colorSelect = document.getElementById('newFeaturedColor');if (ev.color && ev.color.startsWith('#')) { colorSelect.value = "linear-gradient(135deg, #A87816, #C25528)"; } else { colorSelect.value = ev.color || "linear-gradient(135deg, #A87816, #C25528)"; }editingId = id;document.getElementById('addFeaturedBtn').textContent = 'Update Event';document.getElementById('cancelEditFeaturedBtn').style.display = 'inline-block';document.getElementById('newFeaturedTitle').scrollIntoView({ behavior: 'smooth', block: 'center' });} catch (err) { ToastModule.show('Error fetching event details.'); }}));ac.querySelectorAll('.toggle-featured-btn').forEach(btn => btn.addEventListener('click', async (e) => {const id = e.target.dataset.id;const newActive = e.target.dataset.active !== 'true';try { await supabaseClient.from('featured_events').update({ is_active: newActive }).eq('id', id); ToastModule.show('Event updated!'); loadAdminFeatured(); loadFeatured(); } catch (err) { ToastModule.show('Error updating event.'); }}));ac.querySelectorAll('.del-featured-btn').forEach(btn => btn.addEventListener('click', async (e) => {const id = e.target.dataset.id;try { await supabaseClient.from('featured_events').delete().eq('id', id); ToastModule.show('Event deleted!'); if (editingId === id) cancelEdit(); loadAdminFeatured(); loadFeatured(); } catch (err) { ToastModule.show('Error deleting event.'); }}));} catch (e) { ac.innerHTML = '<p class="text-sm" style="color: var(--terracotta);">Error loading events.</p>'; }}
    function cancelEdit() {editingId = null;document.getElementById('newFeaturedTitle').value = '';document.getElementById('newFeaturedDate').value = '';document.getElementById('newFeaturedDesc').value = '';const iconSelect = document.getElementById('newFeaturedIcon');Array.from(iconSelect.querySelectorAll('option[data-temp="true"]')).forEach(opt => opt.remove());iconSelect.value = '🎉';document.getElementById('newFeaturedColor').value = 'linear-gradient(135deg, #A87816, #C25528)';document.getElementById('addFeaturedBtn').textContent = 'Add Featured Event';document.getElementById('cancelEditFeaturedBtn').style.display = 'none';}
    async function addFeatured() {const title = document.getElementById('newFeaturedTitle').value.trim();const date = document.getElementById('newFeaturedDate').value.trim();const desc = document.getElementById('newFeaturedDesc').value.trim();const icon = document.getElementById('newFeaturedIcon').value;const color = document.getElementById('newFeaturedColor').value;if (!title) { ToastModule.show('Title is required.'); return; }try {if (editingId) {const { error } = await supabaseClient.from('featured_events').update({ title: title, date_text: date, description: desc, icon: icon, color: color }).eq('id', editingId);if (error) throw error;ToastModule.show('Featured event updated!');} else {const { error } = await supabaseClient.from('featured_events').insert([{ title: title, date_text: date, description: desc, icon: icon, color: color }]);if (error) throw error;ToastModule.show('Featured event added!');}cancelEdit(); loadAdminFeatured(); loadFeatured();} catch (err) { ToastModule.show('Error saving event.'); }}
    async function printPosters() {if (!supabaseClient) return;ToastModule.show("Preparing A4 posters...");try {const { data, error } = await supabaseClient.from('featured_events').select('*').eq('is_active', true).order('id', { ascending: true });if (error) throw error;if (!data || data.length === 0) { ToastModule.show("No active events to print."); return; }const printArea = document.getElementById('featuredPrintArea');printArea.innerHTML = data.map(ev => {let headerColor = '#C25528';if (ev.color) {const match = ev.color.match(/#[A-F0-9]{6}/ig);if (match && match.length > 1) headerColor = match[1];else if (match && match.length > 0) headerColor = match[0];}return `<div class="fp-poster"><div class="fp-brand">Tinkers Hatch</div><div class="fp-header" style="color: ${headerColor};">${ev.icon || '🎉'}</div><div class="fp-title">${ev.title}</div>${ev.date_text ? `<div class="fp-date">${ev.date_text}</div>` : ''}<div class="fp-desc">${ev.description || ''}</div><div class="fp-footer">01435 863119 | services@tinkershatch.co.uk | New Pond Hill, TN21 0LX</div></div>`;}).join('');const modal = document.getElementById('testerModal');if (modal) modal.classList.remove('active');setTimeout(() => { window.print(); printArea.innerHTML = ''; }, 300);} catch (err) { ToastModule.show("Error generating posters."); console.error(err); }}
    function init() {loadFeatured();const btn = document.getElementById('addFeaturedBtn');if (btn) btn.addEventListener('click', addFeatured);const cancelBtn = document.getElementById('cancelEditFeaturedBtn');if (cancelBtn) cancelBtn.addEventListener('click', cancelEdit);const printBtn = document.getElementById('printFeaturedPostersBtn');if (printBtn) printBtn.addEventListener('click', printPosters);}
    return { init, loadAdminFeatured };
})();

const VibeModule=(function(){async function loadVibe(){ if(!supabaseClient) return; try { const{data,error}=await supabaseClient.from('site_settings').select('current_vibe').eq('id',1).single(); if(error) throw error; applyVibe(data?.current_vibe||'neutral'); } catch(e){ applyVibe('neutral'); } }function applyVibe(vibe){ const b=document.body; b.classList.remove('vibe-active','vibe-calm','vibe-neutral'); b.classList.add('vibe-'+vibe); document.querySelectorAll('.vibe-btn').forEach(btn=>{ btn.classList.toggle('active',btn.dataset.vibe===vibe); }); }async function setVibe(vibe){ if(!supabaseClient) return; try { const{error}=await supabaseClient.from('site_settings').update({current_vibe:vibe}).eq('id',1); if(error) throw error; applyVibe(vibe); ToastModule.show(`Vibe set to: ${vibe.charAt(0).toUpperCase()+vibe.slice(1)}`); } catch(err){ ToastModule.show('Error updating the vibe.'); } }function init(){ loadVibe(); document.querySelectorAll('.vibe-btn').forEach(btn=>{ btn.addEventListener('click',()=>setVibe(btn.dataset.vibe)); }); }return{init};})();
const GoldenHourModule=(function(){ function init(){ const now=new Date(); const hour=now.getHours(); if((hour>=6&&hour<8)||(hour>=18&&hour<20)){ document.body.classList.add('golden-hour'); } } return{init}; })();
const HapticModule=(function(){ function init(){ document.body.addEventListener('click',e=>{ if(navigator.vibrate&&e.target.closest('button, .mood-btn, .ambient-btn, .gallery-thumb, .splash-shortcut')){ navigator.vibrate(8); } }, {passive:true}); } return{init}; })();
const BionicModule=(function(){ function toggle(state){ const b=document.body; if(state==='on')b.classList.add('bionic-mode'); else b.classList.remove('bionic-mode'); safeSet('th-bionic',state); document.querySelectorAll('.bionic-btn').forEach(btn=>{ btn.setAttribute('aria-pressed',btn.dataset.bionic===state); }); if(state==='on'){ applyBionic(); } else { removeBionic(); } } function applyBionic(){ const elements=document.querySelectorAll('#main p, #main h1, #main h2, #main h3, #main li, #main summary'); elements.forEach(el=>{ if(el.dataset.bioniced) return; let html=el.innerHTML; if(html.includes('<')) return; const words=html.split(/(\s+)/); let newHtml=''; words.forEach(word=>{ if(word.trim().length>1){ const half=Math.ceil(word.length/2); newHtml+=`<b>${word.substring(0,half)}</b>${word.substring(half)}`; } else { newHtml+=word; } }); el.innerHTML=newHtml; el.dataset.bioniced='true'; }); } function removeBionic(){ const elements=document.querySelectorAll('[data-bioniced="true"]'); elements.forEach(el=>{ el.querySelectorAll('b').forEach(b=>{ const text=document.createTextNode(b.textContent); b.parentNode.replaceChild(text,b); }); el.normalize(); delete el.dataset.bioniced; }); } function init(){ const btns=document.querySelectorAll('.bionic-btn'); if(!btns.length) return; let s=safeGet('th-bionic')||'off'; if(s==='on'){ setTimeout(()=>toggle('on'),1000); } btns.forEach(btn=>btn.addEventListener('click',()=>toggle(btn.dataset.bionic))); } return{init}; })();
const NextSectionModule=(function(){ let sections=[]; function init(){ const btn=document.getElementById('nextSectionBtn'); if(!btn) return; const navDots=document.querySelectorAll('.side-dot'); sections=Array.from(navDots).map(dot=>{ const id=dot.getAttribute('href').replace('#',''); return document.getElementById(id); }).filter(Boolean); let ticking=false; function update(){ const scrollPos=window.scrollY+(window.innerHeight*0.5); let nextIndex=-1; for(let i=0;i<sections.length;i++){ if(sections[i].offsetTop<=scrollPos){ if(i<sections.length-1&&sections[i+1].offsetTop>scrollPos){ nextIndex=i+1; break; } } } if(nextIndex!==-1){ const nextSection=sections[nextIndex]; const title=nextSection.querySelector('h2')?.innerText||nextSection.id.replace(/-/g,' '); btn.innerHTML=`<span>Next: ${title}</span> <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 5v14M5 12l7 7 7-7"/></svg>`; btn.classList.add('show'); btn.onclick=()=>nextSection.scrollIntoView({behavior:'smooth'}); } else { btn.classList.remove('show'); } ticking=false; } window.addEventListener('scroll',()=>{ if(!ticking){ window.requestAnimationFrame(update); ticking=true; } },{passive:true}); } return{init}; })();

const StaffModule=(function(){
    async function createAccount(){
        const email=document.getElementById('newStaffEmail').value.trim(); const pass=document.getElementById('newStaffPass').value; const role=document.getElementById('newStaffRole').value;
        if(!email||!pass){ ToastModule.show('Email and password are required.'); return; }
        if(pass.length<6){ ToastModule.show('Password must be at least 6 characters.'); return; }
        ToastModule.show('Creating account...');
        try {const { error } = await supabaseClient.auth.signUp({ email: email, password: pass, options: { data: { role: role } }});if (error) throw error;ToastModule.show('Account created successfully!');document.getElementById('newStaffEmail').value = '';document.getElementById('newStaffPass').value = '';document.getElementById('newStaffRole').value = 'staff';} catch (err) { ToastModule.show('Error: ' + err.message); }
    }
    function init(){const btn=document.getElementById('createStaffBtn');if(btn) btn.addEventListener('click', createAccount);}
    return { init };
})();

const AuthModule=(function(){
    function init(){
        if(!supabaseClient) return;
        supabaseClient.auth.onAuthStateChange((event, session) => {
            if(event === 'SIGNED_IN' && session?.user){
                const userGreeting = document.getElementById('userGreeting'); const userName = document.getElementById('userName');
                if(userGreeting && userName){userGreeting.style.display = 'flex';const displayName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User';userName.textContent = `Hello, ${displayName}`;}
            } else if(event === 'SIGNED_OUT'){const userGreeting = document.getElementById('userGreeting');if(userGreeting){userGreeting.style.display = 'none';}}
        });
    }
    return { init };
})();

const TesterModule=(function(){
    const m=document.getElementById('testerModal'),
          la=document.getElementById('testerLogin'),
          ma=document.getElementById('testerMenu'),
          emailInput=document.getElementById('testerEmail'),
          pi=document.getElementById('testerPass'),
          et=document.getElementById('testerError'),
          gearBtn=document.getElementById('testerOpenBtn'),
          footerLogin=document.getElementById('footerStaffLogin'),
          loginBtn=document.getElementById('testerLoginBtn');
    
    let isMenuLoaded = false; 

    function o(){
        m.classList.add('active');
        et.textContent='';
        checkAuthState();
    }
    function c(){
        m.classList.remove('active');
    }
    
    async function login(){
        const sb = window.supabaseClient; // Bulletproof scope reference
        if (!sb) {
            et.textContent = 'Error: Database connection not loaded.';
            return;
        }
        
        const email=emailInput.value.trim();
        const pass=pi.value;
        if(!email||!pass){
            et.textContent='Please enter both email and password.';
            return;
        }
        loginBtn.textContent='Verifying...';
        loginBtn.disabled=true;
        et.textContent='';
        try{
            const{data,error}=await sb.auth.signInWithPassword({email:email,password:pass});
            if(error) throw error;
            // The onAuthStateChange listener will call showMenu() automatically
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
            if(gearBtn) gearBtn.classList.add('show');
            if(footerLogin) footerLogin.style.display='none';
            loginBtn.textContent='Log In';
            loginBtn.disabled=false;
            
            // CRITICAL FIX: Force sync the lexical supabaseClient with the authenticated window.supabaseClient
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
                }else{
                    menuTabBtn.style.display='none';
                }
            }
            
            const adminThemes=document.getElementById('adminOnlyThemes');
            if(adminThemes) adminThemes.style.display=(userRole==='admin')?'block':'none';
            const maintBtn=document.getElementById('toggleMaintenanceBtn');
            if(maintBtn) maintBtn.style.display=(userRole==='admin')?'block':'none';
            
            const staffTabBtn=document.getElementById('staffTabBtn');
            if(staffTabBtn) staffTabBtn.style.display=(userRole==='admin')?'flex':'none';
            
            const userId = user ? user.id : 'default';
            const staffThemeKey = `th-staff-theme-${userId}`;
            const savedTheme = safeGet(staffThemeKey) || 'staff-dark';
            
            if (typeof window.applyHavenTheme === 'function') {
                window.applyHavenTheme(savedTheme);
            } else {
                document.body.classList.remove('staff-dark', 'staff-light', 'staff-warm', 'staff-ocean', 'staff-forest', 'staff-sunset'); 
                document.body.classList.add(savedTheme);
            }
            
            document.querySelectorAll('.staff-theme-btn').forEach(btn => {
                if(btn.dataset.theme === savedTheme) btn.classList.add('theme-btn-active');
                else btn.classList.remove('theme-btn-active');
                btn.onclick = () => { 
                    const newTheme = btn.dataset.theme; 
                    if (typeof window.applyHavenTheme === 'function') {
                        window.applyHavenTheme(newTheme);
                    } else {
                        document.body.classList.remove('staff-dark', 'staff-light', 'staff-warm', 'staff-ocean', 'staff-forest', 'staff-sunset'); 
                        document.body.classList.add(newTheme);
                    }
                    safeSet(staffThemeKey, newTheme); 
                    if(typeof ToastModule!=='undefined') ToastModule.show('Dashboard theme saved!'); 
                    document.querySelectorAll('.staff-theme-btn').forEach(b => b.classList.remove('theme-btn-active')); 
                    btn.classList.add('theme-btn-active'); 
                };
            });

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
            
        } catch(e) {
            console.error("Dashboard Load Error:", e);
            isMenuLoaded = false;
            loginBtn.textContent='Log In';
            loginBtn.disabled=false;
            et.textContent='Error loading dashboard: ' + e.message;
        }
    }
    
    function showLogin(){
        isMenuLoaded = false;
        la.style.display='flex'; 
        ma.style.display='none';
        if(gearBtn) gearBtn.classList.remove('show');
        if(footerLogin) footerLogin.style.display='block';
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
        } catch(e) {
            showLogin();
        }
    }
    
    function ss(s, e){
        const b=document.body;
        b.classList.remove('season-winter','season-spring','season-summer','season-autumn','theme-dark','theme-warm','theme-soft','theme-high-contrast','palette-ocean','palette-sunset','palette-berry');
        safeSet('th-theme','light');
        safeSet('th-palette','nature');
        if(s==='auto'){
            const cs=SeasonalModule.getCurrentSeason();
            b.classList.add('season-'+cs);
            generateSeasonalBackground(cs);
        }else{
            b.classList.add('season-'+s);
            generateSeasonalBackground(s);
        }
        document.querySelectorAll('.tester-season-btn').forEach(btn=>btn.classList.remove('active'));
        if(e && e.target) e.target.classList.add('active');
        document.querySelectorAll('.theme-btn').forEach(btn=>btn.setAttribute('aria-pressed',btn.dataset.theme==='light'));
    }
    
    function bc(){
        const inp=document.getElementById('broadcastInput'),msg=inp.value.trim();
        if(!msg) return;
        fetch('https://ntfy.sh/tinkers-hatch-live',{method:'POST',body:msg})
            .then(()=>{inp.value='';ToastModule.show('Message broadcasted successfully!');})
            .catch(err=>ToastModule.show('Error broadcasting message.'));
    }
    
    async function uploadPhoto(){
        const sb = window.supabaseClient;
        const fileInput=document.getElementById('photoUploadInput');
        const file=fileInput.files[0];
        if(!file){ToastModule.show("Please select a file first.");return;}
        if(!file.type.startsWith('image/')){ToastModule.show("Please upload an image file.");return;}
        ToastModule.show("Uploading...");
        const captionInput=document.getElementById('photoCaptionInput');
        let caption=captionInput?captionInput.value.trim():'';
        if(caption){caption='_caption_'+caption.replace(/[^a-zA-Z0-9 ]/g,'').replace(/\s+/g,'-');}
        const fileName=`photo_${Date.now()}${caption}_${file.name.replace(/\s+/g,'_')}`;
        const{data,error}=await sb.storage.from('gallery').upload(fileName,file);
        if(error){
            ToastModule.show("Upload failed: "+error.message);
        }else{
            ToastModule.show("Photo uploaded successfully!");
            fetch('https://ntfy.sh/tinkers-hatch-live',{method:'POST',body:'New photos added to the gallery!'}).catch(()=>{});
            fileInput.value='';
            if(captionInput) captionInput.value='';
            if(typeof LightboxModule!=='undefined') LightboxModule.loadImages();
            renderPhotoAdmin();
        }
    }
    
    async function renderPhotoAdmin(){
        const sb = window.supabaseClient;
        const ac=document.getElementById('adminPhotoContainer');
        if(!ac) return;
        ac.innerHTML='<p class="text-sm" style="color: var(--bark-soft);">Loading photos...</p>';
        try{
            const{data,error}=await sb.storage.from('gallery').list('',{limit:100,offset:0,sortBy:{column:'created_at',order:'desc'}});
            if(error) throw error;
            if(!data||data.length===0){ac.innerHTML='<p class="text-sm" style="color: var(--bark-soft);">No photos found.</p>';return;}
            const files=data.filter(file=>!file.name.startsWith('.'));
            if(files.length===0){ac.innerHTML='<p class="text-sm" style="color: var(--bark-soft);">No photos found.</p>';return;}
            
            ac.innerHTML=files.map(file => {
                const { data: urlData } = sb.storage.from('gallery').getPublicUrl(file.name);
                const imgUrl = urlData.publicUrl;
                return `<div class="admin-film-item" style="padding: 8px 12px; display: flex; align-items: center; gap: 12px;">
                            <img src="${imgUrl}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px; flex-shrink: 0;">
                            <span style="font-size:.8rem;font-weight:700;word-break:break-all; flex: 1;">${file.name}</span>
                            <button class="tester-btn del-photo-btn" data-path="${file.name}" style="width:auto;margin:0;padding:4px 8px;font-size:0.7rem;background:var(--terracotta);">Delete</button>
                        </div>`;
            }).join('');
            
            ac.querySelectorAll('.del-photo-btn').forEach(btn=>btn.addEventListener('click',async(e)=>{
                const path=e.target.dataset.path;
                if(confirm('Are you sure you want to delete this photo?')){
                    try{
                        const{error:delError}=await sb.storage.from('gallery').remove([path]);
                        if(delError) throw delError;
                        ToastModule.show('Photo deleted!');
                        renderPhotoAdmin();
                        if(typeof LightboxModule!=='undefined') LightboxModule.loadImages();
                    }catch(err){
                        ToastModule.show('Error deleting photo.');
                    }
                }
            }));
        }catch(err){
            ac.innerHTML='<p class="text-sm" style="color: var(--terracotta);">Error loading photos.</p>';
        }
    }
    
    function init(){
        const modalExists = document.getElementById('testerModal');
        if(!modalExists) return; 

        if(gearBtn) gearBtn.addEventListener('click',o);
        if(footerLogin) footerLogin.addEventListener('click',o);
        
        const closeBtn = document.getElementById('testerCloseBtn');
        if(closeBtn) closeBtn.addEventListener('click',c);
        
        if(loginBtn) loginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            login();
        });
        
        const logoutBtn = document.getElementById('testerLogoutBtn');
        if(logoutBtn) logoutBtn.addEventListener('click',logout);
        
        if(pi) pi.addEventListener('keypress',e=>{ if(e.key==='Enter'){ login(); } });
        if(emailInput) emailInput.addEventListener('keypress',e=>{ if(e.key==='Enter'){ pi.focus(); } });
        
        document.querySelectorAll('.tester-season-btn').forEach(b=>b.addEventListener('click',e=>ss(e.target.dataset.season, e)));
        
        const broadcastBtn = document.getElementById('broadcastBtn');
        if(broadcastBtn) broadcastBtn.addEventListener('click',bc);
        
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
    return{init};
})();

// === TINKERSHATCH CUSTOM FEATURES ===
function initCustomFeatures() {
    setTimeout(() => {
        const regularTracks = [
            { name: "Whispers of evening", url: "https://leewilliamsphotography-beep.github.io/Tinkershatch/background-music.mp3" },
            { name: "Let your spirit float", url: "https://leewilliamsphotography-beep.github.io/Tinkershatch/song2.mp3" },
            { name: "The shift of time", url: "https://leewilliamsphotography-beep.github.io/Tinkershatch/song3.mp3" },
            { name: "The shift of time", url: "https://leewilliamsphotography-beep.github.io/Tinkershatch/song4.mp3" },
            { name: "Echoes of twilight", url: "https://leewilliamsphotography-beep.github.io/Tinkershatch/song5.mp3" }
        ];
        const seasonalTracks = [
            { name: "Cozy Christmas Jazz", url: "https://leewilliamsphotography-beep.github.io/Tinkershatch/christmassong1.mp3", startMonth: 11, endMonth: 11 },
            { name: "Silent Night Piano", url: "https://leewilliamsphotography-beep.github.io/Tinkershatch/christmassong2.mp3", startMonth: 11, endMonth: 11 },
            { name: "Autumn Ambience", url: "https://leewilliamsphotography-beep.github.io/Tinkershatch/autumn1.mp3", startMonth: 9, endMonth: 10 },
            { name: "Autumn Ambience", url: "https://leewilliamsphotography-beep.github.io/Tinkershatch/halloween1.mp3", startMonth: 10, endMonth: 10 },
        ];
        const currentMonth = new Date().getMonth();
        let playlist = [...regularTracks]; 
        seasonalTracks.forEach(track => { if (currentMonth >= track.startMonth && currentMonth <= track.endMonth) { playlist.push(track); } });
        let currentTrack = Math.floor(Math.random() * playlist.length);
        const music = document.createElement('audio');
        music.style.display = 'none'; music.volume = 0.4; music.setAttribute('playsinline', ''); document.body.appendChild(music);
        function applyRandomPitch() { const minPitch = 0.9715; const maxPitch = 1.0293; music.playbackRate = (Math.random() * (maxPitch - minPitch) + minPitch); }
        function loadTrack(index) { currentTrack = (index + playlist.length) % playlist.length; music.src = playlist[currentTrack].url; music.load(); }
        music.addEventListener('ended', () => { loadTrack(currentTrack + 1); applyRandomPitch(); music.play().catch(e => console.log("Auto-advance blocked:", e)); });
        let hasStarted = false;
        function startMusic() { if (hasStarted) return; hasStarted = true; loadTrack(currentTrack); applyRandomPitch(); music.play().then(() => { window.removeEventListener('click', startMusic); window.removeEventListener('touchstart', startMusic); window.removeEventListener('touchend', startMusic); window.removeEventListener('keydown', startMusic); }).catch(e => { hasStarted = false; }); }
        window.addEventListener('click', startMusic); window.addEventListener('touchstart', startMusic); window.addEventListener('touchend', startMusic); window.addEventListener('keydown', startMusic);
        // Comment these out so they don't conflict with the sidebar ambient1.mp3
        // window.addEventListener('click', startMusic);
        // window.addEventListener('touchstart', startMusic);
        // window.addEventListener('touchend', startMusic);
        // window.addEventListener('keydown', startMusic);
        const weatherFx = document.getElementById('weather-fx');
        let currentWeatherCondition = '';
        function spawnWeatherEffect(type, count) {
            if(!weatherFx) return; weatherFx.innerHTML = ''; 
            for (let i = 0; i < count; i++) {
                const el = document.createElement('div'); el.className = `weather-el ${type}`;
                if (type === 'rain') { el.style.left = Math.random() * 100 + 'vw'; el.style.animationDuration = (Math.random() * 0.5 + 0.8) + 's'; el.style.opacity = Math.random() * 0.2 + 0.1; } 
                else if (type === 'snow') { el.style.left = Math.random() * 100 + 'vw'; el.style.animationDuration = (Math.random() * 5 + 8) + 's'; el.style.opacity = Math.random() * 0.4 + 0.2; const size = Math.random() * 3 + 1; el.style.width = size + 'px'; el.style.height = size + 'px'; } 
                else if (type === 'fog') { el.style.top = Math.random() * 100 + 'vh'; el.style.animationDuration = (Math.random() * 20 + 20) + 's'; el.style.animationDelay = Math.random() * -20 + 's'; el.style.opacity = Math.random() * 0.2 + 0.1; } 
                else if (type === 'sunbeam') { el.style.left = Math.random() * 100 + 'vw'; el.style.animationDuration = (Math.random() * 8 + 8) + 's'; el.style.animationDelay = Math.random() * -8 + 's'; el.style.opacity = Math.random() * 0.2 + 0.1; }
                weatherFx.appendChild(el);
            }
        }
        async function updateWeatherFX() { 
            try {
                const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=50.96&longitude=0.21&current=weather_code');
                const data = await res.json(); const code = data.current.weather_code;
                let newCondition = 'clear';
                if (code === 0) newCondition = 'clear'; else if (code >= 1 && code <= 3) newCondition = 'cloudy'; else if (code >= 45 && code <= 48) newCondition = 'fog'; else if (code >= 51 && code <= 67) newCondition = 'rain'; else if (code >= 71 && code <= 77) newCondition = 'snow'; else if (code >= 80 && code <= 82) newCondition = 'rain'; else if (code >= 85 && code <= 86) newCondition = 'snow';
                if (newCondition !== currentWeatherCondition) {
                    currentWeatherCondition = newCondition; const screenWidth = window.innerWidth; const widthFactor = Math.max(1, screenWidth / 1000);
                    let count = 0; let type = '';
                    if (newCondition === 'rain') { type = 'rain'; count = Math.floor(15 * widthFactor); } 
                    else if (newCondition === 'snow') { type = 'snow'; count = Math.floor(10 * widthFactor); } 
                    else if (newCondition === 'fog') { type = 'fog'; count = Math.floor(4 * widthFactor); }  
                    else if (newCondition === 'clear') { type = 'sunbeam'; count = Math.floor(4 * widthFactor); }  
                    else if (newCondition === 'cloudy') { type = 'fog'; count = Math.floor(2 * widthFactor); }  
                    count = Math.min(count, 100); spawnWeatherEffect(type, count);
                }
            } catch (e) { console.log("Weather FX offline or blocked."); }
        }
        updateWeatherFX(); setInterval(updateWeatherFX, 1800000);
    }, 1500);
}

// BULLETPROOF INITIALIZATION SEQUENCE
// ==========================================
function safeInit(name, fn) {
    try {
        fn();
    } catch (e) {
        console.error(`Module ${name} crashed:`, e);
    }
}

function initializeAppModules() {
    console.log("Initializing Haven Portal Modules...");
    
    // 1. Initialize Login FIRST
    safeInit('Tester', () => TesterModule.init());

    // 2. Initialize the rest of the dashboard safely
    safeInit('Layout', () => LayoutModule.init());
    safeInit('Splash', () => SplashModule.init());
    safeInit('SideNav', () => SideNavModule.init());
    safeInit('Accessibility', () => AccessibilityModule.init());
    safeInit('QuickJump', () => QuickJumpModule.init());
    safeInit('Time', () => TimeModule.init());
    safeInit('Toast', () => ToastModule.init());
    safeInit('ReadAloud', () => ReadAloudModule.init());
    safeInit('AmbientAudio', () => AmbientAudioModule.init());
    safeInit('Sensory', () => SensoryModule.init());
    safeInit('BackToTop', () => BackToTopModule.init());
    safeInit('Seasonal', () => SeasonalModule.init());
    safeInit('Favicon', () => FaviconModule.init());
    safeInit('Theme', () => ThemeModule.init());
    safeInit('Palette', () => PaletteModule.init());
    safeInit('FontSize', () => FontSizeModule.init());
    safeInit('Dyslexia', () => DyslexiaModule.init());
    safeInit('Haptic', () => HapticModule.init());
    safeInit('Bionic', () => BionicModule.init());
    safeInit('NextSection', () => NextSectionModule.init());
    safeInit('Reveal', () => RevealModule.init());
    safeInit('Mood', () => MoodModule.init());
    safeInit('Lightbox', () => LightboxModule.init());
    safeInit('FooterA11y', () => FooterA11yModule.init());
    safeInit('Progress', () => ProgressModule.init());
    safeInit('SummerEffects', () => SummerEffectsModule.init());
    safeInit('Auth', () => AuthModule.init());
    safeInit('Database', () => DatabaseModule.init());
    safeInit('FilmNight', () => FilmNightModule.init());
    safeInit('Parallax', () => ParallaxModule.init());
    safeInit('Events', () => EventsModule.init());
    safeInit('Wilf', () => WilfModule.init());
    safeInit('Menu', () => MenuModule.init());
    safeInit('Community', () => CommunityModule.init());
    safeInit('Enquiries', () => EnquiriesModule.init());
    safeInit('Briefing', () => BriefingModule.init());
    safeInit('Maintenance', () => MaintenanceModule.init());
    safeInit('Weather', () => WeatherModule.init());
    safeInit('Celebration', () => CelebrationModule.init());
    safeInit('Vibe', () => VibeModule.init());
    safeInit('GoldenHour', () => GoldenHourModule.init());
    safeInit('FeaturedEvents', () => FeaturedEventsModule.init());
    safeInit('Staff', () => StaffModule.init());
    
    safeInit('CustomFeatures', () => initCustomFeatures());
    console.log("Haven Portal Modules Loaded Successfully.");
}

// Safe boot wrapper
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

// Safe boot wrapper
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
            }
        }, 100);
    }
});