import SwiftUI
import WebKit

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
        let view = WKWebView(frame: .zero, configuration: configuration)
        view.uiDelegate = context.coordinator
        view.load(URLRequest(url: URL(string: "https://you-had-me-at-outfit.vercel.app/")!))
        return view
    }
    func updateNSView(_ nsView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKUIDelegate {
        func webView(
            _ webView: WKWebView,
            requestGeolocationPermissionFor origin: WKSecurityOrigin,
            initiatedByFrame frame: WKFrameInfo,
            decisionHandler: @escaping (WKPermissionDecision) -> Void
        ) {
            decisionHandler(.prompt)
        }
    }
}
