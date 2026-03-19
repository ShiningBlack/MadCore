use serde::{Deserialize, Serialize};
use regex::Regex;
use sha2::{Sha256, Digest};

// ---- Password Hashing ----

#[tauri::command]
fn hash_password(password: String) -> String {
    let mut hasher = Sha256::new();
    hasher.update(password.as_bytes());
    hex::encode(hasher.finalize())
}

// ---- Real-time Fund Valuation (fundgz API) ----

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FundRealtime {
    pub fundcode: String,
    pub name: String,
    pub jzrq: String,    // 净值日期
    pub dwjz: String,    // 单位净值
    pub gsz: String,     // 估算净值
    pub gszzl: String,   // 估算涨跌幅 (%)
    pub gztime: String,  // 估值时间
}

#[tauri::command]
async fn fetch_fund_realtime(code: String) -> Result<FundRealtime, String> {
    let url = format!("https://fundgz.1234567.com.cn/js/{}.js", code);
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .build()
        .map_err(|e| e.to_string())?;

    let text = client.get(&url).send().await
        .map_err(|e| e.to_string())?
        .text().await
        .map_err(|e| e.to_string())?;

    let re = Regex::new(r"jsonpgz\((.*)\)").map_err(|e| e.to_string())?;
    if let Some(caps) = re.captures(&text) {
        if let Some(json_str) = caps.get(1) {
            let data: FundRealtime = serde_json::from_str(json_str.as_str())
                .map_err(|e| format!("JSON parse error: {}", e))?;
            return Ok(data);
        }
    }
    Err(format!("Fund {} not found or invalid response", code))
}

// ---- Full Fund Detail (pingzhongdata API) ----

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NavPoint {
    pub x: i64,
    pub y: f64,
    #[serde(rename = "equityReturn")]
    pub equity_return: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PerformanceEvaluation {
    pub avr: String,
    pub categories: Vec<String>,
    pub data: Vec<f64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FundManagerProfit {
    pub categories: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FundManager {
    pub id: String,
    pub name: String,
    pub star: Option<u32>,
    #[serde(rename = "workTime")]
    pub work_time: String,
    #[serde(rename = "fundSize")]
    pub fund_size: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FundDetailFull {
    pub name: String,
    pub code: String,
    pub fund_rate: String,          // 现费率
    pub fund_source_rate: String,   // 原费率
    pub syl_1n: String,             // 近1年收益率
    pub syl_6y: String,             // 近6月收益率
    pub syl_3y: String,             // 近3月收益率
    pub syl_1y: String,             // 近1月收益率
    pub net_worth_trend: Vec<NavPoint>,          // 单位净值走势
    pub ac_worth_trend: Vec<[f64; 2]>,           // 累计净值走势
    pub performance: Option<PerformanceEvaluation>,
    pub managers: Vec<FundManager>,
}

#[tauri::command]
async fn fetch_fund_detail_full(code: String) -> Result<FundDetailFull, String> {
    let url = format!("https://fund.eastmoney.com/pingzhongdata/{}.js", code);
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .build()
        .map_err(|e| e.to_string())?;

    let text = client.get(&url).send().await
        .map_err(|e| e.to_string())?
        .text().await
        .map_err(|e| e.to_string())?;

    // Helper macro for extracting string var
    macro_rules! extract_str {
        ($pattern:expr) => {{
            let re = Regex::new($pattern).map_err(|e| e.to_string())?;
            re.captures(&text)
                .and_then(|c| c.get(1))
                .map(|m| m.as_str().to_string())
                .unwrap_or_default()
        }};
    }

    let name = extract_str!(r#"var fS_name = "(.*?)";"#);
    let code_val = extract_str!(r#"var fS_code = "(.*?)";"#);
    let fund_rate = extract_str!(r#"var fund_Rate="(.*?)";"#);
    let fund_source_rate = extract_str!(r#"var fund_sourceRate="(.*?)";"#);
    let syl_1n = extract_str!(r#"var syl_1n="(.*?)";"#);
    let syl_6y = extract_str!(r#"var syl_6y="(.*?)";"#);
    let syl_3y = extract_str!(r#"var syl_3y="(.*?)";"#);
    let syl_1y = extract_str!(r#"var syl_1y="(.*?)";"#);

    // Extract netWorthTrend
    let trend_re = Regex::new(r"var Data_netWorthTrend = (\[.*?\]);").map_err(|e| e.to_string())?;
    let net_worth_trend: Vec<NavPoint> = trend_re.captures(&text)
        .and_then(|c| c.get(1))
        .and_then(|m| serde_json::from_str(m.as_str()).ok())
        .unwrap_or_default();

    // Extract ACWorthTrend (cumulative NAV) — format: [[timestamp, value], ...]
    let ac_re = Regex::new(r"var Data_ACWorthTrend = (\[.*?\]);").map_err(|e| e.to_string())?;
    let ac_worth_trend: Vec<[f64; 2]> = ac_re.captures(&text)
        .and_then(|c| c.get(1))
        .and_then(|m| serde_json::from_str(m.as_str()).ok())
        .unwrap_or_default();

    // Extract PerformanceEvaluation JSON
    let perf_re = Regex::new(r"var Data_performanceEvaluation = (\{.*?\});").map_err(|e| e.to_string())?;
    let performance: Option<PerformanceEvaluation> = perf_re.captures(&text)
        .and_then(|c| c.get(1))
        .and_then(|m| serde_json::from_str(m.as_str()).ok());

    // Extract fund managers array
    let mgr_re = Regex::new(r"var Data_currentFundManager =(\[.*?\]) ;").map_err(|e| e.to_string())?;
    let managers: Vec<FundManager> = mgr_re.captures(&text)
        .and_then(|c| c.get(1))
        .and_then(|m| serde_json::from_str(m.as_str()).ok())
        .unwrap_or_default();

    if name.is_empty() {
        return Err(format!("Fund {} detail not found", code));
    }

    Ok(FundDetailFull {
        name,
        code: if code_val.is_empty() { code } else { code_val },
        fund_rate,
        fund_source_rate,
        syl_1n,
        syl_6y,
        syl_3y,
        syl_1y,
        net_worth_trend,
        ac_worth_trend,
        performance,
        managers,
    })
}

// ---- App Setup ----

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            hash_password,
            fetch_fund_realtime,
            fetch_fund_detail_full,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
