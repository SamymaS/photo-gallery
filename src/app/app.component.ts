import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';

@Component({
  standalone: true,
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  constructor() {}

  async ngOnInit() {
    console.log('Plateforme:', Capacitor.getPlatform());
    
    // Demander les permissions au démarrage
    if (Capacitor.getPlatform() !== 'web') {
      await this.requestPermissions();
    }
  }

  private async requestPermissions() {
    // Permission Caméra
    try {
      const cameraStatus = await Camera.checkPermissions();
      if (cameraStatus.camera !== 'granted' || cameraStatus.photos !== 'granted') {
        await Camera.requestPermissions();
      }
    } catch (error) {
      console.error('Erreur permission caméra:', error);
    }

    // Permission Localisation
    try {
      const geoStatus = await Geolocation.checkPermissions();
      if (geoStatus.location !== 'granted') {
        await Geolocation.requestPermissions();
      }
    } catch (error) {
      console.error('Erreur permission localisation:', error);
    }
  }
}
