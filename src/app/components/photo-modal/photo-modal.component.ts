import { Component, Input, OnInit } from '@angular/core';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { UserPhoto, PhotoService } from '../../services/photo.service';

@Component({
  standalone: true,
  selector: 'app-photo-modal',
  templateUrl: './photo-modal.component.html',
  styleUrls: ['./photo-modal.component.scss'],
  imports: [IonicModule, CommonModule],
})
export class PhotoModalComponent implements OnInit {
  @Input() photo!: UserPhoto;
  address?: string;

  constructor(
    private modalCtrl: ModalController,
    public photoSvc: PhotoService,
    private toast: ToastController
  ) {}

  async ngOnInit() {
    // Adresse lisible (optionnel)
    if (this.photo?.coords) {
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${this.photo.coords.lat}&lon=${this.photo.coords.lng}&format=json`;
        const resp = await fetch(url, { headers: { 'Accept-Language': 'fr' } });
        const data = await resp.json();
        this.address = data?.display_name || undefined;
      } catch { /* ignore */ }
    }
  }

  async toggleLike() {
    await this.photoSvc.toggleLike(this.photo.id);
  }

  async delete() {
    await this.photoSvc.deletePhoto(this.photo);
    (await this.toast.create({ message: 'Photo supprimée', duration: 1200 })).present();
    this.modalCtrl.dismiss({ action: 'deleted', id: this.photo.id }, 'delete');
  }

  openOnMap() {
    this.modalCtrl.dismiss({ action: 'map', id: this.photo.id }, 'map');
  }

  close() {
    this.modalCtrl.dismiss(null, 'close');
  }
}
