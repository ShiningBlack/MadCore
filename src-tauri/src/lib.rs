// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

use serde::{Deserialize, Serialize};
use regex::Regex;

#[derive(Debug, Serialize, Deserialize)]
pub struct FundData {
    pub name: String,
    pub fundcode: String,
    pub dwjz: String,
    pub gsz: String,
    pub gszzl: String,
    pub gztime: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NetWorthPoint {
    pub x: i64,
    pub y: f64,
    pub equityReturn: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FundDetail {
    pub name: String,
    pub code: String,
    pub netWorthTrend: Vec<NetWorthPoint>,
}

#[tauri::command]
async fn fetch_fund_data(code: String) -> Result<FundData, String> {
    let url = format!("http://fundgz.1234567.com.cn/js/{}.js", code);
    let client = reqwest::Client::new();
    let res = client
        .get(&url)
        .header("User-Agent", "Mozilla/5.0")
        .send()
        .await
        .map_err(|e| e.to_string())?
        .text()
        .await
        .map_err(|e| e.to_string())?;

    let re = Regex::new(r"jsonpgz\((.*)\)").map_err(|e| e.to_string())?;
    if let Some(caps) = re.captures(&res) {
        if let Some(json_str) = caps.get(1) {
            let data: FundData = serde_json::from_str(json_str.as_str()).map_err(|e| e.to_string())?;
            return Ok(data);
        }
    }
    Err("Fund not found".to_string())
}

#[tauri::command]
async fn fetch_fund_detail(code: String) -> Result<FundDetail, String> {
    let url = format!("http://fund.eastmoney.com/pingzhongdata/{}.js", code);
    let client = reqwest::Client::new();
    let res = client
        .get(&url)
        .header("User-Agent", "Mozilla/5.0")
        .send()
        .await
        .map_err(|e| e.to_string())?
        .text()
        .await
        .map_err(|e| e.to_string())?;

    // Extract name: var fS_name = "xxx";
    let name_re = Regex::new(r#"var fS_name = "(.*?)";"#).map_err(|e| e.to_string())?;
    let name = name_re.captures(&res)
        .and_then(|c| c.get(1))
        .map(|m| m.as_str().to_string())
        .unwrap_or_default();

    // Extract netWorthTrend: var Data_netWorthTrend = [...];
    let trend_re = Regex::new(r"var Data_netWorthTrend = (\[.*?\]);").map_err(|e| e.to_string())?;
    let trend_json = trend_re.captures(&res)
        .and_then(|c| c.get(1))
        .map(|m| m.as_str())
        .ok_or("Trend data not found")?;

    let trend: Vec<NetWorthPoint> = serde_json::from_str(trend_json).map_err(|e| e.to_string())?;

    Ok(FundDetail {
        name,
        code,
        netWorthTrend: trend,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![greet, fetch_fund_data, fetch_fund_detail])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
