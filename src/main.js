import './style.css';
import { Application, Assets, Container } from 'pixi.js';
import { Spine } from '@esotericsoftware/spine-pixi-v8';
import { addPetAnimation, createCat, PET_ANIMATION, PET_DURATION, petPhase } from './pet-cat.js';

const root = document.querySelector('#app');
root.innerHTML = `<main><section id="stage"></section><aside><h1>Spine Mix & Match</h1><p class="sub">Official Spine 4.3 asset · PixiJS 8</p><div id="status">Loading…</div><h2>自定义动作</h2><div id="custom-animations" class="buttons"></div><p class="sub action-description">蹲下 → 轻抚小猫 → 起身 · 8 秒循环</p><div id="action-phase"></div><h2>Animations</h2><div id="animations" class="buttons"></div><h2>Full skins</h2><div id="skins" class="buttons"></div><h2>Runtime</h2><pre id="info"></pre></aside></main>`;
const stage = document.querySelector('#stage');
const status = document.querySelector('#status');
const info = document.querySelector('#info');

try {
  const app = new Application();
  await app.init({ resizeTo: stage, backgroundAlpha: 0, antialias: true, resolution: Math.min(devicePixelRatio, 2), autoDensity: true });
  stage.appendChild(app.canvas);

  Assets.add({ alias: 'skeleton', src: '/assets/mix-and-match-pro.json' });
  Assets.add({ alias: 'atlas', src: '/assets/mix-and-match-pma.atlas' });
  await Assets.load(['skeleton', 'atlas']);

  // Use the runtime's asset-aware factory. The 0.5 is the same scale used when
  // the official example atlas is exported (atlas-0.5-pma.json).
  const actor = Spine.from({ skeleton: 'skeleton', atlas: 'atlas', scale: 0.5 });
  actor.state.data.defaultMix = 0.2;
  const scene = new Container();
  const cat = createCat();
  scene.addChild(cat.view, actor);
  app.stage.addChild(scene);
  addPetAnimation(actor.skeleton.data);

  const animations = actor.skeleton.data.animations.map(a => a.name);
  const allSkins = actor.skeleton.data.skins.map(s => s.name);
  const fullSkins = allSkins.filter(n => n.startsWith('full-skins/'));

  // IMPORTANT: Mix-and-Match's default/setup skin is intentionally not a
  // complete visible character. Pick a full skin before measuring bounds.
  const initialSkin = fullSkins.find(n => n === 'full-skins/girl') ?? fullSkins[0] ?? allSkins[0];
  if (initialSkin) {
    actor.skeleton.setSkinByName(initialSkin);
    actor.skeleton.setupPoseSlots();
  }

  actor.state.setAnimation(0, PET_ANIMATION, true);
  actor.update(0);
  const { x, y, width, height } = scene.getLocalBounds();
  const standingBounds = { x, y, width, height };

  function fit() {
    // Always measure the standing pose, so resizing while crouched cannot
    // enlarge the actor or shift the ground beneath their feet.
    const bounds = standingBounds;
    const margin = Math.min(60, app.screen.width * 0.08);
    const scale = Math.max(0.1, Math.min(
      (app.screen.width - margin * 2) / bounds.width,
      (app.screen.height - margin * 2) / bounds.height,
      1.5,
    ));
    scene.scale.set(scale);
    scene.position.set(
      (app.screen.width - bounds.width * scale) / 2 - bounds.x * scale,
      (app.screen.height - bounds.height * scale) / 2 - bounds.y * scale,
    );
    info.textContent = `animations: ${animations.length}\nskins: ${allSkins.length}\nbones: ${actor.skeleton.bones.length}\nactive skin: ${actor.skeleton.skin?.name}\ndisplay scale: ${scale.toFixed(3)}`;
  }

  function play(name) {
    actor.state.setAnimation(0, name, true);
    cat.view.visible = name === PET_ANIMATION;
    for (const button of document.querySelectorAll('[data-animation]')) {
      button.setAttribute('aria-pressed', String(button.dataset.animation === name));
    }
    status.textContent = name === PET_ANIMATION ? '正在演示 · 蹲下抚摸小猫' : `播放中 · ${name}`;
    fit();
  }

  const customButton = document.createElement('button');
  customButton.textContent = '蹲下抚摸小猫';
  customButton.dataset.animation = PET_ANIMATION;
  customButton.onclick = () => play(PET_ANIMATION);
  document.querySelector('#custom-animations').append(customButton);
  const phaseLabel = document.querySelector('#action-phase');
  actor.afterUpdateWorldTransforms = () => {
    const entry = actor.state.getTrack(0);
    if (entry?.animation?.name !== PET_ANIMATION) {
      phaseLabel.textContent = '';
      return;
    }
    const time = entry.trackTime % PET_DURATION;
    cat.update(time);
    const { contact } = petPhase(time);
    if (contact > 0.5) phaseLabel.textContent = '轻轻抚摸 · 小猫很享受';
    else if (time < 2.2) phaseLabel.textContent = '慢慢蹲下 · 伸手靠近';
    else phaseLabel.textContent = '收回手 · 起身';
  };

  const animBox = document.querySelector('#animations');
  for (const name of animations.filter(name => name !== PET_ANIMATION)) {
    const button = document.createElement('button');
    button.textContent = name;
    button.dataset.animation = name;
    button.onclick = () => play(name);
    animBox.append(button);
  }

  const skinBox = document.querySelector('#skins');
  for (const name of fullSkins) {
    const button = document.createElement('button');
    button.textContent = name.replace('full-skins/', '');
    button.onclick = () => {
      actor.skeleton.setSkinByName(name);
      actor.skeleton.setupPoseSlots();
      actor.update(0);
      // Preserve current display position/scale; only refresh diagnostics.
      const b = actor.getBounds();
      info.textContent = `animations: ${animations.length}\nskins: ${allSkins.length}\nbones: ${actor.skeleton.bones.length}\nslots: ${actor.skeleton.slots.length}\nactive skin: ${name}\nbounds: ${b.width.toFixed(1)} × ${b.height.toFixed(1)}`;
    };
    skinBox.append(button);
  }

  // Wait one rendered tick so attachments/meshes have been updated, then fit.
  app.ticker.addOnce(() => {
    play(PET_ANIMATION);
    status.className = 'ok';
  });

  window.addEventListener('resize', () => requestAnimationFrame(fit));
} catch (e) {
  console.error(e);
  status.textContent = 'LOAD ERROR';
  status.className = 'bad';
  info.textContent = e.stack || String(e);
}
