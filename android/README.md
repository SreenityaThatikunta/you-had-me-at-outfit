# Android home-screen widget

Connect your phone with USB debugging enabled (**Settings → About phone →** tap **Build number** seven times, then **Settings → System → Developer options → USB debugging**), then run:

```bash
cd android
./gradlew installDebug
```

Or open the `android` folder in Android Studio and press **Run**. Open the **Outfit** app once and allow location so the companion shows local weather.

Then long-press the home screen, choose **Widgets**, find **Outfit**, and add **Today's outfit**. Tapping the widget opens the companion app.

The widget reads the same `widget-outfits.json` feed as the macOS widget and picks one outfit per day of the year. It refreshes just after midnight, and every 12 hours as a fallback. Garment photos are downloaded once and cached, so the widget still shows them offline.

To install without a cable, build the APK with `./gradlew assembleDebug` and copy `app/build/outputs/apk/debug/app-debug.apk` to the phone. Android will ask you to allow installs from that source.
