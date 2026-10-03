import { RenderMode, ServerRoute } from '@angular/ssr';
import pages from './seo/pages.json';

export const serverRoutes: ServerRoute[] = [
  {path:'',renderMode:RenderMode.Prerender},
  ...pages.filter(p=>p.prerender).map(p=>({path:p.path,renderMode:RenderMode.Prerender as const})),
  {
    path: '**',
    renderMode: RenderMode.Client
  }
];
