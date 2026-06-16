// Génère une paire de clés VAPID (P-256) au format base64url.
use base64ct::{Base64UrlUnpadded, Encoding};
use web_push_native::p256::{elliptic_curve::sec1::ToEncodedPoint, SecretKey};
fn main() {
    let sk = SecretKey::random(&mut rand::rngs::OsRng);
    let priv_b64 = Base64UrlUnpadded::encode_string(&sk.to_bytes());
    let pub_pt = sk.public_key().to_encoded_point(false);
    let pub_b64 = Base64UrlUnpadded::encode_string(pub_pt.as_bytes());
    println!("VAPID_PRIVATE_KEY={priv_b64}");
    println!("PUBLIC(applicationServerKey)={pub_b64}");
}
