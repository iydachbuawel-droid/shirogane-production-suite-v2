/* SHIROGANE PDF generator: A4 portrait, selectable text and vector lines.
   Keeps the familiar receipt hierarchy: centered brand, plain metadata, compact size table,
   right-aligned totals, highlighted balance, bank panel, design thumbnails and footer. */
(function(){'use strict';
const W=210,H=297,M=8,CW=W-2*M;
const C={ink:[17,24,39],muted:[100,116,139],line:[226,232,240],pale:[248,250,252],cream:[255,244,204],white:[255,255,255]};
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const txt=e=>clean(e?.innerText||e?.textContent||'');
function setC(pdf,c){pdf.setTextColor(...c)}
function line(pdf,x1,y1,x2,y2,c=C.line,w=.25){pdf.setDrawColor(...c);pdf.setLineWidth(w);pdf.line(x1,y1,x2,y2)}
function box(pdf,x,y,w,h,fill=null,stroke=C.line,r=2,lw=.3){if(fill)pdf.setFillColor(...fill);if(stroke)pdf.setDrawColor(...stroke);pdf.setLineWidth(lw);pdf.roundedRect(x,y,w,h,r,r,fill&&stroke?'FD':fill?'F':'S')}
function text(pdf,s,x,y,o={}){pdf.setFont('helvetica',o.bold?'bold':'normal');pdf.setFontSize(o.size||8);setC(pdf,o.color||C.ink);pdf.text(String(s??''),x,y,{align:o.align||'left',maxWidth:o.maxWidth});}
function imgData(im){try{if(!im||!im.complete||!im.naturalWidth)return null;let c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;c.getContext('2d').drawImage(im,0,0);return c.toDataURL('image/png')}catch(e){return null}}
function addImg(pdf,im,x,y,w,h){const data=imgData(im);if(!data)return;try{const p=pdf.getImageProperties(data),s=Math.min(w/p.width,h/p.height);pdf.addImage(data,'PNG',x+(w-p.width*s)/2,y+(h-p.height*s)/2,p.width*s,p.height*s)}catch(e){}}
function find(root,ss){for(const s of ss){const e=root.querySelector(s);if(e)return e}return null}
function collect(root){const table=root.querySelector('table'),head=find(root,['.head']),brand=find(root,['.brand h1','h1']),logo=find(root,['img.logo']),meta=find(root,['.meta']),tot=find(root,['.totals']),payment=find(root,['.payment']),rows=table?[...table.querySelectorAll('tr')].map(tr=>[...tr.children].map(txt)):[];
 const metaItems=meta?[...meta.children].map(e=>({label:txt(e.querySelector('small')),value:txt(e.querySelector('b'))||txt(e)})):[];
 const totals=tot?[...tot.querySelectorAll(':scope > .row')].map(e=>({left:txt(e.querySelector('span,small')),right:txt(e.querySelector('b'))||txt(e.querySelectorAll('span').length>1?e.querySelectorAll('span')[1]:null),cls:e.className,text:txt(e)})):[];
 return {head,brand:txt(brand)||'SHIROGANE',logo,brandLines:head?[...head.querySelectorAll('.brand p')].map(txt).filter(Boolean):[],badge:txt(find(root,['.badge'])),metaItems,rows,totals,payment,paymentText:txt(payment),designs:[...root.querySelectorAll('.design img,.thumb img,.designs img,.thumbs img')].slice(0,3),note:[...root.querySelectorAll('p')].map(txt).find(s=>/^Catatan:/i.test(s))||'',foot:txt(find(root,['.foot']))};}
async function download(root,filename){if(!root)throw Error('Area nota tidak ditemukan.');const J=window.jspdf?.jsPDF;if(!J)throw Error('jsPDF belum dimuat. Periksa koneksi lalu muat ulang.');await Promise.all([...root.querySelectorAll('img')].map(im=>im.complete?Promise.resolve():new Promise(r=>{im.onload=im.onerror=r;setTimeout(r,2000)})));
 const d=collect(root),pdf=new J({orientation:'portrait',unit:'mm',format:'a4',compress:true});let y=8;
 // Header closely follows the original: logo on left, centered business identity, dark divider.
 if(d.logo)addImg(pdf,d.logo,28,y,22,22);
 text(pdf,d.brand,W/2,y+7,{size:16,bold:true,align:'center'});
 let by=y+12;d.brandLines.slice(0,2).forEach((s,i)=>{text(pdf,s,W/2,by+i*4,{size:7.5,color:C.muted,align:'center',maxWidth:130})});
 if(d.badge)text(pdf,d.badge,W-M,y+6,{size:7,bold:true,align:'right',color:C.muted});
 y+=27;line(pdf,M,y,W-M,y,C.ink,.8);y+=5;
 // Plain stacked invoice metadata like the previous receipt, no cards.
 for(const m of d.metaItems){text(pdf,(m.label?m.label+': ':'')+m.value,M,y+3.2,{size:7.5});y+=5.2;} y+=3;
 // Dense, legible table: item name + 9 sizes + quantity + price + amount.
 if(d.rows.length){const heads=d.rows[0],data=d.rows.slice(1),n=heads.length;const widths=n>=13?[47,...Array(9).fill(7.15),9,17,19]:[48,...Array(n-1).fill((CW-48)/(n-1))];const sum=widths.reduce((a,b)=>a+b,0);const ww=widths.map(v=>v*CW/sum);const th=6.2;
 pdf.setFillColor(...C.pale);pdf.rect(M,y,CW,th,'F');line(pdf,M,y,M+CW,y,C.line,.3);line(pdf,M,y+th,M+CW,y+th,C.line,.3);let x=M;
 heads.forEach((h,i)=>{text(pdf,h,x+ww[i]/2,y+4.0,{size:i===0?5.8:5.1,bold:true,color:C.muted,align:'center',maxWidth:ww[i]-.3});x+=ww[i]});y+=th;
 for(const row of data){const h=8;line(pdf,M,y+ h,M+CW,y+h,C.line,.25);let xx=M;for(let i=0;i<heads.length;i++){const v=row[i]||'';if(i===0)text(pdf,v,xx+1,y+3.3,{size:6.2,bold:true,maxWidth:ww[i]-2});else text(pdf,v,xx+ww[i]/2,y+3.3,{size:(i>=heads.length-2?5.0:5.4),align:'center',maxWidth:ww[i]-.3});xx+=ww[i]}y+=h;}
 y+=6;}
 // Totals aligned to the right; retain the previous strong total and warm highlighted balance.
 const tx=82,tw=W-M-tx;for(const r of d.totals){const balance=/balance/.test(r.cls),total=/\btotal\b/.test(r.cls)&&!balance,extra=/extra-detail/.test(r.cls),h=balance?21:total?10:extra?5.6:7.5;
 if(balance)box(pdf,tx,y,tw,h,C.cream,C.ink,3,.8);else if(total)line(pdf,tx,y,W-M,y,C.line,.45);
 const label=r.left||r.text,val=r.right||'';if(balance){text(pdf,label,tx+tw/2,y+6.4,{size:9,bold:true,align:'center'});text(pdf,val,tx+tw/2,y+15.8,{size:17,bold:true,align:'center'});}else{text(pdf,label,tx,y+(total?6.5:4.5),{size:total?10:extra?6.4:8,bold:total,maxWidth:tw-28});text(pdf,val,W-M,y+(total?6.5:4.5),{size:total?10:extra?6.4:8,bold:total,align:'right',maxWidth:28});}y+=h+(balance?2:0);}
 y+=4;if(d.paymentText){box(pdf,M,y,CW,21,[249,250,251],C.line,3,.35);text(pdf,d.paymentText,M+5,y+7,{size:7.2,maxWidth:CW-10});y+=25;}
 if(d.note){text(pdf,d.note,M,y+4,{size:7.5,maxWidth:CW});y+=8;}
 if(d.designs.length){const gap=5,w=Math.min(80,(CW-gap*(d.designs.length-1))/d.designs.length),h=49;for(let i=0;i<d.designs.length;i++){const x=M+i*(w+gap);box(pdf,x,y,w,h,null,C.line,3,.35);addImg(pdf,d.designs[i],x+2,y+2,w-4,h-4);}y+=h+5;}
 if(d.foot){line(pdf,M,y,W-M,y,C.line,.3);text(pdf,d.foot,W/2,y+5,{size:7,color:C.muted,align:'center',maxWidth:CW});}
 pdf.save((filename||'Nota-SHIROGANE.pdf').replace(/\.pdf$/i,'')+'.pdf');}
window.SHROGANE_downloadPreviewPdf=download;
window.SHROGANE_safePdfName=v=>String(v||'SHIROGANE').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'')||'SHIROGANE';
})();
