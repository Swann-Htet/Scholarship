import React, { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';

// Two apps in one bundle: the public site and the admin panel. Each loads its own CSS only when needed.
const isAdmin = location.pathname.startsWith('/admin');
const App = isAdmin ? lazy(() => import('./admin/Admin.jsx')) : lazy(() => import('./site/SiteRoot.jsx'));

createRoot(document.getElementById('root')).render(
  <Suspense fallback={null}><App /></Suspense>
);
