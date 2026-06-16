import SwiftUI

struct RootView: View {
    var body: some View {
        TabView {
            FeedView()
                .tabItem { Label("Accueil", systemImage: "house.fill") }
            AccountView()
                .tabItem { Label("Compte", systemImage: "person.fill") }
        }
        .background(Theme.bg)
    }
}

#Preview {
    RootView()
        .environment(AuthStore())
        .preferredColorScheme(.dark)
        .tint(Theme.accent)
}
