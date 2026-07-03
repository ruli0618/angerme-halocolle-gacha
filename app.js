const packs=window.ANGERME_PACKS;
const birthdayWeights={2:78.3,3:15,4:5,5:1.7};
const standardWeights={1:50,2:28,3:15,4:6,5:1};
const maxFourWeights={2:77,3:15,4:8};
const $=selector=>document.querySelector(selector);
let pack,selectedCards=[],selected,owned={},muted=false;

function storageKey(){return `halocolle-angerme-${pack.id}`}
function loadOwned(){
  const saved=JSON.parse(localStorage.getItem(storageKey())||"{}");
  owned=Array.isArray(saved)
    ? saved.reduce((counts,id)=>(counts[id]=(counts[id]||0)+1,counts),{})
    : saved;
}
function weights(){
  const maxRarity=Math.max(...pack.cards.map(card=>card.r));
  const source=maxRarity===4?maxFourWeights:(pack.birthday?birthdayWeights:standardWeights);
  const available=[1,2,3,4,5].filter(r=>pack.cards.some(card=>card.r===r));
  const total=available.reduce((sum,r)=>sum+(source[r]||0),0);
  return available.map(r=>({r,value:(source[r]||0)/total*100}));
}
function renderRates(){
  $("#rates").innerHTML=weights().sort((a,b)=>b.r-a.r)
    .map(item=>`<span>★${item.r} <b>${item.value.toFixed(1).replace(".0","")}%</b></span>`).join("");
}
function selectPack(id,goHome=true){
  pack=packs.find(item=>item.id===id)||packs[0];
  loadOwned();
  $("#packSelect").value=pack.id;
  $("#packTitle").textContent=pack.displayName;
  const rarities=[...new Set(pack.cards.map(card=>card.r))].sort((a,b)=>a-b);
  $("#packInfo").textContent=`全${pack.cards.length}種 · レアリティ ★${rarities.join("・★")}`;
  renderRates();updateCount();
  localStorage.setItem("halocolle-last-pack",pack.id);
  if(goHome)home();
}
function initPacks(){
  $("#packSelect").innerHTML=packs.map(item=>`<option value="${item.id}">${item.displayName}</option>`).join("");
  $("#packSelect").onchange=event=>selectPack(event.target.value);
  selectPack(localStorage.getItem("halocolle-last-pack")||packs[0].id,false);
}
function pick(){
  const distribution=weights();
  let n=Math.random()*100,rarity=distribution.at(-1).r;
  for(const item of distribution){
    if(n<item.value){rarity=item.r;break}
    n-=item.value;
  }
  const pool=pack.cards.filter(card=>card.r===rarity);
  return pool[Math.floor(Math.random()*pool.length)];
}
function draw(count=1){
  selectedCards=Array.from({length:count},()=>pick());
  selected=selectedCards[0];
  $("#stage").classList.remove("hidden");
  const intro=$("#intro");
  intro.src=selectedCards.some(card=>card.r===5)?"halocolle-rare.mp4":"halocolle-normal.mp4";
  intro.muted=muted;intro.currentTime=0;
  intro.play().catch(()=>reveal());
}
function cardMedia(card,options=""){
  return card.type==="video"
    ? `<video src="${card.file}" ${options}></video>`
    : `<img src="${card.file}" alt="獲得カード">`;
}
function reveal(){
  $("#intro").pause();
  $("#stage").classList.add("hidden");
  $("#home").classList.add("hidden");$("#result").classList.add("hidden");
  const result=$("#result");result.classList.remove("hidden");
  const isTen=selectedCards.length===10;
  const hasRare=selectedCards.some(card=>card.r===5);
  result.classList.toggle("rare",hasRare);result.classList.toggle("ten-result",isTen);
  const newIds=new Set(selectedCards.filter(card=>!owned[card.id]).map(card=>card.id));
  $("#newLabel").style.visibility=newIds.size?"visible":"hidden";
  $("#newLabel").textContent=isTen&&newIds.size?`NEW ${newIds.size}`:"NEW!";
  if(isTen){
    const highest=Math.max(...selectedCards.map(card=>card.r));
    $("#stars").textContent="10連 RESULT";
    $("#rarity").textContent=`最高レアリティ ★${highest}`;
    $("#cardName").textContent="カードをタップすると拡大できます";
    $("#mediaShell").innerHTML=selectedCards.map(card=>
      `<button class="ten-card" data-card="${card.id}">${cardMedia(card,"muted loop autoplay playsinline")}<span>${"★".repeat(card.r)}</span></button>`
    ).join("");
  }else{
    $("#stars").textContent="★".repeat(selected.r);
    $("#rarity").textContent=`RARE ${selected.r}`;
    $("#cardName").textContent=`${pack.displayName} · No.${selected.id}`;
    $("#mediaShell").innerHTML=cardMedia(selected,`autoplay loop playsinline ${muted?"muted":""}`);
  }
  selectedCards.forEach(card=>owned[card.id]=(owned[card.id]||0)+1);
  localStorage.setItem(storageKey(),JSON.stringify(owned));
  document.querySelectorAll(".ten-card").forEach(el=>el.onclick=()=>openViewer(el.dataset.card));
  updateCount();
}
function home(){
  $("#result").classList.add("hidden");$("#home").classList.remove("hidden");
  $("#mediaShell").innerHTML="";
}
function renderCollection(){
  const list=pack.cards.filter(card=>owned[card.id]).sort((a,b)=>b.r-a.r||Number(a.id)-Number(b.id));
  $("#collectionTitle").textContent=pack.displayName;
  $("#empty").hidden=list.length>0;
  $("#collectionGrid").innerHTML=list.map(card=>{
    const quantity=owned[card.id]>1?`<b class="quantity">×${owned[card.id]}</b>`:"";
    return `<button class="mini" data-card="${card.id}">${cardMedia(card,"muted loop autoplay playsinline")}<span class="mini-stars">${"★".repeat(card.r)}</span>${quantity}</button>`;
  }).join("");
  document.querySelectorAll(".mini").forEach(el=>el.onclick=()=>openViewer(el.dataset.card));
}
function openViewer(id){
  const card=pack.cards.find(item=>item.id===id);
  $("#viewerStars").textContent="★".repeat(card.r);
  $("#viewerName").textContent=`${pack.displayName} · No.${card.id}`;
  $("#viewerCount").textContent=`×${owned[id]||0}`;
  $("#viewerMedia").innerHTML=cardMedia(card,card.type==="video"?"controls autoplay playsinline":"");
  openDialog($("#viewer"));
}
function updateCount(){$("#count").textContent=Object.values(owned).reduce((sum,n)=>sum+n,0)}
function openDialog(dialog){
  dialog.showModal();
  history.pushState({halocolleDialog:dialog.id},"");
}
function closeDialog(dialog){
  if(!dialog.open)return;
  dialog.close();
  if(history.state?.halocolleDialog===dialog.id)history.back();
}

$("#draw").onclick=()=>draw(1);$("#again").onclick=()=>draw(1);
$("#drawTen").onclick=()=>draw(10);$("#againTen").onclick=()=>draw(10);
$("#skip").onclick=reveal;$("#intro").onended=reveal;$("#back").onclick=home;
$("#showHistory").onclick=()=>{renderCollection();openDialog($("#collection"))};
$("#closeHistory").onclick=()=>closeDialog($("#collection"));
$("#closeHistoryBottom").onclick=()=>closeDialog($("#collection"));
$("#closeViewer").onclick=()=>{$("#viewerMedia").innerHTML="";closeDialog($("#viewer"))};
$("#sound").onclick=()=>{
  muted=!muted;$("#sound").textContent=muted?"♪ OFF":"♪ ON";
  $("#intro").muted=muted;
  const video=$("#mediaShell video");if(video)video.muted=muted;
};
window.addEventListener("popstate",event=>{
  if($("#viewer").open&&event.state?.halocolleDialog!=="viewer"){
    $("#viewerMedia").innerHTML="";$("#viewer").close();
  }else if($("#collection").open&&event.state?.halocolleDialog!=="collection"){
    $("#collection").close();
  }
});
initPacks();
