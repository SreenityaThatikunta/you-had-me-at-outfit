# macOS desktop widget

Open `YouHadMeAtOutfit.xcodeproj` in Xcode, choose **OutfitWidgetApp**, select your Personal Team under **Signing & Capabilities**, and run it once. The companion opens the live outfit picker and saves this month's outfit plan for the widget.

Then right-click the macOS desktop, choose **Edit Widgets**, and add **Today's outfit**. Clicking the widget opens the companion app.

The widget shows the same outfit as the app. Each time the companion opens, the site hands over the month's plan; the app saves it, downloads the garment photos, and refreshes the widget. Until the app has been opened that month, the widget falls back to the rotation in `public/widget-outfits.json`.

The app and widget share data through the App Group `$(TeamIdentifierPrefix)com.youhadmeatoutfit`, set in both entitlement files and both `Info.plist` files (`OutfitAppGroup`). It is derived from your signing team, so changing teams needs no code changes.
