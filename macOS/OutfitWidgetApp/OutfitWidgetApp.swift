import SwiftUI
import WebKit
import CoreLocation
import WidgetKit

@main
struct OutfitWidgetApp: App {
    var body: some Scene {
        WindowGroup("You Had Me at Outfit") {
            OutfitWebView().frame(minWidth: 940, minHeight: 720)
        }
    }
}

struct OutfitWebView: NSViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeNSView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.userContentController.add(context.coordinator, name: "nativeLocation")
        configuration.userContentController.add(context.coordinator, name: "saveOutfits")
        configuration.userContentController.addUserScript(WKUserScript(
            source: """
            (() => {
              window.__outfitSaveWidget = (json) => window.webkit.messageHandlers.saveOutfits.postMessage(json);
              const callbacks = [];
              var cachedLocation = null;
              var cachedError = false;

              const deliverLocation = (latitude, longitude) => {
                callbacks.splice(0).forEach(({ success }) => success({
                  coords: { latitude, longitude, accuracy: 100 }
                }));
              };

              window.__outfitNativeLocation = (latitude, longitude) => {
                cachedLocation = { latitude, longitude };
                cachedError = false;
                deliverLocation(latitude, longitude);
              };

              window.__outfitNativeLocationError = () => {
                cachedError = true;
                callbacks.splice(0).forEach(({ error }) => error?.({
                  code: 2,
                  message: 'Native location unavailable'
                }));
              };

              navigator.geolocation.getCurrentPosition = (success, error) => {
                if (cachedLocation) {
                  success({ coords: { ...cachedLocation, accuracy: 100 } });
                  return;
                }
                if (cachedError) {
                  error?.({ code: 2, message: 'Native location unavailable' });
                  return;
                }
                callbacks.push({ success, error });
                window.webkit.messageHandlers.nativeLocation.postMessage({ request: true });
              };
            })();
            """,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        ))
        let view = WKWebView(frame: .zero, configuration: configuration)
        view.uiDelegate = context.coordinator
        context.coordinator.webView = view
        context.coordinator.requestLocation()
        view.load(URLRequest(url: URL(string: "https://you-had-me-at-outfit.vercel.app/")!))
        return view
    }
    func updateNSView(_ nsView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKUIDelegate, WKScriptMessageHandler, CLLocationManagerDelegate {
        weak var webView: WKWebView?
        private let locationManager = CLLocationManager()

        override init() {
            super.init()
            locationManager.delegate = self
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            switch message.name {
            case "nativeLocation": requestLocation()
            case "saveOutfits": (message.body as? String).map(saveOutfits)
            default: break
            }
        }

        // Keeps the desktop widget on the same plan as the site, with photos it can show offline.
        private func saveOutfits(_ json: String) {
            guard let data = json.data(using: .utf8),
                  let plan = try? JSONDecoder().decode(OutfitFeed.self, from: data) else { return }
            let planChanged = OutfitStore.savePlan(data)
            Task {
                let imagesAdded = await downloadImages(for: plan)
                if planChanged || imagesAdded { WidgetCenter.shared.reloadAllTimelines() }
            }
        }

        private func downloadImages(for plan: OutfitFeed) async -> Bool {
            guard let directory = OutfitStore.imagesDirectory else { return false }
            try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            var added = false
            for piece in plan.outfits.flatMap(\.pieces) {
                guard let destination = OutfitStore.imageURL(for: piece),
                      !FileManager.default.fileExists(atPath: destination.path),
                      let source = URL(string: piece.image),
                      let (data, response) = try? await URLSession.shared.data(from: source),
                      (response as? HTTPURLResponse)?.statusCode == 200 else { continue }
                added = (try? data.write(to: destination)) != nil || added
            }
            return added
        }

        func requestLocation() {
            switch locationManager.authorizationStatus {
            case .notDetermined:
                locationManager.requestWhenInUseAuthorization()
            case .authorizedAlways, .authorizedWhenInUse:
                locationManager.requestLocation()
            default:
                sendLocationError()
            }
        }

        func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
            requestLocation()
        }

        func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
            guard let location = locations.last else { return }
            webView?.evaluateJavaScript("window.__outfitNativeLocation(\(location.coordinate.latitude), \(location.coordinate.longitude));")
        }

        func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
            sendLocationError()
        }

        private func sendLocationError() {
            webView?.evaluateJavaScript("window.__outfitNativeLocationError && window.__outfitNativeLocationError();")
        }

        func webView(
            _ webView: WKWebView,
            requestGeolocationPermissionFor origin: WKSecurityOrigin,
            initiatedByFrame frame: WKFrameInfo,
            decisionHandler: @escaping (WKPermissionDecision) -> Void
        ) {
            decisionHandler(.deny)
        }
    }
}
