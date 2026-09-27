# macOS desktop widget

Open `YouHadMeAtOutfit.xcodeproj` in Xcode, choose **OutfitWidgetApp**, select your Personal Team under **Signing & Capabilities**, and run it once. The companion opens the live outfit picker and saves its current recommendation for the widget.

Then right-click the macOS desktop, choose **Edit Widgets**, and add **Today's outfit**. Clicking the widget opens the companion app.

The two targets share the App Group `group.com.youhadmeatoutfit.desktop`. If Xcode changes that group while enabling automatic signing, update it in both entitlement files and `Shared/OutfitStore.swift` so the app and widget continue to share the recommendation.
