// État d'authentification global : token en Keychain, utilisateur en mémoire.

import Foundation
import Observation

@MainActor
@Observable
final class AuthStore {
    private(set) var user: User?
    private(set) var ready = false
    private(set) var api = APIClient()

    init() {
        api.token = Keychain.readToken()
        Task { await bootstrap() }
    }

    private func bootstrap() async {
        defer { ready = true }
        guard api.token != nil else { return }
        do {
            user = try await api.me()
        } catch let APIError.server(status, _) where status == 401 {
            // Token expiré ou révoqué : on repart déconnecté.
            logout()
        } catch {
            // Réseau indisponible : on garde le token pour réessayer plus tard.
        }
    }

    func login(email: String, password: String) async throws {
        let res = try await api.login(email: email, password: password)
        apply(res)
    }

    func register(email: String, username: String, displayName: String, password: String) async throws {
        let res = try await api.register(
            email: email, username: username, displayName: displayName, password: password)
        apply(res)
    }

    func refresh() async {
        guard api.token != nil else { return }
        user = (try? await api.me()) ?? user
    }

    func logout() {
        Keychain.deleteToken()
        api.token = nil
        user = nil
    }

    private func apply(_ res: TokenResponse) {
        Keychain.saveToken(res.token)
        api.token = res.token
        user = res.user
    }
}
