import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonSpinner,
  IonFab, IonFabButton, IonButton, ToastController, ModalController
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Geolocation } from '@capacitor/geolocation';
import { PhotoService, UserPhoto } from '../services/photo.service';
import { PhotoModalComponent } from '../components/photo-modal/photo-modal.component';
import { addIcons } from 'ionicons';
import { mapOutline, locate, camera } from 'ionicons/icons';
import * as L from 'leaflet';
import 'leaflet.markercluster';

@Component({
  standalone: true,
  selector: 'app-tab3',
  templateUrl: './tab3.page.html',
  styleUrls: ['./tab3.page.scss'],
  imports: [CommonModule, RouterLink, IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonSpinner, IonFab, IonFabButton, IonButton]
})
export class Tab3Page implements OnInit, AfterViewInit {
  photos: UserPhoto[] = [];
  loading = true;

  constructor(
    private photoService: PhotoService,
    private toastController: ToastController,
    private modalController: ModalController,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ mapOutline, locate, camera });
  }

  async ngOnInit() {
    await this.loadPhotos();
  }

  ngAfterViewInit() {
    setTimeout(() => this.initLeaflet(), 300);
  }

  async loadPhotos() {
    try {
      await this.photoService.loadSaved();
      this.photos = this.photoService.getPhotosWithCoords();
      this.loading = false;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Erreur chargement photos:', error);
      this.loading = false;
    }
  }

  async initLeaflet() {
    try {
      const mapElement = document.getElementById('map');
      if (!mapElement) {
        console.error('Élément #map introuvable');
        return;
      }

      // Configurer les icônes par défaut
      const DefaultIcon = L.icon({
        iconUrl: 'assets/marker-icon.png',
        shadowUrl: 'assets/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        shadowSize: [41, 41]
      });

      L.Marker.prototype.options.icon = DefaultIcon;

      // Créer la carte
      const map = L.map('map').setView([48.8566, 2.3522], 12);

      // Ajouter les tuiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(map);

      console.log('Carte créée');

      // Créer un groupe de clusters
      const markerClusterGroup = L.markerClusterGroup({
        maxClusterRadius: 80,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false
      });

      // Ajouter les marqueurs au cluster
      if (this.photos.length > 0) {
        for (const photo of this.photos) {
          if (photo.coords) {
            const marker = L.marker([photo.coords.lat, photo.coords.lng]);
            
            // Obtenir le nom de la ville
            const city = await this.getCityName(photo.coords.lat, photo.coords.lng);
            const dateStr = new Date(photo.takenAt).toLocaleDateString('fr-FR');
            
            // Créer le contenu du popup
            const popupContent = city 
              ? `<div style="text-align: center; padding: 4px;"><strong>${city}</strong><br>${dateStr}</div>`
              : `<div style="text-align: center; padding: 4px;">${dateStr}</div>`;
            
            marker.bindPopup(popupContent);
            
            // Ouvrir la modal au clic
            marker.on('click', () => {
              this.openPhotoModal(photo);
            });
            
            markerClusterGroup.addLayer(marker);
          }
        }

        map.addLayer(markerClusterGroup);

        console.log(`${this.photos.length} marqueurs ajoutés au cluster`);

        // Ajuster la vue
        if (this.photos.length > 0) {
          map.fitBounds(markerClusterGroup.getBounds().pad(0.2));
        }
      }

    } catch (error) {
      console.error('Erreur initialisation Leaflet:', error);
    }
  }

  private async getCityName(lat: number, lng: number): Promise<string | null> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'fr',
            'User-Agent': 'PhotoGalleryApp'
          }
        }
      );
      
      const data = await response.json();
      return data.address?.city || data.address?.town || data.address?.village || null;
    } catch (error) {
      console.warn('Erreur reverse geocoding:', error);
      return null;
    }
  }

  async openPhotoModal(photo: UserPhoto) {
    const modal = await this.modalController.create({
      component: PhotoModalComponent,
      componentProps: { photo },
      breakpoints: [0, 0.6, 0.9, 1],
      initialBreakpoint: 0.9
    });

    await modal.present();
  }

  async centerOnLocation() {
    try {
      const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      
      const toast = await this.toastController.create({
        message: `Position: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`,
        duration: 3000,
        color: 'success'
      });
      await toast.present();
    } catch (error: any) {
      console.error('Erreur géolocalisation:', error);
      
      const toast = await this.toastController.create({
        message: 'Activez la géolocalisation dans les paramètres',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    }
  }
}
