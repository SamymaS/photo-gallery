import { Component, AfterViewInit } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import 'leaflet.markercluster'; // <- active le plugin
import { PhotoService } from '../services/photo.service';
import { PhotoModalComponent } from '../components/photo-modal/photo-modal.component';

// -- Fix des icônes par défaut Leaflet (assurez-vous d'avoir copié les PNG dans src/assets)
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
  imports: [IonicModule, CommonModule],
})
export class Tab3Page implements AfterViewInit {
  private map?: L.Map;
  private cluster?: L.MarkerClusterGroup;

  constructor(
    public photoSvc: PhotoService,
    private modalCtrl: ModalController
  ) {}

  async ngAfterViewInit() {
    await this.photoSvc.loadSaved();

    // Carte
    this.map = L.map('map').setView([48.8566, 2.3522], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    // Groupe de clusters
    this.cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 16,
      maxClusterRadius: 60,
      chunkedLoading: true,
      removeOutsideVisibleBounds: true,
    });
    this.map.addLayer(this.cluster);

    // Ajout des marqueurs au cluster
    for (const p of this.photoSvc.getPhotos()) {
      if (!p.coords) continue;

      const marker = L.marker([p.coords.lat, p.coords.lng]);
      const img = `<img src="${p.webviewPath || p.filepath}" style="width:120px;height:120px;object-fit:cover;border-radius:8px" />`;
      const date = new Date(p.takenAt).toLocaleString();
      marker.bindPopup(`${img}<div style="margin-top:6px">${date}</div>`);

      marker.on('click', async () => {
        const modal = await this.modalCtrl.create({
          component: PhotoModalComponent,
          componentProps: { photo: p },
          breakpoints: [0, 0.6, 0.9, 1],
          initialBreakpoint: 0.9
        });
        await modal.present();
      });

      this.cluster.addLayer(marker);
    }

    // Ajuste la vue
    const hasMarkers = this.cluster.getLayers().length > 0;
    if (hasMarkers) {
      const bounds = this.cluster.getBounds();
      if (bounds.isValid()) this.map.fitBounds(bounds.pad(0.2));
    }
  }
}
