import os
import re
from flask import Blueprint, render_template_string, jsonify

reports_bp = Blueprint("reports", __name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPORTS_DIR = os.path.join(BASE_DIR, "assets", "reports")

def read_report_file(filepath):
    try:
        if os.path.exists(filepath):
            with open(filepath, "r", encoding="utf-8") as f:
                return f.read().strip()
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
    return None

def parse_confusion_matrix(cm_text):
    """
    Parses a string like [[108  17]\n [ 31  26]] into TN, FP, FN, TP
    """
    if not cm_text:
        return 0, 0, 0, 0
    try:
        # Extract numbers using regex
        nums = [int(x) for x in re.findall(r"\d+", cm_text)]
        if len(nums) == 4:
            return nums[0], nums[1], nums[2], nums[3]
    except Exception as e:
        print(f"Error parsing CM text '{cm_text}': {e}")
    return 0, 0, 0, 0

@reports_bp.route("/reports", methods=["GET"])
def model_reports():
    # Read files dynamically
    rf_cm = read_report_file(os.path.join(REPORTS_DIR, "rf", "rf_cm.txt"))
    rf_cr = read_report_file(os.path.join(REPORTS_DIR, "rf", "rf_cr.txt"))

    svm_cm = read_report_file(os.path.join(REPORTS_DIR, "svm", "svm_cm.txt"))
    svm_cr = read_report_file(os.path.join(REPORTS_DIR, "svm", "svm_cr.txt"))

    xgb_cm = read_report_file(os.path.join(REPORTS_DIR, "xgboost", "xgboost_cm.txt"))
    xgb_cr = read_report_file(os.path.join(REPORTS_DIR, "xgboost", "xgboost_cr.txt"))

    # Parse matrices
    rf_tn, rf_fp, rf_fn, rf_tp = parse_confusion_matrix(rf_cm)
    svm_tn, svm_fp, svm_fn, svm_tp = parse_confusion_matrix(svm_cm)
    xgb_tn, xgb_fp, xgb_fn, xgb_tp = parse_confusion_matrix(xgb_cm)

    # HTML dashboard template with premium styling, dark mode, gradients, micro-animations, and Chart.js integration
    html_template = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FireGuard — Model Performance Benchmarks</title>
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <!-- Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        :root {
            --bg-primary: #080b11;
            --bg-secondary: #0f1420;
            --bg-card: #161f30;
            --bg-card-hover: #1e2a40;
            --border-color: #24344d;
            
            --accent-orange: #ff6b35;
            --accent-orange-glow: rgba(255, 107, 53, 0.15);
            --accent-red: #e63946;
            --accent-yellow: #ffd166;
            
            --color-rf: #4361ee;
            --color-svm: #7209b7;
            --color-xgb: #ff6b35;
            
            --text-primary: #f1f5f9;
            --text-secondary: #94a3b8;
            --text-muted: #64748b;
            
            --success: #10b981;
            --success-glow: rgba(16, 185, 129, 0.15);
            --error: #ef4444;
            --error-glow: rgba(239, 68, 68, 0.15);
            
            --font-outfit: 'Outfit', sans-serif;
            --font-inter: 'Inter', sans-serif;
            
            --shadow-sm: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            --shadow-glow: 0 0 25px rgba(255, 107, 53, 0.25);
            --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            background-color: var(--bg-primary);
            color: var(--text-primary);
            font-family: var(--font-inter);
            line-height: 1.6;
            padding: 40px 20px;
            min-height: 100vh;
        }

        .container {
            max-width: 1300px;
            margin: 0 auto;
        }

        /* --- Header Section --- */
        header {
            display: flex;
            align-content: center;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 25px;
        }

        .brand-section h1 {
            font-family: var(--font-outfit);
            font-size: 2.2rem;
            font-weight: 800;
            background: linear-gradient(135deg, #ffffff 30%, #ff8c61 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            letter-spacing: -0.5px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .brand-section p {
            color: var(--text-secondary);
            font-size: 1rem;
            margin-top: 4px;
        }

        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background-color: var(--bg-card);
            border: 1px solid var(--border-color);
            padding: 8px 16px;
            border-radius: 50px;
            font-size: 0.85rem;
            font-weight: 600;
            color: var(--text-primary);
        }

        .status-dot {
            width: 8px;
            height: 8px;
            background-color: var(--success);
            border-radius: 50%;
            box-shadow: 0 0 10px var(--success);
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
            70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }

        /* --- Hero Section: Selected Model --- */
        .winner-card {
            background: linear-gradient(145deg, var(--bg-card), #1b172a);
            border: 1px solid rgba(255, 107, 53, 0.4);
            border-radius: 20px;
            padding: 30px;
            margin-bottom: 40px;
            box-shadow: var(--shadow-glow);
            position: relative;
            overflow: hidden;
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 30px;
            align-items: center;
            transition: var(--transition);
        }

        .winner-card::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -20%;
            width: 300px;
            height: 300px;
            background: radial-gradient(circle, rgba(255, 107, 53, 0.15) 0%, transparent 70%);
            pointer-events: none;
        }

        .winner-badge {
            display: inline-flex;
            background: linear-gradient(135deg, var(--accent-orange), var(--accent-red));
            color: white;
            font-size: 0.75rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            padding: 6px 14px;
            border-radius: 50px;
            margin-bottom: 15px;
            box-shadow: 0 4px 10px rgba(255, 107, 53, 0.3);
        }

        .winner-title {
            font-family: var(--font-outfit);
            font-size: 2rem;
            font-weight: 800;
            margin-bottom: 12px;
            letter-spacing: -0.5px;
        }

        .winner-desc {
            color: var(--text-secondary);
            font-size: 1.05rem;
            margin-bottom: 20px;
            max-width: 750px;
        }

        .why-xgb {
            background-color: rgba(255, 255, 255, 0.03);
            border-left: 4px solid var(--accent-orange);
            padding: 15px 20px;
            border-radius: 0 10px 10px 0;
            font-size: 0.95rem;
            color: var(--text-primary);
        }

        .why-xgb strong {
            color: var(--accent-orange);
        }

        .winner-stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
        }

        .winner-stat-box {
            background-color: rgba(0, 0, 0, 0.2);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            transition: var(--transition);
        }

        .winner-stat-box:hover {
            border-color: rgba(255, 107, 53, 0.4);
            background-color: rgba(255, 107, 53, 0.02);
        }

        .winner-stat-val {
            font-family: var(--font-outfit);
            font-size: 2.5rem;
            font-weight: 800;
            color: var(--accent-orange);
            line-height: 1;
            margin-bottom: 5px;
        }

        .winner-stat-lbl {
            font-size: 0.8rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: var(--text-secondary);
            font-weight: 600;
        }

        /* --- Dashboard Body Layout --- */
        .dashboard-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 30px;
            margin-bottom: 40px;
        }

        .chart-card {
            background-color: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 25px;
            box-shadow: var(--shadow-sm);
            display: flex;
            flex-direction: column;
        }

        .card-header-title {
            font-family: var(--font-outfit);
            font-size: 1.3rem;
            font-weight: 700;
            margin-bottom: 20px;
            color: var(--text-primary);
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .card-header-title svg {
            width: 20px;
            height: 20px;
            fill: var(--accent-orange);
        }

        .chart-container {
            position: relative;
            flex-grow: 1;
            min-height: 320px;
        }

        /* --- Comparison Insights List --- */
        .insight-list {
            list-style: none;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .insight-item {
            background-color: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 10px;
            padding: 14px 18px;
            display: flex;
            align-items: flex-start;
            gap: 12px;
            transition: var(--transition);
        }

        .insight-item:hover {
            transform: translateX(5px);
            border-color: rgba(255, 107, 53, 0.2);
        }

        .insight-icon {
            flex-shrink: 0;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background-color: var(--accent-orange-glow);
            color: var(--accent-orange);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 0.85rem;
        }

        .insight-content h4 {
            font-size: 0.95rem;
            font-weight: 600;
            margin-bottom: 2px;
        }

        .insight-content p {
            font-size: 0.85rem;
            color: var(--text-secondary);
        }

        /* --- Model Breakdown Sections --- */
        .models-section-title {
            font-family: var(--font-outfit);
            font-size: 1.8rem;
            font-weight: 800;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--border-color);
        }

        .models-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 25px;
            margin-bottom: 40px;
        }

        .model-card {
            background-color: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 25px;
            display: flex;
            flex-direction: column;
            transition: var(--transition);
            position: relative;
        }

        .model-card.chosen {
            border-color: rgba(255, 107, 53, 0.4);
            box-shadow: 0 4px 20px rgba(255, 107, 53, 0.08);
        }

        .model-card.chosen::after {
            content: 'CHOSEN';
            position: absolute;
            top: 20px;
            right: 20px;
            background-color: var(--accent-orange);
            color: white;
            font-size: 0.65rem;
            font-weight: 800;
            padding: 3px 8px;
            border-radius: 4px;
            letter-spacing: 0.5px;
        }

        .model-card-header {
            margin-bottom: 20px;
        }

        .model-name {
            font-family: var(--font-outfit);
            font-size: 1.4rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .model-type {
            font-size: 0.8rem;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        /* --- Mini Performance Badges --- */
        .metric-badges-row {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-bottom: 20px;
        }

        .metric-badge {
            background-color: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 10px;
            padding: 10px;
            text-align: center;
        }

        .metric-badge-val {
            font-size: 1.15rem;
            font-weight: 700;
            color: var(--text-primary);
        }

        .metric-badge-lbl {
            font-size: 0.7rem;
            color: var(--text-secondary);
            text-transform: uppercase;
            font-weight: 500;
        }

        .model-card.chosen .metric-badge-val {
            color: var(--accent-orange);
        }

        /* --- Confusion Matrix Visualizer --- */
        .matrix-title {
            font-size: 0.85rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--text-secondary);
            margin-bottom: 10px;
        }

        .matrix-grid {
            display: grid;
            grid-template-columns: 35px repeat(2, 1fr);
            grid-template-rows: 25px repeat(2, 1fr);
            gap: 5px;
            text-align: center;
            font-size: 0.8rem;
            margin-bottom: 25px;
        }

        .matrix-header {
            color: var(--text-secondary);
            font-weight: 600;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .matrix-label-y {
            color: var(--text-secondary);
            font-weight: 600;
            display: flex;
            align-items: center;
            justify-content: center;
            writing-mode: vertical-rl;
            transform: rotate(180deg);
        }

        .matrix-cell {
            border-radius: 8px;
            padding: 12px;
            font-weight: 700;
            font-size: 1rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }

        .matrix-cell span {
            font-size: 0.65rem;
            font-weight: 500;
            text-transform: uppercase;
            opacity: 0.8;
            margin-top: 2px;
        }

        .cell-tn, .cell-tp {
            background-color: var(--success-glow);
            border: 1px solid rgba(16, 185, 129, 0.3);
            color: var(--success);
        }

        .cell-fp, .cell-fn {
            background-color: var(--error-glow);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: var(--error);
        }

        /* --- Tables --- */
        .report-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.8rem;
            margin-bottom: 20px;
            border: 1px solid var(--border-color);
        }

        .report-table th, .report-table td {
            padding: 8px 12px;
            text-align: left;
            border-bottom: 1px solid var(--border-color);
        }

        .report-table th {
            background-color: var(--bg-card);
            color: var(--text-secondary);
            font-weight: 600;
            text-transform: uppercase;
            font-size: 0.7rem;
            letter-spacing: 0.5px;
        }

        .report-table tr:hover td {
            background-color: rgba(255, 255, 255, 0.02);
        }

        .report-table .highlight {
            font-weight: 600;
            color: var(--text-primary);
        }



        /* Responsive Layouts */
        @media (max-width: 992px) {
            .winner-card {
                grid-template-columns: 1fr;
            }
            .dashboard-grid {
                grid-template-columns: 1fr;
            }
            .models-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        
        <!-- HEADER -->
        <header>
            <div class="brand-section">
                <h1>🔥 FireGuard Benchmarking</h1>
                <p>Machine learning classification report & comparison</p>
            </div>
        </header>

        <!-- SELECTED MODEL (HERO) -->
        <div class="winner-card">
            <div>
                <span class="winner-badge">Active Production Model</span>
                <h2 class="winner-title">XGBoost</h2>
                <p class="winner-desc">
                    Chosen for production due to its superior <strong>78% macro average recall and precision</strong>, drastically outperforming Random Forest and SVM across all evaluation metrics.
                </p>
            </div>
            <div class="winner-stats-grid">
                <div class="winner-stat-box">
                    <div class="winner-stat-val">81%</div>
                    <div class="winner-stat-lbl">Accuracy</div>
                </div>
                <div class="winner-stat-box">
                    <div class="winner-stat-val">78%</div>
                    <div class="winner-stat-lbl">Recall</div>
                </div>
                <div class="winner-stat-box">
                    <div class="winner-stat-val">78%</div>
                    <div class="winner-stat-lbl">Precision</div>
                </div>
                <div class="winner-stat-box">
                    <div class="winner-stat-val">78%</div>
                    <div class="winner-stat-lbl">F1-Score</div>
                </div>
            </div>
        </div>

        <!-- MAIN DASHBOARD CONTENT -->
        <div class="dashboard-grid">
            
            <!-- Dynamic comparison Chart.js -->
            <div class="chart-card">
                <h3 class="card-header-title">
                    <svg viewBox="0 0 24 24"><path d="M5 9.2h3V19H5zM10.5 5h3v14h-3zM16 11.8h3V19h-3zM2 21h19v2H2z"/></svg>
                    Performance Comparison Metrics
                </h3>
                <div class="chart-container">
                    <canvas id="comparisonChart"></canvas>
                </div>
            </div>


        </div>

        <!-- DETAILED MODELS BREAKDOWN -->
        <h2 class="models-section-title">Detailed Model Breakdown</h2>
        <div class="models-grid">
            
            <!-- MODEL 1: SVM -->
            <div class="model-card">
                <div class="model-card-header">
                    <div class="model-name">Support Vector Machine</div>
                    <div class="model-type">Linear/RBF Classifier</div>
                </div>
                
                <div class="metric-badges-row">
                    <div class="metric-badge">
                        <div class="metric-badge-val">71%</div>
                        <div class="metric-badge-lbl">Accuracy</div>
                    </div>
                    <div class="metric-badge">
                        <div class="metric-badge-val">62%</div>
                        <div class="metric-badge-lbl">Recall</div>
                    </div>
                    <div class="metric-badge">
                        <div class="metric-badge-val">65%</div>
                        <div class="metric-badge-lbl">Precision</div>
                    </div>
                </div>

                <div class="matrix-title">Confusion Matrix</div>
                <div class="matrix-grid">
                    <div></div><div class="matrix-header">No Fire</div><div class="matrix-header">Fire</div>
                    <div class="matrix-label-y">Actual</div>
                    <div class="matrix-cell cell-tn">{{ svm_tn }}<span>TN</span></div>
                    <div class="matrix-cell cell-fp">{{ svm_fp }}<span>FP</span></div>
                    <div></div>
                    <div class="matrix-cell cell-fn">{{ svm_fn }}<span>FN</span></div>
                    <div class="matrix-cell cell-tp">{{ svm_tp }}<span>TP</span></div>
                </div>

                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Class</th>
                            <th>Prec.</th>
                            <th>Rec.</th>
                            <th>F1</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>0 (No Fire)</td>
                            <td>0.75</td>
                            <td>0.86</td>
                            <td class="highlight">0.80</td>
                        </tr>
                        <tr>
                            <td>1 (Fire)</td>
                            <td>0.55</td>
                            <td>0.39</td>
                            <td class="highlight">0.45</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- MODEL 2: RANDOM FOREST -->
            <div class="model-card">
                <div class="model-card-header">
                    <div class="model-name">Random Forest</div>
                    <div class="model-type">Bagging Ensemble</div>
                </div>

                <div class="metric-badges-row">
                    <div class="metric-badge">
                        <div class="metric-badge-val">74%</div>
                        <div class="metric-badge-lbl">Accuracy</div>
                    </div>
                    <div class="metric-badge">
                        <div class="metric-badge-val">66%</div>
                        <div class="metric-badge-lbl">Recall</div>
                    </div>
                    <div class="metric-badge">
                        <div class="metric-badge-val">69%</div>
                        <div class="metric-badge-lbl">Precision</div>
                    </div>
                </div>

                <div class="matrix-title">Confusion Matrix</div>
                <div class="matrix-grid">
                    <div></div><div class="matrix-header">No Fire</div><div class="matrix-header">Fire</div>
                    <div class="matrix-label-y">Actual</div>
                    <div class="matrix-cell cell-tn">{{ rf_tn }}<span>TN</span></div>
                    <div class="matrix-cell cell-fp">{{ rf_fp }}<span>FP</span></div>
                    <div></div>
                    <div class="matrix-cell cell-fn">{{ rf_fn }}<span>FN</span></div>
                    <div class="matrix-cell cell-tp">{{ rf_tp }}<span>TP</span></div>
                </div>

                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Class</th>
                            <th>Prec.</th>
                            <th>Rec.</th>
                            <th>F1</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>0 (No Fire)</td>
                            <td>0.78</td>
                            <td>0.86</td>
                            <td class="highlight">0.82</td>
                        </tr>
                        <tr>
                            <td>1 (Fire)</td>
                            <td>0.60</td>
                            <td>0.46</td>
                            <td class="highlight">0.52</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- MODEL 3: XGBOOST (SELECTED) -->
            <div class="model-card chosen">
                <div class="model-card-header">
                    <div class="model-name" style="color: var(--accent-orange);">XGBoost</div>
                    <div class="model-type">Gradient Boosting</div>
                </div>

                <div class="metric-badges-row">
                    <div class="metric-badge">
                        <div class="metric-badge-val">81%</div>
                        <div class="metric-badge-lbl">Accuracy</div>
                    </div>
                    <div class="metric-badge">
                        <div class="metric-badge-val">78%</div>
                        <div class="metric-badge-lbl">Recall</div>
                    </div>
                    <div class="metric-badge">
                        <div class="metric-badge-val">78%</div>
                        <div class="metric-badge-lbl">Precision</div>
                    </div>
                </div>

                <div class="matrix-title">Confusion Matrix</div>
                <div class="matrix-grid">
                    <div></div><div class="matrix-header">No Fire</div><div class="matrix-header">Fire</div>
                    <div class="matrix-label-y">Actual</div>
                    <div class="matrix-cell cell-tn">{{ xgb_tn }}<span>TN</span></div>
                    <div class="matrix-cell cell-fp">{{ xgb_fp }}<span>FP</span></div>
                    <div></div>
                    <div class="matrix-cell cell-fn">{{ xgb_fn }}<span>FN</span></div>
                    <div class="matrix-cell cell-tp">{{ xgb_tp }}<span>TP</span></div>
                </div>

                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Class</th>
                            <th>Prec.</th>
                            <th>Rec.</th>
                            <th>F1</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>0 (No Fire)</td>
                            <td>0.86</td>
                            <td>0.86</td>
                            <td class="highlight">0.86</td>
                        </tr>
                        <tr>
                            <td>1 (Fire)</td>
                            <td>0.70</td>
                            <td>0.70</td>
                            <td class="highlight">0.70</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <script>
        // --- Chart.js Comparison ---
        const ctx = document.getElementById('comparisonChart').getContext('2d');
        const comparisonChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Accuracy', 'Precision', 'Recall', 'F1-Score'],
                datasets: [
                    {
                        label: 'Support Vector Machine (SVM)',
                        data: [71, 65, 62, 63],
                        backgroundColor: '#7209b7',
                        borderColor: '#7209b7',
                        borderWidth: 1,
                        borderRadius: 6
                    },
                    {
                        label: 'Random Forest (RF)',
                        data: [74, 69, 66, 67],
                        backgroundColor: '#4361ee',
                        borderColor: '#4361ee',
                        borderWidth: 1,
                        borderRadius: 6
                    },
                    {
                        label: 'XGBoost (Selected)',
                        data: [81, 78, 78, 78],
                        backgroundColor: '#ff6b35',
                        borderColor: '#ff6b35',
                        borderWidth: 1,
                        borderRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#94a3b8',
                            font: {
                                family: 'Inter',
                                size: 12
                            },
                            padding: 15
                        }
                    },
                    tooltip: {
                        backgroundColor: '#161f30',
                        titleColor: '#f1f5f9',
                        bodyColor: '#94a3b8',
                        borderColor: '#24344d',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.raw + (context.label.includes('F1-Score') || context.label.includes('F1') ? ' (score)' : '%');
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(36, 52, 77, 0.3)'
                        },
                        ticks: {
                            color: '#94a3b8',
                            font: {
                                family: 'Inter',
                                size: 11
                            }
                        }
                    },
                    y: {
                        min: 0,
                        max: 100,
                        grid: {
                            color: 'rgba(36, 52, 77, 0.3)'
                        },
                        ticks: {
                            color: '#94a3b8',
                            font: {
                                family: 'Inter',
                                size: 11
                            },
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
    </script>
</body>
</html>
"""
    return render_template_string(
        html_template,
        rf_tn=rf_tn, rf_fp=rf_fp, rf_fn=rf_fn, rf_tp=rf_tp, rf_cr=rf_cr or "Not available",
        svm_tn=svm_tn, svm_fp=svm_fp, svm_fn=svm_fn, svm_tp=svm_tp, svm_cr=svm_cr or "Not available",
        xgb_tn=xgb_tn, xgb_fp=xgb_fp, xgb_fn=xgb_fn, xgb_tp=xgb_tp, xgb_cr=xgb_cr or "Not available"
    )
