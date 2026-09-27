import Foundation

struct OutfitSnapshot: Codable { let title: String; let style: String; let reason: String; let pieces: [OutfitPiece]; let updatedAt: String }
struct OutfitPiece: Codable, Identifiable { let name: String; let image: String; var id: String { name } }
