import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet, ToastController } from '@ionic/angular/standalone';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { Camera } from '@capacitor/camera';

@Component({
  standalone: true,                       // ✅ important pour un root component standalone
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  constructor(private toast: ToastController) {}

  async ngOnInit() {
    if (Capacitor.getPlatform() !== 'web') {
      await this.ensurePermissions();
    }
  }

  private async ensurePermissions() {
    // Localisation
    try {
      const geo = await Geolocation.requestPermissions();
      if ((geo as any)?.location !== 'granted') {
        await this.warn('Permission localisation refusée — les marqueurs géolocalisés et le centrage de la carte peuvent ne pas fonctionner.');
      }
    } catch {
      await this.warn('Impossible de demander la permission localisation.');
    }

    // Caméra
    try {
      const cam = await Camera.requestPermissions();
      if ((cam as any)?.camera !== 'granted') {
        await this.warn('Permission caméra refusée — la prise de photo ne fonctionnera pas.');
      }
    } catch {
      await this.warn('Impossible de demander la permission caméra.');
    }
  }

  private async warn(message: string) {
    const t = await this.toast.create({ message, duration: 2500, color: 'warning' });
    await t.present();
  }
}
