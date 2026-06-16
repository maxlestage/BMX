# bmx — app iOS (Swift natif)

App iOS **100 % Swift / SwiftUI** (zéro dépendance externe) adossée à l'API Rust
du dossier `backend/`. Elle reprend la fondation de l'ancienne app Expo :

- **Feed des parts** : dernières parts vidéo, miniatures, likes, pull-to-refresh.
- **Compte** : inscription / connexion (JWT), profil, badge ✦ bmx+, stats premium.
- **Token JWT** stocké dans le **Keychain** (chiffré par le système).
- **Thème bmx** aligné sur le web (fond `#17191c`, crème, accent doré).

## Prérequis

- **Xcode 16+** (le projet utilise les dossiers synchronisés, `objectVersion 77`).
- iOS **17.0+** (utilise `@Observable`).

## Démarrer

```bash
open ios/Bmx.xcodeproj
```

Puis ⌘R sur un simulateur. En **Debug**, l'app tape sur `http://localhost:8080/api/v1`
(lance le backend avec `cd backend && cargo run`) ; en **Release**, sur l'API Heroku
de prod. Surchargeable via la clé Info.plist `BmxAPIURL`.

> Pour tester sur un iPhone physique en dev, remplace `localhost` par l'IP locale
> de ta machine via `BmxAPIURL` (l'ATS autorise déjà le réseau local).

## Structure

```
Bmx.xcodeproj/      projet Xcode (dossier Bmx/ synchronisé)
Bmx/
  BmxApp.swift      point d'entrée (@main), injection AuthStore
  RootView.swift         TabView (Accueil · Compte)
  FeedView.swift         feed des parts + likes
  AccountView.swift      login / inscription / profil / stats
  API.swift              client API typé (async/await, JWT)
  AuthStore.swift        état d'auth global (@Observable)
  Keychain.swift         persistance du token
  Theme.swift            palette bmx
  Info.plist             ATS réseau local (dev)
```

## Prochaines étapes

- **Achat in-app** ✦ bmx+ : StoreKit 2 natif + endpoint backend dédié,
  ou SDK RevenueCat (le webhook `POST /api/v1/billing/revenuecat` existe déjà côté backend).
- **i18n** : String Catalog (`Localizable.xcstrings`) pour retrouver les 7 langues du web.
- **Spots** (MapKit), **messagerie**, **notifications push** (APNs).
- Icône d'app dans `Assets.xcassets/AppIcon.appiconset` (1024×1024).
