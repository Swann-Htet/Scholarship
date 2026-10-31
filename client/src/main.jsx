import React, { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';

// Three apps in one bundle: the public site, the admin panel and the volunteer check-in page.
// Each loads its own CSS only when needed.
const path = location.pathname;
const App = path.startsWith('/admin') ? lazy(() => import('./admin/Admin.jsx'))
  : path.startsWith('/checkin') ? lazy(() => import('./checkin/CheckIn.jsx'))
    : lazy(() => import('./site/SiteRoot.jsx'));

createRoot(document.getElementById('root')).render(
  <Suspense fallback={null}><App /></Suspense>
);
