import { Component, OnInit } from '@angular/core';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
  ToastController, AlertController, Platform 
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { PhotoService } from '../services/photo.service';
import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { addIcons } from 'ionicons';
import { camera, cameraOutline } from 'ionicons/icons';

@Component({
  standalone: true,
  selector: 'app-tab1',
  templateUrl: './tab1.page.html',
  styleUrls: ['./tab1.page.scss'],
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon]
})
export class Tab1Page implements OnInit {
  hasCamera = false;
  lastPhoto?: string;

  constructor(
    private photoService: PhotoService, 
    private toastController: ToastController,
    private alertController: AlertController
  ) {
    addIcons({ camera, cameraOutline });
  }

  async ngOnInit() {
    await this.checkPermissions();
  }

  async checkPermissions() {
    try {
      const status = await Camera.checkPermissions();
      this.hasCamera = status.camera === 'granted' || Capacitor.getPlatform() === 'web';
    } catch (error) {
      console.error('Erreur vérification permissions:', error);
      this.hasCamera = Capacitor.getPlatform() === 'web';
    }
  }

  async requestCameraPermission() {
    try {
      await Camera.requestPermissions();
      await this.checkPermissions();
      
      const toast = await this.toastController.create({
        message: 'Permission accordée',
        duration: 2000,
        color: 'success'
      });
      await toast.present();
    } catch (error) {
      console.error('Erreur permission:', error);
    }
  }

  async takePhoto() {
    try {
      const photo = await this.photoService.capturePhoto();
      
      if (photo) {
        await this.photoService.addPhoto(photo);
        
        this.lastPhoto = photo.webPath;
        
        const toast = await this.toastController.create({
          message: 'Photo prise avec succès !',
          duration: 2000,
          color: 'success'
        });
        await toast.present();
      }
    } catch (error: any) {
      console.error('Erreur capture photo:', error);
      
      const toast = await this.toastController.create({
        message: error?.message || 'Erreur lors de la capture',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    }
  }
}
