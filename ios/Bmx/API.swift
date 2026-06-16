// Client API bmx (iOS natif). Même sous-ensemble que la fondation web :
// auth JWT, parts, stats. Le token est posé par AuthStore (Keychain).

import Foundation

enum APIConfig {
    /// Surchargeable via la clé Info.plist `BmxAPIURL`.
    static let base: URL = {
        if let s = Bundle.main.object(forInfoDictionaryKey: "BmxAPIURL") as? String,
           let url = URL(string: s), !s.isEmpty {
            return url
        }
        #if DEBUG
        return URL(string: "http://localhost:8080/api/v1")!
        #else
        return URL(string: "https://bmx-app.herokuapp.com/api/v1")!
        #endif
    }()

    /// Origine sans le suffixe /api/v1, pour résoudre les chemins médias relatifs.
    static let origin: URL = {
        var s = base.absoluteString
        if let r = s.range(of: "/api/v1", options: [.backwards]) { s.removeSubrange(r.lowerBound..<s.endIndex) }
        return URL(string: s) ?? base
    }()

    static func mediaURL(_ path: String?) -> URL? {
        guard let path, !path.isEmpty else { return nil }
        if path.lowercased().hasPrefix("http") { return URL(string: path) }
        return URL(string: path.hasPrefix("/") ? path : "/" + path, relativeTo: origin)
    }
}

// MARK: - Modèles

struct User: Codable, Identifiable, Equatable {
    let id: Int
    let username: String
    let displayName: String
    let avatarUrl: String?
    let role: String
    let isPremium: Bool
    let premiumUntil: String?
}

struct Part: Codable, Identifiable, Equatable {
    let id: Int
    let title: String
    let videoUrl: String
    let thumbnailUrl: String?
    let likesCount: Int
    let viewsCount: Int
    let createdAt: String
}

struct Stats: Codable, Equatable {
    let partsCount: Int
    let totalLikes: Int
    let totalViews: Int
}

struct TokenResponse: Codable {
    let token: String
    let user: User
}

// MARK: - Erreurs

enum APIError: LocalizedError {
    case unreachable
    case server(status: Int, message: String)

    var errorDescription: String? {
        switch self {
        case .unreachable: return "Serveur injoignable."
        case .server(_, let message): return message
        }
    }
}

// MARK: - Client

struct APIClient {
    var token: String?

    func login(email: String, password: String) async throws -> TokenResponse {
        try await request("POST", "/login", body: ["email": email, "password": password])
    }

    func register(email: String, username: String, displayName: String, password: String) async throws -> TokenResponse {
        try await request("POST", "/register", body: [
            "email": email, "username": username,
            "display_name": displayName, "password": password,
        ])
    }

    func me() async throws -> User {
        try await request("GET", "/me", auth: true)
    }

    func myStats() async throws -> Stats {
        try await request("GET", "/me/stats", auth: true)
    }

    func parts(sort: String = "recent") async throws -> [Part] {
        try await request("GET", "/parts?sort=\(sort)&per_page=30")
    }

    func likePart(id: Int) async throws -> Part {
        try await request("POST", "/parts/\(id)/like", auth: true)
    }

    // MARK: Plomberie

    private struct ServerError: Decodable { let error: String? }

    private func request<T: Decodable>(
        _ method: String, _ path: String, body: [String: String]? = nil, auth: Bool = false
    ) async throws -> T {
        var req = URLRequest(url: URL(string: APIConfig.base.absoluteString + path)!)
        req.httpMethod = method
        if auth, let token {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if let body {
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = try JSONEncoder().encode(body)
        }

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await URLSession.shared.data(for: req)
        } catch {
            throw APIError.unreachable
        }

        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else {
            var message = "Erreur \(status)"
            if let parsed = try? JSONDecoder().decode(ServerError.self, from: data), let e = parsed.error {
                message = e
            }
            if status == 401 { message = "Connecte-toi pour faire ça." }
            if status == 403 { message = "Réservé aux membres ✦ bmx+." }
            throw APIError.server(status: status, message: message)
        }

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return try decoder.decode(T.self, from: data)
    }
}
