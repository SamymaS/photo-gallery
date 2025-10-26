import { Component, OnInit } from '@angular/core';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PhotoService, UserPhoto } from '../../services/photo.service';

@Component({
  standalone: true,
  selector: 'app-photo-detail',
  templateUrl: './photo-detail.page.html',
  styleUrls: ['./photo-detail.page.scss'],
  imports: [IonicModule, CommonModule]
})
export class PhotoDetailPage implements OnInit {
  photo?: UserPhoto;
  address?: string;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public photoSvc: PhotoService,
    private alert: AlertController,
    private toast: ToastController
  ) {}

  async ngOnInit() {
    await this.photoSvc.loadSaved();
    const id = this.route.snapshot.paramMap.get('id')!;
    this.photo = this.photoSvc.getById(id);

    if (!this.photo) {
      (await this.toast.create({ message: 'Photo introuvable', color: 'warning', duration: 1500 })).present();
      this.router.navigateByUrl('/tabs/tab2');
      return;
    }

    // Reverse geocode (optionnel, ignore en cas d’erreur)
    if (this.photo.coords) {
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${this.photo.coords.lat}&lon=${this.photo.coords.lng}&format=json`;
        const resp = await fetch(url, { headers: { 'Accept-Language': 'fr' } });
        const data = await resp.json();
        this.address = data?.display_name || undefined;
      } catch { /* ignore */ }
    }
  }

  async like() {
    if (!this.photo) return;
    await this.photoSvc.toggleLike(this.photo.id);
  }

  openOnMap() {
    // Ouvre l’onglet carte ; la carte affichera tous les marqueurs
    this.router.navigateByUrl('/tabs/tab3');
  }

  async delete() {
    if (!this.photo) return;
    const a = await this.alert.create({
      header: 'Supprimer la photo ?',
      message: 'Cette action est définitive.',
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Supprimer', role: 'destructive', handler: async () => {
            await this.photoSvc.deletePhoto(this.photo!);
            this.router.navigateByUrl('/tabs/tab2');
          }
        }
      ]
    });
    await a.present();
  }
}
