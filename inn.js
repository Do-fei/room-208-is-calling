const guide = document.querySelector("#guide");
for (const button of document.querySelectorAll("[data-guide]")) {
  button.addEventListener("click", () => guide.showModal());
}
guide.addEventListener("click", event => {
  const box = guide.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) guide.close();
});

const walk = document.querySelector("#walk");
const ending = document.querySelector("#end");
const desk = document.querySelector(".desk");
const footer = document.querySelector("footer");
const caption = document.querySelector("#hall-caption");
const timecode = document.querySelector("#timecode");
const sound = document.querySelector("#sound");
const soundLabel = document.querySelector("#sound-label");
const lines = ["尽头的房门开着。", "第一声敲门，从镜头后面传来。", "水里的倒影，少了一扇门。", "是谁在拿着这台摄像机？"];
const limit = value => Math.min(1, Math.max(0, value));
let context;
let output;
let drone;
let active = false;
let framePending = false;

function prepareAudio() {
  context = new AudioContext();
  output = context.createGain();
  output.gain.value = 0;
  output.connect(context.destination);
  // Soft, looping surf under a low mechanical note from the night desk.
  const sampleRate = context.sampleRate;
  const buffer = context.createBuffer(1, sampleRate * 4, sampleRate);
  const samples = buffer.getChannelData(0);
  let previous = 0;
  for (let i = 0; i < samples.length; i++) {
    previous = (previous + .035 * (Math.random() * 2 - 1)) / 1.035;
    samples[i] = previous * (2 - Math.cos(2 * Math.PI * i / samples.length));
  }
  const sea = context.createBufferSource();
  sea.buffer = buffer;
  sea.loop = true;
  sea.connect(output);
  sea.start();
  drone = context.createOscillator();
  drone.type = "sine";
  drone.frequency.value = 73;
  const tone = context.createGain();
  tone.gain.value = .16;
  drone.connect(tone).connect(output);
  drone.start();
}

function setSound(enabled) {
  active = enabled;
  sound.setAttribute("aria-pressed", String(enabled));
  sound.setAttribute("aria-label", enabled ? "关闭环境音" : "开启环境音");
  soundLabel.textContent = enabled ? "环境音 开" : "环境音 关";
  if (output) output.gain.setTargetAtTime(enabled && !document.hidden ? .24 : 0, context.currentTime, .16);
}

sound.addEventListener("click", async () => {
  if (active) return setSound(false);
  try {
    if (!context) prepareAudio();
    await context.resume();
    setSound(true);
  } catch {
    setSound(false);
    soundLabel.textContent = "音频不可用";
  }
});
document.addEventListener("visibilitychange", () => setSound(active));

function renderScroll() {
  framePending = false;
  const height = window.innerHeight;
  const corridor = walk.getBoundingClientRect();
  const end = ending.getBoundingClientRect();
  const progress = limit(-corridor.top / Math.max(1, corridor.height - height));
  const near = limit(-end.top / Math.max(1, end.height - height));
  const phase = Math.min(lines.length - 1, Math.floor(progress * lines.length));
  walk.style.setProperty("--hall-scale", String(1 + .27 * progress));
  walk.style.setProperty("--hall-light", String(1 - .3 * progress));
  ending.style.setProperty("--end-scale", String(1 + .13 * near));
  ending.style.setProperty("--end-light", String(.82 + .18 * near));
  caption.textContent = lines[phase];
  timecode.textContent = "02:17:" + String(1 + Math.round(progress * 29)).padStart(2, "0");
  const night = desk.getBoundingClientRect().top < height * .6;
  sound.hidden = !night || typeof AudioContext === "undefined";
  document.body.classList.toggle("at-footer", footer.getBoundingClientRect().top < height - 4);
  if (!night && active) setSound(false);
  if (drone && active) drone.frequency.setTargetAtTime(73 - 20 * progress + 5 * near, context.currentTime, .5);
}

function queueRender() {
  if (framePending) return;
  framePending = true;
  requestAnimationFrame(renderScroll);
}
window.addEventListener("scroll", queueRender, {passive:true});
window.addEventListener("resize", queueRender);
window.addEventListener("pageshow", queueRender);
document.querySelector("#restart").addEventListener("click", () => {
  setSound(false);
  history.replaceState(null, "", location.pathname + location.search);
  window.scrollTo({top:0, behavior:"instant"});
  document.querySelector(".brand").focus({preventScroll:true});
});
renderScroll();