#![allow(dead_code)]

use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use tokimo_bus_client::BusClient;
use tokimo_bus_protocol::CallerCtx;
use uuid::Uuid;

use crate::error::AppError;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateJobRequest {
    #[serde(rename = "kind")]
    pub job_type: String,
    pub params: JsonValue,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<JsonValue>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_job_id: Option<Uuid>,
}

impl CreateJobRequest {
    pub fn new(job_type: impl Into<String>, params: JsonValue) -> Self {
        Self {
            job_type: job_type.into(),
            params,
            data: None,
            parent_job_id: None,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JobView {
    pub id: Uuid,
    #[serde(rename = "type")]
    pub job_type: String,
    pub status: String,
    pub progress: i32,
    pub error: Option<String>,
}

pub async fn create(
    client: &BusClient,
    caller: CallerCtx,
    request: CreateJobRequest,
) -> Result<JobView, AppError> {
    let response = invoke_json(client, "create", caller, &request).await?;
    serde_json::from_slice::<JobView>(&response)
        .map_err(|error| AppError::Internal(format!("jobs.create decode: {error}")))
}

async fn invoke_json<T: Serialize>(
    client: &BusClient,
    method: &str,
    caller: CallerCtx,
    request: &T,
) -> Result<Vec<u8>, AppError> {
    let payload = serde_json::to_vec(request)
        .map_err(|error| AppError::Internal(format!("jobs.{method} encode: {error}")))?;
    client
        .invoke("jobs", method, payload, caller)
        .await
        .map_err(|error| AppError::Internal(format!("jobs.{method} via bus: {error}")))
}
