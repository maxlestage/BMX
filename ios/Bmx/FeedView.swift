import SwiftUI

struct FeedView: View {
    @Environment(AuthStore.self) private var auth
    @State private var parts: [Part] = []
    @State private var loading = true
    @State private var error: String?

    var body: some View {
        NavigationStack {
            Group {
                if loading {
                    ProgressView().tint(Theme.accent)
                } else if parts.isEmpty {
                    Text(error ?? "Pas encore de parts. Reviens vite !")
                        .foregroundStyle(Theme.creamFaint)
                        .multilineTextAlignment(.center)
                        .padding(24)
                } else {
                    ScrollView {
                        LazyVStack(spacing: 14) {
                            ForEach(parts) { part in
                                PartCard(part: part, canLike: auth.user != nil) {
                                    await like(part)
                                }
                            }
                        }
                        .padding(16)
                    }
                    .refreshable { await load() }
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Theme.bg)
            .navigationTitle("Dernières parts")
            .toolbarBackground(Theme.bg, for: .navigationBar)
        }
        .task { await load() }
    }

    private func load() async {
        error = nil
        do {
            parts = try await auth.api.parts()
        } catch {
            self.error = (error as? APIError)?.errorDescription ?? "Chargement impossible."
        }
        loading = false
    }

    private func like(_ part: Part) async {
        guard let updated = try? await auth.api.likePart(id: part.id) else { return }
        if let i = parts.firstIndex(where: { $0.id == updated.id }) {
            parts[i] = updated
        }
    }
}

struct PartCard: View {
    let part: Part
    let canLike: Bool
    let onLike: () async -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            AsyncImage(url: APIConfig.mediaURL(part.thumbnailUrl)) { image in
                image.resizable().aspectRatio(contentMode: .fill)
            } placeholder: {
                Color.black
            }
            .frame(maxWidth: .infinity)
            .aspectRatio(16 / 9, contentMode: .fit)
            .clipped()

            VStack(alignment: .leading, spacing: 8) {
                Text(part.title)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(Theme.cream)

                HStack {
                    Button {
                        Task { await onLike() }
                    } label: {
                        Text("♥ \(part.likesCount)")
                            .font(.subheadline.weight(.bold))
                            .foregroundStyle(Theme.accent)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 6)
                            .overlay(Capsule().stroke(Theme.line))
                    }
                    .disabled(!canLike)

                    Spacer()

                    Text("\(part.viewsCount) vues")
                        .font(.footnote)
                        .foregroundStyle(Theme.creamFaint)
                }
            }
            .padding(12)
        }
        .background(Theme.ink)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}
