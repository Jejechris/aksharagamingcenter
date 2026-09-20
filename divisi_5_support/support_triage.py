"""
Akshara Gaming Center - Divisi 5: Customer Support & Warranty Triage (The Support)
Menangani tanya jawab teknis (FAQ Steam Families / Minecraft Email Change)
dan memfilter klaim garansi secara ketat dengan SOP No-Cut Unboxing Video.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from typing import Dict
from models import WarrantyClaim, WarrantyClaimStatus


class SupportTriage:
    @staticmethod
    def get_faq_answer(topic: str) -> str:
        """Menyediakan panduan teknis otomatis untuk pembeli."""
        topic_lower = topic.lower()
        
        if "steam families" in topic_lower or "family" in topic_lower or "gta" in topic_lower or "wukong" in topic_lower:
            return (
                "🎮 *PANDUAN FITUR RESMI STEAM FAMILIES (AKSHARA GAMING):*\n\n"
                "1. Login ke akun sekunder yang kami berikan di aplikasi Steam PC Anda.\n"
                "2. Masuk ke menu *Steam > Settings > Family*.\n"
                "3. Buat atau undang akun Steam utama Anda ke dalam 'Steam Family'.\n"
                "4. Terima undangan di akun utama Anda.\n"
                "5. Game sekarang akan otomatis muncul di Library akun utama Anda, lengkap dengan save game & achievement di akun utama Anda!\n"
                "📌 Fitur ini 100% legal dan didukung resmi oleh Valve Steam."
            )
        elif "email" in topic_lower or "ganti password" in topic_lower or "minecraft" in topic_lower:
            return (
                "🔒 *PANDUAN MENGGANTI EMAIL & PASSWORD MINECRAFT (MICROSOFT):*\n\n"
                "1. Buka https://account.microsoft.com lalu login dengan kredensial dari kami.\n"
                "2. Klik menu *Info Anda (Your Info)* > *Preferensi Masuk (Sign-in preferences)*.\n"
                "3. Klik *Tambahkan Email (Add email)* dan masukkan email Gmail/Yahoo pribadi Anda.\n"
                "4. Verifikasi link yang masuk ke email pribadi Anda.\n"
                "5. Klik *Jadikan Utama (Make primary)* pada email pribadi Anda, lalu hapus email lama.\n"
                "6. Masuk ke tab *Keamanan (Security)* dan ubah Password serta aktifkan 2FA.\n"
                "✨ Akun sekarang 100% menjadi milik pribadi Anda secara permanen!"
            )
        else:
            return (
                "Halo kak! Tim Customer Care Akshara siap membantu.\n"
                "Untuk klaim garansi atau bantuan setup game, silakan kirimkan:\n"
                "- Nomor Pesanan Shopee\n"
                "- Foto Kartu Garansi Fisik\n"
                "- Video unboxing/login tanpa jeda (jika ada kendala akun)"
            )

    @staticmethod
    def triage_warranty_claim(claim: WarrantyClaim) -> Dict[str, any]:
        """
        Memfilter klaim garansi secara objektif dan ketat:
        Mencegah kerugian toko dari pembeli yang sengaja mengklaim akun padahal sudah dipakai sendiri.
        Syarat mutlak: Video unboxing dan first login tanpa jeda (no-cut video).
        """
        if not claim.has_uncut_video_proof:
            claim.claim_status = WarrantyClaimStatus.REJECTED_NO_UNCUT_VIDEO
            claim.decision_reason = (
                "Klaim garansi ditolak sementara: Tidak menyertakan rekaman video unboxing "
                "dan first-login tanpa jeda (no-cut video requirement) sesuai SOP di Kartu Garansi Fisik."
            )
            return {
                "claim_id": claim.claim_id,
                "status": claim.claim_status.value,
                "is_approved": False,
                "message_to_buyer": (
                    f"Mohon maaf kak @{claim.buyer_username}, sesuai dengan Standar Operasional Prosedur (SOP) "
                    f"yang tertera pada Kartu Garansi Fisik Akshara Gaming Center, setiap klaim penggantian akun "
                    f"wajib menyertakan bukti video saat membuka amplop dan melakukan login pertama kali tanpa jeda (no-cut).\n\n"
                    f"Silakan lampirkan tautan/video rekaman tersebut agar tim kami dapat segera menerbitkan akun pengganti baru. Terima kasih!"
                )
            }

        # Jika memiliki video proof tanpa jeda
        claim.claim_status = WarrantyClaimStatus.APPROVED_FOR_REPLACEMENT
        claim.decision_reason = "Video unboxing dan login terverifikasi valid tanpa jeda. Lolos audit garansi."
        return {
            "claim_id": claim.claim_id,
            "status": claim.claim_status.value,
            "is_approved": True,
            "message_to_buyer": (
                f"Klaim garansi kak @{claim.buyer_username} telah DISETUJUI oleh sistem Akshara Gaming Center.\n"
                f"Bukti video telah terverifikasi valid. Tim operator kami akan segera mengirimkan kredensial "
                f"akun pengganti baru melalui WhatsApp dalam waktu 1x24 jam kerja. Mohon ditunggu ya kak!"
            )
        }
