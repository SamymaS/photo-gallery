import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

export interface UserPhoto {
  id: string;
  filepath: string;
  webviewPath?: string;
  coords?: { lat: number; lng: number };
  takenAt: number;
  liked?: boolean;
}

const PHOTO_STORAGE_KEY = 'photos_v1';

@Injectable({ providedIn: 'root' })
export class PhotoService {
  private _photos: UserPhoto[] = [];
  getPhotos() { return this._photos; }
  getById(id: string) { return this._photos.find(p => p.id === id); }

  private async saveStore() {
    await Preferences.set({ key: PHOTO_STORAGE_KEY, value: JSON.stringify(this._photos) });
  }

  async loadSaved() {
    const { value } = await Preferences.get({ key: PHOTO_STORAGE_KEY });
    this._photos = value ? JSON.parse(value) : [];

    // Sur web, reconstruire une DataURL affichable depuis le FS
    if (Capacitor.getPlatform() === 'web') {
      for (const p of this._photos) {
        try {
          const filename = p.filepath.split('/').pop()!;
          const file = await Filesystem.readFile({ path: filename, directory: Directory.Data });
          let dataUrl: string;
          const anyFile = file as any;
          if (typeof anyFile.data === 'string') {
            const s = anyFile.data as string;
            dataUrl = s.startsWith('data:') ? s : `data:image/jpeg;base64,${s}`;
          } else {
            const blob = anyFile.data as Blob;
            dataUrl = (await this.blobToBase64(blob)) as string;
          }
          p.webviewPath = dataUrl;
        } catch {
          // ignore si fichier manquant
        }
      }
    }
  }

  // ► Flux caméra (Capacitor) générique avec fallback
  async addNewToGallery() {
    let captured: Photo | null = null;
    try {
      captured = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
      });
    } catch {
      try {
        captured = await Camera.getPhoto({
          quality: 85,
          allowEditing: false,
          resultType: CameraResultType.Uri,
          source: CameraSource.Prompt,
          webUseInput: true,
        });
      } catch { return; }
    }
    if (!captured?.webPath) {
      try {
        captured = await Camera.getPhoto({
          quality: 85,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Prompt,
          webUseInput: true,
        });
      } catch { return; }
    }
    await this.addFromPhoto(captured!);
  }

  // ► Enregistrer depuis une Photo Capacitor déjà capturée (Android/iOS ou fallback)
  async addFromPhoto(photo: Photo) {
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, maximumAge: 60_000 }).catch(() => null);
    const saved = await this.savePictureCompat(photo);
    const coords = pos ? { lat: pos.coords.latitude, lng: pos.coords.longitude } : undefined;

    const enriched: UserPhoto = {
      id: saved.fileName,
      filepath: saved.filepath,
      webviewPath: saved.webviewPath,
      coords,
      takenAt: Date.now(),
      liked: false
    };
    this._photos = [enriched, ...this._photos];
    await this.saveStore();
  }

  // ► Enregistrer depuis une DataURL (capture <video> sur web)
  async addFromDataUrl(dataUrl: string) {
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, maximumAge: 60_000 }).catch(() => null);
    const saved = await this.saveDataUrl(dataUrl);
    const coords = pos ? { lat: pos.coords.latitude, lng: pos.coords.longitude } : undefined;

    const enriched: UserPhoto = {
      id: saved.fileName,
      filepath: saved.filepath,
      webviewPath: saved.dataUrl,
      coords,
      takenAt: Date.now(),
      liked: false,
    };
    this._photos = [enriched, ...this._photos];
    await this.saveStore();
  }

  toggleLike(id: string) {
    const p = this.getById(id);
    if (!p) return;
    p.liked = !p.liked;
    return this.saveStore();
  }

  async deletePhoto(photo: UserPhoto) {
    const path = photo.filepath.split('/').pop()!;
    await Filesystem.deleteFile({ path, directory: Directory.Data }).catch(() => {});
    this._photos = this._photos.filter(p => p.id !== photo.id);
    await this.saveStore();
  }

  // -- Helpers --

  private async savePictureCompat(photo: Photo): Promise<{ fileName: string; filepath: string; webviewPath?: string }> {
    let dataUrl: string;
    if (photo.dataUrl) {
      dataUrl = photo.dataUrl;
    } else if (photo.webPath) {
      const resp = await fetch(photo.webPath);
      const blob = await resp.blob();
      dataUrl = (await this.blobToBase64(blob)) as string;
    } else {
      throw new Error('no_image_source');
    }

    const fileName = `selfie_${Date.now()}.jpeg`;
    const savedFile = await Filesystem.writeFile({
      path: fileName,
      data: dataUrl,
      directory: Directory.Data
    });

    return { fileName, filepath: savedFile.uri, webviewPath: photo.dataUrl ?? photo.webPath };
  }

  private async saveDataUrl(dataUrl: string): Promise<{ fileName: string; filepath: string; dataUrl: string }> {
    const fileName = `selfie_${Date.now()}.jpeg`;
    const savedFile = await Filesystem.writeFile({
      path: fileName,
      data: dataUrl,
      directory: Directory.Data,
    });
    return { fileName, filepath: savedFile.uri, dataUrl };
  }

  private blobToBase64(blob: Blob) {
    return new Promise<string | ArrayBuffer | null>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  }
}
