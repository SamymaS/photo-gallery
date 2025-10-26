import { Component, Input, OnInit } from '@angular/core';
import { 
  IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonTitle, 
  IonContent, IonImg, IonList, IonItem, IonLabel, IonBadge, IonSpinner,
  ModalController, ToastController 
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { UserPhoto, PhotoService } from '../../services/photo.service';
import { addIcons } from 'ionicons';
import { closeOutline, heart, heartOutline, calendarOutline, locationOutline, mapOutline, trashOutline } from 'ionicons/icons';

@Component({
  standalone: true,
  selector: 'app-photo-modal',
  templateUrl: './photo-modal.component.html',
  styleUrls: ['./photo-modal.component.scss'],
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonTitle, IonContent,
    IonImg, IonList, IonItem, IonLabel, IonBadge, IonSpinner
  ],
})
export class PhotoModalComponent implements OnInit {
  @Input() photo!: UserPhoto;
  address?: string;
  isLoadingAddress = false;

  constructor(
    private modalController: ModalController,
    public photoService: PhotoService,
    private toastController: ToastController
  ) {
    addIcons({ closeOutline, heart, heartOutline, calendarOutline, locationOutline, mapOutline, trashOutline });
  }

  async ngOnInit() {
    // Charger l'adresse lisible (optionnel)
    if (this.photo?.coords) {
      this.isLoadingAddress = true;
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${this.photo.coords.lat}&lon=${this.photo.coords.lng}&format=json&zoom=18&addressdetails=1`;
        const resp = await fetch(url, { 
          headers: { 
            'Accept-Language': 'fr',
            'User-Agent': 'PhotoGalleryApp'
          } 
        });
        const data = await resp.json();
        this.address = data?.display_name || undefined;
      } catch (error) {
        console.warn('Impossible de charger l\'adresse:', error);
      } finally {
        this.isLoadingAddress = false;
      }
    }
  }

  /**
   * Toggle le statut "liké" de la photo
   */
  async toggleLike(): Promise<void> {
    try {
      await this.photoService.toggleLike(this.photo.id);
      
      const toast = await this.toastController.create({
        message: this.photo.liked ? 'Photo likée ❤️' : 'Like retiré',
        duration: 1500,
        color: 'success'
      });
      await toast.present();
    } catch (error) {
      console.error('Erreur lors du like:', error);
    }
  }

  /**
   * Supprime la photo
   */
  async delete(): Promise<void> {
    try {
      await this.photoService.deletePhoto(this.photo);
      
      const toast = await this.toastController.create({
        message: 'Photo supprimée',
        duration: 1500,
        color: 'success'
      });
      await toast.present();
      
      this.modalController.dismiss({ action: 'deleted', id: this.photo.id }, 'delete');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      
      const toast = await this.toastController.create({
        message: 'Erreur lors de la suppression',
        duration: 2000,
        color: 'danger'
      });
      await toast.present();
    }
  }

  /**
   * Ouvre la carte pour voir la localisation
   */
  openOnMap(): void {
    this.modalController.dismiss({ action: 'map', id: this.photo.id }, 'map');
  }

  /**
   * Ferme la modal
   */
  close(): void {
    this.modalController.dismiss(null, 'close');
  }

  /**
   * Formate la date de prise de photo
   */
  getDateLabel(): string {
    const date = new Date(this.photo.takenAt);
    return date.toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Formate les coordonnées GPS
   */
  getCoordinatesLabel(): string {
    if (!this.photo.coords) return 'Non disponible';
    return `${this.photo.coords.lat.toFixed(6)}, ${this.photo.coords.lng.toFixed(6)}`;
  }
}
