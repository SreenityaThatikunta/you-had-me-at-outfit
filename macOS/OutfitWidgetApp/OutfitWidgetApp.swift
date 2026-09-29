import SwiftUI
import WebKit
import CoreLocation

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
        configuration.userContentController.addUserScript(WKUserScript(
            source: """
            (() => {
              const callbacks = [];
              window.__outfitNativeLocation = (latitude, longitude) => {
                callbacks.splice(0).forEach(({ success }) => success({ coords: { latitude, longitude, accuracy: 100 } }));
              };
              navigator.geolocation.getCurrentPosition = (success, error) => {
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
            guard message.name == "nativeLocation" else { return }
            requestLocation()
        }

        private func requestLocation() {
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
            webView?.evaluateJavaScript("window.__outfitNativeLocation && window.__outfitNativeLocation(17.385, 78.4867);")
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
