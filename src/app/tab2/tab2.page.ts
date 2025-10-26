import { Component, OnInit } from '@angular/core';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, 
  IonThumbnail, IonLabel, IonButton, IonIcon, IonSpinner,
  ToastController, AlertController
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { PhotoService, UserPhoto } from '../services/photo.service';
import { addIcons } from 'ionicons';
import { imagesOutline, heart, heartOutline, trash } from 'ionicons/icons';

@Component({
  standalone: true,
  selector: 'app-tab2',
  templateUrl: './tab2.page.html',
  styleUrls: ['./tab2.page.scss'],
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem,
    IonThumbnail, IonLabel, IonButton, IonIcon, IonSpinner
  ]
})
export class Tab2Page implements OnInit {
  photos: UserPhoto[] = [];

  constructor(
    private photoService: PhotoService,
    private toastController: ToastController,
    private alertController: AlertController
  ) {
    addIcons({ imagesOutline, heart, heartOutline, trash });
  }

  async ngOnInit() {
    await this.loadPhotos();
  }

  async loadPhotos() {
    await this.photoService.loadSaved();
    this.photos = this.photoService.getPhotos();
  }

  async toggleLike(photo: UserPhoto) {
    await this.photoService.toggleLike(photo.id);
    await this.loadPhotos();
  }

  async deletePhoto(photo: UserPhoto) {
    const alert = await this.alertController.create({
      header: 'Supprimer ?',
      message: 'Êtes-vous sûr de vouloir supprimer cette photo ?',
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Supprimer',
          role: 'destructive',
          handler: async () => {
            await this.photoService.deletePhoto(photo);
            await this.loadPhotos();
          }
        }
      ]
    });
    await alert.present();
  }
}
