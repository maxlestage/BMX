use actix_web::{get, HttpResponse, Responder};
use serde_json::json;

#[get("/healthz")]
pub async fn healthz() -> impl Responder {
    HttpResponse::Ok().json(json!({ "status": "ok", "service": "bmx-api" }))
}
