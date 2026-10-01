import Foundation

struct OutfitSnapshot: Codable { let title: String; let style: String; let reason: String; let pieces: [OutfitPiece]; var date: String? = nil }
struct OutfitPiece: Codable, Identifiable { let name: String; let image: String; var id: String { name } }
struct OutfitFeed: Codable { let outfits: [OutfitSnapshot] }

// The app saves the site's monthly plan into the shared App Group so the widget shows the same outfit.
enum OutfitStore {
    private static let planKey = "outfitPlan"
    private static let groupID = Bundle.main.object(forInfoDictionaryKey: "OutfitAppGroup") as? String ?? ""
    private static var defaults: UserDefaults? { UserDefaults(suiteName: groupID) }

    static var imagesDirectory: URL? {
        FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: groupID)?.appendingPathComponent("WidgetImages", isDirectory: true)
    }

    static func savePlan(_ data: Data) -> Bool {
        guard defaults?.data(forKey: planKey) != data else { return false }
        defaults?.set(data, forKey: planKey)
        return true
    }

    static var savedPlan: OutfitFeed? {
        defaults?.data(forKey: planKey).flatMap { try? JSONDecoder().decode(OutfitFeed.self, from: $0) }
    }

    static func savedOutfit(for date: Date = .now) -> OutfitSnapshot? {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        let today = formatter.string(from: date)
        return savedPlan?.outfits.first { $0.date == today }
    }

    static func imageURL(for piece: OutfitPiece) -> URL? {
        guard let filename = URL(string: piece.image)?.lastPathComponent else { return nil }
        return imagesDirectory?.appendingPathComponent(filename)
    }
}
