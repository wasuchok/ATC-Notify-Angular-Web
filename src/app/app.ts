import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  Router,
  RouterOutlet,
} from '@angular/router';
import { AlertCenterComponent } from './shared/alert/alert-center.component';
import { SwalOverlayComponent } from './shared/swal/swal-overlay.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AlertCenterComponent, SwalOverlayComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  showSplash = signal(true);
  splashLeaving = signal(false);

  private readonly splashMinDurationMs = 900;
  private readonly splashExitDurationMs = 280;
  private minDurationDone = false;
  private firstRouteSettled = false;
  private routerSub?: Subscription;
  private minDurationTimer?: ReturnType<typeof setTimeout>;
  private splashHideTimer?: ReturnType<typeof setTimeout>;

  constructor(private readonly router: Router) {}

  ngOnInit() {
    this.minDurationTimer = setTimeout(() => {
      this.minDurationDone = true;
      this.tryHideSplash();
    }, this.splashMinDurationMs);

    this.routerSub = this.router.events.subscribe((event) => {
      if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.firstRouteSettled = true;
        this.tryHideSplash();
      }
    });
  }

  ngOnDestroy() {
    if (this.minDurationTimer) clearTimeout(this.minDurationTimer);
    if (this.splashHideTimer) clearTimeout(this.splashHideTimer);
    this.routerSub?.unsubscribe();
  }

  private tryHideSplash() {
    if (!this.firstRouteSettled || !this.minDurationDone) return;
    if (!this.showSplash() || this.splashLeaving()) return;

    this.splashLeaving.set(true);
    this.splashHideTimer = setTimeout(() => {
      this.showSplash.set(false);
      this.splashLeaving.set(false);
    }, this.splashExitDurationMs);
  }
}
