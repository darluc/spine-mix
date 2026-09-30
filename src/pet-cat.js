import { Container, Graphics } from 'pixi.js';
import { Physics, Skeleton, SkeletonJson } from '@esotericsoftware/spine-pixi-v8';

export const PET_ANIMATION = 'pet-cat';
export const PET_DURATION = 8;
export const CAT_POSITION = { x: 87, y: 0 };

function smoothstep(value) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

export function petPhase(time) {
  const t = time % PET_DURATION;
  const crouch = smoothstep((t - 0.4) / 1.2) * (1 - smoothstep((t - 6.1) / 1.3));
  const contact = smoothstep((t - 1.7) / 0.5) * (1 - smoothstep((t - 5.8) / 0.4));
  const stroke = Math.sin((t - 2.2) * Math.PI * 2 / 1.2);
  return { crouch, contact, stroke };
}

// Bake a new Spine animation without changing the downloaded example asset.
// Solve the reaching arm against a fixed cat position; the existing leg IK
// keeps both feet planted as the hips lower.
export function addPetAnimation(data) {
  const skeleton = new Skeleton(data);
  skeleton.setSkinByName('full-skins/girl');
  const bones = {};
  function frame(name, type, time, values) {
    bones[name] ??= {};
    bones[name][type] ??= [];
    bones[name][type].push({ time, ...values });
  }
  for (let i = 0; i <= PET_DURATION * 30; i++) {
    const time = i / 30;
    const { crouch, contact, stroke } = petPhase(time);
    const rotations = {
      'body-down': -20 * crouch,
      'body-up': -10 * crouch,
      neck: -8 * crouch,
      head: -6 * crouch,
      'arm-back-up': -25 * crouch,
      'arm-back-down': 75 * crouch,
      'hand-front': -12 * crouch,
    };
    skeleton.setupPose();
    const hips = skeleton.findBone('hips');
    hips.pose.x += 8 * crouch;
    hips.pose.y -= 87.5 * crouch;
    frame('hips', 'translate', time, { x: 16 * crouch, y: -175 * crouch });
    for (const [name, rotation] of Object.entries(rotations)) {
      skeleton.findBone(name).pose.rotation += rotation;
      frame(name, 'rotate', time, { value: rotation });
    }
    skeleton.updateWorldTransform(Physics.none);
    const upper = skeleton.findBone('arm-front-up');
    const lower = skeleton.findBone('arm-front-down');
    const hand = skeleton.findBone('hand-front');
    const target = upper.parent.appliedPose.worldToLocal({
      x: CAT_POSITION.x - 17 + 8 * stroke * contact,
      y: -60 - 2 * stroke * contact,
    });
    const dx = target.x - upper.pose.x;
    const dy = target.y - upper.pose.y;
    const length1 = lower.pose.x;
    const length2 = hand.pose.x;
    const cosine = (dx * dx + dy * dy - length1 * length1 - length2 * length2) / (2 * length1 * length2);
    const elbow = Math.acos(Math.max(-1, Math.min(1, cosine)));
    const shoulder = Math.atan2(dy, dx) - Math.atan2(length2 * Math.sin(elbow), length1 + length2 * Math.cos(elbow));
    let upperOffset = shoulder * 180 / Math.PI - upper.data.setupPose.rotation;
    upperOffset = ((upperOffset + 180) % 360 + 360) % 360 - 180;
    frame('arm-front-up', 'rotate', time, { value: upperOffset * crouch });
    frame('arm-front-down', 'rotate', time, { value: (elbow * 180 / Math.PI - lower.data.setupPose.rotation) * crouch });
  }
  const reader = new SkeletonJson(null);
  reader.scale = 0.5;
  reader.readAnimation({ bones }, PET_ANIMATION, data);
}

export function createCat() {
  const cat = new Container();
  const shadow = new Graphics().ellipse(2, 3, 44, 7).fill({ color: 0x080b10, alpha: 0.35 });
  const tail = new Graphics()
    .moveTo(23, -14).bezierCurveTo(57, -10, 50, -48, 37, -42)
    .stroke({ color: 0xe7a35e, width: 10, cap: 'round' });
  const body = new Graphics()
    .ellipse(8, -22, 29, 23).fill(0xe7a35e)
    .ellipse(-5, -15, 13, 15).fill(0xffdfb4)
    .roundRect(-21, -6, 21, 9, 4).fill(0xffdfb4)
    .roundRect(13, -5, 21, 8, 4).fill(0xffdfb4);
  const head = new Graphics()
    .poly([-34, -50, -34, -75, -16, -61]).fill(0xe7a35e)
    .poly([-5, -60, 12, -75, 13, -49]).fill(0xe7a35e)
    .poly([-29, -55, -30, -68, -20, -59]).fill(0xf5b6aa)
    .poly([1, -60, 9, -68, 9, -54]).fill(0xf5b6aa)
    .ellipse(-10, -49, 25, 20).fill(0xf4b878)
    .ellipse(-10, -40, 15, 9).fill(0xffe6c5)
    .moveTo(-28, -50).quadraticCurveTo(-23, -55, -18, -50)
    .moveTo(-4, -50).quadraticCurveTo(1, -55, 6, -50)
    .stroke({ color: 0x603d35, width: 2.2, cap: 'round' })
    .poly([-14, -43, -6, -43, -10, -39]).fill(0xb46b65)
    .moveTo(-10, -39).quadraticCurveTo(-15, -34, -18, -38)
    .moveTo(-10, -39).quadraticCurveTo(-5, -34, -2, -38)
    .moveTo(-26, -40).lineTo(-41, -43)
    .moveTo(-26, -36).lineTo(-40, -34)
    .moveTo(7, -40).lineTo(21, -43)
    .moveTo(7, -36).lineTo(21, -34)
    .stroke({ color: 0x603d35, width: 1.4, cap: 'round' });
  cat.addChild(shadow, tail, body, head);
  cat.position.set(CAT_POSITION.x, CAT_POSITION.y);
  return {
    view: cat,
    update(time) {
      const { contact, stroke } = petPhase(time);
      head.y = -2 * contact;
      head.rotation = stroke * 0.025 * contact;
      tail.rotation = Math.sin(time * 2.6) * 0.08;
    },
  };
}
