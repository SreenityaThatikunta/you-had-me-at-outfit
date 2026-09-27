import WidgetKit
import SwiftUI
import Foundation

struct OutfitEntry: TimelineEntry { let date: Date; let outfit: OutfitSnapshot }

struct OutfitProvider: TimelineProvider {
    private let feedURL = URL(string: "https://you-had-me-at-outfit.vercel.app/widget-outfits.json")!

    func placeholder(in context: Context) -> OutfitEntry { OutfitEntry(date: .now, outfit: fallbackOutfit) }

    func getSnapshot(in context: Context, completion: @escaping (OutfitEntry) -> Void) {
        Task { completion(OutfitEntry(date: .now, outfit: await todayOutfit())) }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<OutfitEntry>) -> Void) {
        Task {
            let entry = OutfitEntry(date: .now, outfit: await todayOutfit())
            let nextRefresh = Calendar.current.date(byAdding: .day, value: 1, to: Calendar.current.startOfDay(for: .now)) ?? .now.addingTimeInterval(60 * 60 * 24)
            completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
        }
    }

    private func todayOutfit() async -> OutfitSnapshot {
        guard let (data, response) = try? await URLSession.shared.data(from: feedURL),
              (response as? HTTPURLResponse)?.statusCode == 200,
              let feed = try? JSONDecoder().decode(OutfitFeed.self, from: data),
              !feed.outfits.isEmpty else { return fallbackOutfit }
        let day = Calendar.current.ordinality(of: .day, in: .year, for: .now) ?? 1
        return feed.outfits[(day - 1) % feed.outfits.count]
    }
}

private struct OutfitFeed: Codable { let outfits: [OutfitSnapshot] }

private let fallbackOutfit = OutfitSnapshot(
    title: "Today's outfit",
    style: "Clean casual",
    reason: "A ready-to-wear combination from your wardrobe.",
    pieces: [
        OutfitPiece(name: "Olive Cropped Polo", image: ""),
        OutfitPiece(name: "Faded Blue Jeans", image: ""),
        OutfitPiece(name: "White Samba Sneakers", image: "")
    ],
    updatedAt: ""
)

struct OutfitWidget: Widget {
    let kind = "OutfitWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: OutfitProvider()) { entry in
            OutfitWidgetView(entry: entry).containerBackground(for: .widget) { Color(red: 0.07, green: 0.07, blue: 0.07) }
        }.configurationDisplayName("Today's outfit").description("A quick look at what to wear today.").supportedFamilies([.systemSmall, .systemMedium])
    }
}

private struct OutfitWidgetView: View {
    let entry: OutfitEntry
    var body: some View {
        let outfit = entry.outfit
        VStack(alignment: .leading, spacing: 8) {
            Text(outfit.title.uppercased()).font(.caption2.weight(.bold)).foregroundStyle(.secondary)
            Text(outfit.style).font(.title3.weight(.semibold)).lineLimit(1)
            VStack(alignment: .leading, spacing: 3) { ForEach(outfit.pieces.prefix(3)) { piece in Label(piece.name, systemImage: "checkmark.circle.fill").font(.caption).lineLimit(1) } }
            Spacer(minLength: 0)
            Text(outfit.reason).font(.caption2).foregroundStyle(.secondary).lineLimit(2)
        }.padding().widgetURL(URL(string: "https://you-had-me-at-outfit.vercel.app/"))
    }
}

@main struct OutfitWidgetBundle: WidgetBundle { var body: some Widget { OutfitWidget() } }
