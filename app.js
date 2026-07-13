import * as THREE from 'three';

const canvas = document.querySelector('#scene');
const renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: false});
renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<700?1.35:2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x110c1b);
scene.fog = new THREE.FogExp2(0x110c1b, .08);
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, .1, 100);
camera.position.set(0, 0, 7.2);

const loader = new THREE.TextureLoader();
const texture = await loader.loadAsync('1.jpeg');
texture.colorSpace = THREE.SRGBColorSpace;
texture.minFilter = THREE.LinearFilter;

const uniforms = {
  uTexture: {value: texture}, uTime: {value: 0},
  uMouse: {value: new THREE.Vector2(.5, .5)}, uProgress: {value: 0},
  uImageAspect: {value: texture.image.width / texture.image.height},
  uScreenAspect: {value: innerWidth / innerHeight}
};
const material = new THREE.ShaderMaterial({uniforms, vertexShader:`
  varying vec2 vUv; uniform float uTime; uniform vec2 uMouse;
  void main(){vUv=uv; vec3 p=position; float d=distance(uv,uMouse); float wave=sin(uv.y*11.+uTime*.7)*.018+cos(uv.x*9.-uTime*.5)*.012; p.z+=(1.-smoothstep(0.,.65,d))*.2+wave; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}
`, fragmentShader:`
  varying vec2 vUv; uniform sampler2D uTexture; uniform float uTime,uImageAspect,uScreenAspect,uProgress; uniform vec2 uMouse;
  void main(){vec2 uv=vUv; float screen=uScreenAspect; float image=uImageAspect; if(screen>image){float s=image/screen;uv.y=uv.y*s+(1.-s)*.5;}else{float s=screen/image;uv.x=uv.x*s+(1.-s)*.5;} float d=distance(vUv,uMouse); vec2 dir=(vUv-uMouse); float pulse=.5+.5*sin(uTime*.75); uv=(uv-.5)*(1.-pulse*.012)+.5; uv+=dir*(.018*(1.-smoothstep(0.,.7,d))); uv.x+=sin(uv.y*20.+uTime*1.1)*.0015; uv.y+=cos(uv.x*18.-uTime*.8)*.001; vec3 col=texture2D(uTexture,uv).rgb; float vignette=smoothstep(.9,.18,distance(vUv,vec2(.5))); col*=mix(.42,1.,vignette); float grey=dot(col,vec3(.299,.587,.114)); vec3 silver=vec3(grey)*vec3(.94,.92,1.02); vec3 purple=col*vec3(.92,.72,1.12); col=mix(silver,purple,.46); col+=vec3(.18,.05,.3)*(1.-vignette)*.35; col*=1.-uProgress*.18; gl_FragColor=vec4(col,1.);}
`});
const mobileMode=innerWidth<700||matchMedia('(pointer: coarse)').matches;
const photoSegments=mobileMode?32:70;
const photo = new THREE.Mesh(new THREE.PlaneGeometry(2, 2, photoSegments, photoSegments), material);
photo.position.z = -1.4; scene.add(photo);

const count=mobileMode?105:240, geo=new THREE.BufferGeometry(), pos=new Float32Array(count*3);
for(let i=0;i<count;i++){pos[i*3]=(Math.random()-.5)*14;pos[i*3+1]=(Math.random()-.5)*9;pos[i*3+2]=(Math.random()-.5)*5+1;}
geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
const particles=new THREE.Points(geo,new THREE.PointsMaterial({color:0xc29cff,size:.032,transparent:true,opacity:.78,blending:THREE.AdditiveBlending,depthWrite:false}));scene.add(particles);

const target={x:0,y:0}, mouse=new THREE.Vector2(.5,.5);
addEventListener('pointermove',e=>{mouse.set(e.clientX/innerWidth,1-e.clientY/innerHeight);target.x=(e.clientX/innerWidth-.5)*.3;target.y=(e.clientY/innerHeight-.5)*.22;});
function resize(){
  renderer.setSize(innerWidth,innerHeight,false);
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  uniforms.uScreenAspect.value=innerWidth/innerHeight;
  // Match the photo plane to the camera's visible rectangle. The shader can now
  // crop the portrait once (like object-fit: cover) without stretching it.
  const distance=camera.position.z-photo.position.z;
  const visibleHeight=2*Math.tan(THREE.MathUtils.degToRad(camera.fov*.5))*distance;
  const visibleWidth=visibleHeight*camera.aspect;
  photo.scale.set(visibleWidth*.51,visibleHeight*.51,1);
}addEventListener('resize',resize);resize();
const clock=new THREE.Clock();
function tick(){const t=clock.getElapsedTime();uniforms.uTime.value=t;uniforms.uMouse.value.lerp(mouse,.045);uniforms.uProgress.value+=(Math.min(scrollY/innerHeight,1)-uniforms.uProgress.value)*.04;camera.position.x+=(target.x-camera.position.x)*.035;camera.position.y+=(-target.y-camera.position.y)*.035;camera.position.z=7.2+Math.sin(t*.42)*.09;photo.rotation.y+=(target.x*.065+Math.sin(t*.3)*.008-photo.rotation.y)*.03;photo.rotation.x+=(-target.y*.025-photo.rotation.x)*.03;photo.position.y=uniforms.uProgress.value*.38+Math.sin(t*.38)*.025;particles.rotation.z=t*.014;particles.position.y=Math.sin(t*.32)*.12;particles.material.opacity=.58+Math.sin(t*.8)*.16;renderer.render(scene,camera);requestAnimationFrame(tick)}tick();

document.querySelector('.explore').addEventListener('click',()=>document.querySelector('#together').scrollIntoView({behavior:'smooth'}));
const talkButton=document.querySelector('.talk-button');
talkButton.addEventListener('click',()=>{
  if(!('speechSynthesis' in window))return;
  speechSynthesis.cancel();
  const first=new SpeechSynthesisUtterance('I love you, hun');
  const second=new SpeechSynthesisUtterance('I love you too, hun');
  const voices=speechSynthesis.getVoices();
  first.voice=voices.find(v=>/female|zira|samantha/i.test(v.name))||voices[0];
  second.voice=voices.find(v=>/male|david|daniel/i.test(v.name))||voices[1]||voices[0];
  first.rate=.86;second.rate=.86;first.pitch=1.08;second.pitch=.9;
  talkButton.classList.add('speaking');
  second.onend=()=>talkButton.classList.remove('speaking');
  speechSynthesis.speak(first);speechSynthesis.speak(second);
});
const modal=document.querySelector('.letter-modal');
function openLetter(){modal.hidden=false;requestAnimationFrame(()=>modal.classList.add('open'));document.body.style.overflow='hidden'}
function closeLetter(){modal.classList.remove('open');document.body.style.overflow='';setTimeout(()=>modal.hidden=true,400)}
document.querySelector('.letter-button').addEventListener('click',openLetter);document.querySelector('.close').addEventListener('click',closeLetter);modal.addEventListener('click',e=>{if(e.target===modal)closeLetter()});addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)closeLetter()});
document.querySelector('.journal-zoom').addEventListener('click',openLetter);

const progress=document.querySelector('.scroll-progress i');
const navLinks=[...document.querySelectorAll('.chapter-nav a')];
const chapters=navLinks.map(link=>document.querySelector(link.getAttribute('href')));
function updateScrollUI(){
  const max=document.documentElement.scrollHeight-innerHeight;
  progress.style.transform=`scaleX(${max?scrollY/max:0})`;
  let active=0;chapters.forEach((chapter,i)=>{if(chapter&&chapter.getBoundingClientRect().top<innerHeight*.55)active=i});
  navLinks.forEach((link,i)=>link.classList.toggle('active',i===active));
}
addEventListener('scroll',updateScrollUI,{passive:true});updateScrollUI();

const revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
  if(entry.isIntersecting){entry.target.classList.add('visible');revealObserver.unobserve(entry.target)}
}),{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>revealObserver.observe(el));

const journalPage=document.querySelector('.journal-page');
journalPage.addEventListener('pointermove',e=>{
  if(matchMedia('(pointer: coarse)').matches)return;
  const r=journalPage.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
  journalPage.style.transform=`perspective(1000px) rotateY(${x*5}deg) rotateX(${-y*5}deg)`;
});
journalPage.addEventListener('pointerleave',()=>journalPage.style.transform='');

// Summer Love soundtrack. Browsers may require the first tap before unmuted audio.
const song=document.querySelector('#love-song');
const soundButton=document.querySelector('.sound');
const autoplayPrompt=document.querySelector('.autoplay-prompt');
const musicToggle=document.querySelector('.music-toggle');
const musicProgress=document.querySelector('.music-progress');
const musicTime=document.querySelector('.music-time');
const volumeToggle=document.querySelector('.volume-toggle');
song.volume=.42;
let musicPlaying=false;
function updateMusicUI(){musicToggle.textContent=song.paused?'▶':'Ⅱ';musicToggle.setAttribute('aria-label',song.paused?'Play Summer Love':'Pause Summer Love');soundButton.classList.toggle('muted',song.paused);volumeToggle.classList.toggle('muted',song.muted)}
async function playMusic(){
  try{await song.play();musicPlaying=true;autoplayPrompt.hidden=true;updateMusicUI()}
  catch{autoplayPrompt.hidden=false;musicPlaying=false;updateMusicUI()}
}
playMusic();
addEventListener('pointerdown',event=>{if(!musicPlaying&&!event.target.closest('.music-player'))playMusic()},{once:true});
autoplayPrompt.addEventListener('click',playMusic);
musicToggle.addEventListener('click',()=>song.paused?playMusic():song.pause());
song.addEventListener('play',()=>{musicPlaying=true;updateMusicUI()});song.addEventListener('pause',()=>{musicPlaying=false;updateMusicUI()});
song.addEventListener('timeupdate',()=>{if(!song.duration)return;musicProgress.value=String(song.currentTime/song.duration*100);musicTime.textContent=`${Math.floor(song.currentTime/60)}:${String(Math.floor(song.currentTime%60)).padStart(2,'0')}`});
musicProgress.addEventListener('input',()=>{if(song.duration)song.currentTime=Number(musicProgress.value)/100*song.duration});
volumeToggle.addEventListener('click',()=>{song.muted=!song.muted;volumeToggle.textContent=song.muted?'×':'♪';updateMusicUI()});
soundButton.addEventListener('click',async()=>{
  if(song.paused)await playMusic();else{song.pause();musicPlaying=false;soundButton.classList.add('muted')}
});
updateMusicUI();

// Page-turning journal with touch swipe support.
const bookPages=['note1.jpeg','note2.jpeg','note3.jpeg','2.jpeg'];
const bookAlts=['Page one of my message','Page two of my message','Page three of my message','The journal page that inspired my message'];
const book=document.querySelector('.story-book');
const page=book.querySelector('.current-page');
const pageImage=page.querySelector('img');
const pageNumber=book.querySelector('.book-number');
let pageIndex=0,turning=false,touchStart=0;
function turnPage(direction){
  const next=Math.max(0,Math.min(bookPages.length-1,pageIndex+direction));
  if(next===pageIndex||turning)return;
  turning=true;page.classList.add(direction>0?'turn-next':'turn-prev');
  setTimeout(()=>{pageIndex=next;pageImage.src=bookPages[pageIndex];pageImage.alt=bookAlts[pageIndex];pageNumber.textContent=String(pageIndex+1).padStart(2,'0');page.classList.remove('turn-next','turn-prev');turning=false},760);
}
book.querySelector('.book-next').addEventListener('click',()=>turnPage(1));
book.querySelector('.book-prev').addEventListener('click',()=>turnPage(-1));
book.addEventListener('touchstart',e=>touchStart=e.changedTouches[0].clientX,{passive:true});
book.addEventListener('touchend',e=>{const d=e.changedTouches[0].clientX-touchStart;if(Math.abs(d)>45)turnPage(d<0?1:-1)},{passive:true});

// Synchronized voice notes backed by Supabase Storage and Realtime.
const recordButton=document.querySelector('.record-button');
const recordTime=document.querySelector('.record-time');
const recordLabel=document.querySelector('.record-label');
const recordings=document.querySelector('.recordings');
const voiceSenderName=document.querySelector('.voice-sender-name');
const messageList=document.querySelector('.message-list');
const messageForm=document.querySelector('.message-form');
const senderName=document.querySelector('.sender-name');
const messageInput=document.querySelector('.message-input');
const notifyButton=document.querySelector('.notify-button');
const emojiToggle=document.querySelector('.emoji-toggle');
const emojiTray=document.querySelector('.emoji-tray');
let recorder,chunks=[],timer,timerStart,resumeMusic=false;
let cloudUserId='';
const supabaseReady=(async()=>{
  const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  const client=createClient('https://dlkkxcdwkoqeguemifsz.supabase.co','sb_publishable_YqnhrxGTP7Avz65n_kKZFg_OEr2DFVa');
  let {data:{session}}=await client.auth.getSession();
  if(!session){const {data,error}=await client.auth.signInAnonymously();if(error)throw error;session=data.session}
  cloudUserId=session.user.id;
  client.channel('our-shared-inbox')
    .on('postgres_changes',{event:'*',schema:'public',table:'voice_notes'},payload=>{renderNotes();if(payload.eventType==='INSERT'&&payload.new.user_id!==cloudUserId)showNotification(`New voice note from ${payload.new.sender_name||'someone'}`,'A little piece of their voice is waiting for you.')})
    .on('postgres_changes',{event:'*',schema:'public',table:'text_messages'},payload=>{renderTextMessages();if(payload.eventType==='INSERT'&&payload.new.user_id!==cloudUserId)showNotification(`New message from ${payload.new.sender_name}`,payload.new.body)})
    .subscribe();
  return client;
})().catch(error=>{console.error('Voice-note sync unavailable:',error);recordLabel.textContent='Cloud voice notes need Supabase setup';return null});
async function storeNote(blob,name){
  const client=await supabaseReady;if(!client)throw new Error('Cloud unavailable');
  const {data:{user}}=await client.auth.getUser();
  const extension=(blob.type.split('/')[1]||'webm').split(';')[0];
  const path=`${user.id}/${crypto.randomUUID()}.${extension}`;
  const {error:uploadError}=await client.storage.from('voice-notes').upload(path,blob,{contentType:blob.type,upsert:false});if(uploadError)throw uploadError;
  const {error:rowError}=await client.from('voice_notes').insert({storage_path:path,user_id:user.id,sender_name:name});
  if(rowError){await client.storage.from('voice-notes').remove([path]);throw rowError}
}
async function getNotes(){
  const client=await supabaseReady;if(!client)return[];
  const {data,error}=await client.from('voice_notes').select('id,storage_path,created_at,user_id,sender_name').neq('sender_name','Someone').order('created_at',{ascending:false});if(error)throw error;
  return Promise.all(data.map(async note=>{const {data:signed}=await client.storage.from('voice-notes').createSignedUrl(note.storage_path,3600);return{...note,url:signed?.signedUrl}}));
}
function formatTime(seconds){return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`}
async function renderNotes(){
  const notes=await getNotes();recordings.innerHTML='';
  if(!notes.length){recordings.innerHTML='<p class="empty-notes">Your saved voice notes will appear here.</p>';return}
  notes.forEach((note,i)=>{
    const row=document.createElement('div');row.className='recording';
    row.innerHTML=`<div class="voice-note-meta"><strong></strong><time></time></div><button class="note-play" type="button" aria-label="Play voice note">▶</button><div class="note-timeline"><input type="range" min="0" max="100" value="0" aria-label="Voice note progress"><small>0:00</small></div><audio preload="metadata" src="${note.url||''}"></audio>`;
    row.querySelector('.voice-note-meta strong').textContent=note.sender_name||'Someone';row.querySelector('.voice-note-meta time').textContent=new Date(note.created_at).toLocaleString([],{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
    const audio=row.querySelector('audio'),play=row.querySelector('.note-play'),range=row.querySelector('input'),time=row.querySelector('small');let resumeSong=false;
    play.addEventListener('click',()=>audio.paused?audio.play():audio.pause());
    audio.addEventListener('play',()=>{document.querySelectorAll('.recording audio').forEach(other=>{if(other!==audio)other.pause()});resumeSong=!song.paused;if(resumeSong)song.pause();play.textContent='Ⅱ';row.classList.add('playing')});
    audio.addEventListener('pause',()=>{play.textContent='▶';row.classList.remove('playing');if(resumeSong&&!audio.ended){playMusic();resumeSong=false}});
    audio.addEventListener('ended',()=>{if(resumeSong)playMusic();resumeSong=false});
    audio.addEventListener('timeupdate',()=>{if(!audio.duration)return;range.value=String(audio.currentTime/audio.duration*100);time.textContent=formatTime(Math.floor(audio.currentTime))});
    range.addEventListener('input',()=>{if(audio.duration)audio.currentTime=Number(range.value)/100*audio.duration});
    recordings.append(row)
  });
}
recordButton.addEventListener('click',async()=>{
  if(recorder?.state==='recording'){recorder.stop();return}
  const recordingName=voiceSenderName.value.trim();if(!recordingName){recordLabel.textContent='Add your name before recording';voiceSenderName.focus();return}
  localStorage.setItem('love-note-sender',recordingName);senderName.value=recordingName;
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    chunks=[];recorder=new MediaRecorder(stream);resumeMusic=!song.paused;if(resumeMusic)song.pause();
    recorder.ondataavailable=e=>chunks.push(e.data);
    recorder.onstop=async()=>{clearInterval(timer);stream.getTracks().forEach(t=>t.stop());const blob=new Blob(chunks,{type:recorder.mimeType||'audio/webm'});recordLabel.textContent='Uploading voice note';try{await storeNote(blob,recordingName);recordLabel.textContent='Synced across your devices';renderNotes()}catch(error){console.error('Voice upload failed:',error);recordLabel.textContent=error?.code==='PGRST204'?'Run the updated Supabase setup first':'Voice note could not be uploaded'}recordButton.classList.remove('recording');recordTime.textContent='00:00';if(resumeMusic)playMusic()};
    recorder.start();timerStart=Date.now();recordButton.classList.add('recording');recordLabel.textContent='Recording. Tap again to save';timer=setInterval(()=>recordTime.textContent=formatTime(Math.floor((Date.now()-timerStart)/1000)),250);
  }catch{recordLabel.textContent='Microphone access is needed to record'}
});
renderNotes().catch(()=>recordLabel.textContent='Cloud voice notes need Supabase setup');

// Realtime shared text messages and in-browser notifications.
senderName.value=localStorage.getItem('love-note-sender')||'';
voiceSenderName.value=senderName.value;
senderName.addEventListener('input',()=>voiceSenderName.value=senderName.value);
voiceSenderName.addEventListener('input',()=>senderName.value=voiceSenderName.value);
function showNotification(title,body){
  if(!('Notification' in window)||Notification.permission!=='granted')return;
  new Notification(title,{body,icon:'cartoon-coloring.png',badge:'cartoon-coloring.png',tag:'our-little-universe'});
}
async function renderTextMessages(){
  const client=await supabaseReady;if(!client)return;
  const {data,error}=await client.from('text_messages').select('id,body,sender_name,user_id,created_at').order('created_at',{ascending:true}).limit(100);if(error)throw error;
  messageList.innerHTML='';
  if(!data.length){messageList.innerHTML='<p class="empty-messages">Your first message can begin right here.</p>';return}
  data.forEach(message=>{const item=document.createElement('article');item.className=`text-message${message.user_id===cloudUserId?' mine':''}`;const date=new Date(message.created_at);item.innerHTML='<header><strong></strong><time></time></header><p></p>';item.querySelector('strong').textContent=message.sender_name;item.querySelector('time').textContent=date.toLocaleString([],{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});item.querySelector('p').textContent=message.body;messageList.append(item)});
  messageList.scrollTop=messageList.scrollHeight;
}
messageForm.addEventListener('submit',async event=>{
  event.preventDefault();const name=senderName.value.trim(),body=messageInput.value.trim();if(!name||!body)return;
  const client=await supabaseReady;if(!client)return;localStorage.setItem('love-note-sender',name);
  const button=messageForm.querySelector('button[type="submit"]');button.disabled=true;button.textContent='Sending';
  const {error}=await client.from('text_messages').insert({sender_name:name,body,user_id:cloudUserId});
  button.disabled=false;button.innerHTML='Send <b>♥</b>';if(!error){messageInput.value='';renderTextMessages()}
});
emojiToggle.addEventListener('click',()=>{emojiTray.hidden=!emojiTray.hidden;emojiToggle.classList.toggle('active',!emojiTray.hidden)});
emojiTray.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{
  const start=messageInput.selectionStart,end=messageInput.selectionEnd;
  messageInput.value=messageInput.value.slice(0,start)+button.textContent+messageInput.value.slice(end);
  const next=start+button.textContent.length;messageInput.focus();messageInput.setSelectionRange(next,next);
}));
document.addEventListener('pointerdown',event=>{if(!event.target.closest('.emoji-tray,.emoji-toggle')){emojiTray.hidden=true;emojiToggle.classList.remove('active')}});
notifyButton.addEventListener('click',async()=>{
  if(!('Notification' in window)){notifyButton.textContent='Notifications unavailable';return}
  const permission=await Notification.requestPermission();notifyButton.classList.toggle('enabled',permission==='granted');notifyButton.innerHTML=permission==='granted'?'<i></i> Notifications enabled':'<i></i> Notifications blocked';
});
if('Notification' in window&&Notification.permission==='granted'){notifyButton.classList.add('enabled');notifyButton.innerHTML='<i></i> Notifications enabled'}
renderTextMessages().catch(()=>messageList.innerHTML='<p>Run the updated Supabase setup to enable messages.</p>');

document.querySelector('.replay-story').addEventListener('click',()=>scrollTo({top:0,behavior:'smooth'}));
window.finishLoading();
