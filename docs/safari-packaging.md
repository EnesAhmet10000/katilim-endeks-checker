# Safari Web Extension Paketleme ve Dağıtım Rehberi

Bu doküman, Katılım Finans Uygunluk Kontrolü eklentisinin macOS ve iOS/iPadOS Safari üzerinde çalıştırılması ve paketlenmesi için gerekli adımları içerir.

## Gereksinimler

* macOS Ventura veya üzeri
* Xcode 14 veya üzeri
* Safari 16+

## Adım 1: Safari Build Çıktısının Üretilmesi

Monorepo kök dizininde Safari build komutunu çalıştırın:

```bash
npm run build:extension:safari
```

Bu komut `apps/extension/dist/safari` dizininde Safari Manifest V3 uyumlu çıktı dosyalarını üretir.

## Adım 2: Xcode Safari Extension Projesine Dönüştürme

Apple'ın resmi `safari-web-extension-converter` aracını kullanarak Xcode projesini oluşturun:

```bash
xcrun safari-web-extension-converter apps/extension/dist/safari \
  --project-name "KatilimFinansChecker" \
  --bundle-identifier "com.katilim.checker.safari" \
  --swift \
  --macos-only # (veya iOS desteği için parametresiz)
```

## Adım 3: Xcode ile Derleme ve Test

1. Oluşturulan `KatilimFinansChecker.xcodeproj` dosyasını Xcode ile açın.
2. Target olarak **macOS** veya **iOS** seçin.
3. Signing & Capabilities sekmesinden Apple Developer Sertifikanızı seçin.
4. Safari Geliştirici Menüsü üzerinden:
   - **Safari > Tercihler > Gelişmiş > 'Geliştirme menüsünü göster'** seçeneğini işaretleyin.
   - **Geliştirici > 'İmzasız Genişletmelere İzin Ver'** seçeneğini aktif hale getirin.
5. Xcode üzerinden **Run** (⌘ + R) yaparak eklentiyi test edin.
