import { bootstrapApplication } from '@angular/platform-browser';
import { AppShellComponent } from './app/layout/app-shell/app-shell.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppShellComponent, appConfig)
  .catch((err) => console.error(err));
