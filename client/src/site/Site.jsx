import React, { useEffect, useMemo } from 'react';
import { applyTheme, applySpeed } from '../lib/theme.js';
import { setSoundEnabled } from '../lib/sound.js';
import { FigureDefs } from './Figure.jsx';
import { Icons, Scene } from './Decor.jsx';
import { Nav, Hero, Marquee, Why, Objectives, Panel, Workshop, Rules, Schedule, Team, Info, Footer } from './sections.jsx';
import Register from './Register.jsx';
import { initEffects } from './effects.js';

export default function Site({ settings, preview = false }) {
  const fx = useMemo(() => ({ on: settings.animation.people && !matchMedia('(prefers-reduced-motion: reduce)').matches, speed: settings.animation.speed }), [settings.animation.people, settings.animation.speed]);
  const s = settings.sections;

  useEffect(() => { applyTheme(settings, { preview }); setSoundEnabled(settings.animation.sound); applySpeed(settings.animation.speed); document.title = settings.event.title; }, [settings, preview]);
  useEffect(() => initEffects(), [settings.sections]);

  return (
    <>
      <Icons /><FigureDefs /><Scene />
      <div className="scroll-progress" aria-hidden="true"><i /></div>
      <div className="cursor" aria-hidden="true" />
      <Nav settings={settings} />
      <main id="top">
        <Hero settings={settings} fx={fx} />
        <Marquee settings={settings} />
        {s.why && <Why settings={settings} />}
        {s.objectives && <Objectives settings={settings} />}
        {s.panel && <Panel settings={settings} />}
        {s.workshop && <Workshop settings={settings} fx={fx} />}
        {s.rules && <Rules settings={settings} />}
        {s.schedule && <Schedule settings={settings} />}
        {s.team && <Team settings={settings} />}
        <Register settings={settings} />
        {s.info && <Info settings={settings} />}
      </main>
      <Footer settings={settings} />
      <canvas id="confetti" aria-hidden="true" />
    </>
  );
}
