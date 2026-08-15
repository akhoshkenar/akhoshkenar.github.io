(() => {
  // Homepage card videos: native autoplay/loop is in HTML. JS only pauses off-screen cards.
  const videos = [...document.querySelectorAll('video.autoplay-card')];
  const tryPlay = v => { v.muted = true; v.defaultMuted = true; const p=v.play(); if(p&&p.catch)p.catch(()=>{}); };
  videos.forEach(v => { v.muted=true; v.defaultMuted=true; });
  if ('IntersectionObserver' in window && videos.length) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio > .04 && !document.hidden) tryPlay(entry.target);
        else entry.target.pause();
      });
    }, {rootMargin:'90px 0px', threshold:[0,.04,.2]});
    videos.forEach(v => observer.observe(v));
  } else videos.forEach(tryPlay);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden) videos.forEach(v=>v.pause());
    else videos.forEach(v=>{const r=v.getBoundingClientRect();if(r.bottom>0&&r.top<innerHeight)tryPlay(v);});
  });

  const canvas=document.getElementById('dandelionCanvas');
  if(!canvas || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ctx=canvas.getContext('2d',{alpha:true});
  let W=0,H=0,dpr=1,last=0,time=0,targetWind=.78,wind=.78;
  const FRAME=1000/30;
  const loose=[];

  const flowers=[
    {x:.17,size:1.08,lean:-.08,seedN:34,phase:.2},
    {x:.39,size:.72,lean:.02,seedN:26,phase:1.5},
    {x:.63,size:.92,lean:-.03,seedN:31,phase:2.6},
    {x:.83,size:.58,lean:.07,seedN:21,phase:4.1}
  ];

  function resetFlower(f, now=0){
    f.birth=now; f.seeds=[];
    for(let i=0;i<f.seedN;i++){
      const a=(i/f.seedN)*Math.PI*2+(Math.random()-.5)*.24;
      f.seeds.push({a,r:.52+Math.random()*.48,detach:(i%6===0?0:Math.random()*7.5),done:false});
    }
  }
  flowers.forEach(f=>resetFlower(f,0));

  function resize(){
    dpr=Math.min(devicePixelRatio||1,1.25); W=canvas.clientWidth; H=canvas.clientHeight;
    canvas.width=Math.max(1,Math.floor(W*dpr)); canvas.height=Math.max(1,Math.floor(H*dpr));
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  addEventListener('resize',resize,{passive:true}); resize();
  addEventListener('pointermove',e=>{targetWind=.25+1.45*(e.clientX/Math.max(1,innerWidth));},{passive:true});

  function drawSeed(x,y,rot,s,alpha=.82){
    ctx.save(); ctx.translate(x,y); ctx.rotate(rot);
    ctx.strokeStyle=`rgba(239,255,255,${alpha})`; ctx.lineWidth=.78;
    ctx.beginPath(); ctx.moveTo(-6.2*s,0); ctx.lineTo(1.5*s,0);
    for(let k=-2;k<=2;k++){ctx.moveTo(1.5*s,0);ctx.lineTo(8.5*s,k*2.3*s);} ctx.stroke(); ctx.restore();
  }

  function flowerGeometry(f){
    const mobile=W<640;
    const s=f.size*(mobile?.77:Math.max(.82,Math.min(1.08,W/1180)));
    const baseX=W*f.x, baseY=H*.96;
    const gust=(wind-.75)*18*s;
    const sway=(Math.sin(time*1.15+f.phase)*6 + Math.sin(time*.43+f.phase)*3)*s + gust;
    const headX=baseX + f.lean*H + sway;
    const headY=H*(.34 + (.10*(1-f.size))) + Math.sin(time*.9+f.phase)*2.2*s;
    const ctrlX=baseX + sway*.40 + f.lean*H*.55;
    const ctrlY=H*.66;
    return {s,baseX,baseY,headX,headY,ctrlX,ctrlY};
  }

  function drawFlower(f){
    const g=flowerGeometry(f); const {s,baseX,baseY,headX,headY,ctrlX,ctrlY}=g;
    // Flexible stem: two close curves create a more organic stem.
    ctx.strokeStyle='rgba(160,220,213,.47)'; ctx.lineWidth=1.5*s;
    ctx.beginPath(); ctx.moveTo(baseX,baseY); ctx.quadraticCurveTo(ctrlX,ctrlY,headX,headY+14*s); ctx.stroke();
    ctx.strokeStyle='rgba(205,246,238,.18)'; ctx.lineWidth=.55*s;
    ctx.beginPath(); ctx.moveTo(baseX+1.2*s,baseY); ctx.quadraticCurveTo(ctrlX+2*s,ctrlY,headX+1.2*s,headY+14*s); ctx.stroke();

    // A narrow leaf bending away from the stem.
    const ly=H*.73, dir=f.x<.5?-1:1;
    ctx.strokeStyle='rgba(145,210,202,.30)'; ctx.lineWidth=1.0*s;
    ctx.beginPath(); ctx.moveTo(baseX,ly); ctx.quadraticCurveTo(baseX+dir*24*s,ly-22*s,baseX+dir*38*s,ly-42*s); ctx.stroke();

    const elapsed=time-f.birth;
    f.seeds.forEach(sd=>{
      const rr=(38+24*sd.r)*s;
      const x=headX+Math.cos(sd.a)*rr, y=headY+Math.sin(sd.a)*rr;
      if(!sd.done && elapsed>=sd.detach){
        sd.done=true;
        if(loose.length<150) loose.push({x,y,vx:(.45+Math.random()*.75)*wind*s,vy:-.18+Math.random()*.40,rot:sd.a,life:0,w:Math.random()*Math.PI*2,s:.82*s});
      }
      if(sd.done) return;
      ctx.strokeStyle='rgba(220,250,249,.50)'; ctx.lineWidth=.62;
      ctx.beginPath(); ctx.moveTo(headX,headY); ctx.lineTo(x,y); ctx.stroke();
      drawSeed(x,y,sd.a,.82*s,.80);
    });
    ctx.fillStyle='rgba(187,235,234,.82)'; ctx.beginPath(); ctx.arc(headX,headY,4.5*s,0,Math.PI*2);ctx.fill();
    const attached=f.seeds.reduce((n,z)=>n+(!z.done?1:0),0);
    if(elapsed>14 && attached<3) resetFlower(f,time);
  }

  function animate(ts){
    requestAnimationFrame(animate); if(ts-last<FRAME) return;
    const dt=Math.min(.05,(ts-last)/1000||1/30); last=ts; time+=dt; wind+=(targetWind-wind)*.055;
    ctx.clearRect(0,0,W,H); flowers.forEach(drawFlower);
    for(let i=loose.length-1;i>=0;i--){
      const q=loose[i]; q.life+=dt; q.vx+=.012*wind*dt; q.x+=q.vx*(dt*60); q.y+=(q.vy+Math.sin(time*2+q.w)*.12)*(dt*60); q.rot+=.38*dt;
      const a=Math.max(0,.82-q.life*.055); drawSeed(q.x,q.y,q.rot,q.s,a);
      if(q.x>W+50||q.x<-50||q.y<-50||q.y>H+70||q.life>16) loose.splice(i,1);
    }
  }
  requestAnimationFrame(animate);
})();
