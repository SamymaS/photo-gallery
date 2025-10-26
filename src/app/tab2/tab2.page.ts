import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonGrid, IonRow, IonCol, 
  IonCard, IonCardContent, IonImg, IonFab, IonFabButton, IonIcon, IonSpinner,
  IonButton, IonBadge, ToastController, ModalController, AlertController
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { PhotoService, UserPhoto } from '../services/photo.service';
import { PhotoModalComponent } from '../components/photo-modal/photo-modal.component';
import { addIcons } from 'ionicons';
import { cameraOutline, heart, heartOutline, imagesOutline, location } from 'ionicons/icons';

@Component({
  standalone: true,
  selector: 'app-tab2',
  templateUrl: './tab2.page.html',
  styleUrls: ['./tab2.page.scss'],
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonGrid, IonRow, IonCol,
    IonCard, IonCardContent, IonImg, IonFab, IonFabButton, IonIcon, IonSpinner,
    IonButton, IonBadge
  ]
})
export class Tab2Page implements OnInit {
  photos: UserPhoto[] = [];
  loading = true;
  isEmpty = true;

  constructor(
    private photoService: PhotoService,
    private toastController: ToastController,
    private modalController: ModalController,
    private alertController: AlertController,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ cameraOutline, heart, heartOutline, imagesOutline, location });
  }

  async ngOnInit() {
    await this.loadPhotos();
  }

  /**
   * Charge les photos depuis le service
   */
  async loadPhotos(): Promise<void> {
    this.loading = true;
    try {
      await this.photoService.loadSaved();
      this.photos = this.photoService.getPhotos();
      this.isEmpty = this.photos.length === 0;
    } catch (error) {
      console.error('Erreur lors du chargement des photos:', error);
      this.showToast('Erreur lors du chargement des photos', 'danger');
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * Capture une nouvelle photo
   */
  async capturePhoto(): Promise<void> {
    try {
      // Vérifier les permissions
      const hasCameraPermission = await this.photoService.checkCameraPermissions();
      
      if (!hasCameraPermission) {
        const alert = await this.alertController.create({
          header: 'Permission Caméra',
          message: 'L\'accès à la caméra est requis pour capturer des photos.',
          buttons: ['OK']
        });
        await alert.present();
        return;
      }

      const photo = await this.photoService.capturePhoto();
      
      if (photo) {
        await this.photoService.addPhoto(photo);
        await this.loadPhotos(); // Recharger pour mettre à jour l'affichage
        await this.showToast('Photo ajoutée avec succès', 'success');
      }
    } catch (error: any) {
      console.error('Erreur lors de la capture:', error);
      await this.showToast(error?.message ?? 'Erreur lors de la capture', 'danger');
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
      initialBreakpoint: 0.9,
      cssClass: 'photo-modal'
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    
    if (data?.deleted) {
      await this.loadPhotos(); // Recharger après suppression
    } else if (data?.action === 'map') {
      this.router.navigateByUrl('/tabs/tab3');
    }
  }

  /**
   * Toggle le like d'une photo
   */
  async toggleLike(photo: UserPhoto, event: Event): Promise<void> {
    event.stopPropagation();
    
    try {
      await this.photoService.toggleLike(photo.id);
      await this.loadPhotos(); // Rafraîchir pour mettre à jour le statut
    } catch (error) {
      console.error('Erreur lors du like:', error);
    }
  }

  /**
   * Supprime une photo avec confirmation
   */
  async deletePhoto(photo: UserPhoto, event: Event): Promise<void> {
    event.stopPropagation();

    const alert = await this.alertController.create({
      header: 'Supprimer la photo',
      message: 'Êtes-vous sûr de vouloir supprimer cette photo ?',
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Supprimer',
          role: 'destructive',
          handler: async () => {
            try {
              await this.photoService.deletePhoto(photo);
              await this.loadPhotos();
              await this.showToast('Photo supprimée', 'success');
            } catch (error: any) {
              console.error('Erreur lors de la suppression:', error);
              await this.showToast(error?.message ?? 'Erreur lors de la suppression', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Affiche un message toast
   */
  private async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'top'
    });
    await toast.present();
  }

  /**
   * Recharge les photos (pull-to-refresh)
   */
  async onRefresh(event: any): Promise<void> {
    await this.loadPhotos();
    event.target.complete();
  }
}
