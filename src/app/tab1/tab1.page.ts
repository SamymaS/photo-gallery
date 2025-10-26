import { Component, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonFab, IonFabButton,
  ToastController, AlertController, LoadingController 
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { PhotoService } from '../services/photo.service';
import { Capacitor } from '@capacitor/core';
import { addIcons } from 'ionicons';
import { cameraOutline, cameraReverseOutline, radioButtonOnOutline } from 'ionicons/icons';

@Component({
  standalone: true,
  selector: 'app-tab1',
  templateUrl: './tab1.page.html',
  styleUrls: ['./tab1.page.scss'],
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonFab, IonFabButton]
})
export class Tab1Page implements OnDestroy {
  @ViewChild('liveVideo', { static: false }) videoRef?: ElementRef<HTMLVideoElement>;
  
  private videoEl?: HTMLVideoElement;
  private stream?: MediaStream;
  private isInitialized = false;
  
  facingMode: 'user' | 'environment' = 'environment';
  isStreaming = false;
  useFallback = false;
  lastError?: string;
  isCapturing = false;

  constructor(
    private photoService: PhotoService, 
    private toastController: ToastController,
    private alertController: AlertController,
    private loadingController: LoadingController
  ) {
    addIcons({ cameraOutline, cameraReverseOutline, radioButtonOnOutline });
  }

  async ionViewDidEnter() {
    if (!this.isInitialized) {
      await this.initializePermissions();
      this.isInitialized = true;
    }
    
    // Prévisualisation live uniquement sur Web
    if (Capacitor.getPlatform() === 'web') {
      await this.startStream();
    }
  }

  ionViewWillLeave() {
    this.stopStream();
  }

  ngOnDestroy() {
    this.stopStream();
  }

  /**
   * Initialise et vérifie les permissions
   */
  private async initializePermissions(): Promise<void> {
    const hasCameraPermission = await this.photoService.checkCameraPermissions();
    const hasLocationPermission = await this.photoService.checkGeolocationPermissions();

    if (!hasCameraPermission) {
      const alert = await this.alertController.create({
        header: 'Permission Caméra',
        message: 'Cette application nécessite l\'accès à la caméra pour prendre des photos.',
        buttons: ['OK']
      });
      await alert.present();
    }

    if (!hasLocationPermission) {
      console.warn('Permission de géolocalisation non accordée');
    }
  }

  /**
   * Démarre le flux vidéo pour la prévisualisation (Web uniquement)
   */
  private async startStream(): Promise<void> {
    this.stopStream();
    this.isStreaming = false;
    this.useFallback = false;
    this.lastError = undefined;

    // Vérifier la disponibilité de l'API MediaDevices
    const hasMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    
    if (!hasMedia) {
      this.useFallback = true;
      this.lastError = 'API MediaDevices non supportée';
      return;
    }

    // Attendre que la référence vidéo soit disponible
    if (this.videoRef) {
      this.videoEl = this.videoRef.nativeElement;
    } else {
      this.videoEl = document.querySelector('#live-video') ?? undefined;
    }

    if (!this.videoEl) {
      this.useFallback = true;
      this.lastError = 'Élément vidéo non trouvé';
      return;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: this.facingMode },
        audio: false
      });
      
      this.videoEl.srcObject = this.stream;
      await this.videoEl.play();
      this.isStreaming = true;
    } catch (error: any) {
      console.error('Erreur lors du démarrage du flux:', error);
      this.useFallback = true;
      this.lastError = error?.message ?? 'Impossible d\'accéder à la caméra';
    }
  }

  /**
   * Arrête le flux vidéo
   */
  private stopStream(): void {
    this.isStreaming = false;
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = undefined;
    }
    
    if (this.videoEl) {
      this.videoEl.pause();
      (this.videoEl as any).srcObject = null;
    }
  }

  /**
   * Bascule entre caméra avant et arrière (Web uniquement)
   */
  async flipCamera(): Promise<void> {
    if (Capacitor.getPlatform() !== 'web') {
      return;
    }
    
    this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
    await this.startStream();
    
    const toast = await this.toastController.create({
      message: this.facingMode === 'user' ? 'Caméra avant' : 'Caméra arrière',
      duration: 1000
    });
    await toast.present();
  }

  /**
   * Capture une photo
   */
  async capture(): Promise<void> {
    if (this.isCapturing) {
      return;
    }

    this.isCapturing = true;
    const loading = await this.loadingController.create({
      message: 'Capture en cours...',
      duration: 3000
    });
    await loading.present();

    try {
      // Sur Android/iOS : utiliser la caméra native Capacitor
      if (Capacitor.getPlatform() !== 'web') {
        const photo = await this.photoService.capturePhoto();
        
        if (photo) {
          await this.photoService.addPhoto(photo);
          
          const toast = await this.toastController.create({
            message: 'Photo ajoutée à la galerie',
            duration: 2000,
            color: 'success'
          });
          await toast.present();
        }
        return;
      }

      // Sur Web : capture depuis la prévisualisation
      if (!this.isStreaming || !this.videoEl) {
        const photo = await this.photoService.capturePhoto();
        
        if (photo) {
          await this.photoService.addPhoto(photo);
          
          const toast = await this.toastController.create({
            message: 'Photo ajoutée à la galerie',
            duration: 2000,
            color: 'success'
          });
          await toast.present();
        }
        return;
      }

      // Capture depuis le flux vidéo
      const video = this.videoEl;
      const width = video.videoWidth;
      const height = video.videoHeight;

      if (!width || !height) {
        const toast = await this.toastController.create({
          message: 'Flux caméra non prêt',
          duration: 2000,
          color: 'warning'
        });
        await toast.present();
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Impossible d\'obtenir le context canvas');
      }

      ctx.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      
      await this.photoService.addPhotoFromDataUrl(dataUrl);

      const toast = await this.toastController.create({
        message: 'Photo capturée et enregistrée',
        duration: 2000,
        color: 'success'
      });
      await toast.present();

    } catch (error: any) {
      console.error('Erreur lors de la capture:', error);
      
      const toast = await this.toastController.create({
        message: error?.message ?? 'Erreur lors de la capture',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      await loading.dismiss();
      this.isCapturing = false;
    }
  }
}
