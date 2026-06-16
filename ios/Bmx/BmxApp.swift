import SwiftUI

@main
struct BmxApp: App {
    @State private var auth = AuthStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(auth)
                .preferredColorScheme(.dark)
                .tint(Theme.accent)
        }
    }
}
