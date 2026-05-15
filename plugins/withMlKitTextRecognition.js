// Expo config plugin — tells Google Play to pre-download ML Kit models at install
// time so they're ready before the user opens the app.
//
// expo-dev-launcher already declares com.google.mlkit.vision.DEPENDENCIES = barcode_ui
// for its QR scanner. Android's manifest merger rejects two entries with the same key,
// so we remove any existing entry and write one combined value, using tools:replace to
// explicitly win the merger conflict.
const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withMlKitTextRecognition(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const application = manifest.application?.[0];
    if (!application) return config;

    // tools:replace requires the tools namespace on the root <manifest> element
    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    if (!application['meta-data']) {
      application['meta-data'] = [];
    }

    const key = 'com.google.mlkit.vision.DEPENDENCIES';

    // Drop any existing entry (expo-dev-launcher adds barcode_ui here)
    application['meta-data'] = application['meta-data'].filter(
      (m) => m.$?.['android:name'] !== key
    );

    // Write the merged value: barcode_ui keeps expo-dev-launcher's QR scanner working,
    // ocr_latin triggers pre-download of the ML Kit v2 Latin OCR model.
    application['meta-data'].push({
      $: {
        'android:name': key,
        'android:value': 'barcode_ui,ocr_latin',
        'tools:replace': 'android:value',
      },
    });

    return config;
  });
};
