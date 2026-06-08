#![allow(dead_code)]

use std::sync::{Arc, OnceLock};

use serde::{Deserialize, Serialize};
use tokimo_bus_client::BusClient;
use tokimo_bus_protocol::CallerCtx;
use uuid::Uuid;

#[derive(Debug, Serialize)]
struct ValidateSessionReq<'a> {
    session_id: &'a str,
}

#[derive(Debug, Deserialize)]
struct ValidateSessionResp {
    user_id: Option<Uuid>,
}

pub struct AuthClient {
    bus_slot: Arc<OnceLock<Arc<BusClient>>>,
}

impl AuthClient {
    pub fn new(bus_slot: Arc<OnceLock<Arc<BusClient>>>) -> Self {
        Self { bus_slot }
    }

    fn client(&self) -> Option<Arc<BusClient>> {
        self.bus_slot.get().map(Arc::clone)
    }

    pub async fn validate_session(&self, session_id: &str) -> Option<Uuid> {
        let client = self.client()?;
        let payload = serde_json::to_vec(&ValidateSessionReq { session_id }).ok()?;
        let caller = CallerCtx {
            user_id: None,
            request_id: Uuid::new_v4().to_string(),
            workspace: None,
            caller_app_id: Some("finder".to_string()),
        };
        match client
            .invoke("auth", "validate_session", payload, caller)
            .await
        {
            Ok(resp_bytes) => serde_json::from_slice::<ValidateSessionResp>(&resp_bytes)
                .ok()
                .and_then(|r| r.user_id),
            Err(error) => {
                tracing::error!(%error, "auth: validate_session bus error");
                None
            }
        }
    }
}
