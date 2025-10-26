import { Component, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonSpinner,
  IonFab, IonFabButton, ModalController, ToastController, AlertController
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Geolocation } from '@capacitor/geolocation';
import * as L from 'leaflet';
import 'leaflet.markercluster';
import { PhotoService, UserPhoto } from '../services/photo.service';
import { PhotoModalComponent } from '../components/photo-modal/photo-modal.component';
import { addIcons } from 'ionicons';
import { mapOutline, compassOutline, locationOutline } from 'ionicons/icons';

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
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonSpinner, IonFab, IonFabButton]
})
export class Tab3Page implements AfterViewInit, OnDestroy {
  private map?: L.Map;
  private cluster?: L.MarkerClusterGroup;
  private markers: L.Marker[] = [];
  
  photos: UserPhoto[] = [];
  loading = true;
  isEmpty = false;
  centerOnUser = false;

  constructor(
    private photoService: PhotoService,
    private modalController: ModalController,
    private toastController: ToastController,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ mapOutline, compassOutline, locationOutline });
  }

  async ngAfterViewInit() {
    await this.initializeMap();
  }

  ngOnDestroy() {
    this.cleanup();
  }

  /**
   * Initialise la carte avec les marqueurs
   */
  private async initializeMap(): Promise<void> {
    this.loading = true;

    try {
      await this.photoService.loadSaved();
      this.photos = this.photoService.getPhotosWithCoords();
      this.isEmpty = this.photos.length === 0;

      // Initialiser la carte
      await this.createMap();
      
      if (!this.isEmpty) {
        await this.addMarkersToMap();
      }

      this.loading = false;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de la carte:', error);
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * Crée l'instance de la carte Leaflet
   */
  private async createMap(): Promise<void> {
    const container = document.getElementById('map');
    if (!container) {
      throw new Error('Conteneur de carte non trouvé');
    }

    // Déterminer le centre initial
    let center: [number, number] = [48.8566, 2.3522]; // Paris par défaut
    let zoom = 12;

    if (this.photos.length > 0) {
      const bounds = this.calculateBounds(this.photos);
      center = bounds.center;
      zoom = bounds.zoom;
    }

    this.map = L.map('map').setView(center, zoom);

    // Ajouter la tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(this.map);

    // Créer le groupe de clusters
    this.cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 16,
      maxClusterRadius: 80,
      chunkedLoading: true,
      removeOutsideVisibleBounds: true,
      animate: true,
      zoomToBoundsOnClick: true
    });

    this.map.addLayer(this.cluster);
  }

  /**
   * Ajoute les marqueurs à la carte
   */
  private async addMarkersToMap(): Promise<void> {
    if (!this.map || !this.cluster) return;

    for (const photo of this.photos) {
      if (!photo.coords) continue;

      // Créer un marqueur personnalisé
      const marker = L.marker([photo.coords.lat, photo.coords.lng], {
        icon: DefaultIcon
      });

      // Créer le contenu du popup
      const imgUrl = photo.webviewPath || photo.filepath;
      const date = new Date(photo.takenAt);
      const formattedDate = date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const popupContent = `
        <div style="text-align: center; padding: 4px; cursor: pointer;" 
             class="popup-content"
             onclick="window.dispatchEvent(new CustomEvent('openPhotoModal', {detail: ${JSON.stringify(photo.id)}}));">
          <img src="${imgUrl}" 
               style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; margin-bottom: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);" 
               loading="lazy" />
          <div style="font-size: 11px; color: #666; font-weight: 500;">
            ${formattedDate}
          </div>
          ${photo.liked ? '<div style="margin-top: 4px;"><span style="color: #eb445a; font-size: 14px;">❤️</span></div>' : ''}
          <div style="margin-top: 8px; padding: 4px 8px; background: var(--ion-color-primary); color: white; border-radius: 12px; font-size: 10px; font-weight: 600;">
            Voir détails →
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        className: 'photo-popup',
        maxWidth: 150,
        offset: [0, -10]
      });

      // Gérer le clic sur le marqueur pour ouvrir la modal directement
      marker.on('click', (e) => {
        e.target.closePopup(); // Fermer le popup
        this.openPhotoDetail(photo);
      });

      // Ajouter au cluster
      this.cluster.addLayer(marker);
      this.markers.push(marker);
    }

    // Ajuster la vue pour afficher tous les marqueurs
    if (this.cluster.getLayers().length > 0) {
      const bounds = this.cluster.getBounds();
      if (bounds.isValid()) {
        this.map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 14
        });
      }
    }
  }

  /**
   * Ouvre la modal de détail pour une photo
   */
  async openPhotoDetail(photo: UserPhoto): Promise<void> {
    const modal = await this.modalController.create({
      component: PhotoModalComponent,
      componentProps: { photo },
      breakpoints: [0, 0.6, 0.9, 1],
      initialBreakpoint: 0.9
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    
    if (data?.deleted) {
      await this.initializeMap(); // Recharger après suppression
    }
  }

  /**
   * Centre la carte sur la position de l'utilisateur
   */
  async centerOnMyLocation(): Promise<void> {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true
      });

      if (this.map) {
        this.map.setView(
          [position.coords.latitude, position.coords.longitude],
          15
        );

        const toast = await this.toastController.create({
          message: 'Carte centrée sur votre position',
          duration: 2000,
          position: 'top'
        });
        await toast.present();
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de la position:', error);
      
      const toast = await this.toastController.create({
        message: 'Impossible de récupérer votre position',
        duration: 2000,
        position: 'top',
        color: 'warning'
      });
      await toast.present();
    }
  }

  /**
   * Calcule les limites et le centre de la carte
   */
  private calculateBounds(photos: UserPhoto[]): { center: [number, number], zoom: number } {
    const lats = photos.map(p => p.coords!.lat);
    const lngs = photos.map(p => p.coords!.lng);

    const centerLat = (Math.max(...lats) + Math.min(...lats)) / 2;
    const centerLng = (Math.max(...lngs) + Math.min(...lngs)) / 2;

    return {
      center: [centerLat, centerLng],
      zoom: 12
    };
  }

  /**
   * Nettoie les ressources
   */
  private cleanup(): void {
    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }
    if (this.cluster) {
      this.cluster.clearLayers();
      this.cluster = undefined;
    }
    this.markers = [];
  }
}
