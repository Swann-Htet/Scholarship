import React, { useEffect, useState } from 'react';
import '../styles/site.css';
import Site from './Site.jsx';
import { api } from '../lib/api.js';
import { defaultSettings } from '../../../shared/defaultSettings.js';
import { applyTheme } from '../lib/theme.js';

// Skeleton page shown while the settings load from the API (shimmering placeholders, no layout jump).
function SiteSkeleton() {
  return (
    <div className="skeleton-page" aria-busy="true" aria-label="Loading">
      <div className="sk-nav"><div className="sk sk-dot" /><div className="sk sk-pill" /></div>
      <div className="sk-hero">
        <div className="sk-col">
          <div className="sk sk-line" style={{ width: '52%' }} />
          <div className="sk sk-title" /><div className="sk sk-title" style={{ width: '62%' }} />
          <div className="sk sk-line" style={{ width: '28%', height: 34 }} />
          <div className="sk-row"><div className="sk sk-pill" /><div className="sk sk-pill" /><div className="sk sk-pill" /></div>
          <div className="sk-row"><div className="sk sk-btn" /><div className="sk sk-btn" /></div>
        </div>
        <div className="sk-art"><div className="sk sk-circle" />{Array.from({ length: 8 }, (_, i) => <div key={i} className="sk sk-person" style={{ '--a': `${i * 45}deg` }} />)}</div>
      </div>
    </div>
  );
}

export default function SiteRoot() {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    applyTheme(defaultSettings); // right colours straight away, even before the API answers
    let live = true;
    api.settings().then(s => live && setSettings(s)).catch(() => live && setSettings(defaultSettings));
    return () => { live = false; };
  }, []);

  return settings ? <Site settings={settings} /> : <SiteSkeleton />;
}
