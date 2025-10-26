import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Geolocation, PositionOptions, PermissionStatus } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

export interface UserPhoto {
  id: string;
  filepath: string;
  webviewPath?: string;
  coords?: { lat: number; lng: number };
  takenAt: number;
  liked?: boolean;
  address?: string;
}

const PHOTO_STORAGE_KEY = 'photos_v2';

@Injectable({ providedIn: 'root' })
export class PhotoService {
  private _photos: UserPhoto[] = [];
  
  /**
   * Retourne toutes les photos
   */
  getPhotos(): UserPhoto[] {
    return [...this._photos];
  }

  /**
   * Retourne une photo par son ID
   */
  getById(id: string): UserPhoto | undefined {
    return this._photos.find(p => p.id === id);
  }

  /**
   * Retourne les photos likées
   */
  getLikedPhotos(): UserPhoto[] {
    return this._photos.filter(p => p.liked);
  }

  /**
   * Retourne les photos avec coordonnées géographiques
   */
  getPhotosWithCoords(): UserPhoto[] {
    return this._photos.filter(p => p.coords);
  }

  /**
   * Sauvegarde les photos dans le stockage
   */
  private async saveStore(): Promise<void> {
    try {
      await Preferences.set({ key: PHOTO_STORAGE_KEY, value: JSON.stringify(this._photos) });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des photos:', error);
      throw new Error('Impossible de sauvegarder les photos');
    }
  }

  /**
   * Charge les photos sauvegardées
   */
  async loadSaved(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: PHOTO_STORAGE_KEY });
      this._photos = value ? JSON.parse(value) : [];

      // Sur web, reconstruire les DataURL affichables depuis le Filesystem
      if (Capacitor.getPlatform() === 'web') {
        for (const photo of this._photos) {
          try {
            const filename = photo.filepath.split('/').pop()!;
            const file = await Filesystem.readFile({ 
              path: filename, 
              directory: Directory.Data 
            });
            
            let dataUrl: string;
            const anyFile = file as any;
            
            if (typeof anyFile.data === 'string') {
              const data = anyFile.data as string;
              dataUrl = data.startsWith('data:') 
                ? data 
                : `data:image/jpeg;base64,${data}`;
            } else {
              const blob = anyFile.data as Blob;
              dataUrl = (await this.blobToBase64(blob)) as string;
            }
            
            photo.webviewPath = dataUrl;
          } catch (error) {
            console.warn('Photo manquante:', photo.id, error);
            // Continue le chargement sans cette photo
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des photos:', error);
      this._photos = [];
    }
  }

  /**
   * Capture une nouvelle photo avec la caméra
   */
  async capturePhoto(): Promise<Photo | null> {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
      });
      return photo;
    } catch (error) {
      console.warn('Erreur lors de la capture:', error);
      return null;
    }
  }

  /**
   * Vérifie et demande les permissions de la caméra
   */
  async checkCameraPermissions(): Promise<boolean> {
    try {
      const status = await Camera.checkPermissions();
      if (status.camera === 'granted' && status.photos === 'granted') {
        return true;
      }
      
      if (status.camera === 'prompt' || status.photos === 'prompt') {
        const result = await Camera.requestPermissions();
        return result.camera === 'granted' && result.photos === 'granted';
      }
      
      return false;
    } catch (error) {
      console.error('Erreur lors de la vérification des permissions:', error);
      return false;
    }
  }

  /**
   * Vérifie et demande les permissions de géolocalisation
   */
  async checkGeolocationPermissions(): Promise<boolean> {
    try {
      const status: PermissionStatus = await Geolocation.requestPermissions();
      return status.location === 'granted';
    } catch (error) {
      console.error('Erreur lors de la vérification des permissions de géolocalisation:', error);
      return false;
    }
  }

  /**
   * Ajoute une photo depuis l'objet Photo de Capacitor
   */
  async addPhoto(photo: Photo): Promise<void> {
    try {
      // Récupération de la position géographique
      let coords: { lat: number; lng: number } | undefined;
      try {
        const position = await Geolocation.getCurrentPosition({ 
          enableHighAccuracy: true, 
          maximumAge: 60000 
        });
        coords = { 
          lat: position.coords.latitude, 
          lng: position.coords.longitude 
        };
      } catch (error) {
        console.warn('Impossible de récupérer la position:', error);
      }

      // Sauvegarde du fichier
      const saved = await this.savePicture(photo);
      
      const newPhoto: UserPhoto = {
        id: saved.fileName,
        filepath: saved.filepath,
        webviewPath: saved.webviewPath,
        coords,
        takenAt: Date.now(),
        liked: false
      };

      this._photos = [newPhoto, ...this._photos];
      await this.saveStore();
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la photo:', error);
      throw new Error('Impossible d\'ajouter la photo');
    }
  }

  /**
   * Ajoute une photo depuis une DataURL (pour web)
   */
  async addPhotoFromDataUrl(dataUrl: string): Promise<void> {
    try {
      // Récupération de la position géographique
      let coords: { lat: number; lng: number } | undefined;
      try {
        const position = await Geolocation.getCurrentPosition({ 
          enableHighAccuracy: true, 
          maximumAge: 60000 
        });
        coords = { 
          lat: position.coords.latitude, 
          lng: position.coords.longitude 
        };
      } catch (error) {
        console.warn('Impossible de récupérer la position:', error);
      }

      // Sauvegarde du fichier
      const saved = await this.saveDataUrl(dataUrl);

      const newPhoto: UserPhoto = {
        id: saved.fileName,
        filepath: saved.filepath,
        webviewPath: saved.dataUrl,
        coords,
        takenAt: Date.now(),
        liked: false
      };

      this._photos = [newPhoto, ...this._photos];
      await this.saveStore();
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la photo:', error);
      throw new Error('Impossible d\'ajouter la photo');
    }
  }

  /**
   * Toggle le statut "liké" d'une photo
   */
  async toggleLike(id: string): Promise<void> {
    const photo = this.getById(id);
    if (!photo) {
      throw new Error('Photo introuvable');
    }
    
    photo.liked = !photo.liked;
    await this.saveStore();
  }

  /**
   * Supprime une photo
   */
  async deletePhoto(photo: UserPhoto): Promise<void> {
    try {
      // Suppression du fichier
      const filename = photo.filepath.split('/').pop()!;
      await Filesystem.deleteFile({ 
        path: filename, 
        directory: Directory.Data 
      }).catch(error => {
        console.warn('Fichier déjà supprimé ou inexistant:', error);
      });

      // Suppression de la liste
      this._photos = this._photos.filter(p => p.id !== photo.id);
      await this.saveStore();
    } catch (error) {
      console.error('Erreur lors de la suppression de la photo:', error);
      throw new Error('Impossible de supprimer la photo');
    }
  }

  // ===== Méthodes privées =====

  /**
   * Sauvegarde une photo depuis l'objet Photo de Capacitor
   */
  private async savePicture(photo: Photo): Promise<{ 
    fileName: string; 
    filepath: string; 
    webviewPath?: string 
  }> {
    let dataUrl: string;
    
    if (photo.dataUrl) {
      dataUrl = photo.dataUrl;
    } else if (photo.webPath) {
      try {
        const response = await fetch(photo.webPath);
        const blob = await response.blob();
        dataUrl = (await this.blobToBase64(blob)) as string;
      } catch (error) {
        throw new Error('Impossible de récupérer l\'image');
      }
    } else {
      throw new Error('Aucune source d\'image disponible');
    }

    const fileName = `photo_${Date.now()}.jpeg`;
    
    try {
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: dataUrl,
        directory: Directory.Data
      });

      return { 
        fileName, 
        filepath: savedFile.uri, 
        webviewPath: photo.dataUrl ?? photo.webPath 
      };
    } catch (error) {
      throw new Error('Impossible de sauvegarder l\'image');
    }
  }

  /**
   * Sauvegarde une photo depuis une DataURL
   */
  private async saveDataUrl(dataUrl: string): Promise<{ 
    fileName: string; 
    filepath: string; 
    dataUrl: string 
  }> {
    const fileName = `photo_${Date.now()}.jpeg`;
    
    try {
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: dataUrl,
        directory: Directory.Data
      });

      return { fileName, filepath: savedFile.uri, dataUrl };
    } catch (error) {
      throw new Error('Impossible de sauvegarder l\'image');
    }
  }

  /**
   * Convertit un Blob en base64
   */
  private blobToBase64(blob: Blob): Promise<string | ArrayBuffer | null> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  }
}
