import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./tabs/tabs.routes').then((m) => m.routes),
  },
  {
    path: 'photo-detail',
    loadComponent: () => import('./pages/photo-detail/photo-detail.page').then( m => m.PhotoDetailPage)
  },
  { path: 'photo/:id', loadComponent: () => import('./pages/photo-detail/photo-detail.page').then(m => m.PhotoDetailPage) }

];
