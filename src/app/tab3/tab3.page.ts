import { Component, AfterViewInit } from '@angular/core';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonSpinner,
  IonFab, IonFabButton, ToastController
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { Geolocation } from '@capacitor/geolocation';
import * as L from 'leaflet';
import 'leaflet.markercluster';
import { PhotoService, UserPhoto } from '../services/photo.service';
import { addIcons } from 'ionicons';
import { mapOutline, locate } from 'ionicons/icons';

// Configuration des icônes Leaflet
const DefaultIcon = L.icon({
  iconRetinaUrl: 'assets/marker-icon-2x.png',
  iconUrl: 'assets/marker-icon.png',
  shadowUrl: 'assets/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

(L.Marker as any).prototype.options.icon = DefaultIcon;

@Component({
  standalone: true,
  selector: 'app-tab3',
  templateUrl: './tab3.page.html',
  styleUrls: ['./tab3.page.scss'],
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonSpinner, IonFab, IonFabButton]
})
export class Tab3Page implements AfterViewInit {
  private map?: L.Map;
  private cluster?: L.MarkerClusterGroup;
  photos: UserPhoto[] = [];
  loading = true;

  constructor(
    private photoService: PhotoService,
    private toastController: ToastController
  ) {
    addIcons({ mapOutline, locate });
  }

  async ngAfterViewInit() {
    // Attendre que le DOM soit complètement rendu
    await this.delay(300);
    await this.initMap();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async initMap() {
    this.loading = true;

    try {
      console.log('Initialisation de la carte...');
      
      await this.photoService.loadSaved();
      this.photos = this.photoService.getPhotosWithCoords();
      
      console.log('Photos avec coordonnées:', this.photos.length);

      // S'assurer que l'élément map existe
      const mapElement = document.getElementById('map');
      if (!mapElement) {
        console.error('Élément #map non trouvé');
        this.loading = false;
        return;
      }

      console.log('Élément map trouvé');

      // Créer la carte
      console.log('Création de la carte Leaflet...');
      this.map = L.map('map', {
        preferCanvas: false
      }).setView([48.8566, 2.3522], 12);
      
      console.log('Carte créée, ajout des tuiles...');
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19
      }).addTo(this.map);

      // Créer les clusters
      this.cluster = L.markerClusterGroup({
        maxClusterRadius: 80,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false
      });

      this.map.addLayer(this.cluster);

      // Ajouter les marqueurs
      console.log('Ajout des marqueurs...');
      this.photos.forEach((photo, index) => {
        if (photo.coords) {
          console.log(`Marqueur ${index + 1}: [${photo.coords.lat}, ${photo.coords.lng}]`);
          const marker = L.marker([photo.coords.lat, photo.coords.lng]);
          
          const popupContent = `
            <div style="text-align: center; padding: 8px;">
              <img src="${photo.webviewPath || photo.filepath}" 
                   style="width: 120px; height: 120px; object-fit: cover; border-radius: 8px;"/>
              <div style="margin-top: 8px; font-size: 12px;">
                ${new Date(photo.takenAt).toLocaleDateString('fr-FR')}
              </div>
            </div>
          `;
          
          marker.bindPopup(popupContent);
          this.cluster!.addLayer(marker);
        }
      });

      console.log('Marqueurs ajoutés. Total:', this.cluster.getLayers().length);

      // Ajuster la vue
      if (this.cluster.getLayers().length > 0) {
        const bounds = this.cluster.getBounds();
        if (bounds.isValid()) {
          console.log('Ajustement de la vue aux marqueurs...');
          this.map.fitBounds(bounds);
        }
      }

      console.log('Carte initialisée avec succès');

    } catch (error) {
      console.error('Erreur initialisation carte:', error);
    } finally {
      this.loading = false;
    }
  }

  async centerMap() {
    try {
      const position = await Geolocation.getCurrentPosition();
      
      if (this.map) {
        this.map.setView([position.coords.latitude, position.coords.longitude], 15);
        
        const toast = await this.toastController.create({
          message: 'Carte centrée',
          duration: 2000
        });
        await toast.present();
      }
    } catch (error) {
      console.error('Erreur centrage:', error);
    }
  }
}
