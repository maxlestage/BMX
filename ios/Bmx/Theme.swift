// Palette bmx (alignée sur le web).

import SwiftUI

enum Theme {
    static let bg = Color(red: 0x17 / 255, green: 0x19 / 255, blue: 0x1c / 255)
    static let ink = Color(red: 0x23 / 255, green: 0x26 / 255, blue: 0x2b / 255)
    static let cream = Color(red: 0xed / 255, green: 0xed / 255, blue: 0xec / 255)
    static let creamSoft = cream.opacity(0.72)
    static let creamFaint = cream.opacity(0.4)
    static let accent = Color(red: 0xe6 / 255, green: 0xd3 / 255, blue: 0xa7 / 255)
    static let accent2 = Color(red: 0xcd / 255, green: 0xb4 / 255, blue: 0x82 / 255)
    static let line = cream.opacity(0.12)
    static let error = Color(red: 0xff / 255, green: 0x9b / 255, blue: 0x8a / 255)
}
