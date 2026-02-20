"""
Seed Data Module - Populate database with real hoax detection examples
Used for initializing the system with realistic data
"""

from datetime import datetime, timedelta
import random

# Real hoax examples from various Indonesian sources
SEED_HOAXES = [
    {
        "title": "Vaksin COVID-19 Mengandung Microchip untuk Pelacakan",
        "content": "Rumor beredar bahwa vaksin COVID-19 mengandung microchip untuk pelacakan lokasi penduduk. Klaim ini tidak terbukti dan telah dibantah oleh banyak pakar kesehatan.",
        "source": "Hoax_Detection_System",
        "category": "Health",
        "prediction": "Hoax",
        "confidence": 0.95
    },
    {
        "title": "Presiden Mengumumkan Kenaikan Gaji Pegawai Negeri Sebesar 50%",
        "content": "Kabar terbaru menyebutkan bahwa Presiden telah mengumumkan kenaikan gaji pegawai negeri yang signifikan. Namun belum ada pengumuman resmi dari istana negara.",
        "source": "Hoax_Detection_System",
        "category": "Politics",
        "prediction": "Hoax",
        "confidence": 0.88
    },
    {
        "title": "Gempa Bumi Bermagnitudo 8.5 Mengguncang Jawa Barat",
        "content": "Benarkah terjadi gempa bumi bermagnitudo 8.5 di Jawa Barat? Data BMKG menunjukkan bahwa gempa terkuat yang dicatat hanya berkekuatan 6.5.",
        "source": "Hoax_Detection_System",
        "category": "Disaster",
        "prediction": "Hoax",
        "confidence": 0.92
    },
    {
        "title": "Aktor Ternama Meninggal Dunia dalam Kecelakaan Mobil",
        "content": "Kabar menyebutkan bahwa aktor ternama meninggal dalam kecelakaan mobil. Namun aktor tersebut masih aktif di media sosial dan tampil di acara publik.",
        "source": "Hoax_Detection_System",
        "category": "Entertainment",
        "prediction": "Hoax",
        "confidence": 0.94
    },
    {
        "title": "Bank Indonesia Memutuskan Menaikkan Suku Bunga menjadi 8.5%",
        "content": "Sesuai keputusan Rapat Dewan Gubernur Bank Indonesia, suku bunga acuan dinaikkan sebesar 50 basis poin menjadi level 8.5 persen.",
        "source": "Hoax_Detection_System",
        "category": "Economy",
        "prediction": "Legitimate",
        "confidence": 0.87
    },
    {
        "title": "Anies Baswedan Terpilih Menjadi Gubernur DKI Jakarta",
        "content": "Pemilihan Gubernur DKI Jakarta 2017 menghasilkan kemenangan Anies Baswedan dengan dukungan koalisi partai. Hasil ini adalah resmi dari KPU.",
        "source": "Hoax_Detection_System",
        "category": "Politics",
        "prediction": "Legitimate",
        "confidence": 0.91
    },
    {
        "title": "Rekam Medis Pasien COVID-19 akan Dihapus pada Akhir Tahun",
        "content": "Rumor menyebutkan pemerintah akan menghapus rekam medis semua pasien COVID-19. Ini adalah hoax karena data medis wajib disimpan selamanya.",
        "source": "Hoax_Detection_System",
        "category": "Health",
        "prediction": "Hoax",
        "confidence": 0.89
    },
    {
        "title": "Banjir Besar Ancam Ibukota Pekan Depan",
        "content": "Peringatan dini BMKG menunjukkan potensi cuaca ekstrem dengan hujan deras selama 3-5 hari ke depan di wilayah Jabodetabek.",
        "source": "Hoax_Detection_System",
        "category": "Disaster",
        "prediction": "Legitimate",
        "confidence": 0.85
    },
    {
        "title": "Jokowi Akan Membatalkan Pembangunan Ibu Kota Baru",
        "content": "Rumor beredar bahwa Jokowi membatalkan proyek Ibu Kota Baru. Faktanya, proyek terus berlanjut dengan alokasi anggaran yang signifikan.",
        "source": "Hoax_Detection_System",
        "category": "Politics",
        "prediction": "Hoax",
        "confidence": 0.91
    },
    {
        "title": "Tarif Listrik Naik Mulai Bulan Depan",
        "content": "PT PLN mengumumkan penyesuaian tarif listrik untuk kategori tertentu mulai bulan Februari 2026. Besaran kenaikan akan diberlakukan bertahap.",
        "source": "Hoax_Detection_System",
        "category": "Economy",
        "prediction": "Legitimate",
        "confidence": 0.88
    },
    {
        "title": "Minuman Energi Tertentu Terbukti Mengandung Racun",
        "content": "Penelitian menunjukkan minuman energi yang diproduksi secara ilegal mengandung zat berbahaya. Konsumsi harus dihindari dan segera lapor ke BPOM.",
        "source": "Hoax_Detection_System",
        "category": "Health",
        "prediction": "Legitimate",
        "confidence": 0.84
    },
    {
        "title": "Aplikasi WhatsApp Akan Diblokir di Indonesia",
        "content": "Kabar menyebutkan pemerintah akan memblokir WhatsApp di Indonesia. Informasi ini tidak ada pengesahan dari Kominfo dan termasuk hoax.",
        "source": "Hoax_Detection_System",
        "category": "Technology",
        "prediction": "Hoax",
        "confidence": 0.90
    },
    {
        "title": "Metaverse akan Menggantikan Internet Tradisional di 2027",
        "content": "Spekulasi menyebutkan Metaverse akan seluruhnya menggantikan internet tradisional. Ini adalah hoax karena internet akan tetap menjadi infrastruktur utama.",
        "source": "Hoax_Detection_System",
        "category": "Technology",
        "prediction": "Hoax",
        "confidence": 0.87
    },
    {
        "title": "Messi Bergabung dengan Club Al-Nassr di Arab Saudi",
        "content": "Lionel Messi resmi bergabung dengan tim Al-Nassr setelah kontraknya dengan Paris Saint-Germain berakhir. Anggota tim berhasil menandatangani perjanjian.",
        "source": "Hoax_Detection_System",
        "category": "Sports",
        "prediction": "Legitimate",
        "confidence": 0.93
    },
    {
        "title": "Rumah Sakit Tidak Perlu Surat Rujukan untuk Pasien Umum",
        "content": "Kebijakan baru resmi berlaku untuk kunjungan pasien umum ke rumah sakit tanpa memerlukan surat rujukan dari puskesmas.",
        "source": "Hoax_Detection_System",
        "category": "Health",
        "prediction": "Legitimate",
        "confidence": 0.86
    },
]

def seed_database():
    """Seed the database with initial hoax data"""
    from database import get_connection, dict_from_row
    from datetime import datetime, timedelta
    import random
    
    conn = get_connection()
    cursor = conn.cursor()
    
    # Check if data already exists
    cursor.execute("SELECT COUNT(*) as count FROM news")
    count = cursor.fetchone()['count']
    
    if count > 0:
        conn.close()
        return False  # Already seeded
    
    # Generate dates spread across last 30 days
    base_date = datetime.now()
    
    for i, hoax in enumerate(SEED_HOAXES):
        # Vary dates over the past 30 days
        days_ago = random.randint(0, 29)
        article_date = (base_date - timedelta(days=days_ago)).strftime("%Y-%m-%d")
        
        try:
            cursor.execute("""
                INSERT INTO news (title, content, source, category, date, prediction, confidence)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                hoax["title"],
                hoax["content"],
                hoax["source"],
                hoax["category"],
                article_date,
                hoax["prediction"],
                hoax["confidence"]
            ))
        except Exception as e:
            print(f"Error inserting hoax {i}: {e}")
    
    conn.commit()
    conn.close()
    
    return True  # Successfully seeded

def seed_admin_user():
    """Ensure super admin exists only when explicitly bootstrapped."""
    from auth import get_user_by_email, create_user
    from database import get_connection
    from config import SUPER_ADMIN_USERNAME, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD

    # Ensure immutable super admin exists and is active admin.
    super_existing = get_user_by_email(SUPER_ADMIN_EMAIL)
    if super_existing:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE users
            SET username = ?,
                role = 'admin',
                is_active = 1
            WHERE email = ?
            """,
            (SUPER_ADMIN_USERNAME, SUPER_ADMIN_EMAIL)
        )
        conn.commit()
        conn.close()
        return True

    # Do not create any admin with implicit/default credentials.
    # Initial super-admin password must be explicitly provided via env.
    if not SUPER_ADMIN_PASSWORD:
        return False

    super_success, _, _ = create_user(
        username=SUPER_ADMIN_USERNAME,
        email=SUPER_ADMIN_EMAIL,
        password=SUPER_ADMIN_PASSWORD,
        role="admin"
    )

    if super_success:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE users SET is_active = 1 WHERE email = ?",
            (SUPER_ADMIN_EMAIL,)
        )
        conn.commit()
        conn.close()

    return super_success

def seed_test_users():
    """Create default test users"""
    from auth import get_user_by_email, create_user
    
    test_users = [
        {"username": "user1", "email": "user@example.com", "password": "UserPassword123!", "role": "user"},
        {"username": "testuser", "email": "testuser@example.com", "password": "TestPassword123!", "role": "user"},
    ]
    
    created_count = 0
    for user_data in test_users:
        if not get_user_by_email(user_data["email"]):
            success, _, _ = create_user(
                username=user_data["username"],
                email=user_data["email"],
                password=user_data["password"],
                role=user_data["role"]
            )
            if success:
                created_count += 1
    
    return created_count
