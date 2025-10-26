import { Component, OnDestroy } from '@angular/core';
import { IonicModule, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { PhotoService } from '../services/photo.service';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

@Component({
  standalone: true,
  selector: 'app-tab1',
  templateUrl: './tab1.page.html',
  styleUrls: ['./tab1.page.scss'],
  imports: [IonicModule, CommonModule],
})
export class Tab1Page implements OnDestroy {
  private videoEl?: HTMLVideoElement;
  private stream?: MediaStream;
  facingMode: 'user' | 'environment' = 'user';
  isStreaming = false;
  useFallback = false;
  lastError?: string;

  constructor(private photos: PhotoService, private toast: ToastController) {}

  async ionViewDidEnter() {
    // Préview live uniquement sur Web
    if (Capacitor.getPlatform() === 'web') {
      const el = document.querySelector<HTMLVideoElement>('#live-video');
      this.videoEl = el ?? undefined;
      await this.startStream();
    }
  }
  ionViewWillLeave() { this.stopStream(); }
  ngOnDestroy() { this.stopStream(); }

  private async startStream() {
    this.stopStream();
    this.isStreaming = false; this.useFallback = false; this.lastError = undefined;

    const hasMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    if (!hasMedia || !this.videoEl) { this.useFallback = true; return; }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: this.facingMode }, audio: false
      });
      this.videoEl.srcObject = this.stream;
      await this.videoEl.play();
      this.isStreaming = true;
    } catch (e: any) {
      this.useFallback = true;
      this.lastError = e?.message ?? 'Impossible d’accéder à la caméra';
    }
  }

  private stopStream() {
    this.isStreaming = false;
    if (this.stream) { this.stream.getTracks().forEach(t => t.stop()); this.stream = undefined; }
    if (this.videoEl) { this.videoEl.pause(); (this.videoEl as any).srcObject = null; }
  }

  async flipCamera() {
    if (Capacitor.getPlatform() !== 'web') return;
    this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
    await this.startStream();
  }

  async capture() {
    // Sur Android/iOS: caméra native Capacitor
    if (Capacitor.getPlatform() !== 'web') {
      try {
        const shot = await Camera.getPhoto({
          quality: 85, allowEditing: false,
          resultType: CameraResultType.Uri,
          source: CameraSource.Camera
        });
        await this.photos.addFromPhoto(shot);
        (await this.toast.create({ message: 'Photo ajoutée', duration: 1100 })).present();
      } catch { /* annulé */ }
      return;
    }

    // Sur Web: capture depuis la préview (fallback sinon)
    if (!this.isStreaming || !this.videoEl) {
      await this.photos.addNewToGallery();
      (await this.toast.create({ message: 'Photo ajoutée', duration: 1100 })).present();
      return;
    }

    const v = this.videoEl;
    const w = v.videoWidth, h = v.videoHeight;
    if (!w || !h) {
      (await this.toast.create({ message: 'Flux caméra non prêt', duration: 1300, color: 'warning' })).present();
      return;
    }
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(v, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    await this.photos.addFromDataUrl(dataUrl);
    (await this.toast.create({ message: 'Selfie enregistré', duration: 1200 })).present();
  }
}
