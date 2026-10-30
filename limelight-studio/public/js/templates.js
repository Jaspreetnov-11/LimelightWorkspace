// Size presets and Limelight-branded starter templates (plain Fabric JSON).
const SIZES = [
  { name: 'Instagram Post', w: 1080, h: 1080, cat: 'Social' },
  { name: 'Instagram Portrait', w: 1080, h: 1350, cat: 'Social' },
  { name: 'Story / Reel cover', w: 1080, h: 1920, cat: 'Social' },
  { name: 'Facebook / LinkedIn', w: 1200, h: 630, cat: 'Social' },
  { name: 'YouTube Thumbnail', w: 1280, h: 720, cat: 'Video' },
  { name: 'Presentation 16:9', w: 1920, h: 1080, cat: 'Deck' },
  { name: 'A4 Poster', w: 2480, h: 3508, cat: 'Print 300dpi' },
  { name: 'A5 Flyer', w: 1748, h: 2480, cat: 'Print 300dpi' },
  { name: 'Business Card', w: 1050, h: 600, cat: 'Print 300dpi' },
  { name: 'Logo', w: 1000, h: 1000, cat: 'Brand' },
  { name: 'Backdrop 16×8 ft', w: 5760, h: 2880, cat: 'Event' },
  { name: 'Standee 3×6 ft', w: 1080, h: 2160, cat: 'Event' },
];

const LL = {
  yellow: '#ffc21a', black: '#0b0c0f', white: '#ffffff', cream: '#f6f1e6',
  tri: 'M3 30.5 92.6 3.4c3.3-1 6.4 2 5.6 5.3L76.4 93.6c-1.2 4.7-7.3 5.6-9.6 1.4C57.3 77.6 42 63.4 6 44.4 0.8 41.6 0 33.4 3 30.5z',
};

// tiny builders
const tx = (text, o) => ({ type: 'textbox', text, fontFamily: 'Inter', fontWeight: 700, fill: '#ffffff', fontSize: 60, lineHeight: 1.12,
  textAlign: 'left', charSpacing: 0, styles: {}, name: o.name || text.slice(0, 24), ...o });
const rc = (o) => ({ type: 'rect', fill: LL.yellow, strokeWidth: 0, name: 'Rectangle', ...o });
const tri = (o) => ({ type: 'path', path: fabric.util.parsePath(LL.tri), fill: LL.yellow, strokeWidth: 0, name: 'Limelight triangle',
  width: 98.4, height: 96.9, pathOffset: { x: 50.4, y: 50.1 }, ...o });
const logo = (dark, x, y, w) => ({ type: 'image', src: `img/limelight-logo-${dark ? 'black' : 'white'}.png`, left: x, top: y,
  width: 2000, height: 500, scaleX: w / 2000, scaleY: w / 2000, name: 'Limelight logo' });
const ph = (o) => ({ type: 'rect', fill: '#2a2f3a', stroke: '#ffc21a', strokeWidth: 3, strokeDashArray: [14, 10], placeholder: true,
  name: 'Photo placeholder (drop image here)', ...o });
const grad = (c1, c2, angle = 90) => {
  const a = ((angle - 90) * Math.PI) / 180;
  return { type: 'linear', gradientUnits: 'percentage', coords: { x1: 0.5 - Math.cos(a) / 2, y1: 0.5 - Math.sin(a) / 2, x2: 0.5 + Math.cos(a) / 2, y2: 0.5 + Math.sin(a) / 2 },
    colorStops: [{ offset: 0, color: c1 }, { offset: 1, color: c2 }] };
};
const page = (w, h, fill) => ({ type: 'rect', left: 0, top: 0, width: w, height: h, fill, isPage: true, selectable: false, evented: false, strokeWidth: 0, name: 'Page', id: 'page' });

const TEMPLATES = [
  { id: 'announce', name: 'Big Announcement', cat: 'Instagram Post', w: 1080, h: 1080, build: (w, h) => [
    page(w, h, LL.black),
    tri({ left: 600, top: -90, scaleX: 6.2, scaleY: 6.2, opacity: 0.95 }),
    rc({ left: 80, top: 120, width: 210, height: 54, rx: 27, ry: 27, fill: '#ffffff' }),
    tx('NEW LAUNCH', { left: 80, top: 132, width: 210, fontSize: 26, fill: LL.black, textAlign: 'center', charSpacing: 120, fontWeight: 800 }),
    tx('Something\nbig is\ncoming.', { left: 80, top: 330, width: 820, fontSize: 132, fontWeight: 900, lineHeight: 0.98 }),
    tx('Stay tuned for the reveal on 15th November', { left: 80, top: 780, width: 600, fontSize: 36, fontWeight: 500, fill: '#c9cdd6' }),
    logo(false, 80, 930, 300),
  ] },
  { id: 'quote', name: 'Quote Card', cat: 'Instagram Post', w: 1080, h: 1080, build: (w, h) => [
    page(w, h, LL.cream),
    tx('“', { left: 70, top: 20, width: 300, fontSize: 380, fontFamily: 'Georgia', fill: LL.yellow, fontWeight: 700 }),
    tx('Design is not just what it looks like. Design is how it works.', { left: 90, top: 330, width: 900, fontSize: 70, fontFamily: 'Georgia', fill: '#1a1a1a', fontWeight: 400, lineHeight: 1.2 }),
    rc({ left: 92, top: 770, width: 80, height: 8, fill: LL.yellow }),
    tx('Steve Jobs', { left: 90, top: 800, width: 600, fontSize: 38, fill: '#1a1a1a', fontWeight: 700 }),
    logo(true, 690, 960, 300),
  ] },
  { id: 'hindi', name: 'Hindi Greeting', cat: 'Instagram Portrait', w: 1080, h: 1350, build: (w, h) => [
    page(w, h, grad('#ff8a00', '#c2185b', 160)),
    { type: 'circle', left: 340, top: 160, radius: 200, fill: '#ffd54f', opacity: 0.35, name: 'Glow' },
    { type: 'circle', left: 440, top: 260, radius: 100, fill: '#fff3c4', name: 'Sun' },
    tx('शुभ दीपावली', { left: 60, top: 560, width: 960, fontSize: 150, fontFamily: 'Rozha One', fontWeight: 400, textAlign: 'center', fill: '#ffffff' }),
    tx('आपको और आपके परिवार को प्रकाश पर्व की हार्दिक शुभकामनाएँ', { left: 140, top: 790, width: 800, fontSize: 46, fontFamily: 'Mukta', fontWeight: 500, textAlign: 'center', fill: '#fff4e0' }),
    logo(false, 390, 1200, 300),
  ] },
  { id: 'event', name: 'Event Poster', cat: 'A4 Poster', w: 1240, h: 1754, build: (w, h) => [
    page(w, h, LL.black),
    ph({ left: 0, top: 0, width: 1240, height: 860 }),
    tri({ left: 860, top: 700, scaleX: 3.6, scaleY: 3.6 }),
    tx('YOUTH\nSUMMIT 2026', { left: 90, top: 940, width: 1000, fontSize: 140, fontWeight: 900, lineHeight: 0.95 }),
    rc({ left: 90, top: 1260, width: 120, height: 10 }),
    tx('20 NOV · 10:00 AM', { left: 90, top: 1310, width: 900, fontSize: 52, fontWeight: 700, fill: LL.yellow }),
    tx('Bharat Mandapam, New Delhi', { left: 90, top: 1385, width: 900, fontSize: 44, fontWeight: 500, fill: '#c9cdd6' }),
    logo(false, 90, 1600, 360),
  ] },
  { id: 'yt', name: 'YouTube Thumbnail', cat: 'YouTube', w: 1280, h: 720, build: (w, h) => [
    page(w, h, LL.yellow),
    ph({ left: 700, top: 0, width: 580, height: 720 }),
    tx('5 SECRETS\nOF GREAT\nDESIGN', { left: 60, top: 120, width: 700, fontSize: 118, fontWeight: 900, fill: LL.black, lineHeight: 0.95, stroke: '#ffffff', strokeWidth: 0 }),
    rc({ left: 60, top: 520, width: 300, height: 70, rx: 12, ry: 12, fill: LL.black }),
    tx('WATCH NOW', { left: 60, top: 535, width: 300, fontSize: 36, fill: LL.yellow, textAlign: 'center', fontWeight: 800 }),
    logo(true, 60, 640, 200),
  ] },
  { id: 'story', name: 'Story Promo', cat: 'Story', w: 1080, h: 1920, build: (w, h) => [
    page(w, h, grad('#0b0c0f', '#2b2200', 180)),
    tri({ left: 240, top: 380, scaleX: 6.2, scaleY: 6.2 }),
    tx('Limited\nseats.', { left: 80, top: 1080, width: 920, fontSize: 150, fontWeight: 900, lineHeight: 0.98 }),
    tx('Masterclass on visual storytelling for brands and government campaigns.', { left: 80, top: 1430, width: 860, fontSize: 44, fontWeight: 500, fill: '#c9cdd6' }),
    rc({ left: 80, top: 1640, width: 420, height: 100, rx: 50, ry: 50 }),
    tx('Register now →', { left: 80, top: 1666, width: 420, fontSize: 40, fontWeight: 800, fill: LL.black, textAlign: 'center' }),
    logo(false, 80, 140, 320),
  ] },
  { id: 'deck', name: 'Presentation Title', cat: 'Presentation', w: 1920, h: 1080, build: (w, h) => [
    page(w, h, LL.black),
    tri({ left: 1150, top: 160, scaleX: 7.4, scaleY: 7.4 }),
    tx('CAMPAIGN STRATEGY', { left: 140, top: 300, width: 900, fontSize: 32, fontWeight: 700, fill: LL.yellow, charSpacing: 300 }),
    tx('Viksit Bharat\nYouth Connect', { left: 140, top: 370, width: 1100, fontSize: 130, fontWeight: 900, lineHeight: 1 }),
    tx('Concept note · November 2026', { left: 140, top: 720, width: 900, fontSize: 40, fontWeight: 500, fill: '#9aa1ae' }),
    logo(false, 140, 930, 340),
  ] },
  { id: 'card', name: 'Business Card', cat: 'Business Card', w: 1050, h: 600, build: (w, h) => [
    page(w, h, LL.black),
    tri({ left: 820, top: -40, scaleX: 2.8, scaleY: 2.8 }),
    logo(false, 70, 80, 360),
    tx('Your Name', { left: 70, top: 330, width: 700, fontSize: 52, fontWeight: 800 }),
    tx('Designation', { left: 70, top: 395, width: 700, fontSize: 28, fontWeight: 500, fill: LL.yellow }),
    tx('name@limelightcorp.net  ·  limelightcorp.net', { left: 70, top: 490, width: 900, fontSize: 24, fontWeight: 500, fill: '#9aa1ae' }),
  ] },
];

function templateProject(t) {
  const proj = newProject(t.w, t.h, t.name);
  proj.pages[0].json = { version: '5.3.0', objects: t.build(t.w, t.h).map((o) => ({ ...o, id: o.id || uid() })) };
  return proj;
}
