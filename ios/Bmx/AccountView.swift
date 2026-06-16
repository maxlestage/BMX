import SwiftUI

struct AccountView: View {
    @Environment(AuthStore.self) private var auth

    var body: some View {
        NavigationStack {
            ScrollView {
                Group {
                    if !auth.ready {
                        ProgressView().tint(Theme.accent)
                    } else if auth.user != nil {
                        ProfileSection()
                    } else {
                        AuthForm()
                    }
                }
                .padding(16)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Theme.bg)
            .navigationTitle("Compte")
            .toolbarBackground(Theme.bg, for: .navigationBar)
        }
    }
}

// MARK: - Profil connecté

private struct ProfileSection: View {
    @Environment(AuthStore.self) private var auth
    @State private var stats: Stats?

    var body: some View {
        let user = auth.user!
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 8) {
                    Text("Salut, \(user.displayName)")
                        .font(.title2.bold())
                        .foregroundStyle(Theme.cream)
                    if user.isPremium {
                        Text("✦ bmx+")
                            .font(.subheadline.bold())
                            .foregroundStyle(Theme.accent)
                    }
                }
                Text("@\(user.username)")
                    .foregroundStyle(Theme.creamSoft)
            }

            if user.isPremium {
                Text("Ton abonnement ✦ bmx+ est actif. Merci de soutenir le crew !")
                    .foregroundStyle(Theme.creamSoft)
                if let stats {
                    HStack(spacing: 12) {
                        StatBox(n: stats.partsCount, label: "parts")
                        StatBox(n: stats.totalLikes, label: "likes")
                        StatBox(n: stats.totalViews, label: "vues")
                    }
                }
            } else {
                VStack(alignment: .leading, spacing: 8) {
                    Text("✦ bmx+")
                        .font(.headline)
                        .foregroundStyle(Theme.accent)
                    Text("Upload HD · effets de montage · sans pub")
                        .foregroundStyle(Theme.creamSoft)
                    Text("L'abonnement se prend pour l'instant sur le site web ; l'achat in-app arrive bientôt.")
                        .font(.footnote)
                        .foregroundStyle(Theme.creamFaint)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(14)
                .background(Theme.ink)
                .clipShape(RoundedRectangle(cornerRadius: 16))
            }

            Button("Se déconnecter") {
                auth.logout()
            }
            .buttonStyle(.bordered)
            .foregroundStyle(Theme.error)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .task(id: user.isPremium) {
            guard user.isPremium else { return }
            stats = try? await auth.api.myStats()
        }
    }
}

private struct StatBox: View {
    let n: Int
    let label: String

    var body: some View {
        VStack(spacing: 2) {
            Text("\(n)")
                .font(.title3.bold())
                .foregroundStyle(Theme.cream)
            Text(label)
                .font(.footnote)
                .foregroundStyle(Theme.creamFaint)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(Theme.ink)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - Connexion / inscription

private struct AuthForm: View {
    @Environment(AuthStore.self) private var auth
    @State private var signup = false
    @State private var email = ""
    @State private var username = ""
    @State private var displayName = ""
    @State private var password = ""
    @State private var busy = false
    @State private var error: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(signup ? "Rejoins le crew" : "Content de te revoir")
                .font(.title2.bold())
                .foregroundStyle(Theme.cream)

            Group {
                TextField("Email", text: $email)
                    .keyboardType(.emailAddress)
                    .textContentType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                if signup {
                    TextField("Pseudo", text: $username)
                        .textContentType(.username)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    TextField("Nom affiché", text: $displayName)
                        .textContentType(.name)
                }
                SecureField("Mot de passe", text: $password)
                    .textContentType(signup ? .newPassword : .password)
            }
            .padding(12)
            .background(Theme.ink)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .foregroundStyle(Theme.cream)

            if let error {
                Text(error)
                    .font(.footnote)
                    .foregroundStyle(Theme.error)
            }

            Button {
                Task { await submit() }
            } label: {
                Group {
                    if busy {
                        ProgressView().tint(Theme.bg)
                    } else {
                        Text(signup ? "S'inscrire" : "Se connecter")
                            .font(.headline)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
            }
            .background(Theme.accent)
            .foregroundStyle(Theme.bg)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .disabled(busy || !formValid)

            Button(signup ? "Déjà membre ? Se connecter" : "Pas de compte ? S'inscrire") {
                signup.toggle()
                error = nil
            }
            .font(.subheadline)
            .foregroundStyle(Theme.creamSoft)
            .frame(maxWidth: .infinity)
        }
    }

    private var formValid: Bool {
        guard !email.isEmpty, !password.isEmpty else { return false }
        return !signup || (!username.isEmpty && !displayName.isEmpty)
    }

    private func submit() async {
        busy = true
        error = nil
        do {
            if signup {
                try await auth.register(
                    email: email, username: username,
                    displayName: displayName, password: password)
            } else {
                try await auth.login(email: email, password: password)
            }
        } catch {
            self.error = (error as? APIError)?.errorDescription ?? "Une erreur est survenue."
        }
        busy = false
    }
}
