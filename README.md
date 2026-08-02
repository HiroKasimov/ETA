# ETA Bot — shaxsiy yo'l vaqti taxmin qilish boti

Life OS'dagi bitta Firebase project ichida ishlaydigan, lekin butunlay
alohida Telegram bot va alohida `eta_trips` collection ishlatuvchi loyiha.

## O'rnatish

```bash
npm install
```

`serviceAccountKey.json` faylini (Life OS Firebase projectidagi service
account kaliti) shu papkaga qo'y — bot shu orqali Firestore'ga ulanadi.

`.env` faylida token allaqachon bor. Boshqa muhitga ko'chirsang, yangi
`.env` yaratib token va Firebase yo'lini o'sha yerga yoz.

## Ishga tushirish

```bash
npm start
```

## Komandalar

- `/start` — yordam xabari
- `/safar` — yangi safarni yozib qo'yish (masofa + mode + vaqt) — statistikani boyitadi
- `/hisobla` — masofa kirit, barcha mode (piyoda/bus/skuter/mashina) uchun taxminiy vaqt chiqadi
- `/chiqish` — yetib borish vaqtini kirit, har mode uchun tavsiya etilgan chiqish vaqti chiqadi

## Qanday ishlaydi

- Har mode uchun oxirgi 15 ta safar yozuvidan o'rtacha tezlik (km/soat) hisoblanadi
- Yozuv hali bo'lmasa, boshlang'ich taxminiy tezlik (`DEFAULT_SPEED_KMH`, `src/calculator.js` ichida) ishlatiladi
- Har hisoblashga standart 10 daqiqalik bufer qo'shiladi (kutish, svetofor va h.k. uchun)
- Bu raqamlarni (`DEFAULT_SPEED_KMH`, `BUFFER_MINUTES`, `TRIPS_WINDOW`) o'zingga moslab `src/calculator.js`da o'zgartirishing mumkin

## Keyingi qadamlar (ixtiyoriy)

- Web app (Mini App) — kalkulyatorni tugmalar o'rniga grafik interfeys bilan ko'rsatish
- Xarita orqali masofani avtomatik olish (hozircha qo'lda km kiritiladi)
- Har mode uchun alohida bufer (masalan bus kutish vaqti ko'proq bo'lishi mumkin)
