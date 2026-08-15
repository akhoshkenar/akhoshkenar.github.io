
(() => {
  const videos = [...document.querySelectorAll('video.autoplay-card')];
  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const v = entry.target;
        if (entry.isIntersecting && entry.intersectionRatio > 0.15) v.play().catch(()=>{});
        else v.pause();
      });
    }, {threshold:[0,.15,.5]});
    videos.forEach(v => obs.observe(v));
  } else videos.forEach(v => v.play().catch(()=>{}));

  const canvas = document.getElementById('dandelionCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W=0,H=0,dpr=1,wind=0.8,t=0;
  const loose=[];
  const seeds=[];
  function resize(){dpr=Math.min(window.devicePixelRatio||1,2);W=canvas.clientWidth;H=canvas.clientHeight;canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);}
  window.addEventListener('resize',resize);resize();
  const N=92;
  for(let i=0;i<N;i++){
    const a=(i/N)*Math.PI*2 + (Math.sin(i*91.7)*.12);
    const r=.55+.45*((Math.sin(i*37.2)*.5+.5));
    seeds.push({a,r,detach:3.2+(i%18)*.47+Math.random()*4,done:false});
  }
  window.addEventListener('pointermove',e=>{wind=.45+1.6*(e.clientX/Math.max(1,innerWidth));});
  function puff(cx,cy,s){
    ctx.strokeStyle='rgba(200,242,243,.45)';ctx.lineWidth=1.05;
    ctx.beginPath();ctx.moveTo(cx,cy+18*s);ctx.quadraticCurveTo(cx-12*s,cy+130*s,cx-28*s,cy+240*s);ctx.stroke();
    seeds.forEach((sd,i)=>{
      if(!sd.done && t>sd.detach){sd.done=true;const rr=(54+28*sd.r)*s;loose.push({x:cx+Math.cos(sd.a)*rr,y:cy+Math.sin(sd.a)*rr,vx:(1.2+Math.random()*1.4)*wind,vy:-.25+Math.random()*.65,rot:sd.a,life:0});}
      if(sd.done) return;
      const rr=(54+28*sd.r)*s;const x=cx+Math.cos(sd.a)*rr,y=cy+Math.sin(sd.a)*rr;
      ctx.strokeStyle='rgba(220,250,250,.62)';ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(x,y);ctx.stroke();
      ctx.save();ctx.translate(x,y);ctx.rotate(sd.a);ctx.strokeStyle='rgba(245,255,255,.85)';ctx.beginPath();ctx.moveTo(0,0);for(let k=-2;k<=2;k++){ctx.moveTo(0,0);ctx.lineTo(9*s, k*3.2*s);}ctx.stroke();ctx.restore();
    });
    ctx.fillStyle='rgba(181,232,235,.82)';ctx.beginPath();ctx.arc(cx,cy,5*s,0,Math.PI*2);ctx.fill();
  }
  function loop(){t+=.016;ctx.clearRect(0,0,W,H);const s=Math.max(.75,Math.min(1.25,W/1200));const cx=W*.79,cy=H*.39;puff(cx,cy,s);
    for(let i=loose.length-1;i>=0;i--){const q=loose[i];q.life+=.016;q.vx+=.005*wind;q.x+=q.vx;q.y+=q.vy+Math.sin(t*2+q.x*.01)*.18;q.rot+=.012;ctx.save();ctx.translate(q.x,q.y);ctx.rotate(q.rot);ctx.strokeStyle=`rgba(235,255,255,${Math.max(0,.85-q.life*.035)})`;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-8,0);ctx.lineTo(2,0);for(let k=-2;k<=2;k++){ctx.moveTo(2,0);ctx.lineTo(11,k*3);}ctx.stroke();ctx.restore();if(q.x>W+40||q.life>26)loose.splice(i,1);}
    if(t>18 && seeds.filter(s=>!s.done).length<12){seeds.forEach((sd,i)=>{sd.done=false;sd.detach=t+2.5+(i%18)*.45+Math.random()*3});}
    requestAnimationFrame(loop);
  }loop();
})();
