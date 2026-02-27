import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './layout/admin-layout.component';
import { adminGuard } from '../../core/guards/admin.guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'chat',
        pathMatch: 'full'
      },
      {
        path: 'chat',
        loadComponent: () => import('./chat/chat-index.component').then(m => m.ChatIndexComponent)
      },
      {
        path: 'oa',
        loadComponent: () => import('./official/official-group-list.component').then(m => m.OfficialGroupListComponent)
      },
      {
        path: 'chat/:id',
        loadComponent: () => import('./chat/chat-room.component').then(m => m.ChatRoomComponent)
      },
      {
        path: 'settings',
        canMatch: [adminGuard],
        loadComponent: () => import('./settings/settings.component').then(m => m.SettingsComponent),
        children: [
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
          { path: 'dashboard', loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent) },
          { path: 'users', loadComponent: () => import('./users/user-management.component').then(m => m.UserManagementComponent) },
          { path: 'channels', loadComponent: () => import('./channels/channels').then(m => m.Channels) },
          { path: 'teams', loadComponent: () => import('./teams/teams').then(m => m.TeamsComponent) },
          { path: 'webhooks', loadComponent: () => import('./webhooks/webhook-management.component').then(m => m.WebhookManagementComponent) },
          { path: 'feature-flags', loadComponent: () => import('./feature-flags/feature-flags.component').then(m => m.FeatureFlagsComponent) },
        ]
      },
      {
        path: 'dashboard',
        canMatch: [adminGuard],
        loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'users',
        canMatch: [adminGuard],
        loadComponent: () => import('./users/user-management.component').then(m => m.UserManagementComponent)
      },
      {
        path: 'channels',
        canMatch: [adminGuard],
        loadComponent: () => import('./channels/channels').then(m => m.Channels)
      },
      {
        path: 'teams',
        canMatch: [adminGuard],
        loadComponent: () => import('./teams/teams').then(m => m.TeamsComponent)
      },
      {
        path: '**',
        loadComponent: () => import('./blank/blank.component').then(m => m.BlankPageComponent)
      }
    ]
  }
];
